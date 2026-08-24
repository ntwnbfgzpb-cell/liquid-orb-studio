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
  time = 0;
  lastFrame = this.start;
  paused = false;
  config!: OrbConfig;
  private animationFrame = 0;
  private destroyed = false;
  private failed = false;
  constructor(
    public canvas: HTMLCanvasElement,
    private onError: (message: string) => void = () => undefined,
  ) {}
  async init() {
    if (!navigator.gpu) throw Error("瀏覽器未提供 WebGPU API");
    let adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      adapter = await navigator.gpu.requestAdapter({
        featureLevel: "compatibility",
      });
    }
    if (!adapter) throw Error("此裝置沒有可用的 WebGPU 繪圖介面");
    this.device = await adapter.requestDevice();
    if (this.destroyed) {
      this.device.destroy();
      return;
    }
    void this.device.lost.then((info) => {
      if (!this.destroyed)
        this.onError(`GPU 裝置已中斷：${info.message || info.reason}`);
    });
    const context = this.canvas.getContext("webgpu");
    if (!context) throw Error("瀏覽器無法建立 WebGPU Canvas");
    this.context = context as unknown as GPUCanvasContext;
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
    const compilation = await module.getCompilationInfo();
    const shaderErrors = compilation.messages.filter(
      (message) => message.type === "error",
    );
    if (shaderErrors.length) {
      throw Error(
        `WGSL 編譯失敗：${shaderErrors.map((message) => message.message).join("；")}`,
      );
    }
    this.device.pushErrorScope("validation");
    this.pipeline = await this.device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    const pipelineError = await this.device.popErrorScope();
    if (pipelineError) throw Error(`WebGPU pipeline 失敗：${pipelineError.message}`);
    this.bind = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.buffer } }],
    });
    this.device.pushErrorScope("validation");
    this.render(performance.now());
    await this.device.queue.onSubmittedWorkDone();
    const firstFrameError = await this.device.popErrorScope();
    if (firstFrameError)
      throw Error(`WebGPU 第一幀失敗：${firstFrameError.message}`);
    if (!this.destroyed) this.animationFrame = requestAnimationFrame(this.draw);
  }
  draw = (now: number) => {
    try {
      this.render(now);
    } catch (reason) {
      this.fail(reason);
      return;
    }
    if (!this.destroyed && !this.failed)
      this.animationFrame = requestAnimationFrame(this.draw);
  };
  private render(now: number) {
    this.resize();
    if (this.config) {
      const delta = Math.min((now - this.lastFrame) / 1000, 0.1);
      this.lastFrame = now;
      if (!this.paused) {
        this.frame++;
        this.time += delta;
      }
      if (now - this.last > 500) {
        this.fps = Math.round((this.frame * 1000) / (now - this.last));
        this.frame = 0;
        this.last = now;
      }
      const c = this.config;
      const data = new Float32Array(40);
      data.set([this.canvas.width, this.canvas.height, this.time, c.speed], 0);
      data.set(hex(c.colors[0]), 4);
      data.set(hex(c.colors[1]), 8);
      data.set(hex(c.colors[2]), 12);
      data.set([c.scale, c.detail, c.asymmetry, c.turbulence], 16);
      data.set([c.refraction, c.thickness, c.dispersion, c.swirl], 20);
      data.set([c.glow, c.glowRadius, 0, 0], 24);
      data.set([c.smoothness, c.reflection, c.caustics, c.bloom], 28);
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
  }
  private fail(reason: unknown) {
    if (this.failed || this.destroyed) return;
    this.failed = true;
    this.onError(
      reason instanceof Error
        ? `WebGPU 執行失敗：${reason.message}`
        : "WebGPU 執行失敗",
    );
  }
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.device?.destroy();
  }
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
