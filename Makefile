SRC = src
BUILD = build

all: build dist

build:
	$(MAKE) -C src

dist: build
	mkdir -p $(BUILD)/build
	cp -r $(SRC)/*.html $(SRC)/term.js src/examples $(BUILD)
	cp $(SRC)/build/firmware.js $(SRC)/build/simulator.js $(SRC)/build/firmware.wasm  $(BUILD)/build/

watch: dist
	fswatch -o -e src/build src  | while read _; do $(MAKE) dist; done

clean:
	$(MAKE) -C src clean
	rm -rf $(BUILD)

.PHONY: build dist watch clean all
