#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const manifest_1 = require("../manifest");
async function main() {
    const [, , display, slug = display, ref = display] = process.argv;
    const manifest = await manifest_1.loadVersionManifest();
    if (manifest.find((version) => version.slug === slug)) {
        console.error('Version already exists in the manifest');
        return;
    }
    const newVersion = {
        display,
        slug,
        ref,
    };
    await manifest_1.writeVersionManifest([...manifest, newVersion]);
    console.log(`Version ${display} added to version-manifest.json`);
}
main();
