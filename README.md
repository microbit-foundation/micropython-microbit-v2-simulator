# MicroPython-micro:bit simulator

This is a variant of codal_port which is compiled with Emscripten. It
provides a simulated micro:bit REPL in the browser.

To build, first fetch the submodules (don't use recursive fetch):

    $ git submodule update --init lib/micropython-microbit-v2
    $ git -C lib/micropython-microbit-v2 submodule update --init lib/micropython

Then run (from this top-level directory):

    $ make

Once it is build the webpage in src/ needs to be served, eg via:

    $ (cd build && python -m http.server)

Then browse to http://localhost:8000/demo.html

## Deployments

The main branch is deployed to https://stage-python-simulator.microbit.org/ by CircleCI.

Other branches are deployed to https://review-python-simulator.microbit.org/{branchName} by CircleCI.

There is currently no stable deployment. The URLs above are under active development
and are subject to change.

There is also a Netlify based build for development purposes only.
Netlify's GitHub integration will comment on PRs with deployment details.

## Embedding

The simulator is designed to be embedded into other web applications
via an iframe.

The page to embed is http://localhost:8000/simulator.html

The iframe provides the micro:bit board user interface and some limited
interactions. It does not provide a terminal for serial output or the
REPL or any UI for the sensors. A value for color can be passed to the simulator
via a query string and is used to style the play button. E.g., http://localhost:8000/simulator.html?color=blue

[demo.html](./src/demo.html) is an example of embedding the simulator.
It connects the iframe to a terminal and provides a simple interface for
sensors.

The following sections documents the messages supported via postMessage.

## Messages sent to parent window from iframe

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

## Messages supported by the iframe

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

<td>Update the micro:bit filesystem and restart the program.

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

## Upgrading micropython-microbit-v2

1. Update the lib/micropython-microbit-v2 to the relevant hash. Make sure that its lib/micropython submodule is updated (see checkout instructions above).
2. Review the full diff for micropython-microbit-v2. In particular, note changes to:
   1. main.c, src/Makefile and mpconfigport.h all which have simulator versions that may need updates
   2. the HAL, which may require implementing in the simulator
   3. the filesystem, which has a JavaScript implementation.

## Web Assembly debugging

Steps for WASM debugging in Chrome:

- Add the source folder
- Install the C/C++ debug extension: https://helpgoo.gle/wasm-debugging-extension
- Enable "WebAssembly Debugging: Enable DWARF support" in DevTools Experiments.
- DEBUG=1 make
