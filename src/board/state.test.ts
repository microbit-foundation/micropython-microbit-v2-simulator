import { describe, expect, it } from "vitest";
import { RangeSensor } from "./state";

describe("RangeSensor", () => {
  const sensor = () => new RangeSensor("temperature", -5, 50, 21, "°C");

  it("accepts numbers and numeric strings in range", () => {
    const s = sensor();
    s.setValue(30);
    expect(s.value).toBe(30);
    s.setValue("-5");
    expect(s.value).toBe(-5);
  });

  it("rejects out of range values", () => {
    expect(() => sensor().setValue(51)).toThrow(/invalid value: 51/);
  });

  it("rejects non-numeric strings", () => {
    const s = sensor();
    expect(() => s.setValue("hot")).toThrow(/invalid value: "hot"/);
    expect(s.value).toBe(21);
  });
});
