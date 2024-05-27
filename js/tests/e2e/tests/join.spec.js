/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2024 Canonical Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect } from "@playwright/test";

test("join session", async ({ page }) => {
  await page.goto(`/?sessionId=${process.env.SESSION_ID}`);

  await expect(page.locator("#anbox-stream").locator("video")).toHaveCount(1);
  await expect(page.locator("#anbox-stream").locator("audio")).toHaveCount(1);
  await page.waitForFunction(() => globalThis.isReady !== undefined, null, {
    timeout: 20_000,
  });
});
