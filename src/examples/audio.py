from microbit import *
import audio
import math

def repeated_frame(frame, count=1500):
    for _ in range(count):
        yield frame

frame = audio.AudioFrame()
for i in range(len(frame)):
    frame[i] = int(math.sin(math.pi * i / 16) * 124 + 128.5)
audio.play(repeated_frame(frame))