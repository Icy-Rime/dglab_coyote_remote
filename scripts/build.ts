import * as esbuild from "esbuild";
import { denoPlugins } from "@oazmi/esbuild-plugin-deno";
import * as path from "@std/path";
import { copy, exists } from "@std/fs";
import { serveDir } from "@std/http";

interface ENTRY_ITEM {
    in: string;
    out: string;
}

const SRC_DIR = path.resolve(import.meta.dirname!, "..");
const BUILD_DIR = path.resolve(import.meta.dirname!, "..", "dist");
const ENTRY_LIST = [
    { in: "src/main.ts", out: "index" },
    { in: "src/sw.ts", out: "sw" },
] as Array<ENTRY_ITEM>;
const STATIC_LIST = [
    { in: "static", out: "" },
] as Array<ENTRY_ITEM>;
const WATCH_PATH = [
    path.resolve(SRC_DIR, "src"),
    path.resolve(SRC_DIR, "static"),
];

const [entry_plugin, http_plugin, jsr_plugin, npm_plugin, resolver_pipeline_plugin] = denoPlugins({
    // enabling logging will let you see which resources are being resolved, and what their resolved path is.
    log: false,
    // auto-install npm-packages that have not been cached into a local "./node_modules/" directory.
    // the "auto-cli" method of installation will vary based on your runtime,
    // however, you can greatly customize it and even provide a custom cli-command generator yourself.
    // see the docs for the list of possible options.
    autoInstall: "auto-cli", // or just provide `true`
});

const build = async () => {
    const isRelease = Deno.args.includes("--release");

    // prepare dirs
    if (await exists(BUILD_DIR)) {
        await Deno.remove(BUILD_DIR, { recursive: true });
    }

    // copy files
    for (const item of STATIC_LIST) {
        await copy(
            path.resolve(SRC_DIR, item.in),
            path.resolve(BUILD_DIR, item.out),
        );
    }

    // build entry list
    const entryPoints = [];
    for (const item of ENTRY_LIST) {
        entryPoints.push({ out: item.out, in: path.resolve(SRC_DIR, item.in) });
    }

    // build js
    const result = await esbuild.build({
        plugins: [entry_plugin, http_plugin, jsr_plugin, npm_plugin, resolver_pipeline_plugin],
        entryPoints: entryPoints,
        outdir: BUILD_DIR,
        bundle: true,
        sourcemap: true,
        minify: isRelease,
        treeShaking: true,
        format: "esm",
        jsx: "automatic",
        jsxFactory: "h",
        jsxImportSource: "preact",
        jsxFragment: "Fragment",
        platform: "browser",
        target: [
            "es2020",
        ],
    });
    await esbuild.stop();
    if (result?.errors) {
        for (const msg of result.errors) {
            console.error(msg);
        }
    }
};

const watch = async () => {
    const watcher = Deno.watchFs(WATCH_PATH, { recursive: true });
    let lastTime = Date.now();
    for await (const event of watcher) {
        // check event type
        if (event.kind !== "modify") {
            continue;
        }
        // limit not too fast
        const nowTime = Date.now();
        if (nowTime - lastTime < 1000) {
            continue;
        }
        // rebuild
        console.log("[" + new Date().toLocaleString() + "] [BUILD]", "Rebuilding...");
        try {
            await build();
        } catch (e) {
            console.error(e);
        }
        lastTime = nowTime;
    }
};

if (import.meta.main) {
    await build();
    if (Deno.args.includes("--watch")) {
        await watch();
    }
}

// deno serve
let serveIsWatching = false;
let firstTimeBuildPromise: Promise<void> | null = null;
export default {
    async fetch(req) {
        if (!serveIsWatching) {
            // first time, build
            if (firstTimeBuildPromise === null) {
                firstTimeBuildPromise = build();
            }
            await firstTimeBuildPromise;
            if (!serveIsWatching) {
                serveIsWatching = true;
                watch(); // watch in the background
            }
        }
        if (new URL(req.url).pathname === "/") {
            return new Response("", {
                status: 302,
                headers: {
                    "Location": "/index.html",
                },
            });
        }
        return await serveDir(req, {
            urlRoot: "",
            fsRoot: BUILD_DIR,
            showDirListing: true,
        });
    },
} satisfies Deno.ServeDefaultExport;
