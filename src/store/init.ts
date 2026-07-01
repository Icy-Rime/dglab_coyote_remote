import { batched } from "nanostores";
import { $_inited as $i1 } from "./user_auth.ts";
import { $_inited as $i2 } from "./user_info.ts";

export const $inited = batched([$i1, $i2], (...inits) => {
    let inited = true;
    for (const i of inits) {
        if (!i) {
            inited = false;
            break;
        }
    }
    return inited;
});
