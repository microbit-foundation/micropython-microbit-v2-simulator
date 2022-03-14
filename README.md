MicroPython-micro:bit simulator
===============================

This is a variant of codal_port which is compiled with Emscripten.  It
provides a simulated micro:bit REPL in the browser.

To build, first fetch the submodules (don't use recursive fetch):

    $ git submodule update --init lib/micropython-microbit-v2
    $ git submodule update --init lib/micropython-microbit-v2/lib/micropython

Then run (from this top-level directory):

    $ make -C src

Once it is build the webpage in src/ needs to be served, eg via:

    $ (cd src && python -m http.server)

Then browse to localhost:8000.

Known issues:
- Does not support keys being pressed when async code is running, for
  example time.sleep(1) and microbit.display.scroll(...).
- Background events like display scrolling do not run when the RELP is
  idle.
