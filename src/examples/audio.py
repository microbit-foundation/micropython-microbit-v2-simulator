import audio

frame = audio.AudioFrame()
for i in range(len(frame)):
    frame[i] = 252 - i * 8
audio.play([frame] * 50)