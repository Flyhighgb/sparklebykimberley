// Christmas colouring pack: a cover, a how-to page and twelve pictures.
// Each picture is a function of a colour picker, so the same drawing gives a
// blank colouring page or a coloured-in version for the cover and previews.

import { INK, W, blank, colour, f, ln, star, softStar, snowflake, tubes, holly, present, face, page, cloudArc, rng, textBlock, cover, infoPage } from './lib.mjs';

function sky(seed, n = 10, avoid = () => false, c = blank) {
  const r = rng(seed);
  let s = '';
  const placed = [];
  for (let tries = 0; placed.length < n && tries < 600; tries++) {
    const x = 18 + r() * 174;
    const y = 40 + r() * 225;
    if (avoid(x, y) || placed.some(([px, py]) => Math.hypot(px - x, py - y) < 22)) continue;
    placed.push([x, y]);
    s += r() < 0.5 ? snowflake(x, y, 5 + r() * 3, 1) : softStar(x, y, 4 + r() * 2.5, c('yellow'), 1);
  }
  return s;
}

// ---------------------------------------------------------------- pictures

export function snowman(c) {
  const body = `
    <path d="M12,262 Q60,247 105,257 T198,251" fill="none" ${ln(1.4)}/>
    ${tubes(['M78,160 L48,128', 'M57,138 L44,135', 'M54,134 L51,121', 'M132,160 L162,128', 'M153,138 L166,135', 'M156,134 L159,121'], 3, c('brown'))}
    <circle cx="105" cy="226" r="44" fill="${c('white')}" ${ln()}/>
    <circle cx="105" cy="162" r="34" fill="${c('white')}" ${ln()}/>
    <circle cx="105" cy="104" r="27" fill="${c('white')}" ${ln()}/>
    <rect x="84" y="44" width="42" height="36" rx="3" fill="${c('blue')}" ${ln()}/>
    <rect x="84" y="68" width="42" height="8" fill="${c('red')}" ${ln()}/>
    ${holly(119, 71, 12, c, 1)}
    <ellipse cx="105" cy="80" rx="32" ry="5.5" fill="${c('blue')}" ${ln()}/>
    ${face(105, 99, 26, c, { mouth: false, cheeks: false })}
    <path d="M104,104 L128,108.5 L104,111 Z" fill="${c('orange')}" ${ln(1.1)}/>
    <path d="M107,106 L110,105.6 M113,108.6 L116,108.2" fill="none" ${ln(0.8)}/>
    ${[-10, -5, 0, 5, 10].map((d) => `<circle cx="${105 + d}" cy="${117 + Math.abs(d) * -0.25 + (d * d) / 60 - 1.5}" r="1.4" fill="${INK}"/>`).join('')}
    <path d="M80,125 Q105,136 130,125 L131,134 Q105,145 79,134 Z" fill="${c('red')}" ${ln()}/>
    <path d="M114,136 L127,134 L133,170 L119,172 Z" fill="${c('red')}" ${ln()}/>
    <path d="M120,172 L119.5,177 M124,171.4 L124,176.5 M128,170.7 L128.6,175.8 M132,170.2 L133.2,175" fill="none" ${ln(1)}/>
    <path d="M90,129.5 L90,138.5 M100,131.5 L100,141 M110,131.5 L110,141 M120,129.5 L120,138" fill="none" ${ln(0.8)}/>
    <path d="M116,147 L129,145 M117.6,158 L130.6,156" fill="none" ${ln(0.8)}/>
    ${[150, 164, 178].map((y) => `<circle cx="105" cy="${y}" r="3.2" fill="${INK}"/>`).join('')}
    ${present(20, 236, 30, 26, c, 'green', 'red')}
    ${present(160, 238, 30, 24, c, 'pink', 'yellow')}`;
  return sky(11, 12, (x, y) => (x > 40 && x < 170 && y > 36 && y < 280) || y > 228, c) + body;
}

function tier(apexY, baseY, half, scallops) {
  const cx = W / 2;
  let d = `M${cx},${apexY} C${cx + half * 0.25},${apexY + 8} ${cx + half * 0.7},${baseY - 14} ${cx + half},${baseY}`;
  const step = (half * 2) / scallops;
  for (let i = 0; i < scallops; i++) {
    const x0 = cx + half - i * step;
    d += ` Q${f(x0 - step / 2)},${baseY + 7} ${f(x0 - step)},${baseY}`;
  }
  d += ` C${cx - half * 0.7},${baseY - 14} ${cx - half * 0.25},${apexY + 8} ${cx},${apexY}Z`;
  return d;
}

export function tree(c) {
  const baubles = [
    [92, 92, 'red'], [118, 98, 'blue'], [80, 135, 'yellow'], [112, 128, 'pink'], [136, 140, 'red'],
    [70, 185, 'blue'], [98, 178, 'turquoise'], [126, 188, 'yellow'], [152, 182, 'pink'], [60, 150, 'pink'],
  ];
  return `${sky(22, 10, (x, y) => (x > 30 && x < 180 && y > 30) , c)}
    <rect x="93" y="200" width="24" height="24" fill="${c('brown')}" ${ln()}/>
    <path d="M82,222 L128,222 L122,252 L88,252 Z" fill="${c('red')}" ${ln()}/>
    <rect x="79" y="218" width="52" height="9" rx="2" fill="${c('red')}" ${ln()}/>
    <path d="${tier(116, 205, 70, 7)}" fill="${c('green')}" ${ln()}/>
    <path d="M52,180 Q105,198 160,174" fill="none" ${ln(4.2)}/><path d="M52,180 Q105,198 160,174" fill="none" stroke="${c('yellow')}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="${tier(78, 150, 50, 5)}" fill="${c('green')}" ${ln()}/>
    <path d="M70,132 Q105,146 141,126" fill="none" ${ln(4.2)}/><path d="M70,132 Q105,146 141,126" fill="none" stroke="${c('yellow')}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="${tier(48, 106, 31, 4)}" fill="${c('green')}" ${ln()}/>
    ${baubles
      .map(([x, y, k]) => `<rect x="${x - 2}" y="${y - 7.5}" width="4" height="3" fill="${c('gold')}" ${ln(0.9)}/><circle cx="${x}" cy="${y}" r="5.5" fill="${c(k)}" ${ln(1.1)}/><path d="M${x - 2.6},${y - 2} Q${x - 2},${y - 3.2} ${x - 0.6},${y - 3.4}" fill="none" ${ln(0.7)}/>`)
      .join('')}
    ${softStar(105, 45, 14, c('yellow'), 1.4)}
    <path d="M100,40 L101,38 M110,40 L109,38" fill="none" ${ln(0)}/>
    ${present(28, 222, 42, 40, c, 'blue', 'yellow')}
    ${present(140, 228, 44, 34, c, 'pink', 'turquoise')}
    ${present(62, 244, 22, 18, c, 'yellow', 'red')}
    <path d="M14,265 L196,265" ${ln(1.4)}/>`;
}

export function reindeer(c) {
  const antlerL = ['M84,110 C80,92 70,80 58,62', 'M76,92 L60,86', 'M68,79 L72,60', 'M61,68 L46,66'];
  const antlerR = antlerL.map((d) => d.replace(/(-?\d+(?:\.\d+)?),/g, (m, x) => `${f(210 - Number(x))},`));
  return `${sky(33, 10, (x, y) => (x > 34 && x < 176 && y > 50 && y < 268) || (x > 50 && x < 160 && y < 60), c)}
    ${tubes([...antlerL, ...antlerR], 6, c('brown'))}
    <path d="M62,128 C40,118 30,128 34,138 C40,150 58,150 66,142 Z" fill="${c('tan')}" ${ln()}/>
    <path d="M58,134 C48,130 42,134 44,138 C47,143 56,143 60,140Z" fill="${c('pink')}" ${ln(1)}/>
    <path d="M148,128 C170,118 180,128 176,138 C170,150 152,150 144,142 Z" fill="${c('tan')}" ${ln()}/>
    <path d="M152,134 C162,130 168,134 166,138 C163,143 154,143 150,140Z" fill="${c('pink')}" ${ln(1)}/>
    <path d="M105,100 C140,100 152,130 150,165 C148,200 134,232 105,240 C76,232 62,200 60,165 C58,130 70,100 105,100 Z" fill="${c('tan')}" ${ln()}/>
    <path d="M92,104 C96,112 100,114 105,110 C110,114 114,112 118,104" fill="none" ${ln(1.1)}/>
    <ellipse cx="105" cy="200" rx="33" ry="27" fill="${c('skin')}" ${ln()}/>
    ${face(105, 150, 42, c, { mouth: false })}
    <circle cx="105" cy="186" r="12" fill="${c('red')}" ${ln()}/>
    <ellipse cx="101" cy="181.5" rx="3.5" ry="2.2" fill="#fff" ${ln(0.7)}/>
    <path d="M91,208 Q105,222 119,208" fill="none" ${ln(1.4)}/>
    <path d="M70,232 Q105,250 140,232 L142,244 Q105,262 68,244 Z" fill="${c('red')}" ${ln()}/>
    <circle cx="105" cy="256" r="6.5" fill="${c('yellow')}" ${ln()}/>
    <path d="M101,256 L109,256 M105,252 L105,258" fill="none" ${ln(0.8)}/>
`;
}

export function santa(c) {
  const beard = cloudArc(105, 168, 52, 70, 180, 0, 12, 1.9) + ' Q105,162 53,168 Z';
  return `${sky(44, 12, (x, y) => x > 36 && x < 182 && y > 38 && y < 272, c)}
    <path d="M60,124 C64,80 104,52 150,56 C164,58 172,66 174,74 L162,82 C150,74 136,80 140,124 Z" fill="${c('red')}" ${ln()}/>
    <circle cx="170" cy="78" r="11" fill="${c('white')}" ${ln()}/>
    <circle cx="105" cy="148" r="38" fill="${c('skin')}" ${ln()}/>
    <path d="${beard}" fill="${c('white')}" ${ln()}/>
    <path d="M70,160 C75,175 135,175 140,160" fill="${c('skin')}" stroke="none"/>
    <rect x="56" y="110" width="98" height="22" rx="11" fill="${c('white')}" ${ln()}/>
    <path d="M70,116 q2,3 0,6 M86,114 q2,3 0,6 M104,118 q2,3 0,6 M122,114 q2,3 0,6 M138,117 q2,3 0,6" fill="none" ${ln(0.8)}/>
    ${face(105, 146, 40, c, { mouth: false })}
    <path d="M105,168 C96,160 82,160 76,170 C84,176 98,176 105,170 C112,176 126,176 134,170 C128,160 114,160 105,168Z" fill="${c('white')}" ${ln()}/>
    <circle cx="105" cy="163" r="6" fill="${c('pink')}" ${ln()}/>
    <path d="M97,186 Q105,193 113,186" fill="${c('red')}" ${ln(1.2)}/>
    <path d="M86,136 Q91,132 96,135 M114,135 Q119,132 124,136" fill="none" ${ln(1.6)}/>`;
}

export function gingerbread(c) {
  const limbs = ['M105,92 L105,92.01', 'M62,140 L148,140', 'M105,130 L105,182', 'M92,182 L74,238', 'M118,182 L136,238'];
  const zig = (x, y, w, rot) => {
    let d = `M${-w / 2},0`;
    for (let i = 1; i <= 8; i++) d += ` L${f(-w / 2 + (w * i) / 8)},${i % 2 ? -2.2 : 0}`;
    return `<path d="${d}" transform="translate(${x},${y}) rotate(${rot})" fill="none" ${ln(1)}/>`;
  };
  return `${sky(55, 12, (x, y) => x > 36 && x < 178 && y > 38 && y < 268, c)}
    <g transform="translate(0,0)">
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="${INK}" stroke-width="37">${limbs.map((d, i) => `<path d="${d}" stroke-width="${i === 0 ? 62.8 : i === 2 ? 56.8 : 36.8}"/>`).join('')}</g>
      <g stroke="${c('tan')}">${limbs.map((d, i) => `<path d="${d}" stroke-width="${i === 0 ? 60 : i === 2 ? 54 : 34}"/>`).join('')}</g>
    </g></g>
    ${zig(56, 140, 24, 90)}${zig(154, 140, 24, 90)}
    ${zig(77, 230, 26, 17)}${zig(133, 230, 26, -17)}
    ${face(105, 88, 36, c)}
    <path d="M93,121 L105,127 L117,121 L117,133 L105,127 L93,133 Z" fill="${c('red')}" ${ln(1.2)}/>
    <circle cx="105" cy="127" r="3" fill="${c('red')}" ${ln(1.2)}/>
    ${[146, 162, 178].map((y, i) => `<circle cx="105" cy="${y}" r="4.5" fill="${c(['green', 'pink', 'blue'][i])}" ${ln(1.2)}/>`).join('')}
`;
}

export function penguin(c) {
  const navy = c('#3b4a6b');
  return `${sky(66, 12, (x, y) => (x > 36 && x < 180 && y > 34 && y < 270) || y > 250, c)}
    <path d="M10,262 Q105,250 200,262" fill="none" ${ln()}/>
    <path d="M58,160 C40,180 40,200 46,214 C56,206 64,192 66,176 Z" fill="${navy}" ${ln()}/>
    <path d="M152,160 C170,180 170,200 164,214 C154,206 146,192 144,176 Z" fill="${navy}" ${ln()}/>
    <ellipse cx="88" cy="252" rx="15" ry="6" fill="${c('orange')}" ${ln()}/>
    <ellipse cx="122" cy="252" rx="15" ry="6" fill="${c('orange')}" ${ln()}/>
    <ellipse cx="105" cy="185" rx="50" ry="66" fill="${navy}" ${ln()}/>
    <ellipse cx="105" cy="196" rx="35" ry="52" fill="${c('white')}" ${ln()}/>
    <circle cx="105" cy="108" r="38" fill="${navy}" ${ln()}/>
    <path d="M105,96 C96,84 76,88 76,104 C76,124 92,136 105,138 C118,136 134,124 134,104 C134,88 114,84 105,96Z" fill="${c('white')}" ${ln()}/>
    ${face(105, 108, 34, c, { mouth: false })}
    <path d="M98,117 L112,117 L105,126 Z" fill="${c('orange')}" ${ln(1.2)}/>
    <path d="M70,96 C70,60 140,60 140,96 Z" fill="${c('red')}" ${ln()}/>
    <rect x="66" y="90" width="78" height="12" rx="6" fill="${c('white')}" ${ln()}/>
    <path d="M78,90 L80,102 M90,90 L92,102 M102,90 L104,102 M114,90 L116,102 M126,90 L128,102" fill="none" ${ln(0.8)}/>
    <circle cx="105" cy="60" r="9" fill="${c('white')}" ${ln()}/>
    <path d="M70,140 Q105,154 140,140 L141,150 Q105,164 69,150 Z" fill="${c('green')}" ${ln()}/>
    <path d="M80,150 L72,190 L84,192 L92,154 Z" fill="${c('green')}" ${ln()}/>
    <path d="M73,190 L72,195 M77,190.6 L76.6,196 M81,191.2 L81,196.4" fill="none" ${ln(1)}/>
    ${[160, 176, 192].map((y) => `<circle cx="105" cy="${y + 20}" r="0" />`).join('')}`;
}

export function stocking(c) {
  const boot = 'M70,92 L140,92 L140,190 C140,214 150,222 168,226 C186,230 190,262 162,266 L110,266 C80,266 70,246 70,220 Z';
  return `${sky(77, 10, (x, y) => x > 40 && x < 196 && y > 36 && y < 272, c)}
    <path d="M86,72 C80,48 96,40 104,52" fill="none" ${ln(2.2)}/>
    ${tubes(['M80,92 C76,60 78,48 88,44 C96,42 98,52 92,58'], 7, c('red'))}
    <path d="M80,44 L88,44" fill="none"/>
    <path d="M118,92 C116,70 118,58 122,50" fill="none"/>
    <circle cx="120" cy="58" r="16" fill="${c('tan')}" ${ln()}/>
    <circle cx="107" cy="45" r="6.5" fill="${c('tan')}" ${ln()}/><circle cx="133" cy="45" r="6.5" fill="${c('tan')}" ${ln()}/>
    <circle cx="107" cy="45" r="3" fill="${c('skin')}" ${ln(0.9)}/><circle cx="133" cy="45" r="3" fill="${c('skin')}" ${ln(0.9)}/>
    <circle cx="120" cy="58" r="16" fill="${c('tan')}" ${ln()}/>
    ${face(120, 56, 20, c, { mouthY: 0.32 })}
    <ellipse cx="120" cy="63" rx="5" ry="3.6" fill="${c('skin')}" ${ln(0.9)}/>
    <circle cx="120" cy="61.8" r="1.3" fill="${INK}"/>
    ${softStar(98, 64, 12, c('yellow'))}
    <clipPath id="boot"><path d="${boot}"/></clipPath>
    <path d="${boot}" fill="${c('red')}"/>
    <g clip-path="url(#boot)">
      <ellipse cx="176" cy="246" rx="26" ry="30" fill="${c('white')}" ${ln()}/>
      <ellipse cx="68" cy="266" rx="30" ry="26" fill="${c('white')}" ${ln()}/>
    </g>
    ${[124, 156, 188].map((y) => `<path d="M70,${y} L140,${y} M70,${y + 10} L140,${y + 10}" ${ln(1)}/>`).join('')}
    ${[[88, 140], [122, 140], [105, 172], [88, 204], [122, 204]].map(([x, y]) => snowflake(x, y, 6.5, 1)).join('')}
    <path d="${boot}" fill="none" ${ln()}/>
    <rect x="62" y="82" width="86" height="24" rx="12" fill="${c('white')}" ${ln()}/>
    ${holly(140, 94, 14, c, 1)}`;
}

export function snowGlobe(c) {
  const clip = `<clipPath id="globe"><circle cx="105" cy="130" r="64"/></clipPath>`;
  const inside = `<g clip-path="url(#globe)">
    <path d="M30,170 Q70,150 105,162 T190,160 L190,210 L30,210 Z" fill="${c('white')}" ${ln()}/>
    <rect x="78" y="128" width="48" height="36" fill="${c('red')}" ${ln()}/>
    <path d="M72,130 L102,100 L132,130 Z" fill="${c('blue')}" ${ln()}/>
    <path d="M72,130 C80,124 86,132 92,126 C98,132 106,124 112,130 C118,124 126,132 132,130" fill="${c('white')}" ${ln(1.1)}/>
    <rect x="96" y="142" width="12" height="22" rx="2" fill="${c('brown')}" ${ln()}/>
    <rect x="82" y="136" width="10" height="10" fill="${c('yellow')}" ${ln(1.1)}/><path d="M87,136 L87,146 M82,141 L92,141" ${ln(0.8)}/>
    <rect x="113" y="136" width="10" height="10" fill="${c('yellow')}" ${ln(1.1)}/><path d="M118,136 L118,146 M113,141 L123,141" ${ln(0.8)}/>
    <rect x="114" y="104" width="7" height="14" fill="${c('brown')}" ${ln(1.1)}/>
    <path d="M145,170 L145,160 M131,160 L145,118 L159,160 Z M134,145 L156,145" fill="${c('green')}" ${ln()}/>
    <path d="M145,160 L145,172" ${ln(2)}/>
    <circle cx="60" cy="162" r="9" fill="${c('white')}" ${ln()}/><circle cx="60" cy="146" r="6.5" fill="${c('white')}" ${ln()}/>
    <circle cx="58" cy="145" r="0.9" fill="${INK}"/><circle cx="62" cy="145" r="0.9" fill="${INK}"/>
    <path d="M60,147 L64,148 L60,149Z" fill="${c('orange')}" ${ln(0.6)}/>
    ${[[60, 92], [80, 80], [140, 88], [150, 108], [66, 118], [124, 74], [100, 72], [160, 135], [48, 132]].map(([x, y], i) => (i % 3 ? `<circle cx="${x}" cy="${y}" r="2.2" fill="${c('white')}" ${ln(0.9)}/>` : snowflake(x, y, 5, 0.9))).join('')}
  </g>`;
  return `<defs>${clip}</defs>${sky(88, 10, (x, y) => x > 30 && x < 180 && y > 36 && y < 260, c)}
    <circle cx="105" cy="130" r="64" fill="${c('sky')}" ${ln()}/>
    ${inside}
    <circle cx="105" cy="130" r="64" fill="none" ${ln(1.6)}/>
    <path d="M58,92 C66,80 76,74 86,71" fill="none" ${ln(1.1)}/>
    <path d="M62,186 L148,186 L162,236 L48,236 Z" fill="${c('red')}" ${ln()}/>
    <rect x="44" y="234" width="122" height="14" rx="4" fill="${c('darkred')}" ${ln()}/>
    <rect x="78" y="200" width="54" height="20" rx="4" fill="${c('yellow')}" ${ln()}/>
    <text x="105" y="214" text-anchor="middle" font-family="Pacifico" font-size="9" fill="#fff" stroke="${INK}" stroke-width="0.5" paint-order="stroke">Let it snow</text>
    ${holly(64, 214, 12, c, 1)}${holly(146, 214, 12, c, 1)}`;
}

export function robin(c) {
  const leaves = [[38, 196, 20], [70, 206, -30], [130, 214, 160], [168, 204, 200], [150, 226, 120]];
  const leaf = (x, y, r) => `<g transform="translate(${x},${y}) rotate(${r}) scale(1.25)"><path d="M0,0 C3,-3 6,-5 9,-4 C9,-6 12,-8 14,-7 C14,-9 18,-10 21,-8 C20,-6 22,-3 24,-2 C21,0 21,3 22,5 C19,5 17,7 16,9 C14,7 11,7 9,8 C9,6 6,4 3,4 C3,2 1,1 0,0Z" fill="${c('green')}" ${ln(1)}/><path d="M2,1 C8,0 15,0 22,-1" fill="none" ${ln(0.7)}/></g>`;
  return `${sky(99, 10, (x, y) => (x > 22 && x < 190 && y > 60 && y < 250), c)}
    ${tubes(['M14,210 C60,200 120,214 196,200', 'M60,205 C66,226 60,236 52,244', 'M150,206 C160,218 168,222 180,224'], 6, c('brown'))}
    ${leaves.map(([x, y, r]) => leaf(x, y, r)).join('')}
    ${[[48, 206], [53, 211], [43, 212], [162, 214], [167, 210], [158, 219]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${c('red')}" ${ln(1)}/>`).join('')}
    <path d="M64,150 C46,136 34,120 30,104 C46,110 60,116 72,126 Z" fill="${c('brown')}" ${ln()}/>
    <path d="M44,118 L60,130 M38,110 L58,124" fill="none" ${ln(0.8)}/>
    <path d="M96,196 L92,210 M92,210 L86,212 M92,210 L94,214 M114,196 L116,210 M116,210 L110,213 M116,210 L121,213" fill="none" ${ln(1.6)}/>
    <ellipse cx="108" cy="148" rx="50" ry="50" fill="${c('brown')}" ${ln()}/>
    <path d="M90,112 C70,128 70,170 92,186 C110,196 136,190 146,172 C156,150 148,124 128,114 C116,108 100,106 90,112Z" fill="${c('red')}" ${ln()}/>
    <path d="M104,178 C114,190 136,190 148,170 C150,182 136,198 108,198 C98,196 98,186 104,178Z" fill="${c('white')}" ${ln()}/>
    <path d="M62,136 C66,120 82,118 92,128 C98,148 92,170 76,176 C64,170 60,150 62,136Z" fill="${c('tan')}" ${ln()}/>
    <path d="M70,148 C74,156 80,160 86,160 M68,160 C72,166 78,168 82,168" fill="none" ${ln(0.9)}/>
    ${face(122, 124, 30, c, { mouth: false })}
    <path d="M127,130 L146,134 L127,138 Z" fill="${c('orange')}" ${ln(1.2)}/>
`;
}

export function mandala(c) {
  const cx = 105, cy = 150;
  let s = '';
  const ring = (n, fn) => { for (let i = 0; i < n; i++) s += `<g transform="rotate(${f((360 / n) * i)} ${cx} ${cy})">${fn()}</g>`; };
  s += `<circle cx="${cx}" cy="${cy}" r="88" fill="none" ${ln(1.2)}/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="82" fill="none" ${ln(0.7)}/>`;
  ring(36, () => `<path d="M${cx},${cy - 82} q2.2,-3 0,-6 q-2.2,3 0,6" fill="${c('sky')}" ${ln(0.6)}/>`);
  ring(12, () => `<path d="M${cx},${cy - 20} C${cx + 8},${cy - 40} ${cx + 16},${cy - 62} ${cx},${cy - 80} C${cx - 16},${cy - 62} ${cx - 8},${cy - 40} ${cx},${cy - 20}Z" fill="${c('blue')}" ${ln(0.9)}/>
    <path d="M${cx},${cy - 30} C${cx + 5},${cy - 44} ${cx + 9},${cy - 60} ${cx},${cy - 72} C${cx - 9},${cy - 60} ${cx - 5},${cy - 44} ${cx},${cy - 30}Z" fill="${c('sky')}" ${ln(0.7)}/>
    <path d="M${cx},${cy - 36} L${cx},${cy - 66}" ${ln(0.6)}/>
    ${[44, 52, 60].map((d) => `<path d="M${cx},${cy - d} l-3,-4 M${cx},${cy - d} l3,-4" fill="none" ${ln(0.6)}/>`).join('')}`);
  ring(12, () => `<g transform="rotate(15 ${cx} ${cy})"><path d="M${cx},${cy - 56} C${cx + 6},${cy - 64} ${cx + 6},${cy - 72} ${cx},${cy - 78} C${cx - 6},${cy - 72} ${cx - 6},${cy - 64} ${cx},${cy - 56}Z" fill="${c('turquoise')}" ${ln(0.8)}/><circle cx="${cx}" cy="${cy - 47}" r="2.6" fill="${c('white')}" ${ln(0.7)}/><circle cx="${cx}" cy="${cy - 38}" r="1.6" fill="${c('blue')}" ${ln(0.6)}/></g>`);
  s += `<circle cx="${cx}" cy="${cy}" r="22" fill="${c('white')}" ${ln(1)}/>`;
  ring(8, () => `<path d="M${cx},${cy - 4} C${cx + 5},${cy - 10} ${cx + 5},${cy - 16} ${cx},${cy - 20} C${cx - 5},${cy - 16} ${cx - 5},${cy - 10} ${cx},${cy - 4}Z" fill="${c('yellow')}" ${ln(0.7)}/>`);
  s += `<circle cx="${cx}" cy="${cy}" r="4" fill="${c('pink')}" ${ln(0.8)}/>`;
  ring(24, () => `<circle cx="${cx}" cy="${cy - 85}" r="1.3" fill="${c('white')}" ${ln(0.5)}/>`);
  const corners = [[28, 52], [182, 52], [28, 256], [182, 256]].map(([x, y]) => snowflake(x, y, 12, 0.8) + `<circle cx="${x}" cy="${y}" r="3" fill="${c('sky')}" ${ln(0.7)}/>`).join('');
  return s + corners;
}

export function baubles(c) {
  const pats = {
    zig: (y, w) => { let d = `M0,${y + 6}`; for (let x = 0; x <= w; x += 6) d += ` L${x + 3},${y} L${x + 6},${y + 6}`; return `<path d="${d}" fill="none" ${ln(0.7)}/>`; },
    dots: (y, w) => Array.from({ length: Math.ceil(w / 8) }, (_, i) => `<circle cx="${i * 8 + 4}" cy="${y + 4}" r="2" fill="${c('white')}" ${ln(0.6)}/>`).join(''),
    stars: (y, w) => Array.from({ length: Math.ceil(w / 11) }, (_, i) => `<path d="${star(i * 11 + 5, y + 5, 4)}" fill="${c('yellow')}" ${ln(0.6)}/>`).join(''),
    scallop: (y, w) => { let d = `M0,${y}`; for (let x = 0; x < w; x += 8) d += ` q4,8 8,0`; return `<path d="${d}" fill="none" ${ln(0.7)}/>`; },
    hearts: (y, w) => Array.from({ length: Math.ceil(w / 10) }, (_, i) => `<path d="M${i * 10 + 5},${y + 8} c-5,-4 -4,-8 -1.5,-8 c1,0 1.5,1 1.5,1.5 c0,-0.5 0.5,-1.5 1.5,-1.5 c2.5,0 3.5,4 -1.5,8z" fill="${c('pink')}" ${ln(0.6)}/>`).join(''),
    diamonds: (y, w) => Array.from({ length: Math.ceil(w / 8) }, (_, i) => `<path d="M${i * 8 + 4},${y} l4,4 l-4,4 l-4,-4z" fill="${c('turquoise')}" ${ln(0.6)}/>`).join(''),
  };
  const one = (id, x, top, string, r, order, fill) => {
    const cy = top + r;
    const bands = [-0.62, -0.3, 0.02, 0.34, 0.66].map((t) => cy + t * r);
    let inner = `<rect x="${x - r}" y="${top}" width="${2 * r}" height="${2 * r}" fill="${c(fill)}"/>`;
    order.forEach((p, i) => { inner += `<g transform="translate(${x - r},0)">${pats[p](bands[i] + 2, 2 * r)}</g>`; });
    inner += bands.map((y) => `<path d="M${x - r},${y} L${x + r},${y}" ${ln(0.8)}/><path d="M${x - r},${y + 12} L${x + r},${y + 12}" ${ln(0.8)}/>`).slice(0, 5).join('');
    return `<path d="M${x},40 L${x},${top - 8}" ${ln(0.9)}/>
      <path d="M${x - 4},${top - 8} q4,-7 8,0" fill="none" ${ln(0.9)}/>
      <clipPath id="${id}"><circle cx="${x}" cy="${cy}" r="${r}"/></clipPath>
      <g clip-path="url(#${id})">${inner}</g>
      <circle cx="${x}" cy="${cy}" r="${r}" fill="none" ${ln(1.2)}/>
      <rect x="${x - 7}" y="${top - 5}" width="14" height="8" rx="1.5" fill="${c('gold')}" ${ln(1)}/>
      <path d="M${x - 4},${top - 5} L${x - 4},${top + 3} M${x},${top - 5} L${x},${top + 3} M${x + 4},${top - 5} L${x + 4},${top + 3}" ${ln(0.5)}/>`;
  };
  return `<path d="M14,40 C60,52 150,52 196,40" fill="none" ${ln(1.2)}/>
    ${[30, 76, 128, 180].map((x) => holly(x, 46 + (x > 50 && x < 160 ? 3 : 0), 11, c, 0.9)).join('')}
    ${one('b1', 50, 84, 0, 36, ['zig', 'dots', 'stars', 'scallop', 'hearts'], 'red')}
    ${one('b2', 156, 100, 0, 36, ['diamonds', 'hearts', 'scallop', 'stars', 'zig'], 'blue')}
    ${one('b3', 102, 186, 0, 44, ['stars', 'scallop', 'diamonds', 'dots', 'zig'], 'green')}`;
}

export function merryChristmas(c) {
  const cx = 105, cy = 152, R = 80;
  let wreath = '';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const rr = R + (i % 2 ? 7 : -7);
    wreath += holly(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 15, c, 1, (a * 180) / Math.PI + 90);
  }
  return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" ${ln(14)} stroke="${INK}"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${c('darkgreen')}" stroke-width="11.6"/>
    ${wreath}
    <path d="M90,236 C70,226 66,250 84,252 C92,252 98,244 105,238 C112,244 118,252 126,252 C144,250 140,226 120,236 Z" fill="${c('red')}" ${ln()}/>
    <path d="M100,240 L88,272 L96,268 L100,276 L104,244 Z M110,240 L122,272 L114,268 L110,276 L106,244 Z" fill="${c('red')}" ${ln()}/>
    <rect x="98" y="232" width="14" height="12" rx="3" fill="${c('red')}" ${ln()}/>
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Pacifico" font-size="34" fill="${c('red')}" stroke="${INK}" stroke-width="1" paint-order="stroke" stroke-linejoin="round">Merry</text>
    <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="Pacifico" font-size="30" fill="${c('green')}" stroke="${INK}" stroke-width="1" paint-order="stroke" stroke-linejoin="round">Christmas</text>
    ${softStar(cx, 48, 10, c('yellow'))}${softStar(30, 60, 6, c('yellow'))}${softStar(180, 60, 6, c('yellow'))}
    ${snowflake(30, 250, 8)}${snowflake(180, 250, 8)}`;
}

// ---------------------------------------------------------------- pages

const pictures = [
  ['Jolly Snowman', snowman],
  ['Merry Little Tree', tree],
  ['Rudolph', reindeer],
  ['Ho Ho Ho!', santa],
  ['Gingerbread Friend', gingerbread],
  ['Cosy Penguin', penguin],
  ['Full of Surprises', stocking],
  ['Snow Globe Village', snowGlobe],
  ['Little Robin', robin],
  ['Snowflake Mandala', mandala],
  ['Bauble Patterns', baubles],
  ['', merryChristmas],
];

export default {
  id: 'colouring',
  file: 'sparkle-christmas-colouring-pack',
  sample: 4,
  pictures,
  pages: [
    cover({
      title: 'Christmas',
      line2: 'Colouring Pack',
      sub: '12 festive pages to colour, for little ones up to grown-ups',
      tiles: [snowman, reindeer, santa, tree, penguin, mandala].map((d) => d(colour)),
      badge: ['12', 'PAGES'],
    }),
    infoPage({
      heading: 'Thank you, and happy colouring!',
      intro:
        'Grab your pencils, crayons or felt tips. The first pages have big, simple shapes for little hands, and the last few are full of tiny details for older children and grown-ups who like to take their time.',
      contents: pictures.map(([t], i) => (t || 'Merry Christmas wreath') + (i >= 9 ? ' (detailed)' : '')),
      tips: [
        'Print at 100% or "fit to page". The pack comes in A4 and US Letter sizes, so pick the one that matches your paper.',
        'Thicker paper (120 to 160gsm) or thin card stops felt tips bleeding through.',
        'Turn off "print in colour" or choose "greyscale" to save ink. The pages are black and white anyway.',
        'Print a page more than once so everyone can have a go, or try a second colour scheme.',
      ],
    }),
    ...pictures.map(([title, draw]) => page({ title, body: draw(blank) })),
  ],
  coloured: pictures.map(([title, draw]) => page({ title, body: draw(colour) })),
};
