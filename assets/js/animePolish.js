/**
 * Fariza's Territory — Master-Level Kinetic Choreography & Micro-Interactions
 * Library: Anime.js (v3.2.2)
 * Features:
 *   1. Kinetic Split Typography (3D character & word staggered reveals)
 *   2. Dynamic Mouse Radial Glow Spotlight (Bento & card glass highlights)
 *   3. True 3D Perspective Card Tilt with Specular Glare Reflection
 *   4. Magnetic Button Attraction with Parallax Label Physics
 *   5. Fly-to-Cart Quadratic Bezier Curve with Elastic Pop & Zari Gold Confetti
 *   6. Dynamic Metric Number Counter Rollups (Stats & pricing)
 *   7. SVG Kantha Stitch & Zari Line Tracing
 *   8. Tactile Golden Click Wave Ripples
 *   9. Interactive Floating Quick-View 3D Modal Controller
 */

(function (window, document) {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  const AnimePolish = {
    init() {
      if (typeof anime === 'undefined') {
        console.warn('Anime.js library is not loaded.');
        return;
      }

      this.initKineticTypography();
      this.initCardTilt();
      this.initRadialGlow();
      this.initMagneticButtons();
      this.initStitchTracing();
      this.initCounterRollups();
      this.initClickRipples();
      this.bindFlyToCartHooks();
    },

    refresh() {
      this.initKineticTypography();
      this.initCardTilt();
      this.initRadialGlow();
      this.initMagneticButtons();
      this.initStitchTracing();
      this.initCounterRollups();
    },

    /**
     * 1. Kinetic Split Typography
     * Splits target text into characters/words and executes staggered 3D perspective reveals
     */
    initKineticTypography() {
      if (RM) return;

      const kineticTargets = document.querySelectorAll('.kinetic-title:not([data-split-done])');
      kineticTargets.forEach(el => {
        el.setAttribute('data-split-done', 'true');

        // Traverse child nodes to preserve HTML tags like <br> and <span class="accent">
        const processNode = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (!text.trim()) return node;
            const fragment = document.createDocumentFragment();
            const chars = text.split('');
            chars.forEach(char => {
              if (char === ' ') {
                const space = document.createElement('span');
                space.className = 'char-space';
                space.innerHTML = '&nbsp;';
                fragment.appendChild(space);
              } else {
                const span = document.createElement('span');
                span.className = 'kt-char';
                span.textContent = char;
                span.style.cssText = 'display:inline-block;opacity:0;transform:translateY(28px) rotateX(-20deg);will-change:transform,opacity;';
                fragment.appendChild(span);
              }
            });
            return fragment;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('kt-char') || node.classList.contains('char-space')) return node;
            const clone = node.cloneNode(false);
            node.childNodes.forEach(child => {
              const res = processNode(child);
              if (res) clone.appendChild(res);
            });
            return clone;
          }
          return node;
        };

        const fragment = document.createDocumentFragment();
        el.childNodes.forEach(child => {
          const res = processNode(child);
          if (res) fragment.appendChild(res);
        });

        el.innerHTML = '';
        el.appendChild(fragment);

        const chars = el.querySelectorAll('.kt-char');
        if (chars.length > 0) {
          anime({
            targets: chars,
            opacity: [0, 1],
            translateY: [28, 0],
            rotateX: [-20, 0],
            delay: anime.stagger(22, { start: 120 }),
            duration: 850,
            easing: 'easeOutExpo'
          });
        }
      });
    },

    /**
     * 2. Dynamic Mouse Radial Glow Spotlight
     * Tracks cursor coordinates across cards and panels, illuminating glass borders
     */
    initRadialGlow() {
      if (RM || isTouch) return;

      const glowElements = document.querySelectorAll('.pcard:not([data-glow-bound]), .col-card:not([data-glow-bound]), .pair-card:not([data-glow-bound]), .offer:not([data-glow-bound]), .stat:not([data-glow-bound]), .panel:not([data-glow-bound])');

      glowElements.forEach(el => {
        el.setAttribute('data-glow-bound', 'true');
        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          el.style.setProperty('--mouse-x', `${x}px`);
          el.style.setProperty('--mouse-y', `${y}px`);
        }, { passive: true });
      });
    },

    /**
     * 3. Interactive 3D Perspective Card Tilt with Specular Glare
     */
    initCardTilt() {
      if (RM || isTouch) return;

      const cards = document.querySelectorAll('.pcard:not([data-tilt-bound]), .col-card:not([data-tilt-bound]), .pair-card:not([data-tilt-bound])');

      cards.forEach(card => {
        card.setAttribute('data-tilt-bound', 'true');
        card.style.transformStyle = 'preserve-3d';
        card.style.perspective = '1000px';

        let glare = card.querySelector('.card-glare');
        if (!glare) {
          glare = document.createElement('div');
          glare.className = 'card-glare';
          card.appendChild(glare);
        }

        const onMouseMove = (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateX = ((y - centerY) / centerY) * -8;
          const rotateY = ((x - centerX) / centerX) * 8;

          anime({
            targets: card,
            rotateX: rotateX,
            rotateY: rotateY,
            scale: 1.022,
            duration: 160,
            easing: 'easeOutQuad'
          });

          glare.style.opacity = '0.75';
          glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.45) 0%, rgba(209,128,58,0.15) 35%, transparent 70%)`;
        };

        const onMouseLeave = () => {
          anime({
            targets: card,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 700,
            easing: 'easeOutElastic(1, .55)'
          });
          glare.style.opacity = '0';
        };

        card.addEventListener('mousemove', onMouseMove, { passive: true });
        card.addEventListener('mouseleave', onMouseLeave, { passive: true });
      });
    },

    /**
     * 4. Magnetic Cursor Attraction Button
     * Pulls button and inner label toward the cursor on hover
     */
    initMagneticButtons() {
      if (RM || isTouch) return;

      const btns = document.querySelectorAll('.btn-ink:not([data-magnetic-bound]), .btn-line:not([data-magnetic-bound]), .ft-floating-wa:not([data-magnetic-bound]), .stage-arrow:not([data-magnetic-bound])');

      btns.forEach(btn => {
        btn.setAttribute('data-magnetic-bound', 'true');
        const textSpan = btn.querySelector('span') || btn.querySelector('.wa-label');

        btn.addEventListener('mousemove', (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - (rect.left + rect.width / 2);
          const y = e.clientY - (rect.top + rect.height / 2);

          anime({
            targets: btn,
            translateX: x * 0.28,
            translateY: y * 0.28,
            duration: 180,
            easing: 'easeOutQuad'
          });

          if (textSpan) {
            anime({
              targets: textSpan,
              translateX: x * 0.14,
              translateY: y * 0.14,
              duration: 180,
              easing: 'easeOutQuad'
            });
          }
        }, { passive: true });

        btn.addEventListener('mouseleave', () => {
          anime({
            targets: btn,
            translateX: 0,
            translateY: 0,
            duration: 650,
            easing: 'easeOutElastic(1, .5)'
          });

          if (textSpan) {
            anime({
              targets: textSpan,
              translateX: 0,
              translateY: 0,
              duration: 650,
              easing: 'easeOutElastic(1, .5)'
            });
          }
        }, { passive: true });
      });
    },

    /**
     * 5. Fly-to-Cart Bezier Curve with Elastic Pop & Zari Gold Confetti Burst
     */
    flyToBag(sourceEl) {
      if (RM || !sourceEl) return;

      const bagBadge = document.getElementById('bag-count') || document.querySelector('[data-act="drawer"][data-kind="bag"]');
      if (!bagBadge) return;

      const srcRect = sourceEl.getBoundingClientRect();
      const targetRect = bagBadge.getBoundingClientRect();

      const img = sourceEl.querySelector('img') || sourceEl;
      const clone = document.createElement('div');
      clone.className = 'ft-flying-particle';

      const imgSrc = img.getAttribute('src') || '';
      clone.style.cssText = `
        position: fixed;
        left: ${srcRect.left + srcRect.width / 2 - 28}px;
        top: ${srcRect.top + srcRect.height / 2 - 28}px;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        border: 2px solid #D1803A;
        background-color: #FDF0DD;
        background-image: url('${imgSrc}');
        background-size: cover;
        background-position: center;
        box-shadow: 0 16px 36px rgba(30, 29, 28, 0.4), 0 0 20px rgba(209, 128, 58, 0.5);
        z-index: 9999;
        pointer-events: none;
        will-change: transform, opacity;
      `;

      document.body.appendChild(clone);

      const dx = targetRect.left + targetRect.width / 2 - (srcRect.left + srcRect.width / 2);
      const dy = targetRect.top + targetRect.height / 2 - (srcRect.top + srcRect.height / 2);
      const arcHeight = -Math.min(220, Math.max(80, Math.abs(dx) * 0.45));

      const animObj = { progress: 0 };

      anime({
        targets: animObj,
        progress: 1,
        duration: 750,
        easing: 'easeInOutCubic',
        update: () => {
          const t = animObj.progress;
          // Quadratic bezier trajectory
          const currX = dx * t;
          const currY = dy * t + arcHeight * (4 * t * (1 - t));
          const scale = 1 - t * 0.65;
          const rotate = t * 360;

          clone.style.transform = `translate3d(${currX}px, ${currY}px, 0) scale(${scale}) rotate(${rotate}deg)`;
        },
        complete: () => {
          clone.remove();
          this.popElement(bagBadge);
          this.confettiBurst(bagBadge);
        }
      });
    },

    /**
     * Elastic Spring Pop on Badge Reaction
     */
    popElement(el) {
      if (!el || RM) return;
      anime.remove(el);
      anime({
        targets: el,
        scale: [1, 1.55, 0.9, 1.15, 1],
        rotate: [0, -10, 10, -5, 0],
        duration: 650,
        easing: 'easeOutElastic(1.2, 0.5)'
      });
    },

    /**
     * Zari Golden Spark Confetti Burst
     * Spawns 12 radiant golden spark embers exploding radially from target element
     */
    confettiBurst(targetEl) {
      if (RM || !targetEl) return;

      const rect = targetEl.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;

      const count = 12;
      const particles = [];

      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'zari-spark';
        const size = Math.random() * 5 + 4;
        p.style.cssText = `
          position: fixed;
          left: ${originX}px;
          top: ${originY}px;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${i % 2 === 0 ? '#D1803A' : '#C6952B'};
          box-shadow: 0 0 8px ${i % 2 === 0 ? 'rgba(209,128,58,0.8)' : 'rgba(198,149,43,0.8)'};
          z-index: 10000;
          pointer-events: none;
        `;
        document.body.appendChild(p);
        particles.push(p);
      }

      anime({
        targets: particles,
        translateX: () => (Math.random() - 0.5) * 110,
        translateY: () => (Math.random() - 0.5) * 110 - 20,
        scale: [1, 0],
        opacity: [1, 0],
        duration: 800,
        easing: 'easeOutExpo',
        complete: () => {
          particles.forEach(p => p.remove());
        }
      });
    },

    /**
     * 6. Kinetic Number Counter Rollups
     */
    initCounterRollups() {
      if (RM) return;

      const counters = document.querySelectorAll('.stat b:not([data-counted]), [data-counter]:not([data-counted])');

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const el = entry.target;
              el.setAttribute('data-counted', 'true');
              observer.unobserve(el);

              const rawText = el.textContent.trim();
              const numMatch = rawText.match(/[\d,]+/);
              if (!numMatch) return;

              const cleanNum = parseInt(numMatch[0].replace(/,/g, ''), 10);
              const prefix = rawText.slice(0, rawText.indexOf(numMatch[0]));
              const suffix = rawText.slice(rawText.indexOf(numMatch[0]) + numMatch[0].length);

              const counterObj = { count: 0 };
              anime({
                targets: counterObj,
                count: cleanNum,
                duration: 1600,
                easing: 'easeOutExpo',
                update: () => {
                  el.textContent = `${prefix}${Math.floor(counterObj.count).toLocaleString()}${suffix}`;
                }
              });
            }
          });
        }, { threshold: 0.2 });

        counters.forEach(c => observer.observe(c));
      }
    },

    /**
     * 7. SVG Kantha / Zari Stitch Path Tracing
     */
    initStitchTracing() {
      if (RM) return;

      const stitchPaths = document.querySelectorAll('.kantha-stitch-path:not([data-traced]), .hero-orn path:not([data-traced])');
      stitchPaths.forEach(path => {
        path.setAttribute('data-traced', 'true');
        const length = path.getTotalLength ? path.getTotalLength() : 350;
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;

        anime({
          targets: path,
          strokeDashoffset: [length, 0],
          duration: 2000,
          delay: 200,
          easing: 'easeInOutQuad'
        });
      });
    },

    /**
     * 8. Tactile Click Wave Ripples
     */
    initClickRipples() {
      document.addEventListener('pointerdown', (e) => {
        const target = e.target.closest('.btn, .chip, .pcard, .col-card, .pair-card');
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'ft-click-ripple';
        ripple.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(209, 128, 58, 0.35);
          pointer-events: none;
          transform: translate(-50%, -50%) scale(1);
          z-index: 10;
        `;

        if (window.getComputedStyle(target).position === 'static') {
          target.style.position = 'relative';
        }
        target.appendChild(ripple);

        anime({
          targets: ripple,
          scale: [1, 28],
          opacity: [0.65, 0],
          duration: 650,
          easing: 'easeOutCubic',
          complete: () => ripple.remove()
        });
      }, { passive: true });
    },

    /**
     * Bind Fly-to-Cart on Bag/Buy Buttons
     */
    bindFlyToCartHooks() {
      // Handled directly in app.js addToBag() and trio action to avoid duplicate particle animations.
    }
  };

  // Expose globally
  window.FT_ANIME = AnimePolish;

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AnimePolish.init());
  } else {
    AnimePolish.init();
  }

})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : {});
