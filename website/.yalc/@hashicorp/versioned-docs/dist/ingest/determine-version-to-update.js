"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineVersionToUpdate = void 0;
const semver_1 = __importDefault(require("semver"));
function determineVersionToUpdate(versionList, newVersion) {
    // check if satisfies latest
    // if yes, update latest
    // if no, check if any labels
    // if yes, ignore
    // if no, check if gt or lt
    // if gt, add new latest
    // if lt, look for matching version and update
    const latestVersion = versionList.find((v) => v.isLatest);
    if (!latestVersion)
        return;
    const cleanNewVersion = semver_1.default.clean(newVersion);
    const isPrerelease = Boolean(semver_1.default.prerelease(cleanNewVersion));
    if (isPrerelease) {
        // do nothing?
        return;
    }
    // if latest is 1.1.0, we check ~1.1.0, so basically any patch release would match
    if (semver_1.default.satisfies(cleanNewVersion, `~${latestVersion.slug}`)) {
        // update latest version
        return latestVersion.slug;
    }
    if (semver_1.default.lt(cleanNewVersion, semver_1.default.coerce(latestVersion.slug))) {
        // check old versions
        const satisfiedOldVersion = versionList.find((v) => semver_1.default.satisfies(cleanNewVersion, `~${v.slug}`));
        if (satisfiedOldVersion)
            return satisfiedOldVersion.slug;
    }
    if (semver_1.default.gt(cleanNewVersion, semver_1.default.coerce(latestVersion.slug))) {
        // add new version
        return 'new';
    }
}
exports.determineVersionToUpdate = determineVersionToUpdate;
