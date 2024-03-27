from microbit import microphone, audio

frame = microphone.record(1000)
print(len(frame))
for n in range(0, 10):
  print(frame[n])
audio.play(frame)