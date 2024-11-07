# Anbox Streaming SDK

## Description

The Anbox Streaming SDK empowers developers to create personalized streaming clients that interface with [Anbox Cloud](https://anbox-cloud.io/).

## Usage

### [Javascript Library](js)

The JS SDK library manages all streaming facets, from the intricate WebRTC protocol to the seamless integration of controls, gamepads, speakers, and screen resolutions. Additionally, it incorporates an Android library that provides user-friendly native components for Android application integration.

### [Android Library](android/anbox_streaming_sdk)

The Android library offers user-friendly native components, including AnboxWebView, an extension of the AOSP WebView. This library enhances text input handling for hybrid applications loading the Anbox Streaming JavaScript SDK within an embedded WebView for video streaming.

Please navigate to each library folder for instructions on compiling the Javascript or Android libraries and integrating it into your project.

## Examples

Refer to the following examples to explore advanced usage scenarios and best practices:

* [Simple Android Webview Streaming](examples/android/webview_streaming) - An Android example that embeds WebView integrated with the JS SDK for video streaming.
* [Enhanced Android Webview Streaming](examples/android/enhanced_webview_streaming) - An Android example that embeds AnboxWebView for text input handling enhancement for a hybrid application.
* [Out of Band](examples/android/out_of_band_v2) - An Android example demonstrating the usage of [out of band data](https://documentation.ubuntu.com/anbox-cloud/en/latest/howto/stream/exchange-oob-data/#oob-v2) feature which exchanges data between the Android application running in the Anbox container and a streaming client.
* [JavaScript-based Streaming Example](examples/js) - A web application utilizes the JS SDK for video streaming.

## Testing

The JS SDK library comes with two test suites: one for unit tests and another for end-to-end tests. Unit tests use [Jest](https://jestjs.io), and end-to-end tests use [Playwright](https://playwright.dev).

- Unit tests are located in `js/tests/unit`.
- End-to-end tests are located in `js/tests/e2e`.

Both these folders contain a `run-tests.sh` script, which runs the tests inside a Docker container. Check how to install Docker [here](https://docs.docker.com/engine/install/).

If you want to run end-to-end tests, you need an Anbox Cloud deployment. The easiest way to set up one is by using the [Anbox Cloud Appliance](https://documentation.ubuntu.com/anbox-cloud/en/latest/tutorial/installing-appliance/).

Once the appliance is ready, follow these steps to run the end-to-end tests:

- In the `js/tests/e2e` folder, create a `.env.local` file.
- Add the following environment variables in the `.env.local` file:
  - `ASG_API_TOKEN=my-asg-api-token`
    Token to access the stream gateway API. See reference [here](https://documentation.ubuntu.com/anbox-cloud/en/latest/howto/stream/access-stream-gateway/#creating-a-token).
  - `AMS_API_CERTIFICATE=./path-to-ams-cert.crt`
    A certificate that is trusted by AMS. See reference [here](https://documentation.ubuntu.com/anbox-cloud/en/latest/howto/anbox/control-ams-remotely/#install-a-trusted-certificate).
  - `AMS_API_CERTIFICATE_KEY=./path-to-ams-cert.key`
    The key for the certificate above.
  - `AMS_API_URL=https://my-ams-url:8444`
    URL (including port) of the AMS back-end.
  - `ASG_API_URL=https://my-asg-url:9031`
    URL (including port) of the ASG back-end.
- Run the `run-tests.sh` script in the `js/tests/e2e` folder.

When you run tests with the `run-tests.sh` script, coverage data will be generated in the following folders:

- `js/tests/unit/coverage` for unit tests.
- `js/tests/e2e/coverage` for end-to-end tests.

To combine the coverage of the unit tests with that of the end-to-end tests, and generate a report using [nyc](https://github.com/istanbuljs/nyc), you can run the `test-report-coverage` script:

- First, execute the `run-tests.sh` scripts in both the `js/tests/unit` and the `js/tests/e2e` folders. This will run the tests, and produce coverage data for both suites.
- In the `js/tests/e2e` folder, execute `npm run test-report-coverage`. The report will be stored in the `js/tests/e2e/coverage/combined-report` folder.

## Contributing

We welcome contributions from the community to enhance the Anbox Streaming SDK. To contribute, please follow these guidelines:

1. Fork the repository and create your fork from the `main` branch.
2. Ensure that your code adheres to the established [coding standards and practices](https://ubuntu.com/community/ethos/code-of-conduct).
3. Test your changes to ensure that automated tests pass with the modifications you made.
4. Provide relevant documentation updates if needed.
5. Sign the [contributor agreement](https://ubuntu.com/legal/contributors), submit a pull request, outlining the purpose and scope of your changes.

Our team will review your contribution and collaborate with you to integrate it into the SDK.

## Bug report

To report issues, please submit a [bug](https://bugs.launchpad.net/anbox-cloud/+filebug) to Anbox Cloud project on launchpad.

## License

The Anbox Streaming SDK is licensed under the Apache License 2.0. For more details, refer to the [LICENSE](LICENSE) file for details.
