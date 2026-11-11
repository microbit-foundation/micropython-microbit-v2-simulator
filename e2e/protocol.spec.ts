import { expect, test } from "./fixtures";

test.describe("mute", () => {
  test.use({ recordAudio: true });

  test("unmute before running restores sound", async ({ simulator }) => {
    await simulator.mute();
    await simulator.unmute();
    await simulator.run("import music\nmusic.pitch(440, 500)\n");
    await simulator.expectFinished();
    await simulator.page.waitForTimeout(300);
    expect((await simulator.audio()).stats().soundSeconds).toBeGreaterThan(0.4);
  });

  test("mute and unmute while playing", async ({ simulator }) => {
    await simulator.run(
      "from microbit import *\nimport music\nmusic.pitch(440, wait=False)\nprint('playing')\nsleep(3000)\nmusic.stop()\n",
    );
    await simulator.expectSerial(/playing/);
    await simulator.page.waitForTimeout(500);
    await simulator.mute();
    await simulator.page.waitForTimeout(800);
    await simulator.unmute();
    await simulator.expectFinished();
    const levels = (await simulator.audio())
      .windows(0.1)
      .map((w) => (w.rms > 0.1 ? "on" : "off"));
    // Sound, then silence while muted, then sound again.
    expect(levels.join(" ")).toMatch(/on( off)+( on)+/);
    expect(levels.filter((l) => l === "off").length).toBeGreaterThanOrEqual(5);
  });
});

test("config translates the board labels", async ({ simulator }) => {
  await simulator.config("cy", {
    "button-a": "Botwm A",
    "button-b": "Botwm B",
    "touch-logo": "Cyffwrdd y logo",
    "start-simulator": "Dechrau'r efelychydd",
  });
  const frame = simulator.frame;
  await expect(frame.locator("html")).toHaveAttribute("lang", "cy");
  await expect(frame.locator("#ButtonA")).toHaveAccessibleName("Botwm A");
  await expect(frame.locator("#ButtonB")).toHaveAccessibleName("Botwm B");
  await expect(frame.locator("#Logo")).toHaveAccessibleName("Cyffwrdd y logo");
  await expect(frame.locator(".play-button")).toHaveAccessibleName(
    "Dechrau'r efelychydd",
  );
});

test.describe("invalid messages", () => {
  const invalid = [
    { kind: "flash", filesystem: { "main.py": "not bytes" } },
    { kind: "serial_input", data: 42 },
    { kind: "radio_input", data: "not bytes" },
    { kind: "set_value", id: 42, value: 1 },
    { kind: "set_value", id: "temperature", value: 99 },
  ];
  for (const message of invalid) {
    test(`${JSON.stringify(message)} is rejected without stopping the program`, async ({
      simulator,
    }) => {
      simulator.allowedErrors.push(/^pageerror: Error: .*[Ii]nvalid/);
      await simulator.run(
        "from microbit import *\nwhile not button_a.was_pressed():\n    sleep(20)\nprint('still running')\n",
      );
      await simulator.page.evaluate(
        (m) => (window as any).send(m),
        message as any,
      );
      await expect.poll(() => simulator.errors.length).toBeGreaterThan(0);
      await simulator.setValue("buttonA", 1);
      await simulator.expectSerial(/still running/);
    });
  }

  test("a non-numeric sensor value is rejected", async ({ simulator }) => {
    simulator.allowedErrors.push(/^pageerror: Error: .*invalid/);
    await simulator.run("");
    await simulator.expectFinished();
    await simulator.setValue("temperature", "hot");
    await expect
      .poll(() => simulator.errors.length, { timeout: 2_000 })
      .toBeGreaterThan(0);
  });
});

test.describe("serial output", () => {
  // 100 characters per line with the \r\n.
  const printLoop = "while True:\n    print('x' * 98)\n";

  test("is limited to the baud rate", async ({ simulator }) => {
    await simulator.run(printLoop);
    await expect.poll(() => simulator.serialLength()).toBeGreaterThan(0);
    const before = await simulator.serialLength();
    await simulator.page.waitForTimeout(1000);
    const perSecond = (await simulator.serialLength()) - before;
    // 115200 baud is 11520 bytes a second. Allow for timer slop.
    expect(perSecond).toBeGreaterThan(5_000);
    expect(perSecond).toBeLessThan(15_000);
    // A program waiting on serial output can still be stopped.
    await simulator.stop();
  });
});

test.describe("radio", () => {
  test("config reports the group", async ({ simulator }) => {
    await simulator.run(
      "import radio\nradio.on()\nradio.config(group=42)\nprint('configured')\n",
    );
    await simulator.expectSerial(/configured/);
    await simulator.waitForState((s) => (s.radio as any).group === 42);
  });

  test("off reports the radio disabled", async ({ simulator }) => {
    await simulator.run(
      "import radio\nradio.on()\nradio.off()\nprint('off')\nwhile True:\n    pass\n",
    );
    await simulator.expectSerial(/off/);
    await simulator.waitForState((s) => (s.radio as any).enabled === false);
    const enabled = (await simulator.messages("state_change")).map(
      (m) => (m.change as any).radio?.enabled,
    );
    expect(enabled).toContain(true);
  });

  const receive = (setup: string) => `import radio
from microbit import *
radio.on()
${setup}
while not button_a.was_pressed():
    sleep(20)
while True:
    message = radio.receive_bytes()
    if message is None:
        break
    print(message)
print('done')
`;

  test("input is truncated to the configured length", async ({ simulator }) => {
    await simulator.run(receive("radio.config(length=4)"));
    await simulator.waitForState((s) => (s.radio as any)?.enabled === true);
    await simulator.radioInput(new TextEncoder().encode("hello world"));
    await simulator.setValue("buttonA", 1);
    await simulator.expectSerial(/^b'hell'\ndone\n/);
  });

  test("input beyond the queue size is dropped", async ({ simulator }) => {
    await simulator.run(receive("radio.config(queue=2)"));
    await simulator.waitForState((s) => (s.radio as any)?.enabled === true);
    for (const text of ["one", "two", "three"]) {
      await simulator.radioInput(new TextEncoder().encode(text));
    }
    await simulator.setValue("buttonA", 1);
    await simulator.expectSerial(/^b'one'\nb'two'\ndone\n/);
  });

  test("receive_full includes signal strength and time", async ({
    simulator,
  }) => {
    await simulator.run(`import radio
from microbit import *
radio.on()
while True:
    packet = radio.receive_full()
    if packet:
        message, rssi, timestamp = packet
        print(message, rssi, timestamp > 0)
        break
    sleep(20)
`);
    await simulator.waitForState((s) => (s.radio as any)?.enabled === true);
    await simulator.radioInput(new TextEncoder().encode("hi"));
    await simulator.expectSerial(/^b'hi' -127 True\n/);
  });
});
