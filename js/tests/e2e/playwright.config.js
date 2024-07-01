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

import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, SHARED_BROWSER_OPTIONS } from "./fixtures/constants.cjs";
require("dotenv").config({ path: ".env.local" });

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  globalTeardown: require.resolve("./global-teardown"),
  testDir: "./tests",
  snapshotPathTemplate:
    "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  /* Maximum time one test can run for. */
  timeout: 60_000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5_000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "html" : "line",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    video: "retain-on-failure",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...SHARED_BROWSER_OPTIONS,
      },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        ...SHARED_BROWSER_OPTIONS,
        // on Firefox, the picture-in-picture video toggle overlaps the video
        // element, so we need to disable it to avoid it getting in the way
        launchOptions: {
          firefoxUserPrefs: {
            "media.videocontrols.picture-in-picture.video-toggle.enabled": false,
          },
        },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
