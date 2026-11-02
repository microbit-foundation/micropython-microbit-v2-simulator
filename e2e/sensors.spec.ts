import { expect, Simulator, test } from "./fixtures";

interface SensorCase {
  id: string;
  value: number | string;
  /** Python expression that reads the sensor. */
  read: string;
  expected: string;
}

const cases: SensorCase[] = [
  { id: "temperature", value: 30, read: "temperature()", expected: "30" },
  { id: "temperature", value: -5, read: "temperature()", expected: "-5" },
  {
    id: "lightLevel",
    value: 42,
    read: "display.read_light_level()",
    expected: "42",
  },
  {
    id: "soundLevel",
    value: 77,
    read: "microphone.sound_level()",
    expected: "77",
  },
  {
    id: "accelerometerX",
    value: 512,
    read: "accelerometer.get_x()",
    expected: "512",
  },
  {
    id: "accelerometerY",
    value: -300,
    read: "accelerometer.get_y()",
    expected: "-300",
  },
  {
    id: "accelerometerZ",
    value: 1024,
    read: "accelerometer.get_z()",
    expected: "1024",
  },
  { id: "compassX", value: 1000, read: "compass.get_x()", expected: "1000" },
  { id: "compassY", value: -2000, read: "compass.get_y()", expected: "-2000" },
  { id: "compassZ", value: 3000, read: "compass.get_z()", expected: "3000" },
  {
    id: "compassHeading",
    value: 270,
    read: "compass.heading()",
    expected: "270",
  },
  { id: "pin0", value: 1, read: "pin0.is_touched()", expected: "True" },
  { id: "pin1", value: 1, read: "pin1.is_touched()", expected: "True" },
  { id: "pin2", value: 1, read: "pin2.is_touched()", expected: "True" },
  { id: "pinLogo", value: 1, read: "pin_logo.is_touched()", expected: "True" },
  { id: "buttonA", value: 1, read: "button_a.is_pressed()", expected: "True" },
  { id: "buttonB", value: 1, read: "button_b.is_pressed()", expected: "True" },
];

const gestures = [
  "up",
  "down",
  "left",
  "right",
  "face up",
  "face down",
  "freefall",
  "3g",
  "6g",
  "8g",
  "shake",
];

for (const gesture of gestures) {
  cases.push({
    id: "gesture",
    value: gesture,
    read: "accelerometer.current_gesture()",
    expected: gesture,
  });
}

/** Prints the expression whenever its value changes. */
function watch(read: string) {
  return `from microbit import *
last = None
while True:
    value = ${read}
    if value != last:
        print(value)
        last = value
    sleep(20)
`;
}

for (const { id, value, read, expected } of cases) {
  test(`${id} = ${value} is read by ${read}`, async ({ simulator }) => {
    await simulator.run(watch(read));
    // Wait for the initial value so the change is seen by the loop.
    await simulator.expectSerial(/\n$/);
    await simulator.setValue(id, value);
    await simulator.expectSerial(new RegExp(`\n${expected}\n$`));
  });
}

/** Runs the Python once button A is pressed, after sending the gestures. */
async function afterGestures(
  simulator: Simulator,
  gestures: string[],
  python: string,
) {
  await simulator.run(`from microbit import *
print('ready')
while not button_a.was_pressed():
    sleep(20)
${python}
`);
  // Gestures are events, so they're lost unless the program is running.
  await simulator.expectSerial(/ready/);
  for (const gesture of gestures) {
    await simulator.setValue("gesture", gesture);
  }
  await simulator.setValue("buttonA", 1);
  await simulator.setValue("buttonA", 0);
}

test("accelerometer gesture history", async ({ simulator }) => {
  await afterGestures(
    simulator,
    ["shake", "up"],
    `print(accelerometer.get_gestures())
print(accelerometer.was_gesture('shake'), accelerometer.was_gesture('down'))`,
  );
  await simulator.expectSerial(/^ready\n\('shake', 'up'\)\nTrue False\n/);
});

// Matches the device: was_gesture resets the whole history list, not just the
// gesture it checks.
test("was_gesture clears get_gestures history", async ({ simulator }) => {
  await afterGestures(
    simulator,
    ["shake", "up"],
    `print(accelerometer.was_gesture('down'))
print(accelerometer.get_gestures())
print(accelerometer.was_gesture('up'))`,
  );
  await simulator.expectSerial(/^ready\nFalse\n\(\)\nTrue\n/);
});

test("set_range changes the accelerometer range", async ({ simulator }) => {
  await simulator.run("from microbit import *\naccelerometer.set_range(4)\n");
  await simulator.waitForState(
    (s) =>
      (s.accelerometerX as any).min === -4000 &&
      (s.accelerometerX as any).max === 4000,
  );
});

test("compass field strength combines the axes", async ({ simulator }) => {
  await simulator.setValue("compassX", 3000);
  await simulator.setValue("compassY", 4000);
  await simulator.run(
    "from microbit import *\nprint(compass.get_field_strength())\n",
  );
  await simulator.expectSerial(/^5000\n/);
});

test("out of range values are rejected", async ({ simulator }) => {
  simulator.allowedErrors.push(/temperature given invalid value: 51/);
  await simulator.run(watch("temperature()"));
  await simulator.expectSerial(/^21\n$/);
  await simulator.setValue("temperature", 51);
  await simulator.setValue("temperature", 22);
  await simulator.expectSerial(/^21\n22\n$/);
  expect(simulator.errors.join()).toMatch(/invalid value: 51/);
});
