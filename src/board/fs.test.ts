import { describe, expect, it } from "vitest";
import { FileSystem } from "./fs";

describe("FileSystem", () => {
  it("lists files after a deleted one", () => {
    const fs = new FileSystem();
    const a = fs.create("a.py");
    fs.create("b.py");
    fs.remove(a);
    expect(fs.name(0)).toBe("");
    expect(fs.name(1)).toBe("b.py");
    expect(fs.name(2)).toBeUndefined();
  });

  it("reuses a deleted slot", () => {
    const fs = new FileSystem();
    fs.remove(fs.create("a.py"));
    expect(fs.create("b.py")).toBe(0);
    expect(fs.name(0)).toBe("b.py");
  });
});
