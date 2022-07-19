from microbit import *

while True:
    while pin_logo.is_touched():
        display.show(Image.HAPPY)
    display.clear()
