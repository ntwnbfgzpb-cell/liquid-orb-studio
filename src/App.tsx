import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Download,
  Link,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { presets } from "./presets";
import type { OrbConfig } from "./types";
import { OrbRenderer } from "./renderer";
const copy = (x: OrbConfig) => JSON.parse(JSON.stringify(x)) as OrbConfig;
const groups = [
  {
    title: "動態 Motion",
    items: [
      ["速度", "speed", 0, 2, 0.01],
      ["擾動", "turbulence", 0, 1, 0.01],
      ["旋流", "swirl", 0, 1, 0.01],
    ],
  },
  {
    title: "形狀 Shape",
    items: [
      ["尺寸", "scale", 0.65, 1.25, 0.01],
      ["細節", "detail", 0, 1, 0.01],
      ["不對稱", "asymmetry", 0, 1, 0.01],
    ],
  },
  {
    title: "玻璃 Glass",
    items: [
      ["折射率", "refraction", 1, 2, 0.01],
      ["厚度", "thickness", 0, 1, 0.01],
      ["色散", "dispersion", 0, 1, 0.01],
    ],
  },
  {
    title: "光暈 Glow",
    items: [
      ["強度", "glow", 0, 2, 0.01],
      ["半徑", "glowRadius", 0.5, 2, 0.01],
    ],
  },
] as const;
export function App() {
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<OrbRenderer | null>(null);
  const [config, setConfig] = useState<OrbConfig>(() => {
    try {
      const h = location.hash.slice(1);
      return h
        ? (JSON.parse(decodeURIComponent(atob(h))) as OrbConfig)
        : copy(presets[0]);
    } catch {
      return copy(presets[0]);
    }
  });
  const [ready, setReady] = useState(false),
    [paused, setPaused] = useState(false),
    [fps, setFps] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const r = new OrbRenderer(canvas.current!);
    renderer.current = r;
    r.config = config;
    r.init()
      .then(() => setReady(true))
      .catch(() => setReady(false));
    const id = setInterval(() => setFps(r.fps), 600);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (renderer.current) renderer.current.config = config;
  }, [config]);
  const set = (k: keyof OrbConfig, v: number | string) =>
    setConfig((s) => ({ ...s, [k]: v }));
  const flash = (s: string) => {
    setNotice(s);
    setTimeout(() => setNotice(""), 1800);
  };
  const share = async () => {
    location.hash = btoa(encodeURIComponent(JSON.stringify(config)));
    await navigator.clipboard?.writeText(location.href);
    flash("分享連結已複製");
  };
  const shot = () => {
    const a = document.createElement("a");
    a.download = "liquid-orb.png";
    a.href = canvas.current!.toDataURL("image/png");
    a.click();
    flash("PNG 已下載");
  };
  const exp = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: "application/json",
      }),
      a = document.createElement("a");
    a.download = "liquid-orb-config.json";
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    flash("設定檔已匯出");
  };
  return (
    <main>
      <header>
        <div className="brand">
          <Sparkles />
          <strong>Liquid Orb Studio</strong>
        </div>
        <div className="actions">
          <button onClick={share}>
            <Link />
            分享
          </button>
          <button onClick={shot}>
            <Camera />
            截圖
          </button>
          <button className="primary" onClick={exp}>
            <Download />
            匯出
          </button>
        </div>
      </header>
      <section className="workspace">
        <aside className="presets">
          <h2>預設 Presets</h2>
          {presets.map((p, i) => (
            <button
              className={p.name === config.name ? "preset active" : "preset"}
              key={p.name}
              onClick={() => setConfig(copy(p))}
            >
              <span
                className="mini"
                style={{
                  background: `radial-gradient(circle at 35% 25%,white 0 3%,${p.colors[0]} 12%,${p.colors[1]} 48%,${p.colors[2]} 75%,#050914 76%)`,
                }}
              />
              <span>
                <b>{p.name}</b>
                <small>Preset {i + 1}</small>
              </span>
            </button>
          ))}
        </aside>
        <div className="stage">
          <canvas ref={canvas} />
          {!ready && (
            <div className="fallback">
              此瀏覽器尚未啟用 WebGPU
              <br />
              <small>請使用最新版 Chrome、Edge 或支援 WebGPU 的瀏覽器</small>
            </div>
          )}
          <div className="stage-label">{config.name}</div>
        </div>
        <aside className="inspector">
          <div className="panel">
            <h2>外觀 Appearance</h2>
            {config.colors.map((c, i) => (
              <label className="color" key={i}>
                <span>{["主色", "次色", "亮部"][i]}</span>
                <input
                  type="color"
                  value={c}
                  onChange={(e) =>
                    setConfig((s) => ({
                      ...s,
                      colors: s.colors.map((x, j) =>
                        j === i ? e.target.value : x,
                      ) as OrbConfig["colors"],
                    }))
                  }
                />
                <code>{c.toUpperCase()}</code>
              </label>
            ))}
          </div>
          {groups.map((g) => (
            <div className="panel" key={g.title}>
              <h2>{g.title}</h2>
              {g.items.map(([label, key, min, max, step]) => (
                <label className="range" key={key}>
                  <span>{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={config[key] as number}
                    onChange={(e) => set(key, +e.target.value)}
                  />
                  <output>{(config[key] as number).toFixed(2)}</output>
                </label>
              ))}
            </div>
          ))}
        </aside>
      </section>
      <footer>
        <div className={ready ? "status ok" : "status"}>
          <i />
          {ready ? "WebGPU 就緒" : "WebGPU 不可用"}
        </div>
        <span>{fps || "--"} FPS</span>
        <div className="transport">
          <button
            onClick={() => {
              const p = !paused;
              setPaused(p);
              if (renderer.current) renderer.current.paused = p;
            }}
          >
            {paused ? <Play /> : <Pause />}
            {paused ? "播放" : "暫停"}
          </button>
          <button onClick={() => setConfig(copy(presets[0]))}>
            <RotateCcw />
            重設
          </button>
        </div>
      </footer>
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
