import { describe, expect, it } from "vitest";
import { presets } from "./presets";

describe("original orb presets", () => {
  it("ships ten uniquely named, valid presets", () => {
    expect(presets).toHaveLength(10);
    expect(new Set(presets.map((preset) => preset.name)).size).toBe(10);
    for (const preset of presets) {
      expect(preset.colors).toHaveLength(3);
      expect(preset.scale).toBeGreaterThan(0);
      expect(preset.refraction).toBeGreaterThanOrEqual(1);
      expect(preset.smoothness).toBeGreaterThanOrEqual(0);
      expect(preset.reflection).toBeGreaterThanOrEqual(0);
    }
  });
});
