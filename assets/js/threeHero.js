/**
 * Fariza's Territory — Interactive 3D Luxury Silk & Gold Thread Canvas
 * Library: Three.js (r128)
 * Theme: Shimmering Silk Wave, Golden Jamdani Thread & Haute Couture Dust Particles
 * Palette: Obsidian Black #1E1D1C, Parchment Cream #FDF0DD, Caramel Gold #D1803A, Chestnut #794722
 */

(function (window, document) {
  'use strict';

  // Check if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class ThreeHeroBackground {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      // Check for WebGL support
      if (!this.isWebGLAvailable()) {
        console.warn('WebGL not available for 3D Hero canvas.');
        return;
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.clothMesh = null;
      this.particles = null;
      this.clock = null;
      this.animationFrameId = null;
      this.isVisible = true;

      // Interaction coordinates
      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
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
      this.scene.fog = new THREE.FogExp2(0xFDF0DD, 0.035);

      // 2. Camera setup
      const fov = 45;
      const aspect = this.canvas.clientWidth / this.canvas.clientHeight || 1;
      this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
      this.camera.position.set(0, 0, 14);

      // 3. Renderer setup with clamped pixel ratio for silky smooth 60fps
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;

      // 4. Lighting - warm golden sunlight & soft caramel bounce
      const ambientLight = new THREE.AmbientLight(0xFDF0DD, 0.85);
      this.scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xD1803A, 1.4); // Caramel Gold key light
      dirLight1.position.set(5, 8, 7);
      this.scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x8E3B66, 0.6); // Soft Magenta rim light
      dirLight2.position.set(-6, -4, 5);
      this.scene.add(dirLight2);

      const pointLight = new THREE.PointLight(0xF6E5CA, 1.2, 20); // Warm highlight
      pointLight.position.set(0, 2, 8);
      this.scene.add(pointLight);

      // 5. Create Luxurious Undulating Silk Geometry
      this.createSilkCloth();

      // 6. Create Shimmering Gold & Caramel Dust Particles
      this.createGoldDust();

      // 7. Clock & Event listeners
      this.clock = new THREE.Clock();

      this.bindEvents();
      this.setupIntersectionObserver();

      // 8. Start loop
      this.animate();
    }

    createSilkCloth() {
      // High-density grid for flowing silk drape
      const segmentsX = 48;
      const segmentsY = 32;
      const width = 24;
      const height = 16;

      const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);

      // Cache initial vertex positions
      const pos = geometry.attributes.position;
      this.originalPositions = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count * 3; i++) {
        this.originalPositions[i] = pos.array[i];
      }

      // Shimmering silk material with custom specular sheen
      const material = new THREE.MeshStandardMaterial({
        color: 0xF6E5CA,
        roughness: 0.38,
        metalness: 0.25,
        side: THREE.DoubleSide,
        wireframe: false,
        transparent: true,
        opacity: 0.88
      });

      this.clothMesh = new THREE.Mesh(geometry, material);
      this.clothMesh.rotation.x = -0.35;
      this.clothMesh.rotation.z = -0.08;
      this.clothMesh.position.set(1.5, -0.5, 0);
      this.scene.add(this.clothMesh);

      // Subtle fine gold wireframe lattice (Jamdani weave motif)
      const wireMaterial = new THREE.MeshBasicMaterial({
        color: 0xD1803A,
        wireframe: true,
        transparent: true,
        opacity: 0.18
      });
      const wireMesh = new THREE.Mesh(geometry, wireMaterial);
      this.clothMesh.add(wireMesh);
    }

    createGoldDust() {
      const particleCount = 220;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const scales = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 22;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10 + 2;
        scales[i] = Math.random() * 0.8 + 0.2;
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeo.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

      // Circular soft golden particles
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(209, 128, 58, 1)');
      grad.addColorStop(0.4, 'rgba(246, 229, 202, 0.7)');
      grad.addColorStop(1, 'rgba(253, 240, 221, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);

      const texture = new THREE.CanvasTexture(canvas);

      const particleMat = new THREE.PointsMaterial({
        size: 0.28,
        map: texture,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.particles = new THREE.Points(particleGeo, particleMat);
      this.scene.add(this.particles);
    }

    bindEvents() {
      // Resize handling
      window.addEventListener('resize', () => this.onResize(), { passive: true });

      // Cursor parallax tracking
      const heroEl = document.querySelector('.hero') || document.body;
      heroEl.addEventListener('mousemove', (e) => {
        this.mouse.targetX = (e.clientX - this.windowHalf.x) * 0.0008;
        this.mouse.targetY = (e.clientY - this.windowHalf.y) * 0.0008;
      }, { passive: true });

      // Touch / Gyro tilt tracking for mobile devices
      heroEl.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          this.mouse.targetX = (t.clientX - this.windowHalf.x) * 0.001;
          this.mouse.targetY = (t.clientY - this.windowHalf.y) * 0.001;
        }
      }, { passive: true });
    }

    setupIntersectionObserver() {
      // Pause render loop when scrolled off viewport to conserve GPU & battery
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
    }

    onResize() {
      if (!this.canvas || !this.renderer || !this.camera) return;
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height, false);
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

      // Smooth mouse lerp
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.06;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.06;

      // Parallax camera tilt
      this.camera.position.x = this.mouse.x * 3.5;
      this.camera.position.y = -this.mouse.y * 2.5;
      this.camera.lookAt(0, 0, 0);

      // Undulating silk wave animation (degraded smoothly if prefersReducedMotion)
      if (this.clothMesh && this.clothMesh.geometry) {
        const pos = this.clothMesh.geometry.attributes.position;
        const count = pos.count;
        const speed = prefersReducedMotion ? 0.05 : 0.85;

        for (let i = 0; i < count; i++) {
          const u = this.originalPositions[i * 3];
          const v = this.originalPositions[i * 3 + 1];

          // Complex layered sine/cosine wave simulating silk fabric drape
          const wave1 = Math.sin(u * 0.45 + elapsed * speed) * 0.65;
          const wave2 = Math.cos(v * 0.55 + elapsed * speed * 0.8) * 0.45;
          const wave3 = Math.sin((u + v) * 0.35 + elapsed * speed * 1.2) * 0.3;

          // Interactive ripple from mouse
          const distToMouse = Math.sqrt(Math.pow(u - this.mouse.x * 12, 2) + Math.pow(v - this.mouse.y * 12, 2));
          const mouseRipple = Math.sin(distToMouse * 0.8 - elapsed * 2) * Math.max(0, 1 - distToMouse * 0.12) * 0.25;

          pos.array[i * 3 + 2] = this.originalPositions[i * 3 + 2] + wave1 + wave2 + wave3 + mouseRipple;
        }

        pos.needsUpdate = true;
        this.clothMesh.geometry.computeVertexNormals();

        // Gentle mesh breathing rotation
        this.clothMesh.rotation.y = Math.sin(elapsed * 0.2) * 0.04;
      }

      // Shimmering dust particles drift
      if (this.particles) {
        const pos = this.particles.geometry.attributes.position;
        const pSpeed = prefersReducedMotion ? 0.02 : 0.08;
        for (let i = 0; i < pos.count; i++) {
          pos.array[i * 3 + 1] -= pSpeed * 0.15;
          // Recycle particles from bottom to top
          if (pos.array[i * 3 + 1] < -8) {
            pos.array[i * 3 + 1] = 8;
          }
          pos.array[i * 3] += Math.sin(elapsed * 0.4 + i) * 0.005;
        }
        pos.needsUpdate = true;
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  // Auto-initialize when DOM is ready
  function initThreeHero() {
    const canvas = document.getElementById('hero-3d-canvas');
    if (canvas && typeof THREE !== 'undefined') {
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
