/// <reference types="npm:@types/web-bluetooth"/>
import { atom, computed } from "nanostores";
import type { ReadableAtom, WritableAtom } from "nanostores";
import { i18nText } from "../../store/browser_var.ts";
import { BLEDevice, DeviceStatus } from "../device.ts";
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

const DEFAULT_DEVICE_CHANNEL_CONFIG = {
    levelLimit: 200,
    balanceFreq: 160,
    balancePow: 0,
    zapLevel: 10,
    zapDuration: 2,
    lowLevel: 5,
    middleLevel: 10,
    highLevel: 15,
};
export type CoyoteDeviceChannelConfig = typeof DEFAULT_DEVICE_CHANNEL_CONFIG;
const DEFAULT_DEVICE_CONFIG = {
    version: 1,
    deviceId: DEFAULT_DEVICE_ID,
    chA: structuredClone(DEFAULT_DEVICE_CHANNEL_CONFIG) as CoyoteDeviceChannelConfig,
    chB: structuredClone(DEFAULT_DEVICE_CHANNEL_CONFIG) as CoyoteDeviceChannelConfig,
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

const DEFAULT_DEVICE_CHANNEL_STATUS = {
    level: -1, // 0~200. <0 means disabled.
};
export type CoyoteDeviceChannelStatus = typeof DEFAULT_DEVICE_CHANNEL_STATUS;
const DEFAULT_DEVICE_STATUS = {
    batteryLevel: 0,
    chA: structuredClone(DEFAULT_DEVICE_CHANNEL_STATUS) as CoyoteDeviceChannelStatus,
    chB: structuredClone(DEFAULT_DEVICE_CHANNEL_STATUS) as CoyoteDeviceChannelStatus,
};
export type CoyoteDeviceStatus = typeof DEFAULT_DEVICE_STATUS;

const newCoyoteDeviceStatus = () => {
    return structuredClone(DEFAULT_DEVICE_STATUS);
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
    // TODO: generateV2Wave
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
const emptyWaveGenerator: WaveDataGenerator = {
    generateV3Wave: () => {
        return [[0, 0], [0, 0], [0, 0], [0, 0]];
    },
};

export class CoyoteBLEDevice extends BLEDevice {
    #cfg: WritableAtom<CoyoteDeviceConfig>;
    #lastBLEDevice: BluetoothDevice | undefined = undefined;
    #deviceVersion: CoyoteVersion = CoyoteVersion.UNKNOWN;
    #v3CmdChar: BluetoothRemoteGATTCharacteristic | undefined = undefined;
    #sts: WritableAtom<CoyoteDeviceStatus>;
    config: ReadableAtom<CoyoteDeviceConfig>;
    status: ReadableAtom<CoyoteDeviceStatus>;
    constructor(configString: string = DEFAULT_DEVICE_CONFIG_STRING) {
        const config = ensureDeviceConfig(configString);
        super(config.deviceId);
        this.#cfg = atom(config);
        this.#sts = atom(newCoyoteDeviceStatus());
        this.config = computed(this.#cfg, (cfg) => structuredClone(cfg));
        this.status = computed(this.#sts, (sts) => structuredClone(sts));
        this.statusText.set(i18nText({ zh: "未连接", en: "Disconnected" }));
    }
    async #v3UpdateLimitAndBalance() {
        if (this.#deviceVersion === CoyoteVersion.V3 && this.#v3CmdChar) {
            const buffer = new ArrayBuffer(7);
            const dv = new DataView(buffer);
            const cfg = this.#cfg.get();
            dv.setUint8(0, 0xBF);
            dv.setUint8(1, cfg.chA.levelLimit);
            dv.setUint8(2, cfg.chB.levelLimit);
            dv.setUint8(3, cfg.chA.balanceFreq);
            dv.setUint8(4, cfg.chB.balanceFreq);
            dv.setUint8(5, cfg.chA.balancePow);
            dv.setUint8(6, cfg.chB.balancePow);
            await this.#v3CmdChar.writeValueWithoutResponse(buffer);
            console.log("update limit and balance");
        }
    }
    #startOutputTask() {
        const signal = this.bleListenerAbortController.signal;
        const taskFun = async () => {
            if (signal.aborted) {
                return;
            }
            const status = this.#sts.get();
            if (status.chA.level < 0 && status.chB.level < 0) {
                return; // no output
            }
            let lvA = status.chA.level;
            let lvB = status.chB.level;
            lvA = Math.max(-1, Math.min(200, lvA));
            lvB = Math.max(-1, Math.min(200, lvB));
            if (this.#deviceVersion === CoyoteVersion.V3 && this.#v3CmdChar) {
                const packet = v3PackWave(
                    0,
                    [LevelAdjustType.SET, lvA],
                    [LevelAdjustType.SET, lvB],
                    lvA >= 0 ? defaultWaveGenerator.generateV3Wave() : emptyWaveGenerator.generateV3Wave(),
                    lvB >= 0 ? defaultWaveGenerator.generateV3Wave() : emptyWaveGenerator.generateV3Wave(),
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
        const status = { ...this.#sts.get() };
        // init battery services
        const battService = await this.bleGattServer!.getPrimaryService(BATTERY_SERVICE);
        const battChar = await battService.getCharacteristic(BATTERY_CHARACTERICT);
        status.batteryLevel = (await battChar.readValue())?.getUint8(0) ?? 0;
        const battCallback = async (_: unknown) => {
            try {
                const batteryLevel = (await battChar.readValue())?.getUint8(0) ?? 0;
                this.#sts.set({ ...this.#sts.get(), batteryLevel });
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
        this.#sts.set(status);
        this.statusText.set(i18nText({ zh: "连接成功", en: "Connected" }));
        if (this.#deviceVersion !== CoyoteVersion.V3) {
            this.statusText.set(
                i18nText({ zh: "连接成功 (不支持，仅支持V3.0)", en: "Connected (not supported, only support V3.0)" }),
            );
        }
        console.log("onGattServerConnected", status);
    }
    override onGattServerDisconnected(): void {
        // reset status
        this.#sts.set(newCoyoteDeviceStatus());
        this.#v3CmdChar = undefined;
        console.log("onGattServerDisconnected");
        this.statusText.set(i18nText({ zh: "未连接", en: "Disconnected" }));
    }
    override onRemoteCommand(command: string): void | Promise<void> {
        console.log("onRemoteCommand", command);
        const cmds = command.split("⌂");
        if (cmds.length <= 0) return;
        const action = cmds[0];
        const cfg = this.#cfg.get();
        switch (action) {
            case "coyote_zap":
                this.setLevelA(cfg.chA.zapLevel);
                this.setLevelB(cfg.chB.zapLevel);
                setTimeout(() => {
                    this.setLevelA(-1);
                }, cfg.chA.zapDuration * 1000);
                setTimeout(() => {
                    this.setLevelB(-1);
                }, cfg.chB.zapDuration * 1000);
                break;
            case "coyote_low":
                this.setLevelA(cfg.chA.lowLevel);
                this.setLevelB(cfg.chB.lowLevel);
                break;
            case "coyote_middle":
                this.setLevelA(cfg.chA.middleLevel);
                this.setLevelB(cfg.chB.middleLevel);
                break;
            case "coyote_high":
                this.setLevelA(cfg.chA.highLevel);
                this.setLevelB(cfg.chB.highLevel);
                break;
            case "coyote_off":
                this.setLevelA(-1);
                this.setLevelB(-1);
                break;
            default:
                break;
        }
    }
    // export functions
    async updateConfig(newConfig: CoyoteDeviceConfig) {
        const oldConfig = this.#cfg.get();
        this.#cfg.set(newConfig);
        this.configString.set(JSON.stringify(this.#cfg.get()));
        if (newConfig.deviceId !== this.deviceId.get()) {
            this.deviceId.set(newConfig.deviceId);
        }
        if (this.#deviceVersion === CoyoteVersion.V3) {
            let changed = false;
            changed = changed || oldConfig.chA.levelLimit !== newConfig.chA.levelLimit;
            changed = changed || oldConfig.chB.levelLimit !== newConfig.chB.levelLimit;
            changed = changed || oldConfig.chA.balanceFreq !== newConfig.chA.balanceFreq;
            changed = changed || oldConfig.chB.balanceFreq !== newConfig.chB.balanceFreq;
            changed = changed || oldConfig.chA.balancePow !== newConfig.chA.balancePow;
            changed = changed || oldConfig.chB.balancePow !== newConfig.chB.balancePow;
            if (changed) {
                await this.#v3UpdateLimitAndBalance();
            }
        }
    }
    /** set level of channel A, -1: disable, 0-200: enable */
    setLevelA(level: number) {
        if (this.deviceStatus.get() !== DeviceStatus.CONNECTED) {
            return;
        }
        level = Math.max(-1, Math.min(200, level));
        const status = { ...this.#sts.get() };
        status.chA.level = level;
        this.#sts.set(status);
    }
    /** set level of channel B, -1: disable, 0-200: enable */
    setLevelB(level: number) {
        if (this.deviceStatus.get() !== DeviceStatus.CONNECTED) {
            return;
        }
        level = Math.max(-1, Math.min(200, level));
        const status = { ...this.#sts.get() };
        status.chB.level = level;
        this.#sts.set(status);
    }
}
