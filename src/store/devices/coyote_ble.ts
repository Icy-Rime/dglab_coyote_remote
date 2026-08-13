/// <reference types="npm:@types/web-bluetooth"/>
import { atom } from "nanostores";
import { i18nText } from "../../store/browser_var.ts";
import { BLEDevice } from "../device.ts";
enum CoyoteVersion {
    UNKNOWN = 0,
    V2 = 2,
    V3 = 3,
}
const V2_PRIMARY_SERVICE = "955a180b-0fe2-f5aa-a094-84b8d4f3e8ad";
const V3_PRIMARY_SERVICE = "0000180c-0000-1000-8000-00805f9b34fb";
const V3_WRITE_CHARACTERICT = "0000150a-0000-1000-8000-00805f9b34fb";
const V3_NOTIFY_CHARACTERICT = "0000150b-0000-1000-8000-00805f9b34fb";
const BATTERY_SERVICE = "0000180a-0000-1000-8000-00805f9b34fb";
const BATTERY_CHARACTERICT = "00001500-0000-1000-8000-00805f9b34fb";
const DEFAULT_DEVICE_ID = "default_coyote";
const NAME_PREFIXES = ["D-LAB", "47"].map((namePrefix) => {
    return { namePrefix };
}); // 扫描前缀
const PRIMARY_SERVICES = [
    V2_PRIMARY_SERVICE, // v2
    V3_PRIMARY_SERVICE, // v3
]; // 服务id

const DEFAULT_DEVICE_CONFIG = {
    version: 1,
    deviceId: DEFAULT_DEVICE_ID,
    limitChA: 200,
    limitChB: 200,
    balanceFreqChA: 160,
    balanceFreqChB: 160,
    balancePowChA: 0,
    balancePowChB: 0,
};
const DEFAULT_DEVICE_CONFIG_STRING = JSON.stringify(DEFAULT_DEVICE_CONFIG);
export type CoyoteDeviceConfig = typeof DEFAULT_DEVICE_CONFIG;

const queryCoyoteDeviceVersion = async (gattServer: BluetoothRemoteGATTServer) => {
    for (let idx = PRIMARY_SERVICES.length - 1; idx >= 0; idx--) {
        try {
            const _ = await gattServer.getPrimaryService(PRIMARY_SERVICES[idx]);
            return idx + 2 as CoyoteVersion;
        } catch (_) {
            // service not found, not this version.
        }
    }
    return CoyoteVersion.UNKNOWN;
};

const ensureDeviceConfig = (configString: string) => {
    let config = structuredClone(DEFAULT_DEVICE_CONFIG);
    try {
        config = JSON.parse(configString);
    } catch {
        // ignore, use default config
    }
    if (!config?.version) {
        config = structuredClone(DEFAULT_DEVICE_CONFIG);
    }
    while (config.version !== DEFAULT_DEVICE_CONFIG.version) {
        // upgrade config
    }
    return config as CoyoteDeviceConfig;
};

type CoyoteDeviceStatus = {
    batteryLevel: number;
    levelChA: number; // 0~200. <0 means disabled.
    levelChB: number; // 0~200. <0 means disabled.
};

const newCoyoteDeviceStatus = () => {
    return {
        batteryLevel: 0,
        levelChA: -1,
        levelChB: -1,
    } as CoyoteDeviceStatus;
};

export type WaveFrame = [number, number]; // freq, level
export type WaveSeq = [WaveFrame, WaveFrame, WaveFrame, WaveFrame];
export enum LevelAdjustType {
    KEEP = 0b00,
    INCR = 0b01,
    DECR = 0b10,
    SET = 0b11,
}
export type LevelAdjust = [LevelAdjustType, number]; // adjust type, value
export interface WaveDataGenerator {
    generateV3Wave: () => WaveSeq;
}
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

const defaultWaveGenerator: WaveDataGenerator = {
    generateV3Wave: () => {
        return [[240, 80], [180, 100], [240, 80], [10, 0]];
        // return [[240, 50], [10, 100], [240, 50], [10, 100]]; // viberating
    },
};

export class CoyoteBLEDevice extends BLEDevice {
    #cfg: CoyoteDeviceConfig;
    #lastBLEDevice: BluetoothDevice | undefined = undefined;
    #deviceVersion: CoyoteVersion = CoyoteVersion.UNKNOWN;
    #v3CmdChar: BluetoothRemoteGATTCharacteristic | undefined = undefined;
    status = atom(newCoyoteDeviceStatus());
    constructor(configString: string = DEFAULT_DEVICE_CONFIG_STRING) {
        const config = ensureDeviceConfig(configString);
        super(config.deviceId);
        this.#cfg = config;
        this.status.set(newCoyoteDeviceStatus());
        this.statusText.set(i18nText({ zh: "未连接", en: "Disconnected" }));
    }
    async #v3UpdateLimitAndBalance() {
        if (this.#deviceVersion === CoyoteVersion.V3 && this.#v3CmdChar) {
            const buffer = new ArrayBuffer(7);
            const dv = new DataView(buffer);
            const cfg = this.#cfg;
            dv.setUint8(0, 0xBF);
            dv.setUint8(1, cfg.limitChA);
            dv.setUint8(2, cfg.limitChB);
            dv.setUint8(3, cfg.balanceFreqChA);
            dv.setUint8(4, cfg.balanceFreqChB);
            dv.setUint8(5, cfg.balancePowChA);
            dv.setUint8(6, cfg.balancePowChB);
            await this.#v3CmdChar.writeValueWithoutResponse(buffer);
        }
    }
    #startOutputTask() {
        const signal = this.bleListenerAbortController.signal;
        const taskFun = async () => {
            if (signal.aborted) {
                return;
            }
            const status = this.status.get();
            if (status.levelChA < 0 && status.levelChB < 0) {
                return; // no output
            }
            let lvA = status.levelChA;
            let lvB = status.levelChB;
            lvA = Math.max(0, Math.min(200, lvA));
            lvB = Math.max(0, Math.min(200, lvB));
            if (this.#deviceVersion === CoyoteVersion.V3 && this.#v3CmdChar) {
                const packet = v3PackWave(
                    0,
                    [LevelAdjustType.SET, lvA],
                    [LevelAdjustType.SET, lvB],
                    defaultWaveGenerator.generateV3Wave(),
                    defaultWaveGenerator.generateV3Wave(),
                );
                await this.#v3CmdChar.writeValueWithoutResponse(packet);
            }
        };
        const inv = setInterval(taskFun, 100);
        signal.addEventListener("abort", () => {
            clearInterval(inv);
        });
    }
    // override functions
    override defineBLEDeviceFilter(): RequestDeviceOptions {
        return {
            filters: NAME_PREFIXES,
            optionalServices: [...PRIMARY_SERVICES, BATTERY_SERVICE],
        } as RequestDeviceOptions;
    }
    override async onGattServerConnected(): Promise<void> {
        this.statusText.set(i18nText({ zh: "连接中", en: "Connecting" }));
        // query device version
        if (this.bleDevice !== this.#lastBLEDevice || this.#deviceVersion === CoyoteVersion.UNKNOWN) {
            // new device, query version.
            this.#deviceVersion = await queryCoyoteDeviceVersion(this.bleGattServer!);
            if (this.#deviceVersion === CoyoteVersion.UNKNOWN) {
                this.statusText.set(i18nText({ zh: "未知的郊狼设备", en: "Unknown Coyote device" }));
                throw new Error("Unknown Coyote device");
            }
            this.#lastBLEDevice = this.bleDevice;
        }
        // init ble device status
        const status = { ...this.status.get() };
        // init battery services
        const battService = await this.bleGattServer!.getPrimaryService(BATTERY_SERVICE);
        const battChar = await battService.getCharacteristic(BATTERY_CHARACTERICT);
        status.batteryLevel = (await battChar.readValue())?.getUint8(0) ?? 0;
        const battCallback = async (_: unknown) => {
            try {
                const batteryLevel = (await battChar.readValue())?.getUint8(0) ?? 0;
                this.status.set({ ...this.status.get(), batteryLevel });
                console.log("battery level changed:", batteryLevel);
            } finally {
                if (this.bleListenerAbortController.signal.aborted) {
                    return; // do not set if already aborted.
                }
                battChar.addEventListener("characteristicvaluechanged", battCallback, {
                    once: true,
                    signal: this.bleListenerAbortController.signal,
                });
            }
        };
        battChar.addEventListener("characteristicvaluechanged", battCallback, {
            once: true,
            signal: this.bleListenerAbortController.signal,
        });
        await battChar.startNotifications();
        // init primary services
        if (this.#deviceVersion === CoyoteVersion.V3) {
            // init v3 services.
            const cmdService = await this.bleGattServer!.getPrimaryService(V3_PRIMARY_SERVICE);
            this.#v3CmdChar = await cmdService.getCharacteristic(V3_WRITE_CHARACTERICT);
            // write soft limit and balance
            await this.#v3UpdateLimitAndBalance();
        } else if (this.#deviceVersion === CoyoteVersion.V2) {
            // TODO: init v2 services
        }
        // start output task
        this.#startOutputTask();
        // update status
        this.status.set(status);
        this.statusText.set(i18nText({ zh: "连接成功", en: "Connected" }));
        console.log("onGattServerConnected", status);
    }
    override onGattServerDisconnected(): void {
        const newStatus = { ...this.status.get() };
        // reset status
        newStatus.batteryLevel = 0;
        newStatus.levelChA = -1;
        newStatus.levelChB = -1;
        this.status.set(newStatus);
        this.#v3CmdChar = undefined;
        console.log("onGattServerDisconnected");
        this.statusText.set(i18nText({ zh: "未连接", en: "Disconnected" }));
    }
    override onRemoteCommand(command: string): void | Promise<void> {
        console.log("onRemoteCommand", command);
    }
    // export functions
    async updateConfig(newConfig: CoyoteDeviceConfig) {
        this.#cfg = newConfig;
        if (this.#deviceVersion === CoyoteVersion.V3) {
            await this.#v3UpdateLimitAndBalance();
        }
        this.configString.set(JSON.stringify(this.#cfg));
    }
    /** set level of channel A, -1: disable, 0-200: enable */
    setLevelA(level: number) {
        level = Math.max(-1, Math.min(200, level));
        this.status.set({ ...this.status.get(), levelChA: level });
    }
    /** set level of channel B, -1: disable, 0-200: enable */
    setLevelB(level: number) {
        level = Math.max(-1, Math.min(200, level));
        this.status.set({ ...this.status.get(), levelChB: level });
    }
}
