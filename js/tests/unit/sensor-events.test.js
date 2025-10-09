/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2025 Canonical Ltd.
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

import { AnboxStream } from "./anbox-stream-sdk";

// Mock DeviceOrientationEvent
if (!global.DeviceOrientationEvent) {
  class DeviceOrientationEvent extends Event {
    constructor(type, params = {}) {
      super(type);
      this.alpha = params.alpha ?? 0.0;
      this.beta = params.beta ?? 0.0;
      this.gamma = params.gamma ?? 0.0;
    }
  }
  global.DeviceOrientationEvent = DeviceOrientationEvent;
}

// Mock DeviceMotionEvent
if (!global.DeviceMotionEvent) {
  class DeviceMotionEvent extends Event {
    constructor(type, params = {}) {
      super(type);
      this.acceleration = params.acceleration;
      this.accelerationIncludingGravity = params.accelerationIncludingGravity;
      this.rotationRate = params.rotationRate;
    }
  }
  global.DeviceMotionEvent = DeviceMotionEvent;
}

function send_sensor_operation_message(stream, sensor, op) {
  const ev = {
    data: JSON.stringify({
      type: op,
      data: JSON.stringify({ type: sensor }),
    }),
  };
  stream._webrtcManager._onControlMessageReceived(ev);
}

function deactivate_sensor(stream, sensor) {
  send_sensor_operation_message(stream, sensor, "deactivate-sensor");
}

function activate_sensor(stream, sensor) {
  send_sensor_operation_message(stream, sensor, "activate-sensor");
}

const sdkOptions = {};
function setupStream(sdkOptions) {
  let stream = new AnboxStream(sdkOptions);

  const video = document.createElement("video");
  video.id = stream._videoID;
  const audio = document.createElement("audio");
  audio.id = stream._audioID;

  let container = document.getElementById("foobar");
  container.appendChild(video);
  container.appendChild(audio);

  const snapshots = [];
  let mockFn = jest.fn((type, data) => {
    snapshots.push({
      type,
      data: JSON.parse(JSON.stringify(data)),
    });
    return true;
  });
  stream._webrtcManager.sendControlMessage = mockFn;

  return { stream, snapshots };
}

beforeEach(() => {
  const container = document.createElement("div");
  container.__defineGetter__("clientWidth", () => 2000);
  container.__defineGetter__("clientHeight", () => 2000);
  container.id = "foobar";
  document.body.appendChild(container);
  sdkOptions.connector = { connect() {}, disconnect() {} };
  sdkOptions.targetElement = "foobar";
  sdkOptions.controls = { emulateTouch: false };
  global.navigator.__defineGetter__("maxTouchPoints", () => 5);
  global.navigator.__defineGetter__(
    "userAgent",
    () =>
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36",
  );
});

test("should throw error when updateInterval option is non-numeric", () => {
  sdkOptions.devices = {
    sensor: {
      updateInterval: "bla",
      enableOrientation: true,
    },
  };
  expect(() => new AnboxStream(sdkOptions)).toThrow(
    "sensor update interval is invalid",
  );
});

test("should throw error when updateInterval option is less than 10ms", () => {
  sdkOptions.devices = {
    sensor: {
      updateInterval: 5,
      enableOrientation: true,
    },
  };
  expect(() => new AnboxStream(sdkOptions)).toThrow(
    "update interval 5ms is less than the minimum of 10ms",
  );
});

test("should not construct the sensor manager if it is not specified in the options.", () => {
  sdkOptions.devices = {};
  let { stream } = setupStream(sdkOptions);
  expect(stream._sensorManager).toBeNull();
});

test("should not send sensor data to Anbox container if all sensors are disabled", () => {
  sdkOptions.devices = {
    sensor: {
      enableOrientation: false,
      enableGyroscope: false,
      enableAccelerometer: false,
    },
  };
  let { stream } = setupStream(sdkOptions);
  expect(stream._sensorManager).toBeNull();
});

test("should send sensor accelerometer data with gravity included to Anbox container if the sensor is enabled", () => {
  sdkOptions.devices = {
    sensor: {
      enableAccelerometer: true,
    },
  };
  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();

  activate_sensor(stream, "acceleration");
  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      accelerationIncludingGravity: { x: 1.0, y: 2.5, z: 3.0 },
    }),
  );

  expect(snapshots.length).toEqual(1);
  expect(snapshots[0].type).toEqual("sensor:event");
  expect(snapshots[0].data).toEqual({
    sensor: "acceleration",
    x: 1.0,
    y: 2.5,
    z: 3.0,
  });
});

test("should send sensor accelerometer data to Anbox container if the sensor is enabled", () => {
  sdkOptions.devices = {
    sensor: {
      enableAccelerometer: true,
    },
  };
  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();

  activate_sensor(stream, "acceleration");
  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      acceleration: { x: 5.0, y: 2.5, z: 4.0 },
    }),
  );

  expect(snapshots.length).toEqual(1);
  expect(snapshots[0].type).toEqual("sensor:event");
  expect(snapshots[0].data).toEqual({
    sensor: "acceleration",
    x: 5.0,
    y: 2.5,
    z: 4.0,
  });
});

test("should send sensor orientation data to Anbox container if the sensor is enabled", () => {
  sdkOptions.devices = {
    sensor: {
      enableOrientation: true,
    },
  };
  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();
  activate_sensor(stream, "orientation");

  window.dispatchEvent(
    new DeviceOrientationEvent("deviceorientation", {
      alpha: 30.0,
      beta: 12.0,
      gamma: 10.0,
    }),
  );

  expect(snapshots.length).toEqual(1);
  expect(snapshots[0].type).toEqual("sensor:event");
  expect(snapshots[0].data).toEqual({
    sensor: "orientation",
    roll: 12.0,
    pitch: 10.0,
    azimuth: 30.0,
  });
});

test("should send sensor gyroscope data to Anbox container if the sensor is enabled", () => {
  sdkOptions.devices = {
    sensor: {
      enableGyroscope: true,
    },
  };
  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();
  activate_sensor(stream, "gyroscope");

  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      rotationRate: {
        alpha: 8,
        beta: 7,
        gamma: 6,
      },
    }),
  );

  expect(snapshots.length).toEqual(1);
  expect(snapshots[0].type).toEqual("sensor:event");
  expect(snapshots[0].data).toEqual({
    sensor: "gyroscope",
    x: 7.0,
    y: 6.0,
    z: 8.0,
  });
});

test("should not send sensor data if sensor is not activated from the server side", () => {
  sdkOptions.devices = {
    sensor: {
      enableAccelerometer: true,
      enableGyroscope: true,
      enableOrientation: true,
    },
  };
  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();

  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      rotationRate: {
        alpha: 8.0,
        beta: 7.0,
        gamma: 6.0,
      },
      accelerationIncludingGravity: { x: 1.0, y: 2.5, z: 3.0 },
    }),
  );

  window.dispatchEvent(
    new DeviceOrientationEvent("deviceorientation", {
      alpha: 30.0,
      beta: 12.0,
      gamma: 10.0,
    }),
  );

  expect(snapshots.length).toEqual(0);
});

test("should send sensor data if sensor is re-activated from the server side", () => {
  sdkOptions.devices = {
    sensor: {
      enableAccelerometer: true,
      enableGyroscope: true,
      updateInterval: 1000,
    },
  };
  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();

  const realDateNow = Date.now.bind(global.Date);
  let fakeTime = realDateNow();
  jest.spyOn(global.Date, "now").mockImplementation(() => fakeTime);

  activate_sensor(stream, "acceleration");
  activate_sensor(stream, "gyroscope");
  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      rotationRate: {
        alpha: 8.0,
        beta: 7.0,
        gamma: 6.0,
      },
      accelerationIncludingGravity: { x: 1.0, y: 2.5, z: 3.0 },
    }),
  );

  expect(snapshots.length).toEqual(2);
  expect(snapshots[0].type).toEqual("sensor:event");
  expect(snapshots[0].data).toEqual({
    sensor: "acceleration",
    x: 1.0,
    y: 2.5,
    z: 3.0,
  });
  expect(snapshots[1].type).toEqual("sensor:event");
  expect(snapshots[1].data).toEqual({
    sensor: "gyroscope",
    x: 7.0,
    y: 6.0,
    z: 8.0,
  });

  // Advance 1 second
  fakeTime += 1000;

  // Deactivate acceleration sensor from the server side, which led to no more
  // acceleration sensor data sent from the client side
  deactivate_sensor(stream, "acceleration");
  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      rotationRate: {
        alpha: 1.0,
        beta: 1.0,
        gamma: 1.0,
      },
      accelerationIncludingGravity: { x: 1.0, y: 1.5, z: 1.0 },
    }),
  );

  expect(snapshots.length).toEqual(3);
  expect(snapshots[2].type).toEqual("sensor:event");
  expect(snapshots[2].data).toEqual({
    sensor: "gyroscope",
    x: 1.0,
    y: 1.0,
    z: 1.0,
  });

  // Advance 1 second
  fakeTime += 1000;

  activate_sensor(stream, "acceleration");
  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      rotationRate: {
        alpha: 2.0,
        beta: 2.0,
        gamma: 2.0,
      },
      accelerationIncludingGravity: { x: 3.0, y: 3.5, z: 3.0 },
    }),
  );

  expect(snapshots.length).toEqual(5);
  expect(snapshots[3].type).toEqual("sensor:event");
  expect(snapshots[3].data).toEqual({
    sensor: "acceleration",
    x: 3.0,
    y: 3.5,
    z: 3.0,
  });
  expect(snapshots[4].type).toEqual("sensor:event");
  expect(snapshots[4].data).toEqual({
    sensor: "gyroscope",
    x: 2.0,
    y: 2.0,
    z: 2.0,
  });

  global.Date.now.mockRestore();
});

test("should not send sensor data within the update interval even if sensor data has changed", () => {
  sdkOptions.devices = {
    sensor: {
      enableAccelerometer: true,
      enableGyroscope: true,
      updateInterval: 1000,
    },
  };
  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();
  activate_sensor(stream, "gyroscope");

  const realDateNow = Date.now.bind(global.Date);
  let fakeTime = realDateNow();
  jest.spyOn(global.Date, "now").mockImplementation(() => fakeTime);

  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      rotationRate: {
        alpha: 8.0,
        beta: 7.0,
        gamma: 6.0,
      },
      accelerationIncludingGravity: { x: 1.0, y: 2.5, z: 3.0 },
    }),
  );

  const ensure_signal_update = () => {
    expect(snapshots.length).toEqual(1);
    expect(snapshots[0].type).toEqual("sensor:event");
    expect(snapshots[0].data).toEqual({
      sensor: "gyroscope",
      x: 7.0,
      y: 6.0,
      z: 8.0,
    });
  };

  ensure_signal_update();

  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      rotationRate: {
        alpha: 10.0,
        beta: 10.0,
        gamma: 10.0,
      },
    }),
  );

  ensure_signal_update();

  // Advance 1 second
  fakeTime += 1000;

  // Send the acceleration sensor data after it's activated
  activate_sensor(stream, "acceleration");

  // Capture data from acceleration sensor
  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      accelerationIncludingGravity: { x: 1.0, y: 2.5, z: 3.0 },
    }),
  );

  // The new data should be sent
  expect(snapshots.length).toEqual(3);
  expect(snapshots[1].data).toEqual({
    sensor: "acceleration",
    x: 1.0,
    y: 2.5,
    z: 3.0,
  });
  expect(snapshots[2].data).toEqual({
    sensor: "gyroscope",
    x: 10.0,
    y: 10.0,
    z: 10.0,
  });

  global.Date.now.mockRestore();
});

test("should send sensor data to Anbox container if all sensors are enabled", () => {
  sdkOptions.devices = {
    sensor: {
      enableGyroscope: true,
      enableAccelerometer: true,
      enableOrientation: true,
    },
  };
  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();

  activate_sensor(stream, "gyroscope");
  activate_sensor(stream, "acceleration");

  window.dispatchEvent(
    new DeviceMotionEvent("devicemotion", {
      accelerationIncludingGravity: { x: 1.0, y: 2.5, z: 3.0 },
      rotationRate: {
        alpha: 8.0,
        beta: 7.0,
        gamma: 6.0,
      },
    }),
  );

  expect(snapshots.length).toEqual(2);
  expect(snapshots[0].type).toEqual("sensor:event");
  expect(snapshots[0].data).toEqual({
    sensor: "acceleration",
    x: 1,
    y: 2.5,
    z: 3,
  });

  expect(snapshots[1].type).toEqual("sensor:event");
  expect(snapshots[1].data).toEqual({
    sensor: "gyroscope",
    x: 7.0,
    y: 6.0,
    z: 8.0,
  });

  // Mock the current time
  const realDateNow = Date.now.bind(global.Date);
  let fakeTime = realDateNow();
  jest.spyOn(global.Date, "now").mockImplementation(() => fakeTime);

  // Advance 1 second
  fakeTime += 1000;

  activate_sensor(stream, "orientation");
  window.dispatchEvent(
    new DeviceOrientationEvent("deviceorientation", {
      alpha: 30.0,
      beta: 12.0,
      gamma: 10.0,
    }),
  );

  expect(snapshots.length).toEqual(5);
  expect(snapshots[2].type).toEqual("sensor:event");
  expect(snapshots[2].data).toEqual({
    sensor: "orientation",
    roll: 12.0,
    pitch: 10.0,
    azimuth: 30.0,
  });

  expect(snapshots[3].type).toEqual("sensor:event");
  expect(snapshots[3].data).toEqual({
    sensor: "acceleration",
    x: 1,
    y: 2.5,
    z: 3,
  });

  expect(snapshots[4].type).toEqual("sensor:event");
  expect(snapshots[4].data).toEqual({
    sensor: "gyroscope",
    x: 7.0,
    y: 6.0,
    z: 8.0,
  });

  global.Date.now.mockRestore();
});

test("should not not send sensor data when there are no changes", () => {
  sdkOptions.devices = {
    sensor: {
      enableGyroscope: true,
    },
  };

  let { stream, snapshots } = setupStream(sdkOptions);
  expect(stream._sensorManager).not.toBeNull();

  activate_sensor(stream, "gyroscope");
  const dispatch_event = () => {
    window.dispatchEvent(
      new DeviceMotionEvent("devicemotion", {
        rotationRate: {
          alpha: 8.0,
          beta: 7.0,
          gamma: 6.0,
        },
      }),
    );
  };

  dispatch_event();

  expect(snapshots.length).toEqual(1);
  expect(snapshots[0].type).toEqual("sensor:event");
  expect(snapshots[0].data).toEqual({
    sensor: "gyroscope",
    x: 7.0,
    y: 6.0,
    z: 8.0,
  });

  dispatch_event();

  // No new sensor data should be sent to the Anbox container
  expect(snapshots.length).toEqual(1);
});
