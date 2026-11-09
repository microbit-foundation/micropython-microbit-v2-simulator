# MicroPython-micro:bit simulator

## Try it out

To try the simulator use the [micro:bit Python Editor](https://python.microbit.org).

The rest of this page explains how to embed the simulator in an application
and develop the simulator software.

## License

This software is under the MIT open source license.

[SPDX-License-Identifier: MIT](LICENSE)

## Embedding

The simulator is designed to be embedded into other web applications
as an iframe. The embedding API and URLs are not yet stable and are
subject to change. If you are interested in embedding the simulator
in your application please [get in touch](mailto:support@microbit.org).

The URL to embed is https://python-simulator.usermbit.org/v/0.1/simulator.html.
You can embed this in your application directly. We would love to hear about
your use of the simulator so please open an issue to get in touch.

The iframe provides the micro:bit board user interface and some limited
interactions. It does not provide a terminal for serial/the REPL or any UI to change the board sensor state.

A value for a brand color can be passed to the simulator via a query
string and is used to style the play button. E.g., https://python-simulator.usermbit.org/v/0.1/simulator.html?color=blue

[demo.html](./src/demo.html) is an example of embedding the simulator.
It connects the iframe to a terminal and provides a simple interface for
sensors.

The following sections document the messages supported by the iframe embed
via postMessage.

### Messages sent to parent window from iframe

These messages are sent as the result of user interactions or actions taken
by the running program. The simulator starts stopped with no program flashed.

<table>
<thead>
<tr>
<th>Kind
<th>Example
<th>Description
<tbody>
<tr>
<td>ready
<td>

```javascript
{
  "kind": "ready",
  "state": {
    "lightLevel": {
      "id": "lightLevel",
      "type": "range",
      "min": 0,
      "max": 255
    },
    "soundLevel": {
      "id": "soundLevel",
      "type": "range",
      "min": 0,
      "max": 255
      // Microphone sensor only:
      "lowThreshold": 50,
      "highThreshold": 150
    }
    // Full state continues here.
  }
}
```

<td>Sent when the simulator is ready for input. Includes a description of the available sensors.

<tr>
<td>sensor_change
<td>

```javascript
{
  "kind": "state_change",
  "change": {
      "soundLevel": {
        "id": "soundLevel",
        "type": "range",
        "min": 0,
        "max": 255
        // Microphone sensor only:
        "lowThreshold": 50,
        "highThreshold": 150
      }
      // Optionally, further keys here.
  }
  ]
}
```

<td>Sent when the simulator state changes. The keys are a subset of the original state. The values are always sent in full.

<tr>
<td>request_flash
<td>

```javascript
{
  "kind": "request_flash",
}
```

<td>Sent when the user requests the simulator starts. The embedder should flash the latest code via the <code>flash</code> message.

<tr>
<td>serial_output
<td>

```javascript
{
  "kind": "serial_output",
  "data": "text"
}
```

<td>Serial output suitable for a terminal or other use. Output is batched, so one message may contain the output of several writes.
By default, output is limited to the device's baud rate (115200). See <code>serialFlowControl</code> in the <code>config</code> message to instead have the simulator wait for you to process output.

<tr>
<td>radio_output
<td>

```javascript
{
  "kind": "radio_output",
  "data": new Uint8Array([])
}
```

<td>Radio output (sent from the user's program) as bytes.
If you send string data from the program then it will be prepended with the three bytes 0x01, 0x00, 0x01.

<tr>
<td>internal_error
<td>

```javascript
{
  "kind": "internal_error",
  "error": new Error()
}
```

<td>A debug message sent for internal (unexpected) errors thrown by the simulator. Suitable for application-level logging. Please raise issues in this project as these indicate a bug in the simulator.

</table>

### Messages you can send to the iframe from the embedding app

<table>
<thead>
<tr>
<th>Kind
<th>Example
<th>Description
<tbody>
<tr>
<td>config
<td>

```javascript
{
  "kind": "config",
  "language": "en",
  "translations": {
    "button-a": "Button A",
    "button-b": "Button B",
    "touch-logo": "Touch logo",
    "start-simulator": "Start simulator"
  },
  "serialFlowControl": true
}
```

<td>Configure the simulator. Send the full configuration each time. Typically sent after the <code>ready</code> message and when the language changes.
<code>language</code> and <code>translations</code> set the language and the labels used in the simulator.
<code>serialFlowControl</code> is optional and defaults to <code>false</code>. If <code>true</code>, serial output is no longer limited to the device's baud rate. Instead, the program waits when too much output is unacknowledged, until you send <code>serial_output_ack</code>. If you enable it, you must acknowledge all serial output or the program will stop making progress whenever it prints.

<tr>
<td>flash
<td>

```javascript
{
  "kind": "flash",
  "filesystem": {
    "main.py":
      new TextEncoder()
        .encode("# your program here")
  }
}
```

<td>Update the micro:bit filesystem and restart the program. You must send this in response to the request_flash message.

<tr>
<td>stop
<td>

```javascript
{
  "kind": "stop"
}
```

<td>Stop the program.<tr>

<tr>
<td>reset
<td>

```javascript
{
  "kind": "reset"
}
```

<td>Reset the program.<tr>

<tr>
<td>mute
<td>

```javascript
{
  "kind": "mute"
}
```

<td>Mute the simulator.<tr>

<tr>
<td>unmute
<td>

```javascript
{
  "kind": "unmute"
}
```

<td>Unmute the simulator.<tr>

<tr>
<td>serial_input
<td>

```javascript
{
  "kind": "serial_input",
  "data": "text"
}
```

<td>Serial input. If the REPL is active it will echo this text via <code>serial_write</code>.
<tr>
<td>serial_output_ack
<td>

```javascript
{
  "kind": "serial_output_ack",
  "length": 4
}
```

<td>With <code>serialFlowControl</code> enabled via <code>config</code>, acknowledges serial output you have processed. The length is the total length of the <code>data</code> strings processed (JavaScript string length), so you can send one acknowledgement for several messages. For example, acknowledge when your terminal has finished writing the data.
<tr>
<td>sensor_set
<td>

```javascript
{
  "kind": "set_value",
  "id": "lightLevel",
  "value": 255
}
```

<td>Set a sensor, button or pin value. The sensor, button or pin is identified by the top-level key in the state. Buttons and pins (touch state) have 0 and 1 values. In future, analog values will be supported for pins.

<tr>
<td>radio_input
<td>

```javascript
{
  "kind": "radio_input",
  "data": new Uint8Array([])
}
```

<td>Radio input (received by the user's program as if sent from another micro:bit) as bytes.
If you want to send string data then prepend the byte array with the three bytes <code>0x01</code>, <code>0x00</code>, <code>0x01</code>.
Otherwise, the user will need to use <code>radio.receive_bytes</code> or <code>radio.receive_full</code>. The input is assumed to be sent to the currently configured radio group.

</table>

## Developing the simulator

### Build steps

The simulator is a variant of the MicroPython codal_port which is compiled with
Emscripten. It provides a simulated micro:bit (including REPL) in the browser.

To build, first fetch the submodules (don't use recursive fetch):

    $ git submodule update --init lib/micropython-microbit-v2
    $ git -C lib/micropython-microbit-v2 submodule update --init lib/micropython

Then run (from this top-level directory):

    $ make

Once it is built the pages in build/ need to be served, e.g. via:

    $ npx serve build

View at http://localhost:3000/demo.html

    $ (cd build && python -m http.server)

View at http://localhost:8000/demo.html

### Tests

Unit tests for the TypeScript board code:

    $ npm test

End-to-end tests run the built simulator in Chromium with Playwright, against
both the release and debug (`?flag=debugWasm`) firmware. Build first, then:

    $ npx playwright install chromium
    $ npm run test:e2e

They use a server on port 3000 if one is running, otherwise they start one.
A server you start yourself must not redirect `simulator.html`, as that drops
the flags, e.g. `npx serve build -c ../e2e/serve.json`.

Any console error, uncaught exception, `internal_error` message or firmware
abort fails the test. Every file in `src/examples` must have an entry in
`e2e/examples.spec.ts`.

`e2e/audio.spec.ts` records the simulator's audio output and checks broad
statistics (duration, level, pitch, dropouts) rather than exact samples.

### Branch deployments

There is a CloudFlare pages based build for development purposes only. Do not
embed the simulator via this URL as it may be removed at any time. CloudFlare's
GitHub integration will comment on PRs with deployment details.

Branches in this repository are also deployed via CircleCI to https://review-python-simulator.usermbit.org/{branchName}/. This requires the user pushing code to have
permissions for the relevant Micro:bit Educational Foundation infrastructure.

Similarly, the main branch is deployed to https://python-simulator.usermbit.org/staging/.

Tagged releases with a `v` prefix are deployed to https://python-simulator.usermbit.org/v/{number}/

### Upgrading micropython-microbit-v2

1. Update the lib/micropython-microbit-v2 to the relevant hash. Make sure that its lib/micropython submodule is updated (see checkout instructions above).
2. Review the full diff for micropython-microbit-v2. In particular, note changes to:
   1. main.c, src/Makefile and mpconfigport.h all which have simulator versions that may need updates
   2. the HAL, which may require implementing in the simulator
   3. the filesystem, which has a JavaScript implementation.

### Web Assembly debugging

The production firmware keeps function names, so stack traces from crashes
are readable without extra tooling.

Each build also includes `firmware-debug`, which enables Emscripten assertions
and has DWARF debug info in a separate file that DevTools fetches on demand.
Load it with `simulator.html?flag=debugWasm`. It is less optimised than the
default firmware, so a crash that depends on optimisation may not reproduce
with it. Source-level debugging needs `WebAssembly.compileStreaming`, so is not
available in Safari 14.

Steps for source-level debugging in Chrome:

- Install the C/C++ debug extension: https://goo.gle/wasm-debugging-extension
- In the extension's options, add a path substitution from `/simulator` to
  your local checkout of this repository, at the same commit as the build
- Open `simulator.html?flag=debugWasm`, either deployed or local

`DEBUG=1 make` builds the default firmware with debug info and C assertions
enabled, for local use.

## Code of Conduct

Trust, partnership, simplicity and passion are our core values we live and
breathe in our daily work life and within our projects. Our open-source
projects are no exception. We have an active community which spans the globe
and we welcome and encourage participation and contributions to our projects
by everyone. We work to foster a positive, open, inclusive and supportive
environment and trust that our community respects the micro:bit code of
conduct. Please see our [code of conduct](https://microbit.org/safeguarding/)
which outlines our expectations for all those that participate in our
community and details on how to report any concerns and what would happen
should breaches occur.
