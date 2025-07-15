import { atom } from "nanostores";
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
