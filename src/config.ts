import { presets } from "./presets";
import type { OrbConfig } from "./types";

const numericKeys: (keyof OrbConfig)[] = [
  "speed",
  "turbulence",
  "swirl",
  "scale",
  "detail",
  "asymmetry",
  "refraction",
  "thickness",
  "dispersion",
  "glow",
  "glowRadius",
];
const colorPattern = /^#[0-9a-f]{6}$/i;

export function normalizeConfig(value: unknown): OrbConfig {
  const fallback = structuredClone(presets[0]);
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<OrbConfig>;
  const next = {
    ...fallback,
    name:
      typeof candidate.name === "string"
        ? candidate.name.replace(/[<>&"']/g, "").slice(0, 48) || fallback.name
        : fallback.name,
  };
  if (Array.isArray(candidate.colors) && candidate.colors.length === 3) {
    next.colors = candidate.colors.map((color, index) =>
      typeof color === "string" && colorPattern.test(color)
        ? color
        : fallback.colors[index],
    ) as OrbConfig["colors"];
  }
  for (const key of numericKeys) {
    const value = candidate[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

export function encodeConfig(config: OrbConfig): string {
  const bytes = new TextEncoder().encode(JSON.stringify(config));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function decodeConfig(hash: string): OrbConfig {
  if (!hash) return structuredClone(presets[0]);
  const base64 = hash.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return normalizeConfig(JSON.parse(new TextDecoder().decode(bytes)));
}
