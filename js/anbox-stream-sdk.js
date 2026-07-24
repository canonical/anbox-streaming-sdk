/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Version: 1.31.0
 *
 * Copyright 2021 Canonical Ltd.
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

// Error return when the actual error is unknown
export const ANBOX_STREAM_SDK_ERROR_UNKNOWN = 0;
// Error returned when an invalid argument was provided
export const ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT = 1;
// Error returned when signaling has failed
export const ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED = 2;
// Error returned when the used connector returned an error
export const ANBOX_STREAM_SDK_ERROR_CONNECTOR_FAILED = 3;
// Error returned when a certain operation or environment is not supported
export const ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED = 4;
// Error returned when an operation is not allowed
export const ANBOX_STREAM_SDK_ERROR_NOT_ALLOWED = 5;
// Error returned when the AnboxStream object has run into an internal error
export const ANBOX_STREAM_SDK_ERROR_INTERNAL = 6;
// Error returned when an operation timed out
export const ANBOX_STREAM_SDK_ERROR_TIMEOUT = 7;
// Error returned when creating or joining a session has failed
export const ANBOX_STREAM_SDK_ERROR_SESSION_FAILED = 8;
// Error returned when WebRTC has failed without further details
export const ANBOX_STREAM_SDK_ERROR_WEBRTC_FAILED = 9;
// Error returned when the WebRTC connection got disconnected
export const ANBOX_STREAM_SDK_ERROR_WEBRTC_LOST_CONNECTION = 10;
// Error returned when the signaling process timed out
export const ANBOX_STREAM_SDK_ERROR_SIGNALING_TIMEOUT = 11;
// Error returned when using the browsers media devices failed
export const ANBOX_STREAM_SDK_ERROR_USER_MEDIA = 12;
// Error returned when an error occured on the WebRTC control data channel
export const ANBOX_STREAM_SDK_ERROR_WEBRTC_CONTROL_FAILED = 13;
// Error returned when the WebRTC connection gets disconnected by the
// server side
export const ANBOX_STREAM_SDK_ERROR_WEBRTC_DISCONNECTED = 14;

// The maximum supported client API version
export const ANBOX_STREAM_SDK_MAX_CLIENT_API_VERSION = 2;

// See https://datatracker.ietf.org/doc/html/rfc4960#section-3.3.10
const SCP_CAUSE_CODE_USER_INITIATED_ABORT = 12;

// Default sensor data update interval(60Hz)
const DEFAULT_SENSOR_DATA_UPDATE_INTERVAL = 16;

// Minimum allowed interval for sensor data updates
const MINIMAL_SENSOR_DATA_UPDATE_INTERVAL = 10;

function newError(msg, code) {
  var options = {
    cause: {
      code: ANBOX_STREAM_SDK_ERROR_UNKNOWN,
    },
  };

  if (Number.isInteger(code)) options.cause.code = code;

  return new Error(msg, options);
}

function _fuzzyCompare(n1, n2, precision = 0.000001) {
  if (n1 === null && n2 === null) return true;
  if (n1 === null || n2 === null) return false;
  return Math.abs(n1 - n2) <= precision;
}

class AnboxStream {
  /**
   * AnboxStream creates a connection between your client and an Android instance and
   * displays its video & audio feed in an HTML5 player
   * @param options: {object}
   * @param options.connector {object} WebRTC Stream connector.
   * @param [options.targetElement] {string} ID of the DOM element to attach the primary (display 0)
   *   video to. When provided the SDK operates in legacy single-display mode: the primary video is
   *   injected automatically, and the `videoTrackAdded` callback fires for every display that arrives
   *   (including display 0). When omitted the SDK operates in fully dynamic mode: the caller MUST
   *   call `attachDisplay(displayId, containerId)` for every display, including display 0, in
   *   response to the `videoTrackAdded` callback.
   * @param [options.verticalAlignment=center] {top | center | bottom} Vertical alignment of the video element in its container.
   * @param [options.fullScreen=false] {boolean} Stream video in full screen mode.
   * @param [options.deviceType] {string} Send the type of device the SDK is running on to the Android container.
   * @param [options.enableStats] {boolean} Enable collection of statistics. Not recommended in production.
   * @param [options.apiVersion=2] {integer} API version to use.
   * @param [options.stream] {object} Configuration settings for the streaming.
   * @param [options.stream.video=true] {boolean} Enable video stream when starting streaming.
   * @param [options.stream.audio=true] {boolean} Enable audio stream when starting streaming.
   * @param [options.stunServers] {object[]} List of additional STUN/TURN servers.
   * @param [options.stunServers[].urls] {string[]} URLs the same STUN/TURN server can be reached on.
   * @param [options.stunServers[].username] {string} Username used when authenticating with the STUN/TURN server.
   * @param [options.stunServers[].password] {string} Password used when authenticating with the STUN/TURN server.
   * @param [options.devices] {object} Configuration settings for the streaming client device.
   * @param [options.devices.microphone=false] {boolean} Enable audio capture from microphone and send it to the remote peer.
   * @param [options.devices.camera=false] {boolean} Enable video capture from camera and send it to the remote peer.
   * @param [options.devices.speaker=true] {boolean} Enable audio playout through the default audio playback device.
   * @param [options.devices.sensor] {object} Configuration for device sensors.
   * @param [options.devices.sensor.enableOrientation=false] {boolean} Enable orientation sensor.
   * @param [options.devices.sensor.enableAccelerometer=false] {boolean} Enable accelerometer.
   * @param [options.devices.sensor.enableGyroscope=false] {boolean} Enable gyroscope.
   * @param [options.devices.sensor.updateInterval=16] {integer} Interval in milliseconds at which sensor data is delivered to the Anbox container. Must be at least 10ms; otherwise, an ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT error will be thrown.
   * @param [options.controls] {object} Configuration how the client can interact with the stream.
   * @param [options.controls.keyboard=true] {boolean} Send key presses to the Android instance.
   * @param [options.controls.emulateTouch=false] {boolean} Emulate touchscreen by converting mouse inputs to touch inputs
   * @param [options.controls.mouse=true] {boolean} Send mouse events to the Android instance.
   * @param [options.controls.gamepad=true] {boolean} Send gamepad events to the Android instance.
   * @param [options.foregroundActivity] {string} Activity to be displayed in the foreground. NOTE: it only works with an application that has APK provided on its creation.
   * @param [options.callbacks] {object} A list of callbacks to react on stream lifecycle events.
   * @param [options.callbacks.ready=none] {function} Called when the video and audio stream are ready to be inserted in the DOM.
   * @param [options.callbacks.error=none] {function} Called on stream error with the error object as a parameter.
   * @param [options.callbacks.connectionEventReceived=none] {function} Called when WebRTC connection events are received.
   * @param [options.callbacks.done=none] {function} Called when the stream is closed.
   * @param [options.callbacks.messageReceived=none] {function} Called when a message is received from Anbox.
   * @param [options.callbacks.statsUpdated=none] {function} Called when the overall webrtc peer connection statistics are updated.
   * @param [options.callbacks.requestCameraAccess=none] {function} Called when Android application tries to open camera device for video streaming.
   * @param [options.callbacks.requestMicrophoneAccess=none] {function} Called when Android application tries to open microphone device for video streaming.
   * @param [options.callbacks.vhalReady=none] {function} Called when the VHAL manager has been initialised.
   * @param [options.callbacks.videoTrackAdded=none] {function} Called when a display video track is
   *   added. Receives (displayId). Fires for every display, starting from display 0.
   *   In dynamic mode (no `targetElement`): call `sdk.attachDisplay(displayId, containerId)`
   *   after the container is in the DOM to have the SDK inject the video element.
   *   In legacy mode (`targetElement` provided): display 0 is already injected; call
   *   `sdk.attachDisplay(displayId, containerId)` for displays 1 and above.
   * @param [options.callbacks.videoTrackRemoved=none] {function} Called when a display video track is removed. Receives (displayId).
   * @param [options.dataChannels] {object} Map of data channels used to exchange out of band data between WebRTC client and application running in Android container.
   * @param [options.dataChannels[name].callbacks] {object} A list of event handling callbacks of one specific data channel.
   * @param [options.dataChannels[name].callbacks.open=none] {function} A callback function that is triggered when the data channel is opened.
   * @param [options.dataChannels[name].callbacks.message=none] {function} A callback function that is triggered when a message has been received from the remote peer.
   * @param [options.dataChannels[name].callbacks.close=none] {function} A callback function that is triggered when the data channel has closed.
   * @param [options.dataChannels[name].callbacks.error=none] {function} A callback function that is triggered when an error occurs on the data channel.
   * @param [options.video] {object} Configuration settings for the video streaming.
   * @param [options.video.preferred_decoder_codecs] {object} A list of preferred video decoder codecs that are used by the client. Can be one or more video codecs: AV1, H264, VP8, VP9.
   * @param [options.experimental] {object} Experimental features. Not recommended on production.
   * @param [options.experimental.disableBrowserBlock=false] {boolean} Don't throw an error if an unsupported browser is detected.
   * @param [options.experimental.emulatePointerEvent=true] {boolean} Emulate pointer events when their coordinates are outside of the video element.
   * @param [options.experimental.upscaling] {object} Experimental video upscaling features.
   * @param [options.experimental.upscaling.enabled=false] {boolean} Enable upscaling for video streaming on the client side. Currently, the upscaling relies on AMD FidelityFX Super Resolution 1.0 (FSR). When enabled, upscaling is applied to every display.
   * @param [options.experimental.upscaling.fragmentShaders] {string[]} Use custom fragment shader sources for upscaling instead of the default one, which is based on AMD FidelityFX Super Resolution 1.0 (FSR). This allows multi-pass shaders to be applied during the upscaling process. When a fragment shader is applied, the resulting framebuffer to which a texture is attached will be used as the source for the next shader in the list. Therefore, the order of shaders in the list is important.
   * @param [options.experimental.upscaling.useTargetFrameRate=false] {boolean} Use target refresh frame rate for the canvas when rendering video frames rather than relying on HTMLVideoElement.requestVideoFrameCallback() function even if it's supported by the browser due to the fact that the callback can occasionally be fired one v-sync late.
   * @param [options.experimental.debug=false] {boolean} Print debug logs
   * @param [options.experimental.pointerLock=false] {boolean} Pointer lock provides input events based on the movement of the mouse over time, not the absolute position. If enabled, the mouse will be locked to the stream view.
   */
  constructor(options) {
    if (this._nullOrUndef(options)) {
      throw newError(
        "missing options",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    this._fillDefaults(options);
    this._validateOptions(options);
    this._options = options;

    if (!this._options.experimental.disableBrowserBlock)
      this._detectUnsupportedBrowser();

    this._id = Math.random().toString(36).substr(2, 9);

    // _containerIDs maps display id to the DOM container id for that display.
    this._containerIDs = this._options.targetElement
      ? { 0: this._options.targetElement }
      : {};

    this._videoID = "anbox-stream-video-" + this._id;
    this._audioID = "anbox-stream-audio-" + this._id;
    this._canvasID = "anbox-stream-canvas-" + this._id;
    this._multiDisplayActive = false;

    this._pendingVideoTracks = {};
    this._pendingReadyCount = 0;

    this._displayStates = this._options.targetElement
      ? {
          0: {
            dimensions: null,
            activeTouchPointers: [],
            pointerIdsMapper: {},
            primaryTouchId: 0,
            pointersOutofBounds: {},
          },
        }
      : {};
    this._streamCanvases = {};

    // WebRTC
    this._webrtcManager = new AnboxWebRTCManager({
      apiVersion: this._options.apiVersion,
      enableSpeakers: this._options.devices.speaker,
      enableMic: this._options.devices.microphone,
      enableCamera: this._options.devices.camera,
      enableAudioStream: this._options.stream.audio,
      enableVideoStream: this._options.stream.video,
      deviceType: this._options.deviceType,
      dataChannels: this._options.dataChannels,
      foregroundActivity: this._options.foregroundActivity,
      stats: {
        overlayID: this._options.targetElement || null,
        enable: this._options.enableStats,
      },
      debug: this._options.experimental.debug,
      preferredVideoDecoderCodecs: this._options.video.preferred_decoder_codecs,
    });
    this._webrtcManager.onReady(this._webrtcReady.bind(this));
    this._webrtcManager.onExtraVideoTrack(this._onExtraVideoTrack.bind(this));
    this._webrtcManager.onError((err) => {
      this._stopStreamingOnError(err.message, err.cause.code);
    });
    this._webrtcManager.onClose(this._stopStreaming.bind(this));
    this._webrtcManager.onConnectionEventReceived(
      this._options.callbacks.connectionEventReceived,
    );
    this._webrtcManager.onStatsUpdated(this._options.callbacks.statsUpdated);
    this._webrtcManager.onMessage(this._options.callbacks.messageReceived);
    this._webrtcManager.onCameraRequested(
      this._options.callbacks.requestCameraAccess,
    );
    this._webrtcManager.onMicrophoneRequested(
      this._options.callbacks.requestMicrophoneAccess,
    );
    this._webrtcManager.onIMEStateChanged(this._IMEStateChanged.bind(this));
    this._webrtcManager.onDiscoverMessageReceived((msg) => {
      for (const canvas of Object.values(this._streamCanvases)) {
        canvas.setTargetFps(msg.fps);
      }
      if (msg.capabilities?.includes?.("vhal")) {
        this._vhalManager = new AnboxVhalManager(
          this._webrtcManager,
          this._options.callbacks.vhalReady,
        );
        this._webrtcManager.onVhalPropConfigsReceived(
          this._vhalManager.onVhalPropConfigsReceived.bind(this._vhalManager),
        );
        this._webrtcManager.onVhalGetAnswerReceived(
          this._vhalManager.onVhalGetAnswerReceived.bind(this._vhalManager),
        );
        this._webrtcManager.onVhalSetAnswerReceived(
          this._vhalManager.onVhalSetAnswerReceived.bind(this._vhalManager),
        );
      }
    });
    this._webrtcManager.onControlChannelOpen(() => {
      this._webrtcManager._isControlChannelOpen = true;
      if (this._nullOrUndef(this._vhalManager)) return;
      // Request all vhal prop configs from the server to populate the vhal
      // manager cache
      this._webrtcManager.sendControlMessage("vhal::get-all-prop-configs");
    });

    this._sensorManager = null;
    const sensorsEnabled =
      this._options.devices.sensor.enableOrientation ||
      this._options.devices.sensor.enableAccelerometer ||
      this._options.devices.sensor.enableGyroscope;
    if (sensorsEnabled) {
      this._sensorManager = new AnboxSensorManager({
        webrtcManager: this._webrtcManager,
        updateInterval: this._options.devices.sensor.updateInterval,
        enableOrientation: this._options.devices.sensor.enableOrientation,
        enableAccelerometer: this._options.devices.sensor.enableAccelerometer,
        enableGyroscope: this._options.devices.sensor.enableGyroscope,
      });
      this._webrtcManager.onSensorActivated(
        this._sensorManager.onSensorActivated.bind(this._sensorManager),
      );
      this._webrtcManager.onSensorDeactivated(
        this._sensorManager.onSensorDeactivated.bind(this._sensorManager),
      );
    }

    // Control options
    this._modifierState = 0;
    this._gamepadManager = null;

    this._originalOrientationByDisplay = {};
    this._rotationDegreesByDisplay = {};

    this._displayEventListeners = [];

    this.controls = {
      touch: {
        pointermove: this._onPointerEvent.bind(this),
        pointerdown: this._onPointerEvent.bind(this),
        pointerup: this._onPointerEvent.bind(this),
        pointercancel: this._onPointerEvent.bind(this),
        mousewheel: this._onMouseWheel.bind(this),
      },
      keyboard: {
        keydown: this._onKey.bind(this),
        keyup: this._onKey.bind(this),
        gamepadconnected: this._queryGamePadEvents.bind(this),
      },
    };

    this.releaseKeyboard = this.releaseKeyboard.bind(this);
    this.captureKeyboard = this.captureKeyboard.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  /**
   * Connect a new instance for the configured application or attach to an existing one
   */
  async connect() {
    if (this._options.fullScreen) this.requestFullscreen(0);

    let session = {};
    try {
      // Create media in the try-catch block in case of an exception being thrown
      this._createMedia();
      session = await this._options.connector.connect();
    } catch (e) {
      this._stopStreamingOnError(
        "connector failed to connect: " + e.message,
        ANBOX_STREAM_SDK_ERROR_CONNECTOR_FAILED,
      );
      return;
    }

    try {
      this._webrtcManager.start(session);
      this._queryGamePadEvents();
    } catch (e) {
      this._stopStreamingOnError(e);
      return;
    }
  }

  /**
   * Disconnect an existing stream and remove the video & audio elements.
   *
   * This will stop the underlying Android instance.
   */
  disconnect() {
    this._stopStreaming();
    this._options.connector.disconnect();
  }

  /**
   * Attach a consumer-provided container to a display.
   *
   * In legacy mode (`targetElement` provided): display 0 is managed by the SDK,
   * so this should only be called for displays with index >= 1, in response to
   * the `videoTrackAdded` callback.
   *
   * In fully dynamic mode (no `targetElement`): must be called for every display
   * including display 0, in response to the `videoTrackAdded` callback. The SDK
   * will inject a `<video>` element into the container, set up input routing,
   * and begin computing dimensions for that display.
   *
   * @param {number} displayId - The display id reported by `videoTrackAdded`.
   * @param {string} containerId  - The DOM `id` of the container element to
   *                                inject the video into. The element must
   *                                already be present in the DOM.
   */
  attachDisplay(displayId, containerId) {
    if (displayId === 0 && this._options.targetElement) {
      // Legacy mode: display 0 is already managed by targetElement. Nothing to do.
      return;
    }

    const stream = this._pendingVideoTracks[displayId];
    if (!stream) {
      console.warn(
        `[AnboxStream] attachDisplay(${displayId}) called but no pending stream. ` +
          "Call this method from within the videoTrackAdded callback.",
      );
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(
        `[AnboxStream] attachDisplay(${displayId}): container #${containerId} not found in DOM.`,
      );
      return;
    }

    delete this._pendingVideoTracks[displayId];

    container.style.position = "relative";
    container.style.overflow = "hidden";
    container.style.touchAction = "none";

    this._containerIDs[displayId] = containerId;

    if (!(displayId in this._displayStates)) {
      this._displayStates[displayId] = {
        dimensions: null,
        activeTouchPointers: [],
        pointerIdsMapper: {},
        primaryTouchId: 0,
        pointersOutofBounds: {},
      };
    }

    this._multiDisplayActive = true;

    const videoId = this._videoIdFor(displayId);
    const video = this._createExtraVideoElement(videoId, stream);
    container.appendChild(video);

    let visualElement = video;
    const upscaling = this._options.experimental.upscaling;
    if (upscaling.enabled) {
      visualElement = this._createStreamCanvasForDisplay(displayId, video);
      container.appendChild(visualElement);

      // Explicitly call play() on the hidden video element as `autoplay` alone
      // does not reliably trigger the "play" event once a video is hidden in
      // some browsers, which would otherwise leave _pendingReadyCount stuck
      // forever and the ready() callback never resolving.
      video.play();
    }

    const computeDims = () =>
      this._computeMultiDisplayDimensions(
        video,
        container,
        displayId,
        visualElement,
      );
    video.addEventListener("loadedmetadata", computeDims);
    video.addEventListener("resize", computeDims);
    video.addEventListener(
      "play",
      () => {
        if (displayId === 0) {
          this._registerControls();
          this._primaryDisplayReady = true;
        } else {
          this._pendingReadyCount = Math.max(0, this._pendingReadyCount - 1);
        }
        this._checkReady();
      },
      { once: true },
    );

    // Recompute when the container cell resizes.
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        if (video.videoWidth > 0 && video.videoHeight > 0) computeDims();
      });
      ro.observe(container);
      this._displayStates[displayId].resizeObserver = ro;
    }

    if (displayId !== 0) {
      this._registerInputHandlers(displayId, container);

      // Recompute all display dimensions now that the layout has changed.
      // Use a short timeout so the browser has flushed the new layout.
      setTimeout(() => this._onResize(), 0);
    }
  }

  /**
   * Show overall statistics in an overlay during the streaming.
   * For more detailed information, refer to https://www.w3.org/TR/webrtc-stats/
   *
   * video: Statistics on the received video track.
   *   bandwidthMbit: Video traffic received in mbits/s.
   *   totalBytesReceived: Total cumulated bytes received for the current session.
   *   fps: Current frames per second.
   *   decodeTime: Average time in seconds to decode a frame.
   *   jitter: Total cumulated packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   avgJitterBufferDelay: Average variance in packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   packetsReceived: Total number of packets received.
   *   packetsLost: Total number of packets lost.
   *   totalAssemblyTime: The sum of the time, in seconds, each video frame takes from the time the first RTP packet is received (reception timestamp) and to the time the last RTP packet of a frame is received.
   *   framesAssembledFromMultiplePackets: Only exists for video. It represents the total number of frames correctly decoded for this RTP stream that consist of more than one RTP packet. For such frames the totalAssemblyTime is incremented.
   * network: Information about the network and WebRTC connections.
   *   currentRtt: Current round trip time in seconds.
   *   networkType: Type of network in use (NOTE: It's deprecated to preserve the privacy). Can be one of the following:
   *       bluetooth: This connection uses bluetooth.
   *       celullar: The connection uses a cellular data service to connect. This includes all cellular data services including EDGE (2G), HSPA (3G), LTE (4G), and NR (5G).
   *       ethernet: This connection uses an ethernet network.
   *       wifi: This connection uses WiFi.
   *       wimax: This connection uses a Wimax network.
   *       vpn: This connection uses a VPN which obscures the underlying connection type.
   *       unknown: The user's browser is unable or unwilling to identify the underlying connection technology used by the described connection.
   *   transportType: Network protocol in use.
   *   localCandidateType: Type of the local client WebRTC candidate. Can be one of the following:
   *       host: Local client is accessible directly via IP.
   *       srflx: Local client is accessible behind NAT.
   *       prflx: Local client is accessible behind a symmetric NAT.
   *       relay: Traffic is relayed to the local client via a TURN server. Relayed traffic can induce poor performance.
   *   remoteCandidateType: Type of the remote peer (Anbox container) WebRTC candidate. Can be one of the following:
   *       host: Remote peer is accessed directly via IP.
   *       srflx: Remote peer is accessed behind NAT.
   *       prflx: Remote peer is accessed behind a symmetric NAT.
   *       relay: Traffic is relayed to the remote peer via a TURN server. Relayed traffic can induce poor performance.
   * audioInput: Statistics related to the audio sent to the Anbox container
   *   bandwidthMbit: Audio traffic sent in mbits/s
   *   totalBytesSent: Total cumulated bytes sent for audio for the current session.
   * audioOutput: Information on the received audio track.
   *   bandwidthMbit: Audio traffic received in mbits/s.
   *   totalBytesReceived: Total cumulated bytes received for the current session.
   *   jitter: Total cumulated packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   avgJitterBufferDelay: Average variance in packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   totalSamplesReceived: Total number of audio samples received for the current session.
   *   packetsReceived: Total number of packets received.
   *   packetsLost: Total number of packets lost.
   * rtcConfig: Information on the WebRTC connection
   *   bundlePolicy: Policy on how to negotiate tracks if the remote peer is not bundle aware. If bundle aware, all tracks are generated on the same transport. Can be one of the following:
   *       balanced: Gather ICE candidates for each media type in use (audio, video, and data). If the remote endpoint is not bundle-aware, negotiate only one audio and video track on separate transports.
   *       max-compat: Gather ICE candidates for each track. If the remote endpoint is not bundle-aware, negotiate all media tracks on separate transports.
   *       max-bundle: Gather ICE candidates for only one track. If the remote endpoint is not bundle-aware, negotiate only one media track.
   *   rtcpMuxPolicy: Affects what ICE candidates are gathered to support non-multiplexed RTCP. The only value "require".
   *   sdpSemantics: Describes which style of SDP offers and answers is used.
   *   iceTransportPolicy: Policy for accepting ICE candidates. Can be one of the following:
   *       all: Accept all candidates.
   *       relay: Only accept candidates whose IP are being relayed, such as via a TURN server.
   *   iceCandidatePoolSize: Size of the prefetched ICE candidate pool.
   * experimental: Information on the experimental metrics.
   *   canvas: Information on the WebGL-based canvas.
   *     fps: Current frames per second on the rendering on the canavs.
   */
  showStatistics(enabled) {
    if (enabled) this._webrtcManager.showStatsOverlay();
    else this._webrtcManager.hideStatsOverlay();
  }

  /**
   * Toggle fullscreen for the streamed video of a given display.
   *
   * IMPORTANT: fullscreen can only be toggled following a user input.
   * If you call this method when your page loads, it will not work.
   *
   * @param {number} [displayId=0] Index of the display to show in full screen.
   */
  requestFullscreen(displayId = 0) {
    if (!document.fullscreenEnabled) {
      console.error("fullscreen not supported");
      return;
    }
    const videoID =
      displayId === 0 ? this._videoID : `${this._videoID}-display-${displayId}`;
    const fullscreenExited = () => {
      if (document.fullscreenElement === null) {
        const video = document.getElementById(videoID);
        if (video) {
          video.style.width = null;
          video.style.height = null;
        }
        this._onResize();
      }
    };
    // Clean up previous event listeners
    document.removeEventListener("fullscreenchange", fullscreenExited, false);
    document.addEventListener("fullscreenchange", fullscreenExited, false);

    // We don't put the video element itself in fullscreen because of
    // https://bugs.chromium.org/p/chromium/issues/detail?id=462164
    // To work around it we put the outer container in fullscreen and scale the video
    // to fit it. When exiting fullscreen we undo style changes done to the video element
    const videoContainer = document.getElementById(
      this._containerIDs[displayId],
    );
    if (!videoContainer) {
      console.error(
        `[AnboxStream] requestFullscreen(${displayId}): container not found for this display.`,
      );
      return;
    }
    if (videoContainer.requestFullscreen) {
      videoContainer.requestFullscreen().catch((err) => {
        console.log(
          `Failed to enter full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else if (videoContainer.mozRequestFullScreen) {
      /* Firefox */
      videoContainer.mozRequestFullScreen();
    } else if (videoContainer.webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      videoContainer.webkitRequestFullscreen();
    } else if (videoContainer.msRequestFullscreen) {
      /* IE/Edge */
      videoContainer.msRequestFullscreen();
    }
  }

  /**
   * Exit fullscreen mode.
   */
  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  /**
   * Return the stream ID you can use to access video and audio elements with getElementById
   * To access the video element, append "anbox-stream-video-" to the ID.
   * To access the audio element, append "anbox-stream-audio-" to the ID.
   * Ex: 'anbox-stream-video-rk8a12k'
   */
  getId() {
    return this._id;
  }

  /**
   * Enable touch emulation. All mouse inputs are translated to act like touch inputs.
   */
  enableTouchEmulation() {
    this._options.controls.emulateTouch = true;
  }

  /**
   * Disable touch emulation
   */
  disableTouchEmulation() {
    this._options.controls.emulateTouch = false;
  }

  /**
   * Send a location update to the connected Android instance
   *
   * For WGS84 format gps data, where a numeric latitude or longitude is given, geographic coordinates are
   * expressed as decimal fractions. With this system the geo coordinate of Berlin is: latitude 52.520008°, longitude 13.404954°.
   *
   * For NMEA format gps data, where a numeric latitude or longitude is given, the two digits
   * immediately to the left of the decimal point are whole minutes, to the right are decimals of minutes,
   * and the remaining digits to the left of the whole minutes are whole degrees.
   *
   * eg. 4533.35 is 45 degrees and 33.35 minutes. ".35" of a minute is exactly 21 seconds.
   *
   * @param update: {object}
   * @param update.format {string} GPS data format  ("nmea" or "wgs84" default: "wgs84")
   * @param update.time {number} Time in milliseconds since the start of the epoch
   * @param update.latitude {number} Latitude of the location (positive values mean northern hemisphere and negative values mean southern hemisphere)
   * @param update.longitude {number} Longitude of the location (positive values mean northern hemisphere and negative values mean southern hemisphere)
   * @param update.altitude {number} Altitude in meters
   * @param update.speed {number} Current speed in meter per second
   * @param update.bearing {number} Current bearing in degree
   * @throws {Error} Incomplete location update, some fields are missing.
   * @throws {Error} Invalid GPS data format, can only be "wgs84" or "nmea".
   * @throws {Error} The stream SDK is not ready yet.
   */
  sendLocationUpdate(update) {
    if (
      this._nullOrUndef(update.time) ||
      this._nullOrUndef(update.latitude) ||
      this._nullOrUndef(update.longitude) ||
      this._nullOrUndef(update.altitude) ||
      this._nullOrUndef(update.speed) ||
      this._nullOrUndef(update.bearing)
    ) {
      throw newError(
        "incomplete location update",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    if (
      !this._nullOrUndef(update.format) &&
      update.format !== "nmea" &&
      update.format !== "wgs84"
    ) {
      throw newError(
        "invalid gps data format",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    return this._webrtcManager.sendControlMessage(
      "location::update-position",
      update,
    );
  }

  /**
   * VHAL get call for multiple properties.
   * @param properties {array} Array of objects, see below.
   * @param properties.prop {Number} Property ID
   * @param properties.area_id {Number} Area ID
   * @param properties.int32_values {Array} Array of integers: required only for some properties.
   * @param properties.float_values {Array} Array of floats: required only for some properties.
   * @param properties.int64_values {Array} Array of integers: required only for some properties.
   * @param properties.bytes {Array} Raw bytes value as array of integers: required only for some properties.
   * @param properties.string_value {string} String value: required only for some properties.
   */
  async getVhalProperties(properties) {
    if (this._nullOrUndef(this._vhalManager))
      throw newError(
        "vhal not supported",
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED,
      );
    return this._vhalManager.get(properties);
  }

  /**
   * VHAL set call for multiple property values.
   * At least one of int32_values, float_values, int64_values, bytes or
   * string_value must be provided.
   * @param properties {array} Array of objects, see below.
   * @param properties.prop {Number} Property ID
   * @param properties.area_id {Number} Area ID
   * @param properties.status {Number} Property status
   * @param properties.int32_values {Array} Array of integers
   * @param properties.float_values {Array} Array of floats
   * @param properties.int64_values {Array} Array of integers
   * @param properties.bytes {Array} Raw bytes value as array of integers
   * @param properties.string_value {string} String value
   */
  async setVhalProperties(properties) {
    if (this._nullOrUndef(this._vhalManager))
      throw newError(
        "vhal not supported",
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED,
      );
    return this._vhalManager.set(properties);
  }

  /**
   * Get VHAL property configs for the requested property IDs.
   * Returns a copy of the stored configurations.
   * @param props {Array} Array of property IDs.
   */
  getVhalPropConfigs(props) {
    if (this._nullOrUndef(this._vhalManager))
      throw newError(
        "vhal not supported",
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED,
      );
    return this._vhalManager.getPropConfigs(props);
  }

  /**
   * Get all VHAL property configs.
   * Returns a copy of the stored configurations.
   */
  getAllVhalPropConfigs() {
    if (this._nullOrUndef(this._vhalManager))
      throw newError(
        "vhal not supported",
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED,
      );
    return this._vhalManager.getAllPropConfigs();
  }

  /**
   * Check if the VHAL functions are supported and available.
   * Returns true if VHAL is supported and available, false otherwise.
   */
  isVhalAvailable() {
    return (
      !this._nullOrUndef(this._vhalManager) && this._vhalManager.hasConfigs()
    );
  }

  _hasWebGLSupported() {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("webgl2");
      if (this._nullOrUndef(ctx)) return false;
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return false;
    }

    return true;
  }

  _detectUnsupportedBrowser() {
    if (
      navigator.userAgent.indexOf("Chrome") === -1 &&
      navigator.userAgent.indexOf("Firefox") === -1 &&
      navigator.userAgent.indexOf("Safari") === -1
    )
      throw newError(
        "unsupported browser",
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED,
      );
  }

  _fillDefaults(options) {
    if (this._nullOrUndef(options.apiVersion))
      options.apiVersion = ANBOX_STREAM_SDK_MAX_CLIENT_API_VERSION;

    if (
      this._nullOrUndef(options.verticalAlignment) ||
      !["top", "center", "bottom"].includes(options.verticalAlignment)
    ) {
      options.verticalAlignment = "center";
    }

    if (this._nullOrUndef(options.fullScreen)) options.fullScreen = false;

    if (this._nullOrUndef(options.controls)) options.controls = {};

    if (this._nullOrUndef(options.devices)) options.devices = {};

    if (this._nullOrUndef(options.devices.microphone))
      options.devices.microphone = false;

    if (this._nullOrUndef(options.devices.camera))
      options.devices.camera = false;

    if (this._nullOrUndef(options.devices.speaker))
      options.devices.speaker = true;

    if (this._nullOrUndef(options.devices.sensor)) options.devices.sensor = {};

    if (this._nullOrUndef(options.devices.sensor.updateInterval))
      options.devices.sensor.updateInterval =
        DEFAULT_SENSOR_DATA_UPDATE_INTERVAL;

    if (this._nullOrUndef(options.devices.sensor.enableOrientation))
      options.devices.sensor.enableOrientation = false;

    if (this._nullOrUndef(options.devices.sensor.enableAccelerometer))
      options.devices.sensor.enableAccelerometer = false;

    if (this._nullOrUndef(options.devices.sensor.enableGyroscope))
      options.devices.sensor.enableGyroscope = false;

    if (this._nullOrUndef(options.controls.keyboard))
      options.controls.keyboard = true;

    if (this._nullOrUndef(options.controls.mouse))
      options.controls.mouse = true;

    if (this._nullOrUndef(options.controls.emulateTouch))
      options.controls.emulateTouch = false;

    if (this._nullOrUndef(options.controls.gamepad))
      options.controls.gamepad = true;

    if (this._nullOrUndef(options.stream)) options.stream = {};

    if (this._nullOrUndef(options.stream.video)) options.stream.video = true;

    if (this._nullOrUndef(options.stream.audio)) options.stream.audio = true;

    if (this._nullOrUndef(options.stunServers)) options.stunServers = [];

    if (this._nullOrUndef(options.callbacks)) options.callbacks = {};

    if (this._nullOrUndef(options.video)) options.video = {};

    if (this._nullOrUndef(options.video.preferred_decoder_codecs)) {
      options.video.preferred_decoder_codecs = [];
    } else {
      options.video.preferred_decoder_codecs.forEach((codec) => {
        const supported_codecs = ["AV1", "H264", "VP8", "VP9"];
        if (
          !supported_codecs.find(
            (c) => c === codec || c === codec.toUpperCase(),
          )
        )
          throw newError(
            "invalid video decoder codec",
            ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
          );
      });
    }

    if (this._nullOrUndef(options.callbacks.ready))
      options.callbacks.ready = () => {};

    if (this._nullOrUndef(options.callbacks.error))
      options.callbacks.error = () => {};

    if (this._nullOrUndef(options.callbacks.done))
      options.callbacks.done = () => {};

    if (this._nullOrUndef(options.callbacks.messageReceived))
      options.callbacks.messageReceived = () => {};

    if (this._nullOrUndef(options.callbacks.statsUpdated))
      options.callbacks.statsUpdated = () => {};

    if (this._nullOrUndef(options.callbacks.requestCameraAccess))
      options.callbacks.requestCameraAccess = () => false;

    if (this._nullOrUndef(options.callbacks.requestMicrophoneAccess))
      options.callbacks.requestMicrophoneAccess = () => false;

    if (this._nullOrUndef(options.callbacks.vhalReady))
      options.callbacks.vhalReady = () => {};

    if (this._nullOrUndef(options.callbacks.videoTrackAdded))
      options.callbacks.videoTrackAdded = () => {};

    if (this._nullOrUndef(options.callbacks.videoTrackRemoved))
      options.callbacks.videoTrackRemoved = () => {};

    if (!this._nullOrUndef(options.dataChannels)) {
      if (Object.keys(options.dataChannels).length > maxNumberOfDataChannels) {
        throw newError(
          "exceeds the maximum allowed length of data channels",
          ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
        );
      }

      Object.keys(options.dataChannels).forEach((name) => {
        if (this._nullOrUndef(options.dataChannels[name].callbacks))
          options.dataChannels[name].callbacks = {};
        if (this._nullOrUndef(options.dataChannels[name].callbacks.open))
          options.dataChannels[name].callbacks.open = {};
        if (this._nullOrUndef(options.dataChannels[name].callbacks.close))
          options.dataChannels[name].callbacks.close = {};
        if (this._nullOrUndef(options.dataChannels[name].callbacks.error))
          options.dataChannels[name].callbacks.error = {};
        if (this._nullOrUndef(options.dataChannels[name].callbacks.message))
          options.dataChannels[name].callbacks.message = {};
      });
    } else options.dataChannels = {};

    if (this._nullOrUndef(options.foregroundActivity))
      options.foregroundActivity = "";

    if (this._nullOrUndef(options.deviceType)) options.deviceType = "";

    if (this._nullOrUndef(options.enableStats)) options.enableStats = false;

    if (this._nullOrUndef(options.experimental)) options.experimental = {};

    if (this._nullOrUndef(options.experimental.disableBrowserBlock))
      options.experimental.disableBrowserBlock = false;

    if (this._nullOrUndef(options.experimental.emulatePointerEvent))
      options.experimental.emulatePointerEvent = true;

    if (this._nullOrUndef(options.experimental.upscaling))
      options.experimental.upscaling = {};

    if (this._nullOrUndef(options.experimental.upscaling.enabled)) {
      options.experimental.upscaling.enabled = false;
    } else if (
      options.experimental.upscaling.enabled &&
      !this._hasWebGLSupported()
    ) {
      throw newError(
        "can not enable upscaling due to lack of WebGL support",
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED,
      );
    }
    if (this._nullOrUndef(options.experimental.upscaling.useTargetFrameRate))
      options.experimental.upscaling.useTargetFrameRate = false;

    if (this._nullOrUndef(options.experimental.debug))
      options.experimental.debug = false;

    if (this._nullOrUndef(options.experimental.pointerLock))
      options.experimental.pointerLock = false;
  }

  _validateApiVersion(version) {
    if (version > ANBOX_STREAM_SDK_MAX_CLIENT_API_VERSION || version < 0)
      throw newError(
        `invalid API version. Must be >= 0 and <= {ANBOX_STREAM_SDK_MAX_CLIENT_API_VERSION}`,
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
  }

  _validateOptions(options) {
    this._validateApiVersion(options.apiVersion);

    if (!this._nullOrUndef(options.targetElement)) {
      if (typeof options.targetElement !== "string") {
        throw newError(
          "targetElement must be a string ID",
          ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
        );
      }
      const container = document.getElementById(options.targetElement);
      if (container === null) {
        throw newError(
          `target element "${options.targetElement}" does not exist`,
          ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
        );
      } else if (container.clientWidth === 0 || container.clientHeight === 0)
        console.error(
          `[AnboxStream] video container element "${options.targetElement}" misses size. Please see https://canonical.com/anbox-cloud/docs/tutorial/stream-client`,
        );
    }

    if (this._nullOrUndef(options.connector)) {
      throw newError(
        "missing connector",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    if (typeof options.connector.connect !== "function") {
      throw newError(
        'missing "connect" method on connector',
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    if (typeof options.connector.disconnect !== "function") {
      throw newError(
        'missing "disconnect" method on connector',
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    const _activityNamePattern =
      /(^([A-Za-z]{1}[A-Za-z\d_]*\.){2,}|^(\.){1})[A-Za-z][A-Za-z\d_]*$/;
    if (
      options.foregroundActivity.length > 0 &&
      !_activityNamePattern.test(options.foregroundActivity)
    ) {
      throw newError(
        "invalid foreground activity name",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }
  }

  // Fire ready() only when display 0 has played AND all secondary display
  // tracks that arrived before display 0 played have also started playing.
  // _pendingReadyCount tracks how many secondary tracks are still pending.
  _checkReady() {
    if (this._primaryDisplayReady && this._pendingReadyCount === 0) {
      this._options.callbacks.ready();
    }
  }

  _createMedia() {
    // In fully dynamic mode (no targetElement) the video element is not
    // created here. The WebRTC source is stored in _pendingVideoTracks[0]
    // by _webrtcReady() and injected into the DOM by attachDisplay(0).
    if (!this._options.targetElement) {
      if (this._options.stream.audio && this._options.devices.speaker) {
        const audio = document.createElement("audio");
        audio.id = this._audioID;
        audio.autoplay = true;
        audio.controls = false;
        if (!this._options.stream.video) {
          audio.onplay = () => {
            this._primaryDisplayReady = true;
            this._checkReady();
            this._options.callbacks.videoTrackAdded(0);
          };
        }
        document.body.appendChild(audio);
      }
      return;
    }

    let mediaContainer = document.getElementById(this._options.targetElement);
    // We set the container as relative so the video element is absolute to it and not something else
    mediaContainer.style.position = "relative";
    // Disable native controls for touch events (zooming, panning)
    mediaContainer.style.touchAction = "none";

    let pointerLockElement = null;

    if (this._options.stream.video) {
      const video = document.createElement("video");
      video.style.margin = "0";
      video.style.height = "auto";
      video.style.width = "auto";
      // The video element is sized based on the dimensions of its container. Setting its position to "absolute"
      // removes it from the flow, so the video element cannot change its parent dimensions.
      video.style.position = "absolute";
      video.muted = true;
      video.autoplay = true;
      video.controls = false;
      video.id = this._videoID;
      video.playsInline = true;
      // Disable context menu so we can properly handle right clicks on the video
      video.setAttribute("oncontextmenu", "return false;");
      video.onplay = () => {
        this._onResize();
        this._registerControls();
        this._primaryDisplayReady = true;
        this._checkReady();
        this._options.callbacks.videoTrackAdded(0);
      };
      video.onloadedmetadata = () => {
        // NOTE: the video frame may not be received or fully decoded yet
        // when the onplay callback is fired, which may cause
        // - WebGL to fail in reading first frames from the video element.
        // - The video.videoWidth and video.videoHeight always stay to zero
        //   when its display style is none (E.g. the upscaling is enabled)
        // Hence we do not start rendering until metadata event is fired.
        this._onResize();

        if (this._streamCanvases[0]) {
          this._streamCanvases[0].startRendering();
        }
      };
      mediaContainer.appendChild(video);

      pointerLockElement = video;

      const upscaling = this._options.experimental.upscaling;
      if (upscaling.enabled) {
        const canvas = this._createStreamCanvasForDisplay(0, video);
        mediaContainer.appendChild(canvas);
        pointerLockElement = canvas;
      }
    }

    if (this._options.stream.audio && this._options.devices.speaker) {
      const audio = document.createElement("audio");
      audio.id = this._audioID;
      audio.autoplay = true;
      audio.controls = false;
      if (!this._options.stream.video) {
        audio.onplay = () => {
          this._primaryDisplayReady = true;
          this._checkReady();
          this._options.callbacks.videoTrackAdded(0);
        };
      }
      mediaContainer.appendChild(audio);
    }

    if (this._options.experimental.pointerLock && pointerLockElement !== null) {
      pointerLockElement.addEventListener("click", async () => {
        await pointerLockElement.requestPointerLock({});
      });
    }
  }

  _webrtcReady(videoSource, audioSource) {
    if (this._options.stream.video) {
      if (!this._options.targetElement) {
        // Guard against _webrtcReady being called again on subsequent track
        // arrivals (the WebRTC manager re-fires the ready callback for every
        // track once the primary conditions are satisfied).
        if (!(0 in this._pendingVideoTracks)) {
          this._pendingVideoTracks[0] = videoSource;
          this._options.callbacks.videoTrackAdded(0);
        }
      } else {
        const video = document.getElementById(this._videoID);
        video.srcObject = videoSource;

        // Expliclity to call play() method to the video element if it's hidden,
        // otherwise video can be still buffered but not playback, which caused
        // the video.onplay callback won't be triggered at all.
        if (video.style.display === "none") video.play();
      }
    }

    if (this._options.stream.audio && this._options.devices.speaker) {
      const audio = document.getElementById(this._audioID);
      audio.srcObject = audioSource;
    }

    if (!this._options.stream.video && !this._options.stream.audio) {
      this._primaryDisplayReady = true;
      this._checkReady();
      this._options.callbacks.videoTrackAdded(0);
    }
  }

  _onExtraVideoTrack(displayId, stream) {
    const videoId = `${this._videoID}-display-${displayId}`;
    if (document.getElementById(videoId)) {
      document.getElementById(videoId).srcObject = stream;
      return;
    }

    this._pendingReadyCount++;
    this._pendingVideoTracks[displayId] = stream;
    this._options.callbacks.videoTrackAdded(displayId);
  }

  _activateMultiDisplayGrid(container) {
    this._multiDisplayActive = true;

    // Wrap the primary video in a dedicated cell div so it becomes one
    // equal grid item alongside the additional display cells.
    const cell = document.createElement("div");
    cell.id = `${this._videoID}-cell-0`;
    cell.className = "anbox-stream-cell";
    cell.style.position = "relative";
    cell.style.overflow = "hidden";

    const primaryVideo = document.getElementById(this._videoID);
    if (primaryVideo) {
      // Make the primary video fill its new cell via absolute positioning,
      // consistent with how secondary videos are rendered.
      primaryVideo.style.position = "absolute";
      primaryVideo.style.inset = "0";
      primaryVideo.style.width = "100%";
      primaryVideo.style.height = "100%";
      primaryVideo.style.objectFit = "contain";
      primaryVideo.style.top = "";
      primaryVideo.style.left = "";
      primaryVideo.style.maxWidth = "";
      primaryVideo.style.maxHeight = "";
      cell.appendChild(primaryVideo);
    }
    container.insertBefore(cell, container.firstChild);

    // Move the display 0 input zone from the outer container to cell-0 so
    // pointer events are scoped to the actual video area.
    this._unregisterInputHandlers(0);
    this._containerIDs[0] = cell.id;
    this._registerInputHandlers(0, cell);

    container.style.display = "grid";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.gap = "0";
    container.style.overflow = "hidden";
    container.style.boxSizing = "border-box";
  }

  _createExtraVideoElement(id, stream) {
    const video = document.createElement("video");
    video.id = id;
    video.style.margin = "0";
    video.style.position = "absolute";
    video.muted = true;
    video.autoplay = true;
    video.controls = false;
    video.playsInline = true;
    video.setAttribute("oncontextmenu", "return false;");
    video.srcObject = stream;
    return video;
  }

  _videoIdFor(displayId) {
    return displayId === 0
      ? this._videoID
      : `${this._videoID}-display-${displayId}`;
  }

  _canvasIdFor(displayId) {
    return displayId === 0
      ? this._canvasID
      : `${this._canvasID}-display-${displayId}`;
  }

  _createStreamCanvasForDisplay(displayId, video) {
    const upscaling = this._options.experimental.upscaling;

    // When upscaling is enabled, this display is rendered through a WebGL
    // canvas instead of showing the <video> element directly, the video
    // element stays in the DOM (hidden) as the source texture.
    video.style.display = "none";

    const streamCanvas = new AnboxStreamCanvas({
      id: this._canvasIdFor(displayId),
      video: video,
      useTargetFrameRate: upscaling.useTargetFrameRate,
      fragmentShaders: upscaling.fragmentShaders,
    });

    streamCanvas.onFpsMeasured((fps) => {
      this._webrtcManager.updateCanvasFpsStats(fps, displayId);
    });

    this._streamCanvases[displayId] = streamCanvas;
    return streamCanvas.initialize();
  }

  _updateGridColumns(container) {
    const count = container.querySelectorAll(".anbox-stream-cell").length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  }

  _removeMedia() {
    this._multiDisplayActive = false;
    this._primaryDisplayReady = false;
    this._pendingReadyCount = 0;

    // Notify consumer for each attached display (highest id first), then
    // clean up any pending streams that were never attached.
    const attachedIds = Object.keys(this._containerIDs)
      .map(Number)
      .sort((a, b) => b - a);
    for (const displayId of attachedIds) {
      this._options.callbacks.videoTrackRemoved(displayId);
    }
    this._pendingVideoTracks = {};

    // First remove additional video elements injected by attachDisplay,
    // then Remove primary video and audio elements.
    for (const displayId of attachedIds) {
      if (displayId === 0) continue;
      const el = document.getElementById(this._videoIdFor(displayId));
      if (el) el.remove();
    }
    const video = document.getElementById(this._videoID);
    const audio = document.getElementById(this._audioID);
    if (video) video.remove();
    if (audio) audio.remove();

    // Stop and remove every upscaling canvas.
    for (const [displayId, streamCanvas] of Object.entries(
      this._streamCanvases,
    )) {
      streamCanvas.stop();
      const canvasEl = document.getElementById(
        this._canvasIdFor(Number(displayId)),
      );
      if (canvasEl) canvasEl.remove();
    }
    this._streamCanvases = {};

    // Disconnect ResizeObservers to avoid stale callbacks after teardown.
    for (const state of Object.values(this._displayStates)) {
      if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }
    }

    const initialContainerID = this._options.targetElement || null;
    this._containerIDs = initialContainerID ? { 0: initialContainerID } : {};
    this._displayStates = initialContainerID
      ? {
          0: {
            dimensions: null,
            activeTouchPointers: [],
            pointerIdsMapper: {},
            primaryTouchId: 0,
            pointersOutofBounds: {},
          },
        }
      : {};

    this._originalOrientationByDisplay = {};
    this._rotationDegreesByDisplay = {};
  }

  _stopStreaming() {
    this._unregisterControls();
    if (this._gamepadManager) {
      this._gamepadManager.stopPolling();
    }

    if (this._sensorManager) {
      this._sensorManager.stop();
    }

    this._webrtcManager.stop();
    this._removeMedia();

    this._options.callbacks.done();
  }

  _registerControls() {
    window.addEventListener("resize", this._onResize);

    if (this._options.controls.mouse) {
      // Register primary display input listeners on its container.
      const container = document.getElementById(this._containerIDs[0]);
      if (container) this._registerInputHandlers(0, container);
    }

    this.captureKeyboard();
  }

  _registerInputHandlers(displayId, container) {
    if (!this._options.controls.mouse) return;

    const handlers = {
      pointermove: (e) => this._onPointerEvent(e, displayId),
      pointerdown: (e) => this._onPointerEvent(e, displayId),
      pointerup: (e) => this._onPointerEvent(e, displayId),
      pointercancel: (e) => this._onPointerEvent(e, displayId),
      mousewheel: (e) => this._onMouseWheel(e, displayId),
    };

    for (const [name, fn] of Object.entries(handlers))
      container.addEventListener(name, fn);

    this._displayEventListeners[displayId] = { container, handlers };
  }

  _unregisterInputHandlers(displayId) {
    const entry = this._displayEventListeners[displayId];
    if (!entry) return;
    const { container, handlers } = entry;
    for (const [name, fn] of Object.entries(handlers))
      container.removeEventListener(name, fn);
    delete this._displayEventListeners[displayId];
  }

  /**
   * Start the capture of keyboard events and send them to the Android container.
   * NOTE: While keyboard events are captured, you cannot use keyboard controls outside the SDK stream.
   * To re-enable keyboard events, see releaseKeyboard().
   * @throws {Error} Throw if keyboard controls are disabled
   */
  captureKeyboard() {
    if (!this._options.controls.keyboard) {
      throw newError(
        "keyboard controls are disabled",
        ANBOX_STREAM_SDK_ERROR_NOT_ALLOWED,
      );
    }

    for (const controlName in this.controls.keyboard)
      window.addEventListener(controlName, this.controls.keyboard[controlName]);
  }

  /**
   * Stops capturing keyboard events. Can be used when you want to use a keyboard while a stream is running.
   * @throws {Error} Throw if keyboard controls are disabled
   */
  releaseKeyboard() {
    if (!this._options.controls.keyboard) {
      throw newError(
        "keyboard controls are disabled",
        ANBOX_STREAM_SDK_ERROR_NOT_ALLOWED,
      );
    }

    for (const controlName in this.controls.keyboard)
      window.removeEventListener(
        controlName,
        this.controls.keyboard[controlName],
      );
  }

  sendIMECommittedText(text) {
    const data = {
      text: text,
    };
    return this._sendIMEMessage(_imeEventType.Text, data);
  }

  sendIMEComposingText(text) {
    const data = {
      text: text,
    };
    return this._sendIMEMessage(_imeEventType.ComposingText, data);
  }

  sendIMETextDeletion(counts) {
    if (counts <= 0) return;

    const _android_KEYCODE_DEL = 67;
    return this._sendIMECode(_android_KEYCODE_DEL, counts);
  }

  sendIMEKeyCode(keyCode, times) {
    if (times <= 0) return;
    return this._sendIMECode(keyCode, times);
  }

  sendIMEAction(name, params) {
    if (typeof params === "undefined") params = "";

    // If Anbox IME is enabled, the `hide` action was triggered
    // from client side rather server, we have to remove the focus
    // from the video container so that the client side virtual
    // keyboard will pop down afterwards.
    if (name === "hide") this._setVideoContainerFocused(false);

    const data = {
      name: name,
      params: params,
    };
    return this._sendIMEMessage(_imeEventType.Action, data);
  }

  sendIMEComposingRegion(start, end) {
    if (start < 0 || start > end) return;
    const data = {
      start: start,
      end: end,
    };
    return this._sendIMEMessage(_imeEventType.ComposingRegion, data);
  }

  /**
   * Send a key event to the remote Android instance.
   *
   * When `pressed` is omitted the call simulates a full tap: key-down
   * followed immediately by key-up. Pass an explicit boolean to control
   * each half of the event independently, which is required when the
   * hold duration is driven by real user interaction(e.g. a UI button).
   *
   * @param key {string} Key name matching one of the entries in _keyScancodes,
   *   e.g. "Volumeup", "Volumedown", "Power", etc.
   *   See _keyScancodes for the full list of supported keys.
   * @param pressed {boolean|undefined} true = key-down only, false = key-up only,
   *   undefined (default) = full tap (key-down + key-up).
   * @return {boolean} true on success, false if the key is not recognised.
   */
  sendInputKey(key, pressed = undefined) {
    const code = _keyScancodes[key];
    if (code === undefined) {
      console.error(`Unknown input key: "${key}"`);
      return false;
    }
    if (pressed === undefined) {
      this._sendInputEvent("key", { code, pressed: true });
      this._sendInputEvent("key", { code, pressed: false });
    } else {
      this._sendInputEvent("key", { code, pressed });
    }
    return true;
  }

  sendData(channelName, data) {
    return this._webrtcManager.sendData(channelName, data);
  }

  _unregisterControls() {
    window.removeEventListener("resize", this._onResize);

    if (this._options.controls.mouse) {
      for (const i of Object.keys(this._containerIDs).map(Number))
        this._unregisterInputHandlers(i);
    }

    this.releaseKeyboard();
  }

  /**
   * Rotates a display's video element to a specific orientation or absolute degree.
   * @param {number|string} orientation - The target orientation as an absolute degree (multiple of 90), or one of:
   *   'portrait', 'landscape', 'reverse-portrait', 'reverse-landscape'.
   * @param {number} [displayId=0] - Index of the display to rotate. Each attached display
   *   (see `attachDisplay`) can be rotated independently.
   *
   * If a string is provided, the SDK maps it to degrees based on the given display's original
   * orientation:
   *   - when the display's original orientation is 'portrait': portrait=0, landscape=90, reverse-portrait=180, reverse-landscape=270
   *   - when the display's original orientation is 'landscape': landscape=0, reverse-portrait=90, reverse-landscape=180, portrait=270
   *
   * @note
   * 1. This value represents absolute degrees relative to the initial video orientation
   * established when the display's session is first created regardless of whether the
   * Android container is in portrait or landscape mode at startup, the initial degrees is
   * always defined as 0. Since this is an absolute coordinate system, it is the
   * caller's responsibility to provide the final target angle rather than a relative degree
   * from the current rotation.
   * 2. If the 'enableAccelerometer' option is enabled in the SDK configuration,
   * real-time sensor data from the client device will conflict with this function,
   * causing the rotation to be overridden or fail. Ensure manual rotation and
   * automatic accelerometer streaming are not used simultaneously.
   * 3. Rotating any display sends a global accelerometer sensor event to the Android instance
   * And sensor data is device-wide. This is independent from the local CSS rotation applied to
   * the given displayId's video element. The touch input coordinates for each display are always
   * remapped locally based on that display's own rotation state, so this is unaffected by which
   * display the sensor event ends up applying to.
   * @returns {boolean} Returns true if the video element is rotated successfully, otherwise returns false.
   */
  rotate(orientation, displayId = 0) {
    let degrees;

    if (!(displayId in this._displayStates)) {
      return false;
    }

    if (typeof orientation === "string") {
      const orientationStrings = [
        "portrait",
        "landscape",
        "reverse-portrait",
        "reverse-landscape",
      ];

      if (!orientationStrings.includes(orientation)) {
        console.error(`Invalid orientation given: ${orientation}`);
        return false;
      }

      const originalOrientation = this._originalOrientationByDisplay[displayId];
      let orientationToDegreesMap;
      if (originalOrientation === "portrait") {
        orientationToDegreesMap = {
          portrait: 0,
          landscape: 90,
          "reverse-portrait": 180,
          "reverse-landscape": 270,
        };
      } else if (originalOrientation === "landscape") {
        orientationToDegreesMap = {
          landscape: 0,
          "reverse-portrait": 90,
          "reverse-landscape": 180,
          portrait: 270,
        };
      } else {
        console.error(`Invalid original orientation: ${originalOrientation}`);
        return false;
      }

      degrees = orientationToDegreesMap[orientation];
    } else if (typeof orientation === "number") {
      degrees = orientation;
    } else {
      console.error(`Invalid orientation given: ${orientation}`);
      return false;
    }

    if (degrees % 90 !== 0) {
      console.error(
        `Invalid rotation degree: ${degrees}. Must be a multiple of 90.`,
      );
      return false;
    }

    if (this._options.devices.sensor.enableAccelerometer) {
      console.error(
        "Cannot manual rotate: 'devices.sensor.enableAccelerometer' is enabled. " +
          "Real-time sensor data would conflict with manual rotation.",
      );
      return false;
    }

    if (!this._webrtcManager || !this._webrtcManager._isControlChannelOpen) {
      return false;
    }

    const videoId = this._videoIdFor(displayId);
    let visualElement;
    if (this._streamCanvases[displayId]) {
      visualElement = document.getElementById(this._canvasIdFor(displayId));
    } else {
      visualElement = document.getElementById(videoId);
    }
    if (!visualElement) {
      console.error(`Cannot rotate: display ${displayId} is not attached.`);
      return false;
    }

    const normalized = ((degrees % 360) + 360) % 360;
    this._rotationDegreesByDisplay[displayId] = normalized;

    let accelData;
    const g = 9.81;
    switch (normalized) {
      case 90:
        accelData = { x: -g, y: 0, z: 0 };
        break;
      case 180:
        accelData = { x: 0, y: -g, z: 0 };
        break;
      case 270:
        accelData = { x: g, y: 0, z: 0 };
        break;
      case 0:
      default:
        accelData = { x: 0, y: g, z: 0 };
        break;
    }
    const data = {
      sensor: "acceleration",
      ...accelData,
    };
    this._webrtcManager.sendControlMessage("sensor:event", data);

    visualElement.style.transform = `rotate(${normalized}deg)`;
    this._onResize();

    return true;
  }

  getCurrentRotation(displayId = 0) {
    return this._rotationDegreesByDisplay[displayId] || 0;
  }

  _onResize() {
    const video = document.getElementById(this._videoID);
    const container = document.getElementById(
      this._options.targetElement || this._containerIDs[0],
    );
    if (video === null || container === null) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // In multi-display mode, recompute all attached displays so that any
    // layout changes (new display added, window resize) are reflected.
    if (this._multiDisplayActive) {
      const cell = document.getElementById(this._containerIDs[0]) || container;
      this._computeMultiDisplayDimensions(
        video,
        cell,
        0,
        document.getElementById(this._canvasIdFor(0)) || video,
      );
      const extraIds = Object.keys(this._containerIDs)
        .map(Number)
        .filter((i) => i > 0);
      for (const i of extraIds) {
        const secVideo = document.getElementById(this._videoIdFor(i));
        const secContainer = document.getElementById(this._containerIDs[i]);
        if (
          secVideo &&
          secContainer &&
          secVideo.videoWidth > 0 &&
          secVideo.videoHeight > 0
        ) {
          this._computeMultiDisplayDimensions(
            secVideo,
            secContainer,
            i,
            document.getElementById(this._canvasIdFor(i)) || secVideo,
          );
        }
      }
      return;
    }

    // Single-display mode
    let videoHeight = video.videoHeight;
    let videoWidth = video.videoWidth;

    const style = window.getComputedStyle(container, null);
    const getPadding = (direction) =>
      parseFloat(style.getPropertyValue("padding-" + direction) || "0");
    const containerHeight =
      container.clientHeight - getPadding("top") - getPadding("bottom");
    const containerWidth =
      container.clientWidth - getPadding("left") - getPadding("right");

    // Handle rotation
    const rotationDegrees = this.getCurrentRotation(0);
    switch (rotationDegrees) {
      case 0:
      case 180:
        break;
      case 90:
      case 270:
        videoHeight = video.videoWidth;
        videoWidth = video.videoHeight;
        break;
      default:
        throw newError(
          "unhandled rotation",
          ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED,
        );
    }

    // By what percentage do we have to grow/shrink the video so it has the same size as its container
    const resizePercentage = Math.min(
      containerHeight / videoHeight,
      containerWidth / videoWidth,
    );
    const playerHeight = Math.round(videoHeight * resizePercentage);
    const playerWidth = Math.round(videoWidth * resizePercentage);

    let visualElement = video;
    if (this._streamCanvases[0]) {
      visualElement = document.getElementById(this._canvasIdFor(0));
      // Adjust the viewport of WebGL inside of canvas to respect the
      // dimension of the video element if the upscaling is enabled.
      this._streamCanvases[0].resize(video.videoWidth, video.videoHeight);
    }

    let offsetTop;
    switch (rotationDegrees) {
      case 0:
      case 180:
        visualElement.style.height = playerHeight.toString() + "px";
        visualElement.style.width = playerWidth.toString() + "px";
        if (this._options.verticalAlignment === "top") {
          visualElement.style.top = "0";
          offsetTop = 0;
        } else if (this._options.verticalAlignment === "bottom") {
          visualElement.style.bottom = "0";
          offsetTop = container.clientHeight - playerHeight;
        } else {
          offsetTop = Math.round(container.clientHeight / 2 - playerHeight / 2);
          visualElement.style.top = `${offsetTop}px`;
        }
        visualElement.style.left = `${Math.round(
          container.clientWidth / 2 - playerWidth / 2,
        )}px`;
        break;
      case 270:
      case 90:
        visualElement.style.height = playerWidth.toString() + "px";
        visualElement.style.width = playerHeight.toString() + "px";
        if (this._options.verticalAlignment === "top") {
          visualElement.style.top = "0";
          offsetTop = 0;
        } else if (this._options.verticalAlignment === "bottom") {
          visualElement.style.bottom = "0";
          offsetTop = container.clientHeight - playerHeight;
        } else {
          offsetTop = Math.round(container.clientHeight / 2 - playerHeight / 2);
          visualElement.style.top = `${Math.round(
            container.clientHeight / 2 - playerWidth / 2,
          )}px`;
        }
        visualElement.style.left = `${Math.round(
          container.clientWidth / 2 - playerHeight / 2,
        )}px`;
        break;
      default:
        throw newError(
          "unhandled rotation",
          ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED,
        );
    }

    // Initialize basic orientation
    if (this._originalOrientationByDisplay[0] === undefined) {
      this._originalOrientationByDisplay[0] =
        playerWidth > playerHeight ? "landscape" : "portrait";
    }

    // The visual offset is always derived from the same formula, no matter the orientation.
    const offsetLeft = Math.round(container.clientWidth / 2 - playerWidth / 2);

    this._displayStates[0].dimensions = {
      videoHeight: videoHeight,
      videoWidth: videoWidth,
      scalePercentage: resizePercentage,
      playerHeight: playerHeight,
      playerWidth: playerWidth,
      playerOffsetLeft: offsetLeft,
      playerOffsetTop: offsetTop,
    };
  }

  // Compute dimensions for a display's video element inside its container
  // for multi-display mode.
  // NOTE: the `visualElement` is the DOM element that is actually visible
  // and positioned on screen: the <video> element itself or its upscaling
  // <canvas> counterpart when upscaling is enabled.
  _computeMultiDisplayDimensions(video, container, displayId, visualElement) {
    if (this._nullOrUndef(visualElement)) visualElement = video;

    const cRect = container.getBoundingClientRect();
    const cellWidth = cRect.width;
    const cellHeight = cRect.height;

    // When a display is rotated by 90 or 270 degrees, its on-screen aspect
    // ratio is swapped compared to the native video, so the fit/scale
    // computation below has to be based on the swapped dimensions.
    const rotationDegrees = this.getCurrentRotation(displayId);
    const isRotated = rotationDegrees === 90 || rotationDegrees === 270;
    const videoWidth = isRotated ? video.videoHeight : video.videoWidth;
    const videoHeight = isRotated ? video.videoWidth : video.videoHeight;

    // Compute the largest size that fits the (possibly rotated) video aspect
    // ratio inside the cell.
    const scale = Math.min(cellWidth / videoWidth, cellHeight / videoHeight);
    const renderedWidth = Math.round(videoWidth * scale);
    const renderedHeight = Math.round(videoHeight * scale);

    const streamCanvas = this._streamCanvases[displayId];
    if (streamCanvas) streamCanvas.resize(video.videoWidth, video.videoHeight);

    if (isRotated) {
      // Size the element with its un-rotated dimensions so that once the CSS
      // `rotate()` transform is applied around its center, the resulting
      // on-screen bounding box matches renderedWidth and renderedHeight.
      const offsetLeft = Math.round((cellWidth - renderedHeight) / 2);
      const offsetTop = Math.round((cellHeight - renderedWidth) / 2);
      visualElement.style.width = renderedHeight + "px";
      visualElement.style.height = renderedWidth + "px";
      visualElement.style.left = offsetLeft + "px";
      visualElement.style.top = offsetTop + "px";
    } else {
      const offsetLeft = Math.round((cellWidth - renderedWidth) / 2);
      const offsetTop = Math.round((cellHeight - renderedHeight) / 2);
      // Size and position the element to exactly match the rendered content.
      visualElement.style.width = renderedWidth + "px";
      visualElement.style.height = renderedHeight + "px";
      visualElement.style.left = offsetLeft + "px";
      visualElement.style.top = offsetTop + "px";
    }

    if (!(displayId in this._displayStates)) {
      this._displayStates[displayId] = {
        dimensions: null,
        activeTouchPointers: [],
        pointerIdsMapper: {},
        primaryTouchId: 0,
        pointersOutofBounds: {},
      };
    }

    // The playerOffset is 0 because the video element is already sized to the
    // rendered content.
    this._displayStates[displayId].dimensions = {
      videoHeight: videoHeight,
      videoWidth: videoWidth,
      scalePercentage: scale,
      playerHeight: renderedHeight,
      playerWidth: renderedWidth,
      playerOffsetLeft: 0,
      playerOffsetTop: 0,
    };

    // Initialize this display's original orientation from its native video dimensions,
    // so that string-based orientation values can be resolved for this display.
    if (this._originalOrientationByDisplay[displayId] === undefined) {
      this._originalOrientationByDisplay[displayId] =
        video.videoWidth > video.videoHeight ? "landscape" : "portrait";
    }
  }

  _triggerModifierEvent(event, key) {
    if (event.getModifierState(key)) {
      if (!(this._modifierState & _modifierEnum[key])) {
        this._modifierState = this._modifierState | _modifierEnum[key];
        this._sendInputEvent("key", {
          code: _keyScancodes[key],
          pressed: true,
        });
      }
    } else {
      if (this._modifierState & _modifierEnum[key]) {
        this._modifierState = this._modifierState & ~_modifierEnum[key];
        this._sendInputEvent("key", {
          code: _keyScancodes[key],
          pressed: false,
        });
      }
    }
  }

  _sendInputEvent(type, data) {
    return this._webrtcManager.sendControlMessage("input::" + type, data);
  }

  _sendIMECode(code, times) {
    const data = {
      code: code,
      times: times,
    };
    return this._sendIMEMessage(_imeEventType.Keycode, data);
  }

  _sendIMEMessage(imeEventType, imeData) {
    const data = {
      type: imeEventType,
      data: imeData,
    };
    return this._webrtcManager.sendControlMessage("input::ime-event", data);
  }

  /**
   * Convert Javascript API button codes to Android button codes
   * @param event {PointerEvent}
   * @returns buttonCode {number}
   * @private
   */
  _getPressedButton(event) {
    switch (event.button) {
      case 0: // main button (left)
        return 1;
      case 1: // auxiliary button (middle)
        return 3;
      case 2: // secondary button (right)
        return 2;
      case 3: // browser back
        return 4;
      case 4: // browser forward
        return 5;
      default:
        return 0;
    }
  }

  /**
   * Returns true if a pointer event (move or click) was emitted outside the video
   * boundaries of the given display.
   * @param {object} event
   * @param {number} displayId
   * @returns {boolean}
   * @private
   */
  _isPointerEventOutOfBounds(event, displayId) {
    const dim = this._displayStates[displayId].dimensions;
    return (
      event.clientX < 0 ||
      event.clientX > dim.playerWidth ||
      event.clientY < 0 ||
      event.clientY > dim.playerHeight
    );
  }

  /**
   * PointerEvents coordinates are relative to the document. This method
   * removes the various offsets so the (0,0) coordinate corresponds to
   * the top left corner of the video content for the given display.
   *
   * For primary display in single-display mode, uses the cached dimensions
   * computed by _onResize (which correctly handles CSS rotation) together
   * with the container's bounding rect.
   *
   * In multi-display mode, display 0's video element is explicitly sized and
   * positioned in pixels by _computeMultiDisplayDimensions (just like extra
   * displays), so we use the video element's getBoundingClientRect directly.
   * This avoids any dependency on the outer grid container's dimensions.
   *
   * @param event
   * @param {number} displayId
   * @private
   */
  _adjustPointerCoordsToVideoBoundaries(event, displayId) {
    const state = this._displayStates[displayId];
    if (!state) return false;

    if (displayId === 0 && !this._multiDisplayActive) {
      const container = document.getElementById(this._containerIDs[0]);
      if (!container) return false;
      const dim = state.dimensions;
      if (!dim) return false;
      const cRect = container.getBoundingClientRect();
      event.clientX = Math.round(
        event.clientX - cRect.left - dim.playerOffsetLeft,
      );
      event.clientY = Math.round(
        event.clientY - cRect.top - dim.playerOffsetTop,
      );
      return true;
    }

    // Multi-display mode: use the visual element's actual rendered bounding rect.
    const videoId = this._videoIdFor(displayId);
    const video = document.getElementById(videoId);
    if (!video || !video.videoWidth || !video.videoHeight) return false;

    const visualElement = this._streamCanvases[displayId]
      ? document.getElementById(this._canvasIdFor(displayId))
      : video;
    if (!visualElement) return false;

    const vRect = visualElement.getBoundingClientRect();
    if (vRect.width === 0 || vRect.height === 0) return false;

    // Swap width and height here too so scale/offset when a display is rotated
    // 90/270 degrees to stay consistent with the rotated on-screen box.
    const rotationDegrees = this.getCurrentRotation(displayId);
    const isRotated = rotationDegrees === 90 || rotationDegrees === 270;
    const videoWidth = isRotated ? video.videoHeight : video.videoWidth;
    const videoHeight = isRotated ? video.videoWidth : video.videoHeight;

    const scale = Math.min(
      vRect.width / videoWidth,
      vRect.height / videoHeight,
    );
    const renderedWidth = Math.round(videoWidth * scale);
    const renderedHeight = Math.round(videoHeight * scale);
    const contentOffsetX = Math.round((vRect.width - renderedWidth) / 2);
    const contentOffsetY = Math.round((vRect.height - renderedHeight) / 2);

    event.clientX = Math.round(event.clientX - vRect.left - contentOffsetX);
    event.clientY = Math.round(event.clientY - vRect.top - contentOffsetY);

    // Keep cached dimensions in sync for
    //  1. _isPointerEventOutOfBounds
    //  2. _translateLocalCoordsToRemoteCoords
    const newValues = {
      scalePercentage: scale,
      playerWidth: renderedWidth,
      playerHeight: renderedHeight,
      playerOffsetLeft: contentOffsetX,
      playerOffsetTop: contentOffsetY,
    };
    if (!state.dimensions) {
      state.dimensions = {
        videoWidth: videoWidth,
        videoHeight: videoHeight,
        ...newValues,
      };
    } else {
      state.dimensions = { ...state.dimensions, ...newValues };
    }

    return true;
  }

  /**
   * The video displayed on the client might be stretched to fit its display.
   * This method translates local coordinates so they fit the remote container.
   * @param event {PointerEvent}
   * @param {number} displayId
   * @private
   */
  _translateLocalCoordsToRemoteCoords(event, displayId) {
    const dim = this._displayStates[displayId].dimensions;

    if (event.pointerType === "touch") {
      const pos = this._convertTouchInput(
        event.clientX,
        event.clientY,
        displayId,
      );
      event.clientX = pos.x;
      event.clientY = pos.y;
    }

    event.clientX /= dim.scalePercentage;
    event.clientY /= dim.scalePercentage;

    event.movementX = Math.round(event.movementX / dim.scalePercentage);
    event.movementY = Math.round(event.movementY / dim.scalePercentage);
  }

  /**
   * onPointerEvent is called when a mouse or touch input is fired.
   * @param pointerEvent {PointerEvent}
   * @param {number} [displayId=0] Index of the display that received the event.
   * @private
   */
  _onPointerEvent(pointerEvent, displayId = 0) {
    pointerEvent.preventDefault();

    // If pointer lock is used but not active dismiss all events until the
    // lock is active again
    if (
      this._options.experimental.pointerLock &&
      this._nullOrUndef(document.pointerLockElement)
    )
      return;

    const displayState = this._displayStates[displayId];
    if (!displayState) return;

    // The pointerEvent.pointerId increments every time when a new touch point
    // is pressed(can be used to differentiate the touch point from others,
    // However the downside of this is that it can not be used as the MT slot
    // anymore and Android system can't handle the touch event with a slot
    // larger than 10 (the max touch points supported by Android system).
    // Hence we need to convert the pointerId to the MT slot index to ensure
    // correct MT slot event forwarding to Android container.
    const pointerId = Math.abs(pointerEvent.pointerId);
    if (pointerEvent.isPrimary) {
      displayState.primaryTouchId = pointerId;
    }

    const ori_pointerId = pointerId - displayState.primaryTouchId;
    const new_pointerId = this._findPointerId(ori_pointerId, displayState);

    // JS events are read-only, so we create a clone of the event that
    // we can modify down the road
    const event = {
      clientX: pointerEvent.clientX,
      clientY: pointerEvent.clientY,
      pointerId: new_pointerId,
      pointerType: pointerEvent.pointerType,
      type: pointerEvent.type,
      button: pointerEvent.button,
      movementX: pointerEvent.movementX,
      movementY: pointerEvent.movementY,
    };

    if (this._options.controls.emulateTouch) event.pointerType = "touch";

    // Transform pointer coordinates so (0,0) corresponds to the top left corner of the video
    if (!this._adjustPointerCoordsToVideoBoundaries(event, displayId)) return;

    if (this._isPointerEventOutOfBounds(event, displayId)) {
      // In either of the following cases, ignore the events when
      // they are out of bounds.
      // a) If the feature `emulatePoitnerEvent` is disabled,
      // b) If the feature `emulatePoitnerEvent` is enable, but the
      //    pointer is in out of bounds state,
      if (!this._options.experimental.emulatePointerEvent) return;

      if (
        event.pointerId in displayState.pointersOutofBounds &&
        event.type != "pointerup"
      )
        return;

      // Emulate the `pointerup` event when it's coordinate
      // is out of bounds.
      event.type = "pointerup";

      const dim = displayState.dimensions;
      if (event.clientX < 0) {
        event.clientX = 0;
      } else if (event.clientX > dim.playerWidth) {
        event.clientX = dim.playerWidth;
      }
      if (event.clientY < 0) {
        event.clientY = 0;
      } else if (event.clientY > dim.playerHeight) {
        event.clientY = dim.playerHeight;
      }

      displayState.pointersOutofBounds[event.pointerId] = true;
    } else if (
      this._options.experimental.emulatePointerEvent &&
      event.pointerId in displayState.pointersOutofBounds
    ) {
      // Replace the type of the event with 'pointerdown' if it comes
      // to 'pointermove' event after the event with the type 'pointerup'
      // is emulated previously.
      if (event.type === "pointermove") {
        // If the mouse button is pressed and moving back to video element
        // emulate the 'pointerdown' event too.
        if (pointerEvent.pointerType === "mouse" && pointerEvent.buttons !== 1)
          return;
        event.type = "pointerdown";
      }

      delete displayState.pointersOutofBounds[event.pointerId];
    }

    // Apply video scaling and rotation to the coordinates
    this._translateLocalCoordsToRemoteCoords(event, displayId);

    if (event.type === "pointermove" && event.pointerType === "touch") {
      const index = displayState.activeTouchPointers.indexOf(event.pointerId);
      if (index === -1) return;
      this._sendInputEvent("touch-move", {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        display_id: displayId,
      });
    } else if (event.type === "pointermove" && event.pointerType === "mouse") {
      var e = {
        rx: event.movementX,
        ry: event.movementY,
        display_id: displayId,
      };
      if (!this._options.experimental.pointerLock) {
        e.x = event.clientX;
        e.y = event.clientY;
      }
      this._sendInputEvent("mouse-move", e);
    } else if (event.type === "pointerdown" && event.pointerType === "touch") {
      const index = displayState.activeTouchPointers.indexOf(event.pointerId);
      if (index === -1) displayState.activeTouchPointers.push(event.pointerId);
      this._sendInputEvent("touch-start", {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        display_id: displayId,
      });
    } else if (event.type === "pointerdown" && event.pointerType === "mouse") {
      const button = this._getPressedButton(event);
      if (button <= 0) return;
      this._sendInputEvent("mouse-button", {
        pressed: true,
        button: button,
        display_id: displayId,
      });
    } else if (
      (event.type === "pointerup" || event.type === "pointercancel") &&
      event.pointerType === "touch"
    ) {
      const index = displayState.activeTouchPointers.indexOf(event.pointerId);
      if (index > -1) displayState.activeTouchPointers.splice(index, 1);

      // Fire the `touch-end` event for each touch points to avoid phantom
      // touch pointer but only includes the `BTN_TOUCH=0` message which is
      // influenced by the `last` field of input event when the last touch
      // pointer is lifted to notify Android frameworks of the end of a
      // multi-touch transfer, otherwise all touch points will be destroyed
      // by accident right after the first `touch-end` event is delivered to
      // Android frameworks, which is incorrect.
      this._sendInputEvent("touch-end", {
        id: event.pointerId,
        last: displayState.activeTouchPointers.length === 0,
        display_id: displayId,
      });

      delete displayState.pointerIdsMapper[ori_pointerId];
    } else if (
      (event.type === "pointerup" || event.type === "pointercancel") &&
      event.pointerType === "mouse"
    ) {
      const button = this._getPressedButton(event);
      if (button <= 0) return;
      this._sendInputEvent("mouse-button", {
        pressed: false,
        button: button,
        display_id: displayId,
      });
    }
  }

  _findPointerId(pointerId, displayState) {
    // AOSP supports max 10 touch points and we use the pointerId as the ABS_MT_SLOT
    // and ABS_MT_TRACKING_ID passing down to the container. However the pointerEvent.pointerId
    // would be increased all the time when lifting one finger up and down in a short
    // amount period of time when it comes to multiple touch scenario. Hence we need
    // to find out the minimal available pointerId to avoid the it exceeded the max value.
    const mapper = displayState
      ? displayState.pointerIdsMapper
      : this._displayStates[0].pointerIdsMapper;
    if (Object.keys(mapper).length > 0) {
      if (!(pointerId in mapper)) {
        let existing_pointerIds = [];
        Object.keys(mapper).forEach((id) => {
          existing_pointerIds.push(mapper[id]);
        });

        let new_pointerId = 0;
        for (; new_pointerId < _maxTouchPointSize; new_pointerId++) {
          const index = existing_pointerIds.indexOf(new_pointerId);
          if (index === -1) break;
        }

        mapper[pointerId] = new_pointerId;
      }
    } else {
      mapper[pointerId] = pointerId;
    }

    return mapper[pointerId];
  }

  _onMouseWheel(event, displayId = 0) {
    let move_step = (delta) => {
      if (delta === 0) return 0;
      return delta > 0 ? -1 : 1;
    };
    const movex = move_step(event.deltaX);
    const movey = move_step(event.deltaY);
    if (movex !== 0 || movey !== 0)
      this._sendInputEvent("mouse-wheel", {
        x: movex,
        y: movey,
        display_id: displayId,
      });
  }

  _onKey(event) {
    // Disable any problematic browser shortcuts
    if (
      event.code === "F5" || // Reload
      (event.code === "KeyR" && event.ctrlKey) || // Reload
      (event.code === "F5" && event.ctrlKey) || // Hard reload
      (event.code === "KeyI" && event.ctrlKey && event.shiftKey) ||
      event.code === "F11" || // Fullscreen
      event.code === "F12" // Developer tools
    )
      return;

    event.preventDefault();

    const numpad_key_prefix = "Numpad";
    const code = _keyScancodes[event.code];
    const pressed = event.type === "keydown";
    if (code) {
      // NOTE: no need to check the following modifier keys
      // 'ScrollLock', 'NumLock', 'CapsLock'
      // as they're mapped to event.code correctly
      const modifierKeys = ["Control", "Shift", "Alt", "Meta", "AltGraph"];
      for (let i = 0; i < modifierKeys.length; i++) {
        this._triggerModifierEvent(event, modifierKeys[i]);
      }

      this._sendInputEvent("key", {
        code: code,
        pressed: pressed,
      });
    } else if (event.code.startsWith(numpad_key_prefix)) {
      // 1. Use the event.key over event.code for the key code if a key event(digit only) triggered
      // from NumPad when NumLock is detected off The reason here is that event.code always remains
      // the same no matter NumLock is detected on or off. Also Anbox doesn't respect these keycodes
      // since Anbox just propagates those keycodes from client to the container and there is no
      // corresponding input event codes mapping all key codes coming from NumPad.
      //
      // See: https://github.com/torvalds/linux/blob/master/include/uapi/linux/input-event-codes.h
      //
      // The event.key reflects the correct human readable key code in the above case.
      //
      // 2. For mathematics symbols(+, *), we have to convert them to corresponding linux input code
      // with shift modifiers attached because of the same reason(no keycode mapping in kernel).
      let is_digit_key = (code) => {
        const last_char = code.charAt(code.length - 1);
        return last_char >= "0" && last_char <= "9";
      };

      let event_code = event.code.substr(numpad_key_prefix.length);
      if (is_digit_key(event.code)) {
        if (event.getModifierState("NumLock"))
          event_code = "Digit" + event_code;
        else event_code = event.key;
        this._sendInputEvent("key", {
          code: _keyScancodes[event_code],
          pressed: pressed,
        });
      } else {
        let attach_shift = false;
        if (event_code in _numPadMapper) {
          if (event_code === "Add" || event_code === "Multiply")
            attach_shift = true;
          event_code = _numPadMapper[event_code];
        }
        if (attach_shift)
          this._sendInputEvent("key", {
            code: _keyScancodes["Shift"],
            pressed: pressed,
          });
        this._sendInputEvent("key", {
          code: _keyScancodes[event_code],
          pressed: pressed,
        });
      }
    }
  }

  /**
   * Touch inputs need some additional processing when the screen is rotated.
   * This method transforms the X and Y coordinates of a touch input according
   * to the current rotation
   * The X and Y coordinates MUST be relative to the video, aka the various offsets
   * of the container and video element should be substracted from the coordinates
   * @param x {Number} raw X coordinate of the touch input (relative to the video element)
   * @param y {Number} raw Y coordinate of the touch input (relative to the video element)
   * @return coordinates {Object}
   * @return coordinates.x {Number} updated X coordinate
   * @return coordinates.y {Number} updated Y coordinate
   * @private
   */
  _convertTouchInput(x, y, displayId = 0) {
    const dim = this._displayStates[displayId]
      ? this._displayStates[displayId].dimensions
      : this._displayStates[0].dimensions;
    if (!dim) {
      throw newError("sdk is not ready yet", ANBOX_STREAM_SDK_ERROR_INTERNAL);
    }

    const rotationDegrees = this.getCurrentRotation(displayId);
    if (rotationDegrees === 0) return { x: x, y: y };

    let radians = (Math.PI / 180) * rotationDegrees,
      cos = Math.cos(radians),
      sin = Math.sin(radians),
      nx = Math.round(cos * x + sin * y),
      ny = Math.round(cos * y - sin * x);

    switch (rotationDegrees) {
      case 90:
        ny += dim.playerWidth;
        break;
      case 180:
        nx += dim.playerWidth;
        ny += dim.playerHeight;
        break;
      case 270:
        nx += dim.playerHeight;
        break;
    }

    // We can sometimes have -0 as a coordinate which can cause some issues.
    // To avoid this, we add +0 to have a positive 0
    return {
      x: nx + 0,
      y: ny + 0,
    };
  }

  _queryGamePadEvents() {
    if (!this._options.controls.gamepad) return;
    let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (gamepads.length > 0) {
      if (this._gamepadManager) {
        this._gamepadManager.stopPolling();
      }
      this._gamepadManager = new _gamepadEventManager(
        this._sendInputEvent.bind(this),
      );
      this._gamepadManager.startPolling();
    }
  }

  _setVideoContainerFocused(enabled) {
    const videoContainer = document.getElementById(this._containerIDs[0]);
    videoContainer.contentEditable = enabled;
    if (videoContainer.contentEditable) videoContainer.focus();
    else videoContainer.blur();
  }

  _nullOrUndef(obj) {
    return obj === null || obj === undefined;
  }

  _isFatalError(code) {
    return code !== ANBOX_STREAM_SDK_ERROR_USER_MEDIA;
  }

  _stopStreamingOnError(msg, code) {
    this._options.callbacks.error(newError(msg, code));
    if (this._isFatalError(code)) {
      this._stopStreaming();
    }
  }

  _IMEStateChanged(visible) {
    // The client-side virtual keyboard will pop down automatically
    // if a user clicks any area of video element as video element
    // is not input friendly. So we have to
    // 1. make video's container editable
    // 2. set focus on video's container
    // This prevents client side virtual keyboard from losing focus
    // and hiding afterward when a user interacts with UI.
    // Also since AnboxWebView takes over input connection channel,
    // when anbox ime is enabled and video container is editable,
    // there would be no text sent to the video container but to
    // Android container via our own private protocol.
    // The IMEJSInterface is exposed from Android java layer(AnboxWebView)
    // through JavaScript bridge, so suppress eslint rule for those lines.
    // eslint-disable-next-line no-undef
    if (!this._nullOrUndef(IMEJSInterface)) {
      this._setVideoContainerFocused(visible);
      if (visible) {
        // eslint-disable-next-line no-undef
        IMEJSInterface.openVirtualKeyboard();
      } else {
        // eslint-disable-next-line no-undef
        IMEJSInterface.hideVirtualKeyboard();
      }
    }
  }
}

class _gamepadEventManager {
  constructor(sendEvent) {
    this._polling = false;
    this._state = {};
    this._dpad_remap_start_index = 6;
    this._dpad_standard_start_index = 12;
    this._sendInputEvent = sendEvent;
  }

  startPolling() {
    if (this._polling === true) return;

    // Since chrome only supports event polling and we don't want
    // to send any gamepad events to Android isntance if the state
    // of any button or axis of gamepad is not changed. Hence we
    // cache all keys state whenever it gets connected and provide
    // event-driven gamepad events mechanism for gamepad events processing.
    let gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) this.cacheState(gamepads[i]);
    }

    this._polling = true;
    this.tick();
  }

  stopPolling() {
    if (this._polling === true) this._polling = false;
  }

  tick() {
    this.queryEvents();
    if (this._polling) window.requestAnimationFrame(this.tick.bind(this));
  }

  queryEvents() {
    let gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      let gamepad = gamepads[i];
      if (gamepad) {
        // A new gamepad is added
        if (!this._state[gamepad]) this.cacheState(gamepad);
        else {
          const buttons = gamepad.buttons;
          const cacheButtons = this._state[gamepad].buttons;
          for (let j = 0; j < buttons.length; j++) {
            if (cacheButtons[j].pressed !== buttons[j].pressed) {
              // Check the table at the following link that describes the buttons/axes
              // index and their physical locations.
              this._sendInputEvent("gamepad-button", {
                id: gamepad.index,
                index: j,
                pressed: buttons[j].pressed,
              });
              cacheButtons[j].pressed = buttons[j].pressed;
            }
          }

          // NOTE: For some game controllers, E.g. PS3 or Xbox 360 controller, DPAD buttons
          // were translated to axes via html5 gamepad APIs and located in gamepad.axes array
          // indexed starting from 6 to 7.
          // When a DPAD button is pressed/unpressed, the corresponding value as follows
          //
          //     Button         |  Index  |   Pressed   |   Unpressed   |
          // DPAD_LEFT_BUTTON   |    6    |      -1     |        0      |
          // DPAD_RIGHT_BUTTON  |    6    |       1     |        0      |
          // DPAD_UP_BUTTON     |    7    |      -1     |        0      |
          // DPAD_DOWN_BUTTON   |    7    |       1     |        0      |
          //
          // When the above button was pressed/unpressed, we will send the gamepad-button
          // event instead.
          const axes = gamepad.axes;
          let dpad_button_index = 0;
          const cacheAxes = this._state[gamepad].axes;
          for (let k = 0; k < axes.length; k++) {
            if (cacheAxes[k] !== axes[k]) {
              switch (true) {
                case k < this._dpad_remap_start_index: // Standard axes
                  this._sendInputEvent("gamepad-axes", {
                    id: gamepad.index,
                    index: k,
                    value: axes[k],
                  });
                  break;
                case k === this._dpad_remap_start_index: // DPAD left and right buttons
                  if (axes[k] === -1) {
                    dpad_button_index = this._dpad_standard_start_index + 2;
                  } else if (axes[k] !== 0) {
                    dpad_button_index = this._dpad_standard_start_index + 3;
                  }

                  this._sendInputEvent("gamepad-button", {
                    id: gamepad.index,
                    index: dpad_button_index,
                    pressed: axes[k] !== 0,
                  });
                  break;
                case k === this._dpad_remap_start_index + 1: //  DPAD up and down buttons
                  if (axes[k] === -1) {
                    dpad_button_index = this._dpad_standard_start_index;
                  } else if (axes[k] !== 0) {
                    dpad_button_index = this._dpad_standard_start_index + 1;
                  }

                  this._sendInputEvent("gamepad-button", {
                    id: gamepad.index,
                    index: dpad_button_index,
                    pressed: axes[k] !== 0,
                  });
                  break;
                default:
                  console.log("Unsupported axes index", k);
                  break;
              }
              cacheAxes[k] = axes[k];
            }
          }
        }
      }
    }
  }

  cacheState(gamepad) {
    if (!gamepad) return;

    const gamepadState = {};
    const buttons = gamepad.buttons;
    for (let index = 0; index < buttons.length; index++) {
      let buttonState = {
        pressed: buttons[index].pressed,
      };
      if (gamepadState.buttons) gamepadState.buttons.push(buttonState);
      else gamepadState.buttons = [buttonState];
    }

    const axes = gamepad.axes;
    for (let index = 0; index < axes.length; index++) {
      if (gamepadState.axes) gamepadState.axes.push(axes[index]);
      else gamepadState.axes = [axes[index]];
    }

    this._state[gamepad] = gamepadState;
  }
}

const maxNumberOfDataChannels = 5;

const _keyScancodes = {
  KeyA: 4,
  KeyB: 5,
  KeyC: 6,
  KeyD: 7,
  KeyE: 8,
  KeyF: 9,
  KeyG: 10,
  KeyH: 11,
  KeyI: 12,
  KeyJ: 13,
  KeyK: 14,
  KeyL: 15,
  KeyM: 16,
  KeyN: 17,
  KeyO: 18,
  KeyP: 19,
  KeyQ: 20,
  KeyR: 21,
  KeyS: 22,
  KeyT: 23,
  KeyU: 24,
  KeyV: 25,
  KeyW: 26,
  KeyX: 27,
  KeyY: 28,
  KeyZ: 29,
  Digit1: 30,
  Digit2: 31,
  Digit3: 32,
  Digit4: 33,
  Digit5: 34,
  Digit6: 35,
  Digit7: 36,
  Digit8: 37,
  Digit9: 38,
  Digit0: 39,
  Enter: 40,
  Escape: 41,
  Backspace: 42,
  Tab: 43,
  Space: 44,
  Minus: 45,
  Equal: 46,
  BracketLeft: 47,
  BracketRight: 48,
  Backslash: 49,
  Quote: 50,
  Semicolon: 51,
  Comma: 54,
  Period: 55,
  Slash: 56,
  CapsLock: 57,
  F1: 58,
  F2: 59,
  F3: 60,
  F4: 61,
  F5: 62,
  F6: 63,
  F7: 64,
  F8: 65,
  F9: 66,
  F10: 67,
  F11: 68,
  F12: 69,
  PrintScreen: 70,
  ScrollLock: 71,
  Pause: 72,
  Insert: 73,
  Home: 74,
  PageUp: 75,
  Delete: 76,
  End: 77,
  PageDown: 78,
  ArrowRight: 79,
  ArrowLeft: 80,
  ArrowDown: 81,
  ArrowUp: 82,
  Control: 83,
  Shift: 84,
  Alt: 85,
  Meta: 86,
  AltGraph: 87,
  NumLock: 88,
  Volumedown: 89,
  Volumeup: 90,
  Power: 91,
  Back: 92,
};

const _modifierEnum = {
  Control: 0x1,
  Shift: 0x2,
  Alt: 0x4,
  Meta: 0x8,
  AltGraph: 0x10,
};

const _numPadMapper = {
  Divide: "Slash",
  Decimal: "Period",
  Subtract: "Minus",
  Add: "Equal",
  Multiply: "Digit8",
};

const _imeEventType = {
  Text: 0x1,
  Keycode: 0x2,
  Action: 0x3,
  ComposingText: 0x4,
  ComposingRegion: 0x5,
};

const _maxTouchPointSize = 10;

const _vertexShaderSource = `#version 300 es
precision mediump float;
in vec2 aVertexPos;
in vec2 aTextureCoord;
out highp vec2 vTextureCoord;

void main()
{
  vTextureCoord = aTextureCoord;
  gl_Position = vec4(aVertexPos, 0.0, 1.0);
}
`;

const _fragShaderSource = `#version 300 es
precision mediump float;
uniform sampler2D uSampler;
in highp vec2 vTextureCoord;
out vec4 outColor;

void main()
{
  outColor = texture(uSampler, vTextureCoord);
}
`;

const _fsrShaderSource = `#version 300 es
/*
  Original:https://www.shadertoy.com/view/stXSWB
  by goingdigital

* FidelityFX Super Resolution scales up a low resolution
* image, while adding fine detail.
*
* MIT Open License
*
* https://gpuopen.com/fsr
*
* It works in two passes
*   EASU upsamples the image with a clamped Lanczos kernel.
*   RCAS sharpens the image at the target resolution.
*/
precision mediump float;

uniform float sharpness;
uniform vec2  uResolution;
uniform sampler2D uSampler;
in highp vec2 vTextureCoord;
out vec4 outColor;

/***** RCAS *****/
#define FSR_RCAS_LIMIT (0.25-(1.0/16.0))
//#define FSR_RCAS_DENOISE

// Input callback prototypes that need to be implemented by calling shader
vec4 FsrRcasLoadF(vec2 p);
//------------------------------------------------------------------------------------------------------------------------------
void FsrRcasCon(
    out float con,
    // The scale is {0.0 := maximum, to N>0, where N is the number of stops (halving) of the reduction of sharpness}.
    float sharpness
){
    // Transform from stops to linear value.
    con = exp2(-sharpness);
}

vec3 FsrRcasF(
    vec2 texCoord, // Float pixel position in output.
    float con
)
{
    // Constant generated by RcasSetup().
    // Algorithm uses minimal 3x3 pixel neighborhood.
    //    b
    //  d e f
    //    h
    vec2 sp = vec2(texCoord * uResolution.xy);
    vec3 b = FsrRcasLoadF(sp + vec2( 0,-1)).rgb;
    vec3 d = FsrRcasLoadF(sp + vec2(-1, 0)).rgb;
    vec3 e = FsrRcasLoadF(sp).rgb;
    vec3 f = FsrRcasLoadF(sp+vec2( 1, 0)).rgb;
    vec3 h = FsrRcasLoadF(sp+vec2( 0, 1)).rgb;
    // Luma times 2.
    float bL = b.g + .5 * (b.b + b.r);
    float dL = d.g + .5 * (d.b + d.r);
    float eL = e.g + .5 * (e.b + e.r);
    float fL = f.g + .5 * (f.b + f.r);
    float hL = h.g + .5 * (h.b + h.r);
    // Noise detection.
    float nz = .25 * (bL + dL + fL + hL) - eL;
    nz=clamp(
        abs(nz)
        /(
            max(max(bL,dL),max(eL,max(fL,hL)))
            -min(min(bL,dL),min(eL,min(fL,hL)))
        ),
        0., 1.
    );
    nz=1.-.5*nz;
    // Min and max of ring.
    vec3 mn4 = min(b, min(f, h));
    vec3 mx4 = max(b, max(f, h));
    // Immediate constants for peak range.
    vec2 peakC = vec2(1., -4.);
    // Limiters, these need to be high precision RCPs.
    vec3 hitMin = mn4 / (4. * mx4);
    vec3 hitMax = (peakC.x - mx4) / (4.* mn4 + peakC.y);
    vec3 lobeRGB = max(-hitMin, hitMax);
    float lobe = max(
        -FSR_RCAS_LIMIT,
        min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0.)
    )*con;
    // Apply noise removal.
    #ifdef FSR_RCAS_DENOISE
    lobe *= nz;
    #endif
    // Resolve, which needs the medium precision rcp approximation to avoid visible tonality changes.
    return (lobe * (b + d + h + f) + e) / (4. * lobe + 1.);
}

vec4 FsrRcasLoadF(vec2 p) {
    return texture(uSampler, p/uResolution.xy);
}

void main()
{
    // Set up constants
    float con;
    float sharpness = 0.2;
    FsrRcasCon(con,sharpness);

    vec3 col = FsrRcasF(vTextureCoord, con);
    outColor = vec4(col, 1.0);
}
`;

class AnboxWebRTCManager {
  /**
   * Handle the signaling process to establish a WebRTC stream between a client
   * and a container.
   * Requires a Session object and returns a video + audio element.
   * @param options {Object} configuration of the WebRTC stream
   * @param [options.apiVersion=2] {integer} API version
   * @param [options.enableSpeakers=true] {boolean} Enable speakers
   * @param [options.enableMic=false] {boolean} Enable microphone
   * @param [options.enableCamera=false] {boolean} Enable camera
   * @param [options.enableAudioStream=true] {boolean} Enable audio stream only when peer connection is established.
   * @param [options.enableVideoStream=true] {boolean} Enable video stream only when peer connection is established.
   * @param [options.deviceType] {string} Indicate the type of the device the SDK is running on
   * @param [options.foregroundActivity] {string} Activity to be displayed in the foreground. NOTE: it only works with an application that has APK provided on its creation.
   * @param [options.preferredVideoDecoderCodecs] {string[]} List of preferred video decoder codecs that are used by the client.
   * @param [options.stats] {Object}
   * @param [options.stats.enable=false] {boolean} Enable collection of statistics. Not recommended in production
   * @param [options.stats.overlayID] {string} ID of the container in which the stat overlay will be displayed. Can be the stream container ID or something else.
   * @param [options.debug=false] {boolean} Enable debug log
   */
  constructor(options) {
    this._ws = null;
    this._pc = null;
    this._controlChan = null;
    this._dataChans = [];
    this._stunServers = [];
    this._pendingCandidates = [];
    this._appliedRemoteDescription = false;
    this._isControlChannelOpen = false;

    // Timer global to the whole signaling process
    this._signalingTimeout = null;

    // Timer used to give the SDK a chance to reconnect if something goes wrong temporarily
    this._disconnectedTimeout = null;

    this._videoStream = null;
    this._audioStream = null;
    this._audioInputStream = null;
    this._videoInputStream = null;
    this._video_codec_ids = {};
    this._audioOutput_codec_id = null;
    this._audioInput_codec_id = null;
    // All video streams keyed by display id
    this._videoStreams = {};

    this._stream = {
      video: options.enableVideoStream,
      audio: options.enableAudioStream,
    };

    this._userMedia = {};
    if (this._stream.video) {
      this._userMedia.camera = options.enableCamera || false;
    } else {
      this._userMedia.camera = false;
    }

    if (this._stream.audio) {
      this._userMedia.speakers = options.enableSpeakers || true;
      this._userMedia.mic = options.enableMic || false;
    } else {
      this._userMedia.speakers = false;
      this._userMedia.mic = false;
    }

    this._deviceType = options.deviceType || "";
    this._foregroundActivity = options.foregroundActivity || "";

    this._dataChannels = options.dataChannels;
    this._preferredVideoDecoderCodecs =
      options.preferredVideoDecoderCodecs || [];

    this._startTimer = performance.now();
    this._statsEnabled = options.stats?.enable || false;
    this._statsOverlayID = options.stats?.overlayID;
    this._showStatsOverlay = false;
    this._stats = {
      rtcConfig: {
        sdpSemantics: "",
        rtcpMuxPolicy: "",
        bundlePolicy: "",
        iceTransportPolicy: "",
        iceCandidatePoolSize: "",
      },
      network: {
        currentRtt: 0,
        networkType: "unknown",
        transportType: "",
        localCandidateType: "",
        remoteCandidateType: "",
      },
      audioOutput: {
        bandwidthMbit: 0,
        totalBytesReceived: 0,
        totalSamplesReceived: 0,
        jitter: 0,
        avgJitterBufferDelay: 0,
        packetsReceived: 0,
        packetsLost: 0,
        codec: "",
      },
      audioInput: {
        bandwidthMbit: 0,
        totalBytesSent: 0,
        codec: "",
      },
      experimental: {
        canvas: {
          // Kept for backward compatibility and mirrors the primary display's canvas FPS.
          fps: 0,
          // Per-display upscaling canvas FPS.
          displays: {},
        },
      },
    };
    // `video` is an alias of `videoTracks[0]` kept for the backward compatibility, while
    // new multi-display consumers can look up any track through `videoTracks[displayId]`.
    this._stats.video = this._initVideoTrackStats();
    this._stats.videoTracks = { 0: this._stats.video };

    this._lastReport = {
      videoTracks: {},
      audioOutput: {},
      audioInput: {},
      canvas: {},
    };

    this._debugEnabled = options.debug;
    this._apiVersionInUse = options.apiVersion;

    // eslint-disable-next-line no-unused-vars
    this._onError = (msg, code) => {};
    // eslint-disable-next-line no-unused-vars
    this._onReady = (videoStream, audioStream) => {};
    this._onClose = () => {};
    // eslint-disable-next-line no-unused-vars
    this._onExtraVideoTrack = (displayId, stream) => {};
    this._onMicRequested = () => false;
    this._onCameraRequested = () => false;
    // eslint-disable-next-line no-unused-vars
    this._onMessage = (type, data) => {};
    // eslint-disable-next-line no-unused-vars
    this._onStatsUpdated = (stats) => {};
    // eslint-disable-next-line no-unused-vars
    this._onIMEStateChanged = (isChanged) => {};
    // eslint-disable-next-line no-unused-vars
    this._onVhalPropConfigsReceived = (data) => {};
    // eslint-disable-next-line no-unused-vars
    this._onVhalGetAnswerReceived = (data) => {};
    // eslint-disable-next-line no-unused-vars
    this._onVhalSetAnswerReceived = (data) => {};
    this._onConnectionEventReceived = () => {};
    this._onControlChannelOpen = () => {};
    // eslint-disable-next-line no-unused-vars
    this._onSensorActivated = (data) => {};
    // eslint-disable-next-line no-unused-vars
    this._onSensorDeactivated = (data) => {};
  }

  /**
   * @callback onWebRTCReady
   * @param videoSrc {Object} Stream to attach to the video element
   * @param audioSrc {Object} Stream to attach to the audio element
   */
  /**
   * Called when the video track has been successfully created
   * @param callback {onWebRTCReady} Callback invoked with video and audio streams
   */
  onReady(callback) {
    this._onReady = callback;
  }

  /**
   * @callback onExtraVideoTrack
   * @param displayId {number} zero-based display id derived from the server-assigned
   *   track name.
   * @param stream {MediaStream} Stream to attach to the extra video element
   */
  /**
   * Called when an additional video track is received.
   * The display id is parsed from the server-assigned track name and is
   * stable even when displays are added or removed dynamically.
   * @param callback {onExtraVideoTrack}
   */
  onExtraVideoTrack(callback) {
    this._onExtraVideoTrack = callback;
  }

  /**
   * @callback onWebRTCError
   * @param error {Error} Error object containing the message and code
   */
  /**
   * Called when the video track has been successfully created
   * @param callback {onWebRTCError} Callback invoked with error object
   */
  onError(callback) {
    this._onError = (msg, code) => {
      if (this._debugEnabled) console.error(msg);
      callback(newError(msg, code));
    };
  }

  /**
   * @callback onWebRTCClose
   */
  /**
   * Called when the stream is closed gracefully
   * @param callback {onWebRTCClose} Callback invoked when the stream is finished
   */
  onClose(callback) {
    this._onClose = callback;
  }

  /**
   * @callback onMicrophoneRequested
   * @return {boolean} True if access to the microphone is granted (default: false)
   */
  /**
   * Called when the permission to user the user microphone is requested
   * @param callback {onMicrophoneRequested} Callback invoked when requesting microphone
   */
  onMicrophoneRequested(callback) {
    this._onMicRequested = callback;
  }

  /**
   * @callback onCameraRequested
   * @return {boolean} True if access to the camera is granted (default: false)
   */
  /**
   * Called when the permission to user the user camera is requested
   * @param callback {onCameraRequested} Callback invoked when requesting camera
   */
  onCameraRequested(callback) {
    this._onCameraRequested = callback;
  }

  /**
   * @callback onMessage
   * @param type {string} Type of message
   * @param data {string} Content of the message
   */
  /**
   * Called when received a message from the Anbox container
   * @param callback {onMessage} Callback invoked when receiving a message from the Anbox container
   */
  onMessage(callback) {
    this._onMessage = callback;
  }

  /**
   * @callback onStatsUpdated
   * @param stats {Object} Statistics of the current stream
   */
  /**
   * Called when statistics are updated
   * @param callback {onStatsUpdated} Callback invoked when stream statistics are updated
   */
  onStatsUpdated(callback) {
    this._onStatsUpdated = callback;
  }

  /**
   * @callback onConnectionEventReceived
   * @param event {Object} WebRTC connection event details
   */
  /**
   * Called when a WebRTC connection event occurs
   * @param callback {onConnectionEventReceived} Callback invoked for WebRTC connection events
   */
  onConnectionEventReceived(callback) {
    if (typeof callback === "function") {
      this._onConnectionEventReceived = callback;
    }
  }

  /**
   * @callback onIMEStateChanged
   */
  /**
   * Called when the state of IME is changed
   * @param callback {onIMEStateChanged} Callback invoked when the state of IME is changed
   */
  onIMEStateChanged(callback) {
    this._onIMEStateChanged = callback;
  }

  /**
   * Start the signaling process
   * @param session {Object} Session object returned by the Stream Gateway
   * @param session.websocket {string} URL of the websocket on which to start the signaling process
   * @param session.stunServers {Object[]} List of additional STUN/TURN servers
   */
  start(session) {
    if (session.websocket === undefined || session.websocket.length === 0) {
      this._onError(
        "connector did not return any signaling information",
        ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED,
      );
    }

    if (session.stunServers.length > 0)
      this._includeStunServers(session.stunServers);

    this._signalingTimeout = window.setTimeout(
      () =>
        this._onError("signaling timed out", ANBOX_STREAM_SDK_ERROR_TIMEOUT),
      5 * 60 * 1000,
    );
    this._connectSignaler(session.websocket);
  }

  stop() {
    this._log("stopping");
    window.clearTimeout(this._signalingTimeout);
    window.clearTimeout(this._disconnectedTimeout);
    window.clearInterval(this._statsTimerId);

    this._dataChans.forEach((channel) => {
      channel.stop();
    });

    // Notify the other side that we're disconnecting to speed up potential reconnects
    // NOTE: do not send a control message if the data channel is not created yet.
    //       E.g. a peer connection is not established at all.
    if (this._controlChan !== null) {
      this.sendControlMessage("stream::disconnect", {});
      this._controlChan = null;
    }

    if (this._ws !== null) {
      this._ws.close();
      this._ws = null;
    }

    if (this._pc !== null) {
      this._pc.close();
      this._pc = null;
    }

    if (this._audioInputStream)
      this._audioInputStream.getTracks().forEach((track) => track.stop());

    if (this._videoInputStream)
      this._videoInputStream.getTracks().forEach((track) => track.stop());
  }

  /**
   * Display statistics about the current stream in an overlay window
   */
  showStatsOverlay() {
    if (!this._statsOverlayID || this._statsOverlayID.length === 0) {
      throw newError(
        "no overlay container id given at initialization",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    const container = document.getElementById(this._statsOverlayID);
    if (!container) {
      throw newError(
        "invalid overlay container",
        ANBOX_STREAM_SDK_ERROR_INTERNAL,
      );
    }

    this._showStatsOverlay = true;

    const stats = document.createElement("div");
    stats.id = this._statsOverlayID + "_child";
    stats.style.position = "absolute";
    stats.style.left = "0px";
    stats.style.top = "0px";
    stats.style.width = "250px";
    stats.style.backgroundColor = "rgba(0,0,0,0.75)";
    stats.style.color = "white";
    stats.style.fontSize = "x-small";
    stats.style.borderRadius = "3px";
    stats.style.lineHeight = "20px";
    stats.style.whiteSpace = "pre";
    stats.style.zIndex = "1";
    // Ignore the pointer interaction on stats overlay
    stats.style.pointerEvents = "none";
    container.appendChild(stats);
  }

  /**
   * Hide statistics overlay
   */
  hideStatsOverlay() {
    if (!this._showStatsOverlay) return;

    this._showStatsOverlay = false;

    const stats = document.getElementById(this._statsOverlayID + "_child");
    if (!stats) {
      throw newError(
        "invalid overlay container",
        ANBOX_STREAM_SDK_ERROR_INTERNAL,
      );
    }

    stats.remove();
  }

  /**
   * video: Statistics on the received video track of display 0 (the primary
   *   display). This field is kept for backward compatibility and is always
   *   equal to `videoTracks[0]`. New code that needs per-display statistics
   *   (multi video track sessions) should use `videoTracks` instead.
   *   bandwidthMbit: Video traffic received in mbits/s.
   *   totalBytesReceived: Total cumulated bytes received for the current session.
   *   fps: Current frames per second.
   *   decodeTime: Average time in ms to decode a frame.
   *   jitter: Total cumulated packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   avgJitterBufferDelay: Average variance in packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   packetsReceived: Total number of packets received.
   *   packetsLost: Total number of packets lost.
   * videoTracks: Statistics on every received video track, keyed by display id
   *   (0 for the primary display, 1+ for additional displays in multi video
   *   track sessions). Each entry has the same struct as `video` above.
   * network: Information about the network and WebRTC connections.
   *   currentRtt: Current round trip time in seconds.
   *   networkType: Type of network in use. (NOTE: It's deprecated to preserve the privacy) Can be one of the following:
   *       bluetooth: This connection uses bluetooth.
   *       celullar: The connection uses a cellular data service to connect. This includes all cellular data services including EDGE (2G), HSPA (3G), LTE (4G), and NR (5G).
   *       ethernet: This connection uses an ethernet network.
   *       wifi: This connection uses WiFi.
   *       wimax: This connection uses a Wimax network.
   *       vpn: This connection uses a VPN which obscures the underlying connection type.
   *       unknown: The user's browser is unable or unwilling to identify the underlying connection technology used by the described connection.
   *   transportType: Network protocol in use.
   *   localCandidateType: Type of the local client WebRTC candidate. Can be one of the following:
   *       host: Local client is accessible directly via IP.
   *       srflx: Local client is accessible behind NAT.
   *       prflx: Local client is accessible behind a symmetric NAT.
   *       relay: Traffic is relayed to the local client via a TURN server. Relayed traffic can induce poor performance.
   *   remoteCandidateType: Type of the remote peer (Anbox container) WebRTC candidate. Can be one of the following:
   *       host: Remote peer is accessed directly via IP.
   *       srflx: Remote peer is accessed behind NAT.
   *       prflx: Remote peer is accessed behind a symmetric NAT.
   *       relay: Traffic is relayed to the remote peer via a TURN server. Relayed traffic can induce poor performance.
   * audioInput: Statistics related to the audio sent to the Anbox container
   *   bandwidthMbit: Audio traffic sent in mbits/s
   *   totalBytesSent: Total cumulated bytes sent for audio for the current session.
   * audioOutput: Information on the received audio track.
   *   bandwidthMbit: Audio traffic received in mbits/s.
   *   totalBytesReceived: Total cumulated bytes received for the current session.
   *   jitter: Total cumulated packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   avgJitterBufferDelay: Average variance in packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   totalSamplesReceived: Total number of audio samples received for the current session.
   *   packetsReceived: Total number of packets received.
   *   packetsLost: Total number of packets lost.
   * rtcConfig: Information on the WebRTC connection
   *   bundlePolicy: Policy on how to negotiate tracks if the remote peer is not bundle aware. If bundle aware, all tracks are generated on the same transport. Can be one of the wing:
   *       balanced: Gather ICE candidates for each media type in use (audio, video, and data). If the remote endpoint is not bundle-aware, negotiate only one audio and video track on separate transports.
   *       max-compat: Gather ICE candidates for each track. If the remote endpoint is not bundle-aware, negotiate all media tracks on separate transports.
   *       max-bundle: Gather ICE candidates for only one track. If the remote endpoint is not bundle-aware, negotiate only one media track.
   *   rtcpMuxPolicy: affects what ICE candidates are gathered to support non-multiplexed RTCP. The only value "require".
   *   sdpSemantics: Describes which style of SDP offers and answers is used.
   *   iceTransportPolicy: Policy for accepting ICE candidates. Can be one of the following:
   *       all: Accept all candidates.
   *       relay: Only accept candidates whose IP are being relayed, such as via a TURN server.
   *   iceCandidatePoolSize: Size of the prefetched ICE candidate pool.
   */
  getStats() {
    return this._stats;
  }

  /**
   * Send a control message to the Android container
   * @param type {string} Message type
   * @param data {Object} Message content to be JSON serialized
   */
  sendControlMessage(type, data) {
    if (this._controlChan === null || this._controlChan.readyState !== "open") {
      return false;
    }
    this._controlChan.send(
      JSON.stringify({
        type: type,
        data: data,
      }),
    );
    return true;
  }

  /**
   * Send an out of band data message to the Android container
   * @param type {string} Channel name
   * @param data {Object} Data to transmit across the connection
   */
  sendData(channelName, data) {
    if (!(channelName in this._dataChans)) return false;

    if (
      this._dataChans[channelName] === null ||
      this._dataChans[channelName].readyState !== "open"
    )
      return false;

    this._dataChans[channelName].send(data);
    return true;
  }

  /**
   * Update the Canvas FPS measurement
   * NOTE: only use this when upscaling is enabled
   */
  updateCanvasFpsStats(fps, displayId = 0) {
    this._stats.experimental.canvas.displays[displayId] = fps;
    if (displayId === 0) this._stats.experimental.canvas.fps = fps;
  }

  onDiscoverMessageReceived(callback) {
    if (typeof callback === "function") this._discoverMsgReceived = callback;
  }

  /**
   * Register a new callback which is fired when VHAL prop configs are received
   * on the control channel. This replaces the previous callback.
   * @param callback {function} Function to use for the callback
   */
  onVhalPropConfigsReceived(callback) {
    if (typeof callback === "function")
      this._onVhalPropConfigsReceived = callback;
  }

  /**
   * Register a new callback which is fired when a VHAL get answer is received
   * on the control channel. This replaces the previous callback.
   * @param callback {function} Function to use for the callback
   */
  onVhalGetAnswerReceived(callback) {
    if (typeof callback === "function")
      this._onVhalGetAnswerReceived = callback;
  }

  /**
   * Register a new callback which is fired when a VHAL set answer is received
   * on the control channel. This replaces the previous callback.
   * @param callback {function} Function to use for the callback
   */
  onVhalSetAnswerReceived(callback) {
    if (typeof callback === "function")
      this._onVhalSetAnswerReceived = callback;
  }

  /**
   * Register a new callback which is fired when a sensor is activated
   * on the control channel. This replaces the previous callback.
   * @param callback {function} Function to use for the callback
   */
  onSensorActivated(callback) {
    if (typeof callback === "function") this._onSensorActivated = callback;
  }

  /**
   * Register a new callback which is fired when a sensor is deactivated
   * on the control channel. This replaces the previous callback.
   * @param callback {function} Function to use for the callback
   */
  onSensorDeactivated(callback) {
    if (typeof callback === "function") this._onSensorDeactivated = callback;
  }

  /**
   * Register a new callback which is fired when the control channel is open.
   * This replaces the previous callback.
   * @param callback {function} Function to use for the callback
   */
  onControlChannelOpen(callback) {
    if (typeof callback === "function") this._onControlChannelOpen = callback;
  }

  _log(msg) {
    if (!this._debugEnabled) return;
    const timeElapsed = performance.now() - this._startTimer;
    console.info(`Anbox SDK WebRTC [${Math.round(timeElapsed)}ms] : ${msg}`);
  }

  _logConnectionEvent(event) {
    this._onConnectionEventReceived({
      timestamp: Date.now(),
      ...event,
    });
  }

  _connectSignaler(url) {
    this._ws = new WebSocket(url);
    this._ws.onopen = this._onWsOpen.bind(this);
    this._ws.onerror = this._onWsError.bind(this);
    this._ws.onmessage = this._onWsMessage.bind(this);
  }

  _includeStunServers(stun_servers) {
    for (let n = 0; n < stun_servers.length; n++) {
      this._stunServers.push({
        urls: stun_servers[n].urls,
        username: stun_servers[n].username,
        credential: stun_servers[n].password,
      });
    }
  }

  _setupTransceivers() {
    let audio_direction = "inactive";
    if (this._stream.audio) {
      if (this._userMedia.speakers) {
        if (this._userMedia.mic) audio_direction = "sendrecv";
        else audio_direction = "recvonly";
      }
    }
    this._pc.addTransceiver("audio", {
      direction: audio_direction,
    });

    let video_direction = "inactive";
    if (this._stream.video) {
      video_direction = "recvonly";

      if (this._userMedia.camera) {
        this._pc.addTransceiver("video", {
          direction: "sendonly",
        });
      }
    }
    this._pc.addTransceiver("video", {
      direction: video_direction,
    });
  }

  _onWsOpen() {
    this._appliedRemoteDescription = false;
    this._pendingCandidates = [];

    const config = {
      iceServers: this._stunServers,
    };
    this._pc = new RTCPeerConnection(config);
    this._pc.ontrack = this._onRtcTrack.bind(this);
    this._pc.oniceconnectionstatechange =
      this._onRtcIceConnectionStateChange.bind(this);
    this._pc.onicecandidate = this._onRtcIceCandidate.bind(this);

    this._createControlChannel();

    this._createDataChannels();

    // We send a discover message first to find out what maximum API
    // version is supported by the server.
    var discoverMsg = {
      type: "discover",
    };
    this._ws.send(JSON.stringify(discoverMsg));
  }

  _sendSettings() {
    if (this._apiVersionInUse < 2) this._setupTransceivers();

    var settingsMsg = {
      type: "settings",
      // NOTE: The API version is used to synchronize between client and server on protocol
      // changes.
      api_version: this._apiVersionInUse,
    };

    if (this._apiVersionInUse >= 2) {
      // Starting with API version 2 we send the data channels as part of the settings message
      settingsMsg.data_channels = Object.keys(this._dataChannels);
      settingsMsg.enable_speaker =
        this._stream.audio && this._userMedia.speakers;
      settingsMsg.enable_microphone = this._stream.audio && this._userMedia.mic;
      settingsMsg.enable_video = this._stream.video;
      settingsMsg.enable_camera = this._stream.video && this._userMedia.camera;
    }

    if (this._deviceType.length > 0) settingsMsg.device_type = this._deviceType;

    if (this._foregroundActivity.length > 0)
      settingsMsg.foreground_activity = this._foregroundActivity;

    if (this._preferredVideoDecoderCodecs.length > 0)
      settingsMsg.video = {
        preferred_decoder_codecs: this._preferredVideoDecoderCodecs,
      };

    this._ws.send(JSON.stringify(settingsMsg));

    // NOTE: With API version 2 the server will send the offer message
    if (this._apiVersionInUse < 2) {
      this._log("creating offer");
      this._createOffer();
    }
  }

  _createControlChannel() {
    this._controlChan = this._pc.createDataChannel("control");
    this._controlChan.onopen = this._onControlChannelOpen;
    this._controlChan.onmessage = this._onControlMessageReceived.bind(this);
    this._controlChan.onerror = (err) => {
      if (this._controlChan !== null) {
        let code = ANBOX_STREAM_SDK_ERROR_WEBRTC_CONTROL_FAILED;
        switch (err?.error?.sctpCauseCode) {
          case SCP_CAUSE_CODE_USER_INITIATED_ABORT:
            code = ANBOX_STREAM_SDK_ERROR_WEBRTC_DISCONNECTED;
            break;
          default:
            break;
        }
        this._onError(`error on control channel: ${err?.error?.message}`, code);
      }
    };
    this._controlChan.onclose = () => this._log("control channel is closed");
  }

  _createDataChannels() {
    Object.keys(this._dataChannels).forEach((name) => {
      let channel = this._pc.createDataChannel(name);
      channel.onmessage = (event) =>
        this._dataChannels[name].callbacks.message(event.data);
      channel.onerror = (err) =>
        this._dataChannels[name].callbacks.error(err.error.message);
      channel.onclose = () => this._dataChannels[name].callbacks.close();
      channel.onopen = () => this._dataChannels[name].callbacks.open();
      this._dataChans[name] = channel;
    });
  }

  _onWsError(err) {
    this._onError(
      `failed to communicate with the signaler: ${
        err.message
          ? err.message
          : "There was an error with the websocket, check debug console for more information"
      }`,
      ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED,
    );
  }

  _applyPendingICECandiates() {
    let index = this._pendingCandidates.length;
    while (index--) {
      let candidate = this._pendingCandidates[index];
      this._addIceCandidate(candidate);
      this._pendingCandidates.splice(index, 1);
    }
  }

  _sendRtcAnswer() {
    this._createPlaceholderVideoStream();
    this._setupTransceivers();
    this._pc
      .createAnswer()
      .then((answer) => this._pc.setLocalDescription(answer))
      .then(() => {
        let msg = {
          type: "answer",
          sdp: btoa(this._pc.localDescription.sdp),
        };
        if (this._ws.readyState === 1) this._ws.send(JSON.stringify(msg));

        this._logConnectionEvent({
          type: "local_sdp:success",
          raw: msg,
        });

        this._applyPendingICECandiates();
      })
      .catch((err) => {
        this._logConnectionEvent({
          type: "local_sdp:error",
          error: `${err}`,
        });
        this._onError(
          `failed to create WebRTC answer: ${err}`,
          ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED,
        );
      });
  }

  _onWsMessage(event) {
    const msg = JSON.parse(event.data);
    this._logConnectionEvent({
      type: "signaling:received",
      raw: msg,
    });

    switch (msg.type) {
      case "resp:discover":
        this._discoverMsgReceived(msg);

        if (this._apiVersionInUse > msg.max_api_version) {
          this._onError(
            "API version not supported by server",
            ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
          );
          return;
        }

        this._sendSettings();
        break;
      case "offer":
      /* fallthrough */
      case "answer": {
        const sdp = atob(msg.sdp);
        this._log(`got RTC ${msg.type}:\n${sdp}`);
        this._pc
          .setRemoteDescription(
            new RTCSessionDescription({
              type: msg.type,
              sdp: sdp,
            }),
          )
          .then(() => {
            this._appliedRemoteDescription = true;

            if (msg.type == "offer") {
              this._sendRtcAnswer();
            } else {
              this._applyPendingICECandiates();
            }
          })
          .catch((err) => {
            this._onError(
              `failed to set remote description: ${err}`,
              ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED,
            );
          });
        break;
      }
      case "candidate": {
        if (this._appliedRemoteDescription) {
          this._addIceCandidate(msg);
        } else {
          this._pendingCandidates.push(msg);
        }
        break;
      }
      case "error": {
        this._log("got RTC error");
        this._onError(msg.message, ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED);
        break;
      }
      default:
        console.error("Unknown message type " + msg.type);
    }
  }

  _createPlaceholderVideoStream() {
    let placeholder_stream = this._createPlaceholderStream();
    if (placeholder_stream != null) {
      this._onVideoInputStreamAvailable(placeholder_stream);
    }
  }

  _createOffer() {
    this._createPlaceholderVideoStream();
    this._pc
      .createOffer()
      .then(this._onRtcOfferCreated.bind(this))
      .catch((err) => {
        this._onError(
          `failed to create WebRTC offer: ${err}`,
          ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED,
        );
      });
  }

  _addIceCandidate(msg) {
    const candidate = atob(msg.candidate);
    this._log(
      `got RTC candidate: ${candidate} (sdpMid=${msg.sdpMid}, sdpMLineIndex=${msg.sdpMLineIndex})`,
    );
    this._pc.addIceCandidate({
      candidate: candidate,
      sdpMLineIndex: msg.sdpMLineIndex,
      sdpMid: msg.sdpMid,
    });
  }

  _onRtcOfferCreated(description) {
    const sdp = description.sdp;
    this._log(`got RTC offer:\n${sdp}`);
    this._logConnectionEvent({
      type: "offer:created",
      sdpType: description.type,
      sdp: sdp,
    });
    this._pc.setLocalDescription(description);
    let msg = {
      type: "offer",
      sdp: btoa(sdp),
      dataChannels: Object.keys(this._dataChannels),
    };
    if (this._ws.readyState === 1) this._ws.send(JSON.stringify(msg));
  }

  _onControlMessageReceived(event) {
    this._log("control message received: " + event.data);

    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case "open-camera":
        if (this._allowAccessCamera || this._onCameraRequested()) {
          const spec = JSON.parse(msg.data);
          this._openCamera(spec);
        }
        break;

      case "close-camera":
        this._closeCamera();
        break;

      case "enable-microphone":
        if (this._allowAccessMicrophone || this._onMicRequested()) {
          const spec = JSON.parse(msg.data);
          this._enableMicrophone(spec);
        }
        break;

      case "disable-microphone":
        this._disableMicrophone();
        break;

      case "show-ime":
        this._onIMEStateChanged(true);
        break;

      case "hide-ime":
        this._onIMEStateChanged(false);
        break;

      case "vhal-prop-configs":
        this._onVhalPropConfigsReceived(JSON.parse(msg.data));
        break;

      case "vhal-get-answer":
        this._onVhalGetAnswerReceived(JSON.parse(msg.data));
        break;

      case "vhal-set-answer":
        this._onVhalSetAnswerReceived(JSON.parse(msg.data));
        break;

      case "activate-sensor": {
        const sensor = JSON.parse(msg.data);
        this._onSensorActivated(sensor.type);
        break;
      }

      case "deactivate-sensor": {
        const sensor = JSON.parse(msg.data);
        this._onSensorDeactivated(sensor.type);
        break;
      }

      default:
        this._onMessage(msg.type, msg.data);
    }
  }

  _onRtcTrack(event) {
    const kind = event.track.kind;
    if (kind === "video") {
      const displayId = this._displayIdFromTrackId(event.track.id);
      // Wrap the single track in its own MediaStream. All video tracks share
      // the same stream_id on the server side so event.streams[0] is the same
      // MediaStream object for every track. A per-track MediaStream guarantees
      // each video element renders its own display independently.
      const singleTrackStream = new MediaStream([event.track]);
      this._videoStreams[displayId] = singleTrackStream;

      if (displayId === 0) {
        this._videoStream = singleTrackStream;
        // Close the session when the primary display track ends while
        // for any other displays, just notify the consumer to detach only
        // this display when its track ends.
        event.track.onended = this._onClose;
      } else {
        // Notify AnboxStream to attach the new video track to a video container.
        this._onExtraVideoTrack(displayId, singleTrackStream);
        event.track.onended = () =>
          this._options.callbacks.videoTrackRemoved(displayId);
      }
    } else if (kind === "audio") {
      this._audioStream = event.streams[0];
      this._audioStream.onremovetrack = this._onClose;
    }

    const audioOnly = !this._stream.video && this._stream.audio;
    const videoOnly = this._stream.video && !this._stream.audio;
    // Do not fire ready callback until regarding tracks are available.
    if (
      (audioOnly && this._audioStream) ||
      (videoOnly && this._videoStream) ||
      (this._videoStream && (!this._userMedia.speakers || this._audioStream))
    ) {
      this._onReady(this._videoStream, this._audioStream);
      if (this._statsEnabled) this._startStatsUpdater();
    }
  }

  _onRtcIceConnectionStateChange() {
    if (this._pc === null) return;

    switch (this._pc.iceConnectionState) {
      case "failed":
        this._log("ICE failed");
        this._onError(
          "failed to establish a WebRTC connection via ICE",
          ANBOX_STREAM_SDK_ERROR_WEBRTC_FAILED,
        );
        break;

      case "disconnected":
        this._log("ICE disconnected");
        // When we end up here the connection may not have closed, but we
        // just have a temporary network problem. We wait for a moment and
        // if the connection isn't reestablished we stop streaming
        this._disconnectedTimeout = window.setTimeout(() => {
          this._onError(
            "lost WebRTC connection",
            ANBOX_STREAM_SDK_ERROR_WEBRTC_LOST_CONNECTION,
          );
        }, 10 * 1000);
        break;

      case "closed":
        this._log("ICE closed");
        if (this._signalingTimeout) {
          this._onError(
            "timed out to establish a WebRTC connection as signaler did not respond",
            ANBOX_STREAM_SDK_ERROR_SIGNALING_TIMEOUT,
          );
          return;
        }
        this._onClose();
        break;

      case "connected":
        this._log("ICE connected");
        window.clearTimeout(this._disconnectedTimeout);
        window.clearTimeout(this._signalingTimeout);
        this._ws.close();

        // When streaming with no audio and video, once the peer connection is
        // connected (where no track is going to be added to the peer connection),
        // instead of relying on RTCPeerConnection.ontrack callback function, we
        // should now fire the signal here to notify the caller that the stream is ready.
        if (!this._stream.video && !this._stream.audio) {
          this._onReady(this._videoStream, this._audioStream);
          if (this._statsEnabled) this._startStatsUpdater();
        }
        break;

      default:
        this._log(
          `received ICE connection state change: ${this._pc.iceConnectionState}`,
        );
        break;
    }
  }

  _onRtcIceCandidate(event) {
    if (event.candidate !== null && event.candidate.candidate !== "") {
      const msg = {
        type: "candidate",
        candidate: btoa(event.candidate.candidate),
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      };
      if (this._ws.readyState === 1) this._ws.send(JSON.stringify(msg));
    }
  }

  _createPlaceholderStream() {
    // Create a placeholder audio and video tracks before creating an offer
    // This enables pc connection to switch to real audio and video streams
    // captured from microphone and camera later when opening the those
    // devices without re-negotiation.
    let tracks = [];
    if (this._userMedia.camera) {
      let video_track = this._createPlaceholderVideoTrack();
      tracks.push(video_track);
    }
    if (this._userMedia.mic) {
      let audio_track = this._createPlaceholderAudioTrack();
      tracks.push(audio_track);
    }
    if (tracks.length === 0) return null;

    return new MediaStream(tracks);
  }

  _createPlaceholderAudioTrack() {
    let ctx = new AudioContext(),
      oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    return Object.assign(dst.stream.getAudioTracks()[0], {
      enabled: false,
    });
  }

  _createPlaceholderVideoTrack() {
    let canvas = Object.assign(document.createElement("canvas"), {
      width: 1,
      height: 1,
    });
    canvas.getContext("2d").fillRect(0, 0, 1, 1);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], {
      enabled: false,
    });
  }

  _onVideoInputStreamAvailable(stream) {
    this._videoInputStream = stream;
    this._videoInputStream
      .getTracks()
      .forEach((track) => this._pc.addTrack(track, stream));
  }

  _openCamera(spec) {
    const resolution = spec["resolution"];
    const facingMode = spec["facing-mode"] === "front" ? "user" : "environment";
    const frameRate = spec["frame-rate"];
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: resolution.width,
          height: resolution.height,
          facingMode: {
            ideal: facingMode,
          },
          frameRate: {
            max: frameRate,
          },
        },
      })
      .then(this._onRealVideoInputStreamAvailable.bind(this))
      .catch((e) => {
        this._onError(
          `failed to open camera: ${e.name}`,
          ANBOX_STREAM_SDK_ERROR_USER_MEDIA,
        );
      });
  }

  _onRealVideoInputStreamAvailable(stream) {
    // Replace the existing placeholder video stream with the real camera video stream
    const kind = stream.getVideoTracks()[0].kind;
    this._replaceTrack(stream, kind);
    this._videoInputStream = stream;
    this._allowAccessCamera = true;
  }

  _replaceTrack(stream, kind) {
    this._pc
      .getSenders()
      .filter((sender) => sender.track !== null && sender.track.kind === kind)
      .map((sender) => {
        return sender.replaceTrack(
          stream.getTracks().find((t) => t.kind === sender.track.kind),
        );
      });
  }

  _closeCamera() {
    if (this._videoInputStream)
      this._videoInputStream.getTracks().forEach((track) => track.stop());

    // Replace the real camera video stream with the placeholder video stream
    let stream = new MediaStream([this._createPlaceholderVideoTrack()]);
    stream.getTracks().forEach((track) => track.stop());
    const kind = stream.getVideoTracks()[0].kind;
    this._replaceTrack(stream, kind);
    this._videoInputStream = stream;
  }

  _enableMicrophone(spec) {
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          sampleRate: spec["freq"],
          channelCount: spec["channels"],
          samples: spec["samples"],
        },
        video: false,
      })
      .then(this._onRealAudioInputStreamAvailable.bind(this))
      .catch((e) => {
        this._onError(
          `failed to open microphone: ${e.name}`,
          ANBOX_STREAM_SDK_ERROR_USER_MEDIA,
        );
      });
  }

  _onRealAudioInputStreamAvailable(stream) {
    // Replace the existing placeholder video stream with the real audio input stream
    const kind = stream.getAudioTracks()[0].kind;
    this._replaceTrack(stream, kind);
    this._audioInputStream = stream;
    this._allowAccessMicrophone = true;
  }

  _disableMicrophone() {
    if (this._audioInputStream)
      this._audioInputStream.getTracks().forEach((track) => track.stop());

    // Replace the real audio stream captured from microphone with the placeholder stream
    let stream = new MediaStream([this._createPlaceholderAudioTrack()]);
    stream.getTracks().forEach((track) => track.stop());
    const kind = stream.getAudioTracks()[0].kind;
    this._replaceTrack(stream, kind);
    this._audioInputStream = stream;
  }

  _initVideoTrackStats() {
    return {
      bandwidthMbit: 0,
      totalBytesReceived: 0,
      fps: 0,
      decodeTime: 0,
      jitter: 0,
      avgJitterBufferDelay: 0,
      packetsReceived: 0,
      packetsLost: 0,
      framesDropped: 0,
      framesDecoded: 0,
      framesReceived: 0,
      keyFramesDecoded: 0,
      totalAssemblyTime: 0,
      pliCount: 0,
      firCount: 0,
      nackCount: 0,
      qpSum: 0,
      framesAssembledFromMultiplePackets: 0,
      codec: "",
    };
  }

  // The server assigns each video track the label "video_N" (where N is the
  // display id) when adding video transceiver. On client side, parsing it
  // here from MediaStreamTrack.id gives us the correct display id.
  // NOTE: older images use the legacy track name "video", hence treat
  // those as primary display for backward compatibility.
  _displayIdFromTrackId(trackId) {
    if (typeof trackId === "string") {
      const m = trackId.match(/^video_(\d+)$/);
      if (m) return parseInt(m[1], 10);
    }
    return 0;
  }

  _startStatsUpdater() {
    // _onRtcTrack is invoked once per additional video/audio track.
    // Guard against overlapping timers for multi-track sessions.
    window.clearInterval(this._statsTimerId);

    let pcConf = this._pc.getConfiguration();
    if (pcConf) {
      if ("sdpSemantics" in pcConf)
        this._stats.rtcConfig.sdpSemantics = pcConf.sdpSemantics;

      if ("rtcpMuxPolicy" in pcConf)
        this._stats.rtcConfig.rtcpMuxPolicy = pcConf.rtcpMuxPolicy;

      if ("bundlePolicy" in pcConf)
        this._stats.rtcConfig.bundlePolicy = pcConf.bundlePolicy;

      if ("iceTransportPolicy" in pcConf)
        this._stats.rtcConfig.iceTransportPolicy = pcConf.iceTransportPolicy;

      if ("iceCandidatePoolSize" in pcConf)
        this._stats.rtcConfig.iceCandidatePoolSize =
          pcConf.iceCandidatePoolSize;
    }

    this._statsTimerId = window.setInterval(() => {
      if (!this._pc) return;

      this._pc.getStats(null).then((rawStats) => {
        this._processRawStats(rawStats);
        this._onStatsUpdated(this._stats);
        if (this._showStatsOverlay) this._refreshStatsOverlay();
      });
    }, 1000);
  }

  _processRawStats(stats) {
    let bytes_to_mbits = (v, t) => {
      if (isNaN(t)) return 0;
      return (v * 8) / 1000 / 1000 / t;
    };

    stats.forEach((report) => {
      // mediaType is obsolete but kept for backward compatibility
      // https://www.w3.org/TR/webrtc-stats/#ref-for-dom-rtcrtpstreamstats-mediatype-1
      if (
        report.type === "inbound-rtp" &&
        (report.kind === "video" || report.mediaType === "video")
      ) {
        const displayId = this._displayIdFromTrackId(report.trackIdentifier);
        if (!(displayId in this._stats.videoTracks))
          this._stats.videoTracks[displayId] = this._initVideoTrackStats();
        let v = this._stats.videoTracks[displayId];
        v.fps = report.framesPerSecond;
        v.packetsLost = report.packetsLost;
        v.packetsReceived = report.packetsReceived;
        v.jitter = report.jitter;
        v.framesDropped = report.framesDropped;
        v.framesDecoded = report.framesDecoded;
        v.framesReceived = report.framesReceived;
        v.keyFramesDecoded = report.keyFramesDecoded;
        v.totalAssemblyTime = report.totalAssemblyTime;
        v.framesAssembledFromMultiplePackets =
          report.framesAssembledFromMultiplePackets;
        v.pliCount = report.pliCount;
        v.firCount = report.firCount;
        v.nackCount = report.nackCount;
        v.qpSum = report.qpSum;
        v.avgJitterBufferDelay =
          report.jitterBufferDelay / report.jitterBufferEmittedCount;
        v.totalBytesReceived = report.bytesReceived;
        this._video_codec_ids[displayId] = report.codecId;
        const lastReport = this._lastReport.videoTracks[displayId];
        const elapsedInSec = Math.round(
          (report.timestamp -
            (lastReport?.timestamp || report.timestamp - 1000)) /
            1000.0,
        );
        v.bandwidthMbit = bytes_to_mbits(
          report.bytesReceived - (lastReport?.bytesReceived || 0),
          elapsedInSec,
        );
        this._lastReport.videoTracks[displayId] = report;
        if (report.framesDecoded !== 0)
          v.decodeTime = report.totalDecodeTime / report.framesDecoded;
      } else if (
        report.type === "inbound-rtp" &&
        (report.kind === "audio" || report.mediaType === "audio")
      ) {
        let a = this._stats.audioOutput;
        a.totalSamplesReceived = report.totalSamplesReceived;
        a.packetsLost = report.packetsLost;
        a.packetsReceived = report.packetsReceived;
        a.jitter = report.jitter;
        this._audioOutput_codec_id = report.codecId;
        const elapsedInSec = Math.round(
          (report.timestamp -
            (this._lastReport.audioOutput?.timestamp ||
              report.timestamp - 1000)) /
            1000.0,
        );
        a.bandwidthMbit = bytes_to_mbits(
          report.bytesReceived -
            (this._lastReport.audioOutput?.bytesReceived || 0),
          elapsedInSec,
        );
        a.totalBytesReceived = report.bytesReceived;
        this._lastReport.audioOutput = report;
        if (report.jitterBufferEmittedCount !== 0)
          a.avgJitterBufferDelay =
            report.jitterBufferDelay / report.jitterBufferEmittedCount;
      } else if (
        report.type === "outbound-rtp" &&
        (report.kind === "audio" || report.mediaType === "audio")
      ) {
        let a = this._stats.audioInput;
        a.totalBytesSent = report.bytesSent;
        this._audioInput_codec_id = report.codecId;
        const elapsedInSec = Math.round(
          (report.timestamp -
            (this._lastReport.audioInput?.timestamp ||
              report.timestamp - 1000)) /
            1000.0,
        );
        a.bandwidthMbit = bytes_to_mbits(
          report.bytesSent - (this._lastReport.audioInput?.bytesSent || 0),
          elapsedInSec,
        );
        this._lastReport.audioInput = report;
      } else if (
        report.type === "candidate-pair" &&
        report.nominated &&
        report.state === "succeeded"
      ) {
        let n = this._stats.network;
        n.currentRtt = report.currentRoundTripTime;
        let network = this._stats.network;
        if (
          network.transportType === "" ||
          network.localCandidateType === "" ||
          network.remoteCandidateType === ""
        ) {
          stats.forEach((stat) => {
            if (stat.id === report.localCandidateId) {
              n.localCandidateType = stat.candidateType;
            }
            if (stat.id === report.remoteCandidateId) {
              n.remoteCandidateType = stat.candidateType;
              n.transportType = stat.protocol;
            }
          });
        }
      } else if (report.type === "codec") {
        const media_info = report.mimeType.split("/");
        if (media_info.length < 2) return;
        const [media_type, media_codec] = media_info;
        if (media_type == "video") {
          for (const displayId of Object.keys(this._video_codec_ids)) {
            if (report.id == this._video_codec_ids[displayId])
              this._stats.videoTracks[displayId].codec = media_codec;
          }
        }
        if (report.id == this._audioOutput_codec_id && media_type == "audio")
          this._stats.audioOutput.codec = media_codec;
        if (report.id == this._audioInput_codec_id && media_type == "audio")
          this._stats.audioInput.codec = media_codec;
      }
    });
  }

  _refreshStatsOverlay() {
    let overlay = document.getElementById(this._statsOverlayID + "_child");

    overlay.replaceChildren();
    const insertHeader = (title) => {
      let textNode = document.createTextNode(`${title}`);
      overlay.appendChild(textNode);

      let lineBreak = document.createElement("br");
      overlay.appendChild(lineBreak);
    };

    const insertStat = (type, value) => {
      let textNode = document.createTextNode(`    ${type}: ${value}`);
      overlay.appendChild(textNode);

      let lineBreak = document.createElement("br");
      overlay.appendChild(lineBreak);
    };

    const mbits_format = (v) => v.toFixed(2) + " Mbit/s";
    const mb_format = (v) => (v / 1000 / 1000).toFixed(2) + " MB";
    const ms_format = (v) => (v * 1000).toFixed(2) + " ms";
    const s_format = (v) => v.toFixed(2) + " s";

    insertHeader("RTC Configuration");
    if (this._stats.rtcConfig.sdpSemantics !== "")
      insertStat("sdpSemantics", this._stats.rtcConfig.sdpSemantics);
    if (this._stats.rtcConfig.rtcpMuxPolicy !== "")
      insertStat("rtcpMuxPolicy", this._stats.rtcConfig.rtcpMuxPolicy);
    if (this._stats.rtcConfig.bundlePolicy !== "")
      insertStat("bundlePolicy", this._stats.rtcConfig.bundlePolicy);
    if (this._stats.rtcConfig.iceTransportPolicy !== "")
      insertStat(
        "iceTransportPolicy",
        this._stats.rtcConfig.iceTransportPolicy,
      );
    if (this._stats.rtcConfig.iceCandidatePoolSize !== "")
      insertStat(
        "iceCandidatePoolSize",
        this._stats.rtcConfig.iceCandidatePoolSize,
      );

    insertHeader("Network");
    insertStat("currentRtt", ms_format(this._stats.network.currentRtt));
    insertStat("networkType", this._stats.network.networkType);
    insertStat("transportType", this._stats.network.transportType);
    insertStat("localCandidateType", this._stats.network.localCandidateType);
    insertStat("remoteCandidateType", this._stats.network.remoteCandidateType);

    // One section per received video track, sorted by display id
    // so the primary display always comes first.
    const displayIds = Object.keys(this._stats.videoTracks)
      .map(Number)
      .sort((a, b) => a - b);
    for (const displayId of displayIds) {
      const v = this._stats.videoTracks[displayId];
      insertHeader(`Video (display ${displayId})`);
      insertStat("codec", v.codec);
      insertStat("bandWidth", mbits_format(v.bandwidthMbit));
      insertStat("totalBytesReceived", mb_format(v.totalBytesReceived));
      insertStat("fps", v.fps);
      insertStat("decodeTime", ms_format(v.decodeTime));
      insertStat("jitter", ms_format(v.jitter));
      insertStat("avgJitterBufferDelay", ms_format(v.avgJitterBufferDelay));
      insertStat("packetsReceived", v.packetsReceived);
      insertStat("packetsLost", v.packetsLost);
      insertStat("framesDropped", v.framesDropped);
      insertStat("framesDecoded", v.framesDecoded);
      insertStat("framesReceived", v.framesReceived);
      insertStat("keyFramesDecoded", v.keyFramesDecoded);
      insertStat("totalAssemblyTime", s_format(v.totalAssemblyTime));
      insertStat(
        "framesAssembledFromMultiplePackets",
        v.framesAssembledFromMultiplePackets,
      );
      insertStat("pliCount", v.pliCount);
      insertStat("firCount", v.firCount);
      insertStat("nackCount", v.nackCount);
      insertStat("qpSum", v.qpSum);
    }

    insertHeader("Audio Output");
    insertStat("codec", this._stats.audioOutput.codec);
    insertStat(
      "bandWidth",
      mbits_format(this._stats.audioOutput.bandwidthMbit),
    );
    insertStat(
      "totalBytesReceived",
      mb_format(this._stats.audioOutput.totalBytesReceived),
    );
    insertStat(
      "totalSamplesReceived",
      this._stats.audioOutput.totalSamplesReceived,
    );
    insertStat("jitter", ms_format(this._stats.audioOutput.jitter));
    insertStat(
      "avgJitterBufferDelay",
      ms_format(this._stats.audioOutput.avgJitterBufferDelay),
    );
    insertStat("packetsReceived", this._stats.audioOutput.packetsReceived);
    insertStat("packetsLost", this._stats.audioOutput.packetsLost);

    const canvasFpsEntries = Object.entries(
      this._stats.experimental.canvas.displays,
    );
    if (canvasFpsEntries.length > 0) {
      insertHeader("Canvas");
      for (const [displayId, fps] of canvasFpsEntries) {
        insertStat(`fps (display ${displayId})`, fps);
      }
    }
  }
}

class AnboxStreamCanvas {
  _nullOrUndef(obj) {
    return obj === null || obj === undefined;
  }

  /**
   * AnboxStreamCanvas is used internally by AnboxStream only
   * for video streaming upscaling purpose.
   */
  constructor(options) {
    if (this._nullOrUndef(options)) throw Error("missing options");

    if (this._nullOrUndef(options.id)) {
      throw newError("missing canvas id", ANBOX_STREAM_SDK_ERROR_INTERNAL);
    }
    this._canvasID = options.id;

    if (this._nullOrUndef(options.video)) {
      throw newError("missing video element", ANBOX_STREAM_SDK_ERROR_INTERNAL);
    }
    this._video = options.video;

    if (this._nullOrUndef(options.useTargetFrameRate)) {
      throw newError(
        "missing frame rate option",
        ANBOX_STREAM_SDK_ERROR_INTERNAL,
      );
    }

    this._lastRenderTime = 0;
    this._lastSampleTime = 0;
    this._frameCount = 0;
    this._fpsMeasumentlTimerId = 0;
    this._fpsInterval = 1000 / 60;
    this._useTargetFrameRate = options.useTargetFrameRate;
    this._fragmentShaders = options.fragmentShaders;

    // Canvas
    this._refreshID = 0;
    this._frameCallbackID = 0;
    this._webgl = null;
    this._shaders = null;
    this._fbos = {};
    this._buffers = {};
    this._texture = null;
    this._enableblend = false;
  }

  initialize() {
    const canvas = document.createElement("canvas");
    canvas.style.margin = "0";
    canvas.style.position = "absolute";
    canvas.id = this._canvasID;

    const gl = canvas.getContext("webgl2");
    const shaders = this._loadShaders(gl);
    if (this._nullOrUndef(shaders) || shaders.length === 0) {
      throw newError("Failed to load shaders", ANBOX_STREAM_SDK_ERROR_INTERNAL);
    }
    this._shaders = shaders;
    for (const shader of this._shaders) {
      if (shader.uVideoSrc !== null) {
        this._enableblend = true;
        break;
      }
    }
    this._buffers = this._initializeBuffers(gl);

    this._webgl = gl;
    // WebGL specific: flips the source data along its vertical axis,
    // otherwise Y-axis is flipped.
    this._webgl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    return canvas;
  }

  startRendering() {
    this._prepare();

    // In case the efficient per-video-frame operation
    // 'requestVideoFrameCallback' is supported
    if (
      "requestVideoFrameCallback" in HTMLVideoElement.prototype &&
      !this._useTargetFrameRate
    ) {
      this._refreshOnCallback();
    } else {
      this._refreshOnInterval();
    }

    this._measureFps();
  }

  _prepare() {
    // Initialize texture and framebuffer only when video gets started
    // so that we know the exact dimension of video content, which can
    // be used to create texture.
    this._texture = this._initializeTexture(this._webgl);
    this._fbos = this._initializeFrameBuffers(this._webgl);
  }

  setTargetFps(fps) {
    if (!this._nullOrUndef(fps) && fps > 0) this._fpsInterval = 1000 / fps;
  }

  stop() {
    window.clearInterval(this._fpsMeasumentlTimerId);
    if (this._refreshID !== 0) {
      window.cancelAnimationFrame(this._refreshID);
      this._refreshID = 0;
    }
    if (this._frameCallbackID !== 0) {
      this._video.cancelVideoFrameCallback(this._frameCallbackID);
      this._frameCallbackID = 0;
    }

    this._webgl.deleteTexture(this._texture);
    this._webgl.deleteBuffer(this._buffers.vertices);
    this._webgl.deleteBuffer(this._buffers.indices);
    for (const shader of this._shaders) {
      this._webgl.deleteProgram(shader.program);
    }
    for (const buffer of this._fbos.buffers) {
      this._webgl.deleteFramebuffer(buffer);
    }
    for (const texture of this._fbos.textures) {
      this._webgl.deleteTexture(texture);
    }
  }

  resize(width, height) {
    const canvas = document.getElementById(this._canvasID);
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  onFpsMeasured(callback) {
    if (typeof callback === "function") this._fpsMeasured = callback;
  }

  _measureFps() {
    this._fpsMeasumentlTimerId = window.setInterval(() => {
      let now = performance.now();
      if (this._frameCount > 0) {
        let elapsed = now - this._lastSampleTime;
        const currentFps = ((this._frameCount / elapsed) * 1000).toFixed(2);
        if (!this._nullOrUndef(this._fpsMeasured))
          this._fpsMeasured(currentFps);

        this._frameCount = 0;
      }
      this._lastSampleTime = now;
    }, 1000);
  }

  _refreshOnCallback() {
    const refresh = () => {
      this._render(this._webgl);
      this._frameCallbackID = this._video.requestVideoFrameCallback(refresh);
    };
    this._frameCallbackID = this._video.requestVideoFrameCallback(refresh);
  }

  _refreshOnInterval(now) {
    this._refreshID = window.requestAnimationFrame(
      this._refreshOnInterval.bind(this),
    );

    let elapsed = now - this._lastRenderTime;
    if (elapsed > this._fpsInterval) {
      // In case the timing that the refresh callback get invoked
      // by the browser is not multiple of the fps interval.
      this._lastRenderTime = now - (elapsed % this._fpsInterval);
      this._render(this._webgl);
    }
  }

  _loadShaders(gl) {
    let shaders = [];
    if (
      this._nullOrUndef(this._fragmentShaders) ||
      this._fragmentShaders.length === 0
    ) {
      this._fragmentShaders = [_fsrShaderSource];
    }

    // Append the simple shader as the final fragment shader to draw
    // the texture on the canvas after all multi-pass shaders have been applied.
    this._fragmentShaders.push(_fragShaderSource);
    for (const index in this._fragmentShaders) {
      const shader = this._loadShader(
        gl,
        _vertexShaderSource,
        this._fragmentShaders[index],
      );
      shaders.push(shader);
    }

    return shaders;
  }

  _loadShader(gl, verShaderSource, fragShaderSource) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, _vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error(
        `failed to compile vertex shader: ${gl.getShaderInfoLog(vertexShader)}`,
      );
      return null;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error(
        `failed to compile fragment shader: ${gl.getShaderInfoLog(
          fragmentShader,
        )}`,
      );
      return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(`failed to link program: ${gl.getProgramInfoLog(program)}`);
      return null;
    }

    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      console.error(
        `failed to validate program: ${gl.getProgramInfoLog(program)}`,
      );
      return null;
    }

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return {
      program: program,
      uSampler: gl.getUniformLocation(program, "uSampler"),
      uVideoSrc: gl.getUniformLocation(program, "uVideoSrc"),
      uResolution: gl.getUniformLocation(program, "uResolution"),
      aVerPos: gl.getAttribLocation(program, "aVertexPos"),
      aTexCoord: gl.getAttribLocation(program, "aTextureCoord"),
    };
  }

  _initializeTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Create a dummy texture for the placeholder and update it later
    // by reading the video frame from the video element via gl.texImage2D
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
  }

  _initializeFrameBuffers(gl) {
    // Initialize two textures, which are attached to framebuffers
    // and used as sources for applying multi-pass shaders.
    let textures = [];
    let framebuffers = [];
    const numBufs = 2;
    for (let i = 0; i < numBufs; ++i) {
      const tex = this._initializeTexture(gl);
      textures.push(tex);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0,
      );
      framebuffers.push(fbo);
    }

    return {
      buffers: framebuffers,
      textures: textures,
    };
  }

  _initializeBuffers(gl) {
    // Create the vertex buffer
    // Disable the ESLint rule for better readability
    /* eslint-disable */
    const vertices = [
      // position  // texture coordinate
      -1.0, 1.0,   0.0, 1.0,
      -1.0, -1.0,  0.0, 0.0,
      1.0,  -1.0,  1.0, 0.0,
      1.0,  1.0,   1.0, 1.0,
    ];
    /* eslint-enable */

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Create the index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    const indices = [0, 1, 2, 0, 2, 3];
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW,
    );

    return {
      vertices: vertexBuffer,
      indices: indexBuffer,
    };
  }

  _render(gl) {
    // Only enable blend when required
    if (this._enableblend) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    // Update viewport in case that the window resize happens
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Clear the fbos which are used for th post-processing
    for (const buffer of this._fbos.buffers) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    gl.bindTexture(gl.TEXTURE_2D, this._texture);

    // Use the video frame as the texture source for the first
    // draw call before applying filters.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this._video,
    );

    // Update viewport in case that the window resize happens
    for (let i = 0; i < this._shaders.length; i++) {
      const shader = this._shaders[i];
      const index = i % 2;
      if (i === this._shaders.length - 1) {
        // Draw the texture onto the screen if the last shader is in use.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        // Draw the texture onto framebuffers as the sources for the post-processing.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbos.buffers[index]);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.vertices);

      gl.vertexAttribPointer(
        shader.aVerPos,
        2,
        gl.FLOAT,
        gl.FALSE,
        4 * Float32Array.BYTES_PER_ELEMENT,
        0,
      );
      gl.enableVertexAttribArray(shader.aVerPos);

      gl.vertexAttribPointer(
        shader.aTexCoord,
        2,
        gl.FLOAT,
        gl.FALSE,
        4 * Float32Array.BYTES_PER_ELEMENT,
        2 * Float32Array.BYTES_PER_ELEMENT, // offset for texture coordinate in vertices
      );
      gl.enableVertexAttribArray(shader.aTexCoord);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffers.indices);

      gl.useProgram(shader.program);
      gl.uniform1i(shader.uSampler, 0);
      gl.uniform2f(shader.uResolution, gl.canvas.width, gl.canvas.height);

      if (shader.uVideoSrc !== null) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        gl.uniform1i(shader.uVideoSrc, 1);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      // Swap the texture as the source for the next draw.
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this._fbos.textures[index]);
    }

    this._frameCount++;
  }
}

class AnboxStreamGatewayConnector {
  _nullOrUndef(obj) {
    return obj === null || obj === undefined;
  }

  /**
   * Connector for the Anbox Stream Gateway. If no connector is specified for
   * the SDK, this connector will be used by default.
   * @param options {object}
   * @param options.url {string} URL to the Stream Gateway. Must use http or https scheme
   * @param options.authToken {string} Authentication token for the Stream Gateway
   * @param options.session {object} Details about the session to create
   * @param [options.session.region=""] {string} Where the session will be created. If
   *        empty, the gateway will try to determine the best region based on user IP
   * @param [options.session.id] {string} If specified, try to join the instance rather than
   *        creating a new one
   * @param [options.session.app] {string} Application name to run. If a sessionID is specified
   *        this field is ignored
   * @param [options.session.app_version=-1] {number} Specific version of the application to run.
   *        If it's not specified, the latest published application version will be in use for a
   *        session creation.
   * @param [options.session.joinable] {boolean} If set to true, the session is joinable after the
   *        current user disconnected. The session stays alive for 30 minutes afterwards if not
   *        joined again. If false, the session will be automatically terminated after the user
   *        disconnected.
   * @param [options.session.idle_time_min] {number} Idle time of the container in
   *        minutes. If set to zero, the session will be kept active until terminated.
   * @param options.screen {object} Display settings for the Android instance to create
   * @param [options.screen.width=1280] {number} Screen width in pixel
   * @param [options.screen.height=720] {number} Screen height in pixel
   * @param [options.screen.fps=60] {number} Desired number of frames per second
   * @param [options.screen.density=240] {number} Pixel density
   * @param options.extraData {string} Json format extra data for a session creation. (optional)
   */
  constructor(options) {
    if (this._nullOrUndef(options)) throw Error("missing options");

    if (this._nullOrUndef(options.url))
      throw newError(
        "missing url parameter",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );

    if (!options.url.includes("https") && !options.url.includes("http"))
      throw newError(
        "unsupported scheme",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    else if (options.url.endsWith("/")) options.url = options.url.slice(0, -1);

    if (this._nullOrUndef(options.authToken))
      throw newError(
        "missing authToken parameter",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );

    if (this._nullOrUndef(options.session)) options.session = {};

    if (this._nullOrUndef(options.session.region)) options.session.region = "";

    if (
      this._nullOrUndef(options.session.id) &&
      this._nullOrUndef(options.session.app)
    ) {
      throw newError(
        "session.app or session.id required",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    if (this._nullOrUndef(options.session.joinable))
      options.session.joinable = false;

    // Display settings
    if (this._nullOrUndef(options.screen)) options.screen = {};

    if (this._nullOrUndef(options.screen.width)) options.screen.width = 1280;

    if (this._nullOrUndef(options.screen.height)) options.screen.height = 720;

    if (this._nullOrUndef(options.screen.fps)) options.screen.fps = 60;

    if (this._nullOrUndef(options.screen.density)) options.screen.density = 240;

    if (this._nullOrUndef(options.extraData) || options.extraData.length === 0)
      options.extraData = "null";

    this._options = options;
  }

  async connect() {
    if (this._nullOrUndef(this._options.session.id)) {
      return await this._createSession();
    } else {
      return await this._joinSession();
    }
  }

  async _createSession() {
    try {
      var extra_data_obj = JSON.parse(this._options.extraData);
    } catch (e) {
      throw newError(
        `invalid json format extra data was given: ${e.name}`,
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    const appInfo = {
      app: this._options.session.app,
      region: this._options.session.region,
      joinable: this._options.session.joinable,
      screen: {
        width: this._options.screen.width,
        height: this._options.screen.height,
        fps: this._options.screen.fps,
        density: this._options.screen.density,
      },
      extra_data: extra_data_obj,
    };

    if (!this._nullOrUndef(this._options.session.idle_time_min))
      appInfo["idle_time_min"] = this._options.session.idle_time_min;

    if (
      !this._nullOrUndef(this._options.session.app_version) &&
      this._options.session.app_version.length !== 0
    )
      appInfo["app_version"] = this._options.session.app_version;

    const rawResp = await fetch(this._options.url + "/1.0/sessions/", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        Authorization: "Macaroon root=" + this._options.authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appInfo),
    });
    if (rawResp === undefined || rawResp.status !== 201)
      throw newError(
        "failed to create session",
        ANBOX_STREAM_SDK_ERROR_SESSION_FAILED,
      );

    const response = await rawResp.json();
    if (response === undefined || response.status !== "success")
      throw newError(response.error, ANBOX_STREAM_SDK_ERROR_SESSION_FAILED);

    return {
      id: response.metadata.id,
      websocket: response.metadata.url,
      stunServers: response.metadata.stun_servers,
    };
  }

  async _joinSession() {
    const joinInfo = {
      screen: {
        width: this._options.screen.width,
        height: this._options.screen.height,
      },
    };
    const rawJoinResp = await fetch(
      this._options.url + "/1.0/sessions/" + this._options.session.id + "/join",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          Authorization: "Macaroon root=" + this._options.authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(joinInfo),
      },
    );
    if (rawJoinResp === undefined || rawJoinResp.status !== 200)
      throw newError(
        "Session does not exist anymore",
        ANBOX_STREAM_SDK_ERROR_SESSION_FAILED,
      );

    let response = await rawJoinResp.json();
    if (response === undefined || response.status !== "success")
      throw newError(response.error, ANBOX_STREAM_SDK_ERROR_SESSION_FAILED);

    return {
      id: this._options.session.id,
      websocket: response.metadata.url,
      stunServers: response.metadata.stun_servers,
    };
  }

  // no-op
  disconnect() {}
}

class AnboxVhalManager {
  _nullOrUndef(obj) {
    return obj === null || obj === undefined;
  }

  /**
   * Emulate Promise.withResolvers() if not available.
   * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
   */
  _promiseWithResolvers() {
    if (typeof Promise.withResolvers === "function")
      return Promise.withResolvers();
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise: promise, resolve: resolve, reject: reject };
  }

  /**
   * Constructor to initialize a new instance of the AnboxVhalManager which is
   * responsible to communicate with an Android VHAL.
   * @param webrtcManager {object} Anbox WebRTCManager object.
   * @param vhalReady {function} Callback to notify subscribers that VHAL is ready.
   * @param [timeout=5000] {number} How long to wait for an answer for the VHAL calls (in milliseconds).
   */
  constructor(webrtcManager, vhalReady = () => {}, timeout = 5000) {
    this._webrtcManager = webrtcManager;
    this._vhalReady = vhalReady;
    this._timeout = timeout;
    this._waitingRequestsGet = [];
    this._waitingRequestsSet = [];

    if (this._webrtcManager._isControlChannelOpen) {
      this._webrtcManager.sendControlMessage("vhal::get-all-prop-configs");
    }
  }

  /**
   * VHAL get call for multiple properties.
   * @param properties {array} Array of objects, see below.
   * @param properties.prop {Number} Property ID
   * @param properties.area_id {Number} Area ID
   * @param properties.int32_values {Array} Array of integers: required only for some properties.
   * @param properties.float_values {Array} Array of floats: required only for some properties.
   * @param properties.int64_values {Array} Array of integers: required only for some properties.
   * @param properties.bytes {Array} Raw bytes value as array of integers: required only for some properties.
   * @param properties.string_value {string} String value: required only for some properties.
   */
  async get(properties) {
    return this._getOrSet("get", properties);
  }

  /**
   * VHAL set call for multiple property values.
   * At least one of int32_values, float_values, int64_values, bytes or
   * string_value must be provided.
   * @param properties {array} Array of objects, see below.
   * @param properties.prop {Number} Property ID
   * @param properties.area_id {Number} Area ID
   * @param properties.status {Number} Property status
   * @param properties.int32_values {Array} Array of integers
   * @param properties.float_values {Array} Array of floats
   * @param properties.int64_values {Array} Array of integers
   * @param properties.bytes {Array} Raw bytes value as array of integers
   * @param properties.string_value {string} String value
   */
  async set(properties) {
    return this._getOrSet("set", properties);
  }

  /**
   * Get VHAL property configs for the requested property IDs.
   * Returns a copy of the stored configurations.
   * @param props {Array} Array of property IDs.
   */
  getPropConfigs(props) {
    if (this._nullOrUndef(this._configStore)) return [];
    const arr = [];
    for (const prop of props) {
      const config = this._configStore.get(prop);
      if (config != null) arr.push(JSON.parse(JSON.stringify(config)));
    }
    return arr;
  }

  /**
   * Get all VHAL property configs.
   * Returns a copy of the stored configurations.
   */
  getAllPropConfigs() {
    if (this._nullOrUndef(this._configStore)) return [];
    // Deep copy of the config store values
    return JSON.parse(JSON.stringify(Array.from(this._configStore.values())));
  }

  /**
   * Helper function for sending a get or set command.
   * @param command {string} Command name. Must be lowercase 'set' or 'get'.
   * @param properties {array} Array of objects, see get or set.
   */
  async _getOrSet(command, properties) {
    // Validate properties array
    if (!properties.every((property) => property.prop != null))
      throw newError(
        "must provide property ID for all properties",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );

    const timeout = new Promise((_r, reject) => {
      setTimeout(
        () =>
          reject(
            newError(`timeout while waiting for answer to ${command} request`),
            ANBOX_STREAM_SDK_ERROR_TIMEOUT,
          ),
        this._timeout,
      );
    });

    const promises = [];
    for (const property of properties) {
      promises.push(this._getOrSetSingle(command, property));
    }

    const promise = Promise.all(promises);
    return Promise.race([promise, timeout]);
  }

  /**
   * Helper function for sending a single get or set command.
   * We need this while Anbox does not have support for multi get/multi set.
   * @param command {string} Command name. Must be lowercase 'set' or 'get'.
   * @param properties {Object} See get or set for the fields.
   */
  async _getOrSetSingle(command, property) {
    const promise = this._promiseWithResolvers();
    const titleCaseCommand =
      command.charAt(0).toUpperCase() + command.substring(1);
    const queueName = `_waitingRequests${titleCaseCommand}`;
    this[queueName].push(promise);

    this._sendRequest(command, property);
    return promise.promise;
  }

  /**
   * Helper function for sending a VHAL command.
   * @param command {string} Command name. Must be lowercase 'set' or 'get'.
   * @param data {object} Data to send through the channel.
   */
  _sendRequest(command, data) {
    if (!this._webrtcManager.sendControlMessage(`vhal::${command}`, data))
      throw newError(
        `error when sending ${command} call through control channel`,
        ANBOX_STREAM_SDK_ERROR_WEBRTC_CONTROL_FAILED,
      );
  }

  onVhalPropConfigsReceived(propConfigs) {
    const firstReceipt =
      this._nullOrUndef(this._configStore) || this._configStore.size === 0;
    this._configStore = new Map(
      propConfigs.map((config) => [config.prop, config]),
    );
    if (firstReceipt && this._configStore.size > 0) this._vhalReady();
  }

  onVhalGetAnswerReceived(getAnswer) {
    this._waitingRequestsGet.shift()?.resolve(getAnswer);
  }

  onVhalSetAnswerReceived(setAnswer) {
    this._waitingRequestsSet.shift()?.resolve(setAnswer);
  }

  hasConfigs() {
    return !this._nullOrUndef(this._configStore) && this._configStore.size > 0;
  }
}

class AnboxSensorManager {
  /**
   * AnboxSensorManager collects device sensor data and delivers it to the Anbox container
   */
  constructor(options = {}) {
    let updateInterval =
      options.updateInterval ?? DEFAULT_SENSOR_DATA_UPDATE_INTERVAL;
    if (typeof updateInterval !== "number") {
      throw newError(
        `sensor update interval is invalid`,
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    if (updateInterval < MINIMAL_SENSOR_DATA_UPDATE_INTERVAL) {
      throw newError(
        `update interval ${updateInterval}ms is less than the minimum of ${MINIMAL_SENSOR_DATA_UPDATE_INTERVAL}ms`,
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT,
      );
    }

    this._options = {
      webrtcManager: options.webrtcManager,
      updateInterval: updateInterval,
      enableOrientation: options.enableOrientation,
      enableAccelerometer: options.enableAccelerometer,
      enableGyroscope: options.enableGyroscope,
    };

    this._lastUpdateTime = 0;
    this._activeSensors = new Set();

    this.sensorData = {
      orientation: null,
      acceleration: null,
      gyroscope: null,
    };

    this._onDeviceOrientation = this._onDeviceOrientation.bind(this);
    this._onDeviceMotion = this._onDeviceMotion.bind(this);
    this._onSensorDataUpdate = this._onSensorDataUpdate.bind(this);
  }

  /**
   * Stop capturing sensor data
   */
  stop() {
    for (const sensor of Array.from(this._activeSensors)) {
      this.onSensorDeactivated(sensor);
    }

    this._activeSensors.clear();
  }

  onSensorActivated(sensor) {
    if (!this._options.webrtcManager) return;
    if (this._activeSensors.has(sensor)) return;

    switch (sensor) {
      case "orientation":
        if (!this._options.enableOrientation) return;

        if (!window.DeviceOrientationEvent) {
          console.warn("Orientation sensor not supported on this device");
          return;
        }

        this._activeSensors.add(sensor);
        this.sensorData.orientation = {
          roll: null,
          pitch: null,
          azimuth: null,
        };
        window.addEventListener(
          "deviceorientation",
          this._onDeviceOrientation,
          false,
        );
        break;

      case "acceleration":
        if (!this._options.enableAccelerometer) return;

        if (!window.DeviceMotionEvent) {
          console.warn("Motion sensors not supported on this device");
          return;
        }

        this._activeSensors.add(sensor);
        this.sensorData.acceleration = { x: null, y: null, z: null };

        if (!this._activeSensors.has("gyroscope")) {
          window.addEventListener("devicemotion", this._onDeviceMotion, false);
        }
        break;
      case "gyroscope":
        if (!this._options.enableGyroscope) return;

        if (!window.DeviceMotionEvent) {
          console.warn("Motion sensors not supported on this device");
          return;
        }

        this._activeSensors.add(sensor);
        this.sensorData.gyroscope = { x: null, y: null, z: null };

        if (!this._activeSensors.has("acceleration")) {
          window.addEventListener("devicemotion", this._onDeviceMotion, false);
        }
        break;
      default:
        console.warn(`Unsupported sensor type: ${sensor}`);
    }
  }

  onSensorDeactivated(sensor) {
    if (!this._activeSensors.has(sensor)) return;

    switch (sensor) {
      case "orientation":
        this._activeSensors.delete(sensor);
        window.removeEventListener(
          "deviceorientation",
          this._onDeviceOrientation,
          false,
        );
        this.sensorData.orientation = null;
        break;
      case "acceleration":
      case "gyroscope":
        this._activeSensors.delete(sensor);
        if (sensor === "acceleration") this.sensorData.acceleration = null;
        if (sensor === "gyroscope") this.sensorData.gyroscope = null;

        // Remove the event listener only when both sensors are deactivated.
        if (
          !this._activeSensors.has("acceleration") &&
          !this._activeSensors.has("gyroscope")
        ) {
          window.removeEventListener(
            "devicemotion",
            this._onDeviceMotion,
            false,
          );
        }
        break;
      default:
        console.warn(`Unsupported sensor type: ${sensor}`);
    }
  }

  _onDeviceOrientation(event) {
    const o = this.sensorData.orientation;
    const roll = event.beta;
    const pitch = event.gamma;
    const azimuth = event.alpha;

    if (
      _fuzzyCompare(o.roll, roll) &&
      _fuzzyCompare(o.pitch, pitch) &&
      _fuzzyCompare(o.azimuth, azimuth)
    )
      return;

    o.roll = roll;
    o.pitch = pitch;
    o.azimuth = azimuth;

    this._onSensorDataUpdate();
  }

  _onDeviceMotion(event) {
    let dataChanged = false;

    // Prefer using accelerationIncludingGravity, which includes the effect of gravity,
    // fallback to acceleration if it's not available
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (this.sensorData.acceleration && acc) {
      const a = this.sensorData.acceleration;
      if (
        !_fuzzyCompare(a.x, acc.x) ||
        !_fuzzyCompare(a.y, acc.y) ||
        !_fuzzyCompare(a.z, acc.z)
      ) {
        a.x = acc.x;
        a.y = acc.y;
        a.z = acc.z;
        dataChanged = true;
      }
    }

    const rot = event.rotationRate;
    if (this.sensorData.gyroscope && rot) {
      const g = this.sensorData.gyroscope;
      if (
        !_fuzzyCompare(g.x, rot.beta) ||
        !_fuzzyCompare(g.y, rot.gamma) ||
        !_fuzzyCompare(g.z, rot.alpha)
      ) {
        g.x = rot.beta;
        g.y = rot.gamma;
        g.z = rot.alpha;
        dataChanged = true;
      }
    }

    if (dataChanged) this._onSensorDataUpdate();
  }

  _onSensorDataUpdate() {
    // Throttle sensor data updates to avoid sending data too frequently,
    // which could affect overall data transmission over the data channel
    // and further negatively impact the Android container.
    const now = Date.now();
    if (now - this._lastUpdateTime < this._options.updateInterval) return;

    this._lastUpdateTime = now;

    if (this._options.enableOrientation && this.sensorData.orientation) {
      const data = {
        sensor: "orientation",
        ...this.sensorData.orientation,
      };

      // NOTE: due to legacy reasons, a single column in the data type
      // is used as a unique identifier for sensor event.
      this._options.webrtcManager.sendControlMessage("sensor:event", data);
    }
    if (this._options.enableAccelerometer && this.sensorData.acceleration) {
      const data = {
        sensor: "acceleration",
        ...this.sensorData.acceleration,
      };
      this._options.webrtcManager.sendControlMessage("sensor:event", data);
    }
    if (this._options.enableGyroscope && this.sensorData.gyroscope) {
      const data = {
        sensor: "gyroscope",
        ...this.sensorData.gyroscope,
      };
      this._options.webrtcManager.sendControlMessage("sensor:event", data);
    }
  }
}

window.AnboxStreamGatewayConnector = AnboxStreamGatewayConnector;
window.AnboxStream = AnboxStream;
export { AnboxStreamGatewayConnector, AnboxStream };
