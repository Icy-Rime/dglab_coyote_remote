import { assertEquals } from "@std/assert";
import { PromiseLock } from "./lock.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.test("utils/lock", async (t) => {
    const lock = new PromiseLock();
    await t.step("basic_functionality", async () => {
        // Initially unlocked
        assertEquals(lock.isLocked(), false);

        // Acquire lock
        await lock.lock();
        assertEquals(lock.isLocked(), true);

        // Release lock
        lock.unlock();
    });
    await t.step("race_condition", async () => {
        const edgeCondition = {
            value: globalThis.crypto.randomUUID(),
        };
        const task1 = async () => {
            await lock.lock();
            const selfValue = globalThis.crypto.randomUUID();
            edgeCondition.value = selfValue;
            await sleep(1);
            await sleep(0);
            await sleep(1);
            await sleep(0);
            assertEquals(edgeCondition.value, selfValue);
            lock.unlock();
        };
        const task2 = () => {
            return lock.do(async () => {
                const selfValue = globalThis.crypto.randomUUID();
                edgeCondition.value = selfValue;
                await sleep(0);
                await sleep(1);
                await sleep(0);
                await sleep(1);
                assertEquals(edgeCondition.value, selfValue);
            });
        };
        const task3 = lock.wrap(async (): Promise<void> => {
            const selfValue = globalThis.crypto.randomUUID();
            edgeCondition.value = selfValue;
            await sleep(1);
            await sleep(1);
            await sleep(1);
            await sleep(1);
            assertEquals(edgeCondition.value, selfValue);
        });
        const tasks = new Set<Promise<void>>();
        for (let i = 0; i < 20; i++) {
            tasks.add(task1());
        }
        for (let i = 0; i < 20; i++) {
            tasks.add(task2());
        }
        for (let i = 0; i < 20; i++) {
            tasks.add(task3());
        }
        await Promise.all(tasks);
    });
});
