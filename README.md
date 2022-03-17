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

TODO: document the messages format.