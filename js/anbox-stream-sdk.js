/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Version: 1.21.0
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

function newError(msg, code) {
  var options = {
    cause: {
      code: ANBOX_STREAM_SDK_ERROR_UNKNOWN,
    },
  };

  if (Number.isInteger(code)) options.cause.code = code;

  return new Error(msg, options);
}

class AnboxStream {
  /**
   * AnboxStream creates a connection between your client and an Android instance and
   * displays its video & audio feed in an HTML5 player
   * @param options: {object}
   * @param options.connector {object} WebRTC Stream connector.
   * @param options.targetElement {string} ID of the DOM element to attach the video to.
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
   * @param [options.controls] {object} Configuration how the client can interact with the stream.
   * @param [options.controls.keyboard=true] {boolean} Send key presses to the Android instance.
   * @param [options.controls.emulateTouch=false] {boolean} Emulate touchscreen by converting mouse inputs to touch inputs
   * @param [options.controls.mouse=true] {boolean} Send mouse events to the Android instance.
   * @param [options.controls.gamepad=true] {boolean} Send gamepad events to the Android instance.
   * @param [options.foregroundActivity] {string} Activity to be displayed in the foreground. NOTE: it only works with an application that has APK provided on its creation.
   * @param [options.callbacks] {object} A list of callbacks to react on stream lifecycle events.
   * @param [options.callbacks.ready=none] {function} Called when the video and audio stream are ready to be inserted in the DOM.
   * @param [options.callbacks.error=none] {function} Called on stream error with the message as parameter.
   * @param [options.callbacks.done=none] {function} Called when the stream is closed.
   * @param [options.callbacks.messageReceived=none] {function} Called when a message is received from Anbox.
   * @param [options.callbacks.statsUpdated=none] {function} Called when the overall webrtc peer connection statistics are updated.
   * @param [options.callbacks.requestCameraAccess=none] {function} Called when Android application tries to open camera device for video streaming.
   * @param [options.callbacks.requestMicrophoneAccess=none] {function} Called when Android application tries to open microphone device for video streaming.
   * @param [options.callbacks.vhalReady=none] {function} Called when the VHAL manager has been initialised.
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
   * @param [options.experimental.upscaling.enabled=false] {boolean} Enable upscaling for video streaming on the client side. Currently, the upscaling relies on AMD FidelityFX Super Resolution 1.0 (FSR).
   * @param [options.experimental.upscaling.fragmentShader] {string} Use a custom fragment shader source for upscaling instead of the default one, which is based on AMD FidelityFX Super Resolution 1.0 (FSR).
   * @param [options.experimental.upscaling.useTargetFrameRate=false] {boolean} Use target refresh frame rate for the canvas when rendering video frames rather than relying on HTMLVideoElement.requestVideoFrameCallback() function even if it's supported by the browser due to the fact that the callback can occasionally be fired one v-sync late.
   * @param [options.experimental.debug=false] {boolean} Print debug logs
   * @param [options.experimental.pointerLock=false] {boolean} Pointer lock provides input events based on the movement of the mouse over time, not the absolute position. If enabled, the mouse will be locked to the stream view.
   */
  constructor(options) {
    if (this._nullOrUndef(options)) {
      throw newError(
        "missing options",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }

    this._fillDefaults(options);
    this._validateOptions(options);
    this._options = options;

    if (!this._options.experimental.disableBrowserBlock)
      this._detectUnsupportedBrowser();

    this._id = Math.random().toString(36).substr(2, 9);
    this._containerID = options.targetElement;
    this._videoID = "anbox-stream-video-" + this._id;
    this._audioID = "anbox-stream-audio-" + this._id;
    this._canvasID = "anbox-stream-canvas-" + this._id;

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
        overlayID: this._containerID,
        enable: this._options.enableStats,
      },
      debug: this._options.experimental.debug,
      preferredVideoDecoderCodecs: this._options.video.preferred_decoder_codecs,
    });
    this._webrtcManager.onReady(this._webrtcReady.bind(this));
    this._webrtcManager.onError((err) => {
      this._stopStreamingOnError(err.message, err.cause.code);
    });
    this._webrtcManager.onClose(this._stopStreaming.bind(this));
    this._webrtcManager.onStatsUpdated(this._options.callbacks.statsUpdated);
    this._webrtcManager.onMessage(this._options.callbacks.messageReceived);
    this._webrtcManager.onCameraRequested(
      this._options.callbacks.requestCameraAccess
    );
    this._webrtcManager.onMicrophoneRequested(
      this._options.callbacks.requestMicrophoneAccess
    );
    this._webrtcManager.onIMEStateChanged(this._IMEStateChanged.bind(this));
    this._webrtcManager.onDiscoverMessageReceived((msg) => {
      if (this._streamCanvas) this._streamCanvas.setTargetFps(msg.fps);
      if (msg.capabilities?.includes?.("vhal")) {
        this._vhalManager = new AnboxVhalManager(this._webrtcManager);
        this._webrtcManager.onVhalPropConfigsReceived(
          this._vhalManager.onVhalPropConfigsReceived.bind(this._vhalManager)
        );
        this._webrtcManager.onVhalGetAnswerReceived(
          this._vhalManager.onVhalGetAnswerReceived.bind(this._vhalManager)
        );
        this._webrtcManager.onVhalSetAnswerReceived(
          this._vhalManager.onVhalSetAnswerReceived.bind(this._vhalManager)
        );
        this._options.callbacks.vhalReady();
      }
    });
    this._webrtcManager.onControlChannelOpen(() => {
      if (this._nullOrUndef(this._vhalManager)) return;
      // Request all vhal prop configs from the server to populate the vhal
      // manager cache
      this._webrtcManager.sendControlMessage("vhal::get-all-prop-configs");
    });

    // Control options
    this._modifierState = 0;
    this._dimensions = null;
    this._gamepadManager = null;
    this._streamCanvas = null;

    this._originalOrientation = null;
    this._currentRotation = 0;
    this._primaryTouchId = 0;
    this._pointersOutofBounds = {};
    this._activeTouchPointers = [];
    this._pointerIdsMapper = {};

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
    if (this._options.fullScreen) this._requestFullscreen();

    let session = {};
    try {
      // Create media in the try-catch block in case of an exception being thrown
      this._createMedia();
      session = await this._options.connector.connect();
    } catch (e) {
      this._stopStreamingOnError(
        "connector failed to connect: " + e.message,
        ANBOX_STREAM_SDK_ERROR_CONNECTOR_FAILED
      );
      return;
    }

    try {
      this._webrtcManager.start(session);
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
   * Toggle fullscreen for the streamed video.
   *
   * IMPORTANT: fullscreen can only be toggled following a user input.
   * If you call this method when your page loads, it will not work.
   */
  _requestFullscreen() {
    if (!document.fullscreenEnabled) {
      console.error("fullscreen not supported");
      return;
    }
    const fullscreenExited = () => {
      if (document.fullscreenElement === null) {
        const video = document.getElementById(this._videoID);
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
    const videoContainer = document.getElementById(this._containerID);
    if (videoContainer.requestFullscreen) {
      videoContainer.requestFullscreen().catch((err) => {
        console.log(
          `Failed to enter full-screen mode: ${err.message} (${err.name})`
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
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }

    if (
      !this._nullOrUndef(update.format) &&
      update.format !== "nmea" &&
      update.format !== "wgs84"
    ) {
      throw newError(
        "invalid gps data format",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }

    return this._webrtcManager.sendControlMessage(
      "location::update-position",
      update
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
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED
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
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED
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
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED
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
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED
      );
    return this._vhalManager.getAllPropConfigs();
  }

  /**
   * Check if the VHAL functions are supported and available.
   * Returns true if VHAL is supported and available, false otherwise.
   */
  isVhalAvailable() {
    return !this._nullOrUndef(this._vhalManager);
  }

  _hasWebGLSupported() {
    try {
      const canvas = document.createElement("canvas");
      const ctx =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (this._nullOrUndef(ctx)) return false;
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
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED
      );
  }

  _fillDefaults(options) {
    if (this._nullOrUndef(options.apiVersion))
      options.apiVersion = ANBOX_STREAM_SDK_MAX_CLIENT_API_VERSION;

    if (this._nullOrUndef(options.fullScreen)) options.fullScreen = false;

    if (this._nullOrUndef(options.controls)) options.controls = {};

    if (this._nullOrUndef(options.devices)) options.devices = {};

    if (this._nullOrUndef(options.devices.microphone))
      options.devices.microphone = false;

    if (this._nullOrUndef(options.devices.camera))
      options.devices.camera = false;

    if (this._nullOrUndef(options.devices.speaker))
      options.devices.speaker = true;

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
            (c) => c === codec || c === codec.toUpperCase()
          )
        )
          throw newError(
            "invalid video decoder codec",
            ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
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

    if (this._nullOrUndef(options.callbacks.requestCameraAccess))
      options.callbacks.requestCameraAccess = () => false;

    if (this._nullOrUndef(options.callbacks.requestMicrophoneAccess))
      options.callbacks.requestMicrophoneAccess = () => false;

    if (this._nullOrUndef(options.callbacks.vhalReady))
      options.callbacks.vhalReady = () => {};

    if (!this._nullOrUndef(options.dataChannels)) {
      if (Object.keys(options.dataChannels).length > maxNumberOfDataChannels) {
        throw newError(
          "exceeds the maximum allowed length of data channels",
          ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
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
        ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED
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
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
  }

  _validateOptions(options) {
    this._validateApiVersion(options.apiVersion);

    if (this._nullOrUndef(options.targetElement)) {
      throw newError(
        "missing targetElement parameter",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }

    const container = document.getElementById(options.targetElement);
    if (container === null) {
      throw newError(
        `target element "${options.targetElement}" does not exist`,
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    } else if (container.clientWidth == 0 || container.clientHeight == 0)
      console.error(
        "AnboxStream: video container element misses size. Please see https://anbox-cloud.io/docs/howto/stream/web-client"
      );

    if (this._nullOrUndef(options.connector)) {
      throw newError(
        "missing connector",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }

    if (typeof options.connector.connect !== "function") {
      throw newError(
        'missing "connect" method on connector',
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }

    if (typeof options.connector.disconnect !== "function") {
      throw newError(
        'missing "disconnect" method on connector',
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
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
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }
  }

  _createMedia() {
    let mediaContainer = document.getElementById(this._containerID);
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
      // The video element is sized based on the dimensions of its container. Settings its position to "absolute"
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
        this._options.callbacks.ready();
      };
      video.onloadedmetadata = () => {
        // NOTE: the video frame may not be received or fully decoded yet
        // when the onplay callback is fired, which may cause
        // - WebGL to fail in reading first frames from the video element.
        // - The video.videoWidth and video.videoHeight always stay to zero
        //   when its display style is none (E.g. the upscaling is enabled)
        // Hence we do not start rendering until metadata event is fired.
        this._onResize();

        if (
          this._options.experimental.upscaling.enabled &&
          this._streamCanvas
        ) {
          this._streamCanvas.startRendering();
        }
      };
      mediaContainer.appendChild(video);

      pointerLockElement = video;

      const upscaling = this._options.experimental.upscaling;
      if (upscaling.enabled) {
        // Hide the video element and only make the canvas
        // visible inside of the media container
        video.style.display = "none";

        this._streamCanvas = new AnboxStreamCanvas({
          id: this._canvasID,
          video: video,
          useTargetFrameRate: upscaling.useTargetFrameRate,
          fragmentShader: upscaling.fragmentShader,
        });

        this._streamCanvas.onFpsMeasured((fps) => {
          this._webrtcManager.updateCanvasFpsStats(fps);
        });

        const canvas = this._streamCanvas.initialize();
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
          this._options.callbacks.ready();
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
      const video = document.getElementById(this._videoID);
      video.srcObject = videoSource;

      // Expliclity to call play() method to the video element if it's hidden,
      // otherwise video can be still buffered but not playback, which caused
      // the video.onplay callback won't be triggered at all.
      if (video.style.display === "none") video.play();
    }

    if (this._options.stream.audio && this._options.devices.speaker) {
      const audio = document.getElementById(this._audioID);
      audio.srcObject = audioSource;
    }

    if (!this._options.stream.video && !this._options.stream.audio) {
      this._options.callbacks.ready();
    }
  }

  _removeMedia() {
    const video = document.getElementById(this._videoID);
    const audio = document.getElementById(this._audioID);

    if (video) video.remove();
    if (audio) audio.remove();
  }

  _stopStreaming() {
    this._unregisterControls();
    if (this._gamepadManager) {
      this._gamepadManager.stopPolling();
    }

    this._webrtcManager.stop();
    this._removeMedia();

    if (this._options.experimental.upscaling.enabled) {
      this._streamCanvas.stop();

      const canvas = document.getElementById(this._canvasID);
      if (canvas) canvas.remove();
    }

    this._options.callbacks.done();
  }

  _registerControls() {
    window.addEventListener("resize", this._onResize);

    if (this._options.controls.mouse) {
      const container = document.getElementById(this._containerID);
      if (container) {
        for (const controlName in this.controls.touch)
          container.addEventListener(
            controlName,
            this.controls.touch[controlName]
          );
      }
    }

    this.captureKeyboard();
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
        ANBOX_STREAM_SDK_ERROR_NOT_ALLOWED
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
        ANBOX_STREAM_SDK_ERROR_NOT_ALLOWED
      );
    }

    for (const controlName in this.controls.keyboard)
      window.removeEventListener(
        controlName,
        this.controls.keyboard[controlName]
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

  sendData(channelName, data) {
    return this._webrtcManager.sendData(channelName, data);
  }

  _unregisterControls() {
    window.removeEventListener("resize", this._onResize);

    // Removing the video container should automatically remove all event listeners
    // but this is dependant on the garbage collector, so we manually do it if we can
    if (this._options.controls.mouse) {
      const container = document.getElementById(this._containerID);
      if (container) {
        for (const controlName in this.controls.touch)
          container.removeEventListener(
            controlName,
            this.controls.touch[controlName]
          );
      }
    }

    this.releaseKeyboard();
  }

  /**
   * Calculate how many degrees we should rotate to go from the original orientation to the desired one
   */
  _orientationToDegrees(startingOrientation, desiredOrientation) {
    const orientations = [
      "portrait",
      "landscape",
      "reverse-portrait",
      "reverse-landscape",
    ];
    const currentPos = orientations.indexOf(startingOrientation);
    const desiredPos = orientations.indexOf(desiredOrientation);
    if (currentPos === -1 || desiredPos === -1) {
      throw newError(
        "invalid orientation given",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }
    let requiredTurns = desiredPos - currentPos;
    return requiredTurns * 90 - 360 * Math.floor(requiredTurns / 360);
  }

  /**
   * rotate the video element to a given orientation
   * @param orientation {string} Desired orientation. Can be 'portrait', 'landscape', 'reverse-portrait', 'reverse-landscape'
   *                             No-op if already in the given orientation
   * Returns true if the video element is rotated successfully, otherwise returns false
   * @returns {boolean}
   */
  rotate(orientation) {
    switch (orientation) {
      case "portrait":
      case "landscape":
      case "reverse-portrait":
      case "reverse-landscape":
        break;
      default:
        console.error("invalid orientation given");
        return false;
    }

    const dim = this._dimensions;
    if (!dim) {
      console.error("SDK not ready");
      return false;
    }

    if (orientation === this._currentOrientation) {
      console.log(
        "video element already in requested orientation",
        orientation
      );
      return false;
    }

    const data = { orientation: orientation };
    if (
      !this._webrtcManager.sendControlMessage(
        "screen::change_orientation",
        data
      )
    ) {
      console.error("failed to send orientation message");
      return false;
    }

    this._currentOrientation = orientation;
    this._currentRotation = this._orientationToDegrees(
      this._originalOrientation,
      orientation
    );

    document.getElementById(
      this._videoID
    ).style.transform = `rotate(${this._currentRotation}deg)`;
    this._onResize();
    return true;
  }

  getCurrentOrientation() {
    return this._currentOrientation;
  }

  _onResize() {
    const video = document.getElementById(this._videoID);
    const container = document.getElementById(this._containerID);
    if (video === null || container === null) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // We calculate the distance to the closest window border while keeping aspect ratio intact.
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
    switch (this._currentRotation) {
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
          ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED
        );
    }

    // By what percentage do we have to grow/shrink the video so it has the same size as its container
    const resizePercentage = Math.min(
      containerHeight / videoHeight,
      containerWidth / videoWidth
    );
    const playerHeight = Math.round(videoHeight * resizePercentage);
    const playerWidth = Math.round(videoWidth * resizePercentage);

    let visualElement = video;
    if (this._options.experimental.upscaling.enabled) {
      visualElement = document.getElementById(this._canvasID);
      // Adjust the viewport of WebGL inside of canvas to respect the
      // dimension of the video element if the upscaling is enabled.
      this._streamCanvas.resize(video.videoWidth, video.videoHeight);
    }

    switch (this._currentRotation) {
      case 0:
      case 180:
        visualElement.style.height = playerHeight.toString() + "px";
        visualElement.style.width = playerWidth.toString() + "px";
        visualElement.style.top = `${Math.round(
          container.clientHeight / 2 - playerHeight / 2
        )}px`;
        visualElement.style.left = `${Math.round(
          container.clientWidth / 2 - playerWidth / 2
        )}px`;
        break;
      case 270:
      case 90:
        visualElement.style.height = playerWidth.toString() + "px";
        visualElement.style.width = playerHeight.toString() + "px";
        visualElement.style.top = `${Math.round(
          container.clientHeight / 2 - playerWidth / 2
        )}px`;
        visualElement.style.left = `${Math.round(
          container.clientWidth / 2 - playerHeight / 2
        )}px`;
        break;
      default:
        throw newError(
          "unhandled rotation",
          ANBOX_STREAM_SDK_ERROR_NOT_SUPPORTED
        );
    }

    // Initialize basic orientation
    if (this._originalOrientation === null) {
      if (playerWidth > playerHeight) this._originalOrientation = "landscape";
      else this._originalOrientation = "portrait";
      this._currentOrientation = this._originalOrientation;
    }

    // The visual offset is always derived from the same formula, no matter the orientation.
    const offsetTop = Math.round(container.clientHeight / 2 - playerHeight / 2); // + getPadding('top')
    const offsetLeft = Math.round(container.clientWidth / 2 - playerWidth / 2); // + getPadding('left')

    this._dimensions = {
      videoHeight: videoHeight,
      videoWidth: videoWidth,
      scalePercentage: resizePercentage,
      playerHeight: playerHeight,
      playerWidth: playerWidth,
      playerOffsetLeft: offsetLeft,
      playerOffsetTop: offsetTop,
    };
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
      case 0: // no button
        return 1;
      case 1: // primary button (left click)
        return 2;
      case 2: // secondary button (right click)
        return 3;
      case 4: // auxiliary button (middle click usually) - NOT CURRENTLY SUPPORTED BY ANBOX
        return 5;
      default:
        return 0;
    }
  }

  /**
   * Returns true if a pointer event (move or click) was emitted outside the video
   * boundaries
   * @returns {boolean}
   * @private
   */
  _isPointerEventOutOfBounds(event) {
    return (
      event.clientX < 0 ||
      event.clientX > this._dimensions.playerWidth ||
      event.clientY < 0 ||
      event.clientY > this._dimensions.playerHeight
    );
  }

  /**
   * PointerEvents coordinates are relative to the document. This method
   * removes the various offsets so the (0,0) coordinate corresponds to
   * to the top left corner of the video element
   * @param event
   * @private
   */
  _adjustPointerCoordsToVideoBoundaries(event) {
    const container = document.getElementById(this._containerID);
    if (!container) return false;

    const dim = this._dimensions;
    if (!dim) return false;

    const cRect = container.getBoundingClientRect();
    event.clientX = Math.round(
      event.clientX - cRect.left - dim.playerOffsetLeft
    );
    event.clientY = Math.round(event.clientY - cRect.top - dim.playerOffsetTop);
    return true;
  }

  /**
   * The video displayed on the client might be stretched to fit its display.
   * Because of this, local coordinates may not match the remote container.
   * This method translates local coordinates so they fit the remote container
   * @param event {PointerEvent}
   * @private
   */
  _translateLocalCoordsToRemoteCoords(event) {
    if (event.pointerType === "touch") {
      const pos = this._convertTouchInput(event.clientX, event.clientY);
      event.clientX = pos.x;
      event.clientY = pos.y;
    }

    // The video might be scaled up or down, so we translate the coordinates to take this
    // scaling into account
    event.clientX /= this._dimensions.scalePercentage;
    event.clientY /= this._dimensions.scalePercentage;

    event.movementX = Math.round(
      event.movementX / this._dimensions.scalePercentage
    );
    event.movementY = Math.round(
      event.movementY / this._dimensions.scalePercentage
    );
  }

  /**
   * onPointerEvent is called when a mouse or touch input is fired
   * @param pointerEvent
   * @private
   */
  _onPointerEvent(pointerEvent) {
    pointerEvent.preventDefault();

    // If pointer lock is used but not active dismiss all events until the
    // lock is active again
    if (
      this._options.experimental.pointerLock &&
      this._nullOrUndef(document.pointerLockElement)
    )
      return;

    // The pointerEvent.pointerId increments every time when a new touch point
    // is pressed(can be used to differentiate the touch point from others,
    // However the downside of this is that it can not be used as the MT slot
    // anymore and Android system can't handle the touch event with a slot
    // larger than 10 (the max touch points supported by Android system).
    // Hence we need to convert the pointerId to the MT slot index to ensure
    // correct MT slot event forwarding to Android container.
    const pointerId = Math.abs(pointerEvent.pointerId);
    if (pointerEvent.isPrimary) {
      this._primaryTouchId = pointerId;
    }

    const ori_pointerId = pointerId - this._primaryTouchId;
    const new_pointerId = this._findPointerId(ori_pointerId);

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
    if (!this._adjustPointerCoordsToVideoBoundaries(event)) return;

    if (this._isPointerEventOutOfBounds(event)) {
      // In either of the following cases, ignore the events when
      // they are out of bounds.
      // a) If the feature `emulatePoitnerEvent` is disabled,
      // b) If the feature `emulatePoitnerEvent` is enable, but the
      //    pointer is in out of bounds state,
      if (!this._options.experimental.emulatePointerEvent) return;

      if (
        event.pointerId in this._pointersOutofBounds &&
        event.type != "pointerup"
      )
        return;

      // Emulate the `pointerup` event when it's coordinate
      // is out of bounds.
      event.type = "pointerup";

      if (event.clientX < 0) {
        event.clientX = 0;
      } else if (event.clientX > this._dimensions.playerWidth) {
        event.clientX = this._dimensions.playerWidth;
      }
      if (event.clientY < 0) {
        event.clientY = 0;
      } else if (event.clientY > this._dimensions.playerHeight) {
        event.clientY = this._dimensions.playerHeight;
      }

      this._pointersOutofBounds[event.pointerId] = true;
    } else if (
      this._options.experimental.emulatePointerEvent &&
      event.pointerId in this._pointersOutofBounds
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

      delete this._pointersOutofBounds[event.pointerId];
    }

    // Apply video scaling and rotation to the coordinates
    this._translateLocalCoordsToRemoteCoords(event);

    if (event.type === "pointermove" && event.pointerType === "touch") {
      const index = this._activeTouchPointers.indexOf(event.pointerId);
      if (index === -1) return;
      this._sendInputEvent("touch-move", {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      });
    } else if (event.type === "pointermove" && event.pointerType === "mouse") {
      var e = {
        rx: event.movementX,
        ry: event.movementY,
      };
      if (!this._options.experimental.pointerLock) {
        e.x = event.clientX;
        e.y = event.clientY;
      }
      this._sendInputEvent("mouse-move", e);
    } else if (event.type === "pointerdown" && event.pointerType === "touch") {
      const index = this._activeTouchPointers.indexOf(event.pointerId);
      if (index === -1) this._activeTouchPointers.push(event.pointerId);
      this._sendInputEvent("touch-start", {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      });
    } else if (event.type === "pointerdown" && event.pointerType === "mouse") {
      const button = this._getPressedButton(event);
      if (button <= 0) return;
      this._sendInputEvent("mouse-button", {
        pressed: true,
        button: button,
      });
    } else if (
      (event.type === "pointerup" || event.type === "pointercancel") &&
      event.pointerType === "touch"
    ) {
      const index = this._activeTouchPointers.indexOf(event.pointerId);
      if (index > -1) this._activeTouchPointers.splice(index, 1);

      // Fire the `touch-end` event for each touch points to avoid phantom
      // touch pointer but only includes the `BTN_TOUCH=0` message which is
      // influenced by the `last` field of input event when the last touch
      // pointer is lifted to notify Android frameworks of the end of a
      // multi-touch transfer, otherwise all touch points will be destroyed
      // by accident right after the first `touch-end` event is delivered to
      // Android frameworks, which is incorrect.
      this._sendInputEvent("touch-end", {
        id: event.pointerId,
        last: this._activeTouchPointers.length === 0,
      });

      delete this._pointerIdsMapper[ori_pointerId];
    } else if (
      (event.type === "pointerup" || event.type === "pointercancel") &&
      event.pointerType === "mouse"
    ) {
      const button = this._getPressedButton(event);
      if (button <= 0) return;
      this._sendInputEvent("mouse-button", {
        pressed: false,
        button: button,
      });
    }
  }

  _findPointerId(pointerId) {
    // AOSP supports max 10 touch points and we use the pointerId as the ABS_MT_SLOT
    // and ABS_MT_TRACKING_ID passing down to the container. However the pointerEvent.pointerId
    // would be increased all the time when lifting one finger up and down in a short
    // amount period of time when it comes to multiple touch scenario. Hence we need
    // to find out the minimal available pointerId to avoid the it exceeded the max value.
    if (Object.keys(this._pointerIdsMapper).length > 0) {
      if (!(pointerId in this._pointerIdsMapper)) {
        let existing_pointerIds = [];
        Object.keys(this._pointerIdsMapper).forEach((id) => {
          existing_pointerIds.push(this._pointerIdsMapper[id]);
        });

        let new_pointerId = 0;
        for (; new_pointerId < _maxTouchPointSize; new_pointerId++) {
          const index = existing_pointerIds.indexOf(new_pointerId);
          if (index === -1) break;
        }

        this._pointerIdsMapper[pointerId] = new_pointerId;
      }
    } else {
      this._pointerIdsMapper[pointerId] = pointerId;
    }

    return this._pointerIdsMapper[pointerId];
  }

  _onMouseWheel(event) {
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
  _convertTouchInput(x, y) {
    const dim = this._dimensions;
    if (!dim) {
      throw newError("sdk is not ready yet", ANBOX_STREAM_SDK_ERROR_INTERNAL);
    }

    if (this._currentRotation === 0) return { x: x, y: y };

    let radians = (Math.PI / 180) * this._currentRotation,
      cos = Math.cos(radians),
      sin = Math.sin(radians),
      nx = Math.round(cos * x + sin * y),
      ny = Math.round(cos * y - sin * x);

    switch (this._currentRotation) {
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
    let gamepads = navigator.getGamepads();
    if (gamepads.length > 0) {
      this._gamepadManager = new _gamepadEventManager(
        this._sendInputEvent.bind(this)
      );
      this._gamepadManager.startPolling();
    }
  }

  _setVideoContainerFocused(enabled) {
    const videoContainer = document.getElementById(this._containerID);
    videoContainer.contentEditable = enabled;
    if (videoContainer.contentEditable) videoContainer.focus();
    else videoContainer.blur();
  }

  _nullOrUndef(obj) {
    return obj === null || obj === undefined;
  }

  _stopStreamingOnError(msg, code) {
    this._options.callbacks.error(newError(msg, code));
    this._stopStreaming();
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

const _vertexShaderSource = `
precision mediump float;

attribute vec2 aVertexPos;
attribute vec2 aTextureCoord;
varying highp vec2 vTextureCoord;

void main()
{
  vTextureCoord = aTextureCoord;
  gl_Position = vec4(aVertexPos, 0.0, 1.0);
}
`;

const _fragmentShaderSource = `/*
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
varying highp vec2 vTextureCoord;

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
    return texture2D(uSampler, p/uResolution.xy);
}

void main()
{
    // Set up constants
    float con;
    float sharpness = 0.2;
    FsrRcasCon(con,sharpness);

    vec3 col = FsrRcasF(vTextureCoord, con);

    gl_FragColor = vec4(col, 1.0);
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

    // Timer global to the whole signaling process
    this._signalingTimeout = null;

    // Timer used to give the SDK a chance to reconnect if something goes wrong temporarily
    this._disconnectedTimeout = null;

    this._videoStream = null;
    this._audioStream = null;
    this._audioInputStream = null;
    this._videoInputStream = null;
    this._video_codec_id = null;
    this._audioOutput_codec_id = null;
    this._audioInput_codec_id = null;

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
      video: {
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
          fps: 0,
        },
      },
    };

    this._lastReport = {
      video: {},
      audioOutput: {},
      audioInput: {},
      canvas: {},
    };

    this._debugEnabled = options.debug;
    this._apiVersionInUse = options.apiVersion;

    this._onError = () => {};
    this._onReady = () => {};
    this._onClose = () => {};
    this._onMicRequested = () => false;
    this._onCameraRequested = () => false;
    this._onMessage = () => {};
    this._onStatsUpdated = () => {};
    this._onIMEStateChanged = () => {};
    this._onVhalPropConfigsReceived = () => {};
    this._onVhalGetAnswerReceived = () => {};
    this._onVhalSetAnswerReceived = () => {};
    this._onControlChannelOpen = () => {};
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
   * @callback onWebRTCError
   * @param error {string} Error message
   */
  /**
   * Called when the video track has been successfully created
   * @param callback {onWebRTCError} Callback invoked with error message
   */
  onError(callback) {
    this._onError = (msg, code) => {
      if (this._debugEnabled) console.error(msg);
      callback(newError(msg, code));
      this.stop();
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
      throw this._onError(
        "connector did not return any signaling information",
        ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED
      );
    }

    if (session.stunServers.length > 0)
      this._includeStunServers(session.stunServers);

    this._signalingTimeout = window.setTimeout(
      () =>
        this._onError("signaling timed out", ANBOX_STREAM_SDK_ERROR_TIMEOUT),
      5 * 60 * 1000
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
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    }

    const container = document.getElementById(this._statsOverlayID);
    if (!container) {
      throw newError(
        "invalid overlay container",
        ANBOX_STREAM_SDK_ERROR_INTERNAL
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
        ANBOX_STREAM_SDK_ERROR_INTERNAL
      );
    }

    stats.remove();
  }

  /**
   * video: Statistics on the received video track.
   *   bandwidthMbit: Video traffic received in mbits/s.
   *   totalBytesReceived: Total cumulated bytes received for the current session.
   *   fps: Current frames per second.
   *   decodeTime: Average time in ms to decode a frame.
   *   jitter: Total cumulated packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   avgJitterBufferDelay: Average variance in packet delay in seconds. A high jitter can mean an unstable or congested network.
   *   packetsReceived: Total number of packets received.
   *   packetsLost: Total number of packets lost.
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
      })
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
  updateCanvasFpsStats(fps) {
    this._stats.experimental.canvas.fps = fps;
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
        switch (err.error.sctpCauseCode) {
          case SCP_CAUSE_CODE_USER_INITIATED_ABORT:
            code = ANBOX_STREAM_SDK_ERROR_WEBRTC_DISCONNECTED;
            break;
          default:
            break;
        }
        this._onError(`error on control channel: ${err.error.message}`, code);
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
      ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED
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

        this._applyPendingICECandiates();
      })
      .catch((err) => {
        this._onError(
          `failed to create WebRTC answer: ${err}`,
          ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED
        );
      });
  }

  _onWsMessage(event) {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case "resp:discover":
        this._discoverMsgReceived(msg);

        if (this._apiVersionInUse > msg.max_api_version) {
          this._onError(
            "API version not supported by server",
            ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
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
            })
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
              ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED
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
          ANBOX_STREAM_SDK_ERROR_SIGNALING_FAILED
        );
      });
  }

  _addIceCandidate(msg) {
    this._log("got RTC candidate");
    this._pc.addIceCandidate({
      candidate: atob(msg.candidate),
      sdpMLineIndex: msg.sdpMLineIndex,
      sdpMid: msg.sdpMid,
    });
  }

  _onRtcOfferCreated(description) {
    const sdp = description.sdp;
    this._log(`got RTC offer:\n${sdp}`);
    this._pc.setLocalDescription(description);
    let msg = {
      type: "offer",
      sdp: btoa(sdp),
      dataChannels: Object.keys(this._dataChannels),
    };
    if (this._ws.readyState === 1) this._ws.send(JSON.stringify(msg));
  }

  _onControlMessageReceived(event) {
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

      default:
        this._onMessage(msg.type, msg.data);
    }
  }

  _onRtcTrack(event) {
    const kind = event.track.kind;
    if (kind === "video") {
      this._videoStream = event.streams[0];
      this._videoStream.onremovetrack = this._onClose;
    } else if (kind === "audio") {
      this._audioStream = event.streams[0];
      this._audioStream.onremovetrack = this._onClose;
    }

    const audioOnly = !this._stream.video && this._stream.audio;
    const videoOnly = this._stream.video && !this._stream.audio;
    // Prevent streaming until regardind tracks are available
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
          ANBOX_STREAM_SDK_ERROR_WEBRTC_FAILED
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
            ANBOX_STREAM_SDK_ERROR_WEBRTC_LOST_CONNECTION
          );
        }, 10 * 1000);
        break;

      case "closed":
        this._log("ICE closed");
        if (this._signalingTimeout) {
          this._onError(
            "timed out to establish a WebRTC connection as signaler did not respond",
            ANBOX_STREAM_SDK_ERROR_SIGNALING_TIMEOUT
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
          "received ICE connection state change",
          this._pc.iceConnectionState
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
          ANBOX_STREAM_SDK_ERROR_USER_MEDIA
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
          stream.getTracks().find((t) => t.kind === sender.track.kind)
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
          ANBOX_STREAM_SDK_ERROR_USER_MEDIA
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

  _startStatsUpdater() {
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
        let v = this._stats.video;
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
        this._video_codec_id = report.codecId;
        const elapsedInSec = Math.round(
          (report.timestamp -
            (this._lastReport.video?.timestamp || report.timestamp - 1000)) /
            1000.0
        );
        v.bandwidthMbit = bytes_to_mbits(
          report.bytesReceived - (this._lastReport.video?.bytesReceived || 0),
          elapsedInSec
        );
        this._lastReport.video = report;
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
            1000.0
        );
        a.bandwidthMbit = bytes_to_mbits(
          report.bytesReceived -
            (this._lastReport.audioOutput?.bytesReceived || 0),
          elapsedInSec
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
            1000.0
        );
        a.bandwidthMbit = bytes_to_mbits(
          report.bytesSent - (this._lastReport.audioInput?.bytesSent || 0),
          elapsedInSec
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
        if (report.id == this._video_codec_id && media_type == "video")
          this._stats.video.codec = media_codec;
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
        this._stats.rtcConfig.iceTransportPolicy
      );
    if (this._stats.rtcConfig.iceCandidatePoolSize !== "")
      insertStat(
        "iceCandidatePoolSize",
        this._stats.rtcConfig.iceCandidatePoolSize
      );

    insertHeader("Network");
    insertStat("currentRtt", ms_format(this._stats.network.currentRtt));
    insertStat("networkType", this._stats.network.networkType);
    insertStat("transportType", this._stats.network.transportType);
    insertStat("localCandidateType", this._stats.network.localCandidateType);
    insertStat("remoteCandidateType", this._stats.network.remoteCandidateType);

    insertHeader("Video");
    insertStat("codec", this._stats.video.codec);
    insertStat("bandWidth", mbits_format(this._stats.video.bandwidthMbit));
    insertStat(
      "totalBytesReceived",
      mb_format(this._stats.video.totalBytesReceived)
    );
    insertStat("fps", this._stats.video.fps);
    insertStat("decodeTime", ms_format(this._stats.video.decodeTime));
    insertStat("jitter", ms_format(this._stats.video.jitter));
    insertStat(
      "avgJitterBufferDelay",
      ms_format(this._stats.video.avgJitterBufferDelay)
    );
    insertStat("packetsReceived", this._stats.video.packetsReceived);
    insertStat("packetsLost", this._stats.video.packetsLost);
    insertStat("framesDropped", this._stats.video.framesDropped);
    insertStat("framesDecoded", this._stats.video.framesDecoded);
    insertStat("framesReceived", this._stats.video.framesReceived);
    insertStat("keyFramesDecoded", this._stats.video.keyFramesDecoded);
    insertStat(
      "totalAssemblyTime",
      s_format(this._stats.video.totalAssemblyTime)
    );
    insertStat(
      "framesAssembledFromMultiplePackets",
      this._stats.video.framesAssembledFromMultiplePackets
    );
    insertStat("pliCount", this._stats.video.pliCount);
    insertStat("firCount", this._stats.video.firCount);
    insertStat("nackCount", this._stats.video.nackCount);
    insertStat("qpSum", this._stats.video.qpSum);

    insertHeader("Audio Output");
    insertStat("codec", this._stats.audioOutput.codec);
    insertStat(
      "bandWidth",
      mbits_format(this._stats.audioOutput.bandwidthMbit)
    );
    insertStat(
      "totalBytesReceived",
      mb_format(this._stats.audioOutput.totalBytesReceived)
    );
    insertStat(
      "totalSamplesReceived",
      this._stats.audioOutput.totalSamplesReceived
    );
    insertStat("jitter", ms_format(this._stats.audioOutput.jitter));
    insertStat(
      "avgJitterBufferDelay",
      ms_format(this._stats.audioOutput.avgJitterBufferDelay)
    );
    insertStat("packetsReceived", this._stats.audioOutput.packetsReceived);
    insertStat("packetsLost", this._stats.audioOutput.packetsLost);

    if (this._stats.experimental.canvas.fps > 0) {
      insertHeader("Canvas");
      insertStat("fps", this._stats.experimental.canvas.fps);
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
        ANBOX_STREAM_SDK_ERROR_INTERNAL
      );
    }

    this._lastRenderTime = 0;
    this._lastSampleTime = 0;
    this._frameCount = 0;
    this._fpsMeasumentlTimerId = 0;
    this._fpsInterval = 1000 / 60;
    this._useTargetFrameRate = options.useTargetFrameRate;
    this._fragmentShader = options.fragmentShader;

    // Canvas
    this._webgl = null;
    this._program = null;
    this._texture = null;
    this._buffers = {};
  }

  initialize() {
    const canvas = document.createElement("canvas");
    canvas.style.margin = "0";
    canvas.style.position = "absolute";
    canvas.id = this._canvasID;

    const gl = canvas.getContext("webgl");
    const program = this._loadShaders(gl);
    if (this._nullOrUndef(program)) {
      throw newError(
        "Failed to load shader program",
        ANBOX_STREAM_SDK_ERROR_INTERNAL
      );
    }
    this._program = program;

    this._texture = this._initializeTexture(gl);
    this._buffers = this._initializeBuffer(gl);

    this._webgl = gl;
    // WebGL specific: flips the source data along its vertical axis,
    // otherwise Y-axis is flipped.
    this._webgl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    return canvas;
  }

  startRendering() {
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

  setTargetFps(fps) {
    if (!this._nullOrUndef(fps) && fps > 0) this._fpsInterval = 1000 / fps;
  }

  stop() {
    window.clearInterval(this._fpsMeasumentlTimerId);
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
      this._video.requestVideoFrameCallback(refresh);
    };
    this._video.requestVideoFrameCallback(refresh);
  }

  _refreshOnInterval(now) {
    requestAnimationFrame(this._refreshOnInterval.bind(this));

    let elapsed = now - this._lastRenderTime;
    if (elapsed > this._fpsInterval) {
      // In case the timing that the refresh callback get invoked
      // by the browser is not multiple of the fps interval.
      this._lastRenderTime = now - (elapsed % this._fpsInterval);
      this._render(this._webgl);
    }
  }

  _loadShaders(gl) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, _vertexShaderSource);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error(
        `failed to compile vertex shader: ${gl.getShaderInfoLog(vertexShader)}`
      );
      return null;
    }

    let fragmentShaderSource = _fragmentShaderSource;
    if (
      !this._nullOrUndef(this._fragmentShader) &&
      this._fragmentShader.trim().length > 0
    )
      fragmentShaderSource = this._fragmentShader.trim();
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error(
        `failed to compile fragment shader: ${gl.getShaderInfoLog(
          fragmentShader
        )}`
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
        `failed to validate program: ${gl.getProgramInfoLog(program)}`
      );
      return null;
    }

    return program;
  }

  _initializeTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Create a dummy texture for the placeholder and update it later
    // by reading the video frame from the video element via gl.texImage2D
    const width = 1;
    const height = 1;
    const pixel = new Uint8Array([0, 0, 0, 255]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
  }

  _initializeBuffer(gl) {
    // Create the vertex buffer
    // Disable the ESLint rule for better readability
    /* eslint-disable */
    const vertices = [
      // postion   // texture coordinate
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
      gl.STATIC_DRAW
    );

    return {
      vertices: vertexBuffer,
      indices: indexBuffer,
    };
  }

  _render(gl) {
    // Update viewport in case that the window resize happens
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.vertices);

    let positionAttribLocation = gl.getAttribLocation(
      this._program,
      "aVertexPos"
    );
    gl.vertexAttribPointer(
      positionAttribLocation,
      2,
      gl.FLOAT,
      gl.FALSE,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    gl.enableVertexAttribArray(positionAttribLocation);

    let texCoordAttribLocation = gl.getAttribLocation(
      this._program,
      "aTextureCoord"
    );
    gl.vertexAttribPointer(
      texCoordAttribLocation,
      2,
      gl.FLOAT,
      gl.FALSE,
      4 * Float32Array.BYTES_PER_ELEMENT,
      2 * Float32Array.BYTES_PER_ELEMENT // offset for texture coordinate in vertices
    );
    gl.enableVertexAttribArray(texCoordAttribLocation);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffers.indices);

    let uSampler = gl.getUniformLocation(this._program, "uSampler");
    let uResolution = gl.getUniformLocation(this._program, "uResolution");

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this._video
    );

    gl.useProgram(this._program);

    gl.uniform1i(uSampler, 0);
    gl.uniform2f(uResolution, gl.canvas.width, gl.canvas.height);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

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
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );

    if (!options.url.includes("https") && !options.url.includes("http"))
      throw newError(
        "unsupported scheme",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );
    else if (options.url.endsWith("/")) options.url = options.url.slice(0, -1);

    if (this._nullOrUndef(options.authToken))
      throw newError(
        "missing authToken parameter",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );

    if (this._nullOrUndef(options.session)) options.session = {};

    if (this._nullOrUndef(options.session.region)) options.session.region = "";

    if (
      this._nullOrUndef(options.session.id) &&
      this._nullOrUndef(options.session.app)
    ) {
      throw newError(
        "session.app or session.id required",
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
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
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
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
        ANBOX_STREAM_SDK_ERROR_SESSION_FAILED
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
      }
    );
    if (rawJoinResp === undefined || rawJoinResp.status !== 200)
      throw newError(
        "Session does not exist anymore",
        ANBOX_STREAM_SDK_ERROR_SESSION_FAILED
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
   * @param webrtcManager {object} Anbox WebRTCManager object
   * @param [timeout=1000] {number} How long to wait for an answer for the VHAL calls (in milliseconds).
   */
  constructor(webrtcManager, timeout = 1000) {
    this._webrtcManager = webrtcManager;
    this._timeout = timeout;
    this._waitingRequestsGet = [];
    this._waitingRequestsSet = [];
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
        ANBOX_STREAM_SDK_ERROR_INVALID_ARGUMENT
      );

    const timeout = new Promise((_r, reject) => {
      setTimeout(
        () =>
          reject(
            newError(`timeout while waiting for answer to ${command} request`),
            ANBOX_STREAM_SDK_ERROR_TIMEOUT
          ),
        this._timeout
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
        ANBOX_STREAM_SDK_ERROR_WEBRTC_CONTROL_FAILED
      );
  }

  onVhalPropConfigsReceived(propConfigs) {
    this._configStore = new Map(
      propConfigs.map((config) => [config.prop, config])
    );
  }

  onVhalGetAnswerReceived(getAnswer) {
    this._waitingRequestsGet.shift()?.resolve(getAnswer);
  }

  onVhalSetAnswerReceived(setAnswer) {
    this._waitingRequestsSet.shift()?.resolve(setAnswer);
  }
}

window.AnboxStreamGatewayConnector = AnboxStreamGatewayConnector;
window.AnboxStream = AnboxStream;
export { AnboxStreamGatewayConnector, AnboxStream };
