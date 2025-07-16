import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import { CoyoteBLE } from "../utils/coyote_ble.ts";
import type { CoyoteDeviceInfo } from "../utils/coyote_ble.ts";

interface CoyoteDeviceStore extends CoyoteDeviceInfo {
    coyote: CoyoteBLE;
}

export const coyote = new CoyoteBLE();

export const $device = atom<CoyoteDeviceStore>({ ...coyote.getDeviceInfo(), coyote });

// listen to device change
coyote.addEventListener("change", (evt) => {
    const newStore: CoyoteDeviceStore = { ...evt.detail, coyote };
    $device.set(newStore);
});

/* ==== Remote Config ==== */
export interface SingleChannelRemoteConfig {
    zapLevel?: number;
    zapDurationMs?: number;
    lowLevel?: number;
    midLevel?: number;
    highLevel?: number;
}

export interface RemoteConfig {
    a?: SingleChannelRemoteConfig;
    b?: SingleChannelRemoteConfig;
    entryName?: string;
}

export const makeDefaultRemoteConfig = () => {
    return {
        entryName: "",
        a: {
            zapLevel: 3,
            zapDurationMs: 1000,
            lowLevel: 1,
            midLevel: 3,
            highLevel: 5,
        },
        b: {
            zapLevel: 0,
            zapDurationMs: 0,
            lowLevel: 0,
            midLevel: 0,
            highLevel: 0,
        },
    } as RemoteConfig;
};

export const $remoteConfigText = persistentAtom(
    "coyote_remote_config",
    JSON.stringify(makeDefaultRemoteConfig(), undefined, 2),
);

export const setRemoteConfigText = (newValue: string) => {
    $remoteConfigText.set(newValue);
};

export const resetRemoteConfigText = () => {
    $remoteConfigText.set(JSON.stringify(makeDefaultRemoteConfig(), undefined, 2));
};

export const $remoteConfig = atom(makeDefaultRemoteConfig());

export const applyRemoteConfig = () => {
    try {
        const obj = JSON.parse($remoteConfigText.get());
        $remoteConfig.set(obj as RemoteConfig);
        return true;
    } catch {
        return false;
    }
};

/* ==== Remote Event Source ==== */

export const $remoteEventSource = atom<EventSource | undefined>(undefined);

export const connectToEventSource = () => {
    if (!applyRemoteConfig()) return false;
    const lastEventSource = $remoteEventSource.get();
    if (lastEventSource) {
        lastEventSource.close();
    }
    const entryName = $remoteConfig.get()?.entryName ?? "";
    if (!entryName) {
        return false;
    }
    localStorage.setItem("_entry_name_", entryName);
    const url = "/api/listen/" + entryName;
    const eventSource = new EventSource(url);
    eventSource.addEventListener("message", (evt) => {
        console.log("message:", evt.data);
        if (!$device.get()?.connected) {
            return; // not connected, ignore all command.
        }
        const remoteConfig = $remoteConfig.get(); // get current config
        const cfga: SingleChannelRemoteConfig = remoteConfig?.a ?? {};
        const cfgb: SingleChannelRemoteConfig = remoteConfig?.b ?? {};
        if (evt.data === "zap") {
            coyote.setEnabledA((cfga.zapLevel ?? 0) > 0 ? true : false);
            coyote.setLevelA(cfga.zapLevel ?? 0);
            coyote.setEnabledB((cfgb.zapLevel ?? 0) > 0 ? true : false);
            coyote.setLevelB(cfgb.zapLevel ?? 0);
            setTimeout(() => {
                coyote.setLevelA(0);
                coyote.setEnabledA(false);
            }, cfga.zapDurationMs ?? 0);
            setTimeout(() => {
                coyote.setLevelB(0);
                coyote.setEnabledB(false);
            }, cfgb.zapDurationMs ?? 0);
        } else if (evt.data === "low") {
            coyote.setEnabledA((cfga.lowLevel ?? 0) > 0 ? true : false);
            coyote.setLevelA(cfga.lowLevel ?? 0);
            coyote.setEnabledB((cfgb.lowLevel ?? 0) > 0 ? true : false);
            coyote.setLevelB(cfgb.lowLevel ?? 0);
        } else if (evt.data === "mid") {
            coyote.setEnabledA((cfga.midLevel ?? 0) > 0 ? true : false);
            coyote.setLevelA(cfga.midLevel ?? 0);
            coyote.setEnabledB((cfgb.midLevel ?? 0) > 0 ? true : false);
            coyote.setLevelB(cfgb.midLevel ?? 0);
        } else if (evt.data === "high") {
            coyote.setEnabledA((cfga.highLevel ?? 0) > 0 ? true : false);
            coyote.setLevelA(cfga.highLevel ?? 0);
            coyote.setEnabledB((cfgb.highLevel ?? 0) > 0 ? true : false);
            coyote.setLevelB(cfgb.highLevel ?? 0);
        } else if (evt.data === "off") {
            coyote.setLevelA(0);
            coyote.setEnabledA(false);
            coyote.setLevelB(0);
            coyote.setEnabledB(false);
        }
    });
    eventSource.addEventListener("ping", (evt) => {
        console.log("ping: ", evt.data);
    });
    $remoteEventSource.set(eventSource);
    return true;
};
