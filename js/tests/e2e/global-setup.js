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
import {
  AOSP_APP_NAME,
  AAOS_APP_NAME,
  BASE_URL,
} from "./fixtures/constants.cjs";
require("dotenv").config({ path: ".env.local" });

const APP_RETRY_LIMIT = 300;
const SESSION_RETRY_LIMIT = 50;
const ANDROID_BOOT_DELAY = 20_000;

const isTestAppAvailable = async (appName) => {
  const response = await fetch(`${BASE_URL}/asgApplications`);
  const applications = await response.json();
  return applications.find((application) => application.name === appName);
};

const hasTestSession = async (appName) => {
  const response = await fetch(`${BASE_URL}/sessions`);
  const sessions = await response.json();
  return sessions.find((session) => session.app === appName);
};

const hasActiveTestSession = async (appName) => {
  const response = await fetch(`${BASE_URL}/sessions`);
  const sessions = await response.json();
  const session = sessions.find(
    (session) => session.app === appName && session.status === "active",
  );
  return session ? session.id : false;
};

const waitForSessionActive = async (page, appName) => {
  let retryCount = 0;
  while (retryCount < SESSION_RETRY_LIMIT) {
    const sessionId = await hasActiveTestSession(appName);
    if (sessionId) return sessionId;
    await page.waitForTimeout(3_000);
    retryCount++;
  }
  return false;
};

const createTestSession = async (appName) => {
  const createSessionResponse = await fetch(
    `${BASE_URL}/session?app=${appName}`,
    {
      method: "POST",
    },
  );
  expect(createSessionResponse.status).toBe(200);
};

const hasTestApplication = async (appName) => {
  const response = await fetch(`${BASE_URL}/applications`);
  const applications = await response.json();
  return applications.some((application) => application.name === appName);
};

const hasReadyTestApplication = async (appName) => {
  const response = await fetch(`${BASE_URL}/applications`);
  const applications = await response.json();
  const app = applications.find((application) => application.name === appName);
  if (app && app.status === "error") {
    throw new Error("Application creation failed");
  }
  return applications.some(
    (application) =>
      application.name === appName && application.status === "ready",
  );
};

const waitForAppReady = async (page, appName) => {
  let retryCount = 0;
  // 1) check that status becomes ready
  // we allow many retries as we need to give it time to download the image
  while (retryCount < APP_RETRY_LIMIT) {
    const isReady = await hasReadyTestApplication(appName);
    if (isReady) break;
    await page.waitForTimeout(3_000);
    retryCount++;
  }
  // 2) check that application is available on ASG
  while (retryCount < APP_RETRY_LIMIT) {
    const isAvailable = await isTestAppAvailable(appName);
    if (isAvailable) return true;
    await page.waitForTimeout(3_000);
    retryCount++;
  }
  return false;
};

const createTestApplication = async (appName) => {
  const createAppResponse = await fetch(
    `${BASE_URL}/application?name=${appName}`,
    {
      method: "POST",
    },
  );
  expect(createAppResponse.status).toBe(200);
};

const setupSessionFor = async (page, appName) => {
  const hasApp = await hasTestApplication(appName);
  if (!hasApp) {
    await createTestApplication(appName);
  }
  const isAppReady = await waitForAppReady(page, appName);
  if (!isAppReady) {
    throw new Error("Application did not become ready");
  }
  const hasSession = await hasTestSession(appName);
  if (!hasSession) {
    await createTestSession(appName);
  }
  const sessionId = await waitForSessionActive(page, appName);
  if (!sessionId) {
    throw new Error("Session did not become active");
  }
  // wait a few more seconds to let Android boot up
  await page.waitForTimeout(ANDROID_BOOT_DELAY);
  return sessionId;
};

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const sessionIds = [];
  for (const appName of [AOSP_APP_NAME, AAOS_APP_NAME]) {
    const id = await setupSessionFor(page, appName);
    sessionIds.push(id);
  }
  process.env.AOSP_SESSION_ID = sessionIds[0];
  process.env.AAOS_SESSION_ID = sessionIds[1];
  await browser.close();
}

export default globalSetup;
