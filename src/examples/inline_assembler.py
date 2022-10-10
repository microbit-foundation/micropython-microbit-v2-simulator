from microbit import *

# Unsupported in the simulator
@micropython.asm_thumb
def asm_add(r0, r1):
    add(r0, r0, r1)

while True:
    if button_a.was_pressed():
        print(1 + 2)
    elif button_b.was_pressed():
        print(asm_add(1, 2))