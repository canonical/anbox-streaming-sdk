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

import fs from "fs";
import crypto from "crypto";
import { fromSource, removeMapFileComments } from "convert-source-map";
import v8ToIstanbul from "v8-to-istanbul";

export const startCoverage = async (page) => {
  await page.coverage.startJSCoverage({
    reportAnonymousScripts: true,
    resetOnNavigation: false,
  });
};

export const finishCoverage = async (page) => {
  const coverage = await page.coverage.stopJSCoverage();
  for (const entry of coverage) {
    const fileMatcher = entry.url.match(/http(s)*:\/\/.*:2999\/(?<file>.*)/);
    if (
      !fileMatcher?.groups ||
      fileMatcher.groups.file !== "anbox-stream-sdk.js"
    ) {
      continue;
    }
    const source = removeMapFileComments(entry.source ?? "");
    const sourceMap = fromSource(entry.source ?? "");

    const converter = v8ToIstanbul(fileMatcher.groups.file, 0, {
      source,
      sourceMap,
    });
    await converter.load();
    converter.applyCoverage(entry.functions);
    const istanbulCoverage = converter.toIstanbul();

    // a unique name for this report
    const uuid = crypto.randomBytes(16).toString("hex");

    // _coverageSchema is mandatory for nyc to parse the report
    Object.entries(istanbulCoverage).forEach(([key]) => {
      istanbulCoverage[key]["_coverageSchema"] = uuid;
    });

    const outDir = "coverage";
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(
      `${outDir}/playwright_coverage_${uuid}.json`,
      JSON.stringify(istanbulCoverage),
    );
  }
};
