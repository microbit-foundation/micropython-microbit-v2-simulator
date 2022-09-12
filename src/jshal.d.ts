import { EmscriptenModule } from "./board/wasm";

global {
  // In reality this is a local variable as jshal.js is splatted into the generated code.
  declare const Module: EmscriptenModule;
  declare const LibraryManager: {
    library: any;
  };

  // Just what we need. There are lots more Emscripten helpers available.
  declare function UTF8ToString(ptr: number, len?: number);
  declare function stringToUTF8(s: string, buf: number, len: number);
  declare function lengthBytesUTF8(s: string);
  declare function mergeInto(library: any, functions: Record<string, function>);
}
