// 咲耶フットボールのアイコン（apple-touch-icon 180 / icon-192 / icon-512 / favicon-32）を作る。
//
//   PWPATH=$(npm root -g)/playwright node tools/mkicon.mjs
//
// 咲耶スクランブル（三角形）・ジャンプバグ（車）・ディグ（ツルハシ）・インベーダーと同じ作りのシンプルなアイコンにする。
//   - 暗い四角 + 金の枠
//   - 中身は1つのシルエットを、マゼンタで塗りつぶし・金で縁取り・マゼンタの淡い光
// 使う色はシリーズのアイコンと同じ3色（地・金・マゼンタ）だけ。形は「サッカーボール」:
// マゼンタの丸に、地の色の五角形（まん中に1つ、ふちに5つ）と、それをつなぐ金の縫い目。
// 形は 180px 基準の座標で書き、どの大きさも同じ形を縮めて作る。Playwright（Chromium の canvas）で描く。
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWPATH || "playwright");

function draw(size) {
  const BG = "#06070C", GOLD = "#E8C56A", FILL = "#FF2D9B";
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const u = size / 180;
  g.fillStyle = BG;
  g.fillRect(0, 0, size, size);
  g.scale(u, u);

  const cx = 90, cy = 91, R = 62;              // ボールのまん中と半径
  const pent = (x, y, r, rot) => {             // 五角形（rot は1つめの頂点の向き）
    const p = new Path2D();
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * 2 * Math.PI) / 5;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      i ? p.lineTo(px, py) : p.moveTo(px, py);
    }
    p.closePath();
    return p;
  };
  const ball = new Path2D();
  ball.arc(cx, cy, R, 0, Math.PI * 2);

  // マゼンタの淡い光 → 金の縁取り（180px 基準で約3px）→ マゼンタの塗り
  g.save();
  g.shadowColor = "rgba(255,45,155,0.6)";
  g.shadowBlur = 18 * u;
  g.fillStyle = "rgba(255,45,155,0.45)";
  g.fill(ball);
  g.restore();
  g.lineJoin = "round";
  g.strokeStyle = GOLD;
  g.lineWidth = 6;
  g.stroke(ball);
  g.fillStyle = FILL;
  g.fill(ball);

  // ボールの中だけに模様を描く: まん中の五角形・ふちの5つの五角形（半分くらいが見える）・それをつなぐ縫い目
  g.save();
  g.clip(ball);
  const top = -Math.PI / 2, r0 = 20, rr = 22, dr = R - 4;
  const center = pent(cx, cy, r0, top);
  const rims = [];
  for (let i = 0; i < 5; i++) {
    const a = top + Math.PI / 5 + (i * 2 * Math.PI) / 5;     // まん中の五角形の辺の向き
    const x = cx + Math.cos(a) * dr, y = cy + Math.sin(a) * dr;
    rims.push({ a, x, y, path: pent(x, y, rr, a + Math.PI) }); // 1つの角をまん中へ向ける
  }
  g.lineWidth = 3.5;
  g.strokeStyle = GOLD;
  g.lineCap = "round";
  // 縫い目: まん中の五角形の角から、外へまっすぐ（ふちの五角形どうしのあいだを通る）
  for (let i = 0; i < 5; i++) {
    const a = top + (i * 2 * Math.PI) / 5;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * (R + 4), cy + Math.sin(a) * (R + 4)); g.stroke();
  }
  for (const rm of rims) { g.fillStyle = BG; g.fill(rm.path); g.stroke(rm.path); }
  g.fillStyle = BG; g.fill(center); g.stroke(center);
  g.restore();
  g.lineWidth = 6; g.strokeStyle = GOLD; g.stroke(ball); // ふちの金をもう一度（模様の上に）

  // 金の枠（180px で 7px。32px でも最低 1px）
  g.setTransform(1, 0, 0, 1, 0, 0);
  const f = Math.max(1, Math.round(7 * u));
  g.strokeStyle = GOLD;
  g.lineWidth = f;
  g.strokeRect(f / 2, f / 2, size - f, size - f);
  return c.toDataURL("image/png");
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512], ["favicon-32.png", 32]]) {
  const url = await page.evaluate(draw, size);
  fs.writeFileSync(path.join(ROOT, file), Buffer.from(url.split(",")[1], "base64"));
  console.log("wrote", file, size);
}
await browser.close();
