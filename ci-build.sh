#!/usr/bin/env bash
set -euxo pipefail

# Submodules
git submodule update --init lib/micropython-microbit-v2
(cd lib/micropython-microbit-v2 && git submodule update --init lib/micropython)

# Emscripten
VERSION="3.1.25"
export PYTHON=python3.7 # Needed by Emscripten in Netlify's build image.
git clone https://github.com/emscripten-core/emsdk.git -b $VERSION ~/.emsdk
~/.emsdk/emsdk install $VERSION
~/.emsdk/emsdk activate $VERSION
source ~/.emsdk/emsdk_env.sh

# mpy-cross is built with the host compiler and -Werror, and the host GCC has
# moved several releases beyond the pinned MicroPython: it now rejects the tree
# over -Wdangling-pointer and -Wenum-int-mismatch. Demote -Werror rather than
# chase each new diagnostic, and build it here so the flag stays away from the
# WASM build, which is clang via emcc.
make -C lib/micropython-microbit-v2/lib/micropython/mpy-cross \
  CFLAGS_EXTRA=-Wno-error

npm run test && npm run build
