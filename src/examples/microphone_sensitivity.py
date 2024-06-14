from microbit import microphone, audio, button_a, button_b, pin_logo

sensitivities = [
    microphone.SENSITIVITY_LOW, 
    microphone.SENSITIVITY_MEDIUM, 
    microphone.SENSITIVITY_HIGH
]
sensitivity_index = 0

print("Recording...")
frame = microphone.record(3000)
print("Button A to play")
print("Button B to record")
print("Logo to change sensitivity")

while True:
    if button_a.was_pressed():
        print("Start playing")
        audio.play(frame, wait=True)
        print("Playing ended")

    if button_b.was_pressed():
        print("Recording...")
        frame = microphone.record(3000)

    if pin_logo.was_touched():
        sensitivity_index = (sensitivity_index + 1) % len(sensitivities)
        print("Sensitivity change to", sensitivities[sensitivity_index])
        microphone.set_sensitivity(sensitivities[sensitivity_index])

