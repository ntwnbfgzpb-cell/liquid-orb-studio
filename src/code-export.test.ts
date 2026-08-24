import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  createApplePackage,
  createMetalShader,
  createStandaloneWeb,
  createSwiftUI,
} from "./code-export";
import { presets } from "./presets";
import { shader } from "./shader";

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

  it("packages the Apple export as a complete ZIP", () => {
    const files = unzipSync(createApplePackage(presets[0]));
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "LiquidOrbView.swift",
        "LiquidOrb.metal",
        "README.txt",
      ]),
    );
    expect(strFromU8(files["LiquidOrbView.swift"])).toContain(
      "ShaderLibrary.liquidOrb",
    );
    expect(strFromU8(files["LiquidOrb.metal"])).toContain("[[ stitchable ]]");
    expect(strFromU8(files["README.txt"])).toContain("iOS 17+");
  });

  it("declares mutated WGSL values as variables", () => {
    expect(shader).toContain("var glass=");
    expect(shader).not.toContain("let glass=");
  });
});
