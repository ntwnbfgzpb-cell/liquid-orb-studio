import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Camera,
  Download,
  FileCode2,
  Link,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { presets } from "./presets";
import type { OrbConfig } from "./types";
import { OrbRenderer } from "./renderer";
import { decodeConfig, encodeConfig } from "./config";
import {
  createApplePackage,
  createStandaloneWeb,
  downloadBinary,
  downloadText,
} from "./code-export";
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
    renderer = useRef<OrbRenderer | null>(null),
    exportMenu = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<OrbConfig>(() => {
    try {
      return decodeConfig(location.hash.slice(1));
    } catch {
      return copy(presets[0]);
    }
  });
  const [ready, setReady] = useState(false),
    [paused, setPaused] = useState(false),
    [fps, setFps] = useState(0),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [exportOpen, setExportOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const r = new OrbRenderer(canvas.current!, (message) => {
      if (active) setError(message);
    });
    renderer.current = r;
    r.config = config;
    r.init()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((reason: unknown) => {
        if (active) {
          setReady(false);
          setError(
            reason instanceof Error ? reason.message : "WebGPU 初始化失敗",
          );
        }
      });
    const id = setInterval(() => setFps(r.fps), 600);
    return () => {
      active = false;
      clearInterval(id);
      r.destroy();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    if (renderer.current) renderer.current.config = config;
  }, [config]);
  useEffect(() => {
    if (!exportOpen) return;
    const closeOnPointer = (event: PointerEvent) => {
      if (!exportMenu.current?.contains(event.target as Node))
        setExportOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [exportOpen]);
  const clearSharedHash = () => {
    if (location.hash)
      history.replaceState(null, "", location.pathname + location.search);
  };
  const set = (k: keyof OrbConfig, v: number | string) => {
    clearSharedHash();
    setConfig((s) => ({ ...s, [k]: v }));
  };
  const selectPreset = (preset: OrbConfig) => {
    clearSharedHash();
    setConfig(copy(preset));
  };
  const flash = (s: string) => {
    setNotice(s);
    setTimeout(() => setNotice(""), 1800);
  };
  const share = () => {
    location.hash = encodeConfig(config);
    if (!navigator.clipboard) {
      flash("網址已更新，請從瀏覽器網址列複製");
      return;
    }
    void navigator.clipboard
      .writeText(location.href)
      .then(() => flash("分享連結已複製"))
      .catch(() => flash("網址已更新，請從瀏覽器網址列複製"));
  };
  const shot = () => {
    const a = document.createElement("a");
    a.download = "liquid-orb.png";
    a.href = canvas.current!.toDataURL("image/png");
    a.click();
    flash("PNG 已下載");
  };
  const exportWeb = () => {
    downloadText("liquid-orb.html", createStandaloneWeb(config), "text/html");
    setExportOpen(false);
    flash("獨立 Web 頁面已匯出");
  };
  const exportSwiftUI = () => {
    downloadBinary(
      "LiquidOrb-Apple.zip",
      createApplePackage(config),
      "application/zip",
    );
    setExportOpen(false);
    flash("SwiftUI＋Metal ZIP 已匯出");
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
          <button
            onClick={shot}
            disabled={!ready}
            title={!ready ? "WebGPU 就緒後才能截圖" : undefined}
          >
            <Camera />
            截圖
          </button>
          <div className="export-wrap" ref={exportMenu}>
            <button
              className="primary"
              onClick={() => setExportOpen((open) => !open)}
              aria-expanded={exportOpen}
              aria-haspopup="menu"
            >
              <Download />
              匯出
            </button>
            {exportOpen ? (
              <div className="export-menu" role="menu">
                <button role="menuitem" onClick={exportWeb}>
                  <FileCode2 />
                  <span>
                    <b>獨立 Web 頁面</b>
                    <small>單一 HTML，可直接開啟</small>
                  </span>
                </button>
                <button role="menuitem" onClick={exportSwiftUI}>
                  <FileCode2 />
                  <span>
                    <b>SwiftUI + Metal</b>
                    <small>ZIP 內含 SwiftUI、Metal 與說明</small>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <section className="workspace">
        <aside className="presets">
          <h2>預設 Presets</h2>
          {presets.map((p, i) => (
            <button
              className={p.name === config.name ? "preset active" : "preset"}
              key={p.name}
              onClick={() => selectPreset(p)}
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
              <div
                className={paused ? "fallback-orb paused" : "fallback-orb"}
                aria-hidden="true"
                style={
                  {
                    "--orb-primary": config.colors[0],
                    "--orb-secondary": config.colors[1],
                    "--orb-highlight": config.colors[2],
                    "--orb-speed": `${Math.max(2.8, 8 - config.speed * 3)}s`,
                    "--orb-scale": config.scale,
                  } as CSSProperties
                }
              >
                <i />
                <b />
              </div>
              <div className="fallback-note">
                <strong>相容模式預覽</strong>
                <small>
                  {error || "正在啟動 WebGPU…"}；目前以動態玻璃效果顯示
                </small>
              </div>
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
                  onChange={(e) => {
                    clearSharedHash();
                    setConfig((s) => ({
                      ...s,
                      colors: s.colors.map((x, j) =>
                        j === i ? e.target.value : x,
                      ) as OrbConfig["colors"],
                    }));
                  }}
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
        <div className={ready ? "status ok" : "status compat"}>
          <i />
          {ready ? "WebGPU 就緒" : "相容模式"}
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
          <button onClick={() => selectPreset(presets[0])}>
            <RotateCcw />
            重設
          </button>
        </div>
      </footer>
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
