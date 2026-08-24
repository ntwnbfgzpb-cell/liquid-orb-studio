import { describe, expect, it } from "vitest";
import { decodeConfig, encodeConfig, normalizeConfig } from "./config";
import { presets } from "./presets";

describe("shared configuration", () => {
  it("round-trips UTF-8 preset names safely", () => {
    const config = { ...presets[0], name: "我的液態球" };
    expect(decodeConfig(encodeConfig(config))).toEqual(config);
  });

  it("repairs malformed values instead of trusting URL input", () => {
    const config = normalizeConfig({
      name: 7,
      colors: ["bad"],
      speed: Infinity,
    });
    expect(config).toEqual(presets[0]);
  });

  it("clamps shared numeric values to the editor limits", () => {
    const config = normalizeConfig({
      speed: 99,
      scale: -4,
      refraction: 1.6,
      glowRadius: 0,
    });
    expect(config.speed).toBe(2);
    expect(config.scale).toBe(0.65);
    expect(config.refraction).toBe(1.6);
    expect(config.glowRadius).toBe(0.5);
  });
});
