SRC = src
DIST = dist

all: build dist

build:
	make -C src

dist:
	mkdir -p $(DIST)/build
	cp -r $(SRC)/*.html $(SRC)/*.svg $(SRC)/term.js src/examples $(DIST)
	cp $(SRC)/build/micropython.js $(SRC)/build/firmware.wasm  $(DIST)/build/

clean:
	$(MAKE) -C src clean
	rm -rf $(DIST)

.PHONY: build dist clean all