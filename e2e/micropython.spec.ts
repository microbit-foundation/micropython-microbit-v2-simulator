import { test } from "./fixtures";

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

test("program that ends with the heap locked", async ({ simulator }) => {
  await simulator.run("import micropython\nmicropython.heap_lock()\n");
  await simulator.expectFinished();
});

test("uncaught exception with the heap locked", async ({ simulator }) => {
  await simulator.run(
    "import micropython\nmicropython.heap_lock()\nraise ValueError\n",
  );
  await simulator.expectSerial(/ValueError/);
  await simulator.skipErrorScroll();
  await simulator.expectFinished();
});
