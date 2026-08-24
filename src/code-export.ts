import { strToU8, zipSync } from "fflate";
import { shader } from "./shader";
import type { OrbConfig } from "./types";

const safeJson = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");
const swiftColor = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (((value >> 16) & 255) / 255).toFixed(4);
  const green = (((value >> 8) & 255) / 255).toFixed(4);
  const blue = ((value & 255) / 255).toFixed(4);
  return `${red}, green: ${green}, blue: ${blue}`;
};

export function downloadText(
  filename: string,
  content: string,
  type = "text/plain",
) {
  downloadBlob(filename, new Blob([content], { type }));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = url;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

export function downloadBinary(
  filename: string,
  content: Uint8Array,
  type = "application/octet-stream",
) {
  downloadBlob(filename, new Blob([new Uint8Array(content)], { type }));
}

export function createStandaloneWeb(config: OrbConfig): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.name}</title><style>*{box-sizing:border-box}html,body,canvas{width:100%;height:100%;margin:0;display:block;background:#050811}#error{position:fixed;inset:0;display:none;place-content:center;text-align:center;color:#b8c5d9;font:16px system-ui}</style></head><body><canvas id="orb"></canvas><div id="error">WebGPU is required to view this orb.</div><script type="module">
const config=${safeJson(config)};const shader=${safeJson(shader)};
const canvas=document.querySelector('#orb'),error=document.querySelector('#error');
const hex=v=>{const n=parseInt(v.slice(1),16);return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255,1]};
async function start(){if(!navigator.gpu)throw Error('WebGPU unavailable');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('No adapter');const device=await adapter.requestDevice(),context=canvas.getContext('webgpu'),format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'premultiplied'});const buffer=device.createBuffer({size:160,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),module=device.createShaderModule({code:shader}),pipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}}),bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});const begin=performance.now();function frame(now){const d=Math.min(devicePixelRatio,2),w=Math.floor(canvas.clientWidth*d),h=Math.floor(canvas.clientHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}const data=new Float32Array(40);data.set([w,h,(now-begin)/1000,config.speed],0);data.set(hex(config.colors[0]),4);data.set(hex(config.colors[1]),8);data.set(hex(config.colors[2]),12);data.set([config.scale,config.detail,config.asymmetry,config.turbulence],16);data.set([config.refraction,config.thickness,config.dispersion,config.swirl],20);data.set([config.glow,config.glowRadius,0,0],24);device.queue.writeBuffer(buffer,0,data);const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:.005,g:.008,b:.018,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);requestAnimationFrame(frame)}requestAnimationFrame(frame)}start().catch(reason=>{console.error(reason);canvas.hidden=true;error.style.display='grid'});
</script></body></html>`;
}

export function createSwiftUI(config: OrbConfig): string {
  return `import SwiftUI

@available(iOS 17.0, macOS 14.0, *)
struct LiquidOrbView: View {
    @State private var start = Date.now
    var body: some View {
        TimelineView(.animation) { timeline in
            GeometryReader { proxy in
                Rectangle()
                    .fill(.black)
                    .colorEffect(
                        ShaderLibrary.liquidOrb(
                            .float2(proxy.size),
                            .float(start.distance(to: timeline.date) * ${config.speed.toFixed(3)}),
                            .color(Color(red: ${swiftColor(config.colors[0])})),
                            .color(Color(red: ${swiftColor(config.colors[1])})),
                            .color(Color(red: ${swiftColor(config.colors[2])})),
                            .float(${config.scale.toFixed(3)}),
                            .float(${config.detail.toFixed(3)}),
                            .float(${config.asymmetry.toFixed(3)}),
                            .float(${config.glow.toFixed(3)})
                        )
                    )
            }
        }
    }
}`;
}

export function createMetalShader(): string {
  return `#include <metal_stdlib>
using namespace metal;

[[ stitchable ]] half4 liquidOrb(
    float2 position, half4 currentColor, float2 size, float time,
    half4 c1, half4 c2, half4 c3, float scale, float detail,
    float asymmetry, float glow
) {
    float2 uv = (position / size) * 2.0 - 1.0;
    uv.x *= size.x / size.y;
    uv.x += sin(time * 0.8 + uv.y * 3.0) * asymmetry * 0.08;
    float radius = 0.58 * scale;
    float d = length(uv);
    float angle = atan2(uv.y, uv.x);
    float flow = 0.5 + 0.5 * sin(angle * (3.0 + detail * 3.0) + time + d * 10.0);
    half3 color = mix(c1.rgb, c2.rgb, half(flow));
    color = mix(color, c3.rgb, half(0.5 + 0.5 * sin(time * 0.7 + uv.y * 8.0)) * 0.55h);
    float edge = 1.0 - smoothstep(radius - 0.025, radius, d);
    float fresnel = pow(saturate(d / radius), 3.0);
    float aura = exp(-max(0.0, d - radius) * 16.0) * glow * 0.2;
    half3 background = half3(0.015h, 0.025h, 0.055h);
    half3 orb = color * half(0.55 + fresnel * 0.9) + half3(fresnel * 0.3);
    return half4(mix(background + c1.rgb * half(aura), orb, half(edge)), 1.0h);
}`;
}

export function createApplePackage(config: OrbConfig): Uint8Array {
  return zipSync(
    {
      "LiquidOrbView.swift": strToU8(createSwiftUI(config)),
      "LiquidOrb.metal": strToU8(createMetalShader()),
      "README.txt": strToU8(
        "Liquid Orb Studio Apple export\n\nAdd LiquidOrbView.swift and LiquidOrb.metal to an iOS 17+ or macOS 14+ SwiftUI project target. The Metal file is loaded through SwiftUI ShaderLibrary.\n",
      ),
    },
    { level: 6 },
  );
}
