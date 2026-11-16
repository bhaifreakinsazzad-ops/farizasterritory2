/**
 * Fariza's Territory — High-End Motion & Interaction Choreography
 * Library: Anime.js (v3.2.2)
 * Features:
 *   1. Kinetic Typography (Staggered letter & word reveals)
 *   2. Interactive 3D Perspective Tilt with dynamic specular glare
 *   3. Fly-to-Cart Bezier Curve Micro-Interaction with elastic badge pop
 *   4. SVG Kantha / Zari Stitch Path Tracing
 *   5. Smooth spring-based Stagger for collection grids and look selector
 */

(function (window, document) {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const AnimePolish = {
    init() {
      if (typeof anime === 'undefined') {
        console.warn('Anime.js library is not loaded.');
        return;
      }

      this.initKineticTypography();
      this.initCardTilt();
      this.initStitchTracing();
      this.bindFlyToCartHooks();
    },

    /**
     * 1. Kinetic Typography
     * Splits target text into spans and executes staggered reveal
     */
    initKineticTypography() {
      if (RM) return;

      const kineticTargets = document.querySelectorAll('.kinetic-title:not([data-split])');
      kineticTargets.forEach(el => {
        el.setAttribute('data-split', 'true');
        const text = el.textContent.trim();
        el.innerHTML = text.split('').map(char => {
          if (char === ' ') return '<span class="char-space">&nbsp;</span>';
          return `<span class="char" style="display:inline-block;opacity:0;transform:translateY(24px) rotate(4deg)">${char}</span>`;
        }).join('');

        anime({
          targets: el.querySelectorAll('.char'),
          opacity: [0, 1],
          translateY: [24, 0],
          rotate: [4, 0],
          delay: anime.stagger(28, { start: 200 }),
          duration: 750,
          easing: 'easeOutExpo'
        });
      });
    },

    /**
     * 2. Interactive 3D Perspective Tilt on Product and Collection Cards
     */
    initCardTilt() {
      if (RM || window.matchMedia('(pointer: coarse)').matches) return;

      const cards = document.querySelectorAll('.pcard:not([data-tilt-bound]), .col-card:not([data-tilt-bound]), .s-card:not([data-tilt-bound])');

      cards.forEach(card => {
        card.setAttribute('data-tilt-bound', 'true');

        // Prepare card container for 3D
        card.style.transformStyle = 'preserve-3d';
        card.style.perspective = '1000px';

        let glare = card.querySelector('.card-glare');
        if (!glare) {
          glare = document.createElement('div');
          glare.className = 'card-glare';
          glare.style.cssText = 'position:absolute;inset:0;pointer-events:none;border-radius:inherit;opacity:0;mix-blend-mode:overlay;background:radial-gradient(circle at 50% 50%, rgba(255,255,255,0.45) 0%, transparent 70%);transition:opacity 0.25s ease;z-index:10;';
          card.appendChild(glare);
        }

        const onMouseMove = (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateX = ((y - centerY) / centerY) * -7;
          const rotateY = ((x - centerX) / centerX) * 7;

          anime({
            targets: card,
            rotateX: rotateX,
            rotateY: rotateY,
            scale: 1.02,
            duration: 180,
            easing: 'easeOutQuad'
          });

          glare.style.opacity = '0.7';
          glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.4) 0%, transparent 65%)`;
        };

        const onMouseLeave = () => {
          anime({
            targets: card,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 650,
            easing: 'easeOutElastic(1, .6)'
          });
          glare.style.opacity = '0';
        };

        card.addEventListener('mousemove', onMouseMove, { passive: true });
        card.addEventListener('mouseleave', onMouseLeave, { passive: true });
      });
    },

    /**
     * 3. Fly-to-Cart Bezier Curve Micro-Interaction
     * Clones source image and translates along dynamic bezier trajectory to the bag badge
     */
    flyToBag(sourceEl) {
      if (RM || !sourceEl) return;

      const bagBadge = document.getElementById('bag-count') || document.querySelector('[data-act="drawer"][data-kind="bag"]');
      if (!bagBadge) return;

      const srcRect = sourceEl.getBoundingClientRect();
      const targetRect = bagBadge.getBoundingClientRect();

      // Find an image or thumbnail inside sourceEl
      const img = sourceEl.querySelector('img') || sourceEl;
      const clone = document.createElement('div');
      clone.className = 'ft-flying-particle';

      const imgSrc = img.getAttribute('src') || '';
      clone.style.cssText = `
        position: fixed;
        left: ${srcRect.left + srcRect.width / 2 - 28}px;
        top: ${srcRect.top + srcRect.height / 2 - 28}px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 2px solid #D1803A;
        background-color: #FDF0DD;
        background-image: url('${imgSrc}');
        background-size: cover;
        background-position: center;
        box-shadow: 0 14px 28px rgba(30, 29, 28, 0.35);
        z-index: 9999;
        pointer-events: none;
        will-change: transform, opacity;
      `;

      document.body.appendChild(clone);

      const dx = targetRect.left + targetRect.width / 2 - (srcRect.left + srcRect.width / 2);
      const dy = targetRect.top + targetRect.height / 2 - (srcRect.top + srcRect.height / 2);

      // Arc vertex control point
      const arcHeight = -Math.min(180, Math.abs(dx) * 0.45);

      const animObj = { progress: 0 };

      anime({
        targets: animObj,
        progress: 1,
        duration: 720,
        easing: 'easeInOutCubic',
        update: () => {
          const t = animObj.progress;
          // Quadratic bezier curve calculation
          const currX = dx * t;
          const currY = dy * t + arcHeight * (4 * t * (1 - t));
          const scale = 1 - t * 0.65;
          const rotate = t * 360;

          clone.style.transform = `translate3d(${currX}px, ${currY}px, 0) scale(${scale}) rotate(${rotate}deg)`;
        },
        complete: () => {
          clone.remove();
          this.popElement(bagBadge);
        }
      });
    },

    /**
     * Elastic Pop Badge Reaction
     */
    popElement(el) {
      if (!el || RM) return;
      anime.remove(el);
      anime({
        targets: el,
        scale: [1, 1.48, 0.92, 1.12, 1],
        rotate: [0, -8, 8, -4, 0],
        duration: 620,
        easing: 'easeOutElastic(1.2, 0.5)'
      });
    },

    /**
     * 4. SVG Kantha / Zari Stitch Path Tracing
     */
    initStitchTracing() {
      if (RM) return;

      const stitchPaths = document.querySelectorAll('.kantha-stitch-path:not([data-traced])');
      stitchPaths.forEach(path => {
        path.setAttribute('data-traced', 'true');
        const length = path.getTotalLength ? path.getTotalLength() : 300;
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;

        anime({
          targets: path,
          strokeDashoffset: [length, 0],
          duration: 1800,
          delay: 300,
          easing: 'easeInOutQuad'
        });
      });
    },

    /**
     * 5. Animate Look Selector Focus Stagger
     */
    staggerLookCards(cards, focusIndex) {
      if (RM || !cards || !cards.length) return;

      anime({
        targets: cards,
        scale: (el, i) => i === focusIndex ? 1.08 : 0.88,
        opacity: (el, i) => Math.abs(i - focusIndex) > 2 ? 0.25 : (i === focusIndex ? 1 : 0.65),
        delay: anime.stagger(45),
        duration: 550,
        easing: 'easeOutCubic'
      });
    },

    /**
     * Attach fly-to-cart hooks to UI buttons
     */
    bindFlyToCartHooks() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act="pi-add"], [data-act="add-bag"], [data-act="buy-quick"]');
        if (!btn) return;

        const card = btn.closest('.pcard') || btn.closest('.prod-grid') || btn.closest('.stage-col') || btn.closest('.piece-panel');
        if (card) {
          const imgContainer = card.querySelector('.ph-img') || card.querySelector('.ph') || btn;
          this.flyToBag(imgContainer);
        }
      }, { passive: true });
    }
  };

  // Expose globally
  window.FT_ANIME = AnimePolish;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AnimePolish.init());
  } else {
    AnimePolish.init();
  }

})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : {});
