import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const builderRequire = createRequire(require.resolve("electron-builder"));
builderRequire("app-builder-lib");
const { computeSafeArtifactNameIfNeeded } = builderRequire("app-builder-lib/out/platformPackager.js");
const config = JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).build;

test("release artifact names survive electron-builder GitHub normalization", () => {
  assert.equal(config.productName, "鞭陀-Desktop");
  for (const target of ["mac", "dmg", "nsis", "portable", "deb", "rpm", "linux"]) {
    const filename = config[target].artifactName.replace(/\$\{\w+\}/g, "test");
    assert.equal(computeSafeArtifactNameIfNeeded(filename, () => "unexpected-fallback"), null, target);
  }
});

const rubyAvailable = spawnSync("ruby", ["--version"]).status === 0;
test("release gate rejects missing, renamed, and corrupted updater assets", { skip: !rubyAvailable }, () => {
  const directory = mkdtempSync(join(tmpdir(), "release-assets-"));
  const filename = "BianTuo-Desktop-fixture.zip";
  const bytes = Buffer.from("release bytes");
  const sha512 = createHash("sha512").update(bytes).digest("base64");
  const feed = { version: "1.0.0", files: [{ url: filename, sha512, size: bytes.length }], path: filename, sha512 };
  const run = () => spawnSync("ruby", [fileURLToPath(new URL("../../../scripts/check-release-assets.rb", import.meta.url)), directory], { encoding: "utf8" });
  try {
    writeFileSync(join(directory, filename), bytes);
    for (const name of ["latest.yml", "latest-mac.yml", "latest-linux.yml"]) writeFileSync(join(directory, name), JSON.stringify(feed));
    const valid = run();
    assert.equal(valid.status, 0, valid.stderr);
    writeFileSync(join(directory, filename), "release Bytes");
    assert.match(run().stderr, /Checksum mismatch/);
    writeFileSync(join(directory, filename), bytes);
    writeFileSync(join(directory, "鞭陀-Desktop.zip"), bytes);
    assert.match(run().stderr, /Unsafe GitHub asset filename/);
    rmSync(join(directory, "鞭陀-Desktop.zip"));
    rmSync(join(directory, filename));
    assert.match(run().stderr, /Missing updater asset/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
