import { persistentAtom, persistentJSON } from "@nanostores/persistent";
import { atom } from "nanostores";
import { Device } from "./device.ts";
import { CoyoteBLEDevice } from "./devices/coyote_ble.ts";

enum DeviceType {
    COYOTE_BLE = "coyote_ble",
}

interface SavedDevice {
    deviceType: DeviceType;
    configString: string;
}

const newDevice = (deviceType: string, configString: string) => {
    switch (deviceType) {
        case DeviceType.COYOTE_BLE:
            return new CoyoteBLEDevice(configString);
    }
    return undefined;
};

/* ==== Stores ==== */
export const $savedDeviceTopId = persistentAtom<string>("saved_device_top_id", "1");
export const $savedDevices = persistentJSON<Record<string, SavedDevice>>("saved_devices", {});
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

export const addSavedDevice = (deviceType: DeviceType, configString: string = "") => {
    const dev = newDevice(deviceType, configString);
    if (dev === undefined) {
        throw new Error("Invalid device type");
    }
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
            deviceType,
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
