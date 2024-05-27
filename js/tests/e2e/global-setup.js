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

import { chromium, expect } from "@playwright/test";
import { APP_NAME, BASE_URL } from "./fixtures/constants.cjs";

const isTestAppAvailable = async () => {
  const response = await fetch(`${BASE_URL}/asgApplications`);
  const applications = await response.json();
  return applications.find((application) => application.name === APP_NAME);
};

const hasTestSession = async () => {
  const response = await fetch(`${BASE_URL}/sessions`);
  const sessions = await response.json();
  return sessions.find((session) => session.app === APP_NAME);
};

const hasActiveTestSession = async () => {
  const response = await fetch(`${BASE_URL}/sessions`);
  const sessions = await response.json();
  const session = sessions.find(
    (session) => session.app === APP_NAME && session.status === "active",
  );
  return session ? session.id : false;
};

const waitForSessionActive = async (page) => {
  let retryCount = 0;
  while (retryCount < 20) {
    const sessionId = await hasActiveTestSession();
    if (sessionId) return sessionId;
    await page.waitForTimeout(3_000);
    retryCount++;
  }
  return false;
};

const createTestSession = async () => {
  const createSessionResponse = await fetch(
    `${BASE_URL}/session?app=${APP_NAME}`,
    {
      method: "POST",
    },
  );
  expect(createSessionResponse.status).toBe(200);
};

const hasTestApplication = async () => {
  const response = await fetch(`${BASE_URL}/applications`);
  const applications = await response.json();
  return applications.some((application) => application.name === APP_NAME);
};

const hasReadyTestApplication = async () => {
  const response = await fetch(`${BASE_URL}/applications`);
  const applications = await response.json();
  const app = applications.find((application) => application.name === APP_NAME);
  if (app && app.status === "error") {
    throw new Error("Application creation failed");
  }
  return applications.some(
    (application) =>
      application.name === APP_NAME && application.status === "ready",
  );
};

const waitForAppReady = async (page) => {
  let retryCount = 0;
  // 1) check that status becomes ready
  // we allow many retries as we need to give it time to download the image
  while (retryCount < 200) {
    const isReady = await hasReadyTestApplication();
    if (isReady) break;
    await page.waitForTimeout(3_000);
    retryCount++;
  }
  // 2) check that application is available on ASG
  while (retryCount < 200) {
    const isAvailable = await isTestAppAvailable();
    if (isAvailable) return true;
    await page.waitForTimeout(3_000);
    retryCount++;
  }
  return false;
};

const createTestApplication = async () => {
  const createAppResponse = await fetch(`${BASE_URL}/application`, {
    method: "POST",
  });
  expect(createAppResponse.status).toBe(200);
};

async function globalSetup() {
  const hasApp = await hasTestApplication();
  if (!hasApp) {
    await createTestApplication();
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const isAppReady = await waitForAppReady(page);
  if (!isAppReady) {
    throw new Error("Application did not become ready");
  }
  const hasSession = await hasTestSession();
  if (!hasSession) {
    await createTestSession();
  }
  const sessionId = await waitForSessionActive(page);
  if (!sessionId) {
    throw new Error("Session did not become active");
  }
  process.env.SESSION_ID = sessionId;
  // wait a few more seconds to let Android boot up
  await page.waitForTimeout(10_000);
  await browser.close();
}

export default globalSetup;
