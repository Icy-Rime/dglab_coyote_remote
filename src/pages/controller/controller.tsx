import { useMemo } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { useTranslator } from "../../hooks/i18n.ts";
import { Icon } from "../../components/icon/icon.tsx";
import type { FunctionComponent } from "preact";
import type { WaveDataGenerator } from "../../utils/coyote_ble.ts";

import { $device, coyote } from "../../store/coyote.ts";
import { $remoteConfigText, resetRemoteConfigText, setRemoteConfigText } from "../../store/coyote.ts";
import { applyRemoteConfig, connectToEventSource } from "../../store/coyote.ts";

const testWaveGenerator: WaveDataGenerator = {
    generateV3Wave: (_timeMs) => {
        return [[240, 80], [180, 100], [240, 80], [10, 0]];
        // return [[240, 50], [10, 100], [240, 50], [10, 100]]; // viberating
    },
};
coyote.setWaveGeneratorA(testWaveGenerator);
coyote.setWaveGeneratorB(testWaveGenerator);

export const ControllerPage: FunctionComponent = (_) => {
    const remoteConfigText = useStore($remoteConfigText);
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
    const applyRemoteConfigWrapper = useMemo(() => () => {
        if (applyRemoteConfig()) {
            return true;
        } else {
            alert(t({ zh: "JSON格式错误", en: "JSON Error" }));
            return false;
        }
    }, [applyRemoteConfig, t]);
    const connectToEventSourceWrapper = useMemo(() => () => {
        if (!applyRemoteConfig()) {
            alert(t({ zh: "JSON格式错误", en: "JSON Error" }));
            return false;
        }
        if (connectToEventSource()) {
            return true;
        } else {
            alert(t({ zh: "entryName 不能为空", en: "entryName can not be empty" }));
            return false;
        }
    }, [applyRemoteConfig, t]);
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
                <textarea
                    rows={8}
                    onInput={(evt) => setRemoteConfigText((evt.target as HTMLTextAreaElement).value ?? "")}
                >
                    {remoteConfigText}
                </textarea>
            </div>
            <div style={{ width: "100%", padding: "0 var(--pico-spacing)" }}>
                <button type="button" style={{ width: "100%" }} onClick={applyRemoteConfigWrapper}>
                    {t({ zh: "应用", en: "Apply" })}
                </button>
                <button type="button" style={{ width: "100%" }} onClick={connectToEventSourceWrapper}>
                    {t({ zh: "连接远程服务器", en: "Connect to Remote" })}
                </button>
                <br/>
                <button type="button" style={{ width: "100%" }} onClick={resetRemoteConfigText}>
                    {t({ zh: "重置配置", en: "Reset Config" })}
                </button>
            </div>
        </>
    );
};
export default ControllerPage;
