from microbit import *

while True:
    if button_a.is_pressed():
        print("A")
        if button_b.was_pressed():
            print("B")
        print(button_b.get_presses())
        break