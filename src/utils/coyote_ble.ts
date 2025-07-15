const NAME_PREFIXS = ["D-LAB", "47"]; // 扫描前缀
const PRIMARY_SERVICES = [
    "955a180b-0fe2-f5aa-a094-84b8d4f3e8ad",
    "0000180c-0000-1000-8000-00805f9b34fb",
]; // 服务id
const V3_WRITE_CHARACTERICT = "0000150a-0000-1000-8000-00805f9b34fb";
const V3_NOTIFY_CHARACTERICT = "0000150b-0000-1000-8000-00805f9b34fb";
const BATTERY_SERVICE = "0000180a-0000-1000-8000-00805f9b34fb";
const BATTERY_CHARACTERICT = "00001500-0000-1000-8000-00805f9b34fb";

export type CoyoteVersion = 2 | 3;
export type WaveFrame = [number, number]; // freq, level
export type WaveSeq = [WaveFrame, WaveFrame, WaveFrame, WaveFrame];
export enum LevelAdjustType {
    KEEP = 0b00,
    INCR = 0b01,
    DECR = 0b10,
    SET = 0b11,
}
export type LevelAdjust = [LevelAdjustType, number]; // adjust type, value
export interface CoyoteDeviceInfo {
    version: CoyoteVersion;
    connected: boolean;
    batteryLevel: number;
    statusText: string;
    channelALevel: number;
    channelBLevel: number;
    channelAEnabled: boolean;
    channelBEnabled: boolean;
}
export interface WaveDataGenerator {
    generateV3Wave: (timeMs: number) => WaveSeq;
}
export interface CoyoteBLEEvents {
    "change": CustomEvent<CoyoteDeviceInfo>;
}

const queryCoyoteDeviceVersion = async (gattServer: BluetoothRemoteGATTServer) => {
    for (let idx = PRIMARY_SERVICES.length - 1; idx >= 0; idx--) {
        try {
            const _ = await gattServer.getPrimaryService(PRIMARY_SERVICES[idx]);
            return idx + 2 as CoyoteVersion;
        } catch (_) {
            // service not found, not this version.
        }
    }
    return -1;
};

const v3PackWave = (
    seq: number,
    chALevel: LevelAdjust,
    chBLevel: LevelAdjust,
    chAWave: WaveSeq,
    chBWave: WaveSeq,
) => {
    const buf = new Uint8Array(20);
    buf[0] = 0xB0;
    buf[1] = ((seq & 0b1111) << 4) | ((chALevel[0] & 0b11) << 2) | (chBLevel[0] & 0b11);
    buf[2] = chALevel[1] & 0b11111111;
    buf[3] = chBLevel[1] & 0b11111111;
    buf.set(chAWave.map((frame) => frame[0] & 0b11111111), 4);
    buf.set(chAWave.map((frame) => frame[1] & 0b11111111), 8);
    buf.set(chBWave.map((frame) => frame[0] & 0b11111111), 12);
    buf.set(chBWave.map((frame) => frame[1] & 0b11111111), 16);
    return buf;
};

const EMPTY_WAVE_SEQ: WaveSeq = [[0, 0], [0, 0], [0, 0], [0, 0]];
const dumyWaveGenerator: WaveDataGenerator = {
    generateV3Wave: (_timeMs) => {
        return EMPTY_WAVE_SEQ;
    },
};

export class CoyoteBLE extends EventTarget {
    #statusText: string = "disconnected.";
    #rev: CoyoteVersion = 3;
    #dev: BluetoothDevice | null = null;
    #srv: BluetoothRemoteGATTServer | null = null;
    #notiFallbackMode: boolean = false;
    #pollTimerId: number = -1;
    #battChar: BluetoothRemoteGATTCharacteristic | null = null;
    #v3WriteChar: BluetoothRemoteGATTCharacteristic | null = null;
    #v3NotifyChar: BluetoothRemoteGATTCharacteristic | null = null;
    #battLevel: number = 0;
    #chALevel: number = 0;
    #chBLevel: number = 0;
    #chAEn: boolean = false;
    #chBEn: boolean = false;
    #chAWaveGen: WaveDataGenerator = dumyWaveGenerator;
    #chBWaveGen: WaveDataGenerator = dumyWaveGenerator;
    #chATargetLevel: number = 0;
    #chBTargetLevel: number = 0;
    #outputTimerId: number = -1;
    #notifyBatteryLevelChangedBinded: () => void;
    #notifyV3NotifyBinded: () => void;
    #onDisconnectBinded: () => Promise<void>;
    constructor() {
        super();
        this.#notifyBatteryLevelChangedBinded = () => {
            // await this.#battChar?.readValue();
            const newValue = this.#battChar?.value?.getUint8(0) ?? 0;
            if (newValue !== this.#battLevel) {
                this.#battLevel = newValue;
                this.#notifyDeviceInfoChanged();
            }
        };
        this.#notifyV3NotifyBinded = () => {
            if (!this.#v3NotifyChar) return;
            const value = this.#v3NotifyChar.value;
            const header = value?.getUint8(0) ?? 0;
            if (header === 0xB1) {
                const _seqId = value?.getUint8(1) ?? 0;
                const chALevel = value?.getUint8(2) ?? 0;
                const chBLevel = value?.getUint8(3) ?? 0;
                this.#chALevel = chALevel;
                this.#chBLevel = chBLevel;
                this.#chATargetLevel = chALevel;
                this.#chBTargetLevel = chBLevel;
                this.#notifyDeviceInfoChanged();
            }
        };
        this.#onDisconnectBinded = this.#onDisconnect.bind(this);
    }

    override addEventListener<K extends keyof CoyoteBLEEvents>(
        type: K,
        listener: (ev: CoyoteBLEEvents[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, listener as EventListener, options);
    }

    async selectDevice() {
        if (!(navigator?.bluetooth?.requestDevice)) {
            return false;
        }
        try {
            const device = await navigator.bluetooth?.requestDevice({
                filters: NAME_PREFIXS.map((namePrefix) => {
                    return { namePrefix };
                }),
                optionalServices: [...PRIMARY_SERVICES, BATTERY_SERVICE],
            });
            // connect and check version
            this.#updateStatus("connecting...");
            const gattServer = await device?.gatt?.connect();
            if (!gattServer) return false;
            this.#updateStatus("chacking hardware version...");
            const version = await queryCoyoteDeviceVersion(gattServer);
            if (version < 0) return false;
            // get services
            this.#updateStatus("preparing services...");
            //   init battery service
            const battSrv = await gattServer.getPrimaryService(BATTERY_SERVICE);
            const battChar = await battSrv.getCharacteristic(BATTERY_CHARACTERICT);
            //   init data service
            const dataSrv = await gattServer.getPrimaryService(PRIMARY_SERVICES[version - 2]);
            if (version === 3) {
                this.#v3WriteChar = await dataSrv.getCharacteristic(V3_WRITE_CHARACTERICT);
                this.#v3NotifyChar = await dataSrv.getCharacteristic(V3_NOTIFY_CHARACTERICT);
            } else if (version === 2) {
                this.#v3WriteChar = null;
                this.#v3NotifyChar = null;
                console.warn("v2 device not currently supported.");
            }
            this.#dev = device;
            this.#srv = gattServer;
            this.#rev = version as CoyoteVersion;
            this.#battChar = battChar;
            // bind callback
            this.#dev.addEventListener("gattserverdisconnected", this.#onDisconnectBinded);
            this.#updateStatus("device inited.");
        } catch (e) {
            console.error(e);
        }
        return false;
    }

    async connect() {
        if (!this.#srv) {
            console.warn("No device selected.");
            return false;
        }
        try {
            this.#updateStatus("connecting...");
            if (!(this.#srv.connected)) {
                this.#srv = await this.#srv.connect();
            }
            await this.#initNotification();
            this.#updateStatus("connected.");
            return true;
        } catch (e) {
            console.error(e);
        }
        return false;
    }

    disconnect() {
        if (!this.#srv) {
            console.warn("No device selected.");
            return false;
        }
        this.#srv.disconnect();
        return true;
    }

    setLevelA(level: number) {
        if (!(this.#chAEn)) {
            return;
        }
        level = Math.max(level, 0);
        level = Math.min(level, 200);
        this.#chATargetLevel = level;
    }

    setLevelB(level: number) {
        if (!(this.#chBEn)) {
            return;
        }
        level = Math.max(level, 0);
        level = Math.min(level, 200);
        this.#chBTargetLevel = level;
    }

    adjustLevelA(levelInc: number) {
        if (!(this.#chAEn)) {
            return;
        }
        let level = this.#chATargetLevel + levelInc;
        level = Math.max(level, 0);
        level = Math.min(level, 200);
        this.#chATargetLevel = level;
    }

    adjustLevelB(levelInc: number) {
        if (!(this.#chBEn)) {
            return;
        }
        let level = this.#chBTargetLevel + levelInc;
        level = Math.max(level, 0);
        level = Math.min(level, 200);
        this.#chBTargetLevel = level;
    }

    setEnabledA(enable: boolean) {
        if (enable) {
            this.#chAEn = true;
            this.#outputCoro();
        } else {
            this.#chAEn = false;
            this.#chATargetLevel = 0;
        }
    }

    setEnabledB(enable: boolean) {
        if (enable) {
            this.#chBEn = true;
            this.#outputCoro();
        } else {
            this.#chBEn = false;
            this.#chBTargetLevel = 0;
        }
    }

    setWaveGeneratorA(waveGen: WaveDataGenerator) {
        this.#chAWaveGen = waveGen;
    }

    setWaveGeneratorB(waveGen: WaveDataGenerator) {
        this.#chBWaveGen = waveGen;
    }

    getDeviceInfo(): CoyoteDeviceInfo {
        return {
            version: this.#rev,
            connected: this.#srv?.connected ?? false,
            batteryLevel: this.#battLevel,
            statusText: this.#statusText,
            channelALevel: this.#chALevel,
            channelBLevel: this.#chBLevel,
            channelAEnabled: this.#chAEn,
            channelBEnabled: this.#chBEn,
        };
    }

    #notifyDeviceInfoChanged() {
        // console.log("device info:", this.getDeviceInfo());
        const event = new CustomEvent<CoyoteDeviceInfo>("change", { detail: this.getDeviceInfo() });
        this.dispatchEvent(event);
    }

    #updateStatus(status: string) {
        this.#statusText = status;
        this.#notifyDeviceInfoChanged();
    }

    #outputCoro() {
        if (this.#outputTimerId >= 0) return; // another coro running
        let targetMs = Date.now();
        const coro = async () => {
            this.#outputTimerId = -1;
            if (this.#rev === 3) {
                // v3 packet
                const seqId = 0b0000;
                const chALv: LevelAdjust = this.#chALevel === this.#chATargetLevel
                    ? [LevelAdjustType.KEEP, 0]
                    : [LevelAdjustType.SET, this.#chATargetLevel];
                const chBLv: LevelAdjust = this.#chBLevel === this.#chBTargetLevel
                    ? [LevelAdjustType.KEEP, 0]
                    : [LevelAdjustType.SET, this.#chBTargetLevel];
                const chAWv = this.#chAEn ? this.#chAWaveGen.generateV3Wave(targetMs) : EMPTY_WAVE_SEQ;
                const chBWv = this.#chBEn ? this.#chBWaveGen.generateV3Wave(targetMs) : EMPTY_WAVE_SEQ;
                const packet = v3PackWave(seqId, chALv, chBLv, chAWv, chBWv);
                await this.#v3WriteRawData(packet);
                if (!(this.#chAEn) && !(this.#chBEn) && (this.#chALevel <= 0) && (this.#chBLevel <= 0)) {
                    return; // no output, stop coro
                }
                // notification fallback mode: level changed success
                if (this.#notiFallbackMode) {
                    if (this.#chALevel !== this.#chATargetLevel || this.#chBLevel !== this.#chBTargetLevel) {
                        this.#chALevel = this.#chATargetLevel;
                        this.#chBLevel = this.#chBTargetLevel;
                        this.#notifyDeviceInfoChanged();
                    }
                }
                // send next frame
                targetMs = targetMs + 100;
                const now = Date.now();
                if (targetMs <= now) {
                    // can't catch up, no wait
                    targetMs = now;
                    this.#outputTimerId = setTimeout(coro);
                } else {
                    const diff = targetMs - now;
                    this.#outputTimerId = setTimeout(coro, diff);
                }
            }
        };
        this.#outputTimerId = setTimeout(coro); // use setTimeout in case operation timeoput, skip frame.
    }

    async #initNotification() {
        try {
            await this.#battChar?.readValue();
            await this.#battChar?.startNotifications();
            this.#battChar?.addEventListener("characteristicvaluechanged", this.#notifyBatteryLevelChangedBinded);
            await this.#v3NotifyChar?.startNotifications();
            this.#v3NotifyChar?.addEventListener("characteristicvaluechanged", this.#notifyV3NotifyBinded);
            this.#notiFallbackMode = false;
        } catch (_) {
            // some browser not support notification
            // fallback to poll
            console.warn("BLE Notification Fallback Mode.");
            this.#notiFallbackMode = true; // no level notify, use internal value as current level.
            clearInterval(this.#pollTimerId);
            const battChar = this.#battChar;
            this.#pollTimerId = setInterval(async () => {
                const newBattLevel = (await battChar?.readValue())?.getUint8(0) ?? 0;
                if (newBattLevel !== this.#battLevel) {
                    this.#battLevel = newBattLevel;
                    this.#notifyDeviceInfoChanged();
                }
            }, 1000);
        }
    }

    async #v3WriteRawData(data: BufferSource) {
        if (this.#rev === 3) {
            if (!this.#srv?.connected) {
                return false;
            }
            if (!this.#v3WriteChar) {
                return false;
            }
            try {
                await this.#v3WriteChar.writeValueWithoutResponse(data);
                return true;
            } catch (e) {
                console.error(e); // ignore error
            }
        }
        return false;
    }

    async #onDisconnect() {
        try {
            await this.#battChar?.stopNotifications();
            this.#battChar?.removeEventListener("characteristicvaluechanged", this.#notifyBatteryLevelChangedBinded);
            await this.#v3NotifyChar?.stopNotifications();
            this.#v3NotifyChar?.removeEventListener("characteristicvaluechanged", this.#notifyV3NotifyBinded);
        } catch (_) {
            // some browser not support notification
        }
        clearInterval(this.#pollTimerId);
        clearTimeout(this.#outputTimerId);
        this.#outputTimerId = -1; // mark output coro not running
        this.#chAEn = false;
        this.#chBEn = false;
        this.#chALevel = 0;
        this.#chBLevel = 0;
        this.#chATargetLevel = 0;
        this.#chBTargetLevel = 0;
        this.#updateStatus("disconnected.");
    }
}
