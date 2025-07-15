import { useMemo, useRef, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { useTranslator } from "../../hooks/i18n.ts";
import { Icon } from "../../components/icon/icon.tsx";
import type { FunctionComponent } from "preact";
import type { WaveDataGenerator } from "../../utils/coyote_ble.ts";

import { $device, coyote } from "../../store/coyote.ts";

interface SingleChannelRemoteConfig {
    zapLevel?: number;
    zapDurationMs?: number;
    lowLevel?: number;
    midLevel?: number;
    highLevel?: number;
}

interface RemoteConfig {
    a?: SingleChannelRemoteConfig;
    b?: SingleChannelRemoteConfig;
    entryName?: string;
}

const defaultRemoteConfig = () => {
    return {
        entryName: "",
        a: {
            zapLevel: 3,
            zapDurationMs: 2000,
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
const STATIC_REMOTE_CONFIG = defaultRemoteConfig();
STATIC_REMOTE_CONFIG.entryName = localStorage.getItem("_entry_name_") ?? "";
const STATIC_REMOTE_CONFIG_TEXT = JSON.stringify(STATIC_REMOTE_CONFIG, undefined, 2);

const testWaveGenerator: WaveDataGenerator = {
    generateV3Wave: (_timeMs) => {
        return [[240, 80], [180, 100], [240, 80], [10, 0]];
        // return [[240, 50], [10, 100], [240, 50], [10, 100]]; // viberating
    },
};
coyote.setWaveGeneratorA(testWaveGenerator);
coyote.setWaveGeneratorB(testWaveGenerator);

export const ControllerPage: FunctionComponent = (_) => {
    const remoteConfig = useRef<RemoteConfig>(STATIC_REMOTE_CONFIG);
    const eventSource = useRef<EventSource | undefined>(undefined);
    const [configText, setConfigText] = useState(STATIC_REMOTE_CONFIG_TEXT);
    const device = useStore($device);
    const t = useTranslator();
    const toggleConnect = useMemo(() => async () => {
        if (device.connected) {
            coyote.disconnect();
        } else {
            await coyote.selectDevice();
            await coyote.connect();
        }
    }, [device]);
    const applyRemoteConfig = useMemo(() => () => {
        try {
            const obj = JSON.parse(configText);
            remoteConfig.current = obj as RemoteConfig;
            return true;
        } catch {
            alert(t({ zh: "JSON格式错误", en: "JSON Error" }));
        }
        return false;
    }, [configText, remoteConfig, t]);
    const connectRemoteServer = useMemo(() => () => {
        if (!applyRemoteConfig()) return false;
        if (eventSource.current) {
            eventSource.current.close();
        }
        const entryName = remoteConfig.current?.entryName ?? "";
        if (!entryName) {
            alert(t({ zh: "entryName不能为空", en: "entryName can not be empty" }));
            return false;
        }
        localStorage.setItem("_entry_name_", entryName);
        const url = "/api/listen/" + entryName;
        eventSource.current = new EventSource(url);
        eventSource.current.addEventListener("message", (evt) => {
            console.log("message:", evt.data);
            const cfga: SingleChannelRemoteConfig = remoteConfig.current?.a ?? {};
            const cfgb: SingleChannelRemoteConfig = remoteConfig.current?.b ?? {};
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
        eventSource.current.addEventListener("ping", (evt) => {
            console.log("ping: ", evt.data);
        });
        return true;
    }, [applyRemoteConfig, eventSource, remoteConfig, t]);
    const renderSimplePanel = useMemo(() =>
    (
        title: string,
        setEnable: (enable: boolean) => void,
        adjust: (inc: number) => void,
    ) => {
        return (
            <>
                <h1>{title}</h1>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button type="button" style={{ flex: "0 0 auto" }} onClick={() => adjust(-1)}>
                        <Icon name="minus"></Icon>
                    </button>
                    <button type="button" style={{ flex: "0 0 auto" }} onClick={() => adjust(1)}>
                        <Icon name="plus"></Icon>
                    </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button type="button" style={{ flex: "0 0 auto" }} onClick={() => setEnable(true)}>
                        <Icon name="play"></Icon>
                    </button>
                    <button type="button" style={{ flex: "0 0 auto" }} onClick={() => setEnable(false)}>
                        <Icon name="square"></Icon>
                    </button>
                </div>
            </>
        );
    }, [device]);
    return (
        <>
            <div style={{ display: "flex" }}>
                <button type="button" style={{ flex: "0 0 auto" }} onClick={toggleConnect}>
                    <Icon name="bluetooth"></Icon>
                    <span>
                        {device.connected
                            ? t({ zh: "已连接", en: "Connected" })
                            : t({ zh: "未连接", en: "Disconnected" })}
                    </span>
                </button>
                <div
                    style={{
                        flex: "1 1 auto",
                        marginBottom: "var(--pico-spacing)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <span style={{ wordBreak: "break-word" }}>{device.statusText}</span>
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "stretch" }}>
                <div style={{ flex: "1 1 auto", padding: "0 var(--pico-spacing)" }}>
                    {renderSimplePanel(
                        "A: " + device.channelALevel,
                        coyote.setEnabledA.bind(coyote),
                        coyote.adjustLevelA.bind(coyote),
                    )}
                </div>
                <div style={{ flex: "0 0 1px", backgroundColor: "var(--pico-primary)" }}></div>
                <div style={{ flex: "1 1 auto", padding: "0 var(--pico-spacing)" }}>
                    {renderSimplePanel(
                        "B: " + device.channelBLevel,
                        coyote.setEnabledB.bind(coyote),
                        coyote.adjustLevelB.bind(coyote),
                    )}
                </div>
            </div>
            <div style={{ padding: "0 var(--pico-spacing)" }}>
                <textarea rows={8} onInput={(evt) => setConfigText((evt.target as HTMLTextAreaElement).value ?? "")}>
                    {configText}
                </textarea>
            </div>
            <div style={{ width: "100%", padding: "0 var(--pico-spacing)" }}>
                <button type="button" style={{ width: "100%" }} onClick={applyRemoteConfig}>
                    {t({ zh: "应用", en: "Apply" })}
                </button>
                <button type="button" style={{ width: "100%" }} onClick={connectRemoteServer}>
                    {t({ zh: "连接远程服务器", en: "Connect to Remote" })}
                </button>
            </div>
        </>
    );
};
export default ControllerPage;
