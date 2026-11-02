from microbit import *

while True:
    if pin_logo.is_touched():
        print("touched")
        while pin_logo.is_touched():
            display.show(Image.HAPPY)
        print("released")
    display.clear()
