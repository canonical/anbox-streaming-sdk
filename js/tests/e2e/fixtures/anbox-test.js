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

import { test as base } from "@playwright/test";
import { finishCoverage, startCoverage } from "./coverage.js";

export const test = base.extend({
  runCoverage: [
    async ({ page, browserName }, use) => {
      const supportsCoverage = browserName === "chromium";
      if (supportsCoverage) {
        await startCoverage(page);
      }
      await use(page);
      if (supportsCoverage) {
        await finishCoverage(page);
      }
    },
    { auto: true },
  ],
});

export const expect = test.expect;
