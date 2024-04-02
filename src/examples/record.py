from microbit import microphone, audio, button_a, button_b

rates = [7812, 3906, 15624]
rate_index = 0

print("Recording...")
frame = microphone.record(3000)
print("Button A to play")
while True:
    if button_a.was_pressed():
        audio.play(frame)
        print("Rate played", rates[rate_index])

    if button_b.was_pressed():
        rate_index = (rate_index + 1) % len(rates)
        print("Rate change to", rates[rate_index])
        frame.set_rate(rates[rate_index])