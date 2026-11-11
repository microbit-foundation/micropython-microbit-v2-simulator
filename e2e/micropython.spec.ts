import { test } from "./fixtures";

// Loops over range() compile to a counted loop, so these cover the iterator
// protocol that other tests' loops never reach.
test("for loop over a list", async ({ simulator }) => {
  await simulator.run("for x in [1, 2, 3]:\n    print(x)\nprint('done')\n");
  await simulator.expectSerial(/1\n2\n3\ndone/);
});

test("for loop over a list inside a function", async ({ simulator }) => {
  await simulator.run(
    "def total(values):\n    t = 0\n    for v in values:\n        t += v\n    return t\nprint(total([1, 2, 3]))\n",
  );
  await simulator.expectSerial(/^6\n/);
});

test("list comprehension", async ({ simulator }) => {
  await simulator.run("print([x * 2 for x in 'ab'])\n");
  await simulator.expectSerial(/\['aa', 'bb'\]/);
});

test("machine.time_pulse_us times out on an idle pin", async ({
  simulator,
}) => {
  await simulator.run(
    "from microbit import *\nimport machine\nprint(machine.time_pulse_us(pin0, 1, 1000))\n",
  );
  await simulator.expectSerial(/^-2\n/);
});

test("machine.time_pulse_us rejects a non-pin", async ({ simulator }) => {
  await simulator.run("import machine\nmachine.time_pulse_us(0, 1, 1000)\n");
  await simulator.expectSerial(/TypeError: expecting a pin/);
});

// Nothing handles an exception raised while reporting an uncaught one, so
// these used to exit the runtime.
test("uncaught exception whose __str__ raises", async ({ simulator }) => {
  await simulator.run(
    "class E(Exception):\n    def __str__(self):\n        raise ValueError('boom')\n    __repr__ = __str__\nraise E()\n",
  );
  await simulator.expectSerial(/line 5, in <module>\n/);
  await simulator.expectFinished();
});

test("uncaught exception whose argument's __str__ raises", async ({
  simulator,
}) => {
  await simulator.run(
    "class A:\n    def __str__(self):\n        raise ValueError('boom')\n    __repr__ = __str__\nraise Exception(A())\n",
  );
  await simulator.expectSerial(/line 5, in <module>\nException: \n/);
  await simulator.expectFinished();
});
