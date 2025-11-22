// Ensure Lightning CSS and Tailwind Oxide native bindings exist on Linux CI environments.
import {execSync} from "node:child_process";
import {existsSync, readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const platform = process.platform;
const arch = process.arch;

if (platform !== "linux") {
    console.log(`ℹ️ Skipping native binary install on ${platform}/${arch}`);
    process.exit(0);
}

const libcVariant = detectLibc();

const lightningcssVersion = readInstalledVersion("lightningcss");
const oxideVersion = readInstalledVersion("@tailwindcss/oxide");

const targets = [
    {
        name: "lightningcss",
        version: lightningcssVersion,
        package: makeLightningcssPackage(arch, libcVariant),
    },
    {
        name: "@tailwindcss/oxide",
        version: oxideVersion,
        package: makeOxidePackage(arch, libcVariant),
    },
];

targets.forEach((target) => {
    if (!target.package || !target.version) {
        console.warn(`⚠️ Skipping ${target.name} – unsupported platform (${platform}/${arch}) or missing version`);
        return;
    }

    const moduleDir = path.join(projectRoot, "node_modules", ...target.package.split("/"));
    if (existsSync(moduleDir)) {
        console.log(`✅ ${target.package}@${target.version} already present for ${platform}/${arch} (${libcVariant})`);
        return;
    }

    console.log(`📦 Installing ${target.package}@${target.version} for ${platform}/${arch} (${libcVariant})...`);
    execSync(`npm install --no-save ${target.package}@${target.version}`, {
        cwd: projectRoot,
        stdio: "inherit",
    });
});

function readInstalledVersion(packageName) {
    try {
        const packageJsonPath = path.join(projectRoot, "node_modules", ...packageName.split("/"), "package.json");
        return JSON.parse(readFileSync(packageJsonPath, "utf8")).version;
    } catch (err) {
        console.warn(`⚠️ Could not determine installed version for ${packageName}: ${err.message}`);
        return null;
    }
}

function detectLibc() {
    try {
        const output = execSync("ldd --version", {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        });
        if (/musl/i.test(output)) {
            return "musl";
        }
    } catch {
        // Ignore and fall through to filesystem inspection.
    }

    try {
        const lddContents = readFileSync("/usr/bin/ldd", "utf8");
        if (/musl/i.test(lddContents)) {
            return "musl";
        }
    } catch {
        // Ignore missing ldd – default to glibc.
    }

    return "gnu";
}

function makeLightningcssPackage(currentArch, libc) {
    if (currentArch === "x64") {
        return `lightningcss-linux-x64-${libc}`;
    }
    if (currentArch === "arm64") {
        return `lightningcss-linux-arm64-${libc}`;
    }
    if (currentArch === "arm") {
        return "lightningcss-linux-arm-gnueabihf";
    }
    return null;
}

function makeOxidePackage(currentArch, libc) {
    if (currentArch === "x64") {
        return `@tailwindcss/oxide-linux-x64-${libc}`;
    }
    if (currentArch === "arm64") {
        return `@tailwindcss/oxide-linux-arm64-${libc}`;
    }
    if (currentArch === "arm") {
        return "@tailwindcss/oxide-linux-arm-gnueabihf";
    }
    return null;
}
