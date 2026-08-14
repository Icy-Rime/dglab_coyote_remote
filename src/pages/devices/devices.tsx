import type { FunctionComponent } from "preact";
import { useCallback, useMemo } from "preact/hooks";
import { useTranslator } from "../../hooks/i18n.ts";
import { useStore } from "@nanostores/preact";
import { atom } from "nanostores";
import type { Device } from "../../store/device.ts";
import { CoyoteBLEDevice } from "../../store/devices/coyote_ble.ts";
import { $savedDeviceIds } from "../../store/saved_devices.ts";
import { $isLogined } from "../../store/user_info.ts";
import { getSavedDevice, newSavedDevice, removeSavedDevice } from "../../store/saved_devices.ts";
import { Icon } from "../../components/icon/icon.tsx";

const emptyStatusText = atom("");

const addDevice = () => {
    newSavedDevice(CoyoteBLEDevice, "");
};

const DeviceCard: FunctionComponent<{ savedDeviceId: string }> = ({ savedDeviceId }) => {
    const t = useTranslator();
    const device: Device | undefined = useMemo(() => getSavedDevice(savedDeviceId), [savedDeviceId]);
    const deviceStatusText = useStore(device?.statusText ?? emptyStatusText);
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
        // device?.configureDevice();
    }, [device]);
    const actionDelete = useCallback(() => {
        device?.closeDevice();
        device?.closeEventChannel();
        removeSavedDevice(savedDeviceId);
    }, [device, savedDeviceId]);
    /* Render */
    if (!device) {
        return null;
    }
    return (
        <div style="margin-top: var(--pico-spacing); padding: 0 var(--pico-spacing); width: 100%;">
            <article>
                <header style="text-align: center;">{device.getDeviceId()}</header>
                <div style="width: 100%; text-align: center;">{deviceStatusText}</div>
                <div style="margin-top: var(--pico-spacing); display: flex; justify-content: center; align-items: center;">
                    <button
                        class="outline"
                        style="flex: 0 0 auto;"
                        data-tooltip={t({ zh: "连接设备", en: "Connect Device" })}
                    >
                        <Icon name="link" style="cursor: pointer;" onClick={actionConnect} />
                    </button>
                    <button
                        class="outline"
                        style="flex: 0 0 auto; margin-left: var(--pico-spacing); color: var(--tinyui-error-color); border-color: var(--tinyui-error-color);"
                        data-tooltip={t({ zh: "断开设备", en: "Disconnect Device" })}
                    >
                        <Icon name="slash" style="cursor: pointer;" onClick={actionDisconnect} />
                    </button>
                    <div style="flex: 1 1 auto;"></div>
                    <button
                        class="outline"
                        style="flex: 0 0 auto;"
                        data-tooltip={t({ zh: "配置设备", en: "Configure Device" })}
                    >
                        <Icon name="settings" style="cursor: pointer;" onClick={actionConfigure} />
                    </button>
                    <button
                        class="outline"
                        style="flex: 0 0 auto; margin-left: var(--pico-spacing); color: var(--tinyui-error-color); border-color: var(--tinyui-error-color);"
                        data-tooltip={t({ zh: "删除设备", en: "Delete Device" })}
                    >
                        <Icon name="trash-2" style="cursor: pointer;" onClick={actionDelete} />
                    </button>
                </div>
            </article>
        </div>
    );
};

export const DevicesPage: FunctionComponent = (_) => {
    const t = useTranslator();
    const savedDeviceIds = useStore($savedDeviceIds);
    console.log(savedDeviceIds);
    return (
        <div style="width: 100%; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: top;">
            {savedDeviceIds.map((savedDeviceId) => <DeviceCard key={savedDeviceId} savedDeviceId={savedDeviceId} />)}
            <button style="margin: var(--pico-spacing) 0;" onClick={addDevice}>
                {t({ zh: "添加设备", en: "Add Device" })}
            </button>
        </div>
    );
};
export default DevicesPage;
