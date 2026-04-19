import * as THREE from 'three';

const canvas = document.getElementById('gl');
if (!canvas) throw new Error('No #gl canvas');

const isMobileViewport = () => window.innerWidth < 720;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobileViewport(),       // MSAA off on phones for fill-rate
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileViewport() ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ---- BACKGROUND gradient ----
const bgScene = new THREE.Scene();
const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const bgUniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uScroll: { value: 0 },
  uFlash: { value: 0 },
};
const bgFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uScroll;
  uniform float uFlash;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }
  void main(){
    vec2 uv = vUv;
    vec2 p = uv - 0.5;
    p.x *= uRes.x / uRes.y;
    float t = uTime * 0.04;
    float n = fbm(p * 2.0 + vec2(t, -t*0.7));
    vec3 base = vec3(0.012, 0.012, 0.022);
    vec3 glow1 = vec3(0.22, 0.1, 0.55);
    vec3 glow2 = vec3(0.55, 0.35, 0.05);
    float v = smoothstep(0.95, 0.0, length(p));
    vec3 col = mix(base, glow1 * 0.55, n * (1.0 - v) * 0.7);
    col += glow2 * smoothstep(0.5, 0.0, length(p)) * 0.08;
    col += base;
    float g = fract(sin(dot(uv * uRes, vec2(12.9898, 78.233))) * 43758.5453);
    col += (g - 0.5) * 0.025;
    col += vec3(1.0) * uFlash;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const bgMat = new THREE.ShaderMaterial({
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
  fragmentShader: bgFrag,
  uniforms: bgUniforms,
  depthTest: false,
  depthWrite: false,
});
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

// ---- COIN FACE TEXTURE (canvas-drawn) ----
function makeFaceTexture(mainText, subText) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');

  // Gold radial fill
  const grad = ctx.createRadialGradient(420, 360, 20, 512, 512, 600);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(0.4, '#ffcc45');
  grad.addColorStop(0.8, '#d69400');
  grad.addColorStop(1, '#6f4d00');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(512, 512, 512, 0, Math.PI * 2); ctx.fill();

  // Outer bevel shadow
  const bevel = ctx.createRadialGradient(512, 512, 460, 512, 512, 512);
  bevel.addColorStop(0, 'rgba(0,0,0,0)');
  bevel.addColorStop(1, 'rgba(30, 18, 0, 0.75)');
  ctx.fillStyle = bevel;
  ctx.beginPath(); ctx.arc(512, 512, 512, 0, Math.PI * 2); ctx.fill();

  // Top-left highlight swoosh
  const hi = ctx.createLinearGradient(0, 0, 1024, 1024);
  hi.addColorStop(0, 'rgba(255,250,220,0.25)');
  hi.addColorStop(0.5, 'rgba(255,250,220,0)');
  ctx.fillStyle = hi;
  ctx.beginPath(); ctx.arc(512, 512, 480, 0, Math.PI * 2); ctx.fill();

  // Inner border ring
  ctx.strokeStyle = 'rgba(40, 25, 0, 0.75)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(512, 512, 430, 0, Math.PI * 2); ctx.stroke();

  // Beaded edge
  ctx.fillStyle = 'rgba(30, 18, 0, 0.7)';
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    const x = 512 + Math.cos(a) * 408;
    const y = 512 + Math.sin(a) * 408;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // Main text (embossed)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 380px "Inter", "Arial Black", sans-serif';

  // shadow
  ctx.fillStyle = 'rgba(25, 14, 0, 0.5)';
  ctx.fillText(mainText, 518, 528);
  // main fill (dark engrave)
  ctx.fillStyle = '#241400';
  ctx.fillText(mainText, 512, 520);
  // highlight (top-left glow)
  ctx.fillStyle = 'rgba(255, 242, 180, 0.28)';
  ctx.fillText(mainText, 507, 513);

  // Subtext (top arc + bottom arc simplified as straight)
  if (subText) {
    ctx.font = '700 42px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(40, 26, 0, 0.8)';
    ctx.fillText(subText, 512, 220);
    ctx.fillText(subText, 512, 820);
    ctx.font = '30px "Inter", sans-serif';
    ctx.fillText('★  ★  ★', 512, 275);
    ctx.fillText('★  ★  ★', 512, 765);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

// ---- HERO SCENE ----
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 0, 6);

// Coin group
const coin = new THREE.Group();
scene.add(coin);

const R = 1.45;
const T = 0.13;

// Body cylinder — gold metallic
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0xffc940,
  metalness: 0.96,
  roughness: 0.2,
});
const body = new THREE.Mesh(
  new THREE.CylinderGeometry(R, R, T, 96, 1, false),
  bodyMat
);
body.rotation.x = Math.PI / 2; // lay on its side so flat face aims at camera
coin.add(body);

// Edge ridges — two small torus rings at each face edge (adds depth on rotation)
const ridgeMat = new THREE.MeshStandardMaterial({
  color: 0x6b4400,
  metalness: 0.85,
  roughness: 0.35,
});
const ridgeTop = new THREE.Mesh(new THREE.TorusGeometry(R, 0.008, 10, 96), ridgeMat);
ridgeTop.position.z = T / 2;
coin.add(ridgeTop);
const ridgeBot = ridgeTop.clone();
ridgeBot.position.z = -T / 2;
coin.add(ridgeBot);

// Front face
let frontTex, backTex;
const frontMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  metalness: 0.6,
  roughness: 0.32,
});
const backMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  metalness: 0.6,
  roughness: 0.32,
});
const frontFace = new THREE.Mesh(new THREE.CircleGeometry(R - 0.02, 96), frontMat);
frontFace.position.z = T / 2 + 0.001;
coin.add(frontFace);

const backFace = new THREE.Mesh(new THREE.CircleGeometry(R - 0.02, 96), backMat);
backFace.position.z = -T / 2 - 0.001;
backFace.rotation.y = Math.PI;
coin.add(backFace);

// Build the textures (delayed until fonts are ready for nicer glyphs)
const buildFaceTextures = () => {
  frontTex = makeFaceTexture('DH', 'DHAMODHARAN M');
  backTex = makeFaceTexture('DH', 'BUILDS · SHIPS · SCALES');
  frontMat.map = frontTex;
  backMat.map = backTex;
  frontMat.needsUpdate = true;
  backMat.needsUpdate = true;
};
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(buildFaceTextures).catch(buildFaceTextures);
  // also build once immediately with fallback font so it's never blank
  buildFaceTextures();
} else {
  buildFaceTextures();
}

// Soft back glow behind coin
const glowMat = new THREE.MeshBasicMaterial({
  color: 0xffd85a,
  transparent: true,
  opacity: 0.14,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const glow = new THREE.Mesh(new THREE.CircleGeometry(R * 2.4, 64), glowMat);
glow.position.z = -0.5;
scene.add(glow);

// ---- LIGHTING ----
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
keyLight.position.set(4, 7, 8);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xa080ff, 0.7);
rimLight.position.set(-4, 2, -5);
scene.add(rimLight);
const fillLight = new THREE.PointLight(0xffe43e, 3, 15);
fillLight.position.set(2, 2, 4);
scene.add(fillLight);

// ---- PHASE & INPUT ----
let phase = 'loading'; // 'loading' | 'landing' | 'hero'
const clock = new THREE.Clock();

const mouse = new THREE.Vector2();
const mouseTarget = new THREE.Vector2();
window.addEventListener('pointermove', (e) => {
  mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
}, { passive: true });

let scrollY = 0;
window.addEventListener('scroll', () => {
  const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
  scrollY = window.scrollY / max;
}, { passive: true });

// ---- RESIZE ----
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  bgUniforms.uRes.value.set(w, h);
}
window.addEventListener('resize', onResize);

// ---- COIN LAND: orchestrated via GSAP ----
window.coinLand = () => {
  if (phase !== 'loading' || !window.gsap) { phase = 'hero'; return; }
  phase = 'landing';

  // Normalize Y rotation so we settle on an even 2π boundary (face-forward)
  const curY = coin.rotation.y;
  const fullSpins = 2; // two extra spins while settling
  const targetY = curY + (Math.PI * 2 * fullSpins) + (Math.PI * 2 - (curY % (Math.PI * 2)));

  const isDesktop = window.innerWidth > 900;
  const heroPos = isDesktop ? { x: 1.45, y: 0.35 } : { x: 0, y: 0.6 };
  const heroScale = isDesktop ? 0.7 : 0.55;

  const tl = window.gsap.timeline({ onComplete: () => { phase = 'hero'; } });

  // Spin settle + correction
  tl.to(coin.rotation, {
    x: 0, z: 0, y: targetY,
    duration: 1.05, ease: 'power4.out',
  }, 0);

  // Mid-flight camera punch
  tl.to(camera.position, {
    y: -0.05,
    duration: 0.08,
    ease: 'power3.out',
    yoyo: true,
    repeat: 1,
  }, 0.96);

  // Impact — squish z (coin flattens), bloom glow, white flash
  tl.to(coin.scale, {
    x: 1.22, y: 1.22, z: 0.6,
    duration: 0.1, ease: 'power2.out',
  }, 1.0)
    .to(coin.scale, {
      x: 1, y: 1, z: 1,
      duration: 0.55, ease: 'elastic.out(1, 0.45)',
    }, 1.1);

  tl.to(glow.material, { opacity: 0.8, duration: 0.08 }, 1.0)
    .to(glow.material, { opacity: 0.14, duration: 0.7 }, 1.08);

  tl.to(bgUniforms.uFlash, { value: 0.35, duration: 0.06 }, 1.0)
    .to(bgUniforms.uFlash, { value: 0.0, duration: 0.45 }, 1.06);

  // Settle into hero position
  tl.to(coin.position, {
    x: heroPos.x, y: heroPos.y,
    duration: 1.0, ease: 'power3.inOut',
  }, 1.5)
    .to(coin.scale, {
      x: heroScale, y: heroScale, z: heroScale,
      duration: 1.0, ease: 'power3.inOut',
    }, 1.5);
};

// ---- RENDER LOOP ----
let running = true;
document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  if (running) clock.start(); else clock.stop();
});

const render = () => {
  requestAnimationFrame(render);
  if (!running) return;
  const t = clock.getElapsedTime();

  mouse.x += (mouseTarget.x - mouse.x) * 0.055;
  mouse.y += (mouseTarget.y - mouse.y) * 0.055;

  bgUniforms.uTime.value = t;
  bgUniforms.uScroll.value += (scrollY - bgUniforms.uScroll.value) * 0.05;

  if (phase === 'loading') {
    // Fast tumbling spin
    coin.rotation.x = t * 4.5;
    coin.rotation.y = t * 6.8;
    coin.rotation.z = Math.sin(t * 2.8) * 0.18;
    coin.position.y = Math.sin(t * 5.5) * 0.12;
    coin.position.x = 0;
    glow.material.opacity = 0.14 + Math.sin(t * 3.5) * 0.06;
  } else if (phase === 'hero') {
    // Gentle rotation + mouse parallax
    coin.rotation.y += 0.007;
    coin.rotation.x = mouse.y * 0.18;
    coin.rotation.z = mouse.x * 0.06;

    const isDesktop = window.innerWidth > 900;
    const baseX = isDesktop ? 1.45 : 0;
    const baseY = isDesktop ? 0.35 : 0.6;
    coin.position.x = baseX + mouse.x * 0.25;
    coin.position.y = baseY + Math.sin(t * 1.2) * 0.045 + mouse.y * 0.09 - scrollY * 0.8;

    // Shrink slightly on scroll
    const baseScale = isDesktop ? 0.7 : 0.55;
    const s = baseScale * (1 - Math.min(scrollY * 0.4, 0.3));
    coin.scale.setScalar(s);
  }
  // phase === 'landing' → GSAP driving, we don't touch here

  // Glow tracks coin
  glow.position.x = coin.position.x;
  glow.position.y = coin.position.y;
  glow.position.z = coin.position.z - 0.5;
  glow.scale.setScalar(coin.scale.x);

  // Camera parallax
  camera.position.x += (mouse.x * 0.25 - camera.position.x) * 0.03;
  camera.lookAt(coin.position.x * 0.3, coin.position.y * 0.3, 0);

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(bgScene, bgCamera);
  renderer.render(scene, camera);
};
render();

window.__glReady = true;
