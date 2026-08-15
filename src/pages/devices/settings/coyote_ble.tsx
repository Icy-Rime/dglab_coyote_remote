import type { FunctionComponent } from "preact";
import { useCallback, useMemo } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { useTranslator } from "../../../hooks/i18n.ts";
import type { CoyoteDeviceChannelConfig } from "../../../store/devices/coyote_ble.ts";
import { CoyoteBLEDevice } from "../../../store/devices/coyote_ble.ts";
import { Dialog, usePrompt } from "../../../components/dialog/dialog.tsx";
import { useToast } from "../../../components/toast/toast.tsx";
import { Icon } from "../../../components/icon/icon.tsx";

const CoyoteBLESettingsForChannel: FunctionComponent<
    { device: CoyoteBLEDevice; ch: "chA" | "chB" }
> = ({ device, ch }) => {
    const t = useTranslator();
    const status = useStore(device.status);
    const config = useStore(device.config);
    const prompt = usePrompt();
    const toast = useToast();
    /* Actions */
    const actionLevelUp = useCallback(() => {
        const func = ch === "chA" ? "setLevelA" : "setLevelB";
        device[func](status[ch].level + 1);
    }, [ch, status]);
    const actionLevelDown = useCallback(() => {
        const func = ch === "chA" ? "setLevelA" : "setLevelB";
        device[func](status[ch].level - 1);
    }, [ch, status]);
    /* Render */
    const levelText = useMemo(() => {
        const lv = status[ch].level;
        return lv >= 0 ? lv.toString() : t({ zh: "关", en: "Off" });
    }, [status, t]);
    const renderNumberConfig = useCallback(
        (field: keyof CoyoteDeviceChannelConfig, name: string, unit: string, hint: string) => {
            const chCfg = config[ch];
            const actionEdit = async () => {
                const ret = await prompt(hint, chCfg[field].toString(), name);
                if (!ret) return;
                try {
                    const num = Number.parseFloat(ret);
                    const newCfg = structuredClone(config);
                    newCfg[ch][field] = num;
                    await device.updateConfig(newCfg);
                    toast(t({ zh: "已更新", en: "Updated" }), "success");
                } catch (e) {
                    toast(t({ zh: "请输入数字", en: "Please input a number" }), "error");
                }
            };
            return (
                <>
                    <div
                        style="width: 100%; display: flex; align-items: center; padding: var(--pico-spacing) 0; cursor: pointer;"
                        onClick={actionEdit}
                    >
                        <div style="flex: 1 1 auto; text-align: left; overflow: hidden; white-space: pre-wrap; overflow-wrap: break-word;">
                            <>{name}: {chCfg[field]}{unit ? <>&nbsp;{unit}</> : ""}</>
                        </div>
                    </div>
                    <hr style="margin: 0;" />
                </>
            );
        },
        [config, t],
    );
    return (
        <div style="width: 100%;">
            {/* level display */}
            <div style="width: 100%; font-size: 2rem; text-align: center;">
                {levelText}
            </div>
            {/* level controls */}
            <div style="width: 100%; display: flex; margin-top: var(--pico-spacing);">
                <button style="flex: 0 0 auto" onClick={actionLevelDown}>
                    <Icon name="minus" />
                </button>
                <div style="flex: 1 1 auto"></div>
                <button style="flex: 0 0 auto" onClick={actionLevelUp}>
                    <Icon name="plus" />
                </button>
            </div>
            <hr />
            {/* remote control level configuration */}
            {renderNumberConfig(
                "zapLevel",
                t({ zh: "电击等级", en: "Zap Level" }),
                "",
                t({ zh: "快速电击等级 (0-200)", en: "Quick Zap Level (0-200)" }),
            )}
            {renderNumberConfig(
                "zapDuration",
                t({ zh: "电击时长", en: "Zap Duration" }),
                t({ zh: "秒", en: "s" }),
                t({ zh: "快速电击时长(秒)", en: "Quick Zap Duration (seconds)" }),
            )}
            {renderNumberConfig(
                "lowLevel",
                t({ zh: "低强度等级", en: "Low Level" }),
                "",
                t({ zh: "低强度电击的等级 (0-200)", en: "Low Zap Level (0-200)" }),
            )}
            {renderNumberConfig(
                "middleLevel",
                t({ zh: "中强度等级", en: "Middle Level" }),
                "",
                t({ zh: "中强度电击的等级 (0-200)", en: "Middle Zap Level (0-200)" }),
            )}
            {renderNumberConfig(
                "highLevel",
                t({ zh: "高强度等级", en: "High Level" }),
                "",
                t({ zh: "高强度电击的等级 (0-200)", en: "High Zap Level (0-200)" }),
            )}
        </div>
    );
};

export const CoyoteBLESettingsDialog: FunctionComponent<
    { device: CoyoteBLEDevice; isOpen: boolean; onClose: () => void }
> = ({ device, isOpen, onClose }) => {
    const t = useTranslator();
    const prompt = usePrompt();
    const toast = useToast();
    const deviceId = useStore(device.deviceId);
    const deviceStatusText = useStore(device.statusText);
    const config = useStore(device.config);
    /* Actions */
    const actionRename = useCallback(async () => {
        const newId = await prompt(
            t({ zh: "请输入新设备ID", en: "Enter New Device ID" }),
            deviceId,
            t({ zh: "重命名", en: "Rename" }),
        );
        if (!newId) {
            return;
        }
        if (newId === deviceId) {
            return;
        }
        // check newId is valid
        if (!/^[a-zA-Z0-9_]+$/.test(newId)) {
            toast(
                t({
                    zh: "新设备ID只能包含字母、数字、短横杠和下划线",
                    en: "New device ID can only contain letters, numbers, hyphens, and underscores",
                }),
                "error",
                "long",
            );
            return;
        }
        const newConfig = {
            ...config,
            deviceId: newId,
        };
        toast(
            t({
                zh: "重命名成功，新设备名将在重新连接后生效",
                en: "Rename success, new device name will take effect after reconnect",
            }),
            "success",
            "long",
        );
        await device.updateConfig(newConfig);
    }, [device, deviceId, t, prompt]);
    /* Render */
    return (
        <Dialog
            isOpen={isOpen}
            onCancel={onClose}
            title={t({ zh: "配置郊狼", en: "Configure Coyote" })}
            clickOutsideCancel={false}
            showCloseButton={true}
            footer={false}
            style="width: 100%; max-width: 600px;"
        >
            <div style="width: 100%; display: flex; align-items: center;">
                <div style="flex: 1 1 auto; text-align: center; overflow: hidden; overflow-wrap: break-word;">
                    {deviceId}
                </div>
                <button style="flex: 0 0 auto;" onClick={actionRename}>{t({ zh: "重命名", en: "Rename" })}</button>
            </div>
            <hr />
            <div style="width: 100%; margin-top: var(--pico-spacing);">
                <div style="width: 100%; text-align: center;">{deviceStatusText}</div>
            </div>
            <div style="width: 100%; overflow-x: auto; display: flex; margin-top: var(--pico-spacing);">
                <div style="flex: 1 1 50%; overflow-x: auto;">
                    <CoyoteBLESettingsForChannel device={device} ch="chA" />
                </div>
                <div style="flex: 0 0 1px; background-color: var(--pico-primary); margin: 0 var(--pico-spacing);"></div>
                <div style="flex: 1 1 50%; overflow-x: auto;">
                    <CoyoteBLESettingsForChannel device={device} ch="chB" />
                </div>
            </div>
        </Dialog>
    );
};
export default CoyoteBLESettingsDialog;
