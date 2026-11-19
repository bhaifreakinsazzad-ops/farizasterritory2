/**
 * ThreeUI.js — 3D Spatial Interface, HUD Telemetry & Interactive Widget Toolkit for Three.js
 * Purpose-built for Fariza's Territory Boutique Command Cockpit
 * Features:
 *   - High-DPI Canvas2D -> THREE.CanvasTexture spatial HUD panels (SRGBColorSpace + max anisotropy)
 *   - Procedural 3D radial arc gauges, telemetry cards, and spatial data pillars
 *   - Raycast hit-testing with pointer cursor & hover state management
 *   - Zero external font/image 404 dependencies
 */
(function (window, document) {
  'use strict';

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function applyTextureColorSpace(texture, renderer) {
    if (!texture || typeof THREE === 'undefined') return texture;
    if ('SRGBColorSpace' in THREE) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else if ('sRGBEncoding' in THREE) {
      texture.encoding = THREE.sRGBEncoding;
    }
    if (renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    texture.needsUpdate = true;
    return texture;
  }

  class SpatialCanvasPanel {
    constructor(options) {
      this.opts = Object.assign({
        width: 512,
        height: 256,
        worldWidth: 2.8,
        worldHeight: 1.4,
        title: 'TELEMETRY',
        value: '0',
        subtitle: '',
        accentColor: '#C6952B',
        bgColor: 'rgba(24, 22, 20, 0.92)',
        textColor: '#FDF0DD',
        mutedColor: 'rgba(253, 240, 221, 0.68)',
        renderer: null,
        userData: {}
      }, options || {});

      this.canvas = document.createElement('canvas');
      this.canvas.width = this.opts.width;
      this.canvas.height = this.opts.height;
      this.ctx = this.canvas.getContext('2d');

      this.texture = new THREE.CanvasTexture(this.canvas);
      applyTextureColorSpace(this.texture, this.opts.renderer);

      this.material = new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      this.geometry = new THREE.PlaneGeometry(this.opts.worldWidth, this.opts.worldHeight);
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.mesh.userData = Object.assign({ isThreeUI: true, panel: this }, this.opts.userData);

      this.hovered = false;
      this.draw();
    }

    update(newProps) {
      Object.assign(this.opts, newProps || {});
      this.draw();
    }

    setHovered(state) {
      if (this.hovered !== state) {
        this.hovered = state;
        this.draw();
      }
    }

    draw() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const accent = this.opts.accentColor || '#C6952B';

      ctx.clearRect(0, 0, w, h);

      // Card surface
      roundRect(ctx, 8, 8, w - 16, h - 16, 22);
      ctx.fillStyle = this.hovered ? 'rgba(38, 35, 32, 0.96)' : this.opts.bgColor;
      ctx.fill();

      // Hairline border
      ctx.lineWidth = this.hovered ? 4 : 2;
      ctx.strokeStyle = this.hovered ? accent : 'rgba(253, 240, 221, 0.18)';
      ctx.stroke();

      // Top accent bar
      ctx.save();
      roundRect(ctx, 28, 22, 56, 6, 3);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.restore();

      // Title
      ctx.fillStyle = this.opts.mutedColor;
      ctx.font = '600 22px "Plus Jakarta Sans", "Actor", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(String(this.opts.title || '').slice(0, 28), 28, 42);

      // Primary value
      ctx.fillStyle = this.opts.textColor;
      ctx.font = '700 54px "JetBrains Mono", monospace';
      ctx.fillText(String(this.opts.value || ''), 28, 82);

      // Subtitle / footer metadata
      if (this.opts.subtitle) {
        ctx.fillStyle = accent;
        ctx.font = '500 22px "Plus Jakarta Sans", "Actor", sans-serif';
        ctx.fillText(String(this.opts.subtitle || '').slice(0, 34), 28, h - 54);
      }

      if (this.opts.badge) {
        const badgeText = String(this.opts.badge);
        ctx.font = '600 20px "JetBrains Mono", monospace';
        const tw = ctx.measureText(badgeText).width;
        const bx = w - tw - 52;
        const by = 28;
        roundRect(ctx, bx, by, tw + 24, 34, 8);
        ctx.fillStyle = 'rgba(198, 149, 43, 0.18)';
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillText(badgeText, bx + 12, by + 7);
      }

      this.texture.needsUpdate = true;
    }

    dispose() {
      if (this.geometry) this.geometry.dispose();
      if (this.material) this.material.dispose();
      if (this.texture) this.texture.dispose();
    }
  }

  class SpatialDialGauge {
    constructor(options) {
      this.opts = Object.assign({
        size: 512,
        worldSize: 3.1,
        label: 'STORE HEALTH',
        valueText: '100%',
        subText: '53 SKUs Active',
        progress: 0.85,
        accentColor: '#C6952B',
        secondaryColor: '#D1803A',
        renderer: null,
        userData: {}
      }, options || {});

      this.canvas = document.createElement('canvas');
      this.canvas.width = this.opts.size;
      this.canvas.height = this.opts.size;
      this.ctx = this.canvas.getContext('2d');

      this.texture = new THREE.CanvasTexture(this.canvas);
      applyTextureColorSpace(this.texture, this.opts.renderer);

      this.material = new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      this.geometry = new THREE.PlaneGeometry(this.opts.worldSize, this.opts.worldSize);
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.mesh.userData = Object.assign({ isThreeUI: true, dial: this }, this.opts.userData);

      this.draw();
    }

    update(newProps) {
      Object.assign(this.opts, newProps || {});
      this.draw();
    }

    draw() {
      const ctx = this.ctx;
      const s = this.canvas.width;
      const cx = s / 2;
      const cy = s / 2;
      const r = s * 0.38;

      ctx.clearRect(0, 0, s, s);

      // Dark glass backing disc
      ctx.beginPath();
      ctx.arc(cx, cy, r + 28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 19, 18, 0.88)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(253, 240, 221, 0.14)';
      ctx.stroke();

      // Track ring
      const startAngle = Math.PI * 0.75;
      const endAngle = Math.PI * 2.25;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(253, 240, 221, 0.1)';
      ctx.stroke();

      // Progress arc
      const clamped = Math.max(0.02, Math.min(1, Number(this.opts.progress || 0)));
      const progAngle = startAngle + (endAngle - startAngle) * clamped;
      const grad = ctx.createLinearGradient(0, 0, s, s);
      grad.addColorStop(0, this.opts.accentColor || '#C6952B');
      grad.addColorStop(1, this.opts.secondaryColor || '#D1803A');

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, progAngle);
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.strokeStyle = grad;
      ctx.stroke();

      // Tick marks
      const ticks = 24;
      for (let i = 0; i <= ticks; i++) {
        const a = startAngle + ((endAngle - startAngle) * i) / ticks;
        const inner = r - 26;
        const outer = r - 18;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.lineWidth = i % 4 === 0 ? 3 : 1.5;
        ctx.strokeStyle = i / ticks <= clamped ? 'rgba(198, 149, 43, 0.75)' : 'rgba(253, 240, 221, 0.15)';
        ctx.stroke();
      }

      // Center typography
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = 'rgba(253, 240, 221, 0.64)';
      ctx.font = '600 20px "Plus Jakarta Sans", "Actor", sans-serif';
      ctx.fillText(String(this.opts.label || ''), cx, cy - 52);

      ctx.fillStyle = '#FDF0DD';
      ctx.font = '700 52px "JetBrains Mono", monospace';
      ctx.fillText(String(this.opts.valueText || ''), cx, cy + 4);

      ctx.fillStyle = this.opts.accentColor || '#C6952B';
      ctx.font = '500 21px "Plus Jakarta Sans", "Actor", sans-serif';
      ctx.fillText(String(this.opts.subText || ''), cx, cy + 62);

      this.texture.needsUpdate = true;
    }

    dispose() {
      if (this.geometry) this.geometry.dispose();
      if (this.material) this.material.dispose();
      if (this.texture) this.texture.dispose();
    }
  }

  /**
   * Builds a 3-to-5 part composite procedural 3D Telemetry Pillar (THREE.Group)
   * Grounded at y = 0 with base plinth, metallic collar, core bar, crown cap, and floating ThreeUI label
   */
  function createCompositePillar(options) {
    const opts = Object.assign({
      height: 2.0,
      radius: 0.34,
      color: 0xC6952B,
      brassColor: 0xD1803A,
      title: 'Col 01',
      value: '5 SKUs',
      subtitle: '100% Live',
      badge: '01',
      renderer: null,
      userData: {}
    }, options || {});

    const group = new THREE.Group();
    group.userData = Object.assign({ isCompositePillar: true }, opts.userData);

    // 1. Primary Silhouette: Stepped Obsidian & Brass Plinth Base (grounded at y=0)
    const plinthGeo = new THREE.CylinderGeometry(opts.radius * 1.35, opts.radius * 1.5, 0.18, 24);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x242220,
      metalness: 0.75,
      roughness: 0.32
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.09;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // 2. Secondary Read: Brushed Brass Collar Ring
    const collarGeo = new THREE.TorusGeometry(opts.radius * 1.15, 0.035, 12, 32);
    const brassMat = new THREE.MeshStandardMaterial({
      color: opts.brassColor,
      metalness: 0.9,
      roughness: 0.2
    });
    const collar = new THREE.Mesh(collarGeo, brassMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.19;
    group.add(collar);

    // 3. Core Column Body (scaled dynamically on Y)
    const h = Math.max(0.35, Number(opts.height || 1.5));
    const bodyGeo = new THREE.CylinderGeometry(opts.radius * 0.92, opts.radius, 1.0, 24);
    // Shift geometry so pivot is at bottom of cylinder
    bodyGeo.translate(0, 0.5, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: opts.color,
      metalness: 0.48,
      roughness: 0.45
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.18;
    bodyMesh.scale.y = h;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.userData = Object.assign({ isThreeUI: true, pillarGroup: group }, opts.userData);
    group.add(bodyMesh);

    // 4. Accent Detail: Beveled Crown Cap & Finial Gem
    const capGroup = new THREE.Group();
    capGroup.position.y = 0.18 + h;

    const capGeo = new THREE.CylinderGeometry(opts.radius * 1.08, opts.radius * 0.95, 0.1, 24);
    const capMesh = new THREE.Mesh(capGeo, brassMat);
    capMesh.position.y = 0.05;
    capGroup.add(capMesh);

    const gemGeo = new THREE.OctahedronGeometry(opts.radius * 0.32, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xFDF0DD,
      metalness: 0.85,
      roughness: 0.15
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.y = 0.24;
    capGroup.add(gemMesh);
    group.add(capGroup);

    // 5. Floating ThreeUI Spatial Telemetry Card above pillar
    const card = new SpatialCanvasPanel({
      width: 384,
      height: 192,
      worldWidth: 1.55,
      worldHeight: 0.78,
      title: opts.title,
      value: opts.value,
      subtitle: opts.subtitle,
      badge: opts.badge,
      accentColor: '#' + new THREE.Color(opts.color).getHexString(),
      renderer: opts.renderer,
      userData: Object.assign({ pillarGroup: group }, opts.userData)
    });
    card.mesh.position.set(0, 0.18 + h + 0.82, 0.15);
    group.add(card.mesh);

    group.userData.parts = {
      plinth,
      collar,
      bodyMesh,
      capGroup,
      gemMesh,
      card,
      targetHeight: h,
      currentHeight: h
    };

    group.setHeight = function (newH) {
      group.userData.parts.targetHeight = Math.max(0.35, Number(newH || 1));
    };

    group.tick = function (delta, elapsed) {
      const p = group.userData.parts;
      const damp = THREE.MathUtils && THREE.MathUtils.damp
        ? THREE.MathUtils.damp
        : (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
      p.currentHeight = damp(p.currentHeight, p.targetHeight, 6.0, delta);
      p.bodyMesh.scale.y = p.currentHeight;
      p.capGroup.position.y = 0.18 + p.currentHeight;
      p.gemMesh.rotation.y = elapsed * 1.2;
      p.card.mesh.position.y = 0.18 + p.currentHeight + 0.82 + Math.sin(elapsed * 1.8 + (opts.index || 0)) * 0.04;
    };

    group.dispose = function () {
      plinthGeo.dispose();
      plinthMat.dispose();
      collarGeo.dispose();
      brassMat.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      capGeo.dispose();
      gemGeo.dispose();
      gemMat.dispose();
      card.dispose();
    };

    return group;
  }

  /**
   * procedural radial contact shadow texture for grounding 3D cockpit assemblies
   */
  function createContactShadowMesh(width, depth, opacity) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: opacity !== undefined ? opacity : 0.48,
      depthWrite: false
    });
    const geo = new THREE.PlaneGeometry(width || 16, depth || 8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01;
    mesh.dispose = function () {
      geo.dispose();
      mat.dispose();
      tex.dispose();
    };
    return mesh;
  }

  window.ThreeUI = {
    SpatialCanvasPanel,
    SpatialDialGauge,
    createCompositePillar,
    createContactShadowMesh,
    applyTextureColorSpace
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ThreeUI;
  }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : {});

