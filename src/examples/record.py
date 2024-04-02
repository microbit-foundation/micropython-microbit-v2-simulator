from microbit import microphone, audio

frame = microphone.record(1000)
print(len(frame))
for n in range(0, len(frame)):
    print(frame[n], end=',')
audio.play(frame)