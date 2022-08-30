# Imports go at the top
from microbit import *

# Code in a 'while True:' loop repeats forever
while True:
    print("x: ", compass.get_x())
    print("y: ", compass.get_y())
    print("z: ", compass.get_z())
    print("heading: ", compass.heading())
    print("field strength: ", compass.get_field_strength())
    sleep(1000)
