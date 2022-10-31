from microbit import display, sleep
import random
import machine


n = random.randrange(0, 100)
print("Default seed ", n)
random.seed(1)
n = random.randrange(0, 100)
print("Fixed seed ", n)
print()
sleep(2000)
machine.reset()
