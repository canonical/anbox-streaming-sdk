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

import { expect } from "@playwright/test";
import {
  AOSP_APP_NAME,
  AAOS_APP_NAME,
  BASE_URL,
} from "./fixtures/constants.cjs";
require("dotenv").config({ path: ".env.local" });

const deleteTestInstance = async (sessionId) => {
  if (!sessionId) {
    return;
  }
  const deleteInstanceResponse = await fetch(
    `${BASE_URL}/instance?sessionId=${sessionId}`,
    {
      method: "DELETE",
    },
  );
  expect(deleteInstanceResponse.status).toBe(200);
};

const deleteTestApplication = async (appName) => {
  const deleteAppResponse = await fetch(
    `${BASE_URL}/application?name=${appName}`,
    {
      method: "DELETE",
    },
  );
  expect(deleteAppResponse.status).toBe(200);
};

async function globalTeardown() {
  await deleteTestInstance(process.env.AOSP_SESSION_ID);
  await deleteTestApplication(AOSP_APP_NAME);
  await deleteTestInstance(process.env.AAOS_SESSION_ID);
  await deleteTestApplication(AAOS_APP_NAME);
}

export default globalTeardown;
