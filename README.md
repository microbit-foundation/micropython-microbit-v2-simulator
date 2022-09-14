# MicroPython-micro:bit simulator

## Try it out

To try the simulator use the [micro:bit Python Editor beta](https://python.microbit.org/v/beta).

The rest of this page explains how to embed the simulator in an application
and develop the simulator software.

## Embedding

The simulator is designed to be embedded into other web applications
as an iframe. The embedding API and URLs are not yet stable and are
subject to change. If you are interested in embedding the simulator
in your application please [get in touch](mailto:support@microbit.org).

The URL to embed is https://stage-python-simulator.microbit.org/simulator.html (subject to change, still under development).

The iframe provides the micro:bit board user interface and some limited
interactions. It does not provide a terminal for serial/the REPL or any UI to change the board sensor state.

A value for a brand color can be passed to the simulator via a query
string and is used to style the play button. E.g., https://stage-python-simulator.microbit.org/simulator.html?color=blue

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

<td>Serial output suitable for a terminal or other use.

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

### Branch deployments

There is a Netlify based build for development purposes. Do not embed
the simulator via this URL. Netlify's GitHub integration will comment
on PRs with deployment details.

Branches in this repository are also deployed via CircleCI to https://review-python-simulator.microbit.org/{branchName}/. This requires the user pushing code to have
permissions for the relevant Micro:bit Educational Foundation infrastructure.

### Upgrading micropython-microbit-v2

1. Update the lib/micropython-microbit-v2 to the relevant hash. Make sure that its lib/micropython submodule is updated (see checkout instructions above).
2. Review the full diff for micropython-microbit-v2. In particular, note changes to:
   1. main.c, src/Makefile and mpconfigport.h all which have simulator versions that may need updates
   2. the HAL, which may require implementing in the simulator
   3. the filesystem, which has a JavaScript implementation.

### Web Assembly debugging

Steps for WASM debugging in Chrome:

- Add the source folder in dev tools
- Install the C/C++ debug extension: https://helpgoo.gle/wasm-debugging-extension
- Enable "WebAssembly Debugging: Enable DWARF support" in DevTools Experiments
- DEBUG=1 make

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
