from microbit import *
import radio


radio.on();
while True:
    message = radio.receive_bytes()
    if message:
        print(message)
