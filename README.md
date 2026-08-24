# Liquid Orb Studio

[English](docs/README.en.md) · [日本語](docs/README.ja.md) · [한국어](docs/README.ko.md)

即時 WebGPU 液態玻璃球編輯器，可直接在瀏覽器中選擇預設、調整外觀與動態效果，並分享或匯出目前的設計。

[開啟線上版](https://ntwnbfgzpb-cell.github.io/liquid-orb-studio/)

![Liquid Orb Studio 介面預覽](generated_images/exec-e32ce8f6-df03-4c18-8a5e-8d577bc00602.png)

## 可以做什麼

- 從 6 組液態玻璃球預設快速開始
- 即時調整三組顏色、速度、擾動與旋流
- 控制尺寸、細節、不對稱、折射、厚度與色散
- 調整光暈強度與半徑
- 暫停或繼續動畫，並查看即時 FPS
- 產生可分享的設定網址
- 下載目前畫面的 PNG 截圖
- 匯出可獨立開啟的 WebGPU HTML 頁面
- 匯出包含 SwiftUI、Metal 與使用說明的 Apple ZIP

## 使用方式

### 1. 選擇預設

從左側「預設 Presets」選擇 Aqua、Nebula、Aurora 等風格。切換預設後，畫面與右側參數會同步更新。

### 2. 調整液態效果

使用右側控制面板調整：

- **顏色**：設定三組主要色彩。
- **動態**：控制速度、擾動與旋流程度。
- **形狀**：調整尺寸、表面細節及不對稱程度。
- **玻璃**：調整折射率、厚度與色散效果。
- **光暈**：控制外圍光線強度及範圍。

所有變更都會立即反映在中央預覽區。

### 3. 控制動畫

- 按下「暫停」可凍結目前動畫，再次按下即可繼續。
- 按下「重設」可回到目前預設的初始參數。

### 4. 分享設計

按下右上角「分享」，目前參數會寫入網址並複製到剪貼簿。其他人開啟該網址後，即可看到相同設定。

### 5. 截圖與匯出

- **截圖**：將目前畫面下載為 PNG。
- **獨立 Web 頁面**：下載單一 HTML 檔，使用支援 WebGPU 的瀏覽器即可開啟。
- **SwiftUI + Metal**：下載 Apple ZIP，內含 SwiftUI View、Metal shader 與加入專案的簡要說明。

## 使用需求

- 建議使用最新版 Google Chrome 或 Microsoft Edge。
- 瀏覽器與裝置必須支援 WebGPU。
- 若無法顯示液態玻璃球，請確認瀏覽器硬體加速已開啟，並更新瀏覽器及顯示卡驅動程式。
- 手機和平板可使用響應式介面；實際 WebGPU 支援狀況依裝置與瀏覽器而異。

## 快捷入口

- [線上使用 Liquid Orb Studio](https://ntwnbfgzpb-cell.github.io/liquid-orb-studio/)
- [English guide](docs/README.en.md)
- [日本語ガイド](docs/README.ja.md)
- [한국어 안내](docs/README.ko.md)
