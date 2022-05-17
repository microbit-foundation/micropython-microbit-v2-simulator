from microbit import *

display.scroll("Hello")
display.scroll("World", wait=False)
for _ in range(0, 50):
    print(display.get_pixel(2, 2))
    sleep(100)
display.show(Image.HEART)
sleep(1000)
display.clear()