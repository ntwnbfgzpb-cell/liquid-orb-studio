import { describe, expect, it } from "vitest";
import {
  createMetalShader,
  createStandaloneWeb,
  createSwiftUI,
} from "./code-export";
import { presets } from "./presets";

describe("code exports", () => {
  it("creates a self-contained WebGPU HTML document", () => {
    const output = createStandaloneWeb(presets[0]);
    expect(output).toContain("<!doctype html>");
    expect(output).toContain("navigator.gpu");
    expect(output).toContain(presets[0].colors[0]);
  });

  it("creates matching SwiftUI and Metal shader files", () => {
    const swift = createSwiftUI(presets[0]);
    expect(swift).toContain("ShaderLibrary.liquidOrb");
    expect(swift).toContain("green:");
    expect(createMetalShader()).toContain("[[ stitchable ]] half4 liquidOrb");
  });
});
