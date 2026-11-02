import { expect, test } from "./fixtures";

const heart = "09090:99999:99999:09990:00900";
const blank = "00000:00000:00000:00000:00000";

test("shows an image", async ({ simulator }) => {
  await simulator.run("from microbit import *\ndisplay.show(Image.HEART)\n");
  await simulator.expectDisplay(heart);
});

test("shows each brightness level", async ({ simulator }) => {
  await simulator.run(
    "from microbit import *\nfor i in range(10):\n    display.set_pixel(i % 5, i // 5, i)\n",
  );
  await simulator.expectDisplay("01234:56789:00000:00000:00000");
});

test("get_pixel reads back set_pixel", async ({ simulator }) => {
  await simulator.run(
    "from microbit import *\ndisplay.set_pixel(3, 1, 7)\nprint(display.get_pixel(3, 1))\n",
  );
  await simulator.expectSerial(/^7\n/);
});

test("clear turns off every LED", async ({ simulator }) => {
  await simulator.run(
    "from microbit import *\ndisplay.show(Image.HEART)\nsleep(200)\ndisplay.clear()\nprint('cleared')\n",
  );
  await simulator.expectSerial(/cleared/);
  await simulator.expectDisplay(blank);
});

test("scroll moves the text across the display", async ({ simulator }) => {
  await simulator.run(
    "from microbit import *\ndisplay.scroll('Hello', delay=50, loop=True, wait=False)\n",
  );
  await simulator.expectFinished();
  const frames = new Set<string>();
  await expect
    .poll(
      async () => {
        frames.add(JSON.stringify(await simulator.display()));
        return frames.size;
      },
      { intervals: [20] },
    )
    .toBeGreaterThanOrEqual(5);
});

test("an uncaught exception scrolls on the display", async ({ simulator }) => {
  await simulator.run("raise ValueError('oops')\n");
  await simulator.expectSerial(/ValueError: oops/);
  await expect
    .poll(async () => (await simulator.display()).flat().some((v) => v > 0))
    .toBe(true);
  await simulator.skipErrorScroll();
});

test("stopping clears the display", async ({ simulator }) => {
  await simulator.run("from microbit import *\ndisplay.show(Image.HEART)\n");
  await simulator.expectDisplay(heart);
  await simulator.stop();
  await simulator.expectDisplay(blank);
});

test("a panic shows the sad face and code", async ({ simulator }) => {
  await simulator.run("import microbit\nmicrobit.panic(42)\n");
  await simulator.expectDisplay("99099:99099:00000:09990:90009");
});
