// Shared drawing helpers for the printable packs. Every page is an SVG drawn
// on an A4 canvas measured in millimetres (210 x 297).

export const W = 210;
export const H = 297;
export const INK = '#231f20';

// Colours used on covers and the coloured-in previews. On colouring pages
// every colour is white so there is something to colour in.
const PALETTE = {
  red: '#e94b4b',
  darkred: '#b8323a',
  green: '#4cb860',
  darkgreen: '#2e8b57',
  yellow: '#ffd23f',
  gold: '#f5b82e',
  pink: '#f06eaa',
  blue: '#3a7bd5',
  sky: '#cfe6ff',
  turquoise: '#3ec1b4',
  brown: '#a0652f',
  tan: '#d9a066',
  orange: '#ff8a3d',
  skin: '#ffd9b8',
  grey: '#e4e6eb',
  white: '#ffffff',
  purple: '#9b6bd3',
  blush: '#fff1ee',
};
export const colour = (name) => PALETTE[name] || name;
export const blank = () => '#ffffff';

/** Small deterministic random generator, so every build draws the same pages. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const f = (n) => Math.round(n * 100) / 100;
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Default stroke attributes for outlines. */
export const ln = (w = 1.4) =>
  `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

export function star(cx, cy, r, points = 5, inner = 0.45, rot = -90) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = ((rot + (i * 180) / points) * Math.PI) / 180;
    pts.push(`${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`);
  }
  return `M${pts.join('L')}Z`;
}

/** A soft rounded star, friendlier for little ones. */
export function softStar(cx, cy, r, fill, w = 1.4) {
  return `<path d="${star(cx, cy, r, 5, 0.5)}" fill="${fill}" ${ln(w)} stroke-linejoin="round"/>`;
}

export function snowflake(cx, cy, r, w = 1) {
  let s = `<g ${ln(w)} fill="none">`;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = (t) => f(cx + Math.cos(a) * t);
    const y = (t) => f(cy + Math.sin(a) * t);
    s += `<line x1="${f(cx)}" y1="${f(cy)}" x2="${x(r)}" y2="${y(r)}"/>`;
    for (const t of [0.45, 0.72]) {
      const bx = cx + Math.cos(a) * r * t;
      const by = cy + Math.sin(a) * r * t;
      const b = r * (t === 0.45 ? 0.3 : 0.22);
      for (const d of [-1, 1]) {
        const aa = a + (d * Math.PI) / 4;
        s += `<line x1="${f(bx)}" y1="${f(by)}" x2="${f(bx + Math.cos(aa) * b)}" y2="${f(by + Math.sin(aa) * b)}"/>`;
      }
    }
  }
  return s + '</g>';
}

/** Draws thick rounded "tubes" with an outline (arms, antlers, scarf tails). */
export function tubes(paths, width, fill, w = 1.4) {
  const ds = paths.map((d) => `<path d="${d}"/>`).join('');
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="${INK}" stroke-width="${f(width + w * 2)}">${ds}</g>
    <g stroke="${fill}" stroke-width="${f(width)}">${ds}</g></g>`;
}

export function holly(cx, cy, s, c, w = 1.2, rot = 0) {
  const leaf =
    'M0,0 C3,-3 6,-5 9,-4 C9,-6 12,-8 14,-7 C14,-9 18,-10 21,-8 C20,-6 22,-3 24,-2 C21,0 21,3 22,5 C19,5 17,7 16,9 C14,7 11,7 9,8 C9,6 6,4 3,4 C3,2 1,1 0,0Z';
  return `<g transform="translate(${f(cx)},${f(cy)}) rotate(${rot}) scale(${f(s / 24)})">
    <path d="${leaf}" transform="rotate(-25)" fill="${c('green')}" ${ln(w * 24 / s)}/>
    <path d="${leaf}" transform="scale(-1,1) rotate(-25)" fill="${c('darkgreen')}" ${ln(w * 24 / s)}/>
    <circle cx="-3" cy="2" r="3.4" fill="${c('red')}" ${ln(w * 24 / s)}/>
    <circle cx="3" cy="2.5" r="3.4" fill="${c('red')}" ${ln(w * 24 / s)}/>
    <circle cx="0" cy="-2.5" r="3.4" fill="${c('red')}" ${ln(w * 24 / s)}/></g>`;
}

export function present(x, y, w, h, c, box = 'red', ribbon = 'yellow', lw = 1.4) {
  const cx = x + w / 2;
  const lid = Math.min(10, h * 0.22);
  const rb = Math.max(4, w * 0.14);
  return `<g>
    <rect x="${f(x + 2)}" y="${f(y + lid)}" width="${f(w - 4)}" height="${f(h - lid)}" rx="1.5" fill="${c(box)}" ${ln(lw)}/>
    <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(lid)}" rx="1.5" fill="${c(box)}" ${ln(lw)}/>
    <rect x="${f(cx - rb / 2)}" y="${f(y)}" width="${f(rb)}" height="${f(h)}" fill="${c(ribbon)}" ${ln(lw)}/>
    <path d="M${f(cx)},${f(y)} C${f(cx - w * 0.35)},${f(y - h * 0.35)} ${f(cx - w * 0.4)},${f(y + 2)} ${f(cx)},${f(y)}Z" fill="${c(ribbon)}" ${ln(lw)}/>
    <path d="M${f(cx)},${f(y)} C${f(cx + w * 0.35)},${f(y - h * 0.35)} ${f(cx + w * 0.4)},${f(y + 2)} ${f(cx)},${f(y)}Z" fill="${c(ribbon)}" ${ln(lw)}/>
    <circle cx="${f(cx)}" cy="${f(y)}" r="${f(rb * 0.45)}" fill="${c(ribbon)}" ${ln(lw)}/></g>`;
}

/** Friendly face: dot eyes with a sparkle, a smile, and rosy cheeks. */
export function face(cx, cy, s, c, opts = {}) {
  const e = s * 0.28;
  const er = s * 0.09;
  let out = '';
  for (const d of [-1, 1]) {
    out += `<circle cx="${f(cx + d * e)}" cy="${f(cy)}" r="${f(er)}" fill="${INK}"/>`;
    out += `<circle cx="${f(cx + d * e + er * 0.35)}" cy="${f(cy - er * 0.35)}" r="${f(er * 0.35)}" fill="#fff"/>`;
    if (opts.cheeks !== false)
      out += `<circle cx="${f(cx + d * e * 1.45)}" cy="${f(cy + s * 0.2)}" r="${f(s * 0.09)}" fill="${c('pink')}" ${ln(s * 0.025)} stroke-opacity="${c('pink') === '#ffffff' ? 1 : 0}"/>`;
  }
  if (opts.mouth === false) return out;
  const my = cy + s * (opts.mouthY ?? 0.2);
  const mw = s * 0.16;
  out += `<path d="M${f(cx - mw)},${f(my)} Q${f(cx)},${f(my + mw * 1.1)} ${f(cx + mw)},${f(my)}" fill="none" ${ln(s * 0.04)}/>`;
  return out;
}

/** Page frame: title in bubble script, a footer line, everything else in body. */
export function page({ title, body, footer = true, kind = 'colouring', titleSize = 15 }) {
  const t = title
    ? `<text x="${W / 2}" y="27" text-anchor="middle" font-family="Pacifico" font-size="${titleSize}" fill="#fff" stroke="${INK}" stroke-width="0.7" paint-order="stroke" stroke-linejoin="round">${esc(title)}</text>`
    : '';
  const foot = footer
    ? `<text x="${W / 2}" y="288" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="3.2" fill="#6b6566">Sparkle by Kimberley · sparklebykimberley.co.uk · for personal and classroom use only</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" data-kind="${kind}">${t}${body}${foot}</svg>`;
}

/** Wraps text into lines of roughly maxChars. */
export function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = w;
    } else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

export function textBlock(x, y, text, { size = 4.2, lh = 1.45, max = 70, weight = 400, fill = INK, anchor = 'start' } = {}) {
  return wrap(text, max)
    .map((l, i) => `<text x="${f(x)}" y="${f(y + i * size * lh)}" font-family="Nunito" font-weight="${weight}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(l)}</text>`)
    .join('');
}

/**
 * A bumpy "cloud" edge along part of an ellipse, for beards, snow and fluffy
 * trim. Angles in degrees, drawn clockwise from a0 to a1.
 */
export function cloudArc(cx, cy, rx, ry, a0, a1, n, bulge = 1.6) {
  const pt = (a) => [cx + rx * Math.cos((a * Math.PI) / 180), cy + ry * Math.sin((a * Math.PI) / 180)];
  let [x0, y0] = pt(a0);
  let d = `M${f(x0)},${f(y0)}`;
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const am = a0 + ((a1 - a0) * (i - 0.5)) / n;
    const [x, y] = pt(a);
    const [mx, my] = pt(am);
    const cxp = cx + (mx - cx) * (1 + (bulge - 1) * 0.25);
    const cyp = cy + (my - cy) * (1 + (bulge - 1) * 0.25);
    d += ` Q${f(cxp)},${f(cyp)} ${f(x)},${f(y)}`;
  }
  return d;
}

/** Scissors icon for cut lines. */
export function scissors(x, y, s = 6, rot = 0) {
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${rot}) scale(${f(s / 10)})" ${ln(0.9)} fill="#fff">
    <circle cx="-3" cy="-3" r="2.4"/><circle cx="-3" cy="3" r="2.4"/>
    <path d="M-1.2,-1.6 L6,2.5 M-1.2,1.6 L6,-2.5" fill="none"/></g>`;
}

/** Shows part of a picture, scaled into a box. */
export function inset(body, x, y, w, h, view = '25 35 160 240') {
  return `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" viewBox="${view}" overflow="hidden">${body}</svg>`;
}

/** Full-colour cover shared by the packs. */
export function cover({ title, line2, sub, tiles, badge, tileView }) {
  const r = rng(7);
  let dots = '';
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H;
    dots += r() < 0.3 ? `<path d="${star(x, y, 2 + r() * 2)}" fill="${['#ffd23f', '#f06eaa', '#3ec1b4', '#3a7bd5'][i % 4]}" opacity="0.7"/>` : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.8 + r() * 1.4)}" fill="${['#ffd23f', '#f06eaa', '#3ec1b4', '#3a7bd5'][i % 4]}" opacity="0.45"/>`;
  }
  const n = tiles.length;
  const cols = n > 4 ? 3 : 2;
  const tw = cols === 3 ? 54 : 74, th = tw * 1.25, gap = 6;
  const rows = Math.ceil(n / cols);
  const gx = (W - (cols * tw + (cols - 1) * gap)) / 2;
  const gy = 112;
  const tilesSvg = tiles
    .map((body, i) => {
      const x = gx + (i % cols) * (tw + gap), y = gy + Math.floor(i / cols) * (th + gap);
      const tilt = [-2.5, 1.5, -1, 2, -1.8, 1][i % 6];
      return `<g transform="rotate(${tilt} ${f(x + tw / 2)} ${f(y + th / 2)})"><rect x="${f(x + 1.2)}" y="${f(y + 1.6)}" width="${f(tw)}" height="${f(th)}" rx="3" fill="#000" opacity="0.12"/><rect x="${f(x)}" y="${f(y)}" width="${f(tw)}" height="${f(th)}" rx="3" fill="#fff" ${ln(0.9)}/>${inset(body, x + 2, y + 2, tw - 4, th - 4, tileView)}</g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#fff1ee"/>${dots}
    <text x="${W / 2}" y="30" text-anchor="middle" font-family="Pacifico" font-size="11" fill="#b0245f">Sparkle by Kimberley</text>
    <text x="${W / 2}" y="60" text-anchor="middle" font-family="Pacifico" font-size="25" fill="#e94b4b" stroke="${INK}" stroke-width="1" paint-order="stroke" stroke-linejoin="round">${esc(title)}</text>
    <text x="${W / 2}" y="86" text-anchor="middle" font-family="Pacifico" font-size="21" fill="#4cb860" stroke="${INK}" stroke-width="1" paint-order="stroke" stroke-linejoin="round">${esc(line2)}</text>
    <text x="${W / 2}" y="101" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="6" fill="${INK}">${esc(sub)}</text>
    ${tilesSvg}
    ${badge ? `<g transform="translate(176,${gy + rows * (th + gap) - 6}) rotate(10)"><circle r="17" fill="#ffd23f" ${ln(1)}/><text y="-2" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="5.4" fill="${INK}">${esc(badge[0])}</text><text y="5" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="5.4" fill="${INK}">${esc(badge[1])}</text></g>` : ''}
    <text x="${W / 2}" y="286" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="4.2" fill="#5a5555">sparklebykimberley.co.uk · print at home on A4 or US Letter</text>
  </svg>`;
}

/** The "thank you, how to print" page at the front of each pack. */
export function infoPage({ heading, intro, contents, tips }) {
  let y = 52;
  let s = `<text x="${W / 2}" y="36" text-anchor="middle" font-family="Pacifico" font-size="12" fill="#e94b4b">${esc(heading)}</text>`;
  s += textBlock(24, y, intro, { size: 4.4, max: 74 });
  y += Math.ceil(intro.length / 74) * 6.4 + 10;
  s += `<text x="24" y="${y}" font-family="Nunito" font-weight="900" font-size="5.4" fill="#245ca8">What's inside</text>`;
  y += 8;
  contents.forEach((item, i) => {
    s += `<text x="28" y="${f(y)}" font-family="Nunito" font-weight="400" font-size="4.2" fill="${INK}"><tspan font-weight="800">${i + 1}.</tspan> ${esc(item)}</text>`;
    y += 6;
  });
  y += 6;
  s += `<text x="24" y="${f(y)}" font-family="Nunito" font-weight="900" font-size="5.4" fill="#245ca8">Printing tips</text>`;
  y += 8;
  for (const t of tips) {
    s += `<circle cx="29" cy="${f(y - 1.4)}" r="1.1" fill="#f06eaa"/>` + textBlock(33, y, t, { size: 4.2, max: 72 });
    y += Math.ceil(t.length / 72) * 6.1 + 2;
  }
  y += 6;
  s += `<rect x="20" y="${f(y)}" width="170" height="34" rx="4" fill="#fff1ee"/>`;
  s += `<text x="26" y="${f(y + 8)}" font-family="Nunito" font-weight="900" font-size="4.6" fill="#b0245f">Please share the fun, not the file</text>`;
  s += textBlock(26, y + 15, 'You can print as many copies as you like for your own family or your own class. Please don\'t share, sell or upload the file. If a friend would like one, point them to sparklebykimberley.co.uk. Thank you!', { size: 3.9, max: 84 });
  return page({ title: '', body: s });
}
