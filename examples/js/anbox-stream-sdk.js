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
        this._statsID = 'anbox-stream-stats-' + this._id;

        // WebRTC
        this._ws = null; // WebSocket
        this._pc = null; // PeerConnection
        this._controlChan = null; // Channel to send inputs
        this._timedout = false;
        this._timer = -1;
        this._disconnectedTimer = -1;
        this._ready = false;
        this._signalingFailed = false;
        this._sessionID = "";
        this._allowAccessCamera = false;
        this._allowAccessMicrophone = false;

        // Media streams
        this._videoStream = null;
        this._audioStream = null;
        this._audioInputStream = null;
        this._videoInputStream = null;

        // Control options
        this._modifierState = 0;
        this._dimensions = null;
        this._gamepadManager = null;
        this._lastTouchMoves = [];
        this._coordConverter = null;
        this._touchEventProcessor = null;

        // Stats
        this._showStats = false;
        this._statsTimerId = -1;
        this._timeElapse = 0;
        this._stats = {
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
            network: {
                currentRtt: 0,
                networkType: "",
                transportType: "",
                localCandidateType: "",
                remoteCandidateType: ""
            },
            audioInput: {
                bandwidthMbit: 0,
                totalBytesSent: 0,
            },
            audioOutput: {
                bandwidthMbit: 0,
                totalBytesReceived: 0,
                jitter: 0,
                avgJitterBufferDelay: 0,
                totalSamplesReceived: 0,
                packetsReceived: 0,
                packetsLost: 0
            },
            rtcConfig: {
                bundlePolicy: "",
                rtcpMuxPolicy: "",
                sdpSemantics: "",
                iceTransportPolicy: "",
                iceCandidatePoolSize: ""
            }
        }


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

        this._createMedia()

        let session = {};
        try {
            session = await this._options.connector.connect()
        } catch (e) {
            this._stopStreamingOnError('connector failed to connect: ' + e.message);
            return
        }

        this._sessionID = session.id

        if (session.websocket === undefined || session.websocket.length === 0) {
            this._stopStreamingOnError('connector did not return any signaling information');
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
     * Show overall statistics in an overlay during the streaming.
     */
    showStatistics(enabled) {
        if (!enabled) {
            let stats = document.getElementById(this._statsID);
            if (stats)
                stats.replaceChildren();
        }

        this._showStats = enabled;
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
            options.callbacks.requestCameraAccess = () => { return false };

        if (this._nullOrUndef(options.callbacks.requestMicrophoneAccess))
            options.callbacks.requestMicrophoneAccess = () => { return false };

        if (this._nullOrUndef(options.disableBrowserBlock))
            options.disableBrowserBlock = false;

        if (this._nullOrUndef(options.foregroundActivity))
            options.foregroundActivity = "";

        if (this._nullOrUndef(options.showStatistics))
            options.showStatistics = false;
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

        if (options.foregroundActivity.length > 0 &&
            !_activityNamePattern.test(options.foregroundActivity))
            throw new Error('invalid foreground activity name');
    }

    _createMedia() {
        let mediaContainer = document.getElementById(this._containerID);

        const stats = document.createElement('div');
        stats.id = this._statsID;
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
        mediaContainer.appendChild(stats);

        const video = document.createElement('video');
        video.style.margin = "0";
        video.style.height = "auto";
        video.style.width = "auto";
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

    _insertMediaSource(videoSource, audioSource) {
        this._ready = true;

        const video = document.getElementById(this._videoID);
        video.srcObject = videoSource;

        if (this._options.devices.speaker) {
            const audio = document.getElementById(this._audioID);
            audio.srcObject = audioSource;
        }
    };

    _removeMedia() {
        const video = document.getElementById(this._videoID);
        const audio = document.getElementById(this._audioID);
        const stats = document.getElementById(this._statsID);

        if (video)
            video.remove();
        if (audio)
            audio.remove();
        if (stats)
            stats.remove();
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

        if (this._videoInputStream)
            this._videoInputStream.getTracks().forEach(track => track.stop());

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
            this._insertMediaSource(this._videoStream, this._audioStream);
            this._startStatsUpdater();
            this._options.callbacks.ready(this._sessionID);
        }
    };

    _refreshStatistics() {
        let stats = document.getElementById(this._statsID);

        stats.replaceChildren();
        const insertHeader = (title) => {
            let textNode = document.createTextNode(`${title}`);
            stats.appendChild(textNode);

            let lineBreak = document.createElement("br");
            stats.appendChild(lineBreak);
        };

        const insertStat = (type, value) => {
            let textNode = document.createTextNode(`    ${type}: ${value}`);
            stats.appendChild(textNode);

            let lineBreak = document.createElement("br");
            stats.appendChild(lineBreak);
        };

        const mbits_format = (v) => {
            return (v * 8 / 1000 / 1000).toFixed(2) + " Mbit/s"
        }

        const mb_format = (v) => {
            return (v / 1000 / 1000).toFixed(2) + " MB"
        }

        const ms_format = (v) => {
            return (v * 1000).toFixed(2) + " ms"
        }

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

    _startStatsUpdater() {
        if (this._nullOrUndef(this._options.callbacks.statsUpdated))
            return

        let pc_conf = this._pc.getConfiguration();
        if (pc_conf) {
          if ("sdpSemantics" in pc_conf)
              this._stats.rtcConfig.sdpSemantics = pc_conf.sdpSemantics

          if ("rtcpMuxPolicy" in pc_conf)
              this._stats.rtcConfig.rtcpMuxPolicy = pc_conf.rtcpMuxPolicy

          if ("bundlePolicy" in pc_conf)
              this._stats.rtcConfig.bundlePolicy = pc_conf.bundlePolicy

          if ("iceTransportPolicy" in pc_conf)
              this._stats.rtcConfig.iceTransportPolicy = pc_conf.iceTransportPolicy

          if ("iceCandidatePoolSize" in pc_conf)
              this._stats.rtcConfig.iceCandidatePoolSize = pc_conf.iceCandidatePoolSize
        }

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
                                            this._stats.audioInput.totalBytesSent = bytesSent;
                                        }
                                    } else {
                                        if ("bytesReceived" in report) {
                                            let bytesReceived = report["bytesReceived"];
                                            let diff = 0;
                                            if (this._stats.audioOutput.totalBytesReceived > bytesReceived)
                                                diff = bytesReceived;
                                            else
                                                diff = bytesReceived - this._stats.audioOutput.totalBytesReceived;

                                            this._stats.audioOutput.bandwidthMbit = diff;
                                            this._stats.audioOutput.totalBytesReceived = bytesReceived;
                                        }
                                    }
                                }
                            }
                        } else if (statName === "type" && report["type"] === "candidate-pair") {
                            if ("nominated" in report && report["nominated"] &&
                                "state" in report && report["state"] === "succeeded" &&
                                "currentRoundTripTime" in report) {
                                this._stats.network.currentRtt = report["currentRoundTripTime"];
                           }
                           let network = this._stats.network
                           if (network.networkType === "" ||
                               network.transportType === "" ||
                               network.localCandidateType === "" ||
                               network.remoteCandidateType === "") {
                               if (report["nominated"] && report["state"] === "succeeded") {
                                   var localCandidateId = report["localCandidateId"];
                                   var remoteCandidateId = report["remoteCandidateId"];
                                   stats.forEach(stat => {
                                       if (stat.id === localCandidateId) {
                                           this._stats.network.localCandidateType = stat.candidateType
                                           this._stats.network.networkType = stat.networkType
                                       }
                                       if (stat.id === remoteCandidateId) {
                                           this._stats.network.remoteCandidateType = stat.candidateType
                                           this._stats.network.transportType = stat.protocol
                                       }
                                   })
                               }
                           }
                        } else if (statName === "type" && report["type"] === "inbound-rtp") {
                            if (report["kind"] === "video") {
                                 if ("framesDecoded" in report)
                                      this._stats.video.fps = Math.round(report["framesDecoded"] / this._timeElapse);
                                 if ("totalDecodeTime" in report && "framesDecoded" in report && report["framesDecoded"] !== 0)
                                      this._stats.video.decodeTime = report["totalDecodeTime"] / report["framesDecoded"];
                                 if ("packetsLost" in report)
                                      this._stats.video.packetsLost = report["packetsLost"]
                                 if ("packetsReceived" in report)
                                      this._stats.video.packetsReceived = report["packetsReceived"]
                                 if ("jitter" in report)
                                      this._stats.video.jitter = report["jitter"]
                                 if ("jitterBufferDelay" in report && "jitterBufferEmittedCount" in report && report["jitterBufferEmittedCount"] !== 0)
                                      this._stats.video.avgJitterBufferDelay = report["jitterBufferDelay"] / report["jitterBufferEmittedCount"]
                            } else if (report["kind"] === "audio") {
                                 if ("totalSamplesReceived" in report)
                                      this._stats.audioOutput.totalSamplesReceived = report["totalSamplesReceived"]
                                 if ("packetsLost" in report)
                                      this._stats.audioOutput.packetsLost = report["packetsLost"]
                                 if ("packetsReceived" in report)
                                      this._stats.audioOutput.packetsReceived = report["packetsReceived"]
                                 if ("jitter" in report)
                                      this._stats.audioOutput.jitter = report["jitter"]
                                 if ("jitterBufferDelay" in report && "jitterBufferEmittedCount" in report && report["jitterBufferEmittedCount"] !== 0)
                                      this._stats.audioOutput.avgJitterBufferDelay = report["jitterBufferDelay"] / report["jitterBufferEmittedCount"]
                            }
                        }
                    });
                });
            });

            if (this._showStats)
                this._refreshStatistics()

            this._options.callbacks.statsUpdated(this._stats);
        },
        // TODO: enable stats update interval configurable
        1000);
    }

    _onConnectionTimeout() {
        this._disconnectedTimer = -1;
        this._stopStreamingOnError('lost WebRTC connection');
    }

    _onRtcIceConnectionStateChange() {
        if (this._pc === null)
            return;

        if (this._pc.iceConnectionState === 'failed') {
            this._stopStreamingOnError('failed to establish a WebRTC connection via ICE');
        } else if (this._pc.iceConnectionState === 'disconnected') {
            // When we end up here the connection may not have closed but we
            // just have a temorary network problem. We wait for a moment and
            // if the connection isn't restablished we stop streaming
            this._disconnectedTimer = window.setTimeout(this._onConnectionTimeout.bind(this), 10 * 1000);
        } else if (this._pc.iceConnectionState === 'closed') {
            if (this._timedout) {
                this._stopStreamingOnError('timed out to establish a WebRTC connection as signaler did not respond');
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

    _registerControls() {
        window.addEventListener('resize', this._onResize)

        const v = document.getElementById(this._videoID)
        this._coordConverter = new _coordinateConverter()
        this._touchEventProcessor = new TouchEventProcessor(v)

        if (this._options.controls.mouse) {
            const video = document.getElementById(this._videoID);
            if (video) {
                for (const controlName in this.controls.touch)
                    video.addEventListener(controlName, this.controls.touch[controlName]);
            }
        }

        this.captureKeyboard()
    };


    captureKeyboard() {
        if (this._options.controls.keyboard) {
            for (const controlName in this.controls.keyboard)
                window.addEventListener(controlName, this.controls.keyboard[controlName]);
        }
    }

    releaseKeyboard() {
        if (this._options.controls.keyboard) {
            for (const controlName in this.controls.keyboard)
                window.removeEventListener(controlName, this.controls.keyboard[controlName]);
        }
    }

    sendIMECommittedText(text) {
        const data = {text: text}
        this._sendIMEMessage(_imeEventType.Text, data)
    };

    sendIMEComposingText(text) {
        const data = {text: text}
        this._sendIMEMessage(_imeEventType.ComposingText, data)
    };

    sendIMETextDeletion(counts) {
        if (counts <= 0)
            return;
        this._sendIMECode(_android_KEYCODE_DEL, counts);
    };

    sendIMEAction(name, params) {
        if (typeof params === 'undefined')
            params = "";
        const data = {name: name, params: params}
        this._sendIMEMessage(_imeEventType.Action, data);
    };

    sendIMEComposingRegion(start, end) {
        if (start < 0 || start > end)
            return;
        const data = {start: start, end: end}
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

        // Video elements cannot contain elements inside hence adjust overlay
        // and align stats overlay to on the left edge of video element after resizing
        const stats = document.getElementById(this._statsID)
        if (stats) {
            const statsMargin = 15
            stats.style.left = (this._dimensions.containerOffsetX + statsMargin).toString() + "px"
            stats.style.top = (this._dimensions.containerOffsetY + statsMargin).toString() + "px"
        }
    }

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

   _sendIMECode(code, times) {
        const data = {code: code, times: times}
        this._sendIMEMessage(_imeEventType.Keycode, data)
   }

    _sendIMEMessage(imeEventType, imeData) {
        if (this._pc === null || this._controlChan.readyState !== 'open')
            return;
        const data = {type: imeEventType, data: imeData}
        this._controlChan.send(JSON.stringify({type: 'input::ime-event', data: data}));
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
        const pos = this._coordConverter.convert(
          {x: event.offsetX, y: event.offsetY}, this._dimensions)
        this._sendInputEvent('mouse-move', {x: pos.x, y: pos.y,
          rx: event.movementX, ry: event.movementY});
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
        event.preventDefault();
        for (let n = 0; n < event.changedTouches.length; n++) {
            const e = this._touchEventProcessor.process(
              event.changedTouches, n, this._dimensions)
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

    _onMessageReceived(event) {
        const msg = JSON.parse(event.data);
        if (msg.type === "open-camera") {
            if (this._allowAccessCamera || this._options.callbacks.requestCameraAccess()) {
                const spec = JSON.parse(msg.data);
                this._openCamera(spec);
            }
        } else if (msg.type === "close-camera") {
            this._closeCamera();
        } else if (msg.type === "enable-microphone") {
            if (this._allowAccessMicrophone || this._options.callbacks.requestMicrophoneAccess()) {
                const spec = JSON.parse(msg.data);
                this._enableMicrophone(spec);
            }
        } else if (msg.type === "disable-microphone") {
            this._disableMicrophone();
        } else {
            this._options.callbacks.messageReceived(msg.type, msg.data);
        }
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
            this._stopStreamingOnError(`failed to open microphone: ${e.name}`);
        })
    }

    _onVideoInputStreamAvailable(stream) {
        this._videoInputStream = stream;
        this._videoInputStream.getTracks().forEach(
            track => this._pc.addTrack(track, stream));
    }

    _onRealAudioInputStreamAvailable(stream) {
      // Replace the existing dummy video stream with the real audio input stream
      const kind = stream.getAudioTracks()[0].kind;
      this._replaceTrack(stream, kind);
      this._audioInputStream = stream;
      this._allowAccessMicrophone = true;
    }

    _onRealVideoInputStreamAvailable(stream) {
        // Replace the existing dummy video stream with the real camera video stream
        const kind = stream.getVideoTracks()[0].kind;
        this._replaceTrack(stream, kind);
        this._videoInputStream = stream;
        this._allowAccessCamera = true;
    }

    _openCamera(spec) {
        const resolution = spec["resolution"]
        const facingMode = spec["facing-mode"] === "front" ? "user": "environment"
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
        .catch(e => {
            this._options.callbacks.error(
              new Error(`failed to open camera: ${e.name}`));
        })
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

    _createDummyStream() {
        // Create a dummy audio and video tracks before creating an offer
        // This enables pc connection to switch to real audio and video streams
        // captured from microphone and camera later when opening the those
        // devices without re-negotiation.
        let tracks = [];
        if (this._options.devices.camera) {
            let video_track = this._createDummyVideoTrack();
            tracks.push(video_track);
        }
        if (this._options.devices.microphone) {
            let audio_track = this._createDummyAudioTrack();
            tracks.push(audio_track);
        }
        if (tracks.length === 0)
            return null;

        return new MediaStream(tracks);
    }

    _createDummyAudioTrack() {
        let ctx = new AudioContext(), oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        return Object.assign(dst.stream.getAudioTracks()[0], {enabled: false});
    }

    _createDummyVideoTrack() {
        const container = document.getElementById(this._containerID);
        const width = container.clientWidth;
        const height = container.clientHeight;
        let canvas = Object.assign(document.createElement("canvas"), {width, height});
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], {enabled: false});
    }

    _replaceTrack(stream, kind) {
        this._pc.getSenders()
            .filter(sender => (sender.track !== null && sender.track.kind === kind))
            .map(sender => {
                return sender.replaceTrack(stream.getTracks().find(
                  t => t.kind === sender.track.kind));
            });
    }

    _createOffer() {
        let dummy_stream = this._createDummyStream();
        if (dummy_stream != null) {
            this._onVideoInputStreamAvailable(dummy_stream);
        }

        this._pc.createOffer().then(this._onRtcOfferCreated.bind(this)).catch(function(err) {
            this._stopStreamingOnError(`failed to create WebRTC offer: ${err}`);
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
        if (this._options.devices.camera) {
            this._pc.addTransceiver('video', {direction: 'sendonly'})
        }
        this._pc.addTransceiver('video', {direction: 'recvonly'})
        this._controlChan = this._pc.createDataChannel('control');
        this._controlChan.addEventListener('message', this._onMessageReceived.bind(this));

        if (this._options.foregroundActivity.length > 0) {
            let msg = {
              type: 'settings',
              foreground_activity: this._options.foregroundActivity,
            };
            this._ws.send(JSON.stringify(msg));
        }

        this._createOffer();
    };

    _onWsClose() {

        if (!this._ready || !this._signalingFailed) {
            // When the connection was closed from the gateway side we have to
            // stop the timer here to avoid it triggering when we already
            // terminated our connection
            if (this._timer > 0)
                window.clearTimeout(this._timer);
        }

        if (!this._ready && !this._signalingFailed) {
            this._stopStreamingOnError('connection to signaler was interrupted while trying to establish a WebRTC connection');
        }
    };

    _onWsError(event) {
        this._stopStreamingOnError('failed to communicate with the signaler');
    };

    _onWsMessage(event) {
        const msg = JSON.parse(event.data);
        if (msg.type === 'answer') {
            this._pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: atob(msg.sdp)}));
        } else if (msg.type === 'candidate') {
            this._pc.addIceCandidate({'candidate': atob(msg.candidate), 'sdpMLineIndex': msg.sdpMLineIndex, 'sdpMid': msg.sdpMid});
        } else if (msg.type === 'error') {
            this._signalingFailed = true;
            this._stopStreamingOnError(msg.message);
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

class _coordinateConverter {
    convert(pos, dimensions) {
        const x = this._clientToServerX(pos.x, dimensions);
        const y = this._clientToServerY(pos.y, dimensions);
        return {x: x, y: y}
    };

    _clientToServerX(clientX, d) {
        let serverX = Math.round((clientX - d.containerOffsetX) * d.scalingFactorX);
        if (serverX > d.frameW) serverX = d.frameW;
        if (serverX < 0) serverX = 0;
        return serverX;
    };

    _clientToServerY(clientY, d) {
        let serverY = Math.round((clientY - d.containerOffsetY) * d.scalingFactorY);
        if (serverY > d.frameH) serverY = d.frameH;
        if (serverY < 0) serverY = 0;
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

const _android_KEYCODE_DEL = 67
const _activityNamePattern = /(^([A-Za-z]{1}[A-Za-z\d_]*\.){2,}|^(\.){1})[A-Za-z][A-Za-z\d_]*$/

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

class TouchEventProcessor {
    _nullOrUndef(obj) { return obj === null || obj === undefined };

    /**
     * TouchEventProcessor processes and convert to the valid touch events
     * that Anbox Platform WebRTC accepts.
     */
    constructor(video) {
        if (this._nullOrUndef(video))
            throw new Error('missing video element');
        this._video = video;
        this._coordConverter = new _coordinateConverter();
    }

    process(touches, index, dimensions) {
        const touch = touches[index]
        let id = touch.identifier;
        // FIXME: On iOS(Safari), unlike Chrome, each touch event has a fixed identifier (e.g 0, 1)
        // to differentiate touch point when multiple touch events are processed at the same time,
        // the touch.identifier on iOS is a unique natural number increase/decrease progressively,
        // so it can be a negative/positive number/zero. However the input event to be sent to Android
        // that bind with the id is ABS_MT_SLOT, which the minimum value of the ABS_MT_SLOT axis must
        // be 0. In this case, we use the index instead, which could mess up touch sequence a bit
        // on multi touches, but fix the broken touch input system.
        if (id < 0 || id > touches.length - 1)
            id = index

        const videoOffset = this._video.getBoundingClientRect()
        const pos = this._coordConverter.convert(
          {x: touch.clientX - videoOffset.left,
           y: touch.clientY - videoOffset.top}, dimensions)
        return {id: id, x: pos.x, y: pos.y}
    };
}

window.AnboxStreamGatewayConnector = AnboxStreamGatewayConnector;
window.AnboxStream = AnboxStream;
export { AnboxStreamGatewayConnector, AnboxStream, TouchEventProcessor };
