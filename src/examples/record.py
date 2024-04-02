from microbit import microphone, audio

frame = microphone.record(1000)
audio.play(frame)