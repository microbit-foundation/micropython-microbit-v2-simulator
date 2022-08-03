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
REPL or any UI for the sensors.

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
  "sensors": [
    {
      "id": "lightLevel",
      "type": "range",
      "min": 0,
      "max": 255
    }
    // More sensors here.
  ]
}
```

<td>Sent when the simulator is ready for input. Includes a description of the available sensors.
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
    "main.py": new TextEncoder().encode("# your program here")
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
<td>serial_input
<td>

```javascript
{
  "kind": "serial_input",
  "data": "text"
}
```

<td>Serial input. If the REPL is active it will echo this text via `serial_write`.
<tr>
<td>sensor_set
<td>

```javascript
{
  "kind": "sensor_set",
  "sensor": "lightLevel",
  "value": 255
}
```

<td>Set a sensor value.
</table>

## Web Assembly debugging

Steps for WASM debugging in Chrome:

- Add the source folder
- Install the C/C++ debug extension: https://helpgoo.gle/wasm-debugging-extension
- Enable "WebAssembly Debugging: Enable DWARF support" in DevTools Experiments.
- DEBUG=1 make
