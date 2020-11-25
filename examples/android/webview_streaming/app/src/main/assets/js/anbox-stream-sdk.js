// Anbox Stream SDK
// Copyright 2019 Canonical Ltd.  All rights reserved.

class AnboxStream {
    /**
     * AnboxStream creates a connection between your client and an Android instance and
     * displays its video & audio feed in an HTML5 player
     * @param options: {object}
     * @param options.connector {object} WebRTC Stream connector.
     * @param options.targetElement {string} ID of the DOM element to attach the video to.
     * @param options.fullScreen {boolean} Stream video in full screen mode. (default: false)
     * @param [options.stunServers] {object[]} List of additional STUN/TURN servers.
     * @param [options.stunServers[].urls] {string[]} URLs the same STUN/TURN server can be reached on.
     * @param [options.stunServers[].username] {string} Username used when authenticating with the STUN/TURN server.
     * @param [options.stunServers[].password] {string} Password used when authenticating with the STUN/TURN server.
     * @param [options.devices] {object} Configuration settings for the streaming client device.
     * @param [options.devices.microphone=false] {boolean} Enable audio capture from microphone and send it to the remote peer.
     * @param [options.devices.speaker=true] {boolean} Enable audio playout through the default audio playback device.
     * @param [options.controls] {object} Configuration how the client can interact with the stream.
     * @param [options.controls.keyboard=true] {boolean} Send key presses to the Android instance.
     * @param [options.controls.mouse=true] {boolean} Send mouse events to the Android instance.
     * @param [options.controls.gamepad=true] {boolean} Send gamepad events to the Android instance.
     * @param [options.callbacks] {object} A list of callbacks to react on stream lifecycle events.
     * @param [options.callbacks.ready=none] {function} Called when the video and audio stream are ready to be inserted in the DOM.
     * @param [options.callbacks.error=none] {function} Called on stream error with the message as parameter.
     * @param [options.callbacks.done=none] {function} Called when the stream is closed.
     * @param [options.callbacks.statsUpdated=none] {function} Called when the overall webrtc peer connection statistics are updated.
     * @param [options.experimental] {object} Experimental features. Not recommended on production.
     * @param [options.experimental.disableBrowserBlock=false] {boolean} Don't throw an error if an unsupported browser is detected.
     */
    constructor(options) {
        if (this._nullOrUndef(options))
            throw new Error('invalid options');

        this._fillDefaults(options);
        this._validateOptions(options);
        this._options = options;

        if (!this._options.disableBrowserBlock)
            this._detectUnsupportedBrowser();

        this._id = Math.random().toString(36).substr(2, 9);
        this._containerID = options.targetElement;
        this._videoID = 'anbox-stream-video-' + this._id;
        this._audioID = 'anbox-stream-audio-' + this._id;

        // WebRTC
        this._ws = null; // WebSocket
        this._pc = null; // PeerConnection
        this._controlChan = null; // Channel to send inputs
        this._timedout = false;
        this._timer = -1;
        this._disconnectedTimer = -1;
        this._ready = false;
        this._session_id = "";

        // Media streams
        this._videoStream = null;
        this._audioStream = null;
        this._audioInputStream = null;

        // Control options
        this._modifierState = 0;
        this._dimensions = null;
        this._gamepadManager = null;
        this._lastTouchMoves = [];

        // Stats
        this._statsTimerId = -1;
        this._timeElapse = 0;
        this._stats = {
            video: {
                bandwidthMbit: 0,
                totalBytesReceived: 0,
                fps: 0
            },
            network: {
                currentRtt: 0
            },
            audioInput: {
                bandwidthMbit: 0,
                bytesSent: 0,
            },
            audioOutput: {
                bandwidthMbit: 0,
                bytesReceived: 0
            },
        }
    };

    _includeStunServers(stun_servers) {
        for (var n = 0; n < stun_servers.length; n++) {
            this._options.stunServers.push({
                "urls": stun_servers[n].urls,
                "username": stun_servers[n].username,
                "credential": stun_servers[n].password
            });
        }
    };

    /**
     * Connect a new instance for the configured application or attach to an existing one
     */
    async connect() {
        if (this._options.fullScreen)
            this._requestFullscreen()

        let session = {};
        try {
            session = await this._options.connector.connect()
        } catch (e) {
            this._stopStreamingOnError(e.message);
            return
        }

        this._session_id = session.id

        if (session.websocket === undefined || session.websocket.length === 0) {
            this._stopStreamingOnError('connector did not return signaling information');
            return
        }

        // add additional stun servers if provided
        if (session.stunServers.length > 0)
            this._includeStunServers(session.stunServers);

        this._connectSignaler(session.websocket)
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
        } else if (videoContainer.mozRequestFullScreen) { /* Firefox */
            videoContainer.mozRequestFullScreen();
        } else if (videoContainer.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) { /* IE/Edge */
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

        this._sendControlMessage("location::update-position", update);
    }

    _connectSignaler(url) {
        let ws = new WebSocket(url);
        ws.onopen = this._onWsOpen.bind(this);
        ws.onclose = this._onWsClose.bind(this);
        ws.onerror = this._onWsError.bind(this);
        ws.onmessage = this._onWsMessage.bind(this);

        this._ws = ws;
        this._timer = window.setTimeout(this._onSignalerTimeout.bind(this), 5 * 60 * 1000);
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

        if (this._nullOrUndef(options.disableBrowserBlock))
            options.disableBrowserBlock = false;
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
    }

    _insertMedia(videoSource, audioSource) {
        this._ready = true;
        let mediaContainer = document.getElementById(this._containerID);
        mediaContainer.style.display = "flex"
        mediaContainer.style.justifyContent = "center"
        mediaContainer.style.alignItems = "center"

        const video = document.createElement('video');
        video.style.margin = "0";
        video.style.height = "auto";
        video.style.width = "auto";

        video.srcObject = videoSource;
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
            audio.srcObject = audioSource;
            audio.autoplay = true;
            audio.controls = false;
            mediaContainer.appendChild(audio);
        }

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
        // Notify the other side that we're disconnecting to speed up potential reconnects
        this._sendControlMessage("stream::disconnect", {});

        if (this._disconnectedTimer > 0) {
            window.clearTimeout(this._disconnectedTimer);
            this._disconnectedTimer = -1;
        }

        if (this._audioInputStream)
            this._audioInputStream.getTracks().forEach(track => track.stop());

        if (this._pc !== null) {
            this._pc.close();
            this._pc = null;
        }
        if (this._ws !== null) {
            this._ws.close();
            this._ws = null;
        }
        this._unregisterControls();
        this._removeMedia();

        if (this._statsTimerId !== -1)
            window.clearInterval(this._statsTimerId)

        if (this._gamepadManager) {
            this._gamepadManager.stopPolling()
        }
        this._options.callbacks.done()
    };

    _onSignalerTimeout() {
        if (this._pc == null || this._pc.iceConnectionState === 'connected')
            return;

        this._timedout = true;
        this._stopStreaming();
    };

    _onRtcOfferCreated(description) {
        this._pc.setLocalDescription(description);
        let msg = {type: 'offer', sdp: btoa(description.sdp)};
        if (this._ws.readyState === 1)
            this._ws.send(JSON.stringify(msg));
    };

    _onRtcTrack(event) {
        const kind = event.track.kind;
        if (kind === 'video') {
            this._videoStream = event.streams[0];
            this._videoStream.onremovetrack = this._stopStreaming;
        } else if (kind === 'audio') {
            this._audioStream = event.streams[0];
            this._audioStream.onremovetrack = this._stopStreaming;
        }

        // Start streaming until audio and video tracks both are available
        if (this._videoStream && (!this._options.devices.speaker || this._audioStream)) {
            this._insertMedia(this._videoStream, this._audioStream);
            this._startStatsUpdater();
            this._options.callbacks.ready(this._session_id);
        }
    };

    _startStatsUpdater() {
        if (this._nullOrUndef(this._options.callbacks.statsUpdated))
            return

        this._statsTimerId = window.setInterval(() => {
            if (this._nullOrUndef(this._pc))
                return

            this._timeElapse++
            this._pc.getStats(null).then(stats => {
                stats.forEach(report => {
                    // Instead of dumping all the statistics, we only provide
                    // limited sets of stats to the caller.
                    Object.keys(report).forEach(statName => {
                        if (statName === "ssrc") {
                            if ("mediaType" in report) {
                                let mediaType = report["mediaType"];
                                if (mediaType === "video") {
                                    if ("bytesReceived" in report) {
                                        let bytesReceived = report["bytesReceived"]
                                        let diff = 0;
                                        if (this._stats.video.totalBytesReceived > bytesReceived)
                                            diff = bytesReceived;
                                        else
                                            diff = bytesReceived - this._stats.video.totalBytesReceived;

                                        this._stats.video.bandwidthMbit = diff;
                                        this._stats.video.totalBytesReceived = bytesReceived;
                                    }
                                } else if (mediaType === "audio") {
                                    if ("packetsSent" in report) {
                                        if ("bytesSent" in report) {
                                            let bytesSent = report["bytesSent"];
                                            let diff = 0;
                                            if (this._stats.audioInput.bytesSent > bytesSent)
                                                diff = bytesSent;
                                            else
                                                diff = bytesSent - this._stats.audioInput.bytesSent;

                                            this._stats.audioInput.bandwidthMbit = diff;
                                            this._stats.audioInput.bytesSent = bytesSent;
                                        }
                                    } else {
                                        if ("bytesReceived" in report) {
                                            let bytesReceived = report["bytesReceived"];
                                            let diff = 0;
                                            if (this._stats.audioOutput.bytesReceived > bytesReceived)
                                                diff = bytesReceived;
                                            else
                                                diff = bytesReceived - this._stats.audioOutput.bytesReceived;

                                            this._stats.audioOutput.bandwidthMbit =  diff;
                                            this._stats.audioOutput.bytesReceived = bytesReceived;
                                        }
                                    }
                                }
                            }
                        } else if (statName === "type" && report["type"] === "candidate-pair") {
                            if ("nominated" in report && report["nominated"] &&
                                "state" in report && report["state"] === "succeeded" &&
                                "currentRoundTripTime" in report) {
                                this._stats.network.currentRtt = report["currentRoundTripTime"] * 1000;
                            }
                        } else if (statName === "type" && report["type"] === "inbound-rtp") {
                            if ("framesDecoded" in report)
                                this._stats.video.fps = Math.round(report["framesDecoded"] / this._timeElapse);
                        }
                    });
                });
            });

            this._options.callbacks.statsUpdated(this._stats);
        },
        // TODO: enable stats update interval configurable
        1000);
    }

    _onConnectionTimeout() {
        this._disconnectedTimer = -1;
        this._stopStreamingOnError('Connection lost');
    }

    _onRtcIceConnectionStateChange() {
        if (this._pc === null)
            return;

        if (this._pc.iceConnectionState === 'failed') {
            this._stopStreamingOnError('Failed to establish a connection via ICE');
        } else if (this._pc.iceConnectionState === 'disconnected') {
            // When we end up here the connection may not have closed but we
            // just have a temorary network problem. We wait for a moment and
            // if the connection isn't restablished we stop streaming
            this._disconnectedTimer = window.setTimeout(this._onConnectionTimeout.bind(this), 10 * 1000);
        } else if (this._pc.iceConnectionState === 'closed') {
            if (this._timedout) {
                this._stopStreamingOnError('Connection timed out');
                return;
            }
            this._stopStreaming();
        } else if (this._pc.iceConnectionState === 'connected') {
            if (this._disconnectedTimer > 0) {
                window.clearTimeout(this._disconnectedTimer);
                this._disconnectedTimer = -1;
            }
            window.clearTimeout(this._timer);
            this._ws.close();
        }
    };

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

    controls = {
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

    _registerControls() {
        window.addEventListener('resize', this._onResize)

        if (this._options.controls.mouse) {
            const video = document.getElementById(this._videoID);
            if (video) {
                for (const controlName in this.controls.touch)
                    video.addEventListener(controlName, this.controls.touch[controlName]);
            }
        }

        if (this._options.controls.keyboard) {
            for (const controlName in this.controls.keyboard)
                window.addEventListener(controlName, this.controls.keyboard[controlName]);
        }
    };

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

        if (this._options.controls.keyboard) {
            for (const controlName in this.controls.keyboard)
                window.removeEventListener(controlName, this.controls.keyboard[controlName]);
        }
    };

    _onResize() {
        const video = document.getElementById(this._videoID)
        const container = document.getElementById(this._containerID)
        if (video === null || container === null)
            return;

        // We calculate the distance to the closest window border while keeping aspect ratio intact.
        const videoHeight = video.clientHeight
        const videoWidth = video.clientWidth
        const containerHeight = container.clientHeight
        const containerWidth = container.clientWidth

        // Depending on the aspect ratio, one size will grow faster than the other
        const widthGrowthAcceleration = Math.max(video.videoWidth / video.videoHeight, 1)
        const heightGrowthAcceleration = Math.max(video.videoHeight / video.videoWidth, 1)

        // So we apply that acceleration to find the shortest stretch
        const widthFinalStretch = Math.round((containerWidth - videoWidth) * heightGrowthAcceleration)
        const heightFinalStretch = Math.round((containerHeight - videoHeight) * widthGrowthAcceleration)

        if (widthFinalStretch < heightFinalStretch) {
            video.style.width = containerWidth.toString() + "px"
            video.style.height = "100%"
        } else {
            video.style.height = containerHeight.toString() + "px"
            video.style.width = "100%"
        }
        // _refreshWindowMath relies on the video having the final dimensions.
        // We MUST do it after the video dimensions have been calculated.
        this._refreshWindowMath()
    }

    _clientToServerX(clientX, d) {
        let serverX = Math.round((clientX - d.containerOffsetX) * d.scalingFactorX);
        if (serverX === d.frameW - 1) serverX = d.frameW;
        if (serverX > d.frameW) serverX = d.frameW;
        // FIXME: instead of locking the touch here, we should trigger a touchEnd
        if (serverX < 0) serverX = 0;
        return serverX;
    };

    _clientToServerY(clientY, m) {
        let serverY = Math.round((clientY - m.containerOffsetY) * m.scalingFactorY);
        if (serverY === m.frameH - 1) serverY = m.frameH;
        if (serverY > m.frameH) serverY = m.frameH;
        // FIXME: instead of locking the touch here, we should trigger a touchEnd
        if (serverY < 0) serverY = 0;
        return serverY;
    };

    _triggerModifierEvent(event, key) {
        if (event.getModifierState(key)) {
            if (!(this._modifierState & _modifierEnum[key])) {
                this._modifierState = this._modifierState | _modifierEnum[key];
                this._sendInputEvent('key', {code: _keyScancodes[key], pressed: true});
            }
        } else {
            if ((this._modifierState & _modifierEnum[key])) {
                this._modifierState = this._modifierState & ~_modifierEnum[key];
                this._sendInputEvent('key', {code: _keyScancodes[key], pressed: false});
            }
        }
    };

    _sendInputEvent(type, data) {
        this._sendControlMessage('input::' + type, data);
    }

    _sendControlMessage(type, data) {
        if (this._pc === null || this._controlChan.readyState !== 'open')
            return;
        this._controlChan.send(JSON.stringify({type: type, data: data}));
    };

    _refreshWindowMath() {
        let video = document.getElementById(this._videoID);

        // timing issues can occur when removing the component
        if (!video) {
            return
        }

        const windowW = video.offsetWidth;
        const windowH = video.offsetHeight;
        const frameW = video.videoWidth;
        const frameH = video.videoHeight;

        const multi = Math.min(windowW / frameW, windowH / frameH);
        const vpWidth = frameW * multi;
        const vpHeight = frameH * multi;

        this._dimensions = {
            scalingFactorX: frameW / vpWidth,
            scalingFactorY: frameH / vpHeight,
            containerOffsetX: Math.max((windowW - vpWidth) / 2.0, 0),
            containerOffsetY: Math.max((windowH - vpHeight) / 2.0, 0),
            frameW,
            frameH,
        };
    };

    _onMouseMove(event) {
        const x = this._clientToServerX(event.offsetX, this._dimensions);
        const y = this._clientToServerY(event.offsetY, this._dimensions);
        this._sendInputEvent('mouse-move', {x: x, y: y, rx: event.movementX, ry: event.movementY});
    };

    _onMouseButton(event) {
        const down = event.type === 'mousedown';
        let button;

        if (down && event.button === 0 && event.ctrlKey && event.shiftKey)
            return;

        switch (event.button) {
            case 0: button = 1; break;
            case 1: button = 2; break;
            case 2: button = 3; break;
            case 3: button = 4; break;
            case 4: button = 5; break;
            default: break;
        }

        this._sendInputEvent('mouse-button', {button: button, pressed: down});
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
            this._sendInputEvent('mouse-wheel', {x: movex, y: movey});
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

            this._sendInputEvent('key', {code: code, pressed: pressed});
        } else if (event.code.startsWith(numpad_key_prefix)) {
            // 1. Use the event.key over event.code for the key code if a key event(digit only) triggered
            // from NumPad when NumLock is detected off The reason here is that event.code always remains
            // the same no matter NumLock is detected on or off. Also Anbox doesn't respect these keycodes
            // since Anbox just propagates those keycodes from client to the container and there is no
            // corresponding input event codes mapping all key codes comming from NumPad.
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
                this._sendInputEvent('key', {code: _keyScancodes[event_code], pressed: pressed});
            } else {
                let attach_shift = false
                if (event_code in _numPadMapper) {
                    if (event_code === "Add" || event_code === "Multiply")
                        attach_shift = true
                    event_code = _numPadMapper[event_code]
                }
                if (attach_shift)
                    this._sendInputEvent('key', {code: _keyScancodes["Shift"], pressed: pressed});
                this._sendInputEvent('key', {code: _keyScancodes[event_code], pressed: pressed});
            }
        }
    };

    _touchEvent(event, eventType) {
        const v = document.getElementById(this._videoID)
        event.preventDefault();
        for (let n = 0; n < event.changedTouches.length; n++) {
            let touch = event.changedTouches[n];
            let id = touch.identifier;
            const videoOffset = v.getBoundingClientRect()
            let x = this._clientToServerX(touch.clientX - videoOffset.left, this._dimensions);
            let y = this._clientToServerY(touch.clientY- videoOffset.top, this._dimensions);
            let e = {id: id, x: x, y: y}
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

    _onTouchStart(event) {this._touchEvent(event, 'touch-start')};
    _onTouchEnd(event) {this._touchEvent(event, 'touch-end')};
    _onTouchCancel(event) {this._touchEvent(event, 'touch-cancel')};
    _onTouchMove(event) {this._touchEvent(event, 'touch-move')};

    _queryGamePadEvents() {
        if (!this._options.controls.gamepad)
            return;
        let gamepads = navigator.getGamepads();
        if (gamepads.length > 0) {
            this._gamepadManager = new _gamepadEventManager(this._sendInputEvent.bind(this));
            this._gamepadManager.startPolling();
        }
    };

    _openMicrophone() {
        // NOTE:
        // 1. We must wait for the audio input stream being added
        // to the peer connection before creating offer, otherwise
        // the remote end won't receive the media track for audio capture.
        // 2. If a user doesn't grant the permission to use microphone
        // we still create offer anyway but capturing the audio data from
        // microphone won't work.
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        })
        .then(this._onAudioInputStreamAvailable.bind(this))
        .catch(e => {
            this._stopStreamingOnError(`failed to open microphone: ${e.name}`);
        })
    }

    _onAudioInputStreamAvailable(stream) {
        this._audioInputStream = stream;
        const audioTracks = this._audioInputStream.getAudioTracks();
        if (audioTracks.length > 0) {
            console.log(`using Audio device: ${audioTracks[0].label}`);
        }
        this._audioInputStream.getTracks().forEach(
            track => this._pc.addTrack(track, this._audioInputStream));

        this._createOffer();
    }

    _createOffer() {
        this._pc.createOffer().then(this._onRtcOfferCreated.bind(this)).catch(function(err) {
            this._stopStreamingOnError(`failed to create offer: ${err}`);
        });
    }

    _nullOrUndef(obj) { return obj === null || obj === undefined };

    _onWsOpen() {
        const config = { iceServers: this._options.stunServers };
        this._pc = new RTCPeerConnection(config);
        this._pc.ontrack = this._onRtcTrack.bind(this);
        this._pc.oniceconnectionstatechange = this._onRtcIceConnectionStateChange.bind(this);
        this._pc.onicecandidate = this._onRtcIceCandidate.bind(this);

        let audio_direction = 'inactive'
        if (this._options.devices.speaker) {
            if (this._options.devices.microphone)
                audio_direction = 'sendrecv'
            else
                audio_direction = 'recvonly'
        }
        this._pc.addTransceiver('audio', {direction: audio_direction})
        this._pc.addTransceiver('video', {direction: 'recvonly'})
        this._controlChan = this._pc.createDataChannel('control');

        if (this._options.devices.microphone)
            this._openMicrophone();
        else
            this._createOffer();
    };

    _onWsClose() {
        if (!this._ready) {
            // When the connection was closed from the gateway side we have to
            // stop the timer here to avoid it triggering when we already
            // terminated our connection
            if (this._timer > 0)
                window.clearTimeout(this._timer);

            this._stopStreamingOnError('Connection was interrupted while connecting');
        }
    };

    _onWsError(event) {
        this._stopStreamingOnError('failed to communicate with backend service');
    };

    _onWsMessage(event) {
        const msg = JSON.parse(event.data);
        if (msg.type === 'answer') {
            this._pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: atob(msg.sdp)}));
        } else if (msg.type === 'candidate') {
            this._pc.addIceCandidate({'candidate': atob(msg.candidate), 'sdpMLineIndex': msg.sdpMLineIndex, 'sdpMid': msg.sdpMid})
        } else {
            console.log('Unknown message type ' + msg.type);
        }
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
                            this._sendInputEvent('gamepad-button', {id: gamepad.index, index: j, pressed: buttons[j].pressed});
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
                                case k < this._dpad_remap_start_index:  // Standard axes
                                    this._sendInputEvent('gamepad-axes', {id: gamepad.index, index: k, value: axes[k]});
                                    break;
                                case k === this._dpad_remap_start_index: // DPAD left and right buttons
                                    if (axes[k] === 0) {}
                                    else if (axes[k] === -1) {
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
                                    if (axes[k] === 0) {}
                                    else if (axes[k] === -1) {
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

class AnboxStreamGatewayConnector {
    _nullOrUndef(obj) { return obj === null || obj === undefined };

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
     * @param [options.session.app] {string} Application name to run. If a sessionID is specifed
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

        if (!this._nullOrUndef(this._options.session.app_version)
            && this._options.session.app_version.length !== 0)
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
        // Fetch all necessary information about the session including its websocket
        // URL with a fresh authentication token
        const rawSessionResp = await fetch(
            this._options.url + '/1.0/sessions/' + this._options.session.id + '/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': 'Macaroon root=' + this._options.authToken,
                'Content-Type': 'application/json',
            }
        });
        if (rawSessionResp === undefined || rawSessionResp.status !== 200)
            throw new Error("Session does not exist anymore");

        var response = await rawSessionResp.json();
        if (response === undefined || response.status !== "success")
            throw new Error(response.error);

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

        response = await rawJoinResp.json();
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

export { AnboxStreamGatewayConnector, AnboxStream };
