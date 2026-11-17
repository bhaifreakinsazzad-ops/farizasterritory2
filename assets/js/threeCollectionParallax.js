/**
 * Fariza's Territory — Three.js 3D Collection Card Parallax Engine
 * Library: Three.js (r128+)
 * Architecture: Single Scissored WebGLRenderer inside .col-grid-8 + Synchronized Multi-Plane DOM Depth Parallax
 * Features:
 *   - Curved Jamdani silk-linen PBR backing plane with procedural weave texture & feathered alpha vignette
 *   - Multi-part Heritage Brass Medallion & accent enamel filigree rotating at mid-depth parallax
 *   - Foreground Zari gold dust motes shifting with cursor velocity
 *   - Raycasted dynamic cursor PointLight casting warm specular gleam across curved silk & brass
 *   - Frame-rate-independent exponential damping (THREE.MathUtils.damp) & on-demand render wake/sleep
 *   - Synchronized staggered Z-depth DOM parallax (.cc-num, .cc-name, .cc-thumbs, .cc-go)
 */

(function (window, document) {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHoverDevice = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  const isSoftwareGl = (() => {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      const loseExt = gl.getExtension('WEBGL_lose_context');
      if (loseExt) loseExt.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch (_) {
      return false;
    }
  })();

  function damp(current, target, lambda, delta) {
    if (typeof THREE !== 'undefined' && THREE.MathUtils && THREE.MathUtils.damp) {
      return THREE.MathUtils.damp(current, target, lambda, delta);
    }
    return current + (target - current) * (1 - Math.exp(-lambda * delta));
  }

  function applyTextureColorSpace(tex) {
    if (!tex || typeof THREE === 'undefined') return;
    if ('SRGBColorSpace' in THREE) {
      tex.colorSpace = THREE.SRGBColorSpace;
    } else if ('sRGBEncoding' in THREE) {
      tex.encoding = THREE.sRGBEncoding;
    }
  }

  class ThreeCollectionParallax {
    constructor(gridSelector) {
      this.grid = typeof gridSelector === 'string' ? document.querySelector(gridSelector) : gridSelector;
      if (!this.grid) return;

      this.cards = Array.from(this.grid.querySelectorAll('.col-card'));
      if (!this.cards.length) return;

      if (prefersReducedMotion || noHoverDevice || typeof THREE === 'undefined' || !this.isWebGLAvailable()) {
        return;
      }

      this.canvas = null;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.envMap = null;
      this.silkTexture = null;
      this.particleTexture = null;
      this.hoverLight = null;
      this.sharedGeometries = [];
      this.disposableMaterials = [];
      this.cardStates = [];

      this.clock = new THREE.Clock();
      this.raycaster = new THREE.Raycaster();
      this._ndc = new THREE.Vector2(0, 0);
      this._hitVec = new THREE.Vector3();
      this._colorHelper = new THREE.Color();
      this._creamColor = new THREE.Color(0xFFF7E8);

      this.isVisible = true;
      this.isActive = false;
      this.contextLost = false;
      this.frameId = null;
      this.softwareTimerId = null;
      this.needsStaticDraw = true;

      this.gridWidth = 0;
      this.gridHeight = 0;
      this.resizeObserver = null;
      this.intersectionObserver = null;
      this.cleanupFns = [];

      this.init();
    }

    isWebGLAvailable() {
      try {
        const probe = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
      } catch (_) {
        return false;
      }
    }

    init() {
      // 1. Mount single scissored canvas inside .col-grid-8
      const existing = this.grid.querySelector('#collections-3d-canvas');
      if (existing) existing.remove();

      this.grid.style.position = 'relative';
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'collections-3d-canvas';
      this.canvas.className = 'collections-3d-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.grid.insertBefore(this.canvas, this.grid.firstChild);

      // 2. Renderer setup (Three r128/r152+ compatible + software WebGL safety)
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance'
      });
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12;
      if ('SRGBColorSpace' in THREE) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ('sRGBEncoding' in THREE) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }
      this.renderer.setScissorTest(true);

      // 3. Shared Scene, Camera & Studio Lighting
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(36, 1.3, 0.1, 30);
      this.camera.position.set(0, 0, 5.2);
      this.camera.lookAt(0, 0, 0);

      this.envMap = this.createProceduralStudioEnvMap();
      if (this.envMap) {
        this.scene.environment = this.envMap;
      }

      const hemiLight = new THREE.HemisphereLight(0xFFF7E8, 0x794722, 0.95);
      this.scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xFDF0DD, 1.15);
      keyLight.position.set(3.5, 4.5, 5);
      this.scene.add(keyLight);

      const warmRim = new THREE.DirectionalLight(0xD1803A, 0.85);
      warmRim.position.set(-4, -3, 3.5);
      this.scene.add(warmRim);

      this.hoverLight = new THREE.PointLight(0xFDF0DD, 0.0, 7.5);
      this.hoverLight.position.set(0, 0, 2.2);
      this.scene.add(this.hoverLight);

      // 4. Shared Procedural Textures & Geometries (zero 404s)
      this.silkTexture = this.createSilkWeaveTexture();
      this.particleTexture = this.createSparkTexture();

      const silkGeo = this.createCurvedSilkGeometry(3.45, 2.55, 16, 12);
      const outerRingGeo = new THREE.TorusGeometry(0.62, 0.028, 12, 48);
      const innerRingGeo = new THREE.TorusGeometry(0.42, 0.02, 10, 40);
      const gemGeo = new THREE.OctahedronGeometry(0.125, 0);
      const studGeo = new THREE.OctahedronGeometry(0.044, 0);
      this.sharedGeometries.push(silkGeo, outerRingGeo, innerRingGeo, gemGeo, studGeo);

      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xC6952B,
        metalness: 0.88,
        roughness: 0.22,
        transparent: true,
        opacity: 0.52
      });
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0xD1803A,
        metalness: 0.9,
        roughness: 0.18,
        transparent: true,
        opacity: 0.62
      });
      this.disposableMaterials.push(brassMat, gemMat);

      // 5. Build 3D Parallax Rig per Collection Card
      this.cards.forEach((card, index) => {
        card.classList.add('has-three-parallax');
        card.setAttribute('data-three-parallax', 'ready');

        let glare = card.querySelector('.card-glare');
        if (!glare) {
          glare = document.createElement('div');
          glare.className = 'card-glare';
          card.appendChild(glare);
        }

        const rawAcc = getComputedStyle(card).getPropertyValue('--acc').trim() || '#D1803A';
        this._colorHelper.set(rawAcc);
        const silkTint = this._creamColor.clone().lerp(this._colorHelper, 0.14);

        const cardGroup = new THREE.Group();
        cardGroup.visible = false;

        // Layer 1: Curved Silk Loom Plane (depth -0.25)
        const silkMat = new THREE.MeshStandardMaterial({
          color: silkTint,
          map: this.silkTexture,
          roughness: 0.44,
          metalness: 0.14,
          transparent: true,
          opacity: 0.92,
          depthWrite: false
        });
        const silkMesh = new THREE.Mesh(silkGeo, silkMat);
        silkMesh.position.set(0, 0, -0.25);
        cardGroup.add(silkMesh);
        this.disposableMaterials.push(silkMat);

        // Layer 2: Multi-part Heritage Brass Medallion (depth +0.18, offset bottom-right)
        const emblemGroup = new THREE.Group();
        emblemGroup.position.set(1.08, -0.62, 0.18);

        const outerRing = new THREE.Mesh(outerRingGeo, brassMat);
        emblemGroup.add(outerRing);

        const accentRingMat = new THREE.MeshStandardMaterial({
          color: this._colorHelper.clone(),
          metalness: 0.52,
          roughness: 0.36,
          transparent: true,
          opacity: 0.46
        });
        this.disposableMaterials.push(accentRingMat);
        const innerRing = new THREE.Mesh(innerRingGeo, accentRingMat);
        innerRing.position.z = 0.04;
        emblemGroup.add(innerRing);

        const centerGem = new THREE.Mesh(gemGeo, gemMat);
        centerGem.position.z = 0.08;
        emblemGroup.add(centerGem);

        for (let s = 0; s < 6; s++) {
          const theta = (s / 6) * Math.PI * 2;
          const stud = new THREE.Mesh(studGeo, gemMat);
          stud.position.set(Math.cos(theta) * 0.52, Math.sin(theta) * 0.52, 0.05);
          stud.rotation.z = theta;
          emblemGroup.add(stud);
        }
        cardGroup.add(emblemGroup);

        // Layer 3: Subtle Foreground Zari Gold Dust (depth +0.45)
        const dustCount = 16;
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = new Float32Array(dustCount * 3);
        const dustBase = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
          const px = (Math.random() - 0.5) * 3.0;
          const py = (Math.random() - 0.5) * 2.1;
          const pz = 0.35 + Math.random() * 0.35;
          dustPos[i * 3] = px;
          dustPos[i * 3 + 1] = py;
          dustPos[i * 3 + 2] = pz;
          dustBase[i * 3] = px;
          dustBase[i * 3 + 1] = py;
          dustBase[i * 3 + 2] = pz;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        this.sharedGeometries.push(dustGeo);

        const dustMat = new THREE.PointsMaterial({
          size: 0.14,
          map: this.particleTexture,
          color: this._colorHelper.clone().lerp(new THREE.Color(0xD1803A), 0.65),
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        this.disposableMaterials.push(dustMat);

        const dustPoints = new THREE.Points(dustGeo, dustMat);
        cardGroup.add(dustPoints);

        this.scene.add(cardGroup);

        const state = {
          index,
          card,
          glare,
          layers: {
            num: card.querySelector('.cc-num'),
            name: card.querySelector('.cc-name'),
            bn: card.querySelector('.col-card-bn') || card.querySelector('.bn'),
            count: card.querySelector('.cc-count'),
            thumbs: card.querySelector('.cc-thumbs'),
            go: card.querySelector('.cc-go')
          },
          group: cardGroup,
          silkMesh,
          emblemGroup,
          centerGem,
          dustPoints,
          dustMat,
          dustBase,
          rect: { left: 0, top: 0, width: 1, height: 1 },
          hovered: false,
          targetNx: 0,
          targetNy: 0,
          nx: 0,
          ny: 0,
          tiltX: 0,
          tiltY: 0,
          targetTiltX: 0,
          targetTiltY: 0,
          hoverAmount: 0,
          targetHover: 0,
          lightX: 0,
          lightY: 0,
          targetLightX: 0,
          targetLightY: 0,
          settled: true
        };

        this.bindCardEvents(state);
        this.cardStates.push(state);
      });

      this.measureCards();
      this.bindGlobalEvents();
      this.requestRender(true);
    }

    createCurvedSilkGeometry(w, h, segX, segY) {
      const geo = new THREE.PlaneGeometry(w, h, segX, segY);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const rNormX = x / (w * 0.5);
        const rNormY = y / (h * 0.5);
        // Subtle tactile cushion curvature
        const zCurve = (1 - (rNormX * rNormX * 0.5 + rNormY * rNormY * 0.5)) * 0.14;
        pos.setZ(i, zCurve);
      }
      geo.computeVertexNormals();
      return geo;
    }

    createProceduralStudioEnvMap() {
      if (!this.renderer || typeof THREE.PMREMGenerator === 'undefined') return null;
      try {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0xFDF0DD);

        const panelGeo = new THREE.PlaneGeometry(10, 6);
        const warmMat = new THREE.MeshBasicMaterial({ color: 0xFFF7E8, side: THREE.DoubleSide });
        const goldMat = new THREE.MeshBasicMaterial({ color: 0xD1803A, side: THREE.DoubleSide });
        const shadeMat = new THREE.MeshBasicMaterial({ color: 0x794722, side: THREE.DoubleSide });

        const topPanel = new THREE.Mesh(panelGeo, warmMat);
        topPanel.position.set(0, 5, 0);
        topPanel.rotation.x = Math.PI / 2;
        envScene.add(topPanel);

        const keyPanel = new THREE.Mesh(panelGeo, goldMat);
        keyPanel.position.set(6, 2, 4);
        keyPanel.lookAt(0, 0, 0);
        envScene.add(keyPanel);

        const bottomPanel = new THREE.Mesh(panelGeo, shadeMat);
        bottomPanel.position.set(0, -5, 0);
        bottomPanel.rotation.x = -Math.PI / 2;
        envScene.add(bottomPanel);

        const rt = pmrem.fromScene(envScene, 0.04);
        panelGeo.dispose();
        warmMat.dispose();
        goldMat.dispose();
        shadeMat.dispose();
        pmrem.dispose();
        return rt.texture;
      } catch (_) {
        return null;
      }
    }

    createSilkWeaveTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');

      // Base Parchment Silk
      ctx.fillStyle = '#FFF7E8';
      ctx.fillRect(0, 0, 256, 256);

      // Fine diagonal Jamdani loom grain
      ctx.strokeStyle = 'rgba(121, 71, 34, 0.045)';
      ctx.lineWidth = 1;
      for (let i = -256; i < 512; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 256, 256);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(209, 128, 58, 0.04)';
      for (let y = 0; y < 256; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }

      // Feathered radial mask so edges dissolve cleanly inside card borders
      ctx.globalCompositeOperation = 'destination-in';
      const grad = ctx.createRadialGradient(128, 128, 36, 128, 128, 126);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.74, 'rgba(255,255,255,0.88)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      const tex = new THREE.CanvasTexture(c);
      applyTextureColorSpace(tex);
      return tex;
    }

    createSparkTexture() {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(209,128,58,0.85)');
      grad.addColorStop(1, 'rgba(253,240,221,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
      const tex = new THREE.CanvasTexture(c);
      applyTextureColorSpace(tex);
      return tex;
    }

    bindCardEvents(state) {
      const { card } = state;

      const onPointerEnter = (e) => {
        state.hovered = true;
        state.targetHover = 1;
        state.settled = false;
        card.setAttribute('data-parallax-active', '1');
        onPointerMove(e);
        this.requestRender();
      };

      const onPointerMove = (e) => {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
        const ny = Math.max(-1, Math.min(1, -(((e.clientY - rect.top) / rect.height) * 2 - 1)));

        state.targetNx = nx;
        state.targetNy = ny;
        // Subtle boutique tactile tilt: pitch around X, yaw around Y
        state.targetTiltX = ny * 0.105;
        state.targetTiltY = nx * 0.115;

        // Real Three.js Raycasting against the curved 3D silk mesh to place dynamic PointLight
        this._ndc.set(nx, ny);
        this.raycaster.setFromCamera(this._ndc, this.camera);
        const hits = this.raycaster.intersectObject(state.silkMesh, false);
        if (hits.length > 0) {
          state.targetLightX = hits[0].point.x;
          state.targetLightY = hits[0].point.y;
        } else {
          state.targetLightX = nx * 1.4;
          state.targetLightY = ny * 1.0;
        }

        state.settled = false;
        this.requestRender();
      };

      const onPointerLeave = () => {
        state.hovered = false;
        state.targetHover = 0;
        state.targetNx = 0;
        state.targetNy = 0;
        state.targetTiltX = 0;
        state.targetTiltY = 0;
        state.targetLightX = 0;
        state.targetLightY = 0;
        card.setAttribute('data-parallax-active', '0');
        state.settled = false;
        this.requestRender();
      };

      card.addEventListener('pointerenter', onPointerEnter, { passive: true });
      card.addEventListener('pointermove', onPointerMove, { passive: true });
      card.addEventListener('pointerleave', onPointerLeave, { passive: true });

      this.cleanupFns.push(() => {
        card.removeEventListener('pointerenter', onPointerEnter);
        card.removeEventListener('pointermove', onPointerMove);
        card.removeEventListener('pointerleave', onPointerLeave);
      });
    }

    bindGlobalEvents() {
      let resizeRaf = null;
      const scheduleMeasure = () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
          this.measureCards();
          this.requestRender(true);
        });
      };

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(scheduleMeasure);
        this.resizeObserver.observe(this.grid);
      }
      window.addEventListener('resize', scheduleMeasure, { passive: true });
      this.cleanupFns.push(() => {
        window.removeEventListener('resize', scheduleMeasure);
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
      });

      if ('IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            this.isVisible = entry.isIntersecting;
            if (this.isVisible) {
              this.measureCards();
              this.requestRender(true);
            }
          });
        }, { threshold: 0.02 });
        this.intersectionObserver.observe(this.grid);
      }

      const onContextLost = (e) => {
        e.preventDefault();
        this.contextLost = true;
        this.stopLoop();
      };
      const onContextRestored = () => {
        this.contextLost = false;
        this.measureCards();
        this.requestRender(true);
      };
      const onVisibility = () => {
        if (!document.hidden && this.isVisible && !this.contextLost) {
          this.requestRender(true);
        }
      };

      this.canvas.addEventListener('webglcontextlost', onContextLost);
      this.canvas.addEventListener('webglcontextrestored', onContextRestored);
      document.addEventListener('visibilitychange', onVisibility);
      this.cleanupFns.push(() => {
        this.canvas.removeEventListener('webglcontextlost', onContextLost);
        this.canvas.removeEventListener('webglcontextrestored', onContextRestored);
        document.removeEventListener('visibilitychange', onVisibility);
      });
    }

    measureCards() {
      if (!this.grid || !this.renderer || !this.canvas) return;
      const w = this.grid.clientWidth;
      const h = this.grid.clientHeight;
      if (!w || !h) return;

      this.gridWidth = w;
      this.gridHeight = h;

      const rawDpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      const maxDim = Math.max(w, h, 1);
      const safeDpr = Math.min(rawDpr, 4096 / maxDim);

      this.renderer.setPixelRatio(safeDpr);
      this.renderer.setSize(w, h, false);

      this.cardStates.forEach(s => {
        s.rect.left = s.card.offsetLeft;
        s.rect.top = s.card.offsetTop;
        s.rect.width = s.card.offsetWidth;
        s.rect.height = s.card.offsetHeight;
      });
    }

    requestRender(forceStatic) {
      if (forceStatic) this.needsStaticDraw = true;
      if (this.contextLost || !this.isVisible) return;
      if (this.frameId || this.softwareTimerId) return;

      this.clock.getDelta();
      this.scheduleNextFrame();
    }

    stopLoop() {
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      if (this.softwareTimerId) {
        clearTimeout(this.softwareTimerId);
        this.softwareTimerId = null;
      }
    }

    scheduleNextFrame() {
      if (this.contextLost || !this.isVisible) return;
      if (isSoftwareGl) {
        this.softwareTimerId = window.setTimeout(() => {
          this.softwareTimerId = null;
          this.tick();
        }, 80);
      } else {
        this.frameId = requestAnimationFrame(() => {
          this.frameId = null;
          this.tick();
        });
      }
    }

    applyDomParallax(s) {
      const hover = s.hoverAmount;
      if (hover < 0.001 && Math.abs(s.tiltX) < 0.0005 && Math.abs(s.tiltY) < 0.0005) {
        if (s.card.style.transform) s.card.style.transform = '';
        if (s.glare) s.glare.style.opacity = '0';
        const l = s.layers;
        if (l.num && l.num.style.transform) l.num.style.transform = '';
        if (l.name && l.name.style.transform) l.name.style.transform = '';
        if (l.bn && l.bn.style.transform) l.bn.style.transform = '';
        if (l.count && l.count.style.transform) l.count.style.transform = '';
        if (l.thumbs && l.thumbs.style.transform) l.thumbs.style.transform = '';
        if (l.go && l.go.style.transform) l.go.style.transform = '';
        return;
      }

      // Tilt direction matches natural physical push of cursor
      const rxDeg = (-s.tiltX * 52).toFixed(3);
      const ryDeg = (s.tiltY * 52).toFixed(3);
      const liftY = (-hover * 5).toFixed(2);
      const scale = (1 + hover * 0.02).toFixed(4);

      s.card.style.transform = `perspective(960px) rotateX(${rxDeg}deg) rotateY(${ryDeg}deg) translate3d(0, ${liftY}px, 0) scale(${scale})`;

      // Multi-plane staggered depth shift inside the card
      const px = s.nx * hover;
      const py = -s.ny * hover;
      const { num, name, bn, count, thumbs, go } = s.layers;

      if (num) num.style.transform = `translate3d(${(px * 4).toFixed(2)}px, ${(py * 3).toFixed(2)}px, 6px)`;
      if (name) name.style.transform = `translate3d(${(px * 8.5).toFixed(2)}px, ${(py * 6.5).toFixed(2)}px, 16px)`;
      if (bn) bn.style.transform = `translate3d(${(px * 7).toFixed(2)}px, ${(py * 5).toFixed(2)}px, 12px)`;
      if (count) count.style.transform = `translate3d(${(px * 5.5).toFixed(2)}px, ${(py * 4).toFixed(2)}px, 10px)`;
      if (thumbs) thumbs.style.transform = `translate3d(${(px * 13).toFixed(2)}px, ${(py * 9.5).toFixed(2)}px, 26px)`;
      if (go) go.style.transform = `translate3d(${(px * 9).toFixed(2)}px, ${(py * 6.5).toFixed(2)}px, 18px)`;

      if (s.glare) {
        const gx = ((s.nx + 1) * 50).toFixed(1);
        const gy = ((1 - s.ny) * 50).toFixed(1);
        s.glare.style.opacity = (hover * 0.65).toFixed(3);
        s.glare.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.44) 0%, rgba(209,128,58,0.16) 34%, transparent 68%)`;
      }
    }

    tick() {
      if (this.contextLost || !this.isVisible || !this.renderer) {
        this.stopLoop();
        return;
      }

      const delta = Math.min(this.clock.getDelta(), 0.08);
      const elapsed = this.clock.getElapsedTime();
      let anyAnimating = false;

      if (!this.gridWidth || !this.gridHeight) {
        this.measureCards();
      }

      // Ensure full transparent clear before scissored per-card rendering
      this.renderer.setScissorTest(false);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear();
      this.renderer.setScissorTest(true);

      for (let i = 0; i < this.cardStates.length; i++) {
        const s = this.cardStates[i];
        const lambda = s.hovered ? 10.5 : 5.5;

        s.nx = damp(s.nx, s.targetNx, lambda, delta);
        s.ny = damp(s.ny, s.targetNy, lambda, delta);
        s.tiltX = damp(s.tiltX, s.targetTiltX, lambda, delta);
        s.tiltY = damp(s.tiltY, s.targetTiltY, lambda, delta);
        s.hoverAmount = damp(s.hoverAmount, s.targetHover, lambda, delta);
        s.lightX = damp(s.lightX, s.targetLightX, 11.0, delta);
        s.lightY = damp(s.lightY, s.targetLightY, 11.0, delta);

        const residual =
          Math.abs(s.tiltX - s.targetTiltX) +
          Math.abs(s.tiltY - s.targetTiltY) +
          Math.abs(s.hoverAmount - s.targetHover);

        if (s.hovered || residual > 0.0012) {
          anyAnimating = true;
          s.settled = false;
        } else {
          s.nx = s.targetNx;
          s.ny = s.targetNy;
          s.tiltX = s.targetTiltX;
          s.tiltY = s.targetTiltY;
          s.hoverAmount = s.targetHover;
          s.settled = true;
        }

        // Update 3D Group transforms with multi-depth parallax ratios
        s.group.visible = true;
        s.silkMesh.rotation.x = -s.tiltX * 0.85;
        s.silkMesh.rotation.y = s.tiltY * 0.85;
        s.silkMesh.position.x = -s.nx * s.hoverAmount * 0.06;
        s.silkMesh.position.y = -s.ny * s.hoverAmount * 0.05;

        s.emblemGroup.rotation.x = -s.tiltX * 1.45;
        s.emblemGroup.rotation.y = s.tiltY * 1.45;
        s.emblemGroup.rotation.z = s.hoverAmount * 0.24 + Math.sin(elapsed * 0.6 + i) * 0.04;
        s.emblemGroup.position.x = 1.08 + s.nx * s.hoverAmount * 0.16;
        s.emblemGroup.position.y = -0.62 + s.ny * s.hoverAmount * 0.14;
        s.centerGem.rotation.y = elapsed * 0.5 * s.hoverAmount + i;

        s.dustPoints.position.x = s.nx * s.hoverAmount * 0.28;
        s.dustPoints.position.y = s.ny * s.hoverAmount * 0.22;
        s.dustMat.opacity = 0.22 + s.hoverAmount * 0.48;

        this.hoverLight.position.set(s.lightX, s.lightY, 2.25);
        this.hoverLight.intensity = s.hoverAmount * 1.9;

        const r = s.rect;
        if (r.width > 0 && r.height > 0) {
          const bottomY = this.gridHeight - (r.top + r.height);
          this.camera.aspect = r.width / r.height;
          this.camera.updateProjectionMatrix();

          this.renderer.setViewport(r.left, bottomY, r.width, r.height);
          this.renderer.setScissor(r.left, bottomY, r.width, r.height);
          this.renderer.render(this.scene, this.camera);
        }

        s.group.visible = false;
        this.applyDomParallax(s);
      }

      this.needsStaticDraw = false;
      if (anyAnimating) {
        this.scheduleNextFrame();
      }
    }

    destroy() {
      this.isVisible = false;
      this.stopLoop();

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
        this.intersectionObserver = null;
      }

      while (this.cleanupFns.length > 0) {
        const off = this.cleanupFns.pop();
        try { off(); } catch (_) {}
      }

      this.cardStates.forEach(s => {
        if (s.card) {
          s.card.classList.remove('has-three-parallax');
          s.card.removeAttribute('data-three-parallax');
          s.card.removeAttribute('data-parallax-active');
          s.card.style.transform = '';
        }
      });
      this.cardStates = [];

      while (this.sharedGeometries.length > 0) {
        try { this.sharedGeometries.pop().dispose(); } catch (_) {}
      }
      while (this.disposableMaterials.length > 0) {
        try { this.disposableMaterials.pop().dispose(); } catch (_) {}
      }
      if (this.silkTexture) {
        try { this.silkTexture.dispose(); } catch (_) {}
        this.silkTexture = null;
      }
      if (this.particleTexture) {
        try { this.particleTexture.dispose(); } catch (_) {}
        this.particleTexture = null;
      }
      if (this.envMap) {
        try { this.envMap.dispose(); } catch (_) {}
        this.envMap = null;
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      if (this.renderer) {
        try { this.renderer.dispose(); } catch (_) {}
        this.renderer = null;
      }
    }
  }

  function destroyThreeCollections() {
    if (window.ftThreeCollections && typeof window.ftThreeCollections.destroy === 'function') {
      window.ftThreeCollections.destroy();
    }
    window.ftThreeCollections = null;
  }

  function initThreeCollections() {
    destroyThreeCollections();
    const grid = document.querySelector('#collections .col-grid-8') || document.querySelector('.col-grid-8');
    if (grid && typeof THREE !== 'undefined') {
      window.ftThreeCollections = new ThreeCollectionParallax(grid);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThreeCollections);
  } else {
    initThreeCollections();
  }

  window.ThreeCollectionParallax = ThreeCollectionParallax;
  window.initThreeCollections = initThreeCollections;
  window.destroyThreeCollections = destroyThreeCollections;
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : {});
