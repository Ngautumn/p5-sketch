// BGM: "TRACK TITLE"
// Music by Kevin MacLeod (incompetech.com)
// Licensed under Creative Commons: By Attribution 4.0
// https://creativecommons.org/licenses/by/4.0/

let bgm, overlay2D;
let audioReady = false;

let models = {}, loadedCount = 0;

const modelList = ['001','002','003','004','005','006','007','008','009'];
const keyMap = {
  84:'003', // T
  89:'007', // Y
  85:'006', // U
  70:'008', // F
  71:'001', // G
  74:'004', // J
  86:'002', // V
  66:'009', // B
  78:'005'  // N
};

// Blender to p5 
const AX = -Math.PI/2, AZ = Math.PI, EX = 0, EY = 0.25, EZ = 0;

const BASE_SCALE = 1.05;
const SCAR_FLOOR = 0.18, SCAR_UP = 0.006, SCAR_DOWN = 0.0012;
const PIVOT_MAX = 70, PIVOT_LERP = 0.06;
const MOUSE_ROT_X = 0.35, MOUSE_ROT_Y = 0.55;

// Keyboard outline UI
const KEY_UI = [
  // top row: T Y U
  { kc: 84, nx: -1.00, ny: -1.05 }, // T
  { kc: 89, nx:  0.00, ny: -1.05 }, // Y
  { kc: 85, nx:  1.00, ny: -1.05 }, // U

  // middle row: F G  J
  { kc: 70, nx: -1.00, ny:  0.00 }, // F
  { kc: 71, nx: -0.05, ny:  0.00 }, // G
  { kc: 74, nx:  1.15, ny:  0.00 }, // J

  // bottom row: V B N
  { kc: 86, nx: -1.00, ny:  1.05 }, // V
  { kc: 66, nx:  0.00, ny:  1.05 }, // B
  { kc: 78, nx:  1.00, ny:  1.05 }, // N
];

function preload(){
  bgm = loadSound('assets/music.mp3');
}

function setup(){
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  setPerspective();

  overlay2D = createGraphics(windowWidth, windowHeight);

  bgm.setLoop(true);
  bgm.setVolume(0.7);

  for (const id of modelList){
    loadModel(`assets/${id}.obj`, true, (model)=>{
      models[id] = {
        model,
        deform:0, energy:0, scar:SCAR_FLOOR,
        rot:random(TWO_PI), off:random(1000),
        px:0,py:0,pz:0, tx:0,ty:0,tz:0
      };
      loadedCount++;
    });
  }
}

function mousePressed(){ enableAudioOnce(); }
function keyPressed(){ enableAudioOnce(); }

function enableAudioOnce(){
  if (audioReady) return;
  userStartAudio();
  audioReady = true;
}

function draw(){
  const ready = loadedCount === modelList.length;
  const humanAvg = ready ? calcHumanAvg() : 0;

  drawBackground(humanAvg);

  if (!ready){
    drawLoadingBar();
    drawOverlay(); // still draw outline while loading
    return;
  }

  handleMusic();
  setLights(
    humanAvg,
    humanAvg * (0.35 + 0.65 * (sin(frameCount*0.02)*0.5 + 0.5))
  );

  updateModels();

  const mx = mouseX / max(1, width)  * 2 - 1;
  const my = mouseY / max(1, height) * 2 - 1;
  const worldSpin = frameCount * 0.001;

  for (const id in models) drawModel(models[id], mx, my, worldSpin);

  drawOverlay();
}

//logic
function calcHumanAvg(){
  let s = 0;
  for (const id in models) s += max(models[id].energy, models[id].scar);
  return s / modelList.length;
}

function anyKeyDownMapped(){
  for (const kc in keyMap){
    if (keyIsDown(+kc)) return true;
  }
  return false;
}

function handleMusic(){
  if (!audioReady) return;
  const down = anyKeyDownMapped();
  if (down) { if (!bgm.isPlaying()) bgm.play(); }
  else      { if (bgm.isPlaying()) bgm.pause(); }
}

function updateModels(){
  for (const kc in keyMap){
    const id = keyMap[kc];
    const m = models[id];
    if (!m) continue;

    const down = keyIsDown(+kc);

    if (down){
      m.deform = lerp(m.deform, 1, 0.07);
      m.energy = lerp(m.energy, 1, 0.10);
      m.scar   = min(1, m.scar + SCAR_UP);

      const pushAmt = (0.25 + 0.75*m.energy) * (0.6 + 0.4*noise(frameCount*0.02 + m.off));
      m.tx = constrain(m.tx + random(-8,8)*pushAmt, -PIVOT_MAX, PIVOT_MAX);
      m.ty = constrain(m.ty + random(-6,6)*pushAmt, -PIVOT_MAX, PIVOT_MAX);
      m.tz = constrain(m.tz + random(-8,8)*pushAmt, -PIVOT_MAX, PIVOT_MAX);
    }else{
      m.deform = lerp(m.deform, 0, 0.035);
      m.energy = lerp(m.energy, 0, 0.05);
      m.scar   = max(SCAR_FLOOR, m.scar - SCAR_DOWN);

      const ret = 0.02*(1 - m.scar);
      m.tx *= (1-ret); m.ty *= (1-ret); m.tz *= (1-ret);
    }

    m.px = lerp(m.px, m.tx, PIVOT_LERP);
    m.py = lerp(m.py, m.ty, PIVOT_LERP);
    m.pz = lerp(m.pz, m.tz, PIVOT_LERP);
  }
}

//render
function drawBackground(h){
  const cold = { r:55, g:65, b:78 };
  const skin = { r:245, g:235, b:195 };

  background(
    lerp(cold.r, skin.r, h),
    lerp(cold.g, skin.g, h),
    lerp(cold.b, skin.b, h),
    lerp(255, 60, h)
  );
}

function setLights(h, hb){
  ambientLight(lerp(55,115,hb), lerp(65,105,hb), lerp(95,90,hb));
  const dir = lerp(255,210,h);
  directionalLight(dir, dir, dir, 0.3, -1, -0.5);
  const inner = lerp(170,255,h);
  pointLight(inner, inner*0.98, inner*0.95, 0, 0, 600);
}

function drawModel(m, mx, my, worldSpin){
  const t = frameCount*0.01 + m.off;
  const human = max(m.energy, m.scar);
  const localBreath = (sin(t*0.9)*0.5 + 0.5);

  push();

  // align obj axis
  rotateX(AX); rotateZ(AZ);
  rotateX(EX); rotateY(EY); rotateZ(EZ);

  // global spin + mouse
  rotateY(worldSpin + mx*MOUSE_ROT_Y);
  rotateX(my*MOUSE_ROT_X);

  // permodel translation
  translate(m.px, m.py, m.pz);

  // wobble
  rotateY(m.rot + sin(t)*0.25*human);
  rotateX(sin(t*0.7)*(0.06+0.14*m.deform) + human*(0.06+0.10*localBreath));

  // scale
  scale(
    BASE_SCALE *
    (1 + human*(0.02+0.05*localBreath)) *
    (1 + m.deform*noise(t)*0.35 + human*0.22)
  );

  // material
  const r = lerp(215,235,human);
  const g = lerp(220,228,human);
  const b = lerp(230,215,human);
  const lum = 1 + human*(0.08+0.12*localBreath);

  ambientMaterial(r*lum, g*lum, b*lum);
  specularMaterial(lerp(235,175,human));
  shininess(lerp(110,35,human));

  model(m.model);
  pop();
}

function drawLoadingBar(){
  push();
  resetMatrix();
  translate(-width/2, -height/2);

  const w = width*0.3;
  const x = width*0.35;
  const y = height*0.5;

  noStroke();
  fill(200); rect(x, y, w, 6);
  fill(100); rect(x, y, w*(loadedCount/modelList.length), 6);

  pop();
}

//overlay: keyboard outline
function drawOverlay(){
  if (!overlay2D) return;

  overlay2D.clear();
  drawKeyboardOutline(overlay2D);

  push();
  resetMatrix();
  translate(-width/2, -height/2);
  image(overlay2D, 0, 0, width, height);
  pop();
}

function drawKeyboardOutline(g){
  const pressedAlpha = 255; // 100%
  const idleAlpha    = 128; // 50%

  const s = Math.min(g.width, g.height);
  const UI_SCALE = 0.5;

  // sizes
  const keyW   = s * 0.12 * UI_SCALE;
  const keyH   = s * 0.12 * UI_SCALE;
  const gapX   = s * 0.06 * UI_SCALE;
  const gapY   = s * 0.065 * UI_SCALE;
  const corner = Math.max(8, Math.floor(s * 0.018 * UI_SCALE));
  const cx = g.width  * 0.5;
  const cy = g.height * 0.47;
  const idleStrokeW     = 2.2;
  const pressedStrokeW  = 2.8;
  const glowStrokeW     = 7.0;

  g.push();
  g.noFill();
  g.rectMode(CENTER);

  //draw 9 keys
  for (const k of KEY_UI){
    const down = keyIsDown(k.kc);
    const a = down ? pressedAlpha : idleAlpha;

    const x = cx + k.nx * (keyW + gapX);
    const y = cy + k.ny * (keyH + gapY);

    if (down){
      g.stroke(255, 255, 255, 55);
      g.strokeWeight(glowStrokeW);
      g.rect(x, y, keyW, keyH, corner);

      g.stroke(255, 255, 255, a);
      g.strokeWeight(pressedStrokeW);
      g.rect(x, y, keyW, keyH, corner);
    } else {
      g.stroke(255, 255, 255, a);
      g.strokeWeight(idleStrokeW);
      g.rect(x, y, keyW, keyH, corner);
    }
  }

  const spaceDown = keyIsDown(32); // Space key
  const aS = spaceDown ? pressedAlpha : idleAlpha;
  const spaceW = (keyW * 3) + (gapX * 2) + (keyW * 0.55);
  const spaceH = keyH * 0.55;
  const spaceCorner = Math.max(10, corner * 0.9);

  const bottomRowY = cy + 1.05 * (keyH + gapY);
  const spaceY = bottomRowY + keyH * 0.95;
  const spaceX = cx;

  if (spaceDown){
    g.stroke(255, 255, 255, 55);
    g.strokeWeight(glowStrokeW);
    g.rect(spaceX, spaceY, spaceW, spaceH, spaceCorner);

    g.stroke(255, 255, 255, aS);
    g.strokeWeight(pressedStrokeW);
    g.rect(spaceX, spaceY, spaceW, spaceH, spaceCorner);
  } else {
    g.stroke(255, 255, 255, aS);
    g.strokeWeight(idleStrokeW);
    g.rect(spaceX, spaceY, spaceW, spaceH, spaceCorner);
  }

  g.pop();
}


//utils
function setPerspective(){
  perspective(Math.PI/8, width/height, 0.1, 5000);
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  setPerspective();
  overlay2D = createGraphics(windowWidth, windowHeight);
}
