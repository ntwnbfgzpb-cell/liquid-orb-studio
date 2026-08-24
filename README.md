# Liquid Orb Studio

從零打造的即時 WebGPU 液態玻璃球編輯器。專案以原創介面、參數模型與 WGSL shader 實作，未複製參考專案的程式碼或素材。

## 功能

- 6 組原創動態玻璃球預設
- 顏色、動態、形狀、折射、色散與光暈即時控制
- URL hash 分享目前設定
- PNG 截圖、獨立 Web 頁面與 SwiftUI View 匯出
- WebGPU 支援偵測、FPS 顯示、暫停與重設
- 桌面與行動版響應式介面

## 開發

需求：Node.js 22+

```bash
npm install
npm run dev
npm run build
npm run check
```

建議使用最新版 Chrome 或 Edge，並確認 WebGPU 已啟用。

GitHub Pages 會由 Actions 執行測試、production build 並自動部署。

## 授權

MIT
