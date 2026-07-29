// Mint Breeze Theme - marketplace preview screenshot generator (pureimage + TTF).
// Draws a VS Code-like mockup (no Unicode glyphs) for light & dark themes.
const pureimage = require("pureimage");
const fs = require("fs");
const path = require("path");

const FONT = path.join(__dirname, "JetBrainsMono-Regular.ttf");
const __font = pureimage.registerFont(FONT, "JetBrains");
try { __font.loadSync(); } catch (e) { console.error("font load failed:", e.message); }
const FAM = "JetBrains";

const W = 1280, H = 800;
const TITLE_H = 38, TAB_H = 38, STATUS_H = 26, ACT_W = 52;
const SIDEBAR_X = ACT_W, SIDEBAR_W = 248, SIDEBAR_END = SIDEBAR_X + SIDEBAR_W;
const CODE_X = SIDEBAR_END + 56;
const LINE_H = 24;

// ---- palette per mode ----
function palette(mode) {
  if (mode === "light") {
    return {
      titleBg: "#F5FFFC", titleFg: "#2E3A37",
      actBg: "#ECFAF6", actFg: "#3C9D8B", actInactive: "#8FBDB2", actBadge: "#62C7B5",
      sideBg: "#ECFAF6", sideFg: "#2E3A37", sideHeader: "#3C9D8B", sideSel: "#B8E8DD", sideSelFg: "#2E3A37",
      tabActiveBg: "#F5FFFC", tabInactiveBg: "#ECFAF6", tabFg: "#2E3A37", tabInactiveFg: "#7FA39B", tabBorder: "#62C7B5",
      editorBg: "#F5FFFC", editorFg: "#2E3A37", lineNum: "#A9C7C0", lineNumActive: "#4FB6A5", lineHi: "#ECFAF6",
      statusBg: "#62C7B5", statusFg: "#FFFFFF",
      minimap: "#DDF5EE",
      tok: {
        comment: "#91AAA3", string: "#7D9F78", number: "#D18B65", keyword: "#3C9D8B",
        func: "#4FB6A5", type: "#4FB6A5", tag: "#3C9D8B", attr: "#4FB6A5",
        variable: "#2E3A37", punc: "#91AAA3", link: "#62C7B5",
      },
    };
  }
  return {
    titleBg: "#121C1B", titleFg: "#D8E8E3",
    actBg: "#121C1B", actFg: "#8FE6D2", actInactive: "#6E918B", actBadge: "#75D8C4",
    sideBg: "#1E302D", sideFg: "#D8E8E3", sideHeader: "#8FE6D2", sideSel: "#3E6F67", sideSelFg: "#EAF6F2",
    tabActiveBg: "#172523", tabInactiveBg: "#1E302D", tabFg: "#D8E8E3", tabInactiveFg: "#6E918B", tabBorder: "#75D8C4",
    editorBg: "#172523", editorFg: "#D8E8E3", lineNum: "#4A6560", lineNumActive: "#A5F0DE", lineHi: "#1E302D",
    statusBg: "#75D8C4", statusFg: "#0E1817",
    minimap: "#263B37",
    tok: {
      comment: "#7F9A94", string: "#A8D6A0", number: "#F0B58A", keyword: "#8FE6D2",
      func: "#A5F0DE", type: "#A5F0DE", tag: "#8FE6D2", attr: "#A5F0DE",
      variable: "#D8E8E3", punc: "#6E918B", link: "#75D8C4",
    },
  };
}

// ---- helpers ----
function text(ctx, str, x, y, color, size) {
  ctx.font = `${size}px ${FAM}`;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}
function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function activityIcon(ctx, idx, cx, cy, c) {
  const s = 9;
  switch (idx) {
    case 0: // explorer: two overlapping document squares
      rect(ctx, cx - s, cy - s + 4, s * 1.4, s * 1.4, c);
      rect(ctx, cx - s + 4, cy - s, s * 1.4, s * 1.4, c);
      break;
    case 1: // search: circle + handle
      ctx.strokeStyle = c; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 3, cy + 3); ctx.lineTo(cx + 8, cy + 8); ctx.stroke();
      break;
    case 2: // git branch
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(cx - 6, cy - 6, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, cy + 6, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, cy - 6, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(cx - 6, cy - 3); ctx.lineTo(cx - 6, cy + 6); ctx.lineTo(cx + 6, cy + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy - 6); ctx.stroke();
      break;
    case 3: // play triangle
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(cx - 6, cy - 7); ctx.lineTo(cx - 6, cy + 7); ctx.lineTo(cx + 8, cy); ctx.closePath(); ctx.fill();
      break;
    case 4: // extensions: 2x2 grid
      rect(ctx, cx - 7, cy - 7, 6, 6, c); rect(ctx, cx + 1, cy - 7, 6, 6, c);
      rect(ctx, cx - 7, cy + 1, 6, 6, c); rect(ctx, cx + 1, cy + 1, 6, 6, c);
      break;
    case 5: // settings: gear-ish (circle + ticks)
      ctx.strokeStyle = c; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
      break;
  }
}

function folderIcon(ctx, x, y, c) {
  // simple folder: triangle + body
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y); ctx.lineTo(x + 10, y + 4); ctx.lineTo(x + 22, y + 4);
  ctx.lineTo(x + 22, y + 14); ctx.lineTo(x, y + 14); ctx.closePath(); ctx.fill();
  rect(ctx, x + 4, y + 6, 14, 7, "#FFFFFF");
}
function fileIcon(ctx, x, y, c) {
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y); ctx.lineTo(x + 22, y + 6); ctx.lineTo(x + 22, y + 16);
  ctx.lineTo(x, y + 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#FFFFFF"; ctx.beginPath();
  ctx.moveTo(x + 16, y); ctx.lineTo(x + 16, y + 6); ctx.lineTo(x + 22, y + 6); ctx.closePath(); ctx.fill();
}

// ---- sample code (hand-tokenized) ----
function codeLines(T) {
  const kw = T.keyword, fn = T.func, ty = T.type, st = T.string, nm = T.number,
    tg = T.tag, at = T.attr, va = T.variable, pu = T.punc, cm = T.comment;
  return [
    [["import", kw], [" React", va], [",", pu], [" {", pu], [" useState", fn], [" }", pu], [" from", kw], [" 'react'", st], [";", pu]],
    [],
    [[`// A calm mint-themed counter component`, cm]],
    [["export", kw], [" default", kw], [" function", kw], [" Counter", ty], ["()", pu], [" {", pu]],
    [["  const", kw], [" [", pu], ["count", va], [",", pu], [" setCount", fn], ["]", pu], [" =", pu], [" useState", fn], ["(", pu], ["0", nm], [")", pu], [";", pu]],
    [],
    [["  return", kw], [" (", pu]],
    [["    <", tg], ["div", tg], [" className", at], ["=", pu], ['"app"', st], [">", tg]],
    [["      <", tg], ["h1", tg], [">", tg], ["Mint Breeze", va], ["</", tg], ["h1", tg], [">", tg]],
    [["      <", tg], ["p", tg], [">", tg], ["Count: {count}", va], ["</", tg], ["p", tg], [">", tg]],
    [["      <", tg], ["button", tg], [" onClick", at], ["=", pu], ["{", pu], ["()", va], [" =>", kw], [" setCount", fn], ["(", pu], ["count", va], [" +", pu], [" 1", nm], [")", pu], ["}", pu], [">", tg], ["+1", va], ["</", tg], ["button", tg], [">", tg]],
    [["    </", tg], ["div", tg], [">", tg]],
    [["  )", pu], [";", pu]],
    [["}", pu]],
    [],
    [["function", kw], [" format", fn], ["(", pu], ["value", va], [":", pu], [" number", ty], [")", pu], [" {", pu]],
    [["  return", kw], [" value", va], [".toString", fn], ["();", pu]],
    [["}", pu]],
    [],
    [["const", kw], [" theme", va], [" =", pu], [" {", pu]],
    [["  name", at], [":", pu], [" 'Mint Breeze'", st], [",", pu]],
    [["  mode", at], [":", pu], [' "dark"', st], [",", pu]],
    [["  accent", at], [":", pu], [" 0x75D8C4", nm]],
    [["};", pu]],
  ];
}

function draw(mode) {
  fs.mkdirSync(path.join(__dirname, "..", "screenshots"), { recursive: true });
  const P = palette(mode);
  const bmp = pureimage.make(W, H);
  const ctx = bmp.getContext("2d");

  // editor background (whole canvas)
  rect(ctx, 0, 0, W, H, P.editorBg);

  // title bar
  rect(ctx, 0, 0, W, TITLE_H, P.titleBg);
  // window controls (left circles)
  const wc = mode === "light" ? ["#E08A6A", "#D18B65", "#5BAE8F"] : ["#E08A6A", "#F0B58A", "#8FD8C8"];
  wc.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(18 + i * 18, TITLE_H / 2, 6, 0, Math.PI * 2); ctx.fill(); });
  text(ctx, "Mint Breeze  -  App.tsx", W / 2 - 90, TITLE_H / 2 + 4, P.titleFg, 13);
  // right side title hints
  text(ctx, "TypeScript", W - 240, TITLE_H / 2 + 4, P.lineNum, 12);
  text(ctx, "UTF-8", W - 150, TITLE_H / 2 + 4, P.lineNum, 12);
  text(ctx, "LF", W - 86, TITLE_H / 2 + 4, P.lineNum, 12);

  // activity bar
  rect(ctx, 0, TITLE_H, ACT_W, H - TITLE_H - STATUS_H, P.actBg);
  for (let i = 0; i < 6; i++) {
    const cy = TITLE_H + 50 + i * 52;
    const c = i === 0 ? P.actFg : P.actInactive;
    activityIcon(ctx, i, ACT_W / 2, cy, c);
  }
  // active indicator + badge
  rect(ctx, 0, TITLE_H + 50 - 16, 2, 32, P.actFg);
  ctx.fillStyle = P.actBadge; ctx.beginPath(); ctx.arc(ACT_W / 2 + 14, TITLE_H + 50 - 12, 8, 0, Math.PI * 2); ctx.fill();
  text(ctx, "3", ACT_W / 2 + 14, TITLE_H + 50 - 8, "#FFFFFF", 10);

  // sidebar
  rect(ctx, SIDEBAR_X, TITLE_H, SIDEBAR_W, H - TITLE_H - STATUS_H, P.sideBg);
  text(ctx, "EXPLORER", SIDEBAR_X + 14, TITLE_H + 22, P.sideHeader, 12);
  const tree = [
    ["src", "folder", false],
    ["  App.tsx", "file", true],
    ["  index.tsx", "file", false],
    ["  styles.css", "file", false],
    ["components", "folder", false],
    ["  Counter.tsx", "file", false],
    ["README.md", "file", false],
    ["package.json", "file", false],
  ];
  let ry = TITLE_H + 40;
  tree.forEach(([label, kind, sel]) => {
    if (sel) rect(ctx, SIDEBAR_X, ry - 4, SIDEBAR_W, 24, P.sideSel);
    const ix = SIDEBAR_X + 14 + (label.startsWith("  ") && kind === "file" ? 14 : 0) + (label.startsWith("    ") ? 28 : 0);
    const clean = label.trim();
    if (kind === "folder") folderIcon(ctx, ix, ry, sel ? P.sideSelFg : P.actFg);
    else fileIcon(ctx, ix, ry, sel ? P.sideSelFg : P.sideHeader);
    text(ctx, clean, ix + 28, ry + 13, sel ? P.sideSelFg : P.sideFg, 13);
    ry += 26;
  });

  // tabs bar
  const tabsTop = TITLE_H;
  rect(ctx, SIDEBAR_END, tabsTop, W - SIDEBAR_END, TAB_H, P.tabInactiveBg);
  // active tab
  rect(ctx, SIDEBAR_END, tabsTop, 150, TAB_H, P.tabActiveBg);
  rect(ctx, SIDEBAR_END, tabsTop, 150, 2, P.tabBorder);
  fileIcon(ctx, SIDEBAR_END + 12, tabsTop + 11, P.tabFg);
  text(ctx, "App.tsx", SIDEBAR_END + 44, tabsTop + 24, P.tabFg, 13);
  // inactive tab
  fileIcon(ctx, SIDEBAR_END + 290, tabsTop + 11, P.tabInactiveFg);
  text(ctx, "Counter.tsx", SIDEBAR_END + 322, tabsTop + 24, P.tabInactiveFg, 13);

  // code area
  const codeTop = tabsTop + TAB_H;
  rect(ctx, SIDEBAR_END, codeTop, W - SIDEBAR_END, H - codeTop - STATUS_H, P.editorBg);
  // line highlight on active line
  rect(ctx, SIDEBAR_END, codeTop + LINE_H * 5, W - SIDEBAR_END, LINE_H, P.lineHi);

  const lines = codeLines(P.tok);
  const adv = 15 * 0.6; // monospace advance for size 15
  let y = codeTop + LINE_H;
  lines.forEach((segs, i) => {
    // line number
    const ln = String(i + 1);
    text(ctx, ln, SIDEBAR_END + 24 - ln.length * 8, y + 13, i === 5 ? P.lineNumActive : P.lineNum, 12);
    // code
    let x = CODE_X;
    segs.forEach(([t, c]) => {
      text(ctx, t, x, y + 13, c, 15);
      x += t.length * adv;
    });
    y += LINE_H;
  });

  // minimap (faint right block)
  const mmW = 90, mmX = W - mmW - 16, mmY = codeTop + 16;
  rect(ctx, mmX, mmY, mmW, 220, P.minimap);
  let my = mmY + 10;
  for (let r = 0; r < 18; r++) {
    const w = 18 + ((r * 37) % (mmW - 30));
    rect(ctx, mmX + 12, my, w, 4, mode === "light" ? "#B8E8DD" : "#385650");
    my += 9;
  }

  // status bar
  const sY = H - STATUS_H;
  rect(ctx, 0, sY, W, STATUS_H, P.statusBg);
  // branch glyph + label
  ctx.fillStyle = P.statusFg; ctx.beginPath(); ctx.arc(18, sY + STATUS_H / 2, 5, 0, Math.PI * 2); ctx.fill();
  text(ctx, "main", 32, sY + 17, P.statusFg, 12);
  // errors/warnings (right)
  text(ctx, "TypeScript", W - 430, sY + 17, P.statusFg, 12);
  text(ctx, "UTF-8", W - 300, sY + 17, P.statusFg, 12);
  text(ctx, "Spaces: 2", W - 140, sY + 17, P.statusFg, 12);
  text(ctx, "0  0", W - 66, sY + 17, P.statusFg, 12);

  // border between sidebar and editor
  rect(ctx, SIDEBAR_END, TITLE_H, 1, H - TITLE_H - STATUS_H, mode === "light" ? "#DDF5EE" : "#263B37");

  const out = path.join(__dirname, "..", "screenshots", `mint-breeze-${mode}.png`);
  return pureimage.encodePNGToStream(bmp, fs.createWriteStream(out)).then(() => console.log("Wrote", out));
}

Promise.all(["light", "dark"].map(draw)).catch((e) => { console.error(e); process.exit(1); });
