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

const VALUES = {
  287310858: { expected: 0, target: 1 }, // ABS_ACTIVE
  289409539: { expected: 82, target: 100 }, // DISPLAY_BRIGHTNESS
  291504900: { expected: 101, target: 101.5 }, // ENGINE_OIL_TEMP
  286261505: { expected: "Toy Vehicle", target: "Foo Bar" }, // INFO_MAKE
  290521862: {
    expected: "0,100000,200000,300000,400000",
    target: "0,100001,200001,300001,400001",
  }, // WHEEL_TICK
  289475073: { expected: "6,0", target: "6,1" }, // AP_POWER_STATE_REPORT
};

const TARGET_VHAL_PROPS = Object.keys(VALUES).map((id) => +id);

const waitForVhalReady = async (page) => {
  await page.waitForFunction(() => globalThis.vhalReady !== undefined, null, {
    timeout: 20_000,
  });
};

const checkVhalAvailable = async (page, expectedResult) => {
  const isVhalAvailable = await page.evaluate(() =>
    globalThis.stream.isVhalAvailable(),
  );
  expect(isVhalAvailable).toBe(expectedResult);
};

const getAllVhalPropConfigs = async (page) => {
  const allVhalPropConfigs = await page.evaluate(() =>
    globalThis.stream.getAllVhalPropConfigs(),
  );
  return allVhalPropConfigs;
};

const getVhalProperties = async (page, vhalPropConfigs) => {
  const vhalProperties = await page.evaluate(
    async ([vhalPropConfigs, TARGET_VHAL_PROPS]) => {
      const filteredPropConfigs = vhalPropConfigs.filter((prop) =>
        TARGET_VHAL_PROPS.includes(prop.prop),
      );
      const vhalProps =
        await globalThis.stream.getVhalProperties(filteredPropConfigs);
      return vhalProps;
    },
    [vhalPropConfigs, TARGET_VHAL_PROPS],
  );
  return vhalProperties;
};

const setVhalProperties = async (page, setInputs) => {
  const setResults = await page.evaluate(async (setInputs) => {
    const res = await globalThis.stream.setVhalProperties(setInputs);
    return res;
  }, setInputs);
  return setResults;
};

const getValueObject = (prop) => {
  if (Object.hasOwn(prop, "int32_values")) {
    return {
      [prop.prop]: prop.int32_values,
    };
  } else if (Object.hasOwn(prop, "int64_values")) {
    return {
      [prop.prop]: prop.int64_values,
    };
  } else if (Object.hasOwn(prop, "float_values")) {
    return {
      [prop.prop]: prop.float_values,
    };
  } else if (Object.hasOwn(prop, "string_value")) {
    return {
      [prop.prop]: prop.string_value,
    };
  } else {
    return null;
  }
};

const checkLengthErrors = (getOrSetArray) => {
  expect(getOrSetArray.length).toBe(TARGET_VHAL_PROPS.length);
  expect(getOrSetArray.some((getOrSetResult) => getOrSetResult.error)).toBe(
    false,
  );
};

const getSetInputs = (vhalProperties) => {
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
  setInputs.push(getSetInput(289409539, "int32_values")); // DISPLAY_BRIGHTNESS
  setInputs.push(getSetInput(291504900, "float_values")); // ENGINE_OIL_TEMP
  setInputs.push(getSetInput(286261505, "string_value")); // INFO_MAKE
  setInputs.push(getSetInput(290521862, "int64_values", true)); // WHEEL_TICK
  setInputs.push(getSetInput(289475073, "int32_values", true)); // AP_POWER_STATE_REPORT

  return setInputs;
};

const checkChanges = (getValues, setInputs, getValuesAfterSet) => {
  expect(JSON.stringify(getValuesAfterSet)).not.toEqual(
    JSON.stringify(getValues),
  );
  expect(JSON.stringify(setInputs[0].int32_values)).toEqual(
    JSON.stringify(getValuesAfterSet["287310858"]),
  ); // ABS_ACTIVE
  expect(JSON.stringify(setInputs[1].int32_values)).toEqual(
    JSON.stringify(getValuesAfterSet["289409539"]),
  ); // DISPLAY_BRIGHTNESS
  expect(JSON.stringify(setInputs[2].float_values)).toEqual(
    JSON.stringify(getValuesAfterSet["291504900"]),
  ); // ENGINE_OIL_TEMP
  expect(setInputs[3].string_value).toEqual(getValuesAfterSet["286261505"]); // INFO_MAKE
  expect(JSON.stringify(setInputs[4].int64_values)).toEqual(
    JSON.stringify(getValuesAfterSet["290521862"]),
  ); // WHEEL_TICK
  expect(JSON.stringify(setInputs[5].int32_values)).toEqual(
    JSON.stringify(getValuesAfterSet["289475073"]),
  ); // AP_POWER_STATE_REPORT
};

test("VHAL methods on an AAOS session", async ({ page }) => {
  await joinSession(page, process.env.AAOS_SESSION_ID);

  await waitForVhalReady(page);
  await checkVhalAvailable(page, true);
  const allVhalPropConfigs = await getAllVhalPropConfigs(page);

  const vhalPropsBefore = await getVhalProperties(page, allVhalPropConfigs);
  checkLengthErrors(vhalPropsBefore);

  const setInputs = getSetInputs(vhalPropsBefore);
  const setResults = await setVhalProperties(page, setInputs);
  checkLengthErrors(setResults);

  const vhalPropsAfter = await getVhalProperties(page, allVhalPropConfigs);
  checkLengthErrors(vhalPropsAfter);

  const valuesBefore = Object.assign(
    {},
    ...vhalPropsBefore.map(getValueObject),
  );
  const valuesAfter = Object.assign({}, ...vhalPropsAfter.map(getValueObject));
  checkChanges(valuesBefore, setInputs, valuesAfter);

  await disconnectStream(page);
});

test("VHAL methods on an AOSP session", async ({ page }) => {
  await joinSession(page, process.env.AOSP_SESSION_ID);

  await checkVhalAvailable(page, false);
  await expect(getAllVhalPropConfigs(page)).rejects.toThrow();
  await expect(getVhalProperties(page, [])).rejects.toThrow();
  await expect(setVhalProperties(page, [])).rejects.toThrow();

  await disconnectStream(page);
});
