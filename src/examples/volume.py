from microbit import *
import music


music.pitch(440, wait=False)
volume = None
while True:
  # Conveniently both 0..255.
  level = display.read_light_level()
  if level != volume:
    volume = level
    set_volume(volume)
    print("volume", volume)
