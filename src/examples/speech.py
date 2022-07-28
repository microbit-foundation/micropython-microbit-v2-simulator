import speech
import time

t = time.ticks_ms()
speech.pronounce(' /HEHLOW WERLD')
print(time.ticks_diff(time.ticks_ms(), t))