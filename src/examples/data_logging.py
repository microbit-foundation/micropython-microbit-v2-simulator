# Imports go at the top
from microbit import *
import log


# Code in a 'while True:' loop repeats forever
while True:
    log.set_labels('temperature', 'sound', 'light')
    log.add({
      'temperature': temperature(),
      'sound': microphone.sound_level(),
      'light': display.read_light_level()
    })
    sleep(1000)
