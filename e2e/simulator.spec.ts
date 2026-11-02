import { expect, test } from "./fixtures";

test.describe("lifecycle", () => {
  test("flashing a new program replaces the running one", async ({
    simulator,
  }) => {
    await simulator.run("while True:\n    print('one')\n    sleep(100)\n");
    await simulator.expectSerial(/one/);
    await simulator.run("print('two')\n");
    await simulator.expectFinished();
    expect(await simulator.serial()).not.toMatch(/one/);
  });

  test("reset runs the program again", async ({ simulator }) => {
    await simulator.run("print('started')\n");
    await simulator.expectFinished();
    await simulator.reset();
    await simulator.expectSerial(/started[\s\S]*started/);
  });

  test("stop and run again", async ({ simulator }) => {
    await simulator.run("while True:\n    sleep(100)\n");
    await simulator.stop();
    await simulator.waitForState((s) => (s.radio as any)?.enabled === false);
    await simulator.run("print('again')\n");
    await simulator.expectFinished();
  });

  test("Ctrl-C interrupts a busy loop", async ({ simulator }) => {
    await simulator.run("print('looping')\nwhile True:\n    pass\n");
    await simulator.expectSerial(/looping/);
    await simulator.sendSerial("\x03");
    await simulator.expectSerial(/KeyboardInterrupt/);
    await simulator.expectFinished();
  });
});

test.describe("REPL", () => {
  test("evaluates input", async ({ simulator }) => {
    await simulator.run("");
    await simulator.expectFinished();
    await simulator.sendSerial("6 * 7\r");
    await simulator.expectSerial(/\n42\n>>> $/);
  });

  test("prints user exceptions as a traceback", async ({ simulator }) => {
    await simulator.run("print('before')\nraise ValueError('oops')\n");
    await simulator.expectSerial(/Traceback[\s\S]*ValueError: oops/);
    await simulator.skipErrorScroll();
  });
});

test.describe("audio", () => {
  // These rely on callbacks from Web Audio into the firmware when buffers
  // finish playing.
  test("continues after music.play", async ({ simulator }) => {
    await simulator.run(
      "import music\nmusic.play(['c4:1', 'e4:1'])\nprint('done')\n",
    );
    await simulator.expectSerial(/done/);
  });

  test("continues after speech.say", async ({ simulator }) => {
    await simulator.run("import speech\nspeech.say('hi')\nprint('done')\n");
    await simulator.expectSerial(/done/);
  });

  test("continues after audio.play of a sound expression", async ({
    simulator,
  }) => {
    await simulator.run(
      "from microbit import *\naudio.play(Sound.HELLO)\nprint('done')\n",
    );
    await simulator.expectSerial(/done/);
  });
});

test.describe("radio", () => {
  test("sends to the embedder", async ({ simulator }) => {
    await simulator.run(
      "import radio\nradio.on()\nradio.send_bytes(b'ping')\n",
    );
    const message = await simulator.waitForMessage("radio_output");
    expect(new TextDecoder().decode(message.data as Uint8Array)).toBe("ping");
  });

  test("ignores input while the radio is off", async ({ simulator }) => {
    await simulator.run("");
    await simulator.expectFinished();
    await simulator.radioInput(new TextEncoder().encode("ignored"));
  });
});

test.describe("limits", () => {
  test("Python recursion raises RuntimeError", async ({ simulator }) => {
    await simulator.run("def f():\n    f()\nf()\n");
    await simulator.expectSerial(/RuntimeError: pystack exhausted/);
    await simulator.skipErrorScroll();
  });

  // microbit_display_exception allocates its message before installing an
  // exception handler, so with the heap still full the MemoryError escapes
  // to nlr_jump_fail. The same code is in the device firmware.
  test.fail("running out of heap raises MemoryError", async ({ simulator }) => {
    await simulator.run("l = []\nwhile True:\n    l = [l]\n");
    await simulator.expectSerial(/MemoryError/);
    await simulator.skipErrorScroll();
  });
});
