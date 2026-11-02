#!/usr/bin/env bash
set -euxo pipefail

# Submodules
git submodule update --init lib/micropython-microbit-v2
(cd lib/micropython-microbit-v2 && git submodule update --init lib/micropython)

# Emscripten
VERSION="6.0.6"
git clone https://github.com/emscripten-core/emsdk.git -b $VERSION ~/.emsdk
~/.emsdk/emsdk install $VERSION
~/.emsdk/emsdk activate $VERSION
# emsdk_env.sh puts its bundled Node first on PATH, which is too old for our JS
# tooling. Emscripten finds its Node via EMSDK_NODE/.emscripten, not PATH.
NODE_BIN="$(dirname "$(command -v node)")"
source ~/.emsdk/emsdk_env.sh
export PATH="$NODE_BIN:$PATH"

# mpy-cross is built with the host compiler and -Werror, and the host GCC has
# moved several releases beyond the pinned MicroPython: it now rejects the tree
# over -Wdangling-pointer and -Wenum-int-mismatch. Demote -Werror rather than
# chase each new diagnostic, and build it here so the flag stays away from the
# WASM build, which is clang via emcc.
make -C lib/micropython-microbit-v2/lib/micropython/mpy-cross \
  CFLAGS_EXTRA=-Wno-error

npm run test && npm run build
