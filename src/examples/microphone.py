from microbit import *

while True:
    print(microphone.sound_level())
    if microphone.was_event(SoundEvent.LOUD):
        display.show(Image.HAPPY)
    elif microphone.current_event() == SoundEvent.QUIET:
        display.show(Image.ASLEEP)
    else:
        display.clear()
    sleep(500)
