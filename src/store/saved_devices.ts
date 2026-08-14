import { persistentAtom, persistentJSON } from "@nanostores/persistent";
import { atom } from "nanostores";
import { Device } from "./device.ts";
import { CoyoteBLEDevice } from "./devices/coyote_ble.ts";

enum SavedDeviceType {
    COYOTE_BLE = "coyote_ble",
}

interface SavedDevice {
    deviceType: SavedDeviceType;
    configString: string;
}

const newDevice = (deviceType: SavedDeviceType, configString: string): Device | undefined => {
    switch (deviceType) {
        case SavedDeviceType.COYOTE_BLE:
            return new CoyoteBLEDevice(configString);
    }
    return undefined;
};

const deviceToType = (device: Device): SavedDeviceType => {
    if (device instanceof CoyoteBLEDevice) {
        return SavedDeviceType.COYOTE_BLE;
    }
    throw new Error("Invalid device type");
};

/* ==== Stores ==== */
const $savedDeviceTopId = persistentAtom<string>("saved_device_top_id", "1");
const $savedDevices = persistentJSON<Record<string, SavedDevice>>("saved_devices", {});
export const $savedDeviceIds = atom<string[]>(Object.keys($savedDevices.get()));
const devices = (() => {
    const m = new Map<string, Device>();
    const saved = $savedDevices.get();
    for (const key in saved) {
        if (!Object.hasOwn(saved, key)) continue;
        const elem = saved[key];
        const dev = newDevice(elem.deviceType, elem.configString);
        if (dev) {
            m.set(key, dev);
            dev.configString.listen((newConfigString) => {
                updateSavedDevice(key, newConfigString);
            });
        }
    }
    return m;
})();

/* ==== Actions ==== */
const newDeviceId = () => {
    const topIdText = $savedDeviceTopId.get();
    let topId = 1;
    try {
        topId = parseInt(topIdText);
    } catch {
        // ignore
    }
    let idText = topId.toString();
    while (idText.length < 10) {
        idText = "0" + idText;
    }
    topId++;
    $savedDeviceTopId.set(topId.toString());
    return idText;
};

export const newSavedDevice = <T extends Device>(
    deviceType: new (config: string) => T,
    configString: string = "",
) => {
    const dev = new deviceType(configString);
    const deviceTypeText = deviceToType(dev);
    let newId = newDeviceId();
    while ($savedDevices.get()[newId]) {
        newId = newDeviceId();
    }
    dev.configString.listen((newConfigString) => {
        updateSavedDevice(newId, newConfigString);
    });
    devices.set(newId, dev);
    $savedDevices.set({
        ...$savedDevices.get(),
        [newId]: {
            deviceType: deviceTypeText,
            configString: "",
        },
    });
    $savedDeviceIds.set(Object.keys($savedDevices.get()));
    return newId;
};

export const getSavedDevice = (deviceId: string) => {
    return devices.get(deviceId);
};

export const removeSavedDevice = (deviceId: string) => {
    if (!devices.has(deviceId)) {
        throw new Error("Device not found");
    }
    devices.delete(deviceId);
    const saved = $savedDevices.get();
    delete saved[deviceId];
    $savedDevices.set({
        ...saved,
    });
    $savedDeviceIds.set(Object.keys($savedDevices.get()));
};

export const updateSavedDevice = (deviceId: string, configString: string = "") => {
    if (!devices.has(deviceId)) {
        throw new Error("Device not found");
    }
    const dev = devices.get(deviceId);
    if (dev) {
        const saved = $savedDevices.get();
        saved[deviceId].configString = configString;
        $savedDevices.set({
            ...saved,
        });
    }
};
