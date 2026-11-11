#!/usr/bin/env python3
"""
Regenerates the expected output for MicroPython's tests by running them under
CPython, as MicroPython's own tests/run-tests.py does.

Run this after updating MicroPython, with the CPython version below:

    python3.8 micropython-tests/update-expected.py

Tests that ship their own .exp file use that and get no generated output.
"""

import json
import os
import shutil
import subprocess
import sys

# The CPython that the MicroPython version in use was tested against, so
# its tests don't trip over later changes to CPython's output. MicroPython
# v1.18's CI used Ubuntu 20.04's python3 and pinned this version on macOS.
# Review it when updating MicroPython.
REFERENCE_PYTHON = (3, 8)

# Directories under MicroPython's tests/ to run.
TEST_DIRS = [
    "basics",
    "extmod",
    "float",
    "import",
    "micropython",
    "misc",
    "stress",
    "unicode",
]

HERE = os.path.dirname(os.path.abspath(__file__))
MICROPYTHON = os.path.join(
    HERE, "..", "lib", "micropython-microbit-v2", "lib", "micropython"
)
TESTS = os.path.join(MICROPYTHON, "tests")
EXPECTED = os.path.join(HERE, "expected")


def main():
    if sys.version_info[:2] != REFERENCE_PYTHON:
        sys.exit(
            "Run this with Python %d.%d, not %d.%d."
            % (REFERENCE_PYTHON + sys.version_info[:2])
        )

    with open(os.path.join(HERE, "skip.json")) as f:
        skip = json.load(f)

    shutil.rmtree(EXPECTED, ignore_errors=True)
    failed = []
    for test_dir in TEST_DIRS:
        os.makedirs(os.path.join(EXPECTED, test_dir))
        for name in sorted(os.listdir(os.path.join(TESTS, test_dir))):
            if not name.endswith(".py"):
                continue
            test = test_dir + "/" + name
            if test in skip or os.path.exists(os.path.join(TESTS, test + ".exp")):
                continue
            # Flags and working directory as in run-tests.py.
            result = subprocess.run(
                [sys.executable, "-BS", test],
                cwd=TESTS,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
            )
            if result.returncode != 0:
                failed.append(test)
                continue
            with open(os.path.join(EXPECTED, test + ".exp"), "wb") as f:
                f.write(result.stdout)

    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=MICROPYTHON, universal_newlines=True
    ).strip()
    manifest = {
        "micropython": commit,
        "cpython": "%d.%d.%d" % sys.version_info[:3],
        "dirs": TEST_DIRS,
        # These need an entry in skip.json.
        "cpythonFailed": failed,
    }
    with open(os.path.join(EXPECTED, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
