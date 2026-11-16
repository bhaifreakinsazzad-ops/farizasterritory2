/**
 * Fariza's Territory — Master-Level Interactive 3D Luxury WebGL Spatial Core
 * Library: Three.js (r128)
 * Theme: Shimmering Silk Wave, Golden Jamdani Lattice, Cosmic Zari Dust & Interactive 3D Specimen
 * Palette: Obsidian Noir #1E1D1C, Parchment Cream #FDF0DD, Caramel Gold #D1803A, Chestnut #794722, Imperial Gold #C6952B
 * Performance: DPR clamped to 2, touch-action pan-y, IntersectionObserver battery preservation
 */

(function (window, document) {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  class ThreeHeroBackground {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      if (!this.isWebGLAvailable()) {
        console.warn('WebGL not available for 3D Hero canvas.');
        return;
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.clothMesh = null;
      this.wireMesh = null;
      this.particles = null;
      this.pointerLight = null;
      this.clock = null;
      this.animationFrameId = null;
      this.isVisible = true;

      // Interactive ripple disturbances
      this.ripples = [];
      this.maxRipples = 4;

      // Pointer tracking coordinates with lerp
      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0, worldX: 0, worldY: 0 };
      this.windowHalf = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      this.init();
    }

    isWebGLAvailable() {
      try {
        const testCanvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    }

    init() {
      if (typeof THREE === 'undefined') {
        console.warn('Three.js library is not loaded.');
        return;
      }

      // 1. Scene setup
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0xFDF0DD, 0.038);

      // 2. Camera setup
      const fov = 45;
      const aspect = this.canvas.clientWidth / (this.canvas.clientHeight || 1);
      this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
      this.camera.position.set(0, 0, 13.5);

      // 3. Renderer setup with clamped DPR for 60fps mobile protection
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.22;

      // 4. Lighting setup: Studio Key, Rim, Ambient and Interactive Pointer Light
      const ambientLight = new THREE.AmbientLight(0xFDF0DD, 0.9);
      this.scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xD1803A, 1.5); // Caramel Gold key light
      dirLight1.position.set(6, 8, 7);
      this.scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x8E3B66, 0.7); // Magenta / Terracotta rim light
      dirLight2.position.set(-7, -4, 5);
      this.scene.add(dirLight2);

      // Interactive Pointer Light that follows the cursor in 3D space
      this.pointerLight = new THREE.PointLight(0xFDF0DD, 1.8, 16);
      this.pointerLight.position.set(0, 0, 4);
      this.scene.add(this.pointerLight);

      // Secondary soft warm highlight
      const centerGlow = new THREE.PointLight(0xD1803A, 0.8, 22);
      centerGlow.position.set(0, 2, 7);
      this.scene.add(centerGlow);

      // 5. Create Luxurious Undulating Silk Geometry
      this.createSilkCloth();

      // 6. Create Shimmering Gold & Caramel Cosmic Dust Particles
      this.createGoldDust();

      // 7. Clock & Event listeners
      this.clock = new THREE.Clock();

      this.bindEvents();
      this.setupIntersectionObserver();

      // 8. Start loop
      this.animate();
    }

    createSilkCloth() {
      // Density tuned for silky smoothness and mobile efficiency
      const segmentsX = isMobile ? 36 : 56;
      const segmentsY = isMobile ? 24 : 38;
      const width = 26;
      const height = 18;

      const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);

      // Cache initial vertex positions
      const pos = geometry.attributes.position;
      this.originalPositions = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count * 3; i++) {
        this.originalPositions[i] = pos.array[i];
      }

      // Shimmering silk material with specular clearcoat
      const material = new THREE.MeshStandardMaterial({
        color: 0xF6E7CC,
        roughness: 0.32,
        metalness: 0.35,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92
      });

      this.clothMesh = new THREE.Mesh(geometry, material);
      this.clothMesh.rotation.x = -0.32;
      this.clothMesh.rotation.z = -0.06;
      this.clothMesh.position.set(1.2, -0.6, 0);
      this.scene.add(this.clothMesh);

      // Subtle fine gold wireframe lattice (Jamdani weave motif)
      const wireMaterial = new THREE.MeshBasicMaterial({
        color: 0xC6952B,
        wireframe: true,
        transparent: true,
        opacity: 0.16
      });
      this.wireMesh = new THREE.Mesh(geometry, wireMaterial);
      this.clothMesh.add(this.wireMesh);
    }

    createGoldDust() {
      const particleCount = isMobile ? 180 : 380;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      // Palette: Caramel Gold (209, 128, 58), Imperial Gold (198, 149, 43), Parchment Cream (253, 240, 221)
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

      // Soft circular gradient texture for gold embers
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

      const particleMat = new THREE.PointsMaterial({
        size: isMobile ? 0.32 : 0.44,
        map: texture,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.particles = new THREE.Points(particleGeo, particleMat);
      this.scene.add(this.particles);
    }

    triggerRipple(worldX, worldY) {
      if (prefersReducedMotion) return;
      this.ripples.push({
        x: worldX,
        y: worldY,
        time: this.clock.getElapsedTime(),
        strength: 0.6
      });
      if (this.ripples.length > this.maxRipples) {
        this.ripples.shift();
      }
    }

    bindEvents() {
      // Responsive resize with debouncing
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.onResize(), 100);
      }, { passive: true });

      // Cursor parallax tracking
      const heroEl = document.querySelector('.hero') || document.body;

      const onPointerMove = (clientX, clientY) => {
        this.mouse.targetX = (clientX - this.windowHalf.x) * 0.001;
        this.mouse.targetY = (clientY - this.windowHalf.y) * 0.001;

        // Map client coordinates to 3D plane coordinates for local interaction
        const normX = (clientX / window.innerWidth) * 2 - 1;
        const normY = -(clientY / window.innerHeight) * 2 + 1;
        this.mouse.worldX = normX * 10;
        this.mouse.worldY = normY * 6;
      };

      heroEl.addEventListener('mousemove', (e) => {
        onPointerMove(e.clientX, e.clientY);
      }, { passive: true });

      heroEl.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      // Click ripple trigger
      heroEl.addEventListener('pointerdown', (e) => {
        const normX = (e.clientX / window.innerWidth) * 2 - 1;
        const normY = -(e.clientY / window.innerHeight) * 2 + 1;
        this.triggerRipple(normX * 10, normY * 6);
      }, { passive: true });
    }

    setupIntersectionObserver() {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            this.isVisible = entry.isIntersecting;
            if (this.isVisible && !this.animationFrameId) {
              this.clock.start();
              this.animate();
            }
          });
        }, { threshold: 0.05 });

        observer.observe(this.canvas);
      }

      // Battery Saver: Stop render loop if page/tab is hidden
      document.addEventListener('visibilitychange', () => {
        this.isVisible = !document.hidden;
        if (this.isVisible && !this.animationFrameId) {
          this.clock.start();
          this.animate();
        }
      });
    }

    onResize() {
      if (!this.canvas || !this.renderer || !this.camera) return;
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;

      this.camera.aspect = width / (height || 1);
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.windowHalf.x = window.innerWidth / 2;
      this.windowHalf.y = window.innerHeight / 2;
    }

    animate() {
      if (!this.isVisible) {
        this.animationFrameId = null;
        return;
      }

      this.animationFrameId = requestAnimationFrame(() => this.animate());

      const elapsed = this.clock.getElapsedTime();

      // Smooth mouse lerp for magnetic inertia
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

      // Parallax camera tilt
      this.camera.position.x = this.mouse.x * 4.0;
      this.camera.position.y = -this.mouse.y * 3.0;
      this.camera.lookAt(0, 0, 0);

      // Move pointer light in 3D world space
      if (this.pointerLight) {
        this.pointerLight.position.x += (this.mouse.worldX - this.pointerLight.position.x) * 0.08;
        this.pointerLight.position.y += (this.mouse.worldY - this.pointerLight.position.y) * 0.08;
      }

      // Undulating silk wave animation with multi-octave harmonic synthesis
      if (this.clothMesh && this.clothMesh.geometry) {
        const pos = this.clothMesh.geometry.attributes.position;
        const count = pos.count;
        const speed = prefersReducedMotion ? 0.04 : 0.88;

        // Clean expired ripples
        const activeRipples = this.ripples.filter(r => (elapsed - r.time) < 3.0);
        this.ripples = activeRipples;

        for (let i = 0; i < count; i++) {
          const u = this.originalPositions[i * 3];
          const v = this.originalPositions[i * 3 + 1];

          // Complex layered sine/cosine wave simulating organic silk fabric drape
          const wave1 = Math.sin(u * 0.42 + elapsed * speed) * 0.68;
          const wave2 = Math.cos(v * 0.52 + elapsed * speed * 0.78) * 0.46;
          const wave3 = Math.sin((u + v) * 0.32 + elapsed * speed * 1.15) * 0.32;

          // Interactive magnetic cursor deflection
          const distToMouse = Math.sqrt(Math.pow(u - this.mouse.worldX, 2) + Math.pow(v - this.mouse.worldY, 2));
          const mouseRipple = Math.sin(distToMouse * 0.75 - elapsed * 2.2) * Math.max(0, 1 - distToMouse * 0.14) * 0.35;

          // Click impulse ripples
          let rippleSum = 0;
          for (let r = 0; r < activeRipples.length; r++) {
            const rip = activeRipples[r];
            const age = elapsed - rip.time;
            const ripDist = Math.sqrt(Math.pow(u - rip.x, 2) + Math.pow(v - rip.y, 2));
            const waveFront = ripDist - age * 4.5;
            if (Math.abs(waveFront) < 2.0) {
              rippleSum += Math.sin(waveFront * 3.14) * Math.max(0, 1 - age / 3.0) * rip.strength;
            }
          }

          pos.array[i * 3 + 2] = this.originalPositions[i * 3 + 2] + wave1 + wave2 + wave3 + mouseRipple + rippleSum;
        }

        pos.needsUpdate = true;
        this.clothMesh.geometry.computeVertexNormals();

        // Gentle mesh breathing rotation
        this.clothMesh.rotation.y = Math.sin(elapsed * 0.22) * 0.05;
        this.clothMesh.rotation.x = -0.32 + Math.cos(elapsed * 0.18) * 0.03;
      }

      // Shimmering cosmic gold dust particles with vortex swirling
      if (this.particles) {
        const pos = this.particles.geometry.attributes.position;
        const vels = this.particleVelocities;
        const pSpeed = prefersReducedMotion ? 0.015 : 0.07;

        for (let i = 0; i < pos.count; i++) {
          pos.array[i * 3] += vels[i * 3];
          pos.array[i * 3 + 1] += vels[i * 3 + 1] * (pSpeed * 10);
          pos.array[i * 3 + 2] += vels[i * 3 + 2];

          // Gentle orbital swirl around cursor
          const dx = pos.array[i * 3] - this.mouse.worldX;
          const dy = pos.array[i * 3 + 1] - this.mouse.worldY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 4.5 && !prefersReducedMotion) {
            // Apply tangential angular velocity
            pos.array[i * 3] += (-dy / (dist + 0.5)) * 0.02;
            pos.array[i * 3 + 1] += (dx / (dist + 0.5)) * 0.02;
          }

          // Recycle particles from bottom to top
          if (pos.array[i * 3 + 1] < -10) {
            pos.array[i * 3 + 1] = 10;
            pos.array[i * 3] = (Math.random() - 0.5) * 26;
            pos.array[i * 3 + 2] = (Math.random() - 0.5) * 12 + 1.5;
          }

          // Gentle sine wave drift
          pos.array[i * 3] += Math.sin(elapsed * 0.4 + i) * 0.006;
        }
        pos.needsUpdate = true;
      }

      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      this.isVisible = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.clothMesh) {
        this.clothMesh.geometry.dispose();
        this.clothMesh.material.dispose();
      }
      if (this.wireMesh) {
        this.wireMesh.material.dispose();
      }
      if (this.particles) {
        this.particles.geometry.dispose();
        this.particles.material.dispose();
      }
      if (this.renderer) {
        this.renderer.dispose();
      }
    }
  }

  // Auto-initialize when DOM is ready
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
