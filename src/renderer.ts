import { shader } from "./shader";
import type { OrbConfig } from "./types";
const hex = (v: string) => {
  const n = parseInt(v.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};
export class OrbRenderer {
  device!: GPUDevice;
  context!: GPUCanvasContext;
  pipeline!: GPURenderPipeline;
  buffer!: GPUBuffer;
  bind!: GPUBindGroup;
  start = performance.now();
  frame = 0;
  fps = 0;
  last = this.start;
  paused = false;
  config!: OrbConfig;
  constructor(public canvas: HTMLCanvasElement) {}
  async init() {
    if (!navigator.gpu) throw Error("WebGPU unavailable");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error("No GPU adapter");
    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext(
      "webgpu",
    ) as unknown as GPUCanvasContext;
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format,
      alphaMode: "premultiplied",
    });
    this.buffer = this.device.createBuffer({
      size: 160,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const module = this.device.createShaderModule({ code: shader });
    this.pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    this.bind = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.buffer } }],
    });
    requestAnimationFrame(this.draw);
  }
  draw = (now: number) => {
    this.resize();
    if (this.config) {
      if (!this.paused) this.frame++;
      if (now - this.last > 500) {
        this.fps = Math.round((this.frame * 1000) / (now - this.last));
        this.frame = 0;
        this.last = now;
      }
      const c = this.config;
      const data = new Float32Array(40);
      data.set(
        [
          this.canvas.width,
          this.canvas.height,
          (now - this.start) / 1000,
          c.speed,
        ],
        0,
      );
      data.set(hex(c.colors[0]), 4);
      data.set(hex(c.colors[1]), 8);
      data.set(hex(c.colors[2]), 12);
      data.set([c.scale, c.detail, c.asymmetry, c.turbulence], 16);
      data.set([c.refraction, c.thickness, c.dispersion, c.swirl], 20);
      data.set([c.glow, c.glowRadius, 0, 0], 24);
      this.device.queue.writeBuffer(this.buffer, 0, data);
      const enc = this.device.createCommandEncoder();
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: this.context.getCurrentTexture().createView(),
            clearValue: { r: 0.005, g: 0.008, b: 0.018, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bind);
      pass.draw(3);
      pass.end();
      this.device.queue.submit([enc.finish()]);
    }
    requestAnimationFrame(this.draw);
  };
  resize() {
    const d = Math.min(devicePixelRatio, 2),
      w = Math.floor(this.canvas.clientWidth * d),
      h = Math.floor(this.canvas.clientHeight * d);
    if (w && h && (this.canvas.width !== w || this.canvas.height !== h)) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }
}
