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

import {AnboxStream} from './anbox-stream-sdk'

const peerConnectionMock = {
    getConfiguration: () => {
        return {
            'sdpSemantics': 'sdpSemantics',
            'rtcpMuxPolicy': 'rtcpMuxPolicy',
            'bundlePolicy': 'bundlePolicy',
            'iceTransportPolicy': 'iceTransportPolicy',
            'iceCandidatePoolSize': 'iceCandidatePoolSize',
        }
    },

    getStats: () => {
        return new Promise((resolve, reject) => {
            resolve([{
                timestamp: 0,
                type: "inbound-rtp",
                kind: "video",
                mediaType: "video",
                bytesReceived: 1000
            }])
        });
    }
}


const sdkOptions = {}
beforeEach(() => {
    const container = document.createElement('div')
    container.__defineGetter__('clientWidth', () => { return 100 });
    container.__defineGetter__('clientHeight', () => { return 100 });
    container.id = 'foobar'
    document.body.appendChild(container)
    sdkOptions.connector = {
        connect() {},
        disconnect() {}
    }
    sdkOptions.targetElement = 'foobar'
    sdkOptions.foregroundActivity = 'com.bar.foo'
    sdkOptions.enableStats = true

    global.navigator.__defineGetter__('userAgent', () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36');
})

test('bandwidth in mbit/s is correctly calculated', () => {
    const mgr = new AnboxStream(sdkOptions)

    let data = []
    const timestamp = Date.now()
    for (let i = 0; i < 2; i++) {
        data.push({
            "timestamp": timestamp - 1000*(2-i),
            "type": "inbound-rtp",
            "kind": "video",
            "mediaType": "video",
            "bytesReceived": 1000*1000*i,
        });
    }
    for (let i = 0; i < 2; i++) {
        data.push({
            "timestamp": timestamp - 1000*(2-i),
            "type": "inbound-rtp",
            "kind": "audio",
            "mediaType": "audio",
            "bytesReceived": 1000*1000*i
        });
    }
    for (let i = 0; i < 2; i++) {
        data.push({
            "timestamp": timestamp - 1000*(2-i),
            "type": "outbound-rtp",
            "kind": "audio",
            "mediaType": "audio",
            "bytesSent": 1000*1000*i
        });
    }

    let stats = mgr._webrtcManager.getStats()
    expect(stats.video.bandwidthMbit).toEqual(0)
    expect(stats.audioOutput.bandwidthMbit).toEqual(0)
    expect(stats.audioInput.bandwidthMbit).toEqual(0)

    mgr._webrtcManager._processRawStats(data)
    stats = mgr._webrtcManager.getStats()

    expect(stats.video.bandwidthMbit).toEqual(8)
    expect(stats.audioOutput.bandwidthMbit).toEqual(8)
    expect(stats.audioInput.bandwidthMbit).toEqual(8)
})

test('video stats are correctly updated', () => {
    const mgr = new AnboxStream(sdkOptions)

    let data = []
    const timestamp = performance.now()

    // Report #1
    const report = {
        "id":"RTCInboundRTPVideoStream_3466539939",
        "timestamp": timestamp-1000,
        "type":"inbound-rtp",
        "ssrc":3466539939,
        "kind":"video",
        "trackId":"RTCMediaStreamTrack_receiver_24",
        "transportId":"RTCTransport_0_1",
        "codecId":"RTCCodec_1_Inbound_96",
        "mediaType":"video",
        "jitter":0.005,
        "packetsLost":0,
        "packetsReceived":76,
        "bytesReceived":10000,
        "headerBytesReceived":2268,
        "lastPacketReceivedTimestamp":1648381531540,
        "jitterBufferDelay":1.657,
        "jitterBufferEmittedCount":74,
        "framesReceived":75,
        "frameWidth":1280,
        "frameHeight":720,
        "framesPerSecond":60,
        "framesDecoded":75,
        "keyFramesDecoded":1,
        "totalAssemblyTime":1.1,
        "framesDropped":11,
        "totalDecodeTime":0.088,
        "totalInterFrameDelay":1.1860000000000002,
        "totalSquaredInterFrameDelay":0.02213999999999999,
        "decoderImplementation":"libvpx",
        "firCount":1,
        "pliCount":2,
        "nackCount":3,
        "qpSum":1608,
    }
    data.push(Object.assign({}, report))

    // Report #2
    report.timestamp = timestamp
    report.bytesReceived += 20000
    report.framesPerSecond = 50
    report.totalDecodeTime = 2
    report.framesDecoded = 100
    report.jitter = 0.1
    report.jitterBufferDelay = 2
    report.jitterBufferEmittedCount = 100
    report.packetsLost = 5
    report.packetsReceived = 300
    data.push(Object.assign({}, report))


    let stats = mgr._webrtcManager.getStats()
    expect(stats.video.bandwidthMbit).toEqual(0);
    expect(stats.video.totalBytesReceived).toEqual(0);
    expect(stats.video.fps).toEqual(0);
    expect(stats.video.decodeTime).toEqual(0);
    expect(stats.video.jitter).toEqual(0);
    expect(stats.video.avgJitterBufferDelay).toEqual(0);
    expect(stats.video.packetsReceived).toEqual(0);
    expect(stats.video.packetsLost).toEqual(0);
    expect(stats.video.framesDropped).toEqual(0);
    expect(stats.video.framesDecoded).toEqual(0);
    expect(stats.video.framesReceived).toEqual(0);
    expect(stats.video.keyFramesDecoded).toEqual(0);
    expect(stats.video.totalAssemblyTime).toEqual(0);
    expect(stats.video.pliCount).toEqual(0);
    expect(stats.video.firCount).toEqual(0);
    expect(stats.video.nackCount).toEqual(0);
    expect(stats.video.qpSum).toEqual(0);

    mgr._webrtcManager._processRawStats(data)

    expect(stats.video.bandwidthMbit).toEqual(20000 * 8 / 1000 / 1000);
    expect(stats.video.totalBytesReceived).toEqual(30000);
    expect(stats.video.fps).toEqual(50);
    expect(stats.video.decodeTime).toEqual(0.02); // 20ms per frame
    expect(stats.video.jitter).toEqual(0.1);
    expect(stats.video.avgJitterBufferDelay).toEqual(0.02);
    expect(stats.video.packetsReceived).toEqual(300);
    expect(stats.video.packetsLost).toEqual(5);
    expect(stats.video.framesDropped).toEqual(11);
    expect(stats.video.framesDecoded).toEqual(100);
    expect(stats.video.framesReceived).toEqual(75);
    expect(stats.video.keyFramesDecoded).toEqual(1);
    expect(stats.video.totalAssemblyTime).toEqual(1.1);
    expect(stats.video.pliCount).toEqual(2);
    expect(stats.video.firCount).toEqual(1);
    expect(stats.video.nackCount).toEqual(3);
    expect(stats.video.qpSum).toEqual(1608);
})

test('audio output stats are correctly updated', () => {
    const mgr = new AnboxStream(sdkOptions)

    let data = []
    const timestamp = performance.now()

    // Report #1
    const report = {
        "id":"RTCInboundRTPAudioStream_69147891",
        "timestamp": timestamp-1000,
        "type":"inbound-rtp",
        "ssrc":69147891,
        "kind":"audio",
        "trackId":"RTCMediaStreamTrack_receiver_23",
        "transportId":"RTCTransport_0_1",
        "mediaType":"audio",
        "jitter":0.005,
        "packetsLost":0,
        "packetsReceived":76,
        "bytesReceived":10000,
        "headerBytesReceived":2268,
        "lastPacketReceivedTimestamp":1648381531540,
        "jitterBufferDelay":1.657,
        "jitterBufferEmittedCount":74,
        "totalSamplesReceived":0,
        "concealedSamples":0,
        "silentConcealedSamples":0,
        "concealmentEvents":0,
        "insertedSamplesForDeceleration":0,
        "removedSamplesForAcceleration":0,
        "totalAudioEnergy":0,
        "totalSamplesDuration":0
    }
    data.push(Object.assign({}, report))

    // Report #2
    report.timestamp = timestamp
    report.bytesReceived += 20000
    report.totalSamplesReceived = 100
    report.jitter = 0.1
    report.jitterBufferDelay = 2
    report.jitterBufferEmittedCount = 100
    data.push(Object.assign({}, report))

    let stats = mgr._webrtcManager.getStats()
    expect(stats.audioOutput.bandwidthMbit).toEqual(0)
    expect(stats.audioOutput.totalBytesReceived).toEqual(0)
    expect(stats.audioOutput.totalSamplesReceived).toEqual(0)
    expect(stats.audioOutput.jitter).toEqual(0)
    expect(stats.audioOutput.avgJitterBufferDelay).toEqual(0)
    expect(stats.audioOutput.packetsReceived).toEqual(0)
    expect(stats.audioOutput.packetsLost).toEqual(0)

    mgr._webrtcManager._processRawStats(data)

    expect(stats.audioOutput.bandwidthMbit).toEqual(20000 * 8 / 1000 / 1000);
    expect(stats.audioOutput.totalBytesReceived).toEqual(30000);
    expect(stats.audioOutput.totalSamplesReceived).toEqual(100);
    expect(stats.audioOutput.jitter).toEqual(0.1);
    expect(stats.audioOutput.avgJitterBufferDelay).toEqual(0.02);
})


test('audio input stats are correctly updated', () => {
    const mgr = new AnboxStream(sdkOptions)

    let data = []
    const timestamp = performance.now()

    // Report #1
    const report = {
        "id":"RTCOutboundRTPAudioStream_69147891",
        "timestamp": timestamp-1000,
        "type":"outbound-rtp",
        "ssrc":69147891,
        "kind":"audio",
        "trackId":"RTCMediaStreamTrack_receiver_23",
        "transportId":"RTCTransport_0_1",
        "mediaType":"audio",
        "jitter":0.005,
        "packetsLost":0,
        "packetsSent":76,
        "bytesSent":10000,
    }
    data.push(Object.assign({}, report))

    // Report #2
    report.timestamp = timestamp
    report.bytesSent += 20000

    data.push(Object.assign({}, report))

    let stats = mgr._webrtcManager.getStats()
    expect(stats.audioInput.bandwidthMbit).toEqual(0)
    expect(stats.audioInput.totalBytesSent).toEqual(0)

    mgr._webrtcManager._processRawStats(data)

    expect(stats.audioInput.bandwidthMbit).toEqual(20000 * 8 / 1000 / 1000);
    expect(stats.audioInput.totalBytesSent).toEqual(30000);
})


test('stat callback is called', (done) => {
    sdkOptions.callbacks = {
        statsUpdated: (stats) => {
            expect(stats.video.totalBytesReceived).toEqual(1000)
            done()
        }
    }

    const mgr = new AnboxStream(sdkOptions)
    mgr._webrtcManager._pc = peerConnectionMock
    mgr._webrtcManager._startStatsUpdater()
})

test('stats overlay is properly displayed', () => {
    const mgr = new AnboxStream(sdkOptions)
    const overlayContainer = document.createElement("div")
    overlayContainer.id = 'stat-overlay'
    document.body.appendChild(overlayContainer)

    mgr._webrtcManager._statsOverlayID = overlayContainer.id
    mgr._webrtcManager.showStatsOverlay()
    expect(document.getElementById(overlayContainer.id + '_child')).not.toBeNull()

    mgr._webrtcManager.hideStatsOverlay()
    expect(document.getElementById(overlayContainer.id + '_child')).toBeNull()

    mgr._webrtcManager.showStatsOverlay()
    mgr._webrtcManager._processRawStats([{
        "timestamp": 1234,
        "type":"inbound-rtp",
        "kind":"video",
        "mediaType":"video",
        "jitter":0.005,
        "packetsLost":0,
        "packetsReceived":76,
        "bytesReceived":1000000,
        "jitterBufferDelay":1.657,
        "jitterBufferEmittedCount":74,
        "framesReceived":75,
        "framesPerSecond":60,
        "framesDecoded":75,
        "framesDropped":0,
        "totalAssemblyTime": 1.1,
        "totalDecodeTime":0.088,
    }])
    mgr._webrtcManager._refreshStatsOverlay()
    const overlay = document.getElementById(overlayContainer.id + '_child')
    expect(overlay).not.toBeNull()
    expect(overlay.childNodes.length).toBeGreaterThan(1)
    expect(overlay.innerHTML).toContain('totalBytesReceived: 1.00 MB')
    expect(overlay.innerHTML).toContain('bandWidth: 8.00 Mbit/s')
})
