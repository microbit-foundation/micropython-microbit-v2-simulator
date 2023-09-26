def g():
    global depth
    depth += 1
    g()
depth = 0
try:
    g()
except RuntimeError:
    pass
print('maximum recursion depth g():', depth)
