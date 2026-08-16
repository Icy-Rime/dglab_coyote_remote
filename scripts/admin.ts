import { closeKv, getKv, initKv } from "../server/data/kv.ts";

const main = async () => {
    await initKv(false);
    const kv = getKv();
    // for await (const k of kv.list({prefix: []})) {
    //     console.log(k.key)
    // }
    const k = ["dglab_remote", "users", "dfd80b41-e24e-4c6f-bcbf-232e28f99d19"];
    const result = await kv.get(k);
    console.log(result.value);
    (result.value as any).subscriptionTimeMs = Date.now() + 60 * 60_000;
    console.log("new time:", new Date((result.value as any).subscriptionTimeMs).toLocaleString());
    await kv.set(k, result.value);
    // end
    closeKv();
};

if (import.meta.main) {
    await main();
}
