import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { objectGet, objectSet } from "./jpath.ts";

const getInitObject = () => {
    return {
        a: {
            b: "text",
            c: ["e", "f"],
        },
        d: [
            { e: "Hello" },
            { f: ["dragon", "wyvern", "kobold"] },
            ["0", "1", "2", "3"],
        ],
        anyInArray: [
            { name: "Mike", gender: "Male" },
            { name: "Anna", gender: "Female" },
            { name: "Black", gender: "Any" },
            { name: "White", gender: "Unknown" },
        ],
    };
};

Deno.test("jpathTest", async (t) => {
    await t.step("simpleGetTest", () => {
        const obj = { ...getInitObject() };
        const value = objectGet<typeof obj, string>(obj, "d[1].f[0]", "");
        assertEquals(value, "dragon");
    });
    await t.step("simpleSetTest", () => {
        const obj = { ...getInitObject() };
        const replacement = ["pet"];
        assertFalse(objectSet(obj, "d[1].c[0]", replacement));
        assertFalse(objectSet(obj, "d[1].e[0]", replacement));
        assertFalse(objectSet(obj, "d[1].f[3]", replacement));
        assert(objectSet(obj, "d[1].f[0]", replacement));
        const value = objectGet<typeof obj, string[]>(obj, "d[1].f[0]", []);
        assertEquals(value, replacement);
    });
    await t.step("listGetTest", () => {
        const obj = { ...getInitObject() };
        const value = objectGet<typeof obj, string[]>(
            obj,
            "anyInArray[*].name",
            [],
        );
        assertEquals(value, ["Mike", "Anna", "Black", "White"]);
    });
    await t.step("listSetTest", () => {
        const obj = { ...getInitObject() };
        assertFalse(objectSet(obj, "anyInArray[*].detail", "Desc"));
        assert(objectSet(obj, "anyInArray[*].gender", "Unknown"));
        const value = objectGet<typeof obj, string[]>(
            obj,
            "anyInArray[*].gender",
            [],
        );
        assertEquals(value, ["Unknown", "Unknown", "Unknown", "Unknown"]);
        const obj2 = [
            {
                name: "Dreagonmon",
                crime: "Take over the prison by hacking into the database.",
                number: "P-60001",
            },
            { name: "Wyvern", crime: "Unknown creature.", number: "P-60002" },
        ];
        const value2 = objectGet<typeof obj2, string[]>(
            obj2,
            "[*].number",
            [],
        );
        assertEquals(value2, ["P-60001", "P-60002"]);
    });
    await t.step("objectGetTest", () => {
        const obj = [
            {
                name: "Dreagonmon",
                crime: "Take over the prison by hacking into the database.",
                number: "P-60001",
            },
            { name: "Wyvern", crime: "Unknown creature.", number: "P-60002" },
        ];
        const value = objectGet<typeof obj, unknown[]>(
            obj,
            "[*].{number,name}",
            [],
        );
        assertEquals(value, [
            { name: "Dreagonmon", number: "P-60001" },
            { name: "Wyvern", number: "P-60002" },
        ]);
    });
    await t.step("maxPathDepthTest", () => {
        const obj = { ...getInitObject() };
        let value = objectGet<typeof obj, string>(
            obj,
            "d[1].f[0]",
            "fallback",
            4,
        );
        assertEquals(value, "dragon");
        assertThrows(() => {
            value = objectGet<typeof obj, string>(
                obj,
                "d[1].f[0]",
                "fallback",
                3,
            );
        });
    });
});
