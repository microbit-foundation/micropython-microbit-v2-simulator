from microbit import *
import music

music.play(['f', 'a', 'c', 'e'], wait=False)
display.scroll("Music and scrolling in the background", wait=False)
print("This should be printed before the scroll and play complete")