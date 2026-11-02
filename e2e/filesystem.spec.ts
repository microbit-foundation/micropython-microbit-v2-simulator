import { test } from "./fixtures";

test("imports a module flashed alongside main.py", async ({ simulator }) => {
  await simulator.run("import helper\nprint(helper.greet('micro:bit'))\n", {
    "helper.py": "def greet(name):\n    return 'Hello, ' + name\n",
  });
  await simulator.expectSerial(/^Hello, micro:bit\n/);
});

test("lists flashed files", async ({ simulator }) => {
  await simulator.run("import os\nprint(sorted(os.listdir()))\n", {
    "data.txt": "some data",
  });
  await simulator.expectSerial(/^\['data.txt', 'main.py'\]\n/);
});

test("reads a flashed file", async ({ simulator }) => {
  await simulator.run(
    "with open('data.txt') as f:\n    print(f.read())\nimport os\nprint(os.size('data.txt'))\n",
    { "data.txt": "some data" },
  );
  await simulator.expectSerial(/^some data\n9\n/);
});

test("writes and reads back text and bytes", async ({ simulator }) => {
  await simulator.run(`with open('out.txt', 'w') as f:
    f.write('one')
with open('out.txt') as f:
    print(f.read())
with open('bytes.bin', 'wb') as f:
    f.write(bytes([0, 1, 255]))
with open('bytes.bin', 'rb') as f:
    print(list(f.read()))
`);
  await simulator.expectSerial(/^one\n\[0, 1, 255\]\n/);
});

test("append mode is not supported", async ({ simulator }) => {
  await simulator.run(
    "try:\n    open('out.txt', 'a')\nexcept ValueError as e:\n    print(e)\n",
  );
  await simulator.expectSerial(/^illegal mode\n/);
});

test("removes a file", async ({ simulator }) => {
  await simulator.run(
    "import os\nos.remove('data.txt')\nprint(os.listdir())\n",
    { "data.txt": "some data" },
  );
  await simulator.expectSerial(/^\['main.py'\]\n/);
});

test("opening a missing file raises OSError", async ({ simulator }) => {
  await simulator.run(
    "try:\n    open('missing.txt')\nexcept OSError as e:\n    print('OSError', e.args[0])\n",
  );
  await simulator.expectSerial(/^OSError 2\n/);
});

test("filling the filesystem raises OSError", async ({ simulator }) => {
  await simulator.run(`chunk = 'x' * 1024
written = 0
try:
    with open('big.txt', 'w') as f:
        while True:
            f.write(chunk)
            written += 1
except OSError as e:
    print('full after', written, 'KiB, errno', e.args[0])
import os
os.remove('big.txt')
with open('small.txt', 'w') as f:
    f.write('fits again')
print(open('small.txt').read())
`);
  await simulator.expectSerial(/^full after \d+ KiB, errno 28\nfits again\n/);
});

const writeOnce = `import os
if 'saved.txt' in os.listdir():
    print('found', open('saved.txt').read())
else:
    with open('saved.txt', 'w') as f:
        f.write('kept')
    print('saved')
`;

test("files written by the program survive a reset", async ({ simulator }) => {
  await simulator.run(writeOnce);
  await simulator.expectSerial(/^saved\n/);
  await simulator.expectFinished();
  await simulator.reset();
  await simulator.expectSerial(/found kept\n/);
});

test("flashing replaces files written by the program", async ({
  simulator,
}) => {
  await simulator.run(writeOnce);
  await simulator.expectSerial(/^saved\n/);
  await simulator.run(writeOnce);
  await simulator.expectSerial(/^saved\n/);
});
