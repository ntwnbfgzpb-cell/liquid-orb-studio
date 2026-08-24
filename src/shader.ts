export const shader = `
struct U {
  resolution: vec2f,
  time: f32,
  speed: f32,
  c1: vec4f,
  c2: vec4f,
  c3: vec4f,
  shape: vec4f,
  glass: vec4f,
  glow: vec4f,
  material: vec4f,
}
@group(0) @binding(0) var<uniform> u: U;

fn hash31(p: vec3f) -> f32 {
  return fract(sin(dot(p, vec3f(127.1, 311.7, 74.7))) * 43758.5453);
}
fn valueNoise(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p); let q = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3f(1,0,0)), q.x), mix(hash31(i + vec3f(0,1,0)), hash31(i + vec3f(1,1,0)), q.x), q.y), mix(mix(hash31(i + vec3f(0,0,1)), hash31(i + vec3f(1,0,1)), q.x), mix(hash31(i + vec3f(0,1,1)), hash31(i + vec3f(1,1,1)), q.x), q.y), q.z);
}
fn fbm(p0: vec3f) -> f32 {
  var p = p0; var sum = 0.0; var amplitude = 0.55;
  for (var octave = 0; octave < 4; octave++) { sum += valueNoise(p) * amplitude; p = p * 2.03 + vec3f(17.1, 9.2, 13.7); amplitude *= 0.48; }
  return sum;
}
fn sceneField(p0: vec3f) -> f32 {
  let time = u.time * u.speed; var p = p0;
  let coarse = fbm(p * (1.45 + u.shape.y * 1.8) + vec3f(time * 0.13, -time * 0.09, time * 0.07));
  let twist = (coarse - 0.48) * u.shape.z * 0.52;
  p.x += twist * sin(p.y * 4.0 + time * (0.7 + u.glass.w)); p.y += twist * cos(p.x * 3.5 - time * 0.55);
  return length(p) - u.shape.x * 0.58;
}
fn surfaceNormal(p: vec3f) -> vec3f {
  let e = 0.003;
  return normalize(vec3f(sceneField(p + vec3f(e,0,0)) - sceneField(p - vec3f(e,0,0)), sceneField(p + vec3f(0,e,0)) - sceneField(p - vec3f(0,e,0)), sceneField(p + vec3f(0,0,e)) - sceneField(p - vec3f(0,0,e))));
}
fn background(uv: vec2f) -> vec3f {
  let vignette = 1.0 - smoothstep(0.08, 1.45, length(uv * vec2f(0.78, 1.0)));
  var color = mix(vec3f(0.002,0.004,0.012), vec3f(0.012,0.035,0.072), vignette);
  let cell = floor(uv.xyx * vec3f(170.0,120.0,91.0)); let star = step(0.9965, hash31(cell)) * (1.0 - smoothstep(0.15, 1.3, length(uv)));
  color += star * mix(u.c1.rgb, vec3f(1.0), 0.75) * 0.42; return color;
}
fn floorReflection(uv: vec2f) -> vec3f {
  let floorMask = smoothstep(0.27, 0.58, uv.y) * (1.0 - smoothstep(0.44, 1.12, uv.y));
  let width = exp(-pow(abs(uv.x) * 2.45, 2.0)); let depth = exp(-pow((uv.y - 0.64) * 5.2, 2.0));
  let ripples = 0.55 + 0.45 * fbm(vec3f(uv.x * 5.0, uv.y * 13.0, u.time * 0.16));
  return mix(u.c1.rgb, u.c2.rgb, smoothstep(-0.45, 0.45, uv.x)) * width * depth * floorMask * ripples * u.material.y * 0.58;
}
@vertex fn vs(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f,3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3)); return vec4f(positions[index],0,1);
}
@fragment fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
  var uv = (position.xy / u.resolution) * 2.0 - 1.0; uv.x *= u.resolution.x / u.resolution.y; uv.y += 0.08;
  let rayOrigin = vec3f(0,0,2.85); let rayDirection = normalize(vec3f(uv,-1.82));
  var distanceTravelled = 0.0; var hit = false; var point = rayOrigin;
  for (var stepIndex = 0; stepIndex < 104; stepIndex++) { point = rayOrigin + rayDirection * distanceTravelled; let distanceToSurface = sceneField(point); if (abs(distanceToSurface) < 0.0017) { hit = true; break; } distanceTravelled += distanceToSurface * 0.66; if (distanceTravelled > 6.0) { break; } }
  var color = background(uv) + floorReflection(uv);
  if (!hit) { let auraRadius = 0.62 * u.shape.x * u.glow.y; let aura = exp(-max(0.0, length(uv) - auraRadius) * (10.0 - u.material.w * 3.0)); color += u.c1.rgb * aura * u.glow.x * (0.045 + u.material.w * 0.035); return vec4f(color,1); }
  let normal = surfaceNormal(point); let view = -rayDirection; let facing = saturate(dot(view,normal)); let ior = max(1.01,u.glass.x);
  let f0 = pow((ior - 1.0) / (ior + 1.0), 2.0); let fresnel = f0 + (1.0 - f0) * pow(1.0 - facing, 5.0); let time = u.time * u.speed;
  let flowPoint = point * (2.4 + u.shape.y * 3.6) + vec3f(time * 0.16,-time * 0.12,time * 0.09); let flow = fbm(flowPoint);
  let ribbons = 0.5 + 0.5 * sin((point.x + point.y * 0.8 - point.z * 0.42) * 11.0 + flow * 10.0 + time * (0.8 + u.glass.w));
  let fine = fbm(flowPoint * 2.3 + vec3f(4,8,2)); let causticLine = pow(saturate(1.0 - abs(sin(ribbons * 8.0 + fine * 4.0))), 9.0) * u.material.z;
  let base = mix(u.c1.rgb,u.c2.rgb,smoothstep(0.12,0.88,flow)); var interior = mix(base,u.c3.rgb,ribbons * 0.64);
  interior += mix(u.c1.rgb,vec3f(1.0),0.6) * causticLine * 0.58; let absorption = exp(-u.glass.y * (0.9 + (1.0 - facing) * 1.7)); interior *= mix(0.38,1.12,absorption);
  let dispersion = u.glass.z; let spectral = vec3f(interior.r * (1.0 + fresnel * dispersion * 0.48), interior.g, interior.b * (1.0 + (1.0 - facing) * dispersion * 0.66));
  let lightA = normalize(vec3f(-0.48,0.72,0.52)); let lightB = normalize(vec3f(0.65,0.28,0.72)); let glossPower = mix(22.0,150.0,u.material.x);
  let highlightA = pow(saturate(dot(reflect(-lightA,normal),view)),glossPower) * 2.2; let highlightB = pow(saturate(dot(reflect(-lightB,normal),view)),glossPower * 0.55) * 0.85;
  let rim = pow(1.0 - facing,mix(1.2,3.8,u.material.x)); let reflectedSky = mix(u.c2.rgb,vec3f(0.82,0.94,1.0),saturate(normal.y * 0.5 + 0.5));
  var glassColor = mix(spectral * 0.48,spectral,1.0 - fresnel * 0.35); glassColor = mix(glassColor,reflectedSky,fresnel * u.material.y * 0.72);
  glassColor += vec3f(highlightA) + u.c3.rgb * highlightB; glassColor += mix(u.c1.rgb,vec3f(1.0),0.72) * rim * (0.42 + u.glow.x * 0.35); glassColor += spectral * fine * u.material.w * 0.18;
  return vec4f(glassColor,1);
}`;
