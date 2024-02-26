# Anbox Streaming SDK

The Anbox Streaming SDK is a javascript library you can plug in your website
to easily establish a video stream of your Anbox instances.

## Run the Example

To run the included example client you need to have docker installed. See
https://docs.docker.com/engine/install/ubuntu/ for more details.

Once docker is ready, you can modify example.html to point to your server
and insert a valid authentication token. Afterwards simply launch the example
client via:

    $ ./run.sh

### Usage

Include the script

```html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>

    <script async src="path/to/anbox-stream-sdk.js"></script>

</head>
<body></body>
</html>
```


Create a node element with an ID

```html
<div id="anbox-stream" style="width: 100vw; height: 100vh;"></div>
```

create a stream gateway connector.

```javascript
/**
 * AnboxStreamGatewayConnector enables communication between the client and the
 * gateway. They can be customized to add an additional layer between
 * the client and the gateway in order to add more features (user management,
 * limits, analytics, etc).
 * For instance, to add user management, you would create a connector that
 * would communicate with a service you own, which in turn would talk to the
 * stream gateway to create an actual streaming session.
 * The connector would pass that session information to the SDK which takes
 * care of the rest.
 */
const connector = new AnboxStreamGatewayConnector({
    url: '<stream_gateway_address>',
    authToken: '<stream_gateway_auth_token>',
    session: {
        app: '<app_name>',
    },
    screen: {
        width: 1280,
        height: 720,
        fps: 25,
    }
});
```

create a stream instance with the initialized connector, which is used to connect the stream gateway to start streaming.

```javascript
/**
 * AnboxStream creates a connection between your client and an Android instance and
 * displays its video & audio feed in an HTML5 player
 *
 * @param options: {object} {
 *     connector: WebRTC Stream connector.
 *     targetElement: ID of the DOM element to attach the video to. (required)
 *     url: Address of the service. (required)
 *     authToken: Authentication token acquired through /1.0/login (required)
 *     stunServers: List ICE servers (default: [{"urls": ['stun:stun.l.google.com:19302'], username: "", password: ""}])
 *     controls: {
 *        keyboard: true or false, send keypress events to the Android instance. (default: true)
 *        mouse: true or false, send mouse and touch events to the Android instance. (default: true)
 *        gamepad: true or false, send gamepad events to the Android instance. (default: true)
 *     },
 *     callbacks: {
 *        ready: function, called when the video and audio stream are ready to be inserted. (default: none)
 *        error: function, called on stream error with the message as parameter. (default: none)
 *        done: function, called when the stream is closed. (default: none)
 *     },
 *     experimental: {
 *        disableBrowserBlock: don't throw an error if an unsupported browser is detected. (default: false)
 *     }
 *   }
 */

let stream = new AnboxStream({
    connector: connector,
    targetElement: "anbox-stream",
    url: config.backendAddress,
    authToken: "abc123",
    callbacks: {
        ready: () => { console.log('video stream is ready') },
        error: (e) => { console.log('an error occurred:', e) },
        done: () => { console.log('stream has been closed') },
    },
});

stream.connect();
```
