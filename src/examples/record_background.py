from microbit import microphone, audio, button_a, button_b, sleep

rates = [7812, 3906, 15624]
rate_index = 0

print("Recording...")
my_recording = audio.AudioRecording(3000)
my_track = microphone.record_into(my_recording, wait=False)
sleep(3000)
print("Button A to play")
while True:
    if button_a.was_pressed():
        audio.play(my_track, wait=False)
        print("Rate playing", rates[rate_index])

    if button_b.was_pressed():
        rate_index = (rate_index + 1) % len(rates)
        print("Rate change to", rates[rate_index])
        my_track.set_rate(rates[rate_index])