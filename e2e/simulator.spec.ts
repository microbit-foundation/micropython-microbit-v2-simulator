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
    await simulator.run("print('again')\n");
    await simulator.expectFinished();
  });

  test("flashing interrupts a long sleep", async ({ simulator }) => {
    await simulator.run("print('sleeping')\nsleep(60000)\n");
    await simulator.expectSerial(/sleeping/);
    await simulator.run("print('awake')\n");
    await simulator.expectSerial(/^awake\n/, { timeout: 2_000 });
  });

  test("reset during a scroll starts again cleanly", async ({ simulator }) => {
    await simulator.run(
      "from microbit import *\nprint('start')\ndisplay.scroll('Hello micro:bit', delay=50)\nprint('done')\n",
    );
    await simulator.expectSerial(/start/);
    await simulator.page.waitForTimeout(200);
    await simulator.reset();
    await simulator.expectSerial(/^start\nstart\n[\s\S]*done\n/);
  });

  test("machine.reset runs the program again", async ({ simulator }) => {
    await simulator.run(`import machine, os
if 'flag' in os.listdir():
    print('after reset')
else:
    open('flag', 'w').close()
    print('before reset')
    machine.reset()
`);
    await simulator.expectSerial(/before reset\n[\s\S]*after reset\n/);
  });

  test("running_time keeps pace with real time", async ({ simulator }) => {
    await simulator.run(
      "from microbit import *\nstart = running_time()\nsleep(1000)\nprint(running_time() - start)\n",
    );
    await simulator.expectFinished();
    const elapsed = Number((await simulator.serial()).split("\n")[0]);
    expect(elapsed).toBeGreaterThanOrEqual(1000);
    expect(elapsed).toBeLessThan(1100);
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

  test("running out of heap raises MemoryError", async ({ simulator }) => {
    await simulator.run("l = []\nwhile True:\n    l = [l]\n");
    await simulator.expectSerial(/MemoryError/);
    await simulator.skipErrorScroll();
  });
});
