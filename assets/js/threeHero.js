/**
 * Fariza's Territory — Interactive 3D Luxury WebGL Spatial Core
 * Library: Three.js (r128+)
 * Theme: Undulating Jamdani Silk Drape, Sculpted Heritage Brass Halo & Zari Gold Dust
 * Palette: Obsidian Noir #1E1D1C, Parchment Cream #FDF0DD, Caramel Gold #D1803A, Chestnut #794722, Imperial Gold #C6952B
 */

(function (window, document) {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

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

  class ThreeHeroBackground {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      if (!this.isWebGLAvailable()) {
        return;
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.clothMesh = null;
      this.wireMesh = null;
      this.mandalaGroup = null;
      this.mandalaAccentMat = null;
      this.rimLight = null;
      this.particles = null;
      this.particleTexture = null;
      this.pointerLight = null;
      this.clock = null;
      this.animationFrameId = null;
      this.softwareTimerId = null;
      this.intersectionObserver = null;
      this.contextLost = false;
      this.isVisible = true;
      this.boundCleanup = [];

      // Pre-allocated color helpers (zero per-frame allocations)
      this._targetAccentColor = null;
      this._currentAccentColor = null;

      // Interactive ripple disturbances
      this.ripples = [];
      this.maxRipples = 4;

      // Pointer tracking coordinates with exponential damping
      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0, worldX: 0, worldY: 0 };
      this.windowHalf = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      this.init();
    }

    isWebGLAvailable() {
      try {
        const testCanvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
      } catch (_) {
        return false;
      }
    }

    init() {
      if (typeof THREE === 'undefined') return;

      this._targetAccentColor = new THREE.Color(0x8E3B66);
      this._currentAccentColor = new THREE.Color(0x8E3B66);

      // 1. Scene & Atmospheric Fog matching Parchment Cream
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0xFDF0DD, 0.036);

      // 2. Camera setup
      const fov = 45;
      const aspect = this.canvas.clientWidth / (this.canvas.clientHeight || 1);
      this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
      this.camera.position.set(0, 0, 13.5);

      // 3. Renderer setup (respecting software WebGL cost budget & Three r128/r152+ color pipeline)
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
      this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.18;
      if ('SRGBColorSpace' in THREE) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ('sRGBEncoding' in THREE) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }

      // 4. Studio Lighting Rig: Warm Key + Cool/Parchment Fill + Collection-Reactive Rim
      const hemiLight = new THREE.HemisphereLight(0xFDF0DD, 0x794722, 0.95);
      this.scene.add(hemiLight);

      const dirLight1 = new THREE.DirectionalLight(0xD1803A, 1.45); // Caramel Gold key light
      dirLight1.position.set(6, 8, 7);
      this.scene.add(dirLight1);

      this.rimLight = new THREE.DirectionalLight(0x8E3B66, 0.78); // Collection-reactive rim light
      this.rimLight.position.set(-7, -4, 5);
      this.scene.add(this.rimLight);

      this.pointerLight = new THREE.PointLight(0xFDF0DD, 1.65, 16);
      this.pointerLight.position.set(0, 0, 4);
      this.scene.add(this.pointerLight);

      const centerGlow = new THREE.PointLight(0xD1803A, 0.75, 22);
      centerGlow.position.set(0, 2, 7);
      this.scene.add(centerGlow);

      // 5. Scene Assemblies
      this.createSilkCloth();
      this.createMandalaHalo();
      this.createGoldDust();

      // 6. Clock, Listeners & Observers
      this.clock = new THREE.Clock();
      this.bindEvents();
      this.setupIntersectionObserver();

      // 7. Start Render Loop
      this.animate();
    }

    createSilkCloth() {
      const segmentsX = isMobile ? 34 : 54;
      const segmentsY = isMobile ? 22 : 36;
      const geometry = new THREE.PlaneGeometry(26, 18, segmentsX, segmentsY);

      const pos = geometry.attributes.position;
      this.originalPositions = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count * 3; i++) {
        this.originalPositions[i] = pos.array[i];
      }

      const material = new THREE.MeshStandardMaterial({
        color: 0xF6E7CC,
        roughness: 0.34,
        metalness: 0.32,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });

      this.clothMesh = new THREE.Mesh(geometry, material);
      this.clothMesh.rotation.x = -0.32;
      this.clothMesh.rotation.z = -0.06;
      this.clothMesh.position.set(1.2, -0.6, 0);
      this.scene.add(this.clothMesh);

      const wireMaterial = new THREE.MeshBasicMaterial({
        color: 0xC6952B,
        wireframe: true,
        transparent: true,
        opacity: 0.14
      });
      this.wireMesh = new THREE.Mesh(geometry, wireMaterial);
      this.clothMesh.add(this.wireMesh);
    }

    /**
     * Multi-part composite procedural Heritage Jamdani Mandala Halo (THREE.Group)
     * Subtle sculpted brass & enamel framing accent behind the silk drape
     */
    createMandalaHalo() {
      const group = new THREE.Group();
      group.position.set(isMobile ? 2.1 : 4.2, 0.8, -3.4);

      const outerBrassMat = new THREE.MeshStandardMaterial({
        color: 0xC6952B,
        metalness: 0.88,
        roughness: 0.24,
        transparent: true,
        opacity: 0.42
      });
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.045, 14, 72), outerBrassMat);
      group.add(outerRing);

      const accentMat = new THREE.MeshStandardMaterial({
        color: 0x8E3B66,
        metalness: 0.45,
        roughness: 0.48,
        transparent: true,
        opacity: 0.36
      });
      this.mandalaAccentMat = accentMat;
      const midRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.032, 12, 64), accentMat);
      group.add(midRing);

      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.024, 12, 48), outerBrassMat);
      group.add(innerRing);

      // 16 Jamdani bead ornaments via InstancedMesh for single-draw-call elegance
      const beadGeo = new THREE.OctahedronGeometry(0.085, 0);
      const beadMat = new THREE.MeshStandardMaterial({
        color: 0xD1803A,
        metalness: 0.9,
        roughness: 0.2,
        transparent: true,
        opacity: 0.55
      });
      const beadCount = 16;
      const beads = new THREE.InstancedMesh(beadGeo, beadMat, beadCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < beadCount; i++) {
        const theta = (i / beadCount) * Math.PI * 2;
        dummy.position.set(Math.cos(theta) * 2.4, Math.sin(theta) * 2.4, 0);
        dummy.rotation.set(0, 0, theta);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
      }
      beads.instanceMatrix.needsUpdate = true;
      if (typeof beads.computeBoundingSphere === 'function') {
        beads.computeBoundingSphere();
      } else {
        beads.frustumCulled = false;
      }
      group.add(beads);

      this.mandalaGroup = group;
      this.scene.add(group);
    }

    createGoldDust() {
      const particleCount = isMobile ? 160 : 340;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const colorChoices = [
        new THREE.Color(0xD1803A),
        new THREE.Color(0xC6952B),
        new THREE.Color(0xFDF0DD),
        new THREE.Color(0x8E3B66)
      ];

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 26;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 12 + 1.5;

        velocities[i * 3] = (Math.random() - 0.5) * 0.008;
        velocities[i * 3 + 1] = -(Math.random() * 0.012 + 0.004);
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.006;

        const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      this.particleVelocities = velocities;

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.25, 'rgba(209, 128, 58, 0.9)');
      grad.addColorStop(0.65, 'rgba(198, 149, 43, 0.4)');
      grad.addColorStop(1, 'rgba(253, 240, 221, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      if ('SRGBColorSpace' in THREE) {
        texture.colorSpace = THREE.SRGBColorSpace;
      } else if ('sRGBEncoding' in THREE) {
        texture.encoding = THREE.sRGBEncoding;
      }
      this.particleTexture = texture;

      const particleMat = new THREE.PointsMaterial({
        size: isMobile ? 0.3 : 0.42,
        map: texture,
        vertexColors: true,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.particles = new THREE.Points(particleGeo, particleMat);
      this.scene.add(this.particles);
    }

    setAccentColor(hexColor, pulseRipple) {
      if (!hexColor || typeof THREE === 'undefined' || !this._targetAccentColor) return;
      try {
        this._targetAccentColor.set(hexColor);
        if (pulseRipple && !prefersReducedMotion && this.clock) {
          this.triggerRipple(1.5, -0.5);
        }
      } catch (_) {}
    }

    triggerRipple(worldX, worldY) {
      if (prefersReducedMotion || !this.clock) return;
      this.ripples.push({
        x: worldX,
        y: worldY,
        time: this.clock.getElapsedTime(),
        strength: 0.56
      });
      if (this.ripples.length > this.maxRipples) {
        this.ripples.shift();
      }
    }

    bindEvents() {
      let resizeTimeout = null;
      const addListener = (target, type, fn, opts) => {
        target.addEventListener(type, fn, opts);
        this.boundCleanup.push(() => target.removeEventListener(type, fn, opts));
      };

      addListener(window, 'resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.onResize(), 100);
      }, { passive: true });

      const heroEl = document.querySelector('.hero') || document.body;

      const onPointerMove = (clientX, clientY) => {
        this.mouse.targetX = (clientX - this.windowHalf.x) * 0.001;
        this.mouse.targetY = (clientY - this.windowHalf.y) * 0.001;

        const normX = (clientX / window.innerWidth) * 2 - 1;
        const normY = -(clientY / window.innerHeight) * 2 + 1;
        this.mouse.worldX = normX * 10;
        this.mouse.worldY = normY * 6;
      };

      addListener(heroEl, 'mousemove', (e) => {
        onPointerMove(e.clientX, e.clientY);
      }, { passive: true });

      addListener(heroEl, 'touchmove', (e) => {
        if (e.touches.length > 0) {
          onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      addListener(heroEl, 'pointerdown', (e) => {
        const normX = (e.clientX / window.innerWidth) * 2 - 1;
        const normY = -(e.clientY / window.innerHeight) * 2 + 1;
        this.triggerRipple(normX * 10, normY * 6);
      }, { passive: true });

      addListener(this.canvas, 'webglcontextlost', (e) => {
        e.preventDefault();
        this.contextLost = true;
        this.stopLoop();
      });

      addListener(this.canvas, 'webglcontextrestored', () => {
        this.contextLost = false;
        if (this.isVisible) {
          this.clock.start();
          this.animate();
        }
      });

      addListener(document, 'visibilitychange', () => {
        this.isVisible = !document.hidden;
        if (this.isVisible && !this.contextLost && !this.animationFrameId && !this.softwareTimerId) {
          this.clock.start();
          this.animate();
        }
      });
    }

    setupIntersectionObserver() {
      if ('IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            this.isVisible = entry.isIntersecting;
            if (this.isVisible && !this.contextLost && !this.animationFrameId && !this.softwareTimerId) {
              this.clock.start();
              this.animate();
            }
          });
        }, { threshold: 0.05 });

        this.intersectionObserver.observe(this.canvas);
      }
    }

    onResize() {
      if (!this.canvas || !this.renderer || !this.camera) return;
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      if (!width || !height) return;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      this.windowHalf.x = window.innerWidth / 2;
      this.windowHalf.y = window.innerHeight / 2;
    }

    stopLoop() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.softwareTimerId) {
        clearTimeout(this.softwareTimerId);
        this.softwareTimerId = null;
      }
    }

    scheduleNextFrame() {
      if (!this.isVisible || this.contextLost) return;
      if (isSoftwareGl) {
        this.softwareTimerId = window.setTimeout(() => {
          this.softwareTimerId = null;
          this.animate();
        }, 80);
      } else {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
      }
    }

    animate() {
      if (!this.isVisible || this.contextLost || !this.renderer) {
        this.stopLoop();
        return;
      }

      const delta = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.getElapsedTime();

      // Exponential spring-like mouse damping
      const dampFn = THREE.MathUtils && THREE.MathUtils.damp
        ? THREE.MathUtils.damp
        : (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

      this.mouse.x = dampFn(this.mouse.x, this.mouse.targetX, 5.5, delta);
      this.mouse.y = dampFn(this.mouse.y, this.mouse.targetY, 5.5, delta);

      this.camera.position.x = this.mouse.x * 4.0;
      this.camera.position.y = -this.mouse.y * 3.0;
      this.camera.lookAt(0, 0, 0);

      // Smoothly transition accent color on rim light & mandala halo
      if (this._currentAccentColor && this._targetAccentColor) {
        this._currentAccentColor.lerp(this._targetAccentColor, 1 - Math.exp(-3.5 * delta));
        if (this.rimLight) this.rimLight.color.copy(this._currentAccentColor);
        if (this.mandalaAccentMat) this.mandalaAccentMat.color.copy(this._currentAccentColor);
      }

      if (this.pointerLight) {
        this.pointerLight.position.x = dampFn(this.pointerLight.position.x, this.mouse.worldX, 6.0, delta);
        this.pointerLight.position.y = dampFn(this.pointerLight.position.y, this.mouse.worldY, 6.0, delta);
      }

      // Gentle Mandala Halo orbit
      if (this.mandalaGroup && !prefersReducedMotion) {
        this.mandalaGroup.rotation.z = elapsed * 0.085;
        this.mandalaGroup.rotation.y = Math.sin(elapsed * 0.35) * 0.22 + this.mouse.x * 0.6;
        this.mandalaGroup.rotation.x = Math.cos(elapsed * 0.28) * 0.15 - this.mouse.y * 0.4;
      }

      // Undulating silk wave animation
      if (this.clothMesh && this.clothMesh.geometry) {
        const pos = this.clothMesh.geometry.attributes.position;
        const count = pos.count;
        const speed = prefersReducedMotion ? 0.04 : 0.88;

        const activeRipples = this.ripples.filter(r => (elapsed - r.time) < 3.0);
        this.ripples = activeRipples;

        for (let i = 0; i < count; i++) {
          const u = this.originalPositions[i * 3];
          const v = this.originalPositions[i * 3 + 1];

          const wave1 = Math.sin(u * 0.42 + elapsed * speed) * 0.68;
          const wave2 = Math.cos(v * 0.52 + elapsed * speed * 0.78) * 0.46;
          const wave3 = Math.sin((u + v) * 0.32 + elapsed * speed * 1.15) * 0.32;

          const du = u - this.mouse.worldX;
          const dv = v - this.mouse.worldY;
          const distToMouse = Math.sqrt(du * du + dv * dv);
          const mouseRipple = Math.sin(distToMouse * 0.75 - elapsed * 2.2) * Math.max(0, 1 - distToMouse * 0.14) * 0.35;

          let rippleSum = 0;
          for (let r = 0; r < activeRipples.length; r++) {
            const rip = activeRipples[r];
            const age = elapsed - rip.time;
            const rdu = u - rip.x;
            const rdv = v - rip.y;
            const ripDist = Math.sqrt(rdu * rdu + rdv * rdv);
            const waveFront = ripDist - age * 4.5;
            if (Math.abs(waveFront) < 2.0) {
              rippleSum += Math.sin(waveFront * 3.14) * Math.max(0, 1 - age / 3.0) * rip.strength;
            }
          }

          pos.array[i * 3 + 2] = this.originalPositions[i * 3 + 2] + wave1 + wave2 + wave3 + mouseRipple + rippleSum;
        }

        pos.needsUpdate = true;
        this.clothMesh.geometry.computeVertexNormals();

        this.clothMesh.rotation.y = Math.sin(elapsed * 0.22) * 0.05;
        this.clothMesh.rotation.x = -0.32 + Math.cos(elapsed * 0.18) * 0.03;
      }

      // Shimmering Zari Gold Dust Particles
      if (this.particles) {
        const pos = this.particles.geometry.attributes.position;
        const vels = this.particleVelocities;
        const pSpeed = prefersReducedMotion ? 0.015 : delta * 4.2;

        for (let i = 0; i < pos.count; i++) {
          pos.array[i * 3] += vels[i * 3] * (delta * 60);
          pos.array[i * 3 + 1] += vels[i * 3 + 1] * pSpeed * 10;
          pos.array[i * 3 + 2] += vels[i * 3 + 2] * (delta * 60);

          const dx = pos.array[i * 3] - this.mouse.worldX;
          const dy = pos.array[i * 3 + 1] - this.mouse.worldY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 4.5 && !prefersReducedMotion) {
            pos.array[i * 3] += (-dy / (dist + 0.5)) * 0.018;
            pos.array[i * 3 + 1] += (dx / (dist + 0.5)) * 0.018;
          }

          if (pos.array[i * 3 + 1] < -10) {
            pos.array[i * 3 + 1] = 10;
            pos.array[i * 3] = (Math.random() - 0.5) * 26;
            pos.array[i * 3 + 2] = (Math.random() - 0.5) * 12 + 1.5;
          }

          pos.array[i * 3] += Math.sin(elapsed * 0.4 + i) * 0.005;
        }
        pos.needsUpdate = true;
      }

      this.renderer.render(this.scene, this.camera);
      this.scheduleNextFrame();
    }

    destroy() {
      this.isVisible = false;
      this.stopLoop();
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
        this.intersectionObserver = null;
      }
      while (this.boundCleanup.length > 0) {
        const off = this.boundCleanup.pop();
        try { off(); } catch (_) {}
      }
      if (this.clothMesh) {
        this.clothMesh.geometry.dispose();
        this.clothMesh.material.dispose();
      }
      if (this.wireMesh) {
        this.wireMesh.material.dispose();
      }
      if (this.mandalaGroup) {
        this.mandalaGroup.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      }
      if (this.particles) {
        this.particles.geometry.dispose();
        this.particles.material.dispose();
      }
      if (this.particleTexture) {
        this.particleTexture.dispose();
      }
      if (this.renderer) {
        this.renderer.dispose();
      }
    }
  }

  function initThreeHero() {
    const canvas = document.getElementById('hero-3d-canvas');
    if (canvas && typeof THREE !== 'undefined') {
      if (window.ftThreeHero && typeof window.ftThreeHero.destroy === 'function') {
        window.ftThreeHero.destroy();
      }
      window.ftThreeHero = new ThreeHeroBackground('hero-3d-canvas');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThreeHero);
  } else {
    initThreeHero();
  }

  window.initThreeHero = initThreeHero;
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : {});
