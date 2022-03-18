MicroPython-micro:bit simulator
===============================

This is a variant of codal_port which is compiled with Emscripten.  It
provides a simulated micro:bit REPL in the browser.

To build, first fetch the submodules (don't use recursive fetch):

    $ git submodule update --init lib/micropython-microbit-v2
    $ git submodule update --init lib/micropython-microbit-v2/lib/micropython

Then run (from this top-level directory):

    $ make

Once it is build the webpage in src/ needs to be served, eg via:

    $ (cd src && python -m http.server)

Then browse to http://localhost:8000/demo.html

## Embedding

The simulator is designed to be embedded into other web applications
via an iframe.

The iframe provides the micro:bit board user interface and some limited
interactions. It does not provide a terminal for serial output or the 
REPL or any UI for the sensors.

[demo.html](./src/demo.html) is an example of embedding the simulator.
It connects the iframe to a terminal and provides a simple interface for 
sensors.

The following sections documents the messages send via postMessage.

<table>
<caption>Messages sent to parent from iframe
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

<table>
<caption>Messages supported by the iframe
<thead>
<tr>
<th>Kind
<th>Example
<th>Description
<tbody>
<tr>
<td>serial_input
<td>

```javascript
{ 
  "kind": "serial_input",
  "data": "text"
  ] 
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
