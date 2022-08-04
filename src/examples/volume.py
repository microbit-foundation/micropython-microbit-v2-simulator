from microbit import *
import music


music.pitch(440, wait=False)
while True:
  # Conveniently both 0..255.
  set_volume(display.read_light_level())