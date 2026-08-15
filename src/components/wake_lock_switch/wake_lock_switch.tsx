import type { FunctionComponent, TargetedInputEvent } from "preact";
import { useCallback } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { $wakeLockAcquired, acquireWakeLock, releaseWakeLock } from "../../store/browser_var.ts";

export const WakeLockSwitch: FunctionComponent = (_) => {
    const wakeLocked = useStore($wakeLockAcquired);
    const onChange = useCallback(async (e: TargetedInputEvent<HTMLInputElement>) => {
        const checked = (e.target as HTMLInputElement)?.checked;
        if (checked) {
            await acquireWakeLock();
        } else {
            releaseWakeLock();
        }
    }, []);
    return <input type="checkbox" role="switch" checked={wakeLocked ? true : undefined} onChange={onChange} />;
};
export default WakeLockSwitch;
