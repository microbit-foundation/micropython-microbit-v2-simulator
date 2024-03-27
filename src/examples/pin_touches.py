from microbit import *

def report_pin_touches(pin, pin_type):
    if pin.was_touched():
        print('pin', pin_type, 'was touched', pin.get_touches(), 'time(s)')

while True:
    if button_a.is_pressed():
        report_pin_touches(pin0, "0")
        report_pin_touches(pin1, "1")
        report_pin_touches(pin2, "2")
        report_pin_touches(pin_logo, "logo")
        break
