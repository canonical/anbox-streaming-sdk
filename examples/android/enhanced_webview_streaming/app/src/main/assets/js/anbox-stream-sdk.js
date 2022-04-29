/*
 * This file is part of Anbox Cloud Streaming SDK
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
class AnboxStream {
    /**
     * AnboxStream creates a connection between your client and an Android instance and
     * displays its video & audio feed in an HTML5 player
     * @param options: {object}
     * @param options.connector {object} WebRTC Stream connector.
     * @param options.targetElement {string} ID of the DOM element to attach the video to.
     * @param [options.fullScreen] {boolean} Stream video in full screen mode. (default: false)
     * @param [options.deviceType] {string} Send the type of device the SDK is running on to the Android container.
     * @param [options.enableStats] {boolean} Enable collection of statistics. Not recommended in production.
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
     * @param [options.experimental] {object} Experimental features. Not recommended on production.
     * @param [options.experimental.disableBrowserBlock=false] {boolean} Don't throw an error if an unsupported browser is detected.
     * @param [options.experimental.debug=false] {boolean} Print debug logs
     */
    constructor(options) {
        if (this._nullOrUndef(options))
            throw new Error('invalid options');

        this._fillDefaults(options);
        this._validateOptions(options);
        this._options = options;

        if (!this._options.experimental.disableBrowserBlock)
            this._detectUnsupportedBrowser();

        this._id = Math.random().toString(36).substr(2, 9);
        this._containerID = options.targetElement;
        this._videoID = 'anbox-stream-video-' + this._id;
        this._audioID = 'anbox-stream-audio-' + this._id;

        // WebRTC
        this._webrtcManager = new AnboxWebRTCManager({
            enableSpeakers: this._options.devices.speaker,
            enableMic: this._options.devices.microphone,
            enableCamera: this._options.devices.camera,
            deviceType: this._options.deviceType,
            foregroundActivity: this._options.foregroundActivity,
            stats: {
                overlayID: this._containerID,
                enable: this._options.enableStats
            },
            debug: this._options.experimental.debug
        })
        this._webrtcManager.onReady(this._webrtcReady.bind(this))
        this._webrtcManager.onError(this._stopStreamingOnError.bind(this))
        this._webrtcManager.onClose(this._stopStreaming.bind(this))
        this._webrtcManager.onStatsUpdated(this._options.callbacks.statsUpdated)

        // Control options
        this._modifierState = 0;
        this._dimensions = null;
        this._gamepadManager = null;
        this._lastTouchMoves = [];
        this._coordConverter = null;

        this._originalOrientation = null;
        this._currentRotation = 0;

        this.controls = {
            touch: {
                'mousemove': this._onMouseMove.bind(this),
                'mousedown': this._onMouseButton.bind(this),
                'mouseup': this._onMouseButton.bind(this),
                'mousewheel': this._onMouseWheel.bind(this),
                'touchstart': this._onTouchStart.bind(this),
                'touchend': this._onTouchEnd.bind(this),
                'touchcancel': this._onTouchCancel.bind(this),
                'touchmove': this._onTouchMove.bind(this),
            },
            keyboard: {
                'keydown': this._onKey.bind(this),
                'keyup': this._onKey.bind(this),
                'gamepadconnected': this._queryGamePadEvents.bind(this)
            }
        }

        this.releaseKeyboard = this.releaseKeyboard.bind(this);
        this.captureKeyboard = this.captureKeyboard.bind(this);
        this._onResize = this._onResize.bind(this);
    };

    /**
     * Connect a new instance for the configured application or attach to an existing one
     */
    async connect() {
        if (this._options.fullScreen)
            this._requestFullscreen()

        this._createMedia()

        let session = {};
        try {
            session = await this._options.connector.connect()
        } catch (e) {
            this._stopStreamingOnError('connector failed to connect: ' + e.message);
            return
        }

        try {
            this._webrtcManager.start(session)
        } catch (e) {
            this._stopStreamingOnError(e);
            return
        }
    };

    /**
     * Disconnect an existing stream and remove the video & audio elements.
     *
     * This will stop the underlying Android instance.
     */
    disconnect() {
        this._stopStreaming();
        this._options.connector.disconnect();
    };

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
     * network: Information about the network and WebRTC connections.
     *   currentRtt: Current round trip time in seconds.
     *   networkType: Type of network in use. Can be one of the following:
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
     */
    showStatistics(enabled) {
        if (enabled)
            this._webrtcManager.showStatsOverlay()
        else
            this._webrtcManager.hideStatsOverlay()
    };

    /**
     * Toggle fullscreen for the streamed video.
     *
     * IMPORTANT: fullscreen can only be toggled following a user input.
     * If you call this method when your page loads, it will not work.
     */
    _requestFullscreen() {
        if (!document.fullscreenEnabled) {
            console.error("fullscreen not supported");
            return
        }
        const fullscreenExited = () => {
            if (document.fullscreenElement === null) {
                const video = document.getElementById(this._videoID);
                if (video) {
                    video.style.width = null;
                    video.style.height = null;
                }
            }
        };
        // Clean up previous event listeners
        document.removeEventListener('fullscreenchange', fullscreenExited, false);
        document.addEventListener('fullscreenchange', fullscreenExited, false);

        // We don't put the video element itself in fullscreen because of
        // https://bugs.chromium.org/p/chromium/issues/detail?id=462164
        // To work around it we put the outer container in fullscreen and scale the video
        // to fit it. When exiting fullscreen we undo style changes done to the video element
        const videoContainer = document.getElementById(this._containerID);
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen().catch(err => {
                console.log(`Failed to enter full-screen mode: ${err.message} (${err.name})`);
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
    };

    /**
     * Exit fullscreen mode.
     */
    exitFullscreen() {
        document.exitFullscreen();
    };

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
        if (this._nullOrUndef(update.time) ||
            this._nullOrUndef(update.latitude) ||
            this._nullOrUndef(update.longitude) ||
            this._nullOrUndef(update.altitude) ||
            this._nullOrUndef(update.speed) ||
            this._nullOrUndef(update.bearing)) {
            throw new Error("incomplete location update")
        }

        if (!this._nullOrUndef(update.format) &&
            update.format !== "nmea" &&
            update.format !== "wgs84") {
            throw new Error("invalid gps data format")
        }

        this._webrtcManager.sendControlMessage("location::update-position", update);
    }

    _detectUnsupportedBrowser() {
        if (navigator.userAgent.indexOf("Chrome") === -1 &&
            navigator.userAgent.indexOf("Firefox") === -1 &&
            navigator.userAgent.indexOf("Safari") === -1)
            throw new Error("unsupported browser");
    };

    _fillDefaults(options) {
        if (this._nullOrUndef(options.fullScreen))
            options.fullScreen = false;

        if (this._nullOrUndef(options.controls))
            options.controls = {};

        if (this._nullOrUndef(options.devices))
            options.devices = {};

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

        if (this._nullOrUndef(options.controls.gamepad))
            options.controls.gamepad = true;

        if (this._nullOrUndef(options.stunServers))
            options.stunServers = [];

        if (this._nullOrUndef(options.callbacks))
            options.callbacks = {};

        if (this._nullOrUndef(options.callbacks.ready))
            options.callbacks.ready = () => {};

        if (this._nullOrUndef(options.callbacks.error))
            options.callbacks.error = () => {};

        if (this._nullOrUndef(options.callbacks.done))
            options.callbacks.done = () => {};

        if (this._nullOrUndef(options.callbacks.messageReceived))
            options.callbacks.messageReceived = () => {};

        if (this._nullOrUndef(options.callbacks.requestCameraAccess))
            options.callbacks.requestCameraAccess = () => false

        if (this._nullOrUndef(options.callbacks.requestMicrophoneAccess))
            options.callbacks.requestMicrophoneAccess = () => false

        if (this._nullOrUndef(options.disableBrowserBlock))
            options.disableBrowserBlock = false;

        if (this._nullOrUndef(options.foregroundActivity))
            options.foregroundActivity = "";

        if (this._nullOrUndef(options.deviceType))
            options.deviceType = '';

        if (this._nullOrUndef(options.enableStats))
            options.enableStats = false;

        if (this._nullOrUndef(options.experimental))
            options.experimental = {};

        if (this._nullOrUndef(options.experimental.disableBrowserBlock))
            options.experimental.disableBrowserBlock = false;

        if (this._nullOrUndef(options.experimental.debug))
            options.experimental.debug = false;
    };

    _validateOptions(options) {
        if (this._nullOrUndef(options.targetElement))
            throw new Error('missing targetElement parameter');
        if (document.getElementById(options.targetElement) === null)
            throw new Error(`target element "${options.targetElement}" does not exist`);

        if (this._nullOrUndef(options.connector))
            throw new Error('missing connector');

        if (typeof(options.connector.connect) !== "function")
            throw new Error('missing "connect" method on connector');

        if (typeof(options.connector.disconnect) !== "function")
            throw new Error('missing "disconnect" method on connector');

        const _activityNamePattern = /(^([A-Za-z]{1}[A-Za-z\d_]*\.){2,}|^(\.){1})[A-Za-z][A-Za-z\d_]*$/
        if (options.foregroundActivity.length > 0 && !_activityNamePattern.test(options.foregroundActivity))
            throw new Error('invalid foreground activity name');
    }

    _createMedia() {
        let mediaContainer = document.getElementById(this._containerID);
        // We set the container as relative so the video element is absolute to it and not something else
        mediaContainer.style.position = 'relative';

        const video = document.createElement('video');
        video.style.margin = "0";
        video.style.height = "auto";
        video.style.width = "auto";
        // The video element is sized based on the dimensions of its container. Settings its position to "absolute"
        // removes it from the flow, so the video element cannot change its parent dimensions.
        video.style.position = 'absolute';
        video.muted = true;
        video.autoplay = true;
        video.controls = false;
        video.id = this._videoID;
        video.playsInline = true;
        video.onplay = () => {
            this._onResize()
            this._registerControls();
        };
        mediaContainer.appendChild(video);

        if (this._options.devices.speaker) {
            const audio = document.createElement('audio');
            audio.id = this._audioID;
            audio.autoplay = true;
            audio.controls = false;
            mediaContainer.appendChild(audio);
        }
    };

    _webrtcReady(videoSource, audioSource) {
        const video = document.getElementById(this._videoID);
        video.srcObject = videoSource;

        if (this._options.devices.speaker) {
            const audio = document.getElementById(this._audioID);
            audio.srcObject = audioSource;
        }

        this._options.callbacks.ready()
    };

    _removeMedia() {
        const video = document.getElementById(this._videoID);
        const audio = document.getElementById(this._audioID);

        if (video)
            video.remove();
        if (audio)
            audio.remove();
    };

    _stopStreaming() {
        this._unregisterControls();
        this._removeMedia();

        if (this._gamepadManager) {
            this._gamepadManager.stopPolling()
        }
        this._options.callbacks.done()
    };

    _registerControls() {
        window.addEventListener('resize', this._onResize)

        const container = document.getElementById(this._containerID)
        this._coordConverter = new _coordinateConverter()

        // NOTE: `navigator.maxTouchPoints` is undefined for iOS 12 and below,
        //       in this case, we only support two touch points at most, which
        //       would enable people to perform basic multi touch operations.
        //       like pinch to zoom.
        this._maxTouchPoints = navigator.maxTouchPoints || 2;

        if (this._options.controls.mouse) {
            if (container) {
                for (const controlName in this.controls.touch)
                    container.addEventListener(controlName, this.controls.touch[controlName]);
            }
        }

        this.captureKeyboard()
    };

    /**
     * Start the capture of keyboard events and send them to the Android container.
     * NOTE: While keyboard events are captured, you cannot use keyboard controls outside the SDK stream.
     * To re-enable keyboard events, see releaseKeyboard().
     * @throws {Error} Throw if keyboard controls are disabled
     */
    captureKeyboard() {
        if (!this._options.controls.keyboard)
            throw new Error('keyboard controls are disabled')

        for (const controlName in this.controls.keyboard)
            window.addEventListener(controlName, this.controls.keyboard[controlName]);
    }

    /**
     * Stops capturing keyboard events. Can be used when you want to use a keyboard while a stream is running.
     * @throws {Error} Throw if keyboard controls are disabled
     */
    releaseKeyboard() {
        if (!this._options.controls.keyboard)
            throw new Error('keyboard controls are disabled')

        for (const controlName in this.controls.keyboard)
            window.removeEventListener(controlName, this.controls.keyboard[controlName]);
    }

    sendIMECommittedText(text) {
        const data = {
            text: text
        }
        this._sendIMEMessage(_imeEventType.Text, data)
    };

    sendIMEComposingText(text) {
        const data = {
            text: text
        }
        this._sendIMEMessage(_imeEventType.ComposingText, data)
    };

    sendIMETextDeletion(counts) {
        if (counts <= 0)
            return;

        const _android_KEYCODE_DEL = 67
        this._sendIMECode(_android_KEYCODE_DEL, counts);
    };

    sendIMEAction(name, params) {
        if (typeof params === 'undefined')
            params = "";

        // If Anbox IME is enabled, the `hide` action was triggered
        // from client side rather server, we have to remove the focus
        // from the video container so that the client side virtual
        // keyboard will pop down afterwards.
        if (name === "hide")
            this._setVideoContainerFocused(false);

        const data = {
            name: name,
            params: params
        }
        this._sendIMEMessage(_imeEventType.Action, data);
    };

    sendIMEComposingRegion(start, end) {
        if (start < 0 || start > end)
            return;
        const data = {
            start: start,
            end: end
        }
        this._sendIMEMessage(_imeEventType.ComposingRegion, data);
    }

    _unregisterControls() {
        window.removeEventListener('resize', this._onResize)

        // Removing the video container should automatically remove all event listeners
        // but this is dependant on the garbage collector, so we manually do it if we can
        if (this._options.controls.mouse) {
            const video = document.getElementById(this._videoID);
            if (video) {
                for (const controlName in this.controls.touch)
                    video.removeEventListener(controlName, this.controls.touch[controlName])
            }
        }

        this.releaseKeyboard();
    };

    /**
     * Calculate how many degrees we should rotate to go from the original orientation to the desired one
     */
    _orientationToDegrees(startingOrientation, desiredOrientation) {
        const orientations = [
            'portrait',
            'landscape',
            'reverse-portrait',
            'reverse-landscape'
        ]
        const currentPos = orientations.indexOf(startingOrientation)
        const desiredPos = orientations.indexOf(desiredOrientation)
        if (currentPos === -1 || desiredPos === -1)
            throw new Error("invalid orientation given")
        let requiredTurns = desiredPos - currentPos
        return (requiredTurns * 90) - 360 * Math.floor(requiredTurns/360)
    }

    /**
     * rotate the video element to a given orientation
     * @param orientation {string} Desired orientation. Can be 'portrait', 'landscape', 'reverse-portrait', 'reverse-landscape'
     *                             No-op if already in the given orientation
     * @throws {Error} Invalid orientation given
     * @throws {Error} SDK is not ready yet
     */
    rotate(orientation) {
        switch (orientation) {
            case 'portrait':
            case 'landscape':
            case 'reverse-portrait':
            case 'reverse-landscape':
                break
            default:
                throw new Error("invalid orientation given")
        }

        const dim = this._dimensions
        if (!dim)
            throw new Error('SDK not ready')

        if (orientation === this._currentOrientation) {
            console.log('video element already in requested orientation', orientation)
            return;
        }

        this._webrtcManager.sendControlMessage("screen::change_orientation", {
            orientation: orientation
        })

        this._currentOrientation = orientation
        this._currentRotation = this._orientationToDegrees(this._originalOrientation, orientation)

        document.getElementById(this._videoID).style.transform = `rotate(${this._currentRotation}deg)`
        this._onResize()
    }

    getCurrentOrientation() {
        return this._currentOrientation
    }

    _onResize() {
        const video = document.getElementById(this._videoID)
        const container = document.getElementById(this._containerID)
        if (video === null || container === null)
            return;

        // We calculate the distance to the closest window border while keeping aspect ratio intact.
        let videoHeight = video.videoHeight
        let videoWidth = video.videoWidth

        const style = window.getComputedStyle(container, null)
        const getPadding = (direction) => parseFloat(style.getPropertyValue('padding-' + direction) || '0')
        const containerHeight = container.clientHeight - getPadding('top') - getPadding('bottom')
        const containerWidth = container.clientWidth - getPadding('left') - getPadding('right')

        // Handle rotation
        switch (this._currentRotation) {
            case 0:
            case 180:
                break
            case 90:
            case 270:
                videoHeight = video.videoWidth
                videoWidth = video.videoHeight
                break
            default:
                throw new Error('unhandled rotation')
        }

        // By what percentage do we have to grow/shrink the video so it has the same size as its container
        const resizePercentage = Math.min(containerHeight / videoHeight, containerWidth / videoWidth)
        const playerHeight = Math.round(videoHeight * resizePercentage);
        const playerWidth = Math.round(videoWidth * resizePercentage);

        switch (this._currentRotation) {
            case 0:
            case 180:
                video.style.height = playerHeight.toString() + "px";
                video.style.width = playerWidth.toString() + "px";
                video.style.top = `${Math.round(container.clientHeight / 2 - playerHeight / 2)}px`;
                video.style.left = `${Math.round(container.clientWidth / 2 - playerWidth / 2)}px`;
                break
            case 270:
            case 90:
                video.style.height = playerWidth.toString() + "px";
                video.style.width = playerHeight.toString() + "px";
                video.style.top = `${Math.round(container.clientHeight / 2 - playerWidth / 2)}px`;
                video.style.left = `${Math.round(container.clientWidth / 2 - playerHeight / 2)}px`;
                break
            default:
                throw new Error('unhandled rotation')
        }

        // Initialize basic orientation
        if (this._originalOrientation === null) {
            if (playerWidth > playerHeight)
                this._originalOrientation = 'landscape'
            else
                this._originalOrientation = 'portrait'
            this._currentOrientation = this._originalOrientation
        }

        // The visual offset is always derived from the same formula, no matter the orientation.
        const offsetTop = Math.round(container.clientHeight / 2 - playerHeight / 2);// + getPadding('top')
        const offsetLeft = Math.round(container.clientWidth / 2 - playerWidth / 2);// + getPadding('left')

        this._dimensions = {
            videoHeight: videoHeight,
            videoWidth: videoWidth,
            scalePercentage: resizePercentage,
            playerHeight: playerHeight,
            playerWidth: playerWidth,
            playerOffsetLeft: offsetLeft,
            playerOffsetTop: offsetTop
        }
    }

    _triggerModifierEvent(event, key) {
        if (event.getModifierState(key)) {
            if (!(this._modifierState & _modifierEnum[key])) {
                this._modifierState = this._modifierState | _modifierEnum[key];
                this._sendInputEvent('key', {
                    code: _keyScancodes[key],
                    pressed: true
                });
            }
        } else {
            if ((this._modifierState & _modifierEnum[key])) {
                this._modifierState = this._modifierState & ~_modifierEnum[key];
                this._sendInputEvent('key', {
                    code: _keyScancodes[key],
                    pressed: false
                });
            }
        }
    };

    _sendInputEvent(type, data) {
        this._webrtcManager.sendControlMessage('input::' + type, data);
    }

    _sendIMECode(code, times) {
        const data = {
            code: code,
            times: times
        }
        this._sendIMEMessage(_imeEventType.Keycode, data)
    }

    _sendIMEMessage(imeEventType, imeData) {
        const data = {
            type: imeEventType,
            data: imeData
        }
        this._webrtcManager.sendControlMessage('input::ime-event', data)
    };

    _onMouseMove(event) {
        // Mouse events are relative to the outer container. We have to translate them to the dimensions of
        // the video element
        const dim = this._dimensions
        if (!dim)
            throw new Error('SDK not ready')

        const container = document.getElementById(this._containerID)

        const cRect = container.getBoundingClientRect();
        let x = event.clientX - cRect.left - dim.playerOffsetLeft;
        let y = event.clientY - cRect.top - dim.playerOffsetTop;

        // Ignore events outside the video element
        if (x < 0 || x > dim.playerWidth ||
            y < 0 || y > dim.playerHeight) {
            return
        }

        const pos = this._coordConverter.convert(x, y, this._dimensions)
        this._sendInputEvent('mouse-move', {
            x: pos.x,
            y: pos.y,
            rx: event.movementX / this._dimensions.scalePercentage,
            ry: event.movementY / this._dimensions.scalePercentage
        });
    };

    _onMouseButton(event) {
        const down = event.type === 'mousedown';
        let button;

        if (down && event.button === 0 && event.ctrlKey && event.shiftKey)
            return;

        switch (event.button) {
            case 0: // no button
                button = 1;
                break;
            case 1: // primary button (left click)
                button = 2;
                break;
            case 2: // secondary button (right click)
                button = 3;
                break;
            case 4: // auxiliary button (middle click usually)
                button = 5;
                break;
            default:
                console.error('Unknown mouse button', event.button)
                return;
        }

        this._sendInputEvent('mouse-button', {
            button: button,
            pressed: down
        });
    };

    _onMouseWheel(event) {
        let move_step = (delta) => {
            if (delta === 0)
                return 0
            return delta > 0 ? -1 : 1
        }
        const movex = move_step(event.deltaX)
        const movey = move_step(event.deltaY)
        if (movex !== 0 || movey !== 0)
            this._sendInputEvent('mouse-wheel', {
                x: movex,
                y: movey
            });
    };

    _onKey(event) {
        // Disable any problematic browser shortcuts
        if (event.code === 'F5' || // Reload
            (event.code === 'KeyR' && event.ctrlKey) || // Reload
            (event.code === 'F5' && event.ctrlKey) || // Hard reload
            (event.code === 'KeyI' && event.ctrlKey && event.shiftKey) ||
            (event.code === 'F11') || // Fullscreen
            (event.code === 'F12') // Developer tools
        ) return;

        event.preventDefault();

        const numpad_key_prefix = 'Numpad'
        const code = _keyScancodes[event.code];
        const pressed = (event.type === 'keydown');
        if (code) {
            // NOTE: no need to check the following modifier keys
            // 'ScrollLock', 'NumLock', 'CapsLock'
            // as they're mapped to event.code correctly
            const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'];
            for (let i = 0; i < modifierKeys.length; i++) {
                this._triggerModifierEvent(event, modifierKeys[i]);
            }

            this._sendInputEvent('key', {
                code: code,
                pressed: pressed
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
                return (last_char >= '0' && last_char <= '9')
            }

            let event_code = event.code.substr(numpad_key_prefix.length);
            if (is_digit_key(event.code)) {
                if (event.getModifierState("NumLock"))
                    event_code = "Digit" + event_code
                else
                    event_code = event.key
                this._sendInputEvent('key', {
                    code: _keyScancodes[event_code],
                    pressed: pressed
                });
            } else {
                let attach_shift = false
                if (event_code in _numPadMapper) {
                    if (event_code === "Add" || event_code === "Multiply")
                        attach_shift = true
                    event_code = _numPadMapper[event_code]
                }
                if (attach_shift)
                    this._sendInputEvent('key', {
                        code: _keyScancodes["Shift"],
                        pressed: pressed
                    });
                this._sendInputEvent('key', {
                    code: _keyScancodes[event_code],
                    pressed: pressed
                });
            }
        }
    };

    _touchEvent(event, eventType) {
        event.preventDefault();
        const container = document.getElementById(this._containerID)
        if (container === null)
            throw new Error('invalid container')

        for (let n = 0; n < event.changedTouches.length; n++) {
            const touch = event.changedTouches[n]

            let id = touch.identifier;
            // FIXME: On iOS(Safari), unlike Chrome, each touch event has a fixed identifier (e.g 0, 1)
            // to differentiate touch point when multiple touch events are processed at the same time,
            // the touch.identifier on iOS is a unique natural number increase/decrease progressively,
            // so it can be a negative/positive number/zero. However the input event to be sent to Android
            // that bind with the id is ABS_MT_SLOT, which the minimum value of the ABS_MT_SLOT axis must
            // be 0. In this case, we use the index instead, which could mess up touch sequence a bit
            // on multi touches, but fix the broken touch input system.
            if (id < 0 || id > this._maxTouchPoints - 1)
                id = n

            const dim = this._dimensions

            const cRect = container.getBoundingClientRect();
            const x = Math.round(touch.clientX - cRect.left - dim.playerOffsetLeft);
            const y = Math.round(touch.clientY - cRect.top - dim.playerOffsetTop);

            let radians = (Math.PI / 180) * this._currentRotation,
                cos = Math.cos(radians),
                sin = Math.sin(radians),
                nx = Math.round((cos * x) + (sin * y)),
                ny = Math.round((cos * y) - (sin * x));

            let pos
            switch (this._currentRotation) {
                case 0:
                    pos = this._coordConverter.convert(nx, ny, this._dimensions)
                    break
                case 90:
                    ny += dim.playerWidth
                    pos = this._coordConverter.convert(ny, nx, this._dimensions);
                    [pos.x, pos.y] = [pos.y, pos.x]
                    break
                case 180:
                    nx += dim.playerWidth
                    ny += dim.playerHeight
                    pos = this._coordConverter.convert(nx, ny, this._dimensions)
                    break
                case 270:
                    nx += dim.playerHeight
                    pos = this._coordConverter.convert(ny, nx, this._dimensions);
                    [pos.x, pos.y] = [pos.y, pos.x]
                    break
            }

            let e = {
                x: pos.x,
                y: pos.y,
                id: id
            }

            if (eventType === "touch-move") {
                // We should not fire the duplicated touch-move event as this will have a bad impact
                // on Android input dispatching, which could cause ANR if the touched window's input
                // channel is full.
                if (this._updateTouchMoveEvent(e))
                    this._sendInputEvent(eventType, e);
            } else {
                if (eventType === "touch-cancel" || eventType === "touch-end")
                    this._lastTouchMoves = []
                this._sendInputEvent(eventType, e);
            }
        }
    };

    _updateTouchMoveEvent(event) {
        for (let lastMove of this._lastTouchMoves) {
            if (lastMove.id === event.id) {
                if (lastMove.x === event.x && lastMove.y === event.y)
                    return false
                lastMove.x = event.x
                lastMove.y = event.y
                return true
            }
        }

        this._lastTouchMoves.push(event)
        return true
    }

    _onTouchStart(event) {
        this._touchEvent(event, 'touch-start')
    };
    _onTouchEnd(event) {
        this._touchEvent(event, 'touch-end')
    };
    _onTouchCancel(event) {
        this._touchEvent(event, 'touch-cancel')
    };
    _onTouchMove(event) {
        this._touchEvent(event, 'touch-move')
    };

    _queryGamePadEvents() {
        if (!this._options.controls.gamepad)
            return;
        let gamepads = navigator.getGamepads();
        if (gamepads.length > 0) {
            this._gamepadManager = new _gamepadEventManager(this._sendInputEvent.bind(this));
            this._gamepadManager.startPolling();
        }
    };

    _setVideoContainerFocused(enabled) {
        const videoContainer = document.getElementById(this._containerID);
        videoContainer.contentEditable = enabled;
        if (videoContainer.contentEditable)
            videoContainer.focus();
        else
            videoContainer.blur();
    }

    _nullOrUndef(obj) {
        return obj === null || obj === undefined
    };

    _stopStreamingOnError(errorMsg) {
        this._options.callbacks.error(new Error(errorMsg));
        this._stopStreaming();
    }
}

class _gamepadEventManager {
    constructor(sendEvent) {
        this._polling = false;
        this._state = {};
        this._dpad_remap_start_index = 6;
        this._dpad_standard_start_index = 12;
        this._sendInputEvent = sendEvent
    }

    startPolling() {
        if (this._polling === true)
            return;

        // Since chrome only supports event polling and we don't want
        // to send any gamepad events to Android isntance if the state
        // of any button or axis of gamepad is not changed. Hence we
        // cache all keys state whenever it gets connected and provide
        // event-driven gamepad events mechanism for gamepad events processing.
        let gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i])
                this.cacheState(gamepads[i]);
        }

        this._polling = true;
        this.tick();
    };

    stopPolling() {
        if (this._polling === true)
            this._polling = false;
    };

    tick() {
        this.queryEvents();
        if (this._polling)
            window.requestAnimationFrame(this.tick.bind(this));
    };

    queryEvents() {
        let gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            let gamepad = gamepads[i];
            if (gamepad) {
                // A new gamepad is added
                if (!this._state[gamepad])
                    this.cacheState(gamepad);
                else {
                    const buttons = gamepad.buttons;
                    const cacheButtons = this._state[gamepad].buttons;
                    for (let j = 0; j < buttons.length; j++) {
                        if (cacheButtons[j].pressed !== buttons[j].pressed) {
                            // Check the table at the following link that describes the buttons/axes
                            // index and their physical locations.
                            this._sendInputEvent('gamepad-button', {
                                id: gamepad.index,
                                index: j,
                                pressed: buttons[j].pressed
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
                                    this._sendInputEvent('gamepad-axes', {
                                        id: gamepad.index,
                                        index: k,
                                        value: axes[k]
                                    });
                                    break;
                                case k === this._dpad_remap_start_index: // DPAD left and right buttons
                                    if (axes[k] === 0) {} else if (axes[k] === -1) {
                                        dpad_button_index = this._dpad_standard_start_index + 2;
                                    } else {
                                        dpad_button_index = this._dpad_standard_start_index + 3;
                                    }

                                    this._sendInputEvent('gamepad-button', {
                                        id: gamepad.index,
                                        index: dpad_button_index,
                                        pressed: axes[k] !== 0
                                    });
                                    break;
                                case k === this._dpad_remap_start_index + 1: //  DPAD up and down buttons
                                    if (axes[k] === 0) {} else if (axes[k] === -1) {
                                        dpad_button_index = this._dpad_standard_start_index;
                                    } else {
                                        dpad_button_index = this._dpad_standard_start_index + 1;
                                    }

                                    this._sendInputEvent('gamepad-button', {
                                        id: gamepad.index,
                                        index: dpad_button_index,
                                        pressed: axes[k] !== 0
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
    };

    cacheState(gamepad) {
        if (!gamepad)
            return;

        const gamepadState = {};
        const buttons = gamepad.buttons;
        for (let index = 0; index < buttons.length; index++) {
            let buttonState = {
                pressed: buttons[index].pressed
            };
            if (gamepadState.buttons)
                gamepadState.buttons.push(buttonState);
            else
                gamepadState.buttons = [buttonState];
        }

        const axes = gamepad.axes;
        for (let index = 0; index < axes.length; index++) {
            if (gamepadState.axes)
                gamepadState.axes.push(axes[index]);
            else
                gamepadState.axes = [axes[index]];
        }

        this._state[gamepad] = gamepadState;
    }
}

class _coordinateConverter {
    /**
     * convert will translate position from local events to position from remote container.
     * @param pointerX {number} X position of the cursor on the video
     * @param pointerY {number} Y position of the cursor on the video
     * @param dimensions {object} Dimensions of the local viewport.
     * @returns {x: number, y: number}
     */
    convert(pointerX, pointerY, dimensions) {
        const x = this._clientToServerX(pointerX, dimensions);
        const y = this._clientToServerY(pointerY, dimensions);
        return {x: x, y: y}
    };

    _clientToServerX(clientX, dimensions) {
        let serverX = Math.round(clientX / dimensions.scalePercentage)
        if (serverX > dimensions.videoWidth)
            serverX = dimensions.videoWidth
        else if (serverX < 0)
            serverX = 0

        return serverX;
    };

    _clientToServerY(clientY, dimensions) {
        let serverY = Math.round(clientY / dimensions.scalePercentage)
        if (serverY > dimensions.videoHeight)
            serverY = dimensions.videoHeight
        else if (serverY < 0)
            serverY = 0

        return serverY;
    };
}

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
}

const _imeEventType = {
    Text: 0x1,
    Keycode: 0x2,
    Action: 0x3,
    ComposingText: 0x4,
    ComposingRegion: 0x5,
};

class AnboxWebRTCManager {
    /**
     * Handle the signaling process to establish a WebRTC stream between a client
     * and a container.
     * Requires a Session object and returns a video + audio element.
     * @param options {Object} configuration of the WebRTC stream
     * @param [options.enableSpeakers=true] {boolean} Enable speakers
     * @param [options.enableMic=false] {boolean} Enable microphone
     * @param [options.enableCamera=false] {boolean} Enable camera
     * @param [options.deviceType] {string} Indicate the type of the device the SDK is running on
     * @param [options.foregroundActivity] {string} Activity to be displayed in the foreground. NOTE: it only works with an application that has APK provided on its creation.
     * @param [options.stats] {Object}
     * @param [options.stats.enable=false] {boolean} Enable collection of statistics. Not recommended in production
     * @param [options.stats.overlayID] {string} ID of the container in which the stat overlay will be displayed. Can be the stream container ID or something else.
     * @param [options.debug=false] {boolean} Enable debug log
     */
    constructor(options) {
        this._ws = null
        this._pc = null
        this._controlChan = null
        this._stunServers = []

        // Timer global to the whole signaling process
        this._signalingTimeout = null;

        // Timer used to give the SDK a chance to reconnect if something goes wrong temporarily
        this._disconnectedTimeout = null;

        this._videoStream = null;
        this._audioStream = null;
        this._audioInputStream = null;
        this._videoInputStream = null;

        this._userMedia = {}
        this._userMedia.speakers = options.enableSpeakers || true;
        this._userMedia.mic = options.enableMic || false;
        this._userMedia.camera = options.enableCamera || false;

        this._deviceType = options.deviceType || '';
        this._foregroundActivity = options.foregroundActivity || '';

        this._startTimer = performance.now()
        this._statsEnabled = options.stats?.enable || false
        this._statsOverlayID = options.stats?.overlayID
        this._showStatsOverlay = false
        this._stats = {
            rtcConfig: {
                sdpSemantics: '',
                rtcpMuxPolicy: '',
                bundlePolicy: '',
                iceTransportPolicy: '',
                iceCandidatePoolSize: '',
            },
            network: {
                currentRtt: 0,
                networkType: '',
                transportType: '',
                localCandidateType: '',
                remoteCandidateType: ''
            },
            video: {
                bandwidthMbit: 0,
                totalBytesReceived: 0,
                fps: 0,
                decodeTime: 0,
                jitter: 0,
                avgJitterBufferDelay: 0,
                packetsReceived: 0,
                packetsLost: 0
            },
            audioOutput: {
                bandwidthMbit: 0,
                totalBytesReceived: 0,
                totalSamplesReceived: 0,
                jitter: 0,
                avgJitterBufferDelay: 0,
                packetsReceived: 0,
                packetsLost: 0
            },
            audioInput: {
                bandwidthMbit: 0,
                totalBytesSent: 0
            },
        }

        this._lastReport = {
            video: {},
            audioOutput: {},
            audioInput: {},
        }

        this._debugEnabled = options.debug;

        this._onError = () => {}
        this._onReady = () => {}
        this._onClose = () => {}
        this._onMicRequested = () => false
        this._onCameraRequested = () => false
        this._onMessage = () => {}
        this._onStatsUpdated = () => {}
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
        this._onReady = callback
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
        this._onError = (err) => {
            if (this._debugEnabled)
                console.error(err)
            callback(err)
            this.stop()
        }
    }

    /**
     * @callback onWebRTCClose
     */
    /**
     * Called when the stream is closed gracefully
     * @param callback {onWebRTCClose} Callback invoked when the stream is finished
     */
    onClose(callback) {
        this._onClose = callback
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
        this._onMicRequested = callback
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
        this._onCameraRequested = callback
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
        this._onMessage = callback
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
        this._onStatsUpdated = callback
    }

    /**
     * Start the signaling process
     * @param session {Object} Session object returned by the Stream Gateway
     * @param session.websocket {string} URL of the websocket on which to start the signaling process
     * @param session.stunServers {Object[]} List of additional STUN/TURN servers
     */
    start(session) {
        if (session.websocket === undefined || session.websocket.length === 0) {
            throw new Error('connector did not return any signaling information')
        }

        if (session.stunServers.length > 0)
            this._includeStunServers(session.stunServers)

        this._signalingTimeout = window.setTimeout(() => this._onError('signaling timed out'), 5 * 60 * 1000);
        this._connectSignaler(session.websocket)
    }

    stop() {
        this._log('stopping')
        window.clearTimeout(this._signalingTimeout);
        window.clearTimeout(this._disconnectedTimeout);
        window.clearInterval(this._statsTimerId)

        // Notify the other side that we're disconnecting to speed up potential reconnects
        this.sendControlMessage("stream::disconnect", {});

        if (this._ws !== null) {
            this._ws.close()
            this._ws = null
        }

        if (this._pc !== null) {
            this._pc.close();
            this._pc = null;
        }

        if (this._audioInputStream)
            this._audioInputStream.getTracks().forEach(track => track.stop());

        if (this._videoInputStream)
            this._videoInputStream.getTracks().forEach(track => track.stop());
    }

    /**
     * Display statistics about the current stream in an overlay window
     */
    showStatsOverlay() {
        if (!this._statsOverlayID || this._statsOverlayID.length === 0)
            throw new Error('no overlay container id given at initialization')

        const container = document.getElementById(this._statsOverlayID)
        if (!container)
            throw new Error('invalid overlay container')

        this._showStatsOverlay = true

        const stats = document.createElement('div');
        stats.id = this._statsOverlayID + '_child';
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
        // Ignore the pointer interaction on stats overlay
        stats.style.pointerEvents = "none";
        container.appendChild(stats);
    }

    /**
     * Hide statistics overlay
     */
    hideStatsOverlay() {
        if (!this._showStatsOverlay)
            return;

        this._showStatsOverlay = false

        const stats = document.getElementById(this._statsOverlayID + '_child')
        if (!stats)
            throw new Error('invalid overlay container')

        stats.remove()
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
     *   networkType: Type of network in use. Can be one of the following:
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
        if (this._controlChan === null || this._controlChan.readyState !== 'open') {
            throw new Error('control channel not open yet')
        }
        this._controlChan.send(JSON.stringify({
            type: type,
            data: data
        }));
    }

    _log(msg) {
        if (!this._debugEnabled)
            return
        const timeElapsed = performance.now() - this._startTimer
        console.info(`Anbox SDK WebRTC [${Math.round(timeElapsed)}ms] : ${msg}`)
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
                "urls": stun_servers[n].urls,
                "username": stun_servers[n].username,
                "credential": stun_servers[n].password
            });
        }
    };

    _onWsOpen() {
        const config = {
            iceServers: this._stunServers
        };
        this._pc = new RTCPeerConnection(config);
        this._pc.ontrack = this._onRtcTrack.bind(this);
        this._pc.oniceconnectionstatechange = this._onRtcIceConnectionStateChange.bind(this);
        this._pc.onicecandidate = this._onRtcIceCandidate.bind(this);

        let audio_direction = 'inactive'
        if (this._userMedia.speakers) {
            if (this._userMedia.mic)
                audio_direction = 'sendrecv'
            else
                audio_direction = 'recvonly'
        }
        this._pc.addTransceiver('audio', {
            direction: audio_direction
        })

        if (this._userMedia.camera) {
            this._pc.addTransceiver('video', {
                direction: 'sendonly'
            })
        }

        this._pc.addTransceiver('video', {
            direction: 'recvonly'
        })
        this._controlChan = this._pc.createDataChannel('control');
        this._controlChan.onmessage = this._onControlMessageReceived.bind(this);
        this._controlChan.onerror = (err) => this._onError('error on control channel', err);
        this._controlChan.onclose = (err) => this._onError('control channel closing', err);

        if (this._deviceType.length > 0) {
            let msg = {
                type: 'settings',
                device_type: this._deviceType
            };
            this._ws.send(JSON.stringify(msg));
        }

        if (this._foregroundActivity.length > 0) {
            let msg = {
                type: 'settings',
                foreground_activity: this._foregroundActivity,
            };
            this._ws.send(JSON.stringify(msg));
        }

        this._log('creating offer')
        this._createOffer();
    };

    _onWsError(err) {
        this._onError('failed to communicate with the signaler', err);
    };

    _onWsMessage(event) {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
            case 'answer':
                this._log('got RTC answer')
                this._pc.setRemoteDescription(new RTCSessionDescription({
                    type: 'answer',
                    sdp: atob(msg.sdp)
                }));
                break

            case 'candidate':
                this._log('got RTC candidate')
                this._pc.addIceCandidate({
                    'candidate': atob(msg.candidate),
                    'sdpMLineIndex': msg.sdpMLineIndex,
                    'sdpMid': msg.sdpMid
                });
                break

            case 'error':
                this._log('got RTC error')
                this._onError(msg.message);
                break

            default:
                console.error('Unknown message type ' + msg.type);
        }
    };

    _createOffer() {
        let dummy_stream = this._createDummyStream();
        if (dummy_stream != null) {
            this._onVideoInputStreamAvailable(dummy_stream);
        }

        this._pc.createOffer()
            .then(this._onRtcOfferCreated.bind(this))
            .catch(err => this._onError(`failed to create WebRTC offer: ${err}`));
    }

    _onRtcOfferCreated(description) {
        this._pc.setLocalDescription(description);
        let msg = {
            type: 'offer',
            sdp: btoa(description.sdp)
        };
        if (this._ws.readyState === 1)
            this._ws.send(JSON.stringify(msg));
    };

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
                if (!this._nullOrUndef(IMEJSInterface)) {
                    this._setVideoContainerFocused(true);
                    IMEJSInterface.openVirtualKeyboard();
                }
                break

            case "hide-ime":
                if (!this._nullOrUndef(IMEJSInterface)) {
                    this._setVideoContainerFocused(false);
                    IMEJSInterface.hideVirtualKeyboard();
                }
                break

            default:
                this._onMessage(msg.type, msg.data);
        }
    }

    _onRtcTrack(event) {
        const kind = event.track.kind;
        if (kind === 'video') {
            this._videoStream = event.streams[0];
            this._videoStream.onremovetrack = this._onClose;
        } else if (kind === 'audio') {
            this._audioStream = event.streams[0];
            this._audioStream.onremovetrack = this._onClose;
        }

        // Prevent streaming until both audio and video tracks are available
        if (this._videoStream && (!this._userMedia.speakers || this._audioStream)) {
            this._onReady(this._videoStream, this._audioStream);
            if (this._statsEnabled)
                this._startStatsUpdater();
        }
    };

    _onRtcIceConnectionStateChange() {
        if (this._pc === null)
            return;

        switch (this._pc.iceConnectionState) {
            case 'failed':
                this._log('ICE failed')
                this._onError('failed to establish a WebRTC connection via ICE');
                break;

            case 'disconnected':
                this._log('ICE disconnected')
                // When we end up here the connection may not have closed, but we
                // just have a temporary network problem. We wait for a moment and
                // if the connection isn't reestablished we stop streaming
                this._disconnectedTimeout = window.setTimeout(() => {
                    this._onError('lost WebRTC connection')
                }, 10 * 1000);
                break;

            case 'closed':
                this._log('ICE closed')
                if (this._signalingTimeout) {
                    this._onError('timed out to establish a WebRTC connection as signaler did not respond');
                    return;
                }
                this._onClose();
                break;

            case 'connected':
                this._log('ICE connected')
                window.clearTimeout(this._disconnectedTimeout);
                window.clearTimeout(this._signalingTimeout);
                this._ws.close();
                break;

            default:
                this._log('received ICE connection state change', this._pc.iceConnectionState)
        }
    }

    _onRtcIceCandidate(event) {
        if (event.candidate !== null && event.candidate.candidate !== "") {
            const msg = {
                type: 'candidate',
                candidate: btoa(event.candidate.candidate),
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
            };
            if (this._ws.readyState === 1)
                this._ws.send(JSON.stringify(msg));
        }
    };

    _createDummyStream() {
        // Create a dummy audio and video tracks before creating an offer
        // This enables pc connection to switch to real audio and video streams
        // captured from microphone and camera later when opening the those
        // devices without re-negotiation.
        let tracks = [];
        if (this._userMedia.camera) {
            let video_track = this._createDummyVideoTrack();
            tracks.push(video_track);
        }
        if (this._userMedia.mic) {
            let audio_track = this._createDummyAudioTrack();
            tracks.push(audio_track);
        }
        if (tracks.length === 0)
            return null;

        return new MediaStream(tracks);
    }

    _createDummyAudioTrack() {
        let ctx = new AudioContext(),
            oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        return Object.assign(dst.stream.getAudioTracks()[0], {
            enabled: false
        });
    }

    _createDummyVideoTrack() {
        let canvas = Object.assign(document.createElement("canvas"), {
            width: 1,
            height: 1
        });
        canvas.getContext('2d').fillRect(0, 0, 1, 1);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], {
            enabled: false
        });
    }

    _onVideoInputStreamAvailable(stream) {
        this._videoInputStream = stream;
        this._videoInputStream.getTracks().forEach(
            track => this._pc.addTrack(track, stream));
    }

    _openCamera(spec) {
        const resolution = spec["resolution"]
        const facingMode = spec["facing-mode"] === "front" ? "user" : "environment"
        const frameRate = spec["frame-rate"]
        navigator.mediaDevices.getUserMedia({
            video: {
                width: resolution.width,
                height: resolution.height,
                facingMode: {
                    ideal: facingMode
                },
                frameRate: {
                    max: frameRate,
                }
            },
        })
            .then(this._onRealVideoInputStreamAvailable.bind(this))
            .catch(e => this._onError(`failed to open camera: ${e.name}`))
    }

    _onRealVideoInputStreamAvailable(stream) {
        // Replace the existing dummy video stream with the real camera video stream
        const kind = stream.getVideoTracks()[0].kind;
        this._replaceTrack(stream, kind);
        this._videoInputStream = stream;
        this._allowAccessCamera = true;
    }

    _replaceTrack(stream, kind) {
        this._pc.getSenders()
            .filter(sender => (sender.track !== null && sender.track.kind === kind))
            .map(sender => {
                return sender.replaceTrack(stream.getTracks().find(
                    t => t.kind === sender.track.kind));
            });
    }

    _closeCamera() {
        if (this._videoInputStream)
            this._videoInputStream.getTracks().forEach(track => track.stop());

        // Replace the real camera video stream with the dummy video stream
        let stream = new MediaStream([this._createDummyVideoTrack()]);
        stream.getTracks().forEach(track => track.stop());
        const kind = stream.getVideoTracks()[0].kind;
        this._replaceTrack(stream, kind);
        this._videoInputStream = stream;
    }

    _enableMicrophone(spec) {
        navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: spec["freq"],
                channelCount: spec["channels"],
                samples: spec["channels"],
            },
            video: false
        })
            .then(this._onRealAudioInputStreamAvailable.bind(this))
            .catch(e => {
                this._onError(`failed to open microphone: ${e.name}`);
            })
    }

    _onRealAudioInputStreamAvailable(stream) {
        // Replace the existing dummy video stream with the real audio input stream
        const kind = stream.getAudioTracks()[0].kind;
        this._replaceTrack(stream, kind);
        this._audioInputStream = stream;
        this._allowAccessMicrophone = true;
    }

    _disableMicrophone() {
        if (this._audioInputStream)
            this._audioInputStream.getTracks().forEach(track => track.stop());

        // Replace the real audio stream captured from microphone with the dummy stream
        let stream = new MediaStream([this._createDummyAudioTrack()]);
        stream.getTracks().forEach(track => track.stop());
        const kind = stream.getAudioTracks()[0].kind;
        this._replaceTrack(stream, kind);
        this._audioInputStream = stream;
    }

    _startStatsUpdater() {
        let pcConf = this._pc.getConfiguration();
        if (pcConf) {
            if ("sdpSemantics" in pcConf)
                this._stats.rtcConfig.sdpSemantics = pcConf.sdpSemantics

            if ("rtcpMuxPolicy" in pcConf)
                this._stats.rtcConfig.rtcpMuxPolicy = pcConf.rtcpMuxPolicy

            if ("bundlePolicy" in pcConf)
                this._stats.rtcConfig.bundlePolicy = pcConf.bundlePolicy

            if ("iceTransportPolicy" in pcConf)
                this._stats.rtcConfig.iceTransportPolicy = pcConf.iceTransportPolicy

            if ("iceCandidatePoolSize" in pcConf)
                this._stats.rtcConfig.iceCandidatePoolSize = pcConf.iceCandidatePoolSize
        }

        this._statsTimerId = window.setInterval(() => {
            if (!this._pc)
                return

            this._pc.getStats(null).then((rawStats) => {
                this._processRawStats(rawStats)
                this._onStatsUpdated(this._stats)
                if (this._showStatsOverlay)
                    this._refreshStatsOverlay()
            });
        }, 1000);
    }

    _processRawStats(stats) {
        stats.forEach(report => {
            // mediaType is obsolete but kept for backward compatibility
            // https://www.w3.org/TR/webrtc-stats/#ref-for-dom-rtcrtpstreamstats-mediatype-1
            if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.mediaType === 'video')) {
                let v = this._stats.video
                v.fps = report.framesPerSecond
                v.packetsLost = report.packetsLost
                v.packetsReceived = report.packetsReceived
                v.jitter = report.jitter
                v.avgJitterBufferDelay = report.jitterBufferDelay / report.jitterBufferEmittedCount
                v.totalBytesReceived = report.bytesReceived
                const timeDelta = Math.round(report.timestamp - (this._lastReport.video?.timestamp || report.timestamp - 1000))
                v.bandwidthMbit = 8 * (report.bytesReceived - (this._lastReport.video?.bytesReceived || 0)) / timeDelta;
                this._lastReport.video = report
                if (report.framesDecoded !== 0)
                    v.decodeTime = report.totalDecodeTime / report.framesDecoded;

            } else if (report.type === 'inbound-rtp' && (report.kind === "audio" || report.mediaType === 'audio')) {
                let a = this._stats.audioOutput
                a.totalSamplesReceived = report.totalSamplesReceived
                a.packetsLost = report.packetsLost
                a.packetsReceived = report.packetsReceived
                a.jitter = report.jitter
                const timeDelta = Math.round(report.timestamp - (this._lastReport.audioOutput?.timestamp || report.timestamp - 1000))
                a.bandwidthMbit = 8 * (report.bytesReceived - (this._lastReport.audioOutput?.bytesReceived || 0)) / timeDelta
                a.totalBytesReceived = report.bytesReceived
                this._lastReport.audioOutput = report
                if (report.jitterBufferEmittedCount !== 0)
                    a.avgJitterBufferDelay = report.jitterBufferDelay / report.jitterBufferEmittedCount

            } else if (report.type === 'outbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) {
                let a = this._stats.audioInput
                a.totalBytesSent = report.bytesSent
                const timeDelta = Math.round(report.timestamp - (this._lastReport.audioInput?.timestamp || report.timestamp - 1000))
                a.bandwidthMbit = 8 * (report.bytesSent - (this._lastReport.audioInput?.bytesSent || 0)) / timeDelta
                this._lastReport.audioInput = report

            } else if (report.type === 'candidate-pair' && report.nominated && report.state === "succeeded") {
                let n = this._stats.network
                n.currentRtt = report.currentRoundTripTime;
                let network = this._stats.network
                if (network.networkType === "" ||
                    network.transportType === "" ||
                    network.localCandidateType === "" ||
                    network.remoteCandidateType === "") {
                        stats.forEach(stat => {
                            if (stat.id === report.localCandidateId) {
                                n.localCandidateType = stat.candidateType
                                n.networkType = stat.networkType
                            }
                            if (stat.id === report.remoteCandidateId) {
                                n.remoteCandidateType = stat.candidateType
                                n.transportType = stat.protocol
                            }
                        })
                    }
            }
        });
    }

    _refreshStatsOverlay() {
        let overlay = document.getElementById(this._statsOverlayID + '_child');

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

        const mbits_format = (v) => (v * 8 / 1000 / 1000).toFixed(2) + " Mbit/s"
        const mb_format = (v) => (v / 1000 / 1000).toFixed(2) + " MB"
        const ms_format = (v) => (v * 1000).toFixed(2) + " ms"

        insertHeader("RTC Configuration")
        if (this._stats.rtcConfig.sdpSemantics !== "")
            insertStat("sdpSemantics", this._stats.rtcConfig.sdpSemantics)
        if (this._stats.rtcConfig.rtcpMuxPolicy !== "")
            insertStat("rtcpMuxPolicy", this._stats.rtcConfig.rtcpMuxPolicy)
        if (this._stats.rtcConfig.bundlePolicy !== "")
            insertStat("bundlePolicy", this._stats.rtcConfig.bundlePolicy)
        if (this._stats.rtcConfig.iceTransportPolicy !== "")
            insertStat("iceTransportPolicy", this._stats.rtcConfig.iceTransportPolicy)
        if (this._stats.rtcConfig.iceCandidatePoolSize !== "")
            insertStat("iceCandidatePoolSize", this._stats.rtcConfig.iceCandidatePoolSize)

        insertHeader("Network")
        insertStat("currentRtt", ms_format(this._stats.network.currentRtt))
        insertStat("networkType", this._stats.network.networkType)
        insertStat("transportType", this._stats.network.transportType)
        insertStat("localCandidateType", this._stats.network.localCandidateType)
        insertStat("remoteCandidateType", this._stats.network.remoteCandidateType)

        insertHeader("Video")
        insertStat("bandWidth", mbits_format(this._stats.video.bandwidthMbit))
        insertStat("totalBytesReceived", mb_format(this._stats.video.totalBytesReceived))
        insertStat("fps", this._stats.video.fps)
        insertStat("decodeTime", ms_format(this._stats.video.decodeTime))
        insertStat("jitter", ms_format(this._stats.video.jitter))
        insertStat("avgJitterBufferDelay", ms_format(this._stats.video.avgJitterBufferDelay))
        insertStat("packetsReceived", this._stats.video.packetsReceived)
        insertStat("packetsLost", this._stats.video.packetsLost)

        insertHeader("Audio Output")
        insertStat("bandWidth", mbits_format(this._stats.audioOutput.bandwidthMbit))
        insertStat("totalBytesReceived", mb_format(this._stats.audioOutput.totalBytesReceived))
        insertStat("totalSamplesReceived", this._stats.audioOutput.totalSamplesReceived)
        insertStat("jitter", ms_format(this._stats.audioOutput.jitter))
        insertStat("avgJitterBufferDelay", ms_format(this._stats.audioOutput.avgJitterBufferDelay))
        insertStat("packetsReceived", this._stats.audioOutput.packetsReceived)
        insertStat("packetsLost", this._stats.audioOutput.packetsLost)
    }
}

class AnboxStreamGatewayConnector {
    _nullOrUndef(obj) {
        return obj === null || obj === undefined
    };

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
        if (this._nullOrUndef(options))
            throw Error("missing options");

        if (this._nullOrUndef(options.url))
            throw new Error('missing url parameter');

        if (!options.url.includes('https') && !options.url.includes('http'))
            throw new Error('unsupported scheme');
        else if (options.url.endsWith('/'))
            options.url = options.url.slice(0, -1);

        if (this._nullOrUndef(options.authToken))
            throw new Error('missing authToken parameter');

        if (this._nullOrUndef(options.session))
            options.session = {};

        if (this._nullOrUndef(options.session.region))
            options.session.region = "";

        if (this._nullOrUndef(options.session.id) && this._nullOrUndef(options.session.app))
            throw new Error("session.app or session.id required");

        if (this._nullOrUndef(options.session.joinable))
            options.session.joinable = false;

        // Display settings
        if (this._nullOrUndef(options.screen))
            options.screen = {};

        if (this._nullOrUndef(options.screen.width))
            options.screen.width = 1280;

        if (this._nullOrUndef(options.screen.height))
            options.screen.height = 720;

        if (this._nullOrUndef(options.screen.fps))
            options.screen.fps = 60;

        if (this._nullOrUndef(options.screen.density))
            options.screen.density = 240;

        if (this._nullOrUndef(options.extraData) || options.extraData.length === 0)
            options.extraData = "null";

        this._options = options
    }

    async connect() {
        if (this._nullOrUndef(this._options.session.id)) {
            return await this._createSession();
        } else {
            return await this._joinSession();
        }
    };

    async _createSession() {
        try {
            var extra_data_obj = JSON.parse(this._options.extraData)
        } catch (e) {
            throw new Error(`invalid json format extra data was given: ${e.name}`);
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
            extra_data: extra_data_obj
        };

        if (!this._nullOrUndef(this._options.session.idle_time_min))
            appInfo['idle_time_min'] = this._options.session.idle_time_min;

        if (!this._nullOrUndef(this._options.session.app_version) &&
            this._options.session.app_version.length !== 0)
            appInfo['app_version'] = this._options.session.app_version

        const rawResp = await fetch(this._options.url + '/1.0/sessions/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'Macaroon root=' + this._options.authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appInfo),
        });
        if (rawResp === undefined || rawResp.status !== 201)
            throw new Error("Failed to create session");

        const response = await rawResp.json();
        if (response === undefined || response.status !== "success")
            throw new Error(response.error);

        return {
            id: response.metadata.id,
            websocket: response.metadata.url,
            stunServers: response.metadata.stun_servers
        };
    };

    async _joinSession() {
        const rawJoinResp = await fetch(
            this._options.url + '/1.0/sessions/' + this._options.session.id + '/join', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Authorization': 'Macaroon root=' + this._options.authToken,
                    'Content-Type': 'application/json',
                }
            })
        if (rawJoinResp === undefined || rawJoinResp.status !== 200)
            throw new Error("Session does not exist anymore");

        let response = await rawJoinResp.json();
        if (response === undefined || response.status !== "success")
            throw new Error(response.error);

        return {
            id: this._options.session.id,
            websocket: response.metadata.url,
            stunServers: response.metadata.stun_servers
        };
    }

    // no-op
    disconnect() {}
}

window.AnboxStreamGatewayConnector = AnboxStreamGatewayConnector;
window.AnboxStream = AnboxStream;
export { AnboxStreamGatewayConnector, AnboxStream };
