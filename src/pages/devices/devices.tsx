import type { FunctionComponent } from "preact";
import { useCallback, useMemo, useState } from "preact/hooks";
import { useTranslator } from "../../hooks/i18n.ts";
import { useStore } from "@nanostores/preact";
import { atom } from "nanostores";
import type { Device } from "../../store/device.ts";
import { DeviceStatus, RemoteStatus } from "../../store/device.ts";
import { CoyoteBLEDevice } from "../../store/devices/coyote_ble.ts";
import { $savedDeviceIds } from "../../store/saved_devices.ts";
import { $isLogined } from "../../store/user_info.ts";
import { getSavedDevice, newSavedDevice, removeSavedDevice } from "../../store/saved_devices.ts";
import { Icon } from "../../components/icon/icon.tsx";
import { CoyoteBLESettingsDialog } from "./settings/coyote_ble.tsx";
import { ScreenSaverOverlay } from "./screen_saver.tsx";

const emptyText = atom("");
const emptyRemoteStatus = atom(RemoteStatus.CLOSED);
const emptyDeviceStatus = atom(DeviceStatus.DISCONNECTED);

const addDevice = () => {
    newSavedDevice(CoyoteBLEDevice, "");
};

const DeviceCard: FunctionComponent<{ savedDeviceId: string }> = ({ savedDeviceId }) => {
    const t = useTranslator();
    const [isSettingOpen, setIsSettingOpen] = useState(false);
    const device: Device | undefined = useMemo(() => getSavedDevice(savedDeviceId), [savedDeviceId]);
    const deviceId = useStore(device?.deviceId ?? emptyText);
    const deviceStatusText = useStore(device?.statusText ?? emptyText);
    const remoteStatus = useStore(device?.remoteStatus ?? emptyRemoteStatus);
    const deviceStatus = useStore(device?.deviceStatus ?? emptyDeviceStatus);

    /* Actions */
    const actionConnect = useCallback(() => {
        device?.connectDevice();
        if ($isLogined.get()) {
            // TODO: check if device with same id already connected.
            device?.connectEventChannel();
        }
    }, [device, $isLogined]);
    const actionDisconnect = useCallback(() => {
        device?.closeDevice();
        device?.closeEventChannel();
    }, [device]);
    const actionConfigure = useCallback(() => {
        setIsSettingOpen(true);
    }, [device, setIsSettingOpen]);
    const actionDelete = useCallback(() => {
        device?.closeDevice();
        device?.closeEventChannel();
        removeSavedDevice(savedDeviceId);
    }, [device, savedDeviceId]);
    const actionCloseSettings = useCallback(() => {
        setIsSettingOpen(false);
    }, [setIsSettingOpen]);
    /* Render */
    if (!device) {
        return null;
    }
    return (
        <>
            <div style="margin-top: var(--pico-spacing); padding: 0 var(--pico-spacing); width: 100%;">
                <article>
                    <header style="text-align: center;">
                        <div style="width: 100%; display: flex; align-items: stretch;">
                            <div
                                style={{
                                    flex: "0 0 1rem",
                                    backgroundColor: deviceStatus === DeviceStatus.CONNECTED
                                        ? "var(--tinyui-success-color)"
                                        : "transparent",
                                }}
                            >
                            </div>
                            <div style="flex: 1 1 auto;">{deviceId}</div>
                            <div
                                style={{
                                    flex: "0 0 1rem",
                                    backgroundColor: remoteStatus === RemoteStatus.CONNECTED
                                        ? "var(--tinyui-success-color)"
                                        : "transparent",
                                }}
                            >
                            </div>
                        </div>
                    </header>
                    <div style="width: 100%; text-align: center;">{deviceStatusText}</div>
                    <div style="margin-top: var(--pico-spacing); display: flex; justify-content: center; align-items: center;">
                        <button
                            class="outline"
                            style="flex: 0 0 auto;"
                            data-tooltip={t({ zh: "连接设备", en: "Connect Device" })}
                            onClick={actionConnect}
                        >
                            <Icon name="link" style="cursor: pointer;" />
                        </button>
                        <button
                            class="outline"
                            style="flex: 0 0 auto; margin-left: var(--pico-spacing); color: var(--tinyui-error-color); border-color: var(--tinyui-error-color);"
                            data-tooltip={t({ zh: "断开设备", en: "Disconnect Device" })}
                            onClick={actionDisconnect}
                        >
                            <Icon name="slash" style="cursor: pointer;" />
                        </button>
                        <div style="flex: 1 1 auto;"></div>
                        <button
                            class="outline"
                            style="flex: 0 0 auto;"
                            data-tooltip={t({ zh: "配置设备", en: "Configure Device" })}
                            onClick={actionConfigure}
                        >
                            <Icon name="settings" style="cursor: pointer;" />
                        </button>
                        <button
                            class="outline"
                            style="flex: 0 0 auto; margin-left: var(--pico-spacing); color: var(--tinyui-error-color); border-color: var(--tinyui-error-color);"
                            data-tooltip={t({ zh: "删除设备", en: "Delete Device" })}
                            onClick={actionDelete}
                        >
                            <Icon name="trash-2" style="cursor: pointer;" />
                        </button>
                    </div>
                </article>
            </div>
            {device instanceof CoyoteBLEDevice
                ? <CoyoteBLESettingsDialog device={device} isOpen={isSettingOpen} onClose={actionCloseSettings} />
                : null}
        </>
    );
};

export const DevicesPage: FunctionComponent = (_) => {
    const t = useTranslator();
    const [isScreenSaverOpen, setIsScreenSaverOpen] = useState(false);
    const savedDeviceIds = useStore($savedDeviceIds);

    const closeScreenSaver = useCallback(() => {
        setIsScreenSaverOpen(false);
    }, [setIsScreenSaverOpen]);

    return (
        <div style="width: 100%; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: top;">
            {savedDeviceIds.map((savedDeviceId) => <DeviceCard key={savedDeviceId} savedDeviceId={savedDeviceId} />)}
            <button style="margin: var(--pico-spacing) 0; display: flex; align-items: center;" onClick={addDevice}>
                {t({ zh: "添加设备", en: "Add Device" })}
                <Icon name="plus" style="margin-left: var(--pico-spacing);" />
            </button>
            <button
                style="margin-bottom: var(--pico-spacing); display: flex; align-items: center;"
                onClick={() =>
                    setIsScreenSaverOpen((prev) => !prev)}
            >
                {t({ zh: "屏幕保护", en: "Screen Saver" })}
                <Icon name="smartphone" style="margin-left: var(--pico-spacing);" />
            </button>
            <ScreenSaverOverlay isOpen={isScreenSaverOpen} onClose={closeScreenSaver} />
        </div>
    );
};
export default DevicesPage;
