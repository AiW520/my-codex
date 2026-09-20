import assert from "node:assert/strict";
import test from "node:test";
import { resolveReleaseVersions } from "./check-release-version.mjs";

test("stable releases use one version for surfaces and the catalog", () => {
  assert.deepEqual(resolveReleaseVersions("0.15.1", "0.15.1"), {
    surfaceVersion: "0.15.1",
    catalogVersion: "0.15.1",
    releaseLine: "0.15.x",
  });
});

test("prereleases retain their surface version while checking the stable catalog", () => {
  assert.deepEqual(resolveReleaseVersions("0.15.1-beta.5", "0.15.1"), {
    surfaceVersion: "0.15.1-beta.5",
    catalogVersion: "0.15.1",
    releaseLine: "0.15.x",
  });
});

test("catalog checks cannot cross stable release lines", () => {
  assert.throws(
    () => resolveReleaseVersions("0.15.1-beta.5", "0.16.0"),
    /does not match package version/,
  );
});
