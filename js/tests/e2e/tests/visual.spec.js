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

import { expect, test } from "../fixtures/anbox-test";
import { joinSession, disconnectStream } from "./shared";

const OPTIONS = {
  clip: {
    x: 438,
    y: 30, // crop the status bar, which has changing content (date/time)
    width: 405,
    height: 690,
  },
  maxDiffPixels: 25, // allowing some leeway for the EditText caret
};

const tapHomeButton = async (page) => {
  await page.touchscreen.tap(640, 700);
  // Wait 1s (home screen animation)
  await page.waitForTimeout(1000);
  await expect(page).toHaveScreenshot("aosp-home.png", OPTIONS);
};

const openSearchBar = async (page) => {
  await page.touchscreen.tap(525, 85);
  // Wait 1s (search screen animation)
  await page.waitForTimeout(1000);
};

const typeSearch = async (page, text) => {
  await page.keyboard.type(text);
  // Wait 1s (text input)
  await page.waitForTimeout(1000);
  await expect(page).toHaveScreenshot("text-input.png", OPTIONS);
};

test("AOSP visual tests: touch and keyboard input", async ({ page }) => {
  await joinSession(page, process.env.AOSP_SESSION_ID);

  await tapHomeButton(page);
  await openSearchBar(page);
  await typeSearch(page, "foo");
  await tapHomeButton(page);

  await disconnectStream(page);
});

const longPressHome = async (page) => {
  await page.locator("#anbox-stream").click({
    position: { x: 640, y: 350 },
    delay: 1000,
  });
  await expect(page).toHaveScreenshot("long-press-home.png", OPTIONS);
};

test("AOSP visual tests: long press input", async ({ browser }) => {
  // Since Playwright does not support long press using the tap() method, we
  // need to give up touch for this test, and use regular click events instead
  const context = await browser.newContext({ hasTouch: false });
  const page = await context.newPage();

  await joinSession(page, process.env.AOSP_SESSION_ID);
  await longPressHome(page);
  await disconnectStream(page);
});

const swipeStatusBarDown = async (page) => {
  await page.mouse.move(640, 10);
  await page.mouse.down();
  await page.mouse.move(640, 300);
  await page.mouse.up();
  // Wait 1s (system UI expand animation)
  await page.waitForTimeout(1000);
  await expect(page).toHaveScreenshot("status-bar-swipe.png", OPTIONS);
};

test("AOSP visual tests: swipe", async ({ browser }) => {
  // Since Playwright does not support mobile gestures like the swipe one, we
  // need to give up touch for this test, and use regular mouse events instead
  const context = await browser.newContext({ hasTouch: false });
  const page = await context.newPage();

  await joinSession(page, process.env.AOSP_SESSION_ID);
  await swipeStatusBarDown(page);
  await disconnectStream(page);
});
