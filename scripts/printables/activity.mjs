// Christmas activity pack: things to cut, fold and make, plus puzzles, with
// an answers page at the back.

import { INK, W, blank, colour, f, ln, star, softStar, snowflake, tubes, holly, present, face, page, rng, textBlock, esc, scissors, cover, infoPage } from './lib.mjs';
import { snowman, reindeer, tree as bigTree } from './colouring.mjs';

const CUT = `stroke="${INK}" stroke-width="0.7" stroke-dasharray="3 2" fill="none"`;
const FOLD = `stroke="${INK}" stroke-width="0.6" stroke-dasharray="1 1.6" fill="none"`;
const label = (x, y, t, size = 3.6, anchor = 'middle', weight = 800, fill = INK) =>
  `<text x="${f(x)}" y="${f(y)}" font-family="Nunito" font-weight="${weight}" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${esc(t)}</text>`;
const howTo = (y, steps) =>
  steps.map((s, i) => `<circle cx="26" cy="${f(y + i * 7 - 1.3)}" r="2.6" fill="#ffd23f" ${ln(0.5)}/>${label(26, y + i * 7, String(i + 1), 3.2)}${label(31, y + i * 7, s, 3.9, 'start', 400)}`).join('');

// ---------------------------------------------------------------- crown

function crownStrip(y, c, deco) {
  const x0 = 18, x1 = 180, teeth = 6, tw = (x1 - x0) / teeth;
  let d = `M${x0},${y + 62} L${x0},${y + 26}`;
  for (let i = 0; i < teeth; i++) {
    const x = x0 + i * tw;
    d += ` L${f(x + tw / 2)},${y + 6} L${f(x + tw)},${y + 26}`;
  }
  d += ` L${x1},${y + 62} Z`;
  let s = `<path d="${d}" fill="${c('yellow')}" ${ln(1.2)}/>`;
  s += `<rect x="${x0}" y="${y + 36}" width="${x1 - x0}" height="18" fill="${c('red')}" ${ln(1)}/>`;
  for (let i = 0; i < teeth; i++) {
    const x = x0 + i * tw + tw / 2;
    s += `<circle cx="${f(x)}" cy="${y + 5}" r="3.4" fill="${c(['pink', 'blue', 'turquoise'][i % 3])}" ${ln(1)}/>`;
    s += `<path d="${star(x, y + 22, 5)}" fill="${c('white')}" ${ln(0.9)}/>`;
  }
  s += deco(y + 45);
  s += `<rect x="${x1}" y="${y + 26}" width="12" height="36" fill="#eeeeee" ${ln(0.8)} stroke-dasharray="2 1.5"/>`;
  s += `<text transform="translate(${x1 + 7.4},${y + 44}) rotate(90)" font-family="Nunito" font-weight="900" font-size="3.6" text-anchor="middle" fill="#777">GLUE</text>`;
  s += scissors(x0 - 6, y + 62, 6, 0);
  return s;
}

function crown(c) {
  const jewels = (cy) => Array.from({ length: 9 }, (_, i) => (i % 2 ? `<path d="M${24 + i * 18},${cy - 5} l5,5 l-5,5 l-5,-5z" fill="${c('turquoise')}" ${ln(0.9)}/>` : `<circle cx="${24 + i * 18}" cy="${cy}" r="4.4" fill="${c('blue')}" ${ln(0.9)}/>`)).join('');
  const words = (cy) => `<text x="99" y="${cy + 4.2}" text-anchor="middle" font-family="Pacifico" font-size="11" fill="${c('white')}" stroke="${INK}" stroke-width="0.5" paint-order="stroke">Merry Christmas</text>`;
  const leaves = (cy) => [36, 81, 126, 162].map((x) => holly(x, cy, 11, c, 0.8)).join('') + [58, 103, 145].map((x) => `<path d="${star(x, cy, 4.5)}" fill="${c('yellow')}" ${ln(0.8)}/>`).join('');
  return `${crownStrip(36, c, jewels)}${crownStrip(112, c, words)}${crownStrip(188, c, leaves)}
    ${label(W / 2, 266, 'Cut out all three strips. Glue them into one long band, using the grey tabs.', 3.9, 'middle', 400)}
    ${label(W / 2, 272, 'Wrap it round your head, glue the last tab, and you\'re royalty!', 3.9, 'middle', 400)}`;
}

// ---------------------------------------------------------------- finger puppets

function puppetBand(x, y, c, fill) {
  return `<rect x="${x - 30}" y="${y}" width="60" height="26" rx="2" fill="${c(fill)}" ${ln(1)}/>
    <rect x="${x + 30}" y="${y}" width="10" height="26" fill="#eeeeee" ${ln(0.7)} stroke-dasharray="2 1.5"/>
    <text transform="translate(${x + 36},${y + 13}) rotate(90)" font-family="Nunito" font-weight="900" font-size="3" text-anchor="middle" fill="#777">GLUE</text>`;
}

const puppetHeads = {
  santa: (x, y, c) => `<path d="M${x - 20},${y - 6} C${x - 18},${y - 34} ${x + 12},${y - 40} ${x + 26},${y - 30} L${x + 18},${y - 6} Z" fill="${c('red')}" ${ln()}/>
    <circle cx="${x + 27}" cy="${y - 30}" r="5" fill="${c('white')}" ${ln()}/>
    <circle cx="${x}" cy="${y + 6}" r="18" fill="${c('skin')}" ${ln()}/>
    <path d="M${x - 19},${y + 8} C${x - 22},${y + 34} ${x + 22},${y + 34} ${x + 19},${y + 8} C${x + 10},${y + 16} ${x - 10},${y + 16} ${x - 19},${y + 8}Z" fill="${c('white')}" ${ln()}/>
    <rect x="${x - 22}" y="${y - 12}" width="44" height="10" rx="5" fill="${c('white')}" ${ln()}/>
    ${face(x, y + 4, 22, c, { mouth: false })}<circle cx="${x}" cy="${y + 10}" r="3" fill="${c('pink')}" ${ln(1)}/>`,
  reindeer: (x, y, c) => `${tubes([`M${x - 8},${y - 12} L${x - 16},${y - 32}`, `M${x - 12},${y - 22} L${x - 22},${y - 26}`, `M${x + 8},${y - 12} L${x + 16},${y - 32}`, `M${x + 12},${y - 22} L${x + 22},${y - 26}`], 3.4, c('brown'))}
    <ellipse cx="${x - 20}" cy="${y - 2}" rx="8" ry="4.5" transform="rotate(-20 ${x - 20} ${y - 2})" fill="${c('tan')}" ${ln()}/>
    <ellipse cx="${x + 20}" cy="${y - 2}" rx="8" ry="4.5" transform="rotate(20 ${x + 20} ${y - 2})" fill="${c('tan')}" ${ln()}/>
    <ellipse cx="${x}" cy="${y + 6}" rx="17" ry="20" fill="${c('tan')}" ${ln()}/>
    <ellipse cx="${x}" cy="${y + 17}" rx="11" ry="8" fill="${c('skin')}" ${ln()}/>
    ${face(x, y + 1, 22, c, { mouth: false })}<circle cx="${x}" cy="${y + 13}" r="4.4" fill="${c('red')}" ${ln()}/>
    <path d="M${x - 4},${y + 20} Q${x},${y + 24} ${x + 4},${y + 20}" fill="none" ${ln(1)}/>`,
  elf: (x, y, c) => `<path d="M${x - 20},${y - 6} L${x + 4},${y - 40} L${x + 20},${y - 6} Z" fill="${c('green')}" ${ln()}/>
    <circle cx="${x + 4}" cy="${y - 41}" r="4" fill="${c('yellow')}" ${ln()}/>
    <path d="M${x - 17},${y + 4} L${x - 28},${y - 4} L${x - 17},${y + 12} Z M${x + 17},${y + 4} L${x + 28},${y - 4} L${x + 17},${y + 12} Z" fill="${c('skin')}" ${ln()}/>
    <circle cx="${x}" cy="${y + 6}" r="18" fill="${c('skin')}" ${ln()}/>
    <path d="M${x - 22},${y - 4} L${x + 22},${y - 4} L${x + 20},${y - 10} L${x - 20},${y - 10} Z" fill="${c('red')}" ${ln()}/>
    ${face(x, y + 6, 24, c)}`,
  snowman: (x, y, c) => `<rect x="${x - 12}" y="${y - 34}" width="24" height="22" rx="2" fill="${c('blue')}" ${ln()}/>
    <rect x="${x - 12}" y="${y - 19}" width="24" height="5" fill="${c('red')}" ${ln(1)}/>
    <ellipse cx="${x}" cy="${y - 12}" rx="20" ry="4" fill="${c('blue')}" ${ln()}/>
    <circle cx="${x}" cy="${y + 8}" r="18" fill="${c('white')}" ${ln()}/>
    <ellipse cx="${x}" cy="${y - 12}" rx="20" ry="4" fill="${c('blue')}" ${ln()}/>
    ${face(x, y + 4, 22, c, { mouth: false, cheeks: false })}
    <path d="M${x},${y + 8} L${x + 12},${y + 10} L${x},${y + 12} Z" fill="${c('orange')}" ${ln(1)}/>
    ${[-5, -2.5, 0, 2.5, 5].map((d) => `<circle cx="${x + d}" cy="${y + 17 + (d * d) / 25 - 1}" r="0.9" fill="${INK}"/>`).join('')}`,
};

function puppets(c) {
  const cells = [
    [57, 84, 'santa', 'red', 'Santa'],
    [153, 84, 'reindeer', 'tan', 'Rudolph'],
    [57, 186, 'elf', 'green', 'Elf'],
    [153, 186, 'snowman', 'blue', 'Snowman'],
  ];
  return `${cells.map(([x, y, k, band, name]) => `${puppetBand(x - 5, y + 30, c, band)}${puppetHeads[k](x - 5, y, c)}${label(x - 5, y + 46, name, 4.2)}`).join('')}
    ${howTo(258, ['Colour in your puppets, then cut them out round the outside.', 'Wrap the band round your finger and glue the tab to the back.', 'Put on a Christmas show!'])}`;
}

// ---------------------------------------------------------------- pop-up card

function popupInside(c) {
  return `<rect x="20" y="38" width="170" height="232" rx="2" fill="none" ${ln(0.9)}/>
    <path d="M14,154 L196,154" ${FOLD}/>
    ${label(24, 151, 'fold', 3.2, 'start', 700)}
    <path d="M90,129 L90,179 M120,129 L120,179" stroke="${INK}" stroke-width="1.1"/>
    ${scissors(90, 125, 5, 90)}${scissors(120, 125, 5, 90)}
    <path d="M90,129 L120,129 M90,179 L120,179" ${FOLD}/>
    ${label(105, 186, 'Cut the two solid lines only', 3.4, 'middle', 700)}
    <text x="105" y="76" text-anchor="middle" font-family="Pacifico" font-size="18" fill="${c('red')}" stroke="${INK}" stroke-width="0.8" paint-order="stroke">Merry Christmas</text>
    ${label(105, 92, 'To ................................................', 5, 'middle', 700)}
    ${label(105, 252, 'Love from ......................................', 5, 'middle', 700)}
    ${[[34, 54], [178, 56], [36, 140], [176, 142], [34, 226], [178, 230]].map(([x, y], i) => (i % 2 ? softStar(x, y, 5, c('yellow'), 1) : snowflake(x, y, 6, 0.9))).join('')}
    ${holly(48, 106, 12, c, 0.9)}${holly(162, 106, 12, c, 0.9, 20)}
    <path d="M24,236 Q70,226 105,232 T186,230" fill="none" ${ln(1)}/>`;
}

function popupPieces(c) {
  const t = (cx, top, s) => `<g transform="translate(${cx},${top}) scale(${s})">
    <path d="M0,0 L-14,18 L-7,18 L-22,38 L-12,38 L-28,60 L28,60 L12,38 L22,38 L7,18 L14,18 Z" fill="${c('green')}" ${ln(1.2 / s)}/>
    <rect x="-5" y="60" width="10" height="9" fill="${c('brown')}" ${ln(1.2 / s)}/>
    ${[[-6, 14], [8, 26], [-10, 34], [6, 46], [-16, 52], [16, 54], [0, 40]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c(['red', 'yellow', 'blue', 'pink'][i % 4])}" ${ln(1 / s)}/>`).join('')}
    <path d="${star(0, -2, 7)}" fill="${c('yellow')}" ${ln(1 / s)}/></g>`;
  return `${label(24, 46, 'Pop-up pieces: colour them in, then cut them out', 4.6, 'start', 900, '#245ca8')}
    <rect x="22" y="52" width="88" height="104" rx="3" ${CUT}/>${t(66, 64, 1.25)}
    <rect x="118" y="52" width="70" height="60" rx="3" ${CUT}/>${present(133, 70, 40, 34, c, 'blue', 'yellow', 1.2)}
    <rect x="118" y="118" width="70" height="38" rx="3" ${CUT}/>${softStar(153, 137, 16, c('yellow'), 1.2)}
    ${scissors(18, 156, 6, 0)}
    ${label(24, 176, 'How to make your pop-up card', 4.6, 'start', 900, '#245ca8')}
    ${howTo(186, [
      'Print the card page on thin card (160 to 200gsm works well).',
      'Fold the card page in half along the dotted "fold" line, with the words inside.',
      'Keep it folded and cut along the two short solid lines.',
      'Fold the little flap forwards and back hard, along its dotted line, then open the card.',
      'Push the flap through to the inside so it stands up like a step, and close the card to crease it.',
      'Glue the tree (or the present and star) to the front of the step.',
      'Decorate the front, write your message inside, and give it to someone special!',
    ])}`;
}

// ---------------------------------------------------------------- maze

function makeMaze(cols, rows, seed) {
  const r = rng(seed);
  const walls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: 1, e: 1, s: 1, w: 1 })));
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack = [[0, 0]];
  seen[0][0] = true;
  const dirs = [['n', 0, -1, 's'], ['e', 1, 0, 'w'], ['s', 0, 1, 'n'], ['w', -1, 0, 'e']];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = dirs.filter(([, dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx]; });
    if (!opts.length) { stack.pop(); continue; }
    const [d, dx, dy, o] = opts[Math.floor(r() * opts.length)];
    walls[y][x][d] = 0;
    walls[y + dy][x + dx][o] = 0;
    seen[y + dy][x + dx] = true;
    stack.push([x + dx, y + dy]);
  }
  // solution by breadth-first search
  const prev = {};
  const q = [[0, 0]];
  const key = (x, y) => `${x},${y}`;
  prev[key(0, 0)] = null;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === cols - 1 && y === rows - 1) break;
    for (const [d, dx, dy] of dirs) {
      if (walls[y][x][d]) continue;
      const k = key(x + dx, y + dy);
      if (k in prev) continue;
      prev[k] = [x, y];
      q.push([x + dx, y + dy]);
    }
  }
  const path = [];
  for (let p = [cols - 1, rows - 1]; p; p = prev[key(...p)]) path.unshift(p);
  return { walls, path, cols, rows };
}

const MAZE = makeMaze(11, 13, 2024);

function drawMaze(m, x0, y0, cell, w, solution) {
  let d = '';
  m.walls.forEach((row, y) => row.forEach((cw, x) => {
    const X = x0 + x * cell, Y = y0 + y * cell;
    if (cw.n && !(x === 0 && y === 0)) d += `M${f(X)},${f(Y)}L${f(X + cell)},${f(Y)}`;
    if (cw.w) d += `M${f(X)},${f(Y)}L${f(X)},${f(Y + cell)}`;
    if (y === m.rows - 1 && cw.s && !(x === m.cols - 1)) d += `M${f(X)},${f(Y + cell)}L${f(X + cell)},${f(Y + cell)}`;
    if (x === m.cols - 1 && cw.e) d += `M${f(X + cell)},${f(Y)}L${f(X + cell)},${f(Y + cell)}`;
  }));
  let s = `<path d="${d}" fill="none" ${ln(w)}/>`;
  if (solution) {
    const pts = m.path.map(([x, y]) => `${f(x0 + (x + 0.5) * cell)},${f(y0 + (y + 0.5) * cell)}`);
    s = `<polyline points="${f(x0 + 0.5 * cell)},${f(y0 - cell * 0.6)} ${pts.join(' ')} ${f(x0 + (m.cols - 0.5) * cell)},${f(y0 + (m.rows + 0.6) * cell)}" fill="none" stroke="#f06eaa" stroke-width="${f(cell * 0.35)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>` + s;
  }
  return s;
}

function maze(c) {
  const cell = 13, x0 = (W - 11 * cell) / 2, y0 = 76;
  return `${label(W / 2, 40, 'Help Rudolph find his way to Santa\'s sleigh!', 5, 'middle', 800)}
    <g transform="translate(${x0 + 6.5},${y0 - 16}) scale(0.22) translate(-105,-160)">${reindeerHead(c)}</g>
    ${drawMaze(MAZE, x0, y0, cell, 1.6, false)}
    <g transform="translate(${x0 + 11 * cell - 6.5},${y0 + 13 * cell + 24})">${sleigh(c, 0.45)}</g>
    ${label(x0 - 3, y0 - 6, 'START', 3.6, 'end', 900, '#b0245f')}
    ${label(x0 + 11 * cell - 28, y0 + 13 * cell + 18, 'FINISH', 3.6, 'end', 900, '#b0245f')}`;
}

function reindeerHead(c) {
  return `${tubes(['M84,128 C80,110 70,98 62,84', 'M76,108 L62,104', 'M126,128 C130,110 140,98 148,84', 'M134,108 L148,104'], 8, c('brown'), 3)}
    <path d="M105,118 C134,118 146,140 144,165 C142,190 130,208 105,212 C80,208 68,190 66,165 C64,140 76,118 105,118Z" fill="${c('tan')}" ${ln(4)}/>
    ${face(105, 158, 46, c, { mouth: false })}<circle cx="105" cy="186" r="12" fill="${c('red')}" ${ln(4)}/>`;
}

function sleigh(c, s = 1) {
  return `<g transform="scale(${s})">
    <path d="M-40,-4 C-40,-20 -30,-30 -18,-30 L-10,-30 L-10,-14 L20,-14 C30,-14 34,-22 40,-26 C44,-14 38,0 26,0 L-34,0 C-38,0 -40,-2 -40,-4Z" fill="${c('red')}" ${ln(2.2)}/>
    <path d="M-42,8 L34,8 C44,8 46,0 44,-4" fill="none" ${ln(2.6)}/>
    <path d="M-30,0 L-30,8 M20,0 L20,8" ${ln(2.2)}/>
    ${present(-26, -48, 18, 18, c, 'green', 'yellow', 2)}${present(-6, -40, 14, 12, c, 'blue', 'pink', 2)}</g>`;
}

// ---------------------------------------------------------------- dot to dot

function dotToDot(c) {
  const pts = [
    [105, 52], [124, 82], [116, 82], [138, 112], [127, 112], [152, 146], [139, 146], [166, 184], [150, 184], [176, 222],
    [120, 222], [120, 244], [90, 244], [90, 222], [34, 222], [60, 184], [44, 184], [71, 146], [58, 146], [83, 112],
    [72, 112], [94, 82], [86, 82],
  ];
  const cx = 105, cy = 150;
  let s = `${label(W / 2, 40, 'Join the dots from 1 to ' + pts.length + ', then decorate your picture!', 4.6, 'middle', 800)}<g transform="translate(0,12)">`;
  pts.forEach(([x, y], i) => {
    const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1;
    const lx = x + (dx / len) * 6, ly = y + (dy / len) * 6 + 1.4;
    s += `<circle cx="${x}" cy="${y}" r="1.3" fill="${INK}"/>`;
    s += label(lx, ly, String(i + 1), 4, 'middle', 800, '#245ca8');
  });
  s += `<path d="${star(105, 44, 8)}" fill="none" ${ln(0.6)} stroke-dasharray="1.5 1.5"/></g>`;
  s += `${present(14, 258, 24, 22, c, 'red', 'yellow', 1.2)}${present(172, 258, 24, 22, c, 'blue', 'pink', 1.2)}`;
  s += [[30, 70], [182, 74], [24, 140], [188, 136]].map(([x, y]) => snowflake(x, y, 7, 0.9)).join('');
  return s;
}

const DOTS_SOLUTION = (scale, x0, y0) => {
  const pts = [[105, 52], [124, 82], [116, 82], [138, 112], [127, 112], [152, 146], [139, 146], [166, 184], [150, 184], [176, 222], [120, 222], [120, 244], [90, 244], [90, 222], [34, 222], [60, 184], [44, 184], [71, 146], [58, 146], [83, 112], [72, 112], [94, 82], [86, 82]];
  return `<polygon points="${pts.map(([x, y]) => `${f(x0 + x * scale)},${f(y0 + y * scale)}`).join(' ')}" fill="#e6f6ea" ${ln(0.8)}/>`;
};

// ---------------------------------------------------------------- word search

const WORDS = ['SANTA', 'ELF', 'STAR', 'TREE', 'SNOW', 'ROBIN', 'HOLLY', 'SLEIGH', 'PRESENT', 'REINDEER', 'STOCKING', 'TINSEL'];

function makeWordSearch(n, seed) {
  const r = rng(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const g = Array.from({ length: n }, () => Array(n).fill(''));
    const placed = [];
    let ok = true;
    for (const w of [...WORDS].sort((a, b) => b.length - a.length)) {
      let done = false;
      for (let t = 0; t < 300 && !done; t++) {
        const [dx, dy] = r() < 0.5 ? [1, 0] : [0, 1];
        const x = Math.floor(r() * (n - (dx ? w.length - 1 : 0)));
        const y = Math.floor(r() * (n - (dy ? w.length - 1 : 0)));
        if ([...w].every((ch, i) => !g[y + dy * i][x + dx * i] || g[y + dy * i][x + dx * i] === ch)) {
          [...w].forEach((ch, i) => (g[y + dy * i][x + dx * i] = ch));
          placed.push({ w, x, y, dx, dy });
          done = true;
        }
      }
      if (!done) { ok = false; break; }
    }
    if (!ok) continue;
    const abc = 'ABCDEFGHIJKLMNOPRSTUVWY';
    for (const row of g) for (let i = 0; i < n; i++) if (!row[i]) row[i] = abc[Math.floor(r() * abc.length)];
    return { g, placed, n };
  }
  throw new Error('could not build word search');
}

const SEARCH = makeWordSearch(12, 7);

function drawSearch(ws, x0, y0, cell, size, answers) {
  let s = `<rect x="${x0 - 3}" y="${y0 - 3}" width="${ws.n * cell + 6}" height="${ws.n * cell + 6}" rx="4" fill="#fff" ${ln(1.1)}/>`;
  if (answers)
    for (const p of ws.placed) {
      const x1 = x0 + (p.x + 0.5) * cell, y1 = y0 + (p.y + 0.5) * cell;
      const x2 = x1 + p.dx * (p.w.length - 1) * cell, y2 = y1 + p.dy * (p.w.length - 1) * cell;
      s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#ffd23f" stroke-width="${f(cell * 0.8)}" stroke-linecap="round"/>`;
    }
  ws.g.forEach((row, y) => row.forEach((ch, x) => (s += label(x0 + (x + 0.5) * cell, y0 + (y + 0.5) * cell + size * 0.36, ch, size, 'middle', 800))));
  return s;
}

function wordSearch(c) {
  const cell = 13, x0 = (W - 12 * cell) / 2, y0 = 52;
  const list = WORDS.map((w, i) => {
    const x = 34 + (i % 3) * 52, y = 232 + Math.floor(i / 3) * 9;
    return `<rect x="${x - 6}" y="${y - 3.6}" width="3.6" height="3.6" rx="0.6" fill="#fff" ${ln(0.6)}/>${label(x, y, w, 4.4, 'start', 800)}`;
  }).join('');
  return `${label(W / 2, 42, 'Find the 12 Christmas words. They go across or down.', 4.6, 'middle', 800)}
    ${drawSearch(SEARCH, x0, y0, cell, 6.4, false)}${list}`;
}

// ---------------------------------------------------------------- spot the difference

function scene(c, alt) {
  return `<rect x="0" y="0" width="170" height="104" rx="4" fill="${c('sky')}" ${ln(1.2)}/>
    <path d="M0.6,80 Q50,70 90,78 T169.4,74 L169.4,100 Q169.4,103.4 166,103.4 L4,103.4 Q0.6,103.4 0.6,100Z" fill="${c('white')}" ${ln(1)}/>
    <path d="M${alt ? 128 : 146},14 a10,10 0 1,0 8,16 a8,8 0 1,1 -8,-16z" fill="${c('yellow')}" ${ln(1)}/>
    ${(alt ? [[20, 14], [40, 26], [70, 12], [100, 22]] : [[20, 14], [40, 26], [70, 12]]).map(([x, y]) => `<path d="${star(x, y, 4)}" fill="${c('yellow')}" ${ln(0.8)}/>`).join('')}
    <circle cx="44" cy="76" r="14" fill="${c('white')}" ${ln(1.1)}/>
    <circle cx="44" cy="54" r="10" fill="${c('white')}" ${ln(1.1)}/>
    <rect x="36" y="34" width="16" height="10" rx="1" fill="${c('blue')}" ${ln(1)}/><ellipse cx="44" cy="44" rx="12" ry="2.4" fill="${c('blue')}" ${ln(1)}/>
    <circle cx="40.5" cy="52" r="1" fill="${INK}"/><circle cx="47.5" cy="52" r="1" fill="${INK}"/>
    ${alt ? '' : `<path d="M44,55 L52,56.5 L44,58Z" fill="${c('orange')}" ${ln(0.7)}/>`}
    <path d="M34,62 Q44,67 54,62 L54,66 Q44,71 34,66Z" fill="${c('red')}" ${ln(0.9)}/>
    ${[72, 78, 84].map((y) => `<circle cx="44" cy="${y}" r="1.4" fill="${INK}"/>`).join('')}
    <path d="M118,86 L118,78 M104,78 L118,${alt ? 40 : 36} L132,78Z" fill="${c('green')}" ${ln(1.1)}/>
    <rect x="114" y="78" width="8" height="8" fill="${c('brown')}" ${ln(1)}/>
    ${alt ? '' : `<path d="${star(118, 34, 5)}" fill="${c('yellow')}" ${ln(0.9)}/>`}
    ${[[114, 56, 'red'], [123, 64, 'blue'], [111, 70, 'pink']].map(([x, y, k]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${c(k)}" ${ln(0.8)}/>`).join('')}
    ${alt ? `<rect x="140" y="80" width="18" height="14" fill="${c('pink')}" ${ln(1)}/><rect x="147" y="80" width="4" height="14" fill="${c('yellow')}" ${ln(0.8)}/>` : present(140, 80, 18, 14, c, 'pink', 'yellow', 1)}
`;
}

function spotDiff(c) {
  return `${label(W / 2, 42, 'Can you spot 5 differences between the two pictures?', 4.6, 'middle', 800)}
    <g transform="translate(20,50)">${scene(c, false)}</g>
    <g transform="translate(20,162)">${scene(c, true)}</g>
    ${label(24, 278, 'Found one? Colour a star:', 4.4, 'start', 800)}
    ${[0, 1, 2, 3, 4].map((i) => `<path d="${star(100 + i * 14, 276.5, 5)}" fill="#fff" ${ln(0.9)}/>`).join('')}`;
}

// ---------------------------------------------------------------- jumper and letter

function jumper(c) {
  const body = 'M70,62 C80,72 130,72 140,62 L178,82 L196,150 L176,158 L160,116 L160,240 L50,240 L50,116 L34,158 L14,150 L32,82 Z';
  return `${label(W / 2, 42, 'Design your own Christmas jumper!', 5, 'middle', 800)}
    <path d="${body}" fill="${c('white')}" ${ln(1.6)}/>
    <path d="M70,62 C80,80 130,80 140,62" fill="none" ${ln(1.4)}/>
    <path d="M50,228 L160,228" ${ln(1.2)}/>
    ${Array.from({ length: 21 }, (_, i) => `<path d="M${55 + i * 5},229 L${55 + i * 5},239" ${ln(0.5)}/>`).join('')}
    <path d="M16,144 L34,152 M176,152 L194,144" ${ln(1.2)}/>
    ${label(W / 2, 256, 'Ideas: snowflakes, a reindeer, stars, stripes, a big Christmas pudding...', 4, 'middle', 400)}
    ${label(W / 2, 264, 'Whose jumper is it? ....................................................', 4.4, 'middle', 700)}`;
}

function letter(c) {
  const lines = (y0, n) => Array.from({ length: n }, (_, i) => `<path d="M30,${y0 + i * 11} L180,${y0 + i * 11}" stroke="#9a9496" stroke-width="0.4"/>`).join('');
  return `<rect x="14" y="36" width="182" height="242" rx="6" fill="none" ${ln(1.2)}/>
    ${[[22, 44], [188, 44], [22, 270], [188, 270]].map(([x, y], i) => holly(x, y, 12, c, 0.9, i * 90)).join('')}
    <text x="30" y="60" font-family="Pacifico" font-size="13" fill="${c('red')}" stroke="${INK}" stroke-width="0.6" paint-order="stroke">Dear Santa,</text>
    ${label(30, 74, 'My name is .............................................   I am ........ years old.', 4.6, 'start', 700)}
    ${label(30, 88, 'This year I have been:', 4.6, 'start', 700)}
    ${['good', 'very good', 'super good!'].map((t, i) => `<rect x="${30 + i * 42}" y="92" width="5" height="5" rx="1" fill="#fff" ${ln(0.8)}/>${label(38 + i * 42, 96.4, t, 4.4, 'start', 400)}`).join('')}
    ${label(30, 112, 'For Christmas I would love:', 4.6, 'start', 700)}
    ${lines(124, 4)}
    ${label(30, 170, 'Something kind I did this year:', 4.6, 'start', 700)}
    ${lines(182, 2)}
    ${label(30, 206, 'Love from', 4.6, 'start', 700)}
    <rect x="104" y="200" width="76" height="66" rx="4" fill="#fff" ${ln(0.9)} stroke-dasharray="2.5 2"/>
    ${label(142, 232, 'Draw yourself here', 3.6, 'middle', 700, '#9a9496')}
    ${softStar(46, 236, 9, c('yellow'), 1.1)}${present(66, 236, 24, 22, c, 'red', 'green', 1.1)}`;
}

// ---------------------------------------------------------------- answers

function answers() {
  const diffs = ['The moon has moved', 'There is an extra star in the sky', 'The snowman has lost his carrot nose', 'The star on top of the tree is gone', 'The bow on the present is gone'];
  return `${label(24, 46, 'Maze', 5, 'start', 900, '#245ca8')}
    ${drawMaze(MAZE, 24, 56, 6.6, 0.8, true)}
    ${label(118, 46, 'Word search', 5, 'start', 900, '#245ca8')}
    ${drawSearch(SEARCH, 118, 56, 6.2, 3.2, true)}
    ${label(24, 160, 'Dot to dot', 5, 'start', 900, '#245ca8')}
    ${DOTS_SOLUTION(0.42, 14, 140)}
    ${label(100, 160, 'Spot the difference', 5, 'start', 900, '#245ca8')}
    ${diffs.map((d, i) => label(100, 174 + i * 9, `${i + 1}. ${d}`, 4, 'start', 400)).join('')}
    ${label(W / 2, 262, 'Well done, you\'re a Christmas superstar!', 5.4, 'middle', 900, '#b0245f')}
    ${softStar(26, 260, 6, '#ffd23f', 1)}${softStar(184, 260, 6, '#ffd23f', 1)}`;
}

// ---------------------------------------------------------------- pack

const activities = [
  ['Party Crown', crown, 'Cut and make: party crown'],
  ['Finger Puppets', puppets, 'Cut and make: four finger puppets'],
  ['Pop-up Card', popupInside, 'Cut and make: pop-up card (card page)'],
  ['Pop-up Card', popupPieces, 'Cut and make: pop-up card (pieces and steps)'],
  ['Reindeer Maze', maze, 'Puzzle: reindeer maze'],
  ['Dot to Dot', dotToDot, 'Puzzle: dot to dot'],
  ['Word Search', wordSearch, 'Puzzle: Christmas word search'],
  ['Spot the Difference', spotDiff, 'Puzzle: spot the difference'],
  ['Jumper Designer', jumper, 'Draw: design a Christmas jumper'],
  ['Letter to Santa', letter, 'Write: a letter to Santa'],
];

export default {
  id: 'activity',
  file: 'sparkle-christmas-activity-pack',
  sample: 6,
  activities,
  pages: [
    cover({
      title: 'Christmas',
      line2: 'Activity Pack',
      sub: 'Cut, fold, make and puzzle: 10 activities for ages 4 to 10',
      tiles: [crown, puppets, maze, wordSearch, spotDiff, letter].map((d) => d(colour)),
      tileView: '8 30 194 252',
      badge: ['10', 'ACTIVITIES'],
    }),
    infoPage({
      heading: 'Thank you, and have fun making!',
      intro:
        'Ten Christmas activities to cut, fold, make and solve. The crafts need scissors and glue, so little ones will want a grown-up to help with the cutting. The answers are on the last page, no peeking!',
      contents: [...activities.map(([, , d]) => d), 'Answers'],
      tips: [
        'Print at 100% or "fit to page". The pack comes in A4 and US Letter sizes, so pick the one that matches your paper.',
        'Print the crown, puppets and pop-up card on thin card (160 to 200gsm) so they are sturdy. Plain paper is fine for everything else.',
        'Dashed lines are for cutting and dotted lines are for folding.',
        'Print the puzzles again for each child, so everyone gets a go.',
      ],
    }),
    ...activities.map(([title, draw]) => page({ title, body: draw(blank), kind: 'activity' })),
    page({ title: 'Answers', body: answers(), kind: 'activity' }),
  ],
};
