// Shop pictures for each pack: a fanned "hero" shot and a grid of every page.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const uri = async (file) => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;

function frame(fonts, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
    html,body{margin:0}
    .stage{width:2000px;height:2000px;position:relative;overflow:hidden;font-family:Nunito;
      background:#fff1ee radial-gradient(#f3c9d8 2.5px, transparent 2.6px) 0 0/44px 44px}
    .pg{position:absolute;width:720px;height:1018px;background:#fff;border-radius:10px;
      box-shadow:0 18px 40px rgba(43,43,43,.22);overflow:hidden}
    .pg img{width:100%;height:100%;display:block}
    .brand{position:absolute;left:0;right:0;text-align:center;font-family:Pacifico;color:#b0245f}
    .title{position:absolute;left:0;right:0;text-align:center;font-family:Pacifico;color:#e94b4b;
      -webkit-text-stroke:4px #231f20;paint-order:stroke fill}
    .pill{position:absolute;left:50%;transform:translateX(-50%);background:#231f20;color:#fff;
      font-weight:900;font-size:44px;padding:18px 44px;border-radius:999px;white-space:nowrap}
    .grid{position:absolute;display:grid;gap:26px}
    .grid .cell{background:#fff;border-radius:8px;box-shadow:0 8px 18px rgba(43,43,43,.18);overflow:hidden;aspect-ratio:210/297}
    .grid img{width:100%;height:100%;display:block}
  </style></head><body><div class="stage">${inner}</div></body></html>`;
}

export async function previews(tab, outDir, { colouring, activity, fonts, shots }) {
  await tab.setViewportSize({ width: 2000, height: 2000 });
  const shoot = async (html, file) => {
    await tab.setContent(html, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.locator('.stage').screenshot({ path: file, scale: 'css' });
    console.log('wrote', file);
  };

  for (const [pack, name, count, label, fan] of [
    [colouring, 'Colouring Pack', '12 pages to colour', 'colouring', [0, 6, 13]],
    [activity, 'Activity Pack', '10 activities + answers', 'activity', [0, 6, 8]],
  ]) {
    const pages = shots[pack.id];
    const imgs = await Promise.all(fan.map((i) => uri(pages[i])));
    // back pages first, cover last so it sits on top
    const spots = [
      [640, 600, -2, 1],
      [190, 660, -10, 0.92],
      [1090, 660, 10, 0.92],
    ];
    const hero = `<div class="brand" style="top:60px;font-size:64px">Sparkle by Kimberley</div>
      <div class="title" style="top:140px;font-size:150px">Christmas ${name}</div>
      ${[1, 2, 0].map((k) => `<div class="pg" style="left:${spots[k][0]}px;top:${spots[k][1]}px;transform:rotate(${spots[k][2]}deg) scale(${spots[k][3]})"><img src="${imgs[k]}"></div>`).join('')}
      <div class="pill" style="top:1820px">Printable PDF · ${count} · instant download</div>`;
    await shoot(frame(fonts, hero), join(outDir, `${pack.file}-preview-1.png`));

    const all = await Promise.all(pages.slice(2).map(uri));
    const grid = `<div class="title" style="top:40px;font-size:96px">What's inside</div>
      <div class="grid" style="left:201px;top:230px;grid-template-columns:repeat(4,380px)">
      ${all.map((u) => `<div class="cell"><img src="${u}"></div>`).join('')}</div>`;
    await shoot(frame(fonts, grid), join(outDir, `${pack.file}-preview-2.png`));
  }

  if (shots['colouring-coloured']) {
    const ex = await Promise.all([1, 3, 8].map((i) => uri(shots['colouring-coloured'][i])));
    const bw = await Promise.all([3, 5, 10].map((i) => uri(shots.colouring[i])));
    const html = `<div class="title" style="top:60px;font-size:110px">Colour them your way</div>
      ${[0, 1, 2].map((i) => `<div class="pg" style="width:540px;height:764px;left:${110 + i * 620}px;top:300px;transform:rotate(${[-3, 2, -2][i]}deg)"><img src="${bw[i]}"></div>
        <div class="pg" style="width:540px;height:764px;left:${130 + i * 620}px;top:1100px;transform:rotate(${[2, -2, 3][i]}deg)"><img src="${ex[i]}"></div>`).join('')}`;
    await shoot(frame(fonts, html), join(outDir, `${colouring.file}-preview-3.png`));
  }
}
