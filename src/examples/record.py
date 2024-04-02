from microbit import microphone, audio, button_a, button_b

rates = [7812, 3906, 15624]
rate_index = 0

print("Recording...")
frame = microphone.record(3000)
print("Button A to play")
while True:
    if button_a.was_pressed():
        audio.play(frame)
    if button_b.was_pressed():
        rate_index = (rate_index + 1) % len(rates);
        frame.rate = rates[rate_index]