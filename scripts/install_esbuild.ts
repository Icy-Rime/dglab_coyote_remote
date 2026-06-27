import { version } from "esbuild";
import { dirname } from "@std/path";
import * as denoflate from "denoflate";

async function installFromNPM(
    name: string,
    subpath: string,
    executablePath: string,
    npmRegistry: string = "https://registry.npmjs.org",
): Promise<string> {
    const url = `${npmRegistry}/${name}/-/${name.replace("@esbuild/", "")}-${version}.tgz`;
    const buffer = await fetch(url).then((r) => r.arrayBuffer());
    const executable = extractFileFromTarGzip(new Uint8Array(buffer), subpath);
    const finalDir = dirname(executablePath);

    await Deno.mkdir(finalDir, {
        recursive: true,
        mode: 0o700, // https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
    });

    await Deno.writeFile(executablePath, executable, { mode: 0o755 });
    return executablePath;
}

function extractFileFromTarGzip(buffer: Uint8Array, file: string): Uint8Array {
    try {
        buffer = denoflate.gunzip(buffer);
    } catch (err) {
        throw new Error(`Invalid gzip data in archive: ${err && (err as Error).message || err}`);
    }
    const str = (i: number, n: number) => String.fromCharCode(...buffer.subarray(i, i + n)).replace(/\0.*$/, "");
    let offset = 0;
    file = `package/${file}`;
    while (offset < buffer.length) {
        const name = str(offset, 100);
        const size = parseInt(str(offset + 124, 12), 8);
        offset += 512;
        if (!isNaN(size) && size >= 0) {
            if (name === file) return buffer.subarray(offset, offset + size);
            offset += (size + 511) & ~511;
        }
    }
    throw new Error(`Could not find ${JSON.stringify(file)} in archive`);
}

async function install(executablePath: string, npmRegistry: string = "https://registry.npmjs.org"): Promise<string> {
    const platformKey = Deno.build.target;
    const knownWindowsPackages: Record<string, string> = {
        "x86_64-pc-windows-msvc": "@esbuild/win32-x64",
    };
    const knownUnixlikePackages: Record<string, string> = {
        // These are the only platforms that Deno supports
        "aarch64-apple-darwin": "@esbuild/darwin-arm64",
        "aarch64-unknown-linux-gnu": "@esbuild/linux-arm64",
        "x86_64-apple-darwin": "@esbuild/darwin-x64",
        "x86_64-unknown-linux-gnu": "@esbuild/linux-x64",

        // These platforms are not supported by Deno
        "aarch64-linux-android": "@esbuild/android-arm64",
        "x86_64-unknown-freebsd": "@esbuild/freebsd-x64",
        "x86_64-alpine-linux-musl": "@esbuild/linux-x64",
    };

    // Pick a package to install
    if (platformKey in knownWindowsPackages) {
        return await installFromNPM(knownWindowsPackages[platformKey], "esbuild.exe", executablePath, npmRegistry);
    } else if (platformKey in knownUnixlikePackages) {
        return await installFromNPM(knownUnixlikePackages[platformKey], "bin/esbuild", executablePath, npmRegistry);
    } else {
        throw new Error(`Unsupported platform: ${platformKey}`);
    }
}

if (import.meta.main) {
    if (Deno.args.length !== 1) {
        console.error(`deno run install_esbuild.ts <install_path>`);
    }
    const installPath = Deno.args[0];
    const npmRegistry = Deno.env.get("NPM_CONFIG_REGISTRY") || "https://registry.npmjs.org";
    await install(installPath, npmRegistry);
}
