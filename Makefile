SRC = src
DIST = dist

all: build dist

build:
	$(MAKE) -C src

dist: build
	mkdir -p $(DIST)/build
	cp -r $(SRC)/*.html $(SRC)/term.js src/examples $(DIST)
	cp $(SRC)/build/micropython.js $(SRC)/build/firmware.wasm  $(DIST)/build/

watch: dist
	fswatch -o -e src/build src  | while read _; do $(MAKE) dist; done

clean:
	$(MAKE) -C src clean
	rm -rf $(DIST)

.PHONY: build dist watch clean all