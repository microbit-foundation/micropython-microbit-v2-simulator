from microbit import *

def report_pin_touches(pin, p_num):
    if pin.was_touched():
        print('pin', p_num, 'was touched', pin.get_touches(), 'time(s)')

while True:
    if pin_logo.is_touched():
        report_pin_touches(pin0, "0")
        report_pin_touches(pin1, "1")
        report_pin_touches(pin2, "2")
        break
