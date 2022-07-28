# micro:bit demo, playing a sine wave using AudioFrame's
# This doesn't sound great in the sim or on V2.
# The time per frame is significantly higher in the sim.

import math
import audio
from microbit import pin0, running_time

print("frames should take {} ms to play".format(32 / 7812.5 * 1000))


def repeated_frame(frame, count):
    for i in range(count):
        yield frame


frame = audio.AudioFrame()
nframes = 100

for freq in range(2, 17, 2):
    l = len(frame)
    for i in range(l):
        frame[i] = int(127 * (math.sin(math.pi * i / l * freq) + 1))
    print("play tone at frequency {}".format(freq * 7812.5 / 32))
    t0 = running_time()
    audio.play(repeated_frame(frame, nframes), wait=True, pin=pin0)
    dt_ms = running_time() - t0
    print("{} frames took {} ms = {} ms/frame".format(nframes, dt_ms, dt_ms / nframes))
