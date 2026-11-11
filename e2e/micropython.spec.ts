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
