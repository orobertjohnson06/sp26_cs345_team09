import { initFirebase, loadLeaderboard } from './firebase.js';


const PARTICLE_COLORS = ['#3ddb52','#2ee8b0','#ffd060','#a070ff','#e8a020'];
const DEFAULT_BINDS = [
  {action:'Move Left', key:'A'},
  {action:'Move Right', key:'D'},
  {action:'Soft Drop', key:'S'},
  {action:'Hard Drop', key:' '},
  {action:'Rotate', key:'W'},
  {action:'Hold Piece', key:'C'},
  {action:'Pause', key:'P'},
];
const C = {
  bg: '#060e08',
  greenMid: '#155c1e',
  greenGlow: '#3ddb52',
  tealLight: '#2ee8b0',
  gold: '#e8a020',
  goldLight: '#ffd060',
  redBright: '#f04030',
  purpleLight: '#a070ff',
  text: '#f0e8d0',
  textDim: '#a0b898',
};
const sliders = [
  {label:'Master Volume', value:80},
  {label:'Music Volume', value:60},
  {label:'SFX Volume', value:75},
];
const buttonHover = {start:0, settings:0, leaderboard:0, quit:0};
//menu
const MENU_BTNS = [
  {id:'start', label:'START', style:'start'},
  {id:'settings', label:'SETTINGS', style:'settings'},
  {id:'leaderboard', label:'LEADER BOARD', style:'leaderboard'},
  {id:'quit', label:'QUIT', style:'quit'},
];
const BTN_STYLES = {
  start: {
    grad: ['#1a6b24','#27a83a','#1a8030'],
    glow: 'rgba(39,168,58,',
    border: 'rgba(61,219,82,',
    text: '#e8fce0',
  },
  settings: {
    grad: ['#7a4a08','#c88020','#9a6010'],
    glow: 'rgba(200,128,32,',
    border: 'rgba(255,208,96,',
    text: '#fff8e8',
  },
  leaderboard: {
    grad: ['#0a3a5c','#1672a8','#0d4e7a'],
    glow: 'rgba(22,114,168,',
    border: 'rgba(96,200,255,',
    text: '#e8f8ff',
  },
  quit: {
    grad: ['#6a1010','#b02020','#7a1818'],
    glow: 'rgba(176,32,32,',
    border: 'rgba(240,64,48,',
    text: '#ffe8e8',
  },
};

let cx;
let vines = [], particles = [];
let binds = JSON.parse(localStorage.getItem('rq_binds') || 'null') || structuredClone(DEFAULT_BINDS);
let listening = null;
let logoImg = null;
let titleImg = null;
let bgImage = null;
let logoFloatTimer = 0;
let titleShineTimer = 0;
let modalOpen = false;
let modalProgress = 0;
let settingsTab = 'general';
let kbScrollY = 0;
let dragSlider = null;
let regions = [];
let leaderboardOpen = false;
let leaderboardProgress = 0;
let leaderboardData = [];
let leaderboardLoading = false;

window.preload = function () {
  logoImg = loadImage('logo.png', () => {}, () => { logoImg = null; });
  titleImg = loadImage('assets/Relicquae.png', () => {}, () => { titleImg = null; });
  bgImage = loadImage('assets/background.png', () => {}, () => { bgImage = null; });
}

window.setup =  async function () {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.id('bg-canvas');
  canvas.style('display', 'block');
  canvas.style('position', 'fixed');
  canvas.style('top', '0');
  canvas.style('left', '0');
  canvas.style('z-index', '0');
  initVines();
  for (let i = 0; i < 40; i++) particles.push(resetParticle({}));
  cx = width / 2;
  await initFirebase();
}

window.windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
  initVines();
  cx = width / 2;
}

window.draw = function () {
  regions = [];
  logoFloatTimer += 0.015;
  titleShineTimer += 0.012;
  if (modalOpen && modalProgress < 1) modalProgress = min(1, modalProgress + 0.1);
  if (!modalOpen && modalProgress > 0) modalProgress = max(0, modalProgress - 0.1);
  if (leaderboardOpen && leaderboardProgress < 1) leaderboardProgress = min(1, leaderboardProgress + 0.1);
  if (!leaderboardOpen && leaderboardProgress > 0) leaderboardProgress = max(0, leaderboardProgress - 0.1);
  drawBackground();
  vines.forEach(v => { growVine(v); drawVine(v); });
  particles.forEach(p => updateParticle(p));

  drawLogoArea();
  drawMenu();
  if (modalProgress > 0.01) drawOverlay();
  if (leaderboardProgress > 0.01) drawLeaderboardOverlay();
  updateCursor();
}

function drawBackground() {
  console.log(windowWidth, ' ' ,windowHeight);
  background(C.bg);
  if (bgImage !== null && bgImage !== undefined) {
    image(bgImage, 0, 0, width, height);
  }
  push();
  const g = drawingContext.createRadialGradient(width / 2, height, 0, width / 2, height, height * 1.1);
  g.addColorStop(0, 'rgba(14,48,18,0.9)');
  g.addColorStop(1, 'transparent');
  drawingContext.fillStyle = g;
  drawingContext.fillRect(0, 0, width, height);
  pop();
}

//vines
function makeVine(x, y, angleDeg) {
  return {
    pts: [{x, y}],
    angle: angleDeg * Math.PI / 180,
    grown: 0,
    maxLen: random(350, 850),
    speed: 1.2,
    wobble: random(TWO_PI),
    alpha: random(0.35, 0.70),
    thick: random(1.5, 4.0),
    leaves: [],
    leafCd: 0,
  };
}

function initVines() {
  vines = [];
  const corners = [
    {x: 0, y: 0, base: 70},
    {x: width, y: 0, base: 110},
    {x: 0, y: height, base: -30},
    {x: width, y: height, base: -150},
  ];
  corners.forEach(({x, y, base}) => {
    for (let i = 0; i < 5; i++) {
      vines.push(makeVine(x, y, base + (i - 2) * 18 + random(-5, 5)));
    }
  });
}

function growVine(v) {
  if (v.grown >= v.maxLen) return;
  v.wobble += 0.018;
  v.angle += Math.sin(v.wobble) * 0.03;
  const last = v.pts[v.pts.length - 1];
  const dx = last.x + Math.cos(v.angle) * v.speed;
  const dy = last.y + Math.sin(v.angle) * v.speed;
  v.pts.push({x: dx, y: dy});
  v.grown += v.speed;
  v.leafCd += v.speed;
  if (v.leafCd > 18 + random(14)) {
    v.leaves.push({x: dx, y: dy, angle: v.angle + random(-0.6, 0.6), size: random(5, 14)});
    v.leafCd = 0;
  }
}

function drawVine(v) {
  if (v.pts.length < 2) return;
  push();
  stroke(`rgba(58,140,68,${v.alpha})`);
  strokeWeight(v.thick);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  noFill();
  beginShape();
  v.pts.forEach(p => vertex(p.x, p.y));
  endShape();
  v.leaves.forEach(l => {
    push();
    translate(l.x, l.y);
    rotate(l.angle);
    fill(`hsla(125,45%,26%,${v.alpha * 0.85})`);
    noStroke();
    ellipse(0, 0, l.size * 2, l.size * 0.84);
    pop();
  });
  pop();
}
//glowing particles
function resetParticle(p) {
  p.x = random(width || windowWidth);
  p.y = (width ? height : windowHeight) + 5;
  p.vx = random(-0.2, 0.2);
  p.vy = -random(0.2, 0.7);
  p.size = random(0.8, 3.0);
  p.color = random(PARTICLE_COLORS);
  p.life = 0;
  p.maxLife = random(180, 460);
  return p;
}

function updateParticle(p) {
  p.x += p.vx;
  p.y += p.vy;
  p.life++;
  if (p.life > p.maxLife || p.y < -10) {
    resetParticle(p);
    return;
  }
  const a = Math.sin((p.life / p.maxLife) * Math.PI) * 0.7;
  push();
  drawingContext.globalAlpha = a;
  drawingContext.shadowBlur = p.size * 5;
  drawingContext.shadowColor = p.color;
  fill(p.color);
  noStroke();
  circle(p.x, p.y, p.size * 2);
  pop();
}
//logo
function drawLogoArea() {
  const logoY = height * 0.30 + sin(logoFloatTimer) * 7;
  const titleY = height * 0.44;
  const shine = sin(titleShineTimer);
  push();
  const halo = drawingContext.createRadialGradient(cx, logoY, 0, cx, logoY, 90);
  halo.addColorStop(0, 'rgba(61,219,82,0.18)');
  halo.addColorStop(1, 'transparent');
  drawingContext.fillStyle = halo;
  drawingContext.beginPath();
  drawingContext.arc(cx, logoY, 90, 0, Math.PI * 2);
  drawingContext.fill();
  pop();

  if (logoImg) {
    const sz = min(130, width * 0.2);
    push();
    drawingContext.shadowBlur = 24;
    drawingContext.shadowColor = 'rgba(61,219,82,0.65)';
    image(logoImg, cx - sz / 2, logoY - sz / 2, sz, sz);
    pop();
  } else {
    //fallback since we don't have logo rn
    push();
    noFill();
    stroke(C.greenGlow);
    strokeWeight(2);
    circle(cx, logoY, 110);
    pop();
  }
  if (titleImg) {
    const titleW = min(400, width * 0.52);
    const titleH = titleW * (titleImg.height / titleImg.width);
    push();
    drawingContext.shadowBlur = map(shine, -1, 1, 14, 36);
    drawingContext.shadowColor = 'rgba(232,160,32,0.8)';
    drawingContext.globalAlpha = map(shine, -1, 1, 0.75, 1.0);
    image(titleImg, cx - titleW / 2, titleY - titleH / 2, titleW, titleH);
    pop();
  }
}

function drawMenu() {
  const buttonW = min(260, width * 0.42);
  const buttonH = 48;
  MENU_BTNS.forEach((btn, i) => {
    const bx = cx - buttonW / 2;
    const by = height * 0.62 + i * (buttonH + 14);
    const over = !modalOpen &&
      mouseX >= bx && mouseX <= bx + buttonW &&
      mouseY >= by && mouseY <= by + buttonH;
    buttonHover[btn.id] = lerp(buttonHover[btn.id], over ? 1 : 0, 0.14);
    const h = buttonHover[btn.id];
    drawMenuButton(bx, by - h * 2, buttonW, buttonH, btn.label, BTN_STYLES[btn.style], h);
    regions.push({id: btn.id, x: bx, y: by, w: buttonW, h: buttonH});
  });
}

function drawMenuButton(x, y, w, h, label, style, hover) {
  const bPath = roundRectPath(x, y, w, h, 6);
  push();
  drawingContext.shadowBlur = 16 + hover * 18;
  drawingContext.shadowColor = style.glow + (0.45 + hover * 0.3) + ')';
  const grad = drawingContext.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, style.grad[0]);
  grad.addColorStop(0.5, style.grad[1]);
  grad.addColorStop(1, style.grad[2]);
  drawingContext.fillStyle = grad;
  drawingContext.fill(bPath);
  pop();
  push();
  noFill();
  stroke(style.border + (0.4 + hover * 0.35) + ')');
  strokeWeight(1);
  rect(x, y, w, h, 6);
  pop();
  push();
  const topG = drawingContext.createLinearGradient(0, y, 0, y + 5);
  topG.addColorStop(0, 'rgba(255,255,255,0.15)');
  topG.addColorStop(1, 'transparent');
  drawingContext.fillStyle = topG;
  drawingContext.fillRect(x, y, w, 5);
  if (hover > 0.01) {
    const sx = x + (w + 80) * hover - 40;
    const shineGrad = drawingContext.createLinearGradient(sx - 45, 0, sx + 45, 0);
    shineGrad.addColorStop(0,   'transparent');
    shineGrad.addColorStop(0.5, `rgba(255,255,255,${0.16 * hover})`);
    shineGrad.addColorStop(1,   'transparent');
    drawingContext.fillStyle = shineGrad;
    drawingContext.fillRect(x, y, w, h);
  }
  pop();
  push();
  drawingContext.letterSpacing = '0.35em';
  fill(style.text);
  noStroke();
  textFont("'Cinzel', serif");
  textSize(min(15, w * 0.065));
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2);
  pop();
}

//overlay
function drawOverlay() {
  const e = 1 - Math.pow(1 - modalProgress, 3);
  const popW = min(500, width * 0.94);
  const popH = 420;
  const popX = (width - popW) / 2;
  const popY = (height - popH) / 2;
  //bg dim
  push();
  fill(`rgba(2,8,3,${0.82 * e})`);
  noStroke();
  rect(0, 0, width, height);
  pop();
  push();
  translate(width / 2, height / 2);
  scale(0.94 + 0.06 * e);
  translate(-width / 2, -height / 2 + 12 * (1 - e));
  drawingContext.globalAlpha = e;
  drawSettings(popX, popY, popW, popH);
  pop();
}

function roundRectPath(x, y, w, h, r) {
  const path = new Path2D();
  path.roundRect(x, y, w, h, r);
  return path;
}

// settings
function drawSettings(x, y, w, h) {
  const acSz = 20, acPad = 7;
  const headerH = 55;
  const tabH = 40;
  const bodyY = y + headerH + tabH;
  const bodyH = h - headerH - tabH;
  push();
  const bgGrad = drawingContext.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, '#0a1c0c');
  bgGrad.addColorStop(0.5, '#071408');
  bgGrad.addColorStop(1, '#0c1e0e');
  drawingContext.fillStyle = bgGrad;
  drawingContext.fill(roundRectPath(x, y, w, h, 10));
  pop();
  push();
  noFill();
  stroke('rgba(61,219,82,0.35)');
  strokeWeight(1);
  rect(x, y, w, h, 10);
  pop();
  push();
  drawingContext.clip(roundRectPath(x, y, w, h, 10));
  const topG = drawingContext.createLinearGradient(x, y, x, y + 3);
  topG.addColorStop(0, 'rgba(255,255,255,0.06)');
  topG.addColorStop(1, 'transparent');
  drawingContext.fillStyle = topG;
  drawingContext.fillRect(x, y, w, 3);
  pop();
  push();
  stroke('rgba(61,219,82,0.5)');
  strokeWeight(2);
  strokeCap(SQUARE);
  noFill();
  //top left
  line(x + acPad + acSz, y + acPad, x + acPad, y + acPad);
  line(x + acPad, y + acPad, x + acPad, y + acPad + acSz);
  //bottom right
  line(x + w - acPad - acSz, y + h - acPad, x + w - acPad, y + h - acPad);
  line(x + w - acPad, y + h - acPad, x + w - acPad, y + h - acPad - acSz);
  pop();

  drawSettingsHeader(x, y, w, headerH);
  drawSettingsTabs(x, y + headerH, w, tabH);
  drawSettingsBody(x, bodyY, w, bodyH);
}

function drawSettingsHeader(x, y, w, h) {
  const closeX = x + w - 26;
  const closeY = y + h / 2;
  const over = modalOpen && dist(mouseX, mouseY, closeX, closeY) < 16;
  //divider line
  push();
  stroke('rgba(61,219,82,0.15)');
  strokeWeight(1);
  noFill();
  line(x, y + h, x + w, y + h);
  pop();
  push();
  drawingContext.shadowBlur = 14;
  drawingContext.shadowColor = 'rgba(232,160,32,0.5)';
  drawingContext.letterSpacing = '0.18em';
  fill(C.goldLight);
  noStroke();
  textFont("'Cinzel Decorative', serif");
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('Settings', x + 24, y + h / 2);
  pop();
  //close button
  push();
  noStroke();
  if (over) {
    fill('rgba(192,40,26,0.15)');
    circle(closeX, closeY, 28);
  }
  fill(over ? C.redBright : C.textDim);
  textFont('sans-serif');
  textSize(14);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  text('X', closeX, closeY);
  pop();

  regions.push({id: 'close', x: closeX - 16, y: closeY - 16, w: 32, h: 32});
}

function drawSettingsTabs(x, y, w, tabH) {
  const tabs = ['general', 'audio', 'keybinds'];
  const labels = ['General', 'Audio', 'Keybinds'];
  const tabW = w / tabs.length;
  //bg
  push();
  fill('rgba(0,0,0,0.2)');
  noStroke();
  rect(x, y, w, tabH);
  pop();
  //bottom div
  push();
  stroke('rgba(61,219,82,0.15)');
  strokeWeight(1);
  noFill();
  line(x, y + tabH, x + w, y + tabH);
  pop();
  tabs.forEach((tab, i) => {
    const tabX = x + i * tabW;
    const active = settingsTab === tab;
    const over = modalOpen &&
      mouseX >= tabX && mouseX <= tabX + tabW &&
      mouseY >= y && mouseY <= y + tabH;
    if (over && !active) {
      push();
      fill('rgba(61,219,82,0.05)');
      noStroke();
      rect(tabX, y, tabW, tabH);
      pop();
    }
    if (active) {
      push();
      stroke(C.greenGlow);
      strokeWeight(2);
      noFill();
      line(tabX + 4, y + tabH - 1, tabX + tabW - 4, y + tabH - 1);
      pop();
    }
    push();
    fill(active ? C.greenGlow : (over ? C.text : C.textDim));
    noStroke();
    drawingContext.letterSpacing = '0.2em';
    textFont("'Cinzel', serif");
    textSize(10);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(labels[i].toUpperCase(), tabX + tabW / 2, y + tabH / 2);
    pop();
    regions.push({id: `tab-${tab}`, x: tabX, y: y, w: tabW, h: tabH});
  });
}

function drawSettingsBody(x, y, w, h) {
  const pad = 24;
  if (settingsTab === 'audio') {
    drawAudioPanel(x + pad, y + 8, w - pad * 2);
  } else if (settingsTab === 'keybinds') {
    drawKeybindsPanel(x + pad, y + 8, w - pad * 2, h - 16);
  }
}

//audio settings
function drawAudioPanel(panelX, panelY, panelW) {
  sliders.forEach((s, i) => drawSliderRow(panelX, panelY + i * 62, panelW, s, i));
}

function drawSliderRow(x, y, w, s, idx) {
  const midY = y + 30;
  const slW = min(160, w * 0.42);
  const slX = x + w - slW - 38;
  const fillFrac = s.value / 100;
  //row divider
  if (idx > 0) {
    push();
    stroke('rgba(255,255,255,0.05)');
    strokeWeight(1);
    noFill();
    line(x, y, x + w, y);
    pop();
  }
  push();
  fill(C.textDim);
  noStroke();
  drawingContext.letterSpacing = '0.08em';
  textFont("'Cinzel', serif");
  textSize(10);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text(s.label.toUpperCase(), x, midY);
  pop();

  //bg
  push();
  fill('rgba(255,255,255,0.1)');
  noStroke();
  rect(slX, midY - 2, slW, 4, 2);
  pop();
  //track
  push();
  fill(C.goldLight);
  noStroke();
  rect(slX, midY - 2, slW * fillFrac, 4, 2);
  pop();
  //knob
  push();
  fill(C.goldLight);
  noStroke();
  circle(slX + slW * fillFrac, midY, 16);
  pop();
  //audio val
  push();
  fill(C.goldLight);
  noStroke();
  drawingContext.letterSpacing = '0';
  textFont("'Cinzel', serif");
  textSize(11);
  textStyle(BOLD);
  textAlign(RIGHT, CENTER);
  text(s.value, x + w, midY);
  pop();
  regions.push({id: `slider-${idx}`, x: slX - 8, y: midY - 14, w: slW + 16, h: 28, slX, slW});
}

function drawKeybindsPanel(x, y, w, h) {
  const rowH = 36;
  const listY = y + 22;
  push();
  //hint text
  push();
  fill(C.textDim);
  noStroke();
  textFont("'Cinzel', serif");
  textSize(10);
  textStyle(ITALIC);
  textAlign(LEFT, TOP);
  text('Click a key to rebind. Press Esc to cancel.', x, y);
  pop();
  //binds
  binds.forEach((b, i) => {
    const ry = listY + i * rowH + kbScrollY;
    if (ry + rowH < y || ry > y + h) return;
    //row div
    if (i > 0) {
      push();
      stroke('rgba(255,255,255,0.05)');
      strokeWeight(1);
      noFill();
      line(x, ry, x + w, ry);
      pop();
    }
    //label
    push();
    fill(C.textDim);
    noStroke();
    drawingContext.letterSpacing = '0.08em';
    textFont("'Cinzel', serif");
    textSize(10);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(b.action.toUpperCase(), x, ry + rowH / 2);
    pop();
    //key button
    const isListen = listening && listening.index === i;
    const btnW = 88, btnH = 24;
    const btnX = x + w - btnW;
    const btnY = ry + (rowH - btnH) / 2;
    const over = modalOpen &&
      mouseX >= btnX && mouseX <= btnX + btnW &&
      mouseY >= btnY && mouseY <= btnY + btnH;
    let btnBg, btnBorder, btnText;
    if (isListen) {
      const blink = 0.1 + 0.1 * sin(frameCount * 0.1);
      btnBg = `rgba(61,219,82,${0.12 + blink})`;
      btnBorder = C.greenGlow;
      btnText = C.greenGlow;
    } else {
      btnBg = over ? 'rgba(232,160,32,0.2)' : 'rgba(232,160,32,0.08)';
      btnBorder = over ? C.gold : 'rgba(232,160,32,0.28)';
      btnText = C.goldLight;
    }
    push();
    fill(btnBg);
    stroke(btnBorder);
    strokeWeight(1);
    rect(btnX, btnY, btnW, btnH, 4);
    pop();
    push();
    fill(btnText);
    noStroke();
    drawingContext.letterSpacing = '0.06em';
    textFont("'Cinzel', serif");
    textSize(10);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(isListen ? '…press a key' : keyLabel(b.key), btnX + btnW / 2, btnY + btnH / 2);
    pop();
    regions.push({id: `kb-${i}`, x: btnX, y: btnY, w: btnW, h: btnH});
  });
  // reset button
  const resetY = listY + binds.length * rowH + kbScrollY + 8;
  const resetW = 120, resetH = 28;
  const resetX = x + w - resetW;
  const rOver = modalOpen &&
    mouseX >= resetX && mouseX <= resetX + resetW &&
    mouseY >= resetY && mouseY <= resetY + resetH;
  //button
  push();
  fill(rOver ? 'rgba(56, 26, 192, 0.12)' : 'rgba(192,40,26,0.3)');
  stroke(rOver ? C.redBright : 'rgba(192,40,26,0.3)');
  strokeWeight(1);
  rect(resetX, resetY, resetW, resetH, 4);
  pop();
//text
  push();
  fill(rOver ? C.redBright : 'rgba(240,64,48,0.6)');
  noStroke();
  drawingContext.letterSpacing = '0.18em';
  textFont("'Cinzel', serif");
  textSize(9);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text('RESET TO DEFAULTS', resetX + resetW / 2, resetY + resetH / 2);
  pop();
  pop();
  regions.push({id: 'reset-keys', x: resetX, y: resetY, w: resetW, h: resetH});
}

window.mousePressed = function () {
  for (const r of regions) {
    if (mouseX >= r.x && mouseX <= r.x + r.w &&
        mouseY >= r.y && mouseY <= r.y + r.h) {
      handleRegionClick(r);
      return;
    }
  }

  if (modalOpen) {
    const popW = min(500, width * 0.94);
    const popH = 420;
    const popX = (width - popW) / 2;
    const popY = (height - popH) / 2;
    if (mouseX < popX || mouseX > popX + popW ||
        mouseY < popY || mouseY > popY + popH) {
      modalOpen = false;
      cancelListen();
    }
  }
}

window.mouseDragged = function () {
  if (dragSlider === null) return;
  const s = sliders[dragSlider.index];
  const dx = mouseX - dragSlider.startX;
  s.value = constrain(dragSlider.startVal + round(dx / dragSlider.trackW * 100), 0, 100);
}

window.mouseReleased = function () {
  dragSlider = null;
}

window.mouseWheel = function (event) {
  if (modalOpen && settingsTab === 'keybinds') {
    kbScrollY = constrain(kbScrollY - event.delta * 0.4, -(binds.length * 36 - 180), 0);
    return false;
  }
}

function handleRegionClick(r) {
  if (r.id === 'start') {
    window.location.href = 'gamePage.html';
  } else if (r.id === 'settings') {
    modalOpen = true;
    kbScrollY = 0;
  } else if (r.id === 'quit') {
    document.body.style.transition = 'opacity 0.4s';
    document.body.style.opacity = '0';
    setTimeout(() => window.close(), 420);
  } else if (r.id === 'close') {
    modalOpen = false;
    cancelListen();
  } else if (r.id.startsWith('tab-')) {
    settingsTab = r.id.slice(4);
    cancelListen();
  } else if (r.id.startsWith('slider-')) {
    const idx = parseInt(r.id.slice(7));
    dragSlider = {index: idx, startX: mouseX, startVal: sliders[idx].value, trackW: r.slW};
  } else if (r.id.startsWith('kb-')) {
    startListen(parseInt(r.id.slice(3)));
  } else if (r.id === 'reset-keys') {
    binds = structuredClone(DEFAULT_BINDS);
    localStorage.removeItem('rq_binds');
    cancelListen();
  } else if (r.id === 'leaderboard') {
    openLeaderboard();
  } else if (r.id === 'close-leaderboard') {
    leaderboardOpen = false;
  }
}

window.keyPressed = function () {
  if (keyCode === ESCAPE) {
    if (listening) { cancelListen(); return; }
    if (modalOpen) { modalOpen = false; return; }
    if (leaderboardOpen) { leaderboardOpen = false; return; }
    return;
  }

  if (!listening) return;
  binds[listening.index].key = key;
  localStorage.setItem('rq_binds', JSON.stringify(binds));
  cancelListen();
}

function keyLabel(k) {
  return ({' ': 'Space'})[k] ?? (k.length === 1 ? k.toUpperCase() : k);
}

function startListen(index) {
  cancelListen();
  listening = {index};
}

function cancelListen() {
  listening = null;
}

function updateCursor() {
  const onRegion = regions.some(r =>
    mouseX >= r.x && mouseX <= r.x + r.w &&
    mouseY >= r.y && mouseY <= r.y + r.h
  );
  document.body.style.cursor = onRegion ? 'pointer' : 'default';
}

async function openLeaderboard() {
  leaderboardOpen = true;
  leaderboardLoading = true;
  leaderboardData = [];

  await initFirebase();
  leaderboardData = await loadLeaderboard();

  console.log("leaderboardData:", leaderboardData);

  leaderboardLoading = false;
}

function drawLeaderboardOverlay() {
  const e = 1 - Math.pow(1 - leaderboardProgress, 3);
  const popW = min(500, width * 0.94);
  const popH = 420;
  const popX = (width - popW) / 2;
  const popY = (height - popH) / 2;

  push();
  fill(`rgba(2,8,3,${0.82 * e})`);
  noStroke();
  rect(0, 0, width, height);
  pop();

  push();
  translate(width / 2, height / 2);
  scale(0.94 + 0.06 * e);
  translate(-width / 2, -height / 2 + 12 * (1 - e));
  drawingContext.globalAlpha = e;
  drawLeaderboardPanel(popX, popY, popW, popH);
  pop();
}

function drawLeaderboardPanel(x, y, w, h) {
  // background
  push();
  const bgGrad = drawingContext.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, '#0a1c0c');
  bgGrad.addColorStop(0.5, '#071408');
  bgGrad.addColorStop(1, '#0c1e0e');
  drawingContext.fillStyle = bgGrad;
  drawingContext.fill(roundRectPath(x, y, w, h, 10));
  pop();

  // border
  push();
  noFill();
  stroke('rgba(196, 196, 5, 0.74)');
  strokeWeight(1);
  rect(x, y, w, h, 10);
  pop();

  // header
  const headerH = 55;
  const closeX = x + w - 26;
  const closeY = y + headerH / 2;
  const overClose = leaderboardOpen && dist(mouseX, mouseY, closeX, closeY) < 16;

  push();
  stroke('rgba(196, 196, 5, 0.74)');
  strokeWeight(1);
  noFill();
  line(x, y + headerH, x + w, y + headerH);
  pop();

  push();
  drawingContext.shadowBlur = 14;
  drawingContext.shadowColor = 'rgba(96,200,255,0.5)';
  drawingContext.letterSpacing = '0.18em';
  fill('#e8f8ff');
  noStroke();
  textFont("'Cinzel Decorative', serif");
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('Leaderboard', x + 24, y + headerH / 2);
  pop();

  push();
  noStroke();
  if (overClose) {
    fill('rgba(192,40,26,0.15)');
    circle(closeX, closeY, 28);
  }
  fill(overClose ? C.redBright : C.textDim);
  textFont('sans-serif');
  textSize(14);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  text('X', closeX, closeY);
  pop();
  regions.push({id: 'close-leaderboard', x: closeX - 16, y: closeY - 16, w: 32, h: 32});

  // body
  const bodyY = y + headerH + 16;
  const pad = 28;
  const rowH = 48;

  if (leaderboardLoading) {
    push();
    fill(C.textDim);
    noStroke();
    textFont("'Cinzel', serif");
    textSize(11);
    textStyle(ITALIC);
    textAlign(CENTER, CENTER);
    text('Loading scores…', x + w / 2, bodyY + 80);
    pop();
    return;
  }

  if (leaderboardData.length === 0) {
    push();
    fill(C.textDim);
    noStroke();
    textFont("'Cinzel', serif");
    textSize(11);
    textStyle(ITALIC);
    textAlign(CENTER, CENTER);
    text('No scores yet. Be the first!', x + w / 2, bodyY + 80);
    pop();
    return;
  }

  const rankColors = ['#ffd060', '#c0c8d0', '#c87832', C.textDim, C.textDim];
  const rankLabels = ['#1', '#2', '#3', '#4', '#5'];
  const rankGlows  = [
    'rgba(255,208,96,0.18)',
    'rgba(192,200,208,0.12)',
    'rgba(200,120,50,0.12)',
    'transparent',
    'transparent',
  ];

  leaderboardData.forEach((entry, i) => {
    const ry = bodyY + i * rowH;

    if (i < 3) {
      push();
      fill(rankGlows[i]);
      noStroke();
      rect(x + pad - 8, ry, w - pad * 2 + 16, rowH - 4, 4);
      pop();
    }

    if (i > 0) {
      push();
      stroke('rgba(255,255,255,0.05)');
      strokeWeight(1);
      noFill();
      line(x + pad, ry, x + w - pad, ry);
      pop();
    }

    // rank number
    push();
    drawingContext.shadowBlur = i < 3 ? 10 : 0;
    drawingContext.shadowColor = rankColors[i];
    fill(rankColors[i]);
    noStroke();
    drawingContext.letterSpacing = '0.1em';
    textFont("'Cinzel', serif");
    textSize(13);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(rankLabels[i], x + pad, ry + rowH / 2);
    pop();

    // name
    push();
    fill(C.text);
    noStroke();
    drawingContext.letterSpacing = '0.06em';
    textFont("'Cinzel', serif");
    textSize(11);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(entry.name ?? 'Anonymous', x + pad + 36, ry + rowH / 2);
    pop();

    // score
    push();
    drawingContext.shadowBlur = i < 3 ? 8 : 0;
    drawingContext.shadowColor = rankColors[i];
    fill(rankColors[i]);
    noStroke();
    drawingContext.letterSpacing = '0.04em';
    textFont("'Cinzel', serif");
    textSize(13);
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text(entry.score.toLocaleString(), x + w - pad, ry + rowH / 2);
    pop();
  });
}