/**
 * Fariza's Territory — 3D Store Operations Cockpit & SKU Turntable Engine
 * Built with Three.js + ThreeUI.js + Anime.js + Motion.dev
 * Modes:
 *   1. 'collections' — 8-Collection Inventory & Feed Readiness 3D Pillars
 *   2. 'pipeline'    — Order Fulfillment & Server Purchase CAPI Orbital Instrument
 *   3. 'logistics'   — Inside Dhaka (৳80) vs Outside Dhaka (৳150) Dispatch Radar
 * Plus:
 *   - Interactive 3D SKU Inspector Turntable inside the Product Approval Modal
 */
(function (window, document) {
  'use strict';

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const COLLECTION_COLORS = [
    0x9B3B5A, // 01 Aarong Label
    0x1F6E66, // 02 Alfi Boutique
    0x8C587A, // 03 Mome Boutique
    0x2B4C7E, // 04 Zam Zam Swiss Lawn
    0xC6952B, // 05 Cotton Mirror Embroidery
    0xD1803A, // 06 Decorative Mirrors
    0xB85D3B, // 07 Pendants & Jewelry
    0x3A7D5C  // 08 Bangles & Accessories
  ];

  // Pre-allocated vectors for zero-GC raycasting and damping
  let _pointerNDC = null;
  let _raycaster = null;

  function ensureSharedMath() {
    if (typeof THREE === 'undefined') return;
    if (!_pointerNDC) _pointerNDC = new THREE.Vector2();
    if (!_raycaster) _raycaster = new THREE.Raycaster();
  }

  class AdminCockpit3D {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas || typeof THREE === 'undefined' || !window.ThreeUI) return;

      ensureSharedMath();

      this.mode = 'collections'; // 'collections' | 'pipeline' | 'logistics'
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.clock = null;
      this.frameId = 0;
      this.isVisible = true;
      this.isPaused = false;
      this.destroyed = false;
      this.contextLost = false;
      this.resizeTimer = null;
      this.boundCleanup = [];

      this.rootGroup = null;
      this.collectionsGroup = null;
      this.pipelineGroup = null;
      this.logisticsGroup = null;

      this.pillarMeshes = [];
      this.interactiveMeshes = [];
      this.hoveredPanel = null;

      this.cameraTargetPos = new THREE.Vector3(0, 3.1, 9.6);
      this.cameraLookAt = new THREE.Vector3(0, 1.35, 0);
      this.pointerOffset = { x: 0, y: 0, targetX: 0, targetY: 0 };

      this.telemetry = {
        orders: [],
        products: []
      };

      this.init();
    }

    init() {
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x141312, 0.042);

      const w = this.canvas.clientWidth || 960;
      const h = this.canvas.clientHeight || 280;
      this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 80);
      this.camera.position.copy(this.cameraTargetPos);
      this.camera.lookAt(this.cameraLookAt);

      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: !isSoftwareGl,
          alpha: true,
          powerPreference: 'high-performance'
        });
      } catch (err) {
        console.warn('[AdminCockpit3D] WebGL unavailable, falling back:', err.message);
        this.failed = true;
        return;
      }
      this.renderer.setSize(w, h, false);
      this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      if ('SRGBColorSpace' in THREE) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ('sRGBEncoding' in THREE) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      } else if ('sRGBEncoding' in THREE) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }
      this.renderer.shadowMap.enabled = !isSoftwareGl;
      if (THREE.PCFSoftShadowMap) {
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      // Studio 3-point warm/cool lighting rig
      const hemi = new THREE.HemisphereLight(0xFDF0DD, 0x1E1D1B, 0.9);
      this.scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xF6D392, 1.45);
      keyLight.position.set(6, 9, 7);
      if (!isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 1;
        keyLight.shadow.camera.far = 25;
        const d = 9;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.bias = -0.0005;
      }
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x6495ED, 0.55);
      fillLight.position.set(-7, 4, 4);
      this.scene.add(fillLight);

      const rimLight = new THREE.PointLight(0xD1803A, 1.15, 22);
      rimLight.position.set(0, 4.5, -4);
      this.scene.add(rimLight);

      this.rootGroup = new THREE.Group();
      this.scene.add(this.rootGroup);

      // Grounding stage floor & radial contact shadow
      this.createCockpitFloor();

      // Build the 3 spatial instrument assemblies
      this.collectionsGroup = new THREE.Group();
      this.pipelineGroup = new THREE.Group();
      this.logisticsGroup = new THREE.Group();

      this.rootGroup.add(this.collectionsGroup);
      this.rootGroup.add(this.pipelineGroup);
      this.rootGroup.add(this.logisticsGroup);

      this.buildCollectionsAssembly();
      this.buildPipelineAssembly();
      this.buildLogisticsAssembly();
      this.setMode('collections');

      this.clock = new THREE.Clock();
      this.bindEvents();
      this.scheduleNextFrame();
    }

    createCockpitFloor() {
      const shadowMesh = window.ThreeUI.createContactShadowMesh(18, 8, 0.55);
      this.rootGroup.add(shadowMesh);

      // Subtle architectural brass grid platform (with polygonOffset to prevent Z-fighting)
      const platformGeo = new THREE.CylinderGeometry(7.8, 8.1, 0.08, 64);
      const platformMat = new THREE.MeshStandardMaterial({
        color: 0x1A1917,
        metalness: 0.65,
        roughness: 0.4,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.y = -0.04;
      platform.receiveShadow = true;
      this.rootGroup.add(platform);

      const ringGeo = new THREE.TorusGeometry(7.85, 0.025, 12, 96);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xC6952B,
        metalness: 0.88,
        roughness: 0.22
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.015;
      this.rootGroup.add(ring);
    }

    buildCollectionsAssembly() {
      this.pillarMeshes = [];
      const collections = (window.FT_CATALOG && window.FT_CATALOG.COLLECTIONS) || [];
      const products = (window.FT_CATALOG && window.FT_CATALOG.PRODUCTS) || [];
      const count = collections.length || 8;
      const spacing = 1.62;
      const startX = -((count - 1) * spacing) / 2;

      for (let i = 0; i < count; i++) {
        const col = collections[i] || { id: String(i + 1).padStart(2, '0'), short: `Col ${i + 1}`, name: `Collection ${i + 1}` };
        const colProducts = products.filter(p => (p.colId || p.col) === col.id);
        const skuCount = colProducts.length || 1;
        const normHeight = 0.55 + Math.min(2.1, (skuCount / 19) * 1.95);

        const pillar = window.ThreeUI.createCompositePillar({
          index: i,
          height: normHeight,
          radius: 0.34,
          color: COLLECTION_COLORS[i % COLLECTION_COLORS.length],
          title: col.short || col.name,
          value: `${skuCount} SKUs`,
          subtitle: 'Click to Filter',
          badge: col.id,
          renderer: this.renderer,
          userData: {
            action: 'filter-collection',
            colId: col.id,
            colName: col.name
          }
        });

        // Subtle arc arrangement like a curved cockpit console
        const x = startX + i * spacing;
        const z = -Math.abs(x) * 0.12;
        pillar.position.set(x, 0, z);
        pillar.rotation.y = -x * 0.045;

        this.collectionsGroup.add(pillar);
        this.pillarMeshes.push(pillar);
      }
    }

    buildPipelineAssembly() {
      // Central ThreeUI Dial Gauge
      this.pipelineDial = new window.ThreeUI.SpatialDialGauge({
        size: 512,
        worldSize: 2.85,
        label: 'ORDER PIPELINE',
        valueText: '৳ 0',
        subText: '0 Orders Active',
        progress: 0.78,
        accentColor: '#C6952B',
        secondaryColor: '#27AE60',
        renderer: this.renderer,
        userData: { action: 'filter-status', status: 'all' }
      });
      this.pipelineDial.mesh.position.set(0, 1.55, 0.2);
      this.pipelineGroup.add(this.pipelineDial.mesh);

      // 3D Sculpted Brass Gyroscope Rings around the Central Dial
      const outerGyro = new THREE.Mesh(
        new THREE.TorusGeometry(1.62, 0.035, 16, 72),
        new THREE.MeshStandardMaterial({ color: 0xC6952B, metalness: 0.88, roughness: 0.2 })
      );
      outerGyro.position.set(0, 1.55, 0.15);
      this.pipelineOuterGyro = outerGyro;
      this.pipelineGroup.add(outerGyro);

      const innerGyro = new THREE.Mesh(
        new THREE.TorusGeometry(1.48, 0.022, 12, 64),
        new THREE.MeshStandardMaterial({ color: 0xD1803A, metalness: 0.82, roughness: 0.28 })
      );
      innerGyro.position.set(0, 1.55, 0.15);
      this.pipelineInnerGyro = innerGyro;
      this.pipelineGroup.add(innerGyro);

      // 4 Flanking Stage Telemetry Cards (Pending, Confirmed CAPI, In Transit, Delivered)
      const stages = [
        { key: 'pending', title: 'PENDING VERIFY', x: -4.2, y: 2.05, z: 0.4, color: '#C6952B', badge: 'STEP 01' },
        { key: 'confirmed', title: 'CONFIRMED · CAPI', x: -4.2, y: 0.85, z: 0.4, color: '#38BDF8', badge: 'STEP 02' },
        { key: 'shipped', title: 'COURIER TRANSIT', x: 4.2, y: 2.05, z: 0.4, color: '#A855F7', badge: 'STEP 03' },
        { key: 'delivered', title: 'DELIVERED COD', x: 4.2, y: 0.85, z: 0.4, color: '#2ECC71', badge: 'STEP 04' }
      ];

      this.pipelineCards = {};
      stages.forEach(st => {
        const panel = new window.ThreeUI.SpatialCanvasPanel({
          width: 440,
          height: 200,
          worldWidth: 2.55,
          worldHeight: 1.05,
          title: st.title,
          value: '0 Orders',
          subtitle: 'Click to filter stage',
          badge: st.badge,
          accentColor: st.color,
          renderer: this.renderer,
          userData: { action: 'filter-status', status: st.key }
        });
        panel.mesh.position.set(st.x, st.y, st.z);
        panel.mesh.rotation.y = st.x < 0 ? 0.16 : -0.16;
        this.pipelineGroup.add(panel.mesh);
        this.pipelineCards[st.key] = panel;
      });
    }

    buildLogisticsAssembly() {
      // Left Pillar: Inside Dhaka (৳80)
      this.dhakaPillar = window.ThreeUI.createCompositePillar({
        index: 0,
        height: 1.8,
        radius: 0.55,
        color: 0xC6952B,
        title: 'INSIDE DHAKA (৳80)',
        value: '0 Orders',
        subtitle: 'Same/Next-Day Hub',
        badge: 'DHAKA',
        renderer: this.renderer,
        userData: { action: 'filter-zone', zone: 'dhaka' }
      });
      this.dhakaPillar.position.set(-3.1, 0, 0.2);
      this.dhakaPillar.rotation.y = 0.12;
      this.logisticsGroup.add(this.dhakaPillar);

      // Center Dial: Free Shipping & Steadfast/Pathao Dispatch Readiness
      this.logisticsDial = new window.ThreeUI.SpatialDialGauge({
        size: 512,
        worldSize: 2.75,
        label: 'DISPATCH & FEED',
        valueText: '53 SKUs',
        subText: 'Steadfast & Pathao Ready',
        progress: 0.9,
        accentColor: '#2ECC71',
        secondaryColor: '#C6952B',
        renderer: this.renderer,
        userData: { action: 'open-tab', tab: 'courier' }
      });
      this.logisticsDial.mesh.position.set(0, 1.55, 0.1);
      this.logisticsGroup.add(this.logisticsDial.mesh);

      // Right Pillar: Outside Dhaka (৳150)
      this.outsidePillar = window.ThreeUI.createCompositePillar({
        index: 1,
        height: 1.4,
        radius: 0.55,
        color: 0x2B6CB0,
        title: 'OUTSIDE DHAKA (৳150)',
        value: '0 Orders',
        subtitle: '64 Districts Nationwide',
        badge: 'NATIONWIDE',
        renderer: this.renderer,
        userData: { action: 'filter-zone', zone: 'outside_dhaka' }
      });
      this.outsidePillar.position.set(3.1, 0, 0.2);
      this.outsidePillar.rotation.y = -0.12;
      this.logisticsGroup.add(this.outsidePillar);
    }

    setMode(mode) {
      if (!['collections', 'pipeline', 'logistics'].includes(mode)) return;
      this.mode = mode;

      this.collectionsGroup.visible = mode === 'collections';
      this.pipelineGroup.visible = mode === 'pipeline';
      this.logisticsGroup.visible = mode === 'logistics';

      if (mode === 'collections') {
        this.cameraTargetPos.set(0, 3.05, 9.6);
      } else if (mode === 'pipeline') {
        this.cameraTargetPos.set(0, 2.25, 8.2);
      } else {
        this.cameraTargetPos.set(0, 2.55, 8.6);
      }

      this.rebuildInteractiveList();
    }

    rebuildInteractiveList() {
      this.interactiveMeshes = [];
      const activeGroup =
        this.mode === 'collections'
          ? this.collectionsGroup
          : this.mode === 'pipeline'
          ? this.pipelineGroup
          : this.logisticsGroup;

      if (!activeGroup) return;
      activeGroup.traverse(obj => {
        if (obj.isMesh && obj.userData && obj.userData.isThreeUI) {
          this.interactiveMeshes.push(obj);
        }
      });
    }

    updateTelemetry(data) {
      const orders = Array.isArray(data && data.orders) ? data.orders : this.telemetry.orders;
      const products = Array.isArray(data && data.products)
        ? data.products
        : (window.FT_CATALOG && window.FT_CATALOG.PRODUCTS) || [];

      this.telemetry.orders = orders;
      this.telemetry.products = products;

      // 1. Update Collections 3D Towers
      const collections = (window.FT_CATALOG && window.FT_CATALOG.COLLECTIONS) || [];
      this.pillarMeshes.forEach((pillar, idx) => {
        const col = collections[idx];
        if (!col) return;
        const colProds = products.filter(p => (p.colId || p.col) === col.id);
        const liveCount = colProds.filter(p => p.is_available !== false).length;
        const feedCount = colProds.filter(p => p.feed_eligible).length;
        const targetH = 0.55 + Math.min(2.1, (colProds.length / 19) * 1.9 + (feedCount / Math.max(1, colProds.length)) * 0.25);
        pillar.setHeight(targetH);
        if (pillar.userData.parts && pillar.userData.parts.card) {
          pillar.userData.parts.card.update({
            title: col.short || col.name,
            value: `${liveCount}/${colProds.length} Live`,
            subtitle: `${feedCount} Feed Verified`,
            badge: `COL ${col.id}`
          });
        }
      });

      // 2. Update Pipeline 3D Orbital
      const totalRev = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const counts = {
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed' || o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length
      };
      const capiSentCount = orders.filter(o => o.purchase_capi_sent_at).length;

      if (this.pipelineDial) {
        const fulfilledRatio = orders.length > 0
          ? (counts.confirmed + counts.shipped + counts.delivered) / orders.length
          : 0.85;
        this.pipelineDial.update({
          label: 'GROSS COD VOLUME',
          valueText: `৳ ${totalRev.toLocaleString('en-US')}`,
          subText: `${orders.length} Orders · ${capiSentCount} CAPI Sent`,
          progress: Math.max(0.12, fulfilledRatio)
        });
      }

      if (this.pipelineCards) {
        if (this.pipelineCards.pending) {
          this.pipelineCards.pending.update({
            value: `${counts.pending} Orders`,
            subtitle: counts.pending > 0 ? 'Awaiting Verification' : 'Queue Clear ✓'
          });
        }
        if (this.pipelineCards.confirmed) {
          this.pipelineCards.confirmed.update({
            value: `${counts.confirmed} Orders`,
            subtitle: `${capiSentCount} Server CAPI Fired`
          });
        }
        if (this.pipelineCards.shipped) {
          this.pipelineCards.shipped.update({
            value: `${counts.shipped} Parcels`,
            subtitle: 'Steadfast & Pathao'
          });
        }
        if (this.pipelineCards.delivered) {
          this.pipelineCards.delivered.update({
            value: `${counts.delivered} Completed`,
            subtitle: 'COD Collected'
          });
        }
      }

      // 3. Update Logistics 3D Radar
      const dhakaOrders = orders.filter(o => {
        const z = window.FT_COMMERCE ? window.FT_COMMERCE.normalizeZone(o.delivery_zone, o.customer_district) : (o.delivery_zone || 'dhaka');
        return z === 'dhaka';
      });
      const outsideOrders = orders.filter(o => {
        const z = window.FT_COMMERCE ? window.FT_COMMERCE.normalizeZone(o.delivery_zone, o.customer_district) : (o.delivery_zone || 'dhaka');
        return z !== 'dhaka';
      });

      const dhakaRev = dhakaOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const outsideRev = outsideOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

      if (this.dhakaPillar) {
        const h1 = 0.75 + Math.min(1.8, (dhakaOrders.length / Math.max(1, orders.length)) * 1.8);
        this.dhakaPillar.setHeight(h1);
        this.dhakaPillar.userData.parts.card.update({
          value: `${dhakaOrders.length} Orders`,
          subtitle: `৳ ${dhakaRev.toLocaleString('en-US')} COD`
        });
      }
      if (this.outsidePillar) {
        const h2 = 0.75 + Math.min(1.8, (outsideOrders.length / Math.max(1, orders.length)) * 1.8);
        this.outsidePillar.setHeight(h2);
        this.outsidePillar.userData.parts.card.update({
          value: `${outsideOrders.length} Orders`,
          subtitle: `৳ ${outsideRev.toLocaleString('en-US')} COD`
        });
      }
      if (this.logisticsDial) {
        const feedReady = products.filter(p => p.feed_eligible).length;
        this.logisticsDial.update({
          label: 'META FEED READY',
          valueText: `${feedReady} / ${products.length}`,
          subText: 'Verified SKUs Active',
          progress: Math.max(0.1, feedReady / Math.max(1, products.length))
        });
      }
    }

    bindEvents() {
      const addListener = (target, type, fn, opts) => {
        target.addEventListener(type, fn, opts);
        this.boundCleanup.push(() => target.removeEventListener(type, fn, opts));
      };

      addListener(window, 'resize', () => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.onResize(), 80);
      }, { passive: true });

      addListener(document, 'visibilitychange', () => {
        if (this.destroyed) return;
        this.isVisible = !document.hidden;
        if (this.isVisible && !this.isPaused && !this.contextLost) {
          this.clock.start();
          this.scheduleNextFrame();
        } else {
          this.stopLoop();
        }
      });

      let lastRaycastTime = 0;
      addListener(this.canvas, 'pointermove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
        const ny = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
        this.pointerOffset.targetX = nx * 0.65;
        this.pointerOffset.targetY = ny * 0.25;

        const now = performance.now();
        if (now - lastRaycastTime < 32) return;
        lastRaycastTime = now;

        _pointerNDC.set(nx, ny);
        _raycaster.setFromCamera(_pointerNDC, this.camera);
        const hits = _raycaster.intersectObjects(this.interactiveMeshes, false);
        const hitMesh = hits.length > 0 ? hits[0].object : null;
        const hitPanel = hitMesh && hitMesh.userData ? hitMesh.userData.panel : null;

        if (this.hoveredPanel && this.hoveredPanel !== hitPanel) {
          this.hoveredPanel.setHovered(false);
        }
        if (hitPanel) {
          hitPanel.setHovered(true);
        }
        this.hoveredPanel = hitPanel;
        this.canvas.style.cursor = hitMesh ? 'pointer' : 'grab';
      }, { passive: true });

      addListener(this.canvas, 'pointerleave', () => {
        this.pointerOffset.targetX = 0;
        this.pointerOffset.targetY = 0;
        if (this.hoveredPanel) {
          this.hoveredPanel.setHovered(false);
          this.hoveredPanel = null;
        }
        this.canvas.style.cursor = 'default';
      }, { passive: true });

      addListener(this.canvas, 'click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
        const ny = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
        _pointerNDC.set(nx, ny);
        _raycaster.setFromCamera(_pointerNDC, this.camera);
        const hits = _raycaster.intersectObjects(this.interactiveMeshes, false);
        if (hits.length > 0) {
          const ud = hits[0].object.userData || {};
          if (typeof window.handleCockpit3DAction === 'function') {
            window.handleCockpit3DAction(ud);
          }
        }
      });

      addListener(this.canvas, 'webglcontextlost', (e) => {
        e.preventDefault();
        this.contextLost = true;
        this.stopLoop();
      });
      addListener(this.canvas, 'webglcontextrestored', () => {
        if (this.destroyed) return;
        this.contextLost = false;
        this.scheduleNextFrame();
      });
    }

    onResize() {
      if (!this.canvas || !this.renderer || !this.camera) return;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }

    stopLoop() {
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        clearTimeout(this.frameId);
        this.frameId = 0;
      }
    }

    setPaused(paused) {
      this.isPaused = Boolean(paused);
      if (this.isPaused) {
        this.stopLoop();
      } else if (!this.destroyed && this.isVisible && !this.contextLost) {
        this.stopLoop();
        if (this.clock) this.clock.start();
        this.onResize();
        this.scheduleNextFrame();
      }
    }

    afterDraw(cb) {
      const gl = this.renderer && this.renderer.getContext ? this.renderer.getContext() : null;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (this.destroyed || this.isPaused) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            gl.deleteSync(sync);
            this.frameId = window.setTimeout(cb, 80);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
      } else {
        this.frameId = window.setTimeout(cb, 80);
      }
    }

    scheduleNextFrame() {
      if (this.destroyed || this.isPaused || !this.isVisible || this.contextLost) return;
      this.stopLoop();
      if (isSoftwareGl) {
        this.afterDraw(() => this.tick());
      } else {
        this.frameId = requestAnimationFrame(() => this.tick());
      }
    }

    tick() {
      if (this.destroyed || this.isPaused || !this.isVisible || this.contextLost || !this.renderer) return;

      const delta = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.getElapsedTime();
      const damp = THREE.MathUtils && THREE.MathUtils.damp
        ? THREE.MathUtils.damp
        : (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

      this.pointerOffset.x = damp(this.pointerOffset.x, this.pointerOffset.targetX, 5.0, delta);
      this.pointerOffset.y = damp(this.pointerOffset.y, this.pointerOffset.targetY, 5.0, delta);

      this.camera.position.x = damp(this.camera.position.x, this.cameraTargetPos.x + this.pointerOffset.x, 4.5, delta);
      this.camera.position.y = damp(this.camera.position.y, this.cameraTargetPos.y + this.pointerOffset.y, 4.5, delta);
      this.camera.position.z = damp(this.camera.position.z, this.cameraTargetPos.z, 4.5, delta);
      this.camera.lookAt(this.cameraLookAt);

      if (this.mode === 'collections') {
        for (let i = 0; i < this.pillarMeshes.length; i++) {
          this.pillarMeshes[i].tick(delta, elapsed);
        }
      } else if (this.mode === 'pipeline') {
        if (!prefersReducedMotion) {
          if (this.pipelineOuterGyro) {
            this.pipelineOuterGyro.rotation.z = elapsed * 0.25;
            this.pipelineOuterGyro.rotation.y = Math.sin(elapsed * 0.6) * 0.18;
          }
          if (this.pipelineInnerGyro) {
            this.pipelineInnerGyro.rotation.z = -elapsed * 0.35;
            this.pipelineInnerGyro.rotation.x = Math.cos(elapsed * 0.5) * 0.2;
          }
        }
      } else if (this.mode === 'logistics') {
        if (this.dhakaPillar) this.dhakaPillar.tick(delta, elapsed);
        if (this.outsidePillar) this.outsidePillar.tick(delta, elapsed);
      }

      this.renderer.render(this.scene, this.camera);
      this.scheduleNextFrame();
    }

    destroy() {
      this.destroyed = true;
      this.isVisible = false;
      this.stopLoop();
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = null;
      }
      while (this.boundCleanup.length > 0) {
        const off = this.boundCleanup.pop();
        try { off(); } catch (_) {}
      }
      if (this.rootGroup) {
        this.rootGroup.traverse(obj => {
          if (typeof obj.dispose === 'function') {
            try { obj.dispose(); } catch (_) {}
          }
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      }
      if (this.pipelineDial) this.pipelineDial.dispose();
      if (this.logisticsDial) this.logisticsDial.dispose();
      if (this.pipelineCards) {
        Object.values(this.pipelineCards).forEach(card => card && card.dispose());
      }
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }
    }
  }

  /**
   * 3D Product Frame Turntable Inspector inside the Product Detail Modal
   * Renders the selected SKU's actual photography on a 3-part sculpted brass & obsidian frame
   */
  class SkuInspector3D {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas || typeof THREE === 'undefined' || !window.ThreeUI) return;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
      this.camera.position.set(0, 0.2, 4.4);

      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: !isSoftwareGl,
          alpha: true
        });
      } catch (err) {
        console.warn('[SkuInspector3D] WebGL unavailable, falling back:', err.message);
        this.failed = true;
        return;
      }
      this.renderer.setSize(this.canvas.clientWidth || 240, this.canvas.clientHeight || 260, false);
      this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      if ('SRGBColorSpace' in THREE) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ('sRGBEncoding' in THREE) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }

      const hemi = new THREE.HemisphereLight(0xFDF0DD, 0x1E1D1B, 1.0);
      this.scene.add(hemi);
      const key = new THREE.DirectionalLight(0xF6D392, 1.35);
      key.position.set(3, 4, 5);
      this.scene.add(key);

      // 3-Part Composite Gallery Frame (THREE.Group)
      this.frameGroup = new THREE.Group();
      this.scene.add(this.frameGroup);

      // Part 1: Outer Brushed Brass Bezel
      const bezelGeo = new THREE.BoxGeometry(2.12, 2.58, 0.12);
      const bezelMat = new THREE.MeshStandardMaterial({
        color: 0xC6952B,
        metalness: 0.85,
        roughness: 0.22
      });
      this.bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
      this.frameGroup.add(this.bezelMesh);

      // Part 2: Obsidian Inner Passepartout Mat
      const matGeo = new THREE.BoxGeometry(1.96, 2.42, 0.14);
      const matMaterial = new THREE.MeshStandardMaterial({
        color: 0x181715,
        metalness: 0.3,
        roughness: 0.7
      });
      const matMesh = new THREE.Mesh(matGeo, matMaterial);
      this.frameGroup.add(matMesh);

      // Part 3: High-Res Product Portrait Plane
      const artGeo = new THREE.PlaneGeometry(1.78, 2.22);
      this.artMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      this.artMesh = new THREE.Mesh(artGeo, this.artMaterial);
      this.artMesh.position.z = 0.08;
      this.frameGroup.add(this.artMesh);

      // Part 4: Pedestal Base Ring
      const baseGeo = new THREE.CylinderGeometry(0.85, 1.0, 0.1, 32);
      const baseMesh = new THREE.Mesh(baseGeo, bezelMat);
      baseMesh.position.y = -1.42;
      this.frameGroup.add(baseMesh);

      this.targetRotY = 0;
      this.targetRotX = 0;
      this.currentRotY = 0;
      this.currentRotX = 0;

      this.canvas.addEventListener('pointermove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
        const ny = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
        this.targetRotY = nx * 0.45;
        this.targetRotX = -ny * 0.25;
        this.requestRender();
      }, { passive: true });

      this.canvas.addEventListener('pointerleave', () => {
        this.targetRotY = 0;
        this.targetRotX = 0;
        this.requestRender();
      }, { passive: true });
    }

    loadProduct(product) {
      if (!product || this._disposed) return;
      const imgPath = '/' + String((product.assets && product.assets.main) || `assets/products/${product.sku}/main.webp`).replace(/^\/+/, '');
      const loader = new THREE.TextureLoader();
      loader.load(imgPath, (tex) => {
        if (this._disposed || !this.renderer) {
          if (tex && typeof tex.dispose === 'function') tex.dispose();
          return;
        }
        window.ThreeUI.applyTextureColorSpace(tex, this.renderer);
        const oldTex = this._currentTex || (this.artMaterial && this.artMaterial.map);
        this._currentTex = tex;
        this.artMaterial.map = tex;
        this.artMaterial.needsUpdate = true;
        if (oldTex && oldTex !== tex && typeof oldTex.dispose === 'function') {
          oldTex.dispose();
        }
        this.requestRender();
      });
      this.requestRender();
    }

    requestRender() {
      if (this._rendering || this._disposed || !this.renderer) return;
      this._rendering = true;
      this._rafId = requestAnimationFrame(() => {
        this._rendering = false;
        if (this._disposed || !this.renderer) return;
        this.currentRotY += (this.targetRotY - this.currentRotY) * 0.18;
        this.currentRotX += (this.targetRotX - this.currentRotX) * 0.18;
        this.frameGroup.rotation.y = this.currentRotY;
        this.frameGroup.rotation.x = this.currentRotX;
        this.renderer.render(this.scene, this.camera);
        if (Math.abs(this.targetRotY - this.currentRotY) > 0.005 || Math.abs(this.targetRotX - this.currentRotX) > 0.005) {
          this.requestRender();
        }
      });
    }

    dispose() {
      this._disposed = true;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      if (this._currentTex && typeof this._currentTex.dispose === 'function') {
        this._currentTex.dispose();
        this._currentTex = null;
      }
      if (this.frameGroup) {
        this.frameGroup.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      }
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }
    }
  }

  window.FT_COCKPIT_3D = {
    AdminCockpit3D,
    SkuInspector3D,
    instance: null,
    skuInspector: null,
    init(canvasId) {
      try {
        if (!this.instance) {
          this.instance = new AdminCockpit3D(canvasId || 'cockpit-3d-canvas');
        }
      } catch (err) {
        console.warn('[FT_COCKPIT_3D] Could not initialize 3D cockpit:', err.message);
      }
      return this.instance;
    },
    setMode(mode) {
      if (this.instance && !this.instance.failed) this.instance.setMode(mode);
    },
    setPaused(paused) {
      if (this.instance && typeof this.instance.setPaused === 'function') {
        this.instance.setPaused(paused);
      }
    },
    updateTelemetry(data) {
      if (this.instance && !this.instance.failed) this.instance.updateTelemetry(data);
    },
    inspectSku(product, canvasId) {
      try {
        const targetId = canvasId || 'sku-3d-inspector-canvas';
        const el = document.getElementById(targetId);
        if (!el) return;
        if (!this.skuInspector || this.skuInspector.canvas !== el) {
          if (this.skuInspector && typeof this.skuInspector.dispose === 'function') {
            this.skuInspector.dispose();
          }
          this.skuInspector = new SkuInspector3D(targetId);
        }
        if (this.skuInspector && !this.skuInspector.failed) {
          this.skuInspector.loadProduct(product);
        }
      } catch (err) {
        console.warn('[FT_COCKPIT_3D] Could not inspect SKU in 3D:', err.message);
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.FT_COCKPIT_3D;
  }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : {});

