import { expect, test } from "./fixtures";

const reportPresses = `from microbit import *
while True:
    if button_a.was_pressed():
        print('A')
    if button_b.was_pressed():
        print('B')
    sleep(20)
`;

test("clicking buttons A and B", async ({ simulator }) => {
  await simulator.run(reportPresses);
  await simulator.frame.locator("#ButtonA").click();
  await simulator.expectSerial(/^A\n$/);
  await simulator.frame.locator("#ButtonB").click();
  await simulator.expectSerial(/^A\nB\n$/);
});

test("holding a button with the mouse", async ({ simulator }) => {
  await simulator.run(
    "from microbit import *\nwhile not button_a.is_pressed():\n    sleep(20)\nprint('down')\nwhile button_a.is_pressed():\n    sleep(20)\nprint('up')\n",
  );
  await simulator.frame.locator("#ButtonA").hover();
  await simulator.page.mouse.down();
  await simulator.waitForState((s) => (s.buttonA as any).value === 1);
  await simulator.expectSerial(/down\n/);
  await simulator.page.mouse.up();
  await simulator.waitForState((s) => (s.buttonA as any).value === 0);
  await simulator.expectSerial(/down\nup\n/);
});

test("pressing a button from the keyboard", async ({ simulator }) => {
  await simulator.run(reportPresses);
  const button = simulator.frame.locator("#ButtonB");
  await button.focus();
  await button.press("Enter");
  await simulator.expectSerial(/^B\n$/);
  await button.press(" ");
  await simulator.expectSerial(/^B\nB\n$/);
});

test("touching the logo", async ({ simulator }) => {
  await simulator.run(
    "from microbit import *\nwhile not pin_logo.is_touched():\n    sleep(20)\nprint('touched')\n",
  );
  await simulator.frame.locator("#Logo").hover();
  await simulator.page.mouse.down();
  await simulator.waitForState((s) => (s.pinLogo as any).value === 1);
  await simulator.expectSerial(/touched\n/);
  await simulator.page.mouse.up();
});

test("board controls are only focusable while running", async ({
  simulator,
}) => {
  const controls = simulator.frame.locator("svg [role='button']");
  await expect(controls).toHaveCount(3);
  for (const control of await controls.all()) {
    await expect(control).toHaveAttribute("tabindex", "-1");
  }
  await simulator.run("from microbit import *\nwhile True:\n    sleep(100)\n");
  for (const control of await controls.all()) {
    await expect(control).toHaveAttribute("tabindex", "0");
  }
  await simulator.stop();
  for (const control of await controls.all()) {
    await expect(control).toHaveAttribute("tabindex", "-1");
  }
});

test("the stopped overlay hides while running", async ({ simulator }) => {
  const overlay = simulator.frame.locator(".play-button-container");
  await expect(overlay).toBeVisible();
  await simulator.run("from microbit import *\nwhile True:\n    sleep(100)\n");
  await expect(overlay).toBeHidden();
  await simulator.stop();
  await expect(overlay).toBeVisible();
});

test("the play button starts from the keyboard", async ({ simulator }) => {
  await simulator.page.evaluate(() => {
    (window as any).filesystem = {
      "main.py": new TextEncoder().encode("print('started')\n"),
    };
  });
  const play = simulator.frame.locator(".play-button");
  await play.focus();
  await play.press("Enter");
  await simulator.expectSerial(/started/);
});
