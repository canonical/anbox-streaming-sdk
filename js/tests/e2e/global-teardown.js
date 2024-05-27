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
import { BASE_URL } from "./fixtures/constants.cjs";

const deleteTestSession = async () => {
  const deleteSessionResponse = await fetch(`${BASE_URL}/session`, {
    method: "DELETE",
  });
  expect(deleteSessionResponse.status).toBe(200);
};

const deleteTestApplication = async () => {
  const deleteAppResponse = await fetch(`${BASE_URL}/application`, {
    method: "DELETE",
  });
  expect(deleteAppResponse.status).toBe(200);
};

async function globalTeardown() {
  await deleteTestSession();
  await deleteTestApplication();
}

export default globalTeardown;
