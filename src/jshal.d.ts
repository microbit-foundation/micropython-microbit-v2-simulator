import { SimulatorEmscriptenModule } from "./board/wasm";

global {
  // In reality this is a local variable as jshal.js is splatted into the generated code.
  declare const Module: SimulatorEmscriptenModule;
  declare const LibraryManager: {
    library: any;
  };
  declare function mergeInto(library: any, functions: Record<string, function>);
}
