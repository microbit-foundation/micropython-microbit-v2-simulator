from microbit import *

# You don't hear this one because we don't wait then play another which stops this one.
display.show(Image.HAPPY)
audio.play(Sound.GIGGLE, wait=False)
audio.play(Sound.GIGGLE)
display.show(Image.SAD) # This doesn't happen until the giggling is over.
audio.play(Sound.SAD)
