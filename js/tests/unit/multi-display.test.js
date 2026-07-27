/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2026 Canonical Ltd.
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

if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, params) {
      super(type, params);
      this.pointerId = params.pointerId;
      this.pointerType = params.pointerType;
      this.isPrimary = params.isPrimary;
    }
  }
  global.PointerEvent = PointerEvent;
}

function makeStream(overrides = {}) {
  const opts = {
    connector: { connect() {}, disconnect() {} },
    controls: { mouse: true, keyboard: false, emulateTouch: false },
    callbacks: {},
    ...overrides,
  };
  return new AnboxStream(opts);
}

function makeStreamWithTarget(containerId = "main-container") {
  return makeStream({ targetElement: containerId });
}

function addContainer(id, w = 800, h = 600) {
  const el = document.createElement("div");
  el.id = id;
  el.__defineGetter__("clientWidth", () => w);
  el.__defineGetter__("clientHeight", () => h);
  el.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: w,
    height: h,
    right: w,
    bottom: h,
  });
  document.body.appendChild(el);
  return el;
}

function makeFakeStream() {
  return { id: "fake-stream-" + Math.random() };
}

beforeEach(() => {
  global.navigator.__defineGetter__(
    "userAgent",
    () =>
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36",
  );
  global.navigator.__defineGetter__("maxTouchPoints", () => 5);
  // Needed so that enabling `experimental.upscaling` in tests below passes
  // the SDK's WebGL support check without requiring a real WebGL context.
  window.HTMLCanvasElement.prototype.getContext = () => {
    return {};
  };
  // jsdom does not implement media playback. Calling play() on hidden video
  // elements logs "Not implemented: HTMLMediaElement.prototype.play" error.
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  addContainer("main-container");
  addContainer("cell-1");
  addContainer("cell-2");
  addContainer("cell-3");
});

afterEach(() => {
  // Clean up all DOM elements added during the test.
  document.body.innerHTML = "";
});

describe("_checkReady", () => {
  test("fires ready() when primaryDisplayReady and pendingReadyCount is 0", () => {
    const readyFn = jest.fn();
    const stream = makeStream({ callbacks: { ready: readyFn } });

    stream._primaryDisplayReady = true;
    stream._pendingReadyCount = 0;
    stream._checkReady();

    expect(readyFn).toHaveBeenCalledTimes(1);
  });

  test("does not fire ready() when primaryDisplayReady is false", () => {
    const readyFn = jest.fn();
    const stream = makeStream({ callbacks: { ready: readyFn } });

    stream._primaryDisplayReady = false;
    stream._pendingReadyCount = 0;
    stream._checkReady();

    expect(readyFn).not.toHaveBeenCalled();
  });

  test("does not fire ready() when there are pending secondary tracks", () => {
    const readyFn = jest.fn();
    const stream = makeStream({ callbacks: { ready: readyFn } });

    stream._primaryDisplayReady = true;
    stream._pendingReadyCount = 2;
    stream._checkReady();

    expect(readyFn).not.toHaveBeenCalled();
  });

  test("fires ready() only after all pending tracks are accounted for", () => {
    const readyFn = jest.fn();
    const stream = makeStream({ callbacks: { ready: readyFn } });

    stream._primaryDisplayReady = true;
    stream._pendingReadyCount = 1;
    stream._checkReady();
    expect(readyFn).not.toHaveBeenCalled();

    stream._pendingReadyCount = 0;
    stream._checkReady();
    expect(readyFn).toHaveBeenCalledTimes(1);
  });
});

describe("_onExtraVideoTrack", () => {
  test("increments pendingReadyCount and stores stream in pendingVideoTracks", () => {
    const stream = makeStreamWithTarget();
    const fakeStream = makeFakeStream();

    expect(stream._pendingReadyCount).toBe(0);
    stream._onExtraVideoTrack(1, fakeStream);

    expect(stream._pendingReadyCount).toBe(1);
    expect(stream._pendingVideoTracks[1]).toBe(fakeStream);
  });

  test("fires videoTrackAdded callback with correct displayId", () => {
    const videoTrackAdded = jest.fn();
    const stream = makeStream({
      targetElement: "main-container",
      callbacks: { videoTrackAdded },
    });

    stream._onExtraVideoTrack(2, makeFakeStream());

    expect(videoTrackAdded).toHaveBeenCalledWith(2);
  });

  test("increments pendingReadyCount for each new extra track", () => {
    const stream = makeStreamWithTarget();

    stream._onExtraVideoTrack(1, makeFakeStream());
    stream._onExtraVideoTrack(2, makeFakeStream());
    stream._onExtraVideoTrack(3, makeFakeStream());

    expect(stream._pendingReadyCount).toBe(3);
    expect(stream._pendingVideoTracks[1]).toBeDefined();
    expect(stream._pendingVideoTracks[2]).toBeDefined();
    expect(stream._pendingVideoTracks[3]).toBeDefined();
  });

  test("updates srcObject if video element already exists in DOM", () => {
    const stream = makeStreamWithTarget();
    const fakeStream1 = makeFakeStream();
    const fakeStream2 = makeFakeStream();

    // Pre-create the video element in DOM.
    const videoEl = document.createElement("video");
    videoEl.id = `${stream._videoID}-display-1`;
    document.body.appendChild(videoEl);

    stream._onExtraVideoTrack(1, fakeStream1);
    // pendingReadyCount should NOT increment since video already exists.
    expect(stream._pendingReadyCount).toBe(0);

    stream._onExtraVideoTrack(1, fakeStream2);
    expect(videoEl.srcObject).toBe(fakeStream2);
  });
});

describe("_createExtraVideoElement", () => {
  test("creates a video element with the given id and stream", () => {
    const stream = makeStreamWithTarget();
    const fakeStream = makeFakeStream();

    const video = stream._createExtraVideoElement("my-video-id", fakeStream);

    expect(video.tagName).toBe("VIDEO");
    expect(video.id).toBe("my-video-id");
    expect(video.srcObject).toBe(fakeStream);
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.controls).toBe(false);
    expect(video.playsInline).toBe(true);
    expect(video.style.position).toBe("absolute");
  });
});

describe("_updateGridColumns", () => {
  function makeGrid(cellCount) {
    const container = document.createElement("div");
    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement("div");
      cell.className = "anbox-stream-cell";
      container.appendChild(cell);
    }
    return container;
  }

  test("1 display: 1 column, 1 row", () => {
    const stream = makeStreamWithTarget();
    const container = makeGrid(1);
    stream._updateGridColumns(container);
    expect(container.style.gridTemplateColumns).toBe("repeat(1, 1fr)");
    expect(container.style.gridTemplateRows).toBe("repeat(1, 1fr)");
  });

  test("2 displays: 2 columns, 1 row", () => {
    const stream = makeStreamWithTarget();
    const container = makeGrid(2);
    stream._updateGridColumns(container);
    expect(container.style.gridTemplateColumns).toBe("repeat(2, 1fr)");
    expect(container.style.gridTemplateRows).toBe("repeat(1, 1fr)");
  });

  test("3 displays: 2 columns, 2 rows", () => {
    const stream = makeStreamWithTarget();
    const container = makeGrid(3);
    stream._updateGridColumns(container);
    expect(container.style.gridTemplateColumns).toBe("repeat(2, 1fr)");
    expect(container.style.gridTemplateRows).toBe("repeat(2, 1fr)");
  });

  test("4 displays: 2 columns, 2 rows", () => {
    const stream = makeStreamWithTarget();
    const container = makeGrid(4);
    stream._updateGridColumns(container);
    expect(container.style.gridTemplateColumns).toBe("repeat(2, 1fr)");
    expect(container.style.gridTemplateRows).toBe("repeat(2, 1fr)");
  });
});

describe("attachDisplay (legacy mode)", () => {
  test("attachDisplay(0) is a no-op when targetElement is set", () => {
    const stream = makeStreamWithTarget("main-container");

    // Should return without creating video or modifying anything.
    stream._pendingVideoTracks[0] = makeFakeStream();
    stream.attachDisplay(0, "cell-1");

    // In legacy mode the pending track for display 0 is NOT consumed.
    expect(stream._pendingVideoTracks[0]).toBeDefined();
    expect(document.querySelector("#cell-1 video")).toBeNull();
  });
});

describe("attachDisplay (dynamic mode)", () => {
  test("attachDisplay(0, containerId) injects primary video into container", () => {
    const stream = makeStream(); // no targetElement
    const fakeStream = makeFakeStream();
    stream._pendingVideoTracks[0] = fakeStream;

    stream.attachDisplay(0, "main-container");

    const video = document.getElementById(stream._videoID);
    expect(video).not.toBeNull();
    expect(video.srcObject).toBe(fakeStream);
    expect(stream._containerIDs[0]).toBe("main-container");
    expect(stream._pendingVideoTracks[0]).toBeUndefined();
  });

  test("attachDisplay(1, containerId) injects secondary video and registers input handlers", () => {
    const stream = makeStreamWithTarget("main-container");
    const fakeStream = makeFakeStream();
    stream._pendingVideoTracks[1] = fakeStream;

    stream.attachDisplay(1, "cell-1");

    const video = document.getElementById(stream._videoIdFor(1));
    expect(video).not.toBeNull();
    expect(video.srcObject).toBe(fakeStream);
    expect(stream._pendingVideoTracks[1]).toBeUndefined();
    expect(stream._containerIDs[1]).toBe("cell-1");

    // Input handlers should be registered for display 1 on the cell container.
    const entry = stream._displayEventListeners[1];
    expect(entry).toBeDefined();
    expect(entry.container).toBe(document.getElementById("cell-1"));
    expect(typeof entry.handlers.pointermove).toBe("function");
    expect(typeof entry.handlers.pointerdown).toBe("function");
    expect(typeof entry.handlers.pointerup).toBe("function");
    expect(typeof entry.handlers.pointercancel).toBe("function");
    expect(typeof entry.handlers.mousewheel).toBe("function");
  });

  test("attachDisplay warns and returns when no pending stream exists", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const stream = makeStreamWithTarget("main-container");

    stream.attachDisplay(1, "cell-1");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("no pending stream"),
    );
    warnSpy.mockRestore();
  });

  test("attachDisplay logs error and returns when container not found", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const stream = makeStreamWithTarget("main-container");
    stream._pendingVideoTracks[1] = makeFakeStream();

    stream.attachDisplay(1, "nonexistent-container");

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("container #nonexistent-container not found"),
    );
    errorSpy.mockRestore();
  });

  test("attachDisplay extends _displayStates for new track index", () => {
    const stream = makeStreamWithTarget("main-container");
    stream._pendingVideoTracks[2] = makeFakeStream();

    stream.attachDisplay(2, "cell-2");

    expect(2 in stream._displayStates).toBe(true);
    expect(stream._displayStates[2]).toBeDefined();
    expect(stream._displayStates[2].activeTouchPointers).toEqual([]);
  });
});

describe("attachDisplay with upscaling enabled", () => {
  function stubStreamCanvasCreation(stream) {
    stream._createStreamCanvasForDisplay = jest.fn((displayId, video) => {
      video.style.display = "none";
      const canvasEl = document.createElement("canvas");
      canvasEl.id = stream._canvasIdFor(displayId);
      stream._streamCanvases[displayId] = {
        resize: jest.fn(),
        stop: jest.fn(),
        startRendering: jest.fn(),
        setTargetFps: jest.fn(),
      };
      return canvasEl;
    });
  }

  function makeUpscalingStream(overrides = {}) {
    return makeStream({
      experimental: { upscaling: { enabled: true } },
      ...overrides,
    });
  }

  function setupStreamCanvasAndAttachDisplay() {
    const stream = makeUpscalingStream();
    stubStreamCanvasCreation(stream);
    stream._pendingVideoTracks[1] = makeFakeStream();
    stream.attachDisplay(1, "cell-1");
    const video = document.getElementById(stream._videoIdFor(1));
    const canvas = document.getElementById(stream._canvasIdFor(1));
    return { stream, video, canvas };
  }

  test("creates a canvas for an additional display and hides its video element", () => {
    const { stream, video, canvas } = setupStreamCanvasAndAttachDisplay();
    expect(video.style.display).toBe("none");
    expect(canvas).not.toBeNull();
    expect(canvas.parentElement).toBe(document.getElementById("cell-1"));
    expect(stream._streamCanvases[1]).toBeDefined();
  });

  test("starts canvas rendering once the video's metadata is loaded", () => {
    const { stream, video } = setupStreamCanvasAndAttachDisplay();
    video.dispatchEvent(new Event("loadedmetadata"));

    expect(stream._streamCanvases[1].startRendering).toHaveBeenCalledTimes(1);
  });

  test("_computeMultiDisplayDimensions sizes the canvas, not the hidden video", () => {
    const { stream, video, canvas } = setupStreamCanvasAndAttachDisplay();
    video.__defineGetter__("videoWidth", () => 400);
    video.__defineGetter__("videoHeight", () => 800);

    stream._computeMultiDisplayDimensions(
      video,
      document.getElementById("cell-1"),
      1,
      canvas,
    );

    // Keep the aspect ratio
    expect(canvas.style.width).toBe("300px");
    expect(canvas.style.height).toBe("600px");
    expect(video.style.width).toBe("");
    expect(stream._streamCanvases[1].resize).toHaveBeenCalledWith(400, 800);
  });

  test("_removeMedia stops and removes every per-display canvas", () => {
    const stream = makeUpscalingStream();
    stubStreamCanvasCreation(stream);
    stream._pendingVideoTracks[0] = makeFakeStream();
    stream._pendingVideoTracks[1] = makeFakeStream();
    stream.attachDisplay(0, "main-container");
    stream.attachDisplay(1, "cell-1");

    const canvas0Id = stream._canvasIdFor(0);
    const canvas1Id = stream._canvasIdFor(1);
    const stopSpies = [
      stream._streamCanvases[0].stop,
      stream._streamCanvases[1].stop,
    ];

    stream._removeMedia();

    expect(stopSpies[0]).toHaveBeenCalledTimes(1);
    expect(stopSpies[1]).toHaveBeenCalledTimes(1);
    expect(document.getElementById(canvas0Id)).toBeNull();
    expect(document.getElementById(canvas1Id)).toBeNull();
    expect(stream._streamCanvases).toEqual({});
  });
});

describe("per-display input routing", () => {
  function setupTwoDisplayStream() {
    const stream = makeStreamWithTarget("main-container");

    // Set up display 0 video.
    const video0 = document.createElement("video");
    video0.id = stream._videoID;
    video0.__defineGetter__("videoWidth", () => 800);
    video0.__defineGetter__("videoHeight", () => 600);
    document.getElementById("main-container").appendChild(video0);
    stream._onResize();

    // Simulate extra track arriving for display 1.
    const fakeStream = makeFakeStream();
    stream._pendingVideoTracks[1] = fakeStream;
    stream.attachDisplay(1, "cell-1");

    const video1 = document.getElementById(stream._videoIdFor(1));
    if (video1) {
      video1.__defineGetter__("videoWidth", () => 400);
      video1.__defineGetter__("videoHeight", () => 300);
      video1.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
        right: 400,
        bottom: 300,
      });
    }

    // In multi-display mode, display 0 also uses getBoundingClientRect.
    // Mock its rect so pointer events are not silently dropped.
    video0.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
    });

    return stream;
  }

  test("pointer events are routed with the correct display_id for each container", () => {
    const stream = setupTwoDisplayStream();
    const mockSend = jest.fn(() => true);
    stream._webrtcManager = {
      _isControlChannelOpen: true,
      sendControlMessage: mockSend,
      stop: jest.fn(),
    };

    stream._registerInputHandlers(0, document.getElementById("main-container"));
    stream._registerInputHandlers(1, document.getElementById("cell-1"));

    // Event on display 1 container must carry display_id: 1.
    document.getElementById("cell-1").dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerType: "mouse",
        clientX: 100,
        clientY: 100,
        isPrimary: true,
        pointerId: 0,
      }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      "input::mouse-button",
      expect.objectContaining({ display_id: 1 }),
    );

    mockSend.mockClear();

    // Event on display 0 container must carry display_id: 0.
    document.getElementById("main-container").dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerType: "mouse",
        clientX: 100,
        clientY: 100,
        isPrimary: true,
        pointerId: 0,
      }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      "input::mouse-button",
      expect.objectContaining({ display_id: 0 }),
    );
  });
});

describe("_removeMedia", () => {
  test("fires videoTrackRemoved for each attached display in reverse order", () => {
    const removed = [];
    const stream = makeStream({
      targetElement: "main-container",
      callbacks: { videoTrackRemoved: (i) => removed.push(i) },
    });

    // Simulate 3 displays attached.
    stream._containerIDs = { 0: "main-container", 1: "cell-1", 2: "cell-2" };

    stream._removeMedia();

    expect(removed).toEqual([2, 1, 0]);
  });

  test("resets multiDisplay state flags", () => {
    const stream = makeStreamWithTarget("main-container");
    stream._multiDisplayActive = true;
    stream._primaryDisplayReady = true;
    stream._pendingReadyCount = 3;
    stream._pendingVideoTracks = { 1: makeFakeStream() };

    stream._removeMedia();

    expect(stream._multiDisplayActive).toBe(false);
    expect(stream._primaryDisplayReady).toBe(false);
    expect(stream._pendingReadyCount).toBe(0);
    expect(stream._pendingVideoTracks).toEqual({});
  });

  test("removes secondary video elements from DOM", () => {
    const stream = makeStreamWithTarget("main-container");
    stream._containerIDs = { 0: "main-container", 1: "cell-1", 2: "cell-2" };

    // Add secondary video elements to DOM.
    const v1 = document.createElement("video");
    v1.id = `${stream._videoID}-display-1`;
    document.body.appendChild(v1);
    const v2 = document.createElement("video");
    v2.id = `${stream._videoID}-display-2`;
    document.body.appendChild(v2);

    stream._removeMedia();

    expect(document.getElementById(`${stream._videoID}-display-1`)).toBeNull();
    expect(document.getElementById(`${stream._videoID}-display-2`)).toBeNull();
  });

  test("resets _containerIDs and _displayStates to initial values", () => {
    const stream = makeStreamWithTarget("main-container");
    stream._containerIDs = { 0: "main-container", 1: "cell-1" };

    stream._removeMedia();

    expect(stream._containerIDs).toEqual({ 0: "main-container" });
    // Should have one display state entry (for display 0).
    expect(0 in stream._displayStates).toBe(true);
    expect(1 in stream._displayStates).toBe(false);
  });

  test("resets _containerIDs to empty in fully dynamic mode", () => {
    const stream = makeStream(); // no targetElement
    stream._containerIDs = { 0: "cell-1", 1: "cell-2" };

    stream._removeMedia();

    expect(stream._containerIDs).toEqual({});
    expect(stream._displayStates).toEqual({});
  });
});

describe("_displayStates initialisation", () => {
  test("legacy mode initialises one state entry for display 0", () => {
    const stream = makeStreamWithTarget("main-container");

    expect(0 in stream._displayStates).toBe(true);
    const s = stream._displayStates[0];
    expect(s.dimensions).toBeNull();
    expect(s.activeTouchPointers).toEqual([]);
    expect(s.pointerIdsMapper).toEqual({});
    expect(s.primaryTouchId).toBe(0);
    expect(s.pointersOutofBounds).toEqual({});
  });

  test("fully dynamic mode initialises an empty _displayStates object", () => {
    const stream = makeStream(); // no targetElement

    expect(stream._displayStates).toEqual({});
    expect(stream._containerIDs).toEqual({});
  });
});

describe("videoTrackAdded and videoTrackRemoved callbacks", () => {
  test("videoTrackAdded fires with displayId when extra track arrives", () => {
    const added = [];
    const stream = makeStream({
      targetElement: "main-container",
      callbacks: { videoTrackAdded: (i) => added.push(i) },
    });

    stream._onExtraVideoTrack(1, makeFakeStream());
    stream._onExtraVideoTrack(2, makeFakeStream());

    expect(added).toEqual([1, 2]);
  });
});

describe("rotation in multi-display mode", () => {
  function setupRotatedDisplay0() {
    const stream = makeStreamWithTarget("main-container");
    stream._webrtcManager = {
      _isControlChannelOpen: true,
      sendControlMessage: jest.fn(),
      stop: jest.fn(),
    };

    const video0 = document.createElement("video");
    video0.id = stream._videoID;
    video0.__defineGetter__("videoWidth", () => 500);
    video0.__defineGetter__("videoHeight", () => 1000);
    document.getElementById("main-container").appendChild(video0);
    stream._onResize();

    // Enter multi-display mode by attaching a second display.
    const fakeStream = makeFakeStream();
    stream._pendingVideoTracks[1] = fakeStream;
    stream.attachDisplay(1, "cell-1");

    // Display 0's container in legacy (targetElement) mode is main-container
    // itself (800x600, per addContainer() defaults).
    const cell0 = document.getElementById("main-container");

    return { stream, video0, cell0 };
  }

  test("_computeMultiDisplayDimensions swaps the fit dimensions for display 0 when rotated", () => {
    const { stream, video0, cell0 } = setupRotatedDisplay0();

    expect(stream.rotate(90)).toEqual(true);

    stream._computeMultiDisplayDimensions(video0, cell0, 0);
    const dim = stream._displayStates[0].dimensions;

    // Native video is 500x1000 (portrait); rotated 90deg it effectively
    // becomes a 1000x500 (landscape) box, which fits the 800x600 cell as
    // 800x400 to fit the original aspect ratio.
    expect(dim.playerWidth).toEqual(800);
    expect(dim.playerHeight).toEqual(400);

    // The element itself must be sized with the pre-transform dimensions
    // so that after rotate 90deg, the on-screen box matches player size.
    expect(video0.style.width).toEqual("400px");
    expect(video0.style.height).toEqual("800px");
  });

  test("touch coordinates for a rotated display 0 match single-display behaviour", () => {
    const single = makeStreamWithTarget("main-container");
    single._webrtcManager = {
      _isControlChannelOpen: true,
      sendControlMessage: jest.fn(() => true),
      stop: jest.fn(),
    };
    const singleVideo = document.createElement("video");
    singleVideo.id = single._videoID;
    singleVideo.__defineGetter__("videoWidth", () => 500);
    singleVideo.__defineGetter__("videoHeight", () => 1000);
    document.getElementById("main-container").appendChild(singleVideo);
    single._onResize();
    expect(single.rotate(90)).toEqual(true);
    single._registerInputHandlers(0, document.getElementById("main-container"));

    document.getElementById("main-container").dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerType: "touch",
        clientX: 0,
        clientY: 100,
        isPrimary: true,
        pointerId: 1,
      }),
    );
    const singleCall = single._webrtcManager.sendControlMessage.mock.calls.find(
      (c) => c[0] === "input::touch-start",
    );
    expect(singleCall).toBeDefined();

    document.body.innerHTML = "";

    // Multi-display case: a second display attached to test multi-display mode.
    const {
      stream: multi,
      video0,
      cell0,
    } = (() => {
      const containerEl = document.createElement("div");
      containerEl.id = "main-container";
      containerEl.__defineGetter__("clientWidth", () => 800);
      containerEl.__defineGetter__("clientHeight", () => 600);
      containerEl.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      });
      document.body.appendChild(containerEl);

      const cell1 = document.createElement("div");
      cell1.id = "cell-1";
      document.body.appendChild(cell1);

      return setupRotatedDisplay0();
    })();

    expect(multi.rotate(90)).toEqual(true);
    multi._registerInputHandlers(0, cell0);

    // Simulate the actual on-screen bounding box after rotating 90deg.
    video0.getBoundingClientRect = () => ({
      left: 0,
      top: 100,
      width: 800,
      height: 400,
      right: 800,
      bottom: 500,
    });

    cell0.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerType: "touch",
        clientX: 0,
        clientY: 100,
        isPrimary: true,
        pointerId: 1,
      }),
    );
    const multiCall = multi._webrtcManager.sendControlMessage.mock.calls.find(
      (c) => c[0] === "input::touch-start",
    );
    expect(multiCall).toBeDefined();

    // Both modes must map the exact same on-screen click to the exact same
    // remote coordinates.
    expect(multiCall[1].x).toBeCloseTo(singleCall[1].x, 0);
    expect(multiCall[1].y).toBeCloseTo(singleCall[1].y, 0);
  });

  test("each attached display can be rotated independently", () => {
    const stream = makeStreamWithTarget("main-container");
    stream._webrtcManager = {
      _isControlChannelOpen: true,
      sendControlMessage: jest.fn(),
      stop: jest.fn(),
    };

    const video0 = document.createElement("video");
    video0.id = stream._videoID;
    video0.__defineGetter__("videoWidth", () => 500);
    video0.__defineGetter__("videoHeight", () => 1000);
    document.getElementById("main-container").appendChild(video0);
    stream._onResize();

    stream._pendingVideoTracks[1] = makeFakeStream();
    stream.attachDisplay(1, "cell-1");
    const video1 = document.getElementById(stream._videoIdFor(1));
    video1.__defineGetter__("videoWidth", () => 400);
    video1.__defineGetter__("videoHeight", () => 300);

    // The display 0 must stay unrotated when rotating display 1 only;
    expect(stream.rotate(90, 1)).toEqual(true);
    expect(video1.style.transform).toEqual("rotate(90deg)");
    expect(video0.style.transform).not.toEqual("rotate(90deg)");
    expect(stream.getCurrentRotation(0)).toEqual(0);
    expect(stream.getCurrentRotation(1)).toEqual(90);

    // The display 1 must be unaffected when when rotating display 0 only;
    expect(stream.rotate(180, 0)).toEqual(true);
    expect(video0.style.transform).toEqual("rotate(180deg)");
    expect(stream.getCurrentRotation(0)).toEqual(180);
    expect(stream.getCurrentRotation(1)).toEqual(90);
  });

  test("rotate() fails for a display id that is not attached", () => {
    const stream = makeStreamWithTarget("main-container");
    stream._webrtcManager = {
      _isControlChannelOpen: true,
      sendControlMessage: jest.fn(),
      stop: jest.fn(),
    };
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(stream.rotate(90, 5)).toEqual(false);

    errSpy.mockRestore();
  });
});
