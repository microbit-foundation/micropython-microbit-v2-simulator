# Makefile to build micropython.js

# Build upon the codal_port code.
CODAL_PORT = $(abspath ../lib/micropython-microbit-v2/src/codal_port)
CODAL_APP = $(abspath ../lib/micropython-microbit-v2/src/codal_app)

MICROPY_ROM_TEXT_COMPRESSION ?= 1
FROZEN_MANIFEST ?= $(CODAL_PORT)/manifest.py

include ../lib/micropython-microbit-v2/lib/micropython/py/mkenv.mk
-include mpconfigport.mk

# QSTR definitions (must come before including py.mk).
QSTR_DEFS = $(CODAL_PORT)/qstrdefsport.h

# Include py core make definitions.
include $(TOP)/py/py.mk

CC = emcc
LD = emcc

MP_VER_FILE = $(HEADER_BUILD)/mpversion.h
MBIT_VER_FILE = $(HEADER_BUILD)/microbitversion.h

LOCAL_LIB_DIR = ../lib/micropython-microbit-v2/lib

INC += -I.
INC += -I$(CODAL_PORT)
INC += -I$(CODAL_APP)
INC += -I$(LOCAL_LIB_DIR)
INC += -I$(TOP)
INC += -I$(BUILD)

# Compiler settings.
CWARN += -Wall -Wpointer-arith -Wuninitialized -Wno-array-bounds
CFLAGS += $(INC) $(CWARN) -std=c99 $(CFLAGS_MOD) $(CFLAGS_ARCH) $(COPT) $(CFLAGS_EXTRA)

# Debugging/Optimization
ifdef DEBUG
COPT += -O3
CFLAGS += -g
else
COPT += -O3 -DNDEBUG
endif

JSFLAGS += -s ASYNCIFY
JSFLAGS += -s EXPORTED_FUNCTIONS="['_mp_js_main']"
JSFLAGS += -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" --js-library jshooks.js

SRC_C += \
	jshal.c \
	main.c \

SRC_C += $(addprefix $(CODAL_PORT)/, \
	drv_display.c \
	drv_image.c \
	drv_radio.c \
	drv_softtimer.c \
	drv_system.c \
	help.c \
	iters.c \
	microbit_accelerometer.c \
	microbit_button.c \
	microbit_compass.c \
	microbit_display.c \
	microbit_i2c.c \
	microbit_image.c \
	microbit_constimage.c \
	microbit_microphone.c \
	microbit_pin.c \
	microbit_pinaudio.c \
	microbit_pinmode.c \
	microbit_sound.c \
	microbit_soundevent.c \
	microbit_speaker.c \
	microbit_spi.c \
	microbit_uart.c \
	modantigravity.c \
	modaudio.c \
	modlog.c \
	modlove.c \
	modmachine.c \
	modmicrobit.c \
	modmusic.c \
	modmusictunes.c \
	modos.c \
	modradio.c \
	modspeech.c \
	modthis.c \
	modutime.c \
	mphalport.c \
	)

SRC_C += \
	shared/readline/readline.c \
	shared/runtime/interrupt_char.c \
	shared/runtime/pyexec.c \
	shared/runtime/stdout_helpers.c \
	$(abspath $(LOCAL_LIB_DIR)/sam/main.c) \
	$(abspath $(LOCAL_LIB_DIR)/sam/reciter.c) \
	$(abspath $(LOCAL_LIB_DIR)/sam/render.c) \
	$(abspath $(LOCAL_LIB_DIR)/sam/sam.c) \
	$(abspath $(LOCAL_LIB_DIR)/sam/debug.c) \

SRC_O += \
	lib/utils/gchelper_m3.o \

OBJ = $(PY_O)
OBJ += $(addprefix $(BUILD)/, $(SRC_C:.c=.o))
OBJ += $(addprefix $(BUILD)/, $(LIB_SRC_C:.c=.o))

# List of sources for qstr extraction.
SRC_QSTR += $(SRC_C) $(LIB_SRC_C)
# Append any auto-generated sources that are needed by sources listed in.
# SRC_QSTR
SRC_QSTR_AUTO_DEPS +=
QSTR_GLOBAL_REQUIREMENTS += $(MBIT_VER_FILE)

# Top-level rule.
all: $(MBIT_VER_FILE) $(BUILD)/micropython.js

# Rule to build header with micro:bit specific version information.
# Also rebuild MicroPython version header in correct directory to pick up git hash.
$(MBIT_VER_FILE): FORCE
	$(Q)mkdir -p $(HEADER_BUILD)
	(cd $(TOP) && $(PYTHON) py/makeversionhdr.py $(abspath $(MP_VER_FILE)))
	$(PYTHON) $(TOP)/py/makeversionhdr.py $(MBIT_VER_FILE).pre
	$(CAT) $(MBIT_VER_FILE).pre | $(SED) s/MICROPY_/MICROBIT_/ > $(MBIT_VER_FILE)

$(BUILD)/micropython.js: $(OBJ) jshooks.js main.js
	$(ECHO) "LINK $(BUILD)/firmware.js"
	$(Q)emcc $(LDFLAGS) -o $(BUILD)/firmware.js $(OBJ) $(JSFLAGS)
	cat main.js $(BUILD)/firmware.js > $@

include $(TOP)/py/mkrules.mk
