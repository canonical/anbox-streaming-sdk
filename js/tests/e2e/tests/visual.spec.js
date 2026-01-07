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

const swipeCoordinates = {
  openStatusBar: {
    x: 640,
    startY: 10,
    endY: 300,
  },
  openAppDrawer: {
    x: 640,
    startY: 400,
    endY: 50,
  },
}

const tapHomeButton = async (page) => {
  await page.mouse.click(640, 700);
  // Wait 2s (home screen animation)
  await page.waitForTimeout(2000);
};

const swipeVertically = async (page, action) => {
  if(Object.keys(swipeCoordinates).includes(action)){
    await page.mouse.move(swipeCoordinates[action].x, swipeCoordinates[action].startY);
    await page.mouse.down();
    await page.mouse.move(swipeCoordinates[action].x, swipeCoordinates[action].endY);
    await page.mouse.up();
    // Wait for action animation
    await page.waitForTimeout(1000);
  } else {
    test.fail(true, "Action does not exist in swipeCoordinates");
  }
}

const openSearchBar = async (page) => {
  await page.mouse.click(525, 125);
  // Wait 1s (search screen animation)
  await page.waitForTimeout(1000);
};

const typeSearch = async (page, text) => {
  await page.keyboard.type(text);
  // Wait 1s (text input)
  await page.waitForTimeout(1000);
  await expect(page).toHaveScreenshot("app-drawer-settings.png", OPTIONS);
};

const longPressHome = async (page) => {
  await page.locator("#anbox-stream").click({
    position: { x: 640, y: 350 },
    delay: 1000,
  });
  await expect(page).toHaveScreenshot("long-press-home.png", OPTIONS);
};

test("AOSP visual tests: touch and keyboard input", async ({ page }) => {
  await joinSession(page, process.env.AOSP_SESSION_ID);
  await tapHomeButton(page);

  await swipeVertically(page, "openAppDrawer");
  await openSearchBar(page);
  await typeSearch(page, "Settings");

  await tapHomeButton(page);
  await disconnectStream(page);
});

test("AOSP visual tests: long press input", async ({ page }) => {
  await joinSession(page, process.env.AOSP_SESSION_ID);
  await longPressHome(page);
  await disconnectStream(page);
});

test("AOSP visual tests: swipe", async ({ page }) => {
  await joinSession(page, process.env.AOSP_SESSION_ID);
  await swipeVertically(page, "openStatusBar");
  // Wait 1s (system UI expand animation)
  await page.waitForTimeout(1000);
  await expect(page).toHaveScreenshot("status-bar-swipe.png", OPTIONS);
  await disconnectStream(page);
});
