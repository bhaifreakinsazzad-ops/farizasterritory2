/**
 * Fariza's Territory — Kinetic Choreography & Micro-Interactions
 * Library: Anime.js (v3.2.2)
 * Features:
 *   1. Kinetic Split Typography (hero immediate + scroll-revealed section headings)
 *   2. Dynamic Mouse Radial Glow Spotlight (Bento & card glass highlights)
 *   3. Smooth 3D Perspective Card Tilt with Specular Glare (no CSS transition fight)
 *   4. Magnetic Button Attraction with Parallax Label Physics
 *   5. Fly-to-Cart Quadratic Bezier Curve with Elastic Pop & Zari Gold Confetti
 *   6. Dynamic Metric Number Counter Rollups (Stats & pricing)
 *   7. SVG Kantha Stitch & Zari Line Tracing
 *   8. Tactile Golden Click Wave Ripples
 *   9. Staggered Grid Entrances, Image Crossfades & Tracking Stepper Choreography
 */

(function (window, document) {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  const AnimePolish = {
    _rippleBound: false,
    _titleObserver: null,
    _collectionsObserver: null,

    init() {
      if (typeof anime === 'undefined') {
        return;
      }

      this.initKineticTypography();
      this.initCardTilt();
      this.initRadialGlow();
      this.initMagneticButtons();
      this.initStitchTracing();
      this.initCounterRollups();
      this.initCollectionsScrollEntrance();
      this.initClickRipples();
      this.bindFlyToCartHooks();
    },

    refresh() {
      if (typeof anime === 'undefined') return;
      this.initKineticTypography();
      this.initCardTilt();
      this.initRadialGlow();
      this.initMagneticButtons();
      this.initStitchTracing();
      this.initCounterRollups();
      this.initCollectionsScrollEntrance();
    },

    /**
     * 1. Kinetic Split Typography
     * Splits text into chars; hero headlines animate immediately, lower headings trigger on viewport entry
     */
    initKineticTypography() {
      if (RM) return;

      const splitAndPrep = (el) => {
        el.setAttribute('data-split-done', 'true');
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
                span.style.cssText = 'display:inline-block;opacity:0;transform:translateY(22px) rotateX(-16deg);will-change:transform,opacity;';
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
      };

      const playTitle = (el) => {
        if (el.getAttribute('data-title-played') === 'true') return;
        el.setAttribute('data-title-played', 'true');
        const chars = el.querySelectorAll('.kt-char');
        if (chars.length > 0) {
          anime({
            targets: chars,
            opacity: [0, 1],
            translateY: [22, 0],
            rotateX: [-16, 0],
            delay: anime.stagger(18, { start: 80 }),
            duration: 720,
            easing: 'easeOutExpo'
          });
        }
      };

      if (!this._titleObserver && 'IntersectionObserver' in window) {
        this._titleObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              playTitle(entry.target);
              this._titleObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.15, rootMargin: '0px 0px -20px 0px' });
      }

      const kineticTargets = document.querySelectorAll('.kinetic-title:not([data-split-done])');
      kineticTargets.forEach(el => {
        splitAndPrep(el);
        const rect = el.getBoundingClientRect();
        const inTopFold = rect.top < window.innerHeight * 0.9;
        if (inTopFold || !this._titleObserver) {
          playTitle(el);
        } else {
          this._titleObserver.observe(el);
        }
      });
    },

    /**
     * 2. Dynamic Mouse Radial Glow Spotlight
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

      const cards = document.querySelectorAll('.pcard:not([data-tilt-bound]), .pair-card:not([data-tilt-bound])');

      cards.forEach(card => {
        card.setAttribute('data-tilt-bound', 'true');
        card.classList.add('has-3d-tilt');
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

          const rotateX = ((y - centerY) / centerY) * -6.5;
          const rotateY = ((x - centerX) / centerX) * 6.5;

          anime.remove(card);
          anime({
            targets: card,
            rotateX,
            rotateY,
            scale: 1.018,
            duration: 140,
            easing: 'easeOutQuad'
          });

          glare.style.opacity = '0.7';
          glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.42) 0%, rgba(209,128,58,0.14) 36%, transparent 70%)`;
        };

        const onMouseLeave = () => {
          anime.remove(card);
          anime({
            targets: card,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 620,
            easing: 'easeOutElastic(1, .58)'
          });
          glare.style.opacity = '0';
        };

        card.addEventListener('mousemove', onMouseMove, { passive: true });
        card.addEventListener('mouseleave', onMouseLeave, { passive: true });
      });
    },

    /**
     * 4. Magnetic Cursor Attraction Button
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

          anime.remove(btn);
          anime({
            targets: btn,
            translateX: x * 0.24,
            translateY: y * 0.24,
            duration: 160,
            easing: 'easeOutQuad'
          });

          if (textSpan) {
            anime.remove(textSpan);
            anime({
              targets: textSpan,
              translateX: x * 0.12,
              translateY: y * 0.12,
              duration: 160,
              easing: 'easeOutQuad'
            });
          }
        }, { passive: true });

        btn.addEventListener('mouseleave', () => {
          anime.remove(btn);
          anime({
            targets: btn,
            translateX: 0,
            translateY: 0,
            duration: 580,
            easing: 'easeOutElastic(1, .52)'
          });

          if (textSpan) {
            anime.remove(textSpan);
            anime({
              targets: textSpan,
              translateX: 0,
              translateY: 0,
              duration: 580,
              easing: 'easeOutElastic(1, .52)'
            });
          }
        }, { passive: true });
      });
    },

    /**
     * 5. Fly-to-Cart Bezier Curve with Elastic Pop & Zari Gold Confetti Burst
     */
    flyToBag(sourceEl) {
      if (RM || !sourceEl || typeof anime === 'undefined') return;

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
        duration: 720,
        easing: 'easeInOutCubic',
        update: () => {
          const t = animObj.progress;
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

    popElement(el) {
      if (!el || RM || typeof anime === 'undefined') return;
      anime.remove(el);
      anime({
        targets: el,
        scale: [1, 1.55, 0.9, 1.15, 1],
        rotate: [0, -10, 10, -5, 0],
        duration: 650,
        easing: 'easeOutElastic(1.2, 0.5)'
      });
    },

    confettiBurst(targetEl) {
      if (RM || !targetEl || typeof anime === 'undefined') return;

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
      if (RM || typeof anime === 'undefined') return;

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
                duration: 1400,
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
      if (RM || typeof anime === 'undefined') return;

      const stitchPaths = document.querySelectorAll('.kantha-stitch-path:not([data-traced]), .hero-orn path:not([data-traced])');
      stitchPaths.forEach(path => {
        path.setAttribute('data-traced', 'true');
        const length = path.getTotalLength ? path.getTotalLength() : 350;
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;

        anime({
          targets: path,
          strokeDashoffset: [length, 0],
          duration: 1800,
          delay: 150,
          easing: 'easeInOutQuad'
        });
      });
    },

    /**
     * 8. Tactile Click Wave Ripples
     */
    initClickRipples() {
      if (RM || this._rippleBound || typeof anime === 'undefined') return;
      this._rippleBound = true;

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
          duration: 620,
          easing: 'easeOutCubic',
          complete: () => ripple.remove()
        });
      }, { passive: true });
    },

    /**
     * 9. Staggered Grid Entrance, Collections Page Entrance, Image Swap Crossfade & Tracking Stepper
     */
    initCollectionsScrollEntrance() {
      if (RM || typeof anime === 'undefined') return;
      const homeGrid = document.querySelector('#collections .col-grid-8:not([data-col-entrance-bound])');
      if (!homeGrid) return;
      homeGrid.setAttribute('data-col-entrance-bound', 'true');

      if ('IntersectionObserver' in window) {
        if (!this._collectionsObserver) {
          this._collectionsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                this._collectionsObserver.unobserve(entry.target);
                this.animateCollectionsEntrance(entry.target);
              }
            });
          }, { threshold: 0.12 });
        }
        this._collectionsObserver.observe(homeGrid);
      } else {
        this.animateCollectionsEntrance(homeGrid);
      }
    },

    animateCollectionsEntrance(container) {
      const root = container || document.getElementById('collections-page-grid') || document.querySelector('.col-grid-8') || document;
      const cards = Array.from(root.querySelectorAll('.col-card, .crow'));
      if (!cards.length) return;

      if (RM || typeof anime === 'undefined') {
        cards.forEach(c => {
          c.classList.add('in');
          c.style.opacity = '1';
          c.style.transform = '';
        });
        return;
      }

      // Prepare cards so CSS [data-reveal] transition does not fight Anime.js
      cards.forEach(c => {
        c.classList.add('in');
        c.removeAttribute('data-reveal');
        c.setAttribute('data-entrance-animating', '1');
        c.style.opacity = '0';
      });

      anime.remove(cards);

      const colsCount = window.innerWidth <= 600 ? 1 : window.innerWidth <= 1080 ? 2 : 4;
      const rowsCount = Math.ceil(cards.length / colsCount);

      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [38, 0],
        scale: [0.94, 1],
        rotateX: [7, 0],
        delay: anime.stagger(75, { grid: [colsCount, rowsCount], from: 'first', start: 65 }),
        duration: 780,
        easing: 'easeOutExpo',
        complete: () => {
          cards.forEach(c => {
            c.removeAttribute('data-entrance-animating');
            c.style.opacity = '1';
            if (c.getAttribute('data-parallax-active') !== '1') {
              c.style.transform = '';
            }
          });
          if (window.ftThreeCollections && typeof window.ftThreeCollections.measureCards === 'function') {
            window.ftThreeCollections.measureCards();
            window.ftThreeCollections.requestRender(true);
          }
        }
      });

      const thumbs = root.querySelectorAll('.col-card .cc-thumbs .ph, .crow .crow-thumbs .ph');
      if (thumbs.length) {
        anime.remove(thumbs);
        anime({
          targets: thumbs,
          opacity: [0, 1],
          translateY: [14, 0],
          scale: [0.85, 1],
          delay: anime.stagger(28, { start: 180 }),
          duration: 560,
          easing: 'easeOutBack(1.3)'
        });
      }

      const badges = root.querySelectorAll('.col-card .cc-count, .col-card .cc-num .tag');
      if (badges.length) {
        anime.remove(badges);
        anime({
          targets: badges,
          opacity: [0, 1],
          translateX: [-8, 0],
          delay: anime.stagger(40, { start: 140 }),
          duration: 520,
          easing: 'easeOutQuad'
        });
      }
    },

    animateGridCards(container) {
      if (RM || !container || typeof anime === 'undefined') return;
      const cards = container.querySelectorAll('.pcard, .col-card, .lb-item');
      if (!cards.length) return;
      anime.remove(cards);
      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [22, 0],
        delay: anime.stagger(30, { start: 20, from: 'first' }),
        duration: 520,
        easing: 'easeOutExpo'
      });
    },

    animateImageSwap(el) {
      if (RM || !el || typeof anime === 'undefined') return;
      anime.remove(el);
      anime({
        targets: el,
        opacity: [0.35, 1],
        scale: [0.975, 1],
        duration: 380,
        easing: 'easeOutCubic'
      });
    },

    animateTrackingStepper(container) {
      if (RM || !container || typeof anime === 'undefined') return;
      const steps = container.querySelectorAll('.tracking-step');
      if (!steps.length) return;
      anime.remove(steps);
      anime({
        targets: steps,
        opacity: [0, 1],
        translateY: [14, 0],
        scale: [0.92, 1],
        delay: anime.stagger(75, { start: 40 }),
        duration: 540,
        easing: 'easeOutBack(1.3)'
      });
    },

    bindFlyToCartHooks() {
      // Handled directly in app.js addToBag() and trio action to avoid duplicate particle animations.
    }
  };

  window.FT_ANIME = AnimePolish;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AnimePolish.init());
  } else {
    AnimePolish.init();
  }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : {});
