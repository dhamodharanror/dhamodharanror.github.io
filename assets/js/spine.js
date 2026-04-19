import * as THREE from 'three';

const canvas = document.getElementById('spineCanvas');
const carousel = document.getElementById('carousel');
if (canvas && carousel) {
  const isMobileSpine = window.innerWidth < 720;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobileSpine,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileSpine ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08070c, 0.045);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);

  // ---- CONSTANTS ----
  const WCOUNT = 8;
  const HALF_ANGLE = Math.PI / WCOUNT;
  const R = 1.7;

  // Phase timeline (fractions of scroll progress):
  //   0.00 – 0.08  drill descends
  //   0.08 – 0.18  pierce + explosion / break
  //   0.18 – 0.80  cycle through 8 scattered fragments
  //   0.80 – 0.94  REJOIN — fragments fly back, reform the coin
  //   0.94 – 1.00  hold on the reformed intact coin
  const P_DRILL_START    = 0.00;
  const P_DRILL_PIERCE   = 0.08;
  const P_SPLIT_COMPLETE = 0.18;
  const P_CYCLE_END      = 0.80;
  const P_REJOIN_END     = 0.94;

  const ZOOM_IN_T  = 0.22;
  const HOLD_END_T = 0.78;

  window.__spineConfig = {
    mode: 'wedge',
    WCOUNT,
    P_DRILL_PIERCE,
    P_SPLIT_COMPLETE,
    P_CYCLE_END,
    P_REJOIN_END,
  };

  // ---- CONTENT for each fragment (kept short so it fits the tapered shape) ----
  const WEDGE_DATA = [
    { num: '01', tag: 'ARCHITECTURE', title: 'Multi-tenant\nsystems.', bullets: [
      'Schema-per-tenant',
      'Auto tenant context',
      'Scoped background jobs',
      'Zero cross-exposure',
    ]},
    { num: '02', tag: 'CRAFT', title: 'Clean code.', bullets: [
      'Repository pattern',
      'Service objects',
      'Shared concerns',
      'Refactor when stable',
    ]},
    { num: '03', tag: 'INTEGRATIONS', title: 'Integrate\nanything.', bullets: [
      'Slack + OAuth bot',
      'MS Teams cards',
      'HRIS: 6+ providers',
      'SAML SSO, 2FA',
    ]},
    { num: '04', tag: 'INFRASTRUCTURE', title: 'Systems\n+ infra.', bullets: [
      'AWS S3, Lambda',
      'Docker, Capistrano',
      'CI/CD pipelines',
      'Elasticsearch at scale',
    ]},
    { num: '05', tag: 'PERFORMANCE', title: 'Built for\nperformance.', bullets: [
      'ES + ClickHouse',
      'Real-time search',
      '5-min analytics ingest',
      'Reports cut hard',
    ]},
    { num: '06', tag: 'WRITING', title: 'Writing\n= thinking.', bullets: [
      'One focused shift',
      '5 yrs of real data',
      'Slack > email',
    ]},
    { num: '07', tag: 'FRAMEWORK', title: 'Extending\nRails.', bullets: [
      'Grape API',
      'Provider factories',
      'Tenant-aware jobs',
      'Feature flag arch',
    ]},
    { num: '08', tag: 'PRINCIPLES', title: 'Opinions,\nweakly held.', bullets: [
      'Rails is productive',
      'Boring > clever',
      'Isolation = sleep',
      'Ship good-enough',
    ]},
  ];

  // ---- CONTENT CANVAS ----
  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function makeContentCanvas(d) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext('2d');

    // --- Gold base (shows along pie-slice edges) ---
    const grad = ctx.createRadialGradient(512, 1024, 140, 512, 0, 1100);
    grad.addColorStop(0, '#fff4b8');
    grad.addColorStop(0.45, '#ffcd40');
    grad.addColorStop(1, '#7b4d08');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const sheen = ctx.createLinearGradient(0, 0, 1024, 1024);
    sheen.addColorStop(0, 'rgba(255,255,220,0.38)');
    sheen.addColorStop(0.35, 'rgba(255,255,220,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, 1024, 1024);

    // --- DARK ENGRAVED PANEL — tapered trapezoid matching the pie-slice taper ---
    // Pie-slice canvas width ≈ 1.085 × (1024 - y)px at each y. We inset ~20%.
    // Top edge (y=80):  pie width ≈ 1023 → panel 800 wide → x 112..912
    // Bottom edge (y=880): pie width ≈ 156 → panel 130 wide → x 447..577
    ctx.fillStyle = 'rgba(15, 8, 0, 0.88)';
    ctx.beginPath();
    ctx.moveTo(112, 80);
    ctx.lineTo(912, 80);
    ctx.lineTo(577, 880);
    ctx.lineTo(447, 880);
    ctx.closePath();
    ctx.fill();

    // Gold border
    ctx.strokeStyle = 'rgba(255, 210, 100, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // --- TAG (top of panel, widest area) ---
    ctx.font = '800 54px Inter, "Arial Black", sans-serif';
    ctx.fillStyle = '#ffce4a';
    ctx.fillText(d.tag, 512, 140);

    // divider
    ctx.strokeStyle = 'rgba(255, 200, 71, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(220, 205);
    ctx.lineTo(804, 205);
    ctx.stroke();

    // --- NUMBER (huge, centered) ---
    ctx.font = 'bold 250px Inter, "Arial Black", sans-serif';
    ctx.fillStyle = '#fff3b0';
    ctx.fillText(d.num, 512, 360);

    // --- TITLE ---
    ctx.font = '800 58px Inter, "Arial Black", sans-serif';
    ctx.fillStyle = '#ffe484';
    const titleLines = d.title.split('\n').flatMap(line => wrapText(ctx, line, 540));
    let ty = 530;
    titleLines.forEach((line) => {
      ctx.fillText(line, 512, ty);
      ty += 62;
    });

    // accent dot separator
    ctx.fillStyle = 'rgba(255, 200, 71, 0.7)';
    ctx.beginPath();
    ctx.arc(512, ty + 20, 4, 0, Math.PI * 2);
    ctx.fill();

    // --- BULLETS (light color, narrower as we go down) ---
    ctx.font = '700 32px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 240, 195, 0.95)';
    let by = ty + 60;
    for (const bullet of d.bullets) {
      // panel half-width at canvas y: linearly tapers from 400 at y=80 to 65 at y=880
      const panelHalfWidth = 400 - (by - 80) * ((400 - 65) / (880 - 80));
      const maxW = Math.max(150, panelHalfWidth * 2 - 40);
      const lines = wrapText(ctx, bullet, maxW);
      for (const line of lines) {
        if (by > 870) break;
        ctx.fillText(line, 512, by);
        by += 38;
      }
    }

    return c;
  }

  // ---- WEDGE SHAPE (pie-slice, apex at origin, fan +Y) ----
  function makeWedgeShape(radius, halfAngle) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.absarc(0, 0, radius, Math.PI / 2 - halfAngle, Math.PI / 2 + halfAngle, false);
    s.lineTo(0, 0);
    return s;
  }

  const shape = makeWedgeShape(R, HALF_ANGLE);
  const wedgeGeom = new THREE.ShapeGeometry(shape, 24);

  // ShapeGeometry in three.js writes RAW vertex positions into UVs (not 0..1).
  // Our content would be clamped off-screen. Normalize them to the shape's
  // bounding box so the canvas content maps across the pie-slice correctly.
  (function normalizeUVs(geom) {
    const pos = geom.attributes.position;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const sx = (maxX - minX) || 1;
    const sy = (maxY - minY) || 1;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2]     = (pos.getX(i) - minX) / sx;
      uvs[i * 2 + 1] = (pos.getY(i) - minY) / sy;
    }
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  })(wedgeGeom);

  // ---- FRAGMENT TARGETS ----
  // Each fragment scatters along its own natural direction (roughly along its bisector)
  // with unique rotation tilts and spin-counts for tumbling
  const FRAG = [
    { offset: new THREE.Vector3( 0.0,  3.9, -0.8), rotEnd: new THREE.Euler( 0.18, -0.22,  0.10), spin: [ 2, -1,  1] },
    { offset: new THREE.Vector3( 3.0,  2.9, -2.2), rotEnd: new THREE.Euler(-0.22,  0.28,  0.18), spin: [-2,  1, -1.2] },
    { offset: new THREE.Vector3( 4.2,  0.2, -1.3), rotEnd: new THREE.Euler( 0.28,  0.18, -0.15), spin: [ 1.5, -1.5,  2] },
    { offset: new THREE.Vector3( 3.0, -2.7, -2.5), rotEnd: new THREE.Euler(-0.14, -0.26,  0.22), spin: [-1.5,  2, -1] },
    { offset: new THREE.Vector3(-0.2, -3.9, -1.0), rotEnd: new THREE.Euler( 0.30,  0.20, -0.10), spin: [ 2, -1.5,  1.5] },
    { offset: new THREE.Vector3(-3.1, -2.7, -2.3), rotEnd: new THREE.Euler(-0.25, -0.18,  0.16), spin: [-2,  1, -1.5] },
    { offset: new THREE.Vector3(-4.0,  0.3, -1.6), rotEnd: new THREE.Euler( 0.22, -0.28, -0.18), spin: [ 1.5, -1,  2] },
    { offset: new THREE.Vector3(-2.9,  2.8, -2.8), rotEnd: new THREE.Euler(-0.18,  0.22,  0.24), spin: [-1.5,  2, -1] },
  ];

  // ---- WEDGES ----
  const wedges = [];
  for (let i = 0; i < WCOUNT; i++) {
    const group = new THREE.Group();

    const tex = new THREE.CanvasTexture(makeContentCanvas(WEDGE_DATA[i]));
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,            // glow follows the texture, text stays dark
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0,         // ramped up per-frame when active
      metalness: 0.25,
      roughness: 0.48,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(wedgeGeom, mat);
    group.add(mesh);

    // Angular position in the coin — rotation.z = -i * 2 * HALF_ANGLE
    // (negative = clockwise order starting from top)
    const baseAngleZ = -i * 2 * HALF_ANGLE;

    group.userData = {
      index: i,
      material: mat,
      baseAngleZ,
    };
    // Initial orientation in the intact coin
    group.rotation.z = baseAngleZ;
    scene.add(group);
    wedges.push(group);
  }

  // Dark backing disc so the back of the flat wedges isn't see-through when camera orbits
  const backingMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a, metalness: 0.4, roughness: 0.8,
  });
  const backing = new THREE.Mesh(new THREE.CircleGeometry(R + 0.02, 64), backingMat);
  backing.position.z = -0.01;
  scene.add(backing);

  // Coin glow (fades when broken)
  const coinGlow = new THREE.Mesh(
    new THREE.CircleGeometry(R * 2.4, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffd148, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  coinGlow.position.z = -0.4;
  scene.add(coinGlow);

  // Pierce shock
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c0, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const shock = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), shockMat);
  shock.position.z = 0.6;
  scene.add(shock);

  // ---- DRILL ----
  const drillGroup = new THREE.Group();
  scene.add(drillGroup);

  const drillTipMat = new THREE.MeshStandardMaterial({
    color: 0xffd640, metalness: 0.9, roughness: 0.15,
    emissive: 0xff8800, emissiveIntensity: 0.55, transparent: true,
  });
  const drillTip = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.4, 18), drillTipMat);
  drillTip.rotation.x = Math.PI;
  drillTip.position.y = 0.7;
  drillGroup.add(drillTip);

  const drillShaftMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc, metalness: 0.85, roughness: 0.25, transparent: true,
  });
  const drillShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 1.8, 20),
    drillShaftMat
  );
  drillShaft.position.y = 2.2;
  drillGroup.add(drillShaft);

  // ---- LIGHTS ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.38));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(5, 8, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9f80ff, 0.65);
  rim.position.set(-5, -2, -4);
  scene.add(rim);
  const pt = new THREE.PointLight(0xffc140, 3, 18);
  pt.position.set(0, 0, 4);
  scene.add(pt);

  // ---- CAMERA POINTS (adapt to aspect — portrait needs more distance) ----
  const CAM_COIN = { pos: new THREE.Vector3(0, 0, 5.5),  look: new THREE.Vector3(0, 0, 0) };
  const CAM_WIDE = { pos: new THREE.Vector3(0, 0, 11.5), look: new THREE.Vector3(0, 0, -1) };

  function updateCamAnchors() {
    const aspect = window.innerWidth / window.innerHeight;
    // Portrait viewports (phones) need more distance so side fragments don't clip
    if (aspect < 0.8) {
      CAM_COIN.pos.z = 7.5;
      CAM_WIDE.pos.z = 16;
    } else if (aspect < 1.0) {
      CAM_COIN.pos.z = 6.5;
      CAM_WIDE.pos.z = 13.5;
    } else {
      CAM_COIN.pos.z = 5.5;
      CAM_WIDE.pos.z = 11.5;
    }
  }
  updateCamAnchors();

  function getZoomInCam(i) {
    const f = FRAG[i];
    const aspect = window.innerWidth / window.innerHeight;
    // Pull camera a bit further on portrait so wedge still fits vertically
    const zoomDist = aspect < 0.8 ? 3.4 : aspect < 1.0 ? 3.0 : 2.8;
    return {
      pos: new THREE.Vector3(f.offset.x, f.offset.y, f.offset.z + zoomDist),
      look: f.offset.clone(),
    };
  }

  // ---- RESIZE ----
  const onResize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateCamAnchors();
  };
  window.addEventListener('resize', onResize);
  onResize();

  // ---- VISIBILITY ----
  let visible = false;
  new IntersectionObserver((es) => {
    es.forEach(e => { visible = e.isIntersecting; });
  }, { threshold: 0.01 }).observe(carousel);

  // ---- SCROLL ----
  let scrollP = 0;
  let smoothP = 0;
  window.spineSetScroll = (p) => { scrollP = p; };

  // ---- HELPERS ----
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  const smoothstep = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const easeInOutCubic = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  // ---- LOOP ----
  const clock = new THREE.Clock();
  const camPosSmooth = CAM_COIN.pos.clone();
  const camLookSmooth = CAM_COIN.look.clone();
  const tmpV = new THREE.Vector3();
  const tmpL = new THREE.Vector3();
  const ORIGIN = new THREE.Vector3(0, 0, 0);

  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    smoothP += (scrollP - smoothP) * 0.12;

    // DRILL
    const drillDescend = smoothstep(P_DRILL_START, P_DRILL_PIERCE, smoothP);
    drillGroup.position.y = lerp(6.5, 0.3, drillDescend);
    drillGroup.rotation.y = t * 16;
    const drillFade = 1 - smoothstep(P_DRILL_PIERCE, P_DRILL_PIERCE + 0.04, smoothP);
    drillTipMat.opacity = drillFade;
    drillShaftMat.opacity = drillFade;

    // SHOCK
    const shockRise = smoothstep(P_DRILL_PIERCE - 0.01, P_DRILL_PIERCE, smoothP);
    const shockFall = smoothstep(P_DRILL_PIERCE, P_DRILL_PIERCE + 0.06, smoothP);
    const shockP = shockRise * (1 - shockFall);
    shockMat.opacity = shockP * 0.85;
    shock.scale.setScalar(1 + (1 - shockP) * 2.0);

    // BREAK / REJOIN progress
    const breakP  = smoothstep(P_DRILL_PIERCE, P_SPLIT_COMPLETE, smoothP);
    const rejoinP = smoothstep(P_CYCLE_END, P_REJOIN_END, smoothP);
    // "scattered" = 1 when fully broken, 0 when intact
    const scattered = Math.max(0, breakP - rejoinP);

    // CYCLE
    let activeIdx = -1;
    let localT = 0;
    if (smoothP >= P_SPLIT_COMPLETE && smoothP <= P_CYCLE_END) {
      const cycleT = (smoothP - P_SPLIT_COMPLETE) / (P_CYCLE_END - P_SPLIT_COMPLETE);
      const step = cycleT * WCOUNT;
      activeIdx = Math.max(0, Math.min(WCOUNT - 1, Math.floor(step)));
      localT = Math.max(0, Math.min(1, step - activeIdx));
    }

    // Hold presence
    let holdPresence = 0;
    if (activeIdx !== -1) {
      if (localT < ZOOM_IN_T) {
        holdPresence = easeInOutCubic(localT / ZOOM_IN_T);
      } else if (localT < HOLD_END_T) {
        holdPresence = 1;
      } else {
        holdPresence = 1 - easeInOutCubic((localT - HOLD_END_T) / (1 - HOLD_END_T));
      }
    }

    // UPDATE WEDGES
    wedges.forEach((wedge, i) => {
      const f = FRAG[i];
      const baseAngleZ = wedge.userData.baseAngleZ;

      if (scattered <= 0) {
        // Fully assembled (before drill pierce OR after rejoin complete)
        wedge.position.set(0, 0, 0);
        wedge.rotation.set(0, 0, baseAngleZ);
      } else {
        // Position interpolates between ORIGIN ↔ f.offset based on `scattered`
        wedge.position.lerpVectors(ORIGIN, f.offset, scattered);

        const spinX = f.spin[0] * Math.PI * 2;
        const spinY = f.spin[1] * Math.PI * 2;
        const spinZ = f.spin[2] * Math.PI * 2;

        if (rejoinP > 0) {
          // REJOINING: from scattered rest pose back to (0, 0, baseAngleZ)
          // with REVERSE spin so pieces tumble the other way as they converge.
          wedge.rotation.x = lerp(f.rotEnd.x - spinX,                0, rejoinP);
          wedge.rotation.y = lerp(f.rotEnd.y - spinY,                0, rejoinP);
          wedge.rotation.z = lerp(f.rotEnd.z - spinZ,                baseAngleZ, rejoinP);
        } else {
          // BREAKING: tumble from assembled to scattered
          wedge.rotation.x = lerp(0,          f.rotEnd.x + spinX, breakP);
          wedge.rotation.y = lerp(0,          f.rotEnd.y + spinY, breakP);
          wedge.rotation.z = lerp(baseAngleZ, f.rotEnd.z + spinZ, breakP);

          if (breakP > 0.99) {
            // gentle drift during scattered-rest / cycle phase
            wedge.rotation.x = f.rotEnd.x + Math.sin(t * 0.5 + i) * 0.04;
            wedge.rotation.y = f.rotEnd.y + Math.cos(t * 0.4 + i * 1.3) * 0.05;
            wedge.rotation.z = f.rotEnd.z + Math.sin(t * 0.3 + i * 0.7) * 0.03;
          }
        }
      }

      // Emissive glow (follows texture via emissiveMap, so content lights up)
      const mat = wedge.userData.material;
      if (i === activeIdx) {
        mat.emissiveIntensity = lerp(0, 0.9, holdPresence);
      } else {
        // keep a small ambient glow so bullets remain readable from the wide shot
        mat.emissiveIntensity = lerp(0.15, 0, holdPresence);
      }
    });

    // Backing visible when coin is assembled (before break OR after rejoin)
    const assembled = 1 - scattered;
    backingMat.transparent = true;
    backingMat.opacity = assembled;
    backing.visible = assembled > 0.01;

    // Coin glow tracks assembly + extra flare pulse at rejoin completion
    const reformFlare = smoothstep(P_REJOIN_END - 0.05, P_REJOIN_END, smoothP)
                      * (1 - smoothstep(P_REJOIN_END, P_REJOIN_END + 0.05, smoothP));
    coinGlow.material.opacity = 0.15 * assembled + reformFlare * 0.7;

    // CAMERA
    let camTarget;
    if (smoothP < P_DRILL_PIERCE) {
      camTarget = CAM_COIN;
    } else if (smoothP < P_SPLIT_COMPLETE) {
      const t2 = smoothstep(P_DRILL_PIERCE, P_SPLIT_COMPLETE, smoothP);
      tmpV.lerpVectors(CAM_COIN.pos, CAM_WIDE.pos, t2);
      tmpL.lerpVectors(CAM_COIN.look, CAM_WIDE.look, t2);
      camTarget = { pos: tmpV, look: tmpL };
    } else if (activeIdx !== -1) {
      const zi = getZoomInCam(activeIdx);
      if (localT < ZOOM_IN_T) {
        const t2 = easeInOutCubic(localT / ZOOM_IN_T);
        tmpV.lerpVectors(CAM_WIDE.pos, zi.pos, t2);
        tmpL.lerpVectors(CAM_WIDE.look, zi.look, t2);
        camTarget = { pos: tmpV, look: tmpL };
      } else if (localT < HOLD_END_T) {
        const holdT = (localT - ZOOM_IN_T) / (HOLD_END_T - ZOOM_IN_T);
        const drift = 0.18 * Math.sin(holdT * Math.PI);
        tmpV.copy(zi.pos);
        tmpV.x += drift;
        tmpV.y += drift * 0.4;
        tmpL.copy(zi.look);
        camTarget = { pos: tmpV, look: tmpL };
      } else {
        const t2 = easeInOutCubic((localT - HOLD_END_T) / (1 - HOLD_END_T));
        tmpV.lerpVectors(zi.pos, CAM_WIDE.pos, t2);
        tmpL.lerpVectors(zi.look, CAM_WIDE.look, t2);
        camTarget = { pos: tmpV, look: tmpL };
      }
    } else if (smoothP < P_REJOIN_END) {
      // REJOIN — camera pushes back in from WIDE to CAM_COIN while pieces converge
      const rj = smoothstep(P_CYCLE_END, P_REJOIN_END, smoothP);
      tmpV.lerpVectors(CAM_WIDE.pos, CAM_COIN.pos, rj);
      tmpL.lerpVectors(CAM_WIDE.look, CAM_COIN.look, rj);
      camTarget = { pos: tmpV, look: tmpL };
    } else {
      // Final hold — close-up on the reformed coin
      camTarget = CAM_COIN;
    }

    camPosSmooth.lerp(camTarget.pos, 0.14);
    camLookSmooth.lerp(camTarget.look, 0.14);
    camera.position.copy(camPosSmooth);

    const jitter = holdPresence * 0.012;
    camera.position.x += Math.sin(t * 1.7) * jitter;
    camera.position.y += Math.cos(t * 1.3) * jitter;
    camera.lookAt(camLookSmooth);

    renderer.render(scene, camera);
  };
  tick();
}
