#!/usr/bin/env bash
set -euxo pipefail

# Submodules
git submodule update --init lib/micropython-microbit-v2
(cd lib/micropython-microbit-v2 && git submodule update --init lib/micropython)

# Emscripten
export PYTHON=python3.7 # Needed by Emscripten in Netlify's build image.
git clone https://github.com/emscripten-core/emsdk.git ~/.emsdk
~/.emsdk/emsdk install latest
~/.emsdk/emsdk activate latest
source ~/.emsdk/emsdk_env.sh

npm run build
