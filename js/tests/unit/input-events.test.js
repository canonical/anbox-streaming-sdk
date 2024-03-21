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

import { AnboxStream } from './anbox-stream-sdk'

// PointerEvent is not available in JSDom, we have to provide a polyfill
// see https://github.com/jsdom/jsdom/pull/2666
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, params) {
      super(type, params);
      this.pointerId = params.pointerId;
      this.width = params.width;
      this.height = params.height;
      this.pressure = params.pressure;
      this.tangentialPressure = params.tangentialPressure;
      this.tiltX = params.tiltX;
      this.tiltY = params.tiltY;
      this.pointerType = params.pointerType;
      this.isPrimary = params.isPrimary;
    }
  }
  global.PointerEvent = PointerEvent;
}

const sdkOptions = {}
function setupStream(sdkOptions) {
  let stream = new AnboxStream(sdkOptions)

  const video = document.createElement('video')
  video.id = stream._videoID
  video.__defineGetter__('videoWidth', () => 500);
  video.__defineGetter__('videoHeight', () => 1000);
  let container = document.getElementById('foobar')
  container.appendChild(video)
  // Once resized, the video element should have videoWidth = 1000 and videoHeight = 2000
  // with a 500px offset on the left.
  stream._onResize()

  return stream
}

beforeEach(() => {
  const container = document.createElement('div')
  container.__defineGetter__('clientWidth', () => 2000);
  container.__defineGetter__('clientHeight', () => 2000);
  container.id = 'foobar'
  document.body.appendChild(container)
  sdkOptions.connector = {connect() {}, disconnect() {}}
  sdkOptions.targetElement = 'foobar'
  sdkOptions.controls = {emulateTouch: false}
  global.navigator.__defineGetter__('maxTouchPoints', () => 5)
  global.navigator.__defineGetter__('userAgent', () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36');
})

test('rotated touch events are properly translated', () => {
  let stream = setupStream(sdkOptions)

  stream._dimensions = {playerWidth: 500, playerHeight: 1000}
  stream._currentRotation = 0
  let coord = stream._convertTouchInput(0, 0)
  expect(coord).toEqual({x: 0, y: 0})

  stream._dimensions = {playerWidth: 1000, playerHeight: 500}
  stream._currentRotation = 90
  coord = stream._convertTouchInput(1000, 0)
  expect(coord).toEqual({x: 0, y: 0})

  stream._dimensions = {playerWidth: 500, playerHeight: 1000}
  stream._currentRotation = 180
  coord = stream._convertTouchInput(500, 1000)
  expect(coord).toEqual({x: 0, y: 0})

  stream._dimensions = {playerWidth: 1000, playerHeight: 500}
  stream._currentRotation = 270
  coord = stream._convertTouchInput(0, 500)
  expect(coord).toEqual({x: 0, y: 0})
})

test('can process keyboard events', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()

  // Check disabled key combinations
  window.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyR', ctrlKey: true}))
  window.dispatchEvent(new KeyboardEvent('keydown', {code: 'F5'}))
  window.dispatchEvent(new KeyboardEvent('keydown', {code: 'F5', ctrlKey: true}))
  window.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyI', ctrlKey: true, shiftKey: true}))
  window.dispatchEvent(new KeyboardEvent('keydown', {code: 'F11'}))
  window.dispatchEvent(new KeyboardEvent('keydown', {code: 'F12'}))
  expect(mockFn.mock.calls.length).toEqual(0)

  window.dispatchEvent(new KeyboardEvent('keydown', {'code': 'KeyQ'}))
  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::key')
  expect(mockFn.mock.calls[0][1]).toEqual({code: 20, pressed: true})

  window.dispatchEvent(new KeyboardEvent('keyup', {'code': 'KeyQ'}))
  expect(mockFn.mock.calls.length).toEqual(2)
  expect(mockFn.mock.calls[1][0]).toEqual('input::key')
  expect(mockFn.mock.calls[1][1]).toEqual({code: 20, pressed: false})

  window.dispatchEvent(new KeyboardEvent('keydown', {'code': 'Quote'}))
  expect(mockFn.mock.calls.length).toEqual(3)
  expect(mockFn.mock.calls[2][0]).toEqual('input::key')
  expect(mockFn.mock.calls[2][1]).toEqual({code: 50, pressed: true})

  window.dispatchEvent(new KeyboardEvent('keyup', {'code': 'Quote'}))
  expect(mockFn.mock.calls.length).toEqual(4)
  expect(mockFn.mock.calls[3][0]).toEqual('input::key')
  expect(mockFn.mock.calls[3][1]).toEqual({code: 50, pressed: false})
})

test('can process mouse button events', () => {
  let opts = { ...sdkOptions }
  opts.experimental = {
      emulatePointerEvent: false
  }
  let stream = setupStream(opts)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  const container = document.getElementById(stream._containerID)

  // Check disabled key combinations
  container.dispatchEvent(new PointerEvent('pointerdown', {shiftKey: true, ctrlKey: true, button: 0, pointerType: 'mouse'}))
  expect(mockFn.mock.calls.length).toEqual(0)

  container.dispatchEvent(new PointerEvent('pointerdown', {
    button: 4,
    pointerType: 'mouse',
    clientX: 500,
    clientY: 0
  })) // scroll wheel button
  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::mouse-button')
  expect(mockFn.mock.calls[0][1]).toEqual({button: 5, pressed: true})

  container.dispatchEvent(new PointerEvent('pointerup', {
    button: 4,
    pointerType: 'mouse',
    clientX: 500,
    clientY: 0
  }))
  expect(mockFn.mock.calls.length).toEqual(2)
  expect(mockFn.mock.calls[1][0]).toEqual('input::mouse-button')
  expect(mockFn.mock.calls[1][1]).toEqual({button: 5, pressed: false})
})

test('can process mouse move events', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  const event = new PointerEvent('pointermove', {
    clientX: 1000,
    clientY: 1000,
    pointerType: 'mouse'
  })
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)

  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::mouse-move')
  expect(mockFn.mock.calls[0][1]).toEqual({x: 250, y: 500, rx: 25, ry: 50})
})

test('can process mouse move events with pointer lock', () => {
  let opts = { ...sdkOptions }
  opts.experimental = {
    pointerLock: true
  }
  let stream = setupStream(opts)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  document.pointerLockElement = {}

  const event = new PointerEvent('pointermove', {
    clientX: 1000,
    clientY: 1000,
    pointerType: 'mouse'
  })
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)

  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::mouse-move')
  // With pointer lock enabled we should only see movement information
  // and absolute position
  expect(mockFn.mock.calls[0][1]).toEqual({rx: 25, ry: 50})
})

test('can process mouse events translated to touch events', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._options.controls.emulateTouch = true
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  let event = new PointerEvent('pointerdown', {
    clientX: 1000,
    clientY: 1000,
    pointerType: 'mouse',
    pointerId: 1
  })
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)

  event = new PointerEvent('pointermove', {
    clientX: 1002,
    clientY: 1002,
    pointerType: 'mouse',
    pointerId: 1
  })
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)

  event = new PointerEvent('pointerup', {
    clientX: 1002,
    clientY: 1002,
    pointerType: 'mouse',
    pointerId: 1
  })
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)

  expect(mockFn.mock.calls.length).toEqual(3)
  expect(mockFn.mock.calls.length).toEqual(3)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({x: 250, y: 500, id: 1})
  expect(mockFn.mock.calls[1][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[1][1]).toEqual({x: 251, y: 501, id: 1})
  expect(mockFn.mock.calls[2][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[2][1]).toEqual({id: 1, last: true})
})

test('ignore pointermove events after the pointerup event is fired on touch emulation', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._options.controls.emulateTouch = true
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  let event = new PointerEvent('pointerdown', {
    clientX: 1000,
    clientY: 1000,
    pointerType: 'mouse',
    pointerId: 1
  })
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)

  event = new PointerEvent('pointerup', {
    clientX: 1002,
    clientY: 1002,
    pointerType: 'mouse',
    pointerId: 1
  })
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)

  event = new PointerEvent('pointermove', {
    clientX: 1002,
    clientY: 1002,
    pointerType: 'mouse',
    pointerId: 1
  })
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)

  // No touch-move event would be fired in a such case
  expect(mockFn.mock.calls.length).toEqual(2)
  expect(mockFn.mock.calls.length).toEqual(2)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({x: 250, y: 500, id: 1})
  expect(mockFn.mock.calls[1][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[1][1]).toEqual({id: 1, last: true})
})

test('can process touch events', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  // Simulate 3 touches, 0 end, 1 doesn't change, 2 moves
  let touches = [
    {pointerType: 'touch', pointerId: 0, clientX: 500, clientY: 0},
    {pointerType: 'touch', pointerId: 1, clientX: 1000, clientY: 1000},
    {pointerType: 'touch', pointerId: 2, clientX: 1500, clientY: 2000},
  ]

  for (const i in touches) {
    container.dispatchEvent(new PointerEvent('pointerdown', touches[i]))
  }

  expect(mockFn.mock.calls.length).toEqual(3)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({id: 0, x: 0, y: 0})
  expect(mockFn.mock.calls[1][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[1][1]).toEqual({id: 1, x: 250, y: 500})
  expect(mockFn.mock.calls[2][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[2][1]).toEqual({id: 2, x: 500, y: 1000})

  touches[2].clientX = stream._dimensions.playerOffsetLeft
  touches[2].clientY = stream._dimensions.playerOffsetTop
  container.dispatchEvent(new PointerEvent('pointermove', touches[2]))

  // Fire the `pointerup` for the first touch point will trigger `touch-end`
  // message which includes `last=false` field
  container.dispatchEvent(new PointerEvent('pointerup', touches[2]))

  expect(mockFn.mock.calls.length).toEqual(5)
  expect(mockFn.mock.calls[3][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[3][1]).toEqual({id: 2, x: 0, y: 0})
  expect(mockFn.mock.calls[4][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[4][1]).toEqual({id: 2, last: false})

  // Fire the `pointerup` for the remaining touch points the end
  // of multi-touch transfer. And the last point event that
  // carries `last=true` marks the end of multi-touch transfer.
  container.dispatchEvent(new PointerEvent('pointerup', touches[1]))
  container.dispatchEvent(new PointerEvent('pointerup', touches[0]))

  expect(mockFn.mock.calls.length).toEqual(7)
  expect(mockFn.mock.calls[5][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[5][1]).toEqual({id: 1, last: false})
  expect(mockFn.mock.calls[6][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[6][1]).toEqual({id: 0, last: true})
})


test('can process invalid touch events', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn()
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  let touch = {pointerType: 'touch', pointerId: -1, clientX: 500, clientY: 0}
  container.dispatchEvent(new PointerEvent('pointerdown', touch))

  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({id: 1, x: 0, y: 0})
})

test('mouse move when rotated', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  // Mouse move event at bottom right corner
  let event = new PointerEvent('pointermove', {clientX: 1500, clientY: 2000, pointerType: 'mouse'})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::mouse-move')
  expect(mockFn.mock.calls[0][1]).toEqual({x: 500, y: 1000, rx: 25, ry: 50})

  expect(stream.rotate('reverse-landscape')).toEqual(true)
  event = new PointerEvent('pointermove', {clientX: 0, clientY: 1500, pointerType: 'mouse'})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls[2][0]).toEqual('input::mouse-move')
  expect(mockFn.mock.calls[2][1]).toEqual({x: 0, y: 500, rx: 25, ry: 50})

  expect(stream.rotate('reverse-portrait')).toEqual(true)
  event = new PointerEvent('pointermove', {clientX: 1500, clientY: 2000, pointerType: 'mouse'})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls[4][0]).toEqual('input::mouse-move')
  expect(mockFn.mock.calls[4][1]).toEqual({x: 500, y: 1000, rx: 25, ry: 50})

  expect(stream.rotate('landscape')).toEqual(true)
  event = new PointerEvent('pointermove', {clientX: 0, clientY: 1500, pointerType: 'mouse'})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls[6][0]).toEqual('input::mouse-move')
  expect(mockFn.mock.calls[6][1]).toEqual({x: 0, y: 500, rx: 25, ry: 50})
})

test('mouse move when rotated and translated to touch events', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  // Enable emulation
  stream.enableTouchEmulation()

  let event = new PointerEvent('pointerdown', {clientX: 1500, clientY: 2000, pointerType: 'mouse', pointerId: 0})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({x: 500, y: 1000, id: 0})

  // Mouse move event at bottom right corner
  event = new PointerEvent('pointermove', {clientX: 1500, clientY: 2000, pointerType: 'mouse', pointerId: 0})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls.length).toEqual(2)
  expect(mockFn.mock.calls[1][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[1][1]).toEqual({x: 500, y: 1000, id: 0})

  expect(stream.rotate('reverse-landscape')).toEqual(true)
  event = new PointerEvent('pointermove', {clientX: 0, clientY: 1500, pointerType: 'mouse', pointerId: 0})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls[3][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[3][1]).toEqual({x: 0, y: 0, id: 0})

  expect(stream.rotate('reverse-portrait')).toEqual(true)
  event = new PointerEvent('pointermove', {clientX: 1500, clientY: 2000, pointerType: 'mouse', pointerId: 0})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls[5][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[5][1]).toEqual({x: 0, y: 0, id: 0})

  expect(stream.rotate('landscape')).toEqual(true)
  event = new PointerEvent('pointermove', {clientX: 2000, clientY: 500, pointerType: 'mouse', pointerId: 0})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls[7][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[7][1]).toEqual({x: 0, y: 0, id: 0})
})

test('touch events when rotated', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  container.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 0,
    clientX: 1500,
    clientY: 2000,
    pointerType: 'touch'
  }))
  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({id: 0, x: 500, y: 1000})

  expect(stream.rotate('reverse-landscape')).toEqual(true)
  container.dispatchEvent(new PointerEvent('pointermove', {
    pointerId: 0,
    clientX: 2000,
    clientY: 500,
    pointerType: 'touch'
  }))
  expect(mockFn.mock.calls[2][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[2][1]).toEqual({id: 0, x: 500, y: 1000})

  expect(stream.rotate('reverse-portrait')).toEqual(true)
  container.dispatchEvent(new PointerEvent('pointermove', {
    pointerId: 0,
    clientX: 500,
    clientY: 0,
    pointerType: 'touch'
  }))
  expect(mockFn.mock.calls[4][0]).toEqual('input::touch-move')
  // The pionter id will be auto-adjusted to 2 which is the minimal
  // available pointer Id being passed to the Android container
  expect(mockFn.mock.calls[4][1]).toEqual({id: 0, x: 500, y: 1000})

  expect(stream.rotate('landscape')).toEqual(true)
  container.dispatchEvent(new PointerEvent('pointermove', {
    pointerId: 0,
    clientX: 0,
    clientY: 1500,
    pointerType: 'touch'
  }))
  expect(mockFn.mock.calls[6][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[6][1]).toEqual({id: 0, x: 500, y: 1000})
})

test('single touch events with increment id', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  let touchEvent = {pointerId: 3, clientX: 500, clientY: 1000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerdown', touchEvent))
  touchEvent = {pointerId: 3, clientX: 1000, clientY: 1500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))
  touchEvent = {pointerId: 3, clientX: 1000, clientY: 1500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerup', touchEvent))

  expect(mockFn.mock.calls.length).toEqual(3)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({id: 0, x: 0, y: 500})
  expect(mockFn.mock.calls[1][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[1][1]).toEqual({id: 0, x: 250, y: 750})
  expect(mockFn.mock.calls[2][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[2][1]).toEqual({id: 0, last: true})

  touchEvent = {pointerId: 4, clientX: 500, clientY: 1000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerdown', touchEvent))
  touchEvent = {pointerId: 4, clientX: 1000, clientY: 1500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))
  touchEvent = {pointerId: 4, clientX: 1000, clientY: 1500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerup', touchEvent))

  expect(mockFn.mock.calls.length).toEqual(6)
  expect(mockFn.mock.calls[3][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[3][1]).toEqual({id: 0, x: 0, y: 500})
  expect(mockFn.mock.calls[4][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[4][1]).toEqual({id: 0, x: 250, y: 750})
  expect(mockFn.mock.calls[5][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[5][1]).toEqual({id: 0, last: true})
})

test('multiple touch events with increment id', () => {
  let stream = setupStream(sdkOptions)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  // Multi touch points
  let touchEvent = {pointerId: 2, clientX: 500, clientY: 1000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerdown', touchEvent))
  touchEvent = {pointerId: 3, clientX: 1000, clientY: 1500, isPrimary: false, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerdown', touchEvent))

  touchEvent = {pointerId: 2, clientX: 700, clientY: 1250, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))
  touchEvent = {pointerId: 3, clientX: 1250, clientY: 1750, isPrimary: false, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))

  touchEvent = {pointerId: 2, clientX: 1000, clientY: 1500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerup', touchEvent))
  touchEvent = {pointerId: 3, clientX: 1000, clientY: 1500, isPrimary: false, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerup', touchEvent))

  expect(mockFn.mock.calls.length).toEqual(6)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({id: 0, x: 0, y: 500})
  expect(mockFn.mock.calls[1][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[1][1]).toEqual({id: 1, x: 250, y: 750})
  expect(mockFn.mock.calls[2][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[2][1]).toEqual({id: 0, x: 100, y: 625})
  expect(mockFn.mock.calls[3][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[3][1]).toEqual({id: 1, x: 375, y: 875})
  expect(mockFn.mock.calls[4][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[4][1]).toEqual({id: 0, last: false})
  expect(mockFn.mock.calls[5][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[5][1]).toEqual({id: 1, last: true})
})

test('ignore touch events outside of video element', () => {
  let opts = { ...sdkOptions }
  opts.experimental = {
      emulatePointerEvent: false
  }
  let stream = setupStream(opts)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  let touchEvent = {pointerId: 0, clientX: 2500, clientY: 2500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerdown', touchEvent))
  touchEvent = {pointerId: 0, clientX: 2500, clientY: 2500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))
  touchEvent = {pointerId: 0, clientX: 2500, clientY: 2500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerup', touchEvent))

  expect(mockFn.mock.calls.length).toEqual(0)
})

test('trigger pointer events when inputs leave the video container', () => {
  let opts = { ...sdkOptions }
  opts.experimental = {
      emulatePointerEvent: true
  }
  let stream = setupStream(opts)

  let mockFn = jest.fn(() => { return true })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  // Fire 'pointerdown' event to start tracking with the touch point
  let touchEvent = {pointerId: 0, clientX: 750, clientY: 1500, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerdown', touchEvent))

  // Simulate 5 touches with `pointermove` type
  //   For the 1st event, it will be converted to `touch-end` event as it's the
  //   first pointer event leaves the video container.
  //   For 2nd, 3rd events, those that are fired continuously outside of the video
  //   container will be ignored.
  //   For the 4th event, it will be converted to `touch-start` event as it's
  //   the first pointer event enters into the video container again.
  //   For the 5th event, it will be converted to `touch-move` event as it's
  //   the non-first pointer event after entering the video container.
  touchEvent = {pointerId: 0, clientX: 5000, clientY: 5000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))
  touchEvent = {pointerId: 0, clientX: 6000, clientY: 6000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))
  touchEvent = {pointerId: 0, clientX: 7000, clientY: 7000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))
  touchEvent = {pointerId: 0, clientX: 1500, clientY: 2000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))
  touchEvent = {pointerId: 0, clientX: 500, clientY: 1000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointermove', touchEvent))

  // Fire 'pointerup' event to end tracking with the touch point
  touchEvent = {pointerId: 0, clientX: 500, clientY: 1000, isPrimary: true, pointerType: 'touch'}
  container.dispatchEvent(new PointerEvent('pointerup', touchEvent))

  expect(mockFn.mock.calls.length).toEqual(5)
  expect(mockFn.mock.calls[0][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[0][1]).toEqual({id: 0, x: 125, y: 750})
  expect(mockFn.mock.calls[1][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[1][1]).toEqual({id: 0, last: true})
  expect(mockFn.mock.calls[2][0]).toEqual('input::touch-start')
  expect(mockFn.mock.calls[2][1]).toEqual({id: 0, x: 500, y: 1000})
  expect(mockFn.mock.calls[3][0]).toEqual('input::touch-move')
  expect(mockFn.mock.calls[3][1]).toEqual({id: 0, x: 0, y: 500})
  expect(mockFn.mock.calls[4][0]).toEqual('input::touch-end')
  expect(mockFn.mock.calls[4][1]).toEqual({id: 0, last: true})
})

test('control channel is closed when rotate a pointer event', () => {
  let stream = setupStream(sdkOptions)

  console.error = jest.fn()
  let mockFn = jest.fn(() => { return false })
  stream._webrtcManager.sendControlMessage = mockFn
  stream._registerControls()
  stream._onResize()
  const container = document.getElementById(stream._containerID)

  // Mouse move event at bottom right corner
  let event = new PointerEvent('pointermove', {clientX: 1500, clientY: 2000, pointerType: 'mouse'})
  event.__defineGetter__('movementX', () => 50);
  event.__defineGetter__('movementY', () => 100);
  container.dispatchEvent(event)
  expect(mockFn.mock.calls.length).toEqual(1)
  expect(mockFn.mock.calls[0][0]).toEqual('input::mouse-move')
  expect(mockFn.mock.calls[0][1]).toEqual({x: 500, y: 1000, rx: 25, ry: 50})

  expect(stream.rotate('reverse-landscape')).toEqual(false)
})
