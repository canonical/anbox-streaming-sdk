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

const mockGetUserMedia = jest.fn(async () => {})

const peerConnectionMock = {
  createDataChannel: (name) => {
      return {
        onmessage:{},
        onerror:{},
        onclose:{},
        onopen: {},
        send: jest.fn((data) => {}),
        readyState: "open"
      }
  }
}

Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
        getUserMedia: mockGetUserMedia,
    },
})

const sdkOptions = {}
beforeEach(() => {
    const container = document.createElement('div')
    container.id = 'foobar'
    container.__defineGetter__('clientWidth', () => { return 100 });
    container.__defineGetter__('clientHeight', () => { return 100 });
    document.body.appendChild(container)
    sdkOptions.connector = {
        connect() {},
        disconnect() {}
    }
    sdkOptions.targetElement = 'foobar'
    sdkOptions.foregroundActivity = 'com.bar.foo'

    global.navigator.__defineGetter__('userAgent', () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36');
})

test('request camera callback is called', () => {
    const mockWindowConfirm = jest.fn(() => true);

    sdkOptions.callbacks = {
        requestCameraAccess: () => {
            return mockWindowConfirm()
        }
    }
    const stream = new AnboxStream(sdkOptions)
    stream._webrtcManager._onRealVideoInputStreamAvailable = jest.fn()

    let cameraSpec = {}
    cameraSpec['resolution']={
      resolution: { 
        width: 1280,
        height: 720
      }}
    cameraSpec['facing-mode']="user"
    cameraSpec['frame-rate']=30
    const msg = JSON.stringify({
      type: "open-camera", 
      data: JSON.stringify(cameraSpec)
    })
    stream._webrtcManager._onControlMessageReceived({data: msg})
    expect(mockWindowConfirm).toHaveBeenCalled();
})

test('request microphone callback is called', () => {
    const mockWindowConfirm = jest.fn(() => true);

    sdkOptions.callbacks = {
        requestMicrophoneAccess: () => {
            return mockWindowConfirm()
        }
    }
    const stream = new AnboxStream(sdkOptions)
    stream._webrtcManager._onRealAudioInputStreamAvailable = jest.fn()

    let audioSpec = {}
    audioSpec['freq']=44100
    audioSpec["channels"]=2
    audioSpec['samples']=512
    const msg = JSON.stringify({
      type: "enable-microphone", 
      data: JSON.stringify(audioSpec)
    })
    stream._webrtcManager._onControlMessageReceived({data: msg})
    expect(mockWindowConfirm).toHaveBeenCalled();
})

test('open IME message is received', (done) => {
    const stream = new AnboxStream(sdkOptions)
    stream._webrtcManager._onIMEStateChanged = jest.fn((visible) => {
        expect(visible).toEqual(true);
        done()
    })

    let msg = JSON.stringify({
      type: "show-ime", 
    })
    stream._webrtcManager._onControlMessageReceived({data: msg})
})

test('close IME message is received', (done) => {
    const stream = new AnboxStream(sdkOptions)
    stream._webrtcManager._onIMEStateChanged = jest.fn((visible) => {
        expect(visible).toEqual(false);
        done()
    })

    let msg = JSON.stringify({
      type: "hide-ime", 
    })
    stream._webrtcManager._onControlMessageReceived({data: msg})
})

test('custom message callback is called', (done) => {
    const mockMessageProcessing = jest.fn((type, data) => {
        expect(type).toEqual("action");
        expect(data).toEqual("open-settings");
        done();
    });

    sdkOptions.callbacks = {
        messageReceived: (type, data) => {
            return mockMessageProcessing(type, data)
        }
    }
    const stream = new AnboxStream(sdkOptions)
    const msg = JSON.stringify({
      type: "action", 
      data: "open-settings"
    })
    stream._webrtcManager._onControlMessageReceived({data: msg})
    expect(mockMessageProcessing).toHaveBeenCalled();
})

test('can send data over data channel', () => {
  sdkOptions.dataChannels = {
    "foo": {
      callbacks: { message: (data) => {} }
    }
  }
  const stream = new AnboxStream(sdkOptions)
  stream._webrtcManager._pc = peerConnectionMock
  stream._webrtcManager._createDataChannels()
  expect(stream.sendData("foo", "data")).toEqual(true);
  expect(stream._webrtcManager._dataChans['foo'].send).toHaveBeenCalledTimes(1);
})

test('can send data over multiple data channels', () => {
  sdkOptions.dataChannels = {
    "foo": {
      callbacks: { message: (data) => {} }
    },
    "bar": {
      callbacks: { message: (data) => {} }
    },
  }

  const stream = new AnboxStream(sdkOptions)
  stream._webrtcManager._pc = peerConnectionMock
  stream._webrtcManager._createDataChannels()
  expect(stream.sendData("foo", "data")).toEqual(true);
  expect(stream.sendData("bar", "data")).toEqual(true);
  expect(stream._webrtcManager._dataChans['foo'].send).toHaveBeenCalledTimes(1);
  expect(stream._webrtcManager._dataChans['bar'].send).toHaveBeenCalledTimes(1);
})

test('can not send data when data channel does not exist', () => {
  sdkOptions.dataChannels = {
    "foo": {
      callbacks: {
        open: () => {},
        message: (data) => {}
      }
    }
  }
  const stream = new AnboxStream(sdkOptions)
  stream._webrtcManager._pc = peerConnectionMock
  stream._webrtcManager._createDataChannels()
  expect(stream.sendData("bar", "data")).toEqual(false);
})

test('custom message callback is called', (done) => {
  sdkOptions.dataChannels = {
    "foo": {
      callbacks: {
        message: jest.fn((data) => {
          expect(data).toEqual("foo_text");
          done();
        }),
        error: jest.fn((errMessage) => {
          expect(errMessage).toEqual("data channel is closed");
        }),
        open: jest.fn(() => {}),
        close: jest.fn(() => {}),
      }
    },
    "bar": {
      callbacks: {
        message: jest.fn((data) => {
          expect(data).toEqual("bar_text");
          done();
        }),
        error: jest.fn((errMessage) => {
          expect(errMessage).toEqual("data transfer interrupted");
        }),
        open: jest.fn(() => {}),
        close: jest.fn(() => {}),
      }
    }
  }

  let chans = []
  const pcMock = {
    createDataChannel: (name) => {
      let chan = {
        onmessage: (event) => {},
        onerror:{},
        onclose:{},
        onopen: {},
      }

      chans.push(chan)
      return chan
    }
  }

  const stream = new AnboxStream(sdkOptions)
  stream._webrtcManager._pc = pcMock
  stream._webrtcManager._createDataChannels()

  // For `bar` data channel
  chans[1].onopen()
  expect(sdkOptions.dataChannels['bar'].callbacks.open).toHaveBeenCalledTimes(1);

  chans[1].onclose()
  expect(sdkOptions.dataChannels['bar'].callbacks.close).toHaveBeenCalledTimes(1);

  let error = {
    error: { message: "data transfer interrupted" }
  }
  chans[1].onerror(error)

  let event = { data: "bar_text" }
  chans[1].onmessage(event)

  // For `foo` data channel
  chans[0].onopen()
  expect(sdkOptions.dataChannels['foo'].callbacks.open).toHaveBeenCalledTimes(1);

  chans[0].onclose()
  expect(sdkOptions.dataChannels['foo'].callbacks.close).toHaveBeenCalledTimes(1);

  error = {
    error: { message: "data channel is closed" }
  }
  chans[0].onerror(error)

  event = { data: "foo_text" }
  chans[0].onmessage(event)
})
