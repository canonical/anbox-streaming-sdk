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

import { expect, test } from "@playwright/test";
import { joinSession, disconnectStream } from "./shared";

const VALUES = {
  287310858: { expected: 0, target: 1 }, // ABS_ACTIVE
  289475073: { expected: "6,0", target: "6,1" }, // AP_POWER_STATE_REPORT
  289409539: { expected: 82, target: 100 }, // DISPLAY_BRIGHTNESS
  291504900: { expected: 101, target: 101.5 }, // ENGINE_OIL_TEMP
  286261505: { expected: "Toy Vehicle", target: "Foo Bar" }, // INFO_MAKE
};

const TARGET_VHAL_PROPS = Object.keys(VALUES).map((id) => +id);

test("read VHAL prop configs, get VHAL prop values, set VHAL prop values", async ({
  page,
}) => {
  await joinSession(page, process.env.AAOS_SESSION_ID);

  await page.waitForFunction(
    () =>
      globalThis.vhalPropConfigs !== undefined &&
      globalThis.vhalPropConfigs.length > 0,
    null,
    {
      timeout: 20_000,
    },
  );

  const vhalProperties = await page.evaluate(async (TARGET_VHAL_PROPS) => {
    const filteredPropConfigs = globalThis.vhalPropConfigs.filter((prop) =>
      TARGET_VHAL_PROPS.includes(prop.prop),
    );
    const vhalProps =
      await globalThis.stream.getVhalProperties(filteredPropConfigs);
    return vhalProps;
  }, TARGET_VHAL_PROPS);

  expect(vhalProperties.length).toBe(TARGET_VHAL_PROPS.length);
  expect(vhalProperties.some((getResult) => getResult.error)).toBe(false);

  const getSetInput = (propId, targetType, isArray = false) => {
    const isStringValue = targetType === "string_value";
    const value = vhalProperties.find((prop) => prop.prop === propId);
    const currentValue =
      isArray || isStringValue ? `${value[targetType]}` : value[targetType][0];
    const setValue =
      currentValue === VALUES[propId].expected
        ? VALUES[propId].target
        : VALUES[propId].expected;
    return {
      area_id: 0,
      prop: propId,
      [targetType]: isStringValue
        ? setValue
        : isArray
          ? JSON.parse(`[${setValue}]`)
          : [setValue],
    };
  };

  const setInputs = [];
  setInputs.push(getSetInput(287310858, "int32_values")); // ABS_ACTIVE
  setInputs.push(getSetInput(289475073, "int32_values", true)); // AP_POWER_STATE_REPORT
  setInputs.push(getSetInput(289409539, "int32_values")); // DISPLAY_BRIGHTNESS
  setInputs.push(getSetInput(291504900, "float_values")); // ENGINE_OIL_TEMP
  setInputs.push(getSetInput(286261505, "string_value")); // INFO_MAKE

  const setProperties = await page.evaluate(async (setInputs) => {
    const res = await globalThis.stream.setVhalProperties(setInputs);
    return res;
  }, setInputs);

  expect(setProperties.length).toBe(TARGET_VHAL_PROPS.length);
  expect(setProperties.some((setResult) => setResult.error)).toBe(false);

  await disconnectStream(page);
});
