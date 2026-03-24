/**
 * @jest-environment jsdom
 */
/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2022 Canonical Ltd.
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

import {
  AnboxStream,
  ANBOX_STREAM_SDK_ERROR_USER_MEDIA,
} from "./anbox-stream-sdk";

const sdkOptions = {};
beforeEach(() => {
  // Mock the fullscreen function as it's dislabed
  // by default in jest tests
  document.fullscreenEnabled = jest.fn();
  document.webkitExitFullscreen = () => {
    document.fullscreenElement = null;
  };
  // Mock the getContext function to HTMLCanvasElement
  window.HTMLCanvasElement.prototype.getContext = () => {
    return {};
  };

  const container = document.createElement("div");
  container.__defineGetter__("clientWidth", () => {
    return 100;
  });
  container.__defineGetter__("clientHeight", () => {
    return 100;
  });
  container.id = "foobar";
  container.webkitRequestFullscreen = () => {
    document.fullscreenElement = container;
  };
  document.body.appendChild(container);

  sdkOptions.connector = {
    connect() {},
    disconnect() {},
  };
  sdkOptions.targetElement = "foobar";
  sdkOptions.foregroundActivity = "com.bar.foo";

  global.navigator.__defineGetter__(
    "userAgent",
    () =>
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36",
  );
});

afterEach(() => {
  sdkOptions.experimental.upscaling.enabled = false;
});

test("SDK properly checks constructor options", () => {
  expect(() => new AnboxStream()).toThrow("missing options");

  sdkOptions.targetElement = null;
  expect(() => new AnboxStream(sdkOptions)).toThrow(
    "missing targetElement parameter",
  );

  sdkOptions.targetElement = "nonexistent";
  expect(() => new AnboxStream(sdkOptions)).toThrow(
    'target element "nonexistent" does not exist',
  );

  sdkOptions.connector.connect = undefined;
  sdkOptions.targetElement = "foobar";
  expect(() => new AnboxStream(sdkOptions)).toThrow(
    'missing "connect" method on connector',
  );

  sdkOptions.connector.connect = () => {};
  sdkOptions.connector.disconnect = undefined;
  expect(() => new AnboxStream(sdkOptions)).toThrow(
    'missing "disconnect" method on connector',
  );

  sdkOptions.connector.disconnect = () => {};
  sdkOptions.foregroundActivity = "foo.bar.?com";
  expect(() => new AnboxStream(sdkOptions)).toThrow(
    "invalid foreground activity name",
  );

  let options = {};
  options.targetElement = "foo";
  options.connector = {
    connect() {},
    disconnect() {},
  };
  options.dataChannels = {
    foo: {
      callbacks: { message: () => {} },
    },
    bar: {
      callbacks: {
        message: () => {},
        error: () => {},
      },
    },
    baz: {
      callbacks: { message: () => {} },
    },
    faz: {
      callbacks: { message: () => {} },
    },
    bab: {
      callbacks: { message: () => {} },
    },
    zar: {
      callbacks: { message: () => {} },
    },
  };
  expect(() => new AnboxStream(options)).toThrow(
    "exceeds the maximum allowed length of data channels",
  );

  options = {};
  options.video = {
    preferred_decoder_codecs: ["unknown_codec"],
  };
  expect(() => new AnboxStream(options)).toThrow("invalid video decoder codec");
});

test("Video container with no size specified", () => {
  jest.spyOn(global.console, "error").mockImplementation(() => {});

  const container_without_size = document.createElement("div");
  container_without_size.id = "baz";
  document.body.appendChild(container_without_size);
  const options = {};
  options.targetElement = "baz";
  options.connector = {
    connect() {},
    disconnect() {},
  };

  expect(() => new AnboxStream(options)).not.toThrow();
  expect(console.error).toHaveBeenCalledWith(
    expect.stringContaining(
      "AnboxStream: video container element misses size. Please see https://documentation.ubuntu.com/anbox-cloud/en/latest/tutorial/stream-client",
    ),
  );
  global.console.error.mockRestore();
});

test("Unsupported browser", () => {
  var currentUserAgent =
    "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0)"; // IE8
  global.navigator.__defineGetter__("userAgent", () => currentUserAgent);
  expect(() => new AnboxStream(sdkOptions)).toThrow("unsupported browser");

  currentUserAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36";
  expect(() => new AnboxStream(sdkOptions)).not.toThrow("unsupported browser");
});

test("call methods before connecting", () => {
  const stream = new AnboxStream(sdkOptions);
  expect(() => stream.showStatistics(true)).not.toThrow();
  expect(stream.getId()).toEqual(stream._id);
  expect(
    stream.sendLocationUpdate({
      format: "nmea",
      time: 1,
      latitude: 2,
      longitude: 3,
      altitude: 4,
      speed: 5,
      bearing: 6,
    }),
  ).toEqual(false);
  expect(stream.sendIMECommittedText("foo")).toEqual(false);
  expect(stream.sendIMEComposingText("bar")).toEqual(false);
  expect(stream.sendIMETextDeletion(1)).toEqual(false);
  expect(stream.sendIMEAction("hide")).toEqual(false);
  expect(stream.sendIMEComposingRegion(0, 5)).toEqual(false);
  expect(() => stream.disconnect()).not.toThrow();
});

test("video element should take all available space", () => {
  const stream = new AnboxStream(sdkOptions);

  stream._webrtcManager = {
    _isControlChannelOpen: true,
    sendControlMessage: jest.fn(),
    stop: jest.fn(),
  };

  const video = document.createElement("video");
  video.id = stream._videoID;
  video.__defineGetter__("videoWidth", () => 500);
  video.__defineGetter__("videoHeight", () => 1000);

  const container = document.getElementById(sdkOptions.targetElement);
  container.__defineGetter__("clientWidth", () => 2000);
  container.__defineGetter__("clientHeight", () => 2000);
  container.appendChild(video);

  stream._onResize();
  let dimensions = stream._dimensions;
  expect(dimensions.playerWidth).toEqual(1000);
  expect(dimensions.playerHeight).toEqual(2000);

  // Perform a rotation
  expect(stream.rotate(90)).toEqual(true);
  dimensions = stream._dimensions;

  expect(video.style.transform).toEqual("rotate(90deg)");
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: -9.81,
      y: 0,
      z: 0,
    },
  );
  expect(stream.getCurrentRotation()).toEqual(90);
  expect(dimensions.playerWidth).toEqual(2000);
  expect(dimensions.playerHeight).toEqual(1000);

  expect(() => stream.disconnect()).not.toThrow();
});

test("rotate video element", () => {
  let test_video_rotation = function (options) {
    const stream = new AnboxStream(options);
    stream._webrtcManager.sendControlMessage = jest.fn(() => {
      return true;
    });
    stream._webrtcManager = {
      _isControlChannelOpen: true,
      sendControlMessage: jest.fn(),
      stop: jest.fn(),
    };

    const video = document.createElement("video");
    video.id = stream._videoID;
    video.__defineGetter__("videoWidth", () => 500);
    video.__defineGetter__("videoHeight", () => 1000);
    const container = document.getElementById(sdkOptions.targetElement);
    container.__defineGetter__("clientWidth", () => 1000);
    container.__defineGetter__("clientHeight", () => 1000);
    container.appendChild(video);

    let visualElement = video;
    if (options.experimental.upscaling.enabled) {
      const canvas = document.createElement("canvas");
      canvas.id = stream._canvasID;
      container.appendChild(canvas);
      visualElement = canvas;

      stream._streamCanvas = {
        resize() {},
        stop() {},
      };
    }

    stream._onResize();
    expect(stream.getCurrentRotation()).toEqual(0);

    expect(stream.rotate(-90)).toEqual(true);
    expect(visualElement.style.transform).toEqual("rotate(270deg)");
    expect(stream._webrtcManager.sendControlMessage).toHaveBeenCalledWith(
      "sensor:event",
      {
        sensor: "acceleration",
        x: 9.81,
        y: 0,
        z: 0,
      },
    );
    expect(stream.getCurrentRotation()).toEqual(270);
    expect(() => stream.disconnect()).not.toThrow();
  };

  test_video_rotation(sdkOptions);

  sdkOptions.experimental.upscaling.enabled = true;
  test_video_rotation(sdkOptions);
});

test("rotate supports legacy orientation strings", () => {
  const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const stream = new AnboxStream(sdkOptions);
  stream._webrtcManager = {
    _isControlChannelOpen: true,
    sendControlMessage: jest.fn(),
    stop: jest.fn(),
  };

  const video = document.createElement("video");
  video.id = stream._videoID;
  video.__defineGetter__("videoWidth", () => 500);
  video.__defineGetter__("videoHeight", () => 1000);

  const container = document.getElementById(sdkOptions.targetElement);
  container.__defineGetter__("clientWidth", () => 1000);
  container.__defineGetter__("clientHeight", () => 1000);
  container.appendChild(video);

  stream._onResize();

  // null original orientation should not work for string-based rotations
  stream._originalOrientation = null;
  expect(stream.rotate("portrait")).toEqual(false);
  expect(errSpy).toHaveBeenCalledWith("Invalid original orientation: null");

  // portrait origin mapping
  stream._originalOrientation = "portrait";

  expect(stream.rotate("landscape")).toEqual(true);
  expect(stream.getCurrentRotation()).toEqual(90);
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenLastCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: -9.81,
      y: 0,
      z: 0,
    },
  );

  expect(stream.rotate("reverse-portrait")).toEqual(true);
  expect(stream.getCurrentRotation()).toEqual(180);
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenLastCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: 0,
      y: -9.81,
      z: 0,
    },
  );

  expect(stream.rotate("reverse-landscape")).toEqual(true);
  expect(stream.getCurrentRotation()).toEqual(270);
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenLastCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: 9.81,
      y: 0,
      z: 0,
    },
  );

  expect(stream.rotate("portrait")).toEqual(true);
  expect(stream.getCurrentRotation()).toEqual(0);
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenLastCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: 0,
      y: 9.81,
      z: 0,
    },
  );

  // landscape origin mapping
  stream._originalOrientation = "landscape";

  expect(stream.rotate("reverse-portrait")).toEqual(true);
  expect(stream.getCurrentRotation()).toEqual(90);
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenLastCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: -9.81,
      y: 0,
      z: 0,
    },
  );

  expect(stream.rotate("reverse-landscape")).toEqual(true);
  expect(stream.getCurrentRotation()).toEqual(180);
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenLastCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: 0,
      y: -9.81,
      z: 0,
    },
  );

  expect(stream.rotate("portrait")).toEqual(true);
  expect(stream.getCurrentRotation()).toEqual(270);
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenLastCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: 9.81,
      y: 0,
      z: 0,
    },
  );

  expect(stream.rotate("landscape")).toEqual(true);
  expect(stream.getCurrentRotation()).toEqual(0);
  expect(stream._webrtcManager.sendControlMessage).toHaveBeenLastCalledWith(
    "sensor:event",
    {
      sensor: "acceleration",
      x: 0,
      y: 9.81,
      z: 0,
    },
  );

  // invalid string
  expect(stream.rotate("str")).toEqual(false);
  expect(errSpy).toHaveBeenCalledWith("Invalid orientation given: str");

  errSpy.mockRestore();
  expect(() => stream.disconnect()).not.toThrow();
});

test("request and exit full screen", () => {
  sdkOptions.fullScreen = true;
  const stream = new AnboxStream(sdkOptions);
  stream._webrtcManager.start = jest.fn();

  var isFullScreen = function () {
    return (document.fullscreenElement &&
      document.fullscreenElement !== null) ||
      (document.webkitFullscreenElement &&
        document.webkitFullscreenElement !== null) ||
      (document.mozFullScreenElement &&
        document.mozFullScreenElement !== null) ||
      (document.msFullscreenElement && document.msFullscreenElement !== null)
      ? true
      : false;
  };

  expect(() => stream.connect()).not.toThrow();
  expect(isFullScreen()).toEqual(true);

  expect(() => stream.exitFullscreen()).not.toThrow();
  expect(isFullScreen()).toEqual(false);

  expect(() => stream.disconnect()).not.toThrow();
});

test("stop webrtc manager properly", (done) => {
  const stream = new AnboxStream(sdkOptions);
  stream._webrtcManager.sendControlMessage = jest.fn(() => {
    return true;
  });
  stream._webrtcManager.start = jest.fn();
  stream._webrtcManager.stop = jest.fn(() => {
    // Must be called, otherwise hang until timeout occurred
    done();
  });
  stream._webrtcManager.onError = jest.fn(() => {});

  const video = document.createElement("video");
  video.id = stream._videoID;
  video.__defineGetter__("videoWidth", () => 500);
  video.__defineGetter__("videoHeight", () => 1000);
  const container = document.getElementById(sdkOptions.targetElement);
  container.__defineGetter__("clientWidth", () => 1000);
  container.__defineGetter__("clientHeight", () => 1000);
  container.appendChild(video);
  stream._onResize();
  expect(stream.getCurrentRotation()).toEqual(0);

  // The registered events listener should be removed
  // when disconnecting the stream.
  let listener = {};
  container.addEventListener = jest.fn((name, fn) => {
    listener[name] = fn;
  });
  container.removeEventListener = jest.fn((name) => {
    if (name in listener === false) {
      fail("unkonwn listener");
    }
  });

  stream._registerControls();
  stream.connect();

  // Simulate streaming
  const streaming = async () => {
    await new Promise((r) => setTimeout(r, 2000));
  };
  streaming();

  video.remove();

  expect(() => stream.disconnect()).not.toThrow();

  // No error occurred when stopping the stream
  expect(stream._webrtcManager.onError).toHaveBeenCalledTimes(0);

  // The number of calls to event listener on addition or removal must be identical.
  const calltimes = Object.keys(listener).length;
  expect(container.addEventListener).toHaveBeenCalledTimes(calltimes);
  expect(container.removeEventListener).toHaveBeenCalledTimes(calltimes);
});

test("video and audio elements should exist when streaming by default", () => {
  const stream = new AnboxStream(sdkOptions);
  stream._webrtcManager.start = jest.fn();

  expect(() => stream.connect()).not.toThrow();
  expect(document.getElementsByTagName("video").length).toEqual(1);
  expect(document.getElementsByTagName("audio").length).toEqual(1);

  expect(() => stream.disconnect()).not.toThrow();
});

test("video element should not exist when streaming audio only", () => {
  sdkOptions.stream = {
    audio: true,
    video: false,
  };
  const stream = new AnboxStream(sdkOptions);
  stream._webrtcManager.start = jest.fn();

  expect(() => stream.connect()).not.toThrow();
  expect(document.getElementsByTagName("video").length).toEqual(0);
  expect(document.getElementsByTagName("audio").length).toEqual(1);

  expect(() => stream.disconnect()).not.toThrow();
});

test("audio element should not exist when streaming video only", () => {
  sdkOptions.stream = {
    audio: false,
    video: true,
  };
  const stream = new AnboxStream(sdkOptions);
  stream._webrtcManager.start = jest.fn();

  expect(() => stream.connect()).not.toThrow();
  expect(document.getElementsByTagName("video").length).toEqual(1);
  expect(document.getElementsByTagName("audio").length).toEqual(0);

  expect(() => stream.disconnect()).not.toThrow();
});

test("video or audio element should not exist when streaming with no audio and video", () => {
  sdkOptions.stream = {
    audio: false,
    video: false,
  };
  const stream = new AnboxStream(sdkOptions);
  stream._webrtcManager.start = jest.fn();

  expect(() => stream.connect()).not.toThrow();
  expect(document.getElementsByTagName("video").length).toEqual(0);
  expect(document.getElementsByTagName("audio").length).toEqual(0);

  expect(() => stream.disconnect()).not.toThrow();
});

test("do no stop streaming on non fatal errors", (done) => {
  const stream = new AnboxStream(sdkOptions);
  stream._stopStreamingOnError = jest.fn();
  stream._webrtcManager.sendControlMessage = jest.fn(() => {
    return true;
  });
  stream._webrtcManager.start = jest.fn();
  stream._webrtcManager.stop = jest.fn(() => {
    done();
  });
  stream._webrtcManager.onError = jest.fn(() => {});

  const video = document.createElement("video");
  video.id = stream._videoID;
  const container = document.getElementById(sdkOptions.targetElement);
  container.appendChild(video);
  stream._onResize();

  stream.connect();

  // Simulate streaming
  const streaming = async () => {
    await new Promise((r) => setTimeout(r, 2000));
  };
  streaming();

  // Simulate non fatal error occurs
  const msg = "failed to open camera: NotFound";
  const code = ANBOX_STREAM_SDK_ERROR_USER_MEDIA;
  stream._webrtcManager._onError(msg, code);

  expect(stream._stopStreamingOnError).toHaveBeenCalledWith(msg, code);
  // webrtcManager.stop() should not triggered on non fatal errors
  expect(stream._webrtcManager.stop).toHaveBeenCalledTimes(0);

  expect(() => stream.disconnect()).not.toThrow();
  expect(stream._webrtcManager.stop).toHaveBeenCalledTimes(1);
});

test("player respects the vertical aligment settings", () => {
  const verticalAlignments = ["top", "center", "bottom"];

  for (const alignment of verticalAlignments) {
    let opts = { ...sdkOptions };
    opts.verticalAlignment = alignment;
    const stream = new AnboxStream(opts);

    const video = document.createElement("video");
    video.id = stream._videoID;
    video.__defineGetter__("videoWidth", () => 1000);
    video.__defineGetter__("videoHeight", () => 500);

    const container = document.getElementById(sdkOptions.targetElement);
    container.__defineGetter__("clientWidth", () => 2000);
    container.__defineGetter__("clientHeight", () => 2000);
    container.appendChild(video);

    stream._onResize();
    let dimensions = stream._dimensions;
    expect(dimensions.playerWidth).toEqual(2000);
    expect(dimensions.playerHeight).toEqual(1000);

    let expectedOffsetTop;
    if (alignment === "top") {
      expectedOffsetTop = 0;
    } else if (alignment === "center") {
      expectedOffsetTop = 500;
    } else if (alignment === "bottom") {
      expectedOffsetTop = 1000;
    }
    expect(dimensions.playerOffsetTop).toEqual(expectedOffsetTop);
  }
});

test("rotate for invalid degree inputs", () => {
  const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const stream = new AnboxStream(sdkOptions);
  expect(stream.rotate(45)).toEqual(false);
  expect(errSpy).toHaveBeenCalledWith(
    "Invalid rotation degree: 45. Must be a multiple of 90.",
  );
  errSpy.mockRestore();
});

test("rotate when control channel is not open", () => {
  const stream = new AnboxStream(sdkOptions);
  expect(stream.rotate(90)).toEqual(false);
  stream._webrtcManager = {
    _isControlChannelOpen: false,
    sendControlMessage: jest.fn(),
  };
  expect(stream.rotate(90)).toEqual(false);
  expect(stream._webrtcManager.sendControlMessage).not.toHaveBeenCalled();
  expect(stream.getCurrentRotation()).toEqual(0);
});

test("can not rotate if the accelerometer sensor is enabled", () => {
  const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  sdkOptions.devices = {
    sensor: {
      enableAccelerometer: true,
    },
  };
  const stream = new AnboxStream(sdkOptions);
  expect(stream.rotate(90)).toEqual(false);
  expect(errSpy).toHaveBeenCalledWith(
    "Cannot manual rotate: 'devices.sensor.enableAccelerometer' is enabled. " +
      "Real-time sensor data would conflict with manual rotation.",
  );
  errSpy.mockRestore();
});
