import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/settings/ProductOnboardingDialog.tsx", import.meta.url),
  "utf8",
);

test("product onboarding delegates credentials and model selection to the provider form", () => {
  assert.match(source, /<ProviderSetupDialog/);
  assert.match(source, /initialServiceId=\{setupServiceId\}/);
  assert.match(source, /onSaved=\{\(provider, models\) => void saved\(provider, models\)\}/);
  assert.match(source, /await dismiss\(\)/);
  assert.match(source, /setSetupServiceId\("custom"\)/);
});

test("product onboarding is gated to a clean provider list and dismisses persistently", () => {
  assert.match(source, /providers\.length > 0/);
  assert.match(source, /api\.dismissOnboarding\(\)/);
  assert.match(source, /showChecklist: false/);
});
