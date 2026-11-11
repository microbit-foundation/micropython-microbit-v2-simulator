import { AudioRecording, AudioStats } from "./audio";
import { expect, Simulator, test } from "./fixtures";

test.use({ recordAudio: true });

// The recorder runs on the main thread, which is busy while the simulator
// starts, so it misses the start of a sound made straight away. This holds
// the program until there's serial input, sent once the recorder is running.
const waitForRecorder =
  "from microbit import uart as _uart, sleep as _sleep\nwhile not _uart.any():\n    _sleep(10)\n_uart.read()\n";

async function runToEnd(simulator: Simulator, program: string) {
  await simulator.run(waitForRecorder + program);
  await expect
    .poll(() =>
      simulator.frame
        .locator("body")
        .evaluate(() => (window as any).__audioRecording.chunks.length),
    )
    .toBeGreaterThan(0);
  await simulator.sendSerial("\n");
  await simulator.expectFinished({ timeout: 20_000 });
  // The last buffer can still be playing when the prompt appears.
  await simulator.page.waitForTimeout(300);
  return simulator.audio();
}

function expectWithin(
  stats: AudioStats,
  key: keyof AudioStats,
  min: number,
  max: number,
) {
  expect(stats[key], key).toBeGreaterThanOrEqual(min);
  expect(stats[key], key).toBeLessThanOrEqual(max);
}

test("no audio is silent", async ({ simulator }) => {
  const audio = await runToEnd(
    simulator,
    "from microbit import *\nsleep(500)\n",
  );
  expect(audio.stats().soundSeconds).toBe(0);
});

test("music.pitch plays a steady tone", async ({ simulator }) => {
  const audio = await runToEnd(
    simulator,
    "import music\nmusic.pitch(440, 1000)\n",
  );
  const stats = audio.stats();
  expectWithin(stats, "soundSeconds", 0.9, 1.1);
  expectWithin(stats, "frequency", 430, 450);
  expectWithin(stats, "rms", 0.6, 0.8);
  expect(stats.gaps).toBe(0);
});

test("music.play plays notes in sequence", async ({ simulator }) => {
  const audio = await runToEnd(
    simulator,
    "import music\nmusic.set_tempo(bpm=120)\nmusic.play(['c4:4', 'e4:4', 'g4:4'])\n",
  );
  expectWithin(audio.stats(), "soundSeconds", 1.35, 1.7);
  // Windows that straddle two notes give a frequency in between, so look
  // for each note in order rather than at fixed times.
  const frequencies = audio
    .windows(0.1)
    .filter((w) => w.rms > 0.1)
    .map((w) => w.frequency);
  let index = 0;
  for (const note of [261.6, 329.6, 392]) {
    index = frequencies.findIndex(
      (f, i) => i >= index && Math.abs(f - note) / note < 0.04,
    );
    expect(index, `${note} Hz in ${frequencies}`).toBeGreaterThanOrEqual(0);
  }
});

test("set_volume scales the level", async ({ simulator }) => {
  const audio = await runToEnd(
    simulator,
    "from microbit import *\nimport music\nmusic.pitch(440, wait=False)\nset_volume(255)\nsleep(1000)\nset_volume(128)\nsleep(1000)\nmusic.stop()\n",
  );
  const levels = audio
    .windows(0.25)
    .map((w) => w.rms)
    .filter((rms) => rms > 0.01);
  const ratio = Math.min(...levels) / Math.max(...levels);
  expect(ratio).toBeGreaterThan(0.45);
  expect(ratio).toBeLessThan(0.55);
});

test("music.stop stops the tone", async ({ simulator }) => {
  const audio = await runToEnd(
    simulator,
    "from microbit import *\nimport music\nmusic.pitch(440, wait=False)\nsleep(500)\nmusic.stop()\nsleep(1000)\n",
  );
  expectWithin(audio.stats(), "soundSeconds", 0.4, 0.65);
});

test("speech.say", async ({ simulator }) => {
  const audio = await runToEnd(
    simulator,
    "import speech\nspeech.say('hello world')\n",
  );
  const stats = audio.stats();
  expectWithin(stats, "soundSeconds", 0.5, 1.5);
  expect(stats.rms).toBeGreaterThan(0.3);
});

test("built-in sound expression", async ({ simulator }) => {
  const audio = await runToEnd(
    simulator,
    "from microbit import *\naudio.play(Sound.HELLO)\n",
  );
  const stats = audio.stats();
  expectWithin(stats, "soundSeconds", 0.3, 0.8);
  expect(stats.rms).toBeGreaterThan(0.5);
});

test("SoundEffect", async ({ simulator }) => {
  const audio = await runToEnd(
    simulator,
    "from microbit import *\naudio.play(audio.SoundEffect(freq_start=440, freq_end=440, duration=500))\n",
  );
  const stats = audio.stats();
  expectWithin(stats, "soundSeconds", 0.45, 0.6);
  expectWithin(stats, "frequency", 410, 470);
  expect(stats.gaps).toBe(0);
});

const audioFrameProgram = `import audio
frame = audio.AudioFrame()
for i in range(len(frame)):
    frame[i] = 255 if (i // 8) % 2 else 0
def frames():
    for i in range(200):
        yield frame
audio.play(frames())
`;

test("AudioFrame playback", async ({ simulator }) => {
  const audio = await runToEnd(simulator, audioFrameProgram);
  const stats = audio.stats();
  expectWithin(stats, "soundSeconds", 0.7, 1.5);
  expect(stats.rms).toBeGreaterThan(0.5);
});

// Each ~16 ms chunk is only requested when the previous one ends, so
// underruns leave dozens of short gaps that are heard as buzzing.
test.fail("AudioFrame playback has no dropouts", async ({ simulator }) => {
  const audio = await runToEnd(simulator, audioFrameProgram);
  expect(audio.stats().gaps).toBe(0);
});

test("stopping the program stops the sound", async ({ simulator }) => {
  await simulator.run(
    "from microbit import *\nimport music\nmusic.pitch(440, wait=False)\nprint('playing')\nwhile True:\n    sleep(100)\n",
  );
  await simulator.expectSerial(/playing/);
  await simulator.page.waitForTimeout(500);
  await simulator.stop();
  const atStop = (await simulator.audio()).samples.length;
  await simulator.page.waitForTimeout(1000);
  const audio = await simulator.audio();
  const afterStop = new AudioRecording(
    audio.samples.subarray(atStop),
    audio.sampleRate,
  );
  expect(audio.stats().soundSeconds).toBeGreaterThan(0.3);
  // Allow for the buffer that was already playing.
  expectWithin(afterStop.stats(), "soundSeconds", 0, 0.2);
  expect(
    afterStop
      .windows(0.1)
      .slice(2)
      .every((w) => w.rms === 0),
  ).toBe(true);
});

test("muting from the embedder silences output", async ({ simulator }) => {
  await simulator.mute();
  const audio = await runToEnd(
    simulator,
    "import music\nmusic.pitch(440, 500)\n",
  );
  expect(audio.stats().soundSeconds).toBe(0);
});
