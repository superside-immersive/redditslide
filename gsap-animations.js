// GSAP Animations (Phase 1)
// Goal: elegant, safe crossfades between slides without breaking layout.
// IMPORTANT: Do not animate `.slide-container` transforms because it uses translate(-50%, -50%) for centering.

(function () {
    'use strict';

    const STATE = {
        transitioning: false,
        initialized: false,
        observer: null,
        gridScrollTriggers: [],
        transitionCycle: 0,
        original: {
            showSlide: null,
            nextSlide: null,
            prevSlide: null,
            toggleGridView: null,
        },
    };

    function hasGSAP() {
        return typeof window.gsap !== 'undefined' && window.gsap && typeof window.gsap.timeline === 'function';
    }

    function hasObserver() {
        return hasGSAP() && window.gsap && window.gsap.plugins && window.gsap.plugins.Observer;
    }

    function prefersReducedMotion() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch {
            return false;
        }
    }

    function registerPlugins() {
        if (!hasGSAP()) return;
        // Safe to call even if plugin already registered.
        try {
            if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
            if (window.Observer) window.gsap.registerPlugin(window.Observer);
        } catch {
            // Ignore
        }
    }

    function hasScrollTrigger() {
        return hasGSAP() && typeof window.ScrollTrigger !== 'undefined' && window.ScrollTrigger;
    }

    function isGridView() {
        return document.body.classList.contains('grid-view');
    }

    function getSlides() {
        return Array.from(document.querySelectorAll('.slide-container:not(.gsap-clone)'));
    }

    function normalizeIndex(n, total) {
        if (total <= 0) return 0;
        if (n >= total) return 0;
        if (n < 0) return total - 1;
        return n;
    }

    function setTempVisible(el, opacity) {
        if (!el) return;
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'none';
        el.style.opacity = String(opacity);
    }

    function clearTempStyles(el) {
        if (!el) return;
        el.style.visibility = '';
        el.style.pointerEvents = '';
        el.style.opacity = '';
    }

    function createTransitionLayer() {
        const layer = document.createElement('div');
        layer.className = 'gsap-transition-layer';
        layer.style.position = 'fixed';
        layer.style.inset = '0';
        layer.style.zIndex = '9999';
        layer.style.pointerEvents = 'none';
        layer.style.contain = 'layout paint';
        layer.style.overflow = 'hidden';
        document.body.appendChild(layer);
        return layer;
    }

    function cloneSlideForLayer(slideEl) {
        const rect = slideEl.getBoundingClientRect();
        const clone = slideEl.cloneNode(true);

        // Force visibility regardless of `.active` CSS.
        clone.classList.add('active');
        clone.classList.add('gsap-clone');
        clone.style.position = 'fixed';
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.margin = '0';
        clone.style.transform = 'none';
        clone.style.opacity = '1';
        clone.style.visibility = 'visible';
        clone.style.pointerEvents = 'none';

        // Neutralize positioning rules from `.slide-container`.
        clone.style.right = 'auto';
        clone.style.bottom = 'auto';

        // Avoid duplicate IDs (e.g., flowchart root) which can break mounting.
        clone.removeAttribute('id');
        Array.from(clone.querySelectorAll('[id]')).forEach((el) => el.removeAttribute('id'));

        return { clone, rect };
    }

    function cleanupTransitionLayer(layer) {
        if (!layer) return;
        try {
            layer.remove();
        } catch {
            if (layer.parentNode) layer.parentNode.removeChild(layer);
        }
    }

    function isFlowchartSlide(slideEl) {
        if (!slideEl) return false;
        return !!slideEl.querySelector('#flowchart-root');
    }

    function getLegoConceptImage(slideEl) {
        if (!slideEl) return null;
        return (
            slideEl.querySelector('img[src*="Modular+Lego+Concept"]') ||
            slideEl.querySelector('img[alt*="Modular lego"], img[alt*="Modular Lego"], img[alt*="lego blocks"]')
        );
    }

    function animateLegoAssemble(imgEl) {
        if (!hasGSAP() || prefersReducedMotion()) return;
        if (!imgEl) return;

        // Prevent double-running if user goes back and forth quickly.
        if (imgEl.getAttribute('data-lego-animated') === '1') return;
        imgEl.setAttribute('data-lego-animated', '1');

        const wrapper = imgEl.closest('.image-wrapper') || imgEl.parentElement;
        if (!wrapper) return;

        // Contain everything strictly within image bounds.
        wrapper.style.position = wrapper.style.position || 'relative';
        wrapper.style.overflow = 'hidden';

        const rect = wrapper.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));

        const cols = width >= 520 ? 10 : 8;
        const rows = height >= 340 ? 7 : 6;
        const tileW = width / cols;
        const tileH = height / rows;

        const layer = document.createElement('div');
        layer.className = 'lego-build-layer';
        layer.style.position = 'absolute';
        layer.style.inset = '0';
        layer.style.pointerEvents = 'none';
        layer.style.zIndex = '2';
        layer.style.perspective = '900px';
        layer.style.transformStyle = 'preserve-3d';
        layer.style.overflow = 'hidden';

        // Optional subtle studs pattern behind tiles (already defined in CSS).
        const studs = document.createElement('div');
        studs.className = 'lego-studs';
        studs.style.zIndex = '0';
        studs.style.inset = '0';
        layer.appendChild(studs);

        const tiles = [];
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const tile = document.createElement('div');
                tile.style.position = 'absolute';
                tile.style.left = `${c * tileW}px`;
                tile.style.top = `${r * tileH}px`;
                tile.style.width = `${tileW + 0.5}px`;
                tile.style.height = `${tileH + 0.5}px`;
                tile.style.backgroundImage = `url("${imgEl.currentSrc || imgEl.src}")`;
                tile.style.backgroundSize = `${width}px ${height}px`;
                tile.style.backgroundPosition = `${-c * tileW}px ${-r * tileH}px`;
                tile.style.backgroundRepeat = 'no-repeat';
                tile.style.transformOrigin = 'center center';
                tile.style.willChange = 'transform,opacity';
                tile.style.zIndex = '1';

                tiles.push(tile);
                layer.appendChild(tile);
            }
        }

        // Hide the real image while we build it with tiles.
        const prevOpacity = imgEl.style.opacity;
        imgEl.style.opacity = '0';

        wrapper.appendChild(layer);

        const rand = (min, max) => min + Math.random() * (max - min);
        const fromY = rand(26, 44);

        window.gsap.set(studs, { opacity: 0, y: 18, scale: 1.03 });
        window.gsap.set(tiles, {
            opacity: 0,
            x: () => rand(-34, 34),
            y: () => rand(-fromY, fromY),
            rotate: () => rand(-4.5, 4.5),
            rotateX: () => rand(-10, 10),
            rotateY: () => rand(-12, 12),
            z: () => rand(40, 90),
        });

        const tl = window.gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                // Reveal the real image and remove the overlay.
                imgEl.style.opacity = prevOpacity || '1';
                try {
                    layer.remove();
                } catch {
                    if (layer.parentNode) layer.parentNode.removeChild(layer);
                }
                // Allow re-run later if needed (e.g. after refresh).
                window.setTimeout(() => imgEl.removeAttribute('data-lego-animated'), 400);
            },
        });

        tl.to(studs, { opacity: 1, y: 0, duration: 0.5 }, 0);

        // Assemble tiles in a pleasing diagonal wave.
        tl.to(
            tiles,
            {
                opacity: 1,
                x: 0,
                y: 0,
                z: 0,
                rotate: 0,
                rotateX: 0,
                rotateY: 0,
                duration: 0.85,
                stagger: {
                    each: 0.012,
                    from: 'start',
                    grid: [rows, cols],
                    axis: 'x',
                },
            },
            0.05
        );

        // Tiny hold, then fade out studs so the final image is clean.
        tl.to(studs, { opacity: 0, duration: 0.35, ease: 'power2.out' }, 0.8);
        // Fade overlay slightly so the handoff is imperceptible.
        tl.to(layer, { opacity: 0, duration: 0.18, ease: 'power2.out' }, 0.98);
    }

    function resetLegoAnimation(slideEl) {
        const legoImg = getLegoConceptImage(slideEl);
        if (!legoImg) return;

        legoImg.removeAttribute('data-lego-animated');
        legoImg.style.opacity = '';

        const wrapper = legoImg.closest('.image-wrapper') || legoImg.parentElement;
        if (!wrapper) return;

        const layers = Array.from(wrapper.querySelectorAll('.lego-build-layer, .lego-studs'));
        layers.forEach((layer) => {
            try {
                layer.remove();
            } catch {
                if (layer.parentNode) layer.parentNode.removeChild(layer);
            }
        });
    }

    function isTitleSlide(slideEl) {
        if (!slideEl) return false;
        return slideEl.classList.contains('title-layout') || !!slideEl.querySelector('.title-layout');
    }

    function isSectionTitleSlide(slideEl) {
        if (!slideEl) return false;
        return slideEl.classList.contains('section-title-layout') || !!slideEl.querySelector('.section-title-layout');
    }

    function isBleedImageSlide(slideEl) {
        if (!slideEl) return false;
        return slideEl.classList.contains('bleed-image-layout') || !!slideEl.querySelector('.bleed-image-side');
    }

    function isTwoColumnSlide(slideEl) {
        if (!slideEl) return false;
        return !!slideEl.querySelector('.two-column');
    }

    function hasTiles(slideEl) {
        if (!slideEl) return false;
        return slideEl.querySelectorAll('.tile').length > 0;
    }

    function isSplitFriendly(slideEl) {
        if (!slideEl) return false;
        // Avoid split on complex layouts (two-column, bleed-image, tiled, flowchart)
        if (isFlowchartSlide(slideEl)) return false;
        if (isBleedImageSlide(slideEl)) return false;
        if (isTwoColumnSlide(slideEl)) return false;
        if (hasTiles(slideEl)) return false;
        return true;
    }

    function splitWords(el) {
        if (!el) return null;
        // If already split, reuse existing spans to avoid DOM churn and layout snaps.
        if (el.getAttribute('data-gsap-split') === 'words') {
            const existing = Array.from(el.querySelectorAll('.gsap-word'));
            if (existing.length) return existing;
        }

        // If this element was previously split and never restored (e.g. interrupted), restore first.
        restoreSplit(el);
        // Minimal SplitText-like fallback (words only).
        // We only use this on simple headings where innerHTML isn't meaningful.
        const originalText = el.textContent;
        const trimmed = (originalText || '').trim();
        if (!trimmed) return null;

        const words = trimmed.split(/\s+/g);
        // IMPORTANT: Keep normal word spacing (literal spaces), no extra spacer spans.
        const spans = words
            .map((w) => `<span class="gsap-word" style="display:inline-block;">${w}</span>`)
            .join(' ');

        el.setAttribute('data-gsap-original-text', originalText);
        el.setAttribute('data-gsap-split', 'words');
        el.innerHTML = spans;
        return Array.from(el.querySelectorAll('.gsap-word'));
    }

    function restoreSplit(el) {
        if (!el) return;
        const original = el.getAttribute('data-gsap-original-text');
        if (original == null) return;
        el.textContent = original;
        el.removeAttribute('data-gsap-original-text');
        el.removeAttribute('data-gsap-split');
    }

    function setObserverToCurrentState() {
        setObserverEnabled(shouldEnableObserverNow());
    }

    function animateGridEnter() {
        if (!hasGSAP() || prefersReducedMotion()) return;
        const wrapper = document.querySelector('.slides-wrapper');
        const slides = getSlides();

        // In grid view, all slides are active + positioned relative; safe to animate.
        window.gsap.killTweensOf([wrapper, ...slides]);
        window.gsap.set(wrapper, { willChange: 'opacity,transform' });
        window.gsap.set(slides, { willChange: 'opacity,transform' });

        const tl = window.gsap.timeline({
            defaults: { ease: 'power2.out' },
            onComplete: () => {
                window.gsap.set([wrapper, ...slides], { clearProps: 'willChange,opacity,transform' });
            },
        });

        tl.fromTo(wrapper, { opacity: 0 }, { opacity: 1, duration: 0.22 }, 0);
        tl.fromTo(slides, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.38, stagger: 0.015 }, 0.02);
    }

    function clearGridScrollReveal() {
        if (!STATE.gridScrollTriggers || !STATE.gridScrollTriggers.length) return;
        try {
            STATE.gridScrollTriggers.forEach((t) => {
                try {
                    if (t && typeof t.kill === 'function') t.kill();
                } catch {
                    // Ignore
                }
            });
        } finally {
            STATE.gridScrollTriggers = [];
        }
    }

    function setupGridScrollReveal() {
        // Only meaningful in grid view where wrapper scrolls.
        if (!hasScrollTrigger() || prefersReducedMotion()) return;
        if (!isGridView()) return;

        clearGridScrollReveal();

        const scroller = document.querySelector('.slides-wrapper');
        if (!scroller) return;

        const slides = getSlides();
        if (!slides.length) return;

        // Lightweight: reveal only once per tile as it comes into view.
        slides.forEach((slideEl) => {
            // Avoid doing anything special with the flowchart slide; it’s heavier.
            if (isFlowchartSlide(slideEl)) return;

            // Ensure a clean base.
            window.gsap.set(slideEl, { clearProps: 'opacity,transform' });

            const tween = window.gsap.fromTo(
                slideEl,
                { opacity: 0, y: 10 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.35,
                    ease: 'power2.out',
                    paused: true,
                }
            );

            const trigger = window.ScrollTrigger.create({
                trigger: slideEl,
                scroller,
                start: 'top 92%',
                once: true,
                onEnter: () => tween.play(0),
            });

            STATE.gridScrollTriggers.push(trigger);
        });

        // Refresh in case layout changed.
        try {
            window.ScrollTrigger.refresh();
        } catch {
            // Ignore
        }
    }

    function animateGridExit(onDone) {
        if (!hasGSAP() || prefersReducedMotion()) {
            onDone();
            return;
        }
        const wrapper = document.querySelector('.slides-wrapper');
        if (!wrapper) {
            onDone();
            return;
        }
        clearGridScrollReveal();
        window.gsap.killTweensOf(wrapper);
        window.gsap.to(wrapper, {
            opacity: 0,
            duration: 0.14,
            ease: 'power2.in',
            onComplete: () => {
                onDone();
                window.gsap.set(wrapper, { clearProps: 'opacity' });
            },
        });
    }

    function animateListStagger(slideEl, direction) {
        if (!hasGSAP() || prefersReducedMotion()) return;
        if (!slideEl || isFlowchartSlide(slideEl)) return;
        const items = Array.from(slideEl.querySelectorAll('ul li'));
        if (!items.length) return;

        const fromY = direction === 'prev' ? -8 : 8;
        window.gsap.killTweensOf(items);
        window.gsap.set(items, { willChange: 'transform,opacity' });
        window.gsap.fromTo(items, { y: fromY, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.03, ease: 'power2.out', clearProps: 'willChange,transform,opacity' });
    }

    function collectEntranceTargets(slideEl) {
        if (!slideEl) return [];

        // Avoid interfering with the React Flow mount.
        if (isFlowchartSlide(slideEl)) return [];

        const targets = [];

        // Generic targets: title, content blocks, tiles, images.
        const title = slideEl.querySelector('.slide-title, h1, h2');
        if (title) targets.push(title);

        // Title slide layout.
        const subtitle = slideEl.querySelector('.subtitle');
        const hr = slideEl.querySelector('hr');
        if (subtitle) targets.push(subtitle);
        if (hr) targets.push(hr);

        // Common content regions.
        const contentArea = slideEl.querySelector('.content-area');
        if (contentArea) targets.push(contentArea);

        // Tiles (staggered).
        const tiles = Array.from(slideEl.querySelectorAll('.tile'));
        if (tiles.length) targets.push(...tiles);

        // Two-column / lists.
        const columns = Array.from(slideEl.querySelectorAll('.two-column > div'));
        if (columns.length) targets.push(...columns);

        // Bleed image.
        const bleedImg = slideEl.querySelector('.bleed-image-side');
        if (bleedImg) targets.push(bleedImg);

        // De-dup.
        return Array.from(new Set(targets)).filter(Boolean);
    }

    function animateEntrance(slideEl, direction) {
        if (!hasGSAP() || prefersReducedMotion()) return;

        // Never interfere with the flowchart slide (wheel/pinch/drag).
        if (isFlowchartSlide(slideEl)) return;


        // Special: Modular Lego Concept image assembles as blocks (image-only, never overlaps text).
        const legoImg = getLegoConceptImage(slideEl);
        if (legoImg) {
            const fromY = direction === 'prev' ? -12 : 12;
            const tl = window.gsap.timeline({ defaults: { ease: 'power2.out' } });

            const title = slideEl.querySelector('.slide-title, h2');
            const leftCol = slideEl.querySelector('.two-column > div:first-child');
            if (title) {
                tl.fromTo(title, { y: fromY, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, 0);
            }
            if (leftCol) {
                tl.fromTo(leftCol, { y: fromY * 0.7, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0.08);
            }
            // Run the lego build inside the image wrapper.
            tl.call(() => animateLegoAssemble(legoImg), [], 0.02);
            return;
        }

        // Keep this subtle; no blur filters, no heavy transforms.
        // NOTE: We only animate child elements, never `.slide-container` itself.
        const fromY = direction === 'prev' ? -12 : 12;
        const tl = window.gsap.timeline({ defaults: { ease: 'power2.out' } });

        // Title slide: animate as a whole (no word/letter splitting to avoid kerning snaps).
        if (isTitleSlide(slideEl)) {
            const h1 = slideEl.querySelector('h1');
            const subtitle = slideEl.querySelector('.subtitle');
            const hr = slideEl.querySelector('hr');

            if (h1) {
                tl.fromTo(h1, { y: fromY, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, 0);
            }
            if (hr) {
                tl.fromTo(hr, { scaleX: 0, transformOrigin: 'left center', opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.45 }, 0.12);
            }
            if (subtitle) {
                tl.fromTo(subtitle, { y: fromY * 0.5, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0.18);
            }
            return;
        }

        // Section title slide: gentle title focus (no splitting).
        if (isSectionTitleSlide(slideEl)) {
            const h2 = slideEl.querySelector('h2');
            const p = slideEl.querySelector('p');
            if (h2) {
                tl.fromTo(h2, { y: fromY, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0);
            }
            if (p) {
                tl.fromTo(p, { y: fromY * 0.5, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.12);
            }
            return;
        }

        // Tiled slides: title + tile cascade.
        if (hasTiles(slideEl)) {
            const title = slideEl.querySelector('.slide-title, h2');
            const tiles = Array.from(slideEl.querySelectorAll('.tile'));
            if (title) {
                tl.fromTo(title, { y: fromY, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, 0);
            }
            tl.fromTo(
                tiles,
                { y: fromY + 8, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.06 },
                0.08
            );
            return;
        }

        // Bleed image slides: image + copy.
        if (isBleedImageSlide(slideEl)) {
            const title = slideEl.querySelector('.slide-title, h2');
            const content = slideEl.querySelector('.content-area, .content-container');
            const img = slideEl.querySelector('.bleed-image-side');
            if (title) {
                tl.fromTo(title, { y: fromY, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, 0);
            }
            if (content) {
                tl.fromTo(content, { y: fromY * 0.6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0.08);
            }
            if (img) {
                tl.fromTo(img, { opacity: 0, scale: 1.02 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 0);
            }
            return;
        }

        // Default: light stagger across common targets.
        const targets = collectEntranceTargets(slideEl);
        if (!targets.length) return;
        window.gsap.killTweensOf(targets);
        window.gsap.set(targets, { willChange: 'transform,opacity' });
        tl.fromTo(targets, { y: fromY, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, stagger: 0.04 }, 0);
        tl.eventCallback('onComplete', () => {
            window.gsap.set(targets, { clearProps: 'willChange,transform,opacity' });
        });
    }

    function currentActiveSlide() {
        return document.querySelector('.slide-container.active');
    }

    function shouldEnableObserverNow() {
        if (prefersReducedMotion()) return false;
        if (STATE.transitioning) return false;
        if (isGridView()) return false;
        const active = currentActiveSlide();
        if (!active) return false;
        if (isFlowchartSlide(active)) return false;
        return true;
    }

    function setObserverEnabled(enabled) {
        if (!hasObserver()) return;
        if (!STATE.observer) return;
        if (enabled) STATE.observer.enable();
        else STATE.observer.disable();
    }

    function setupObserverNav() {
        if (!hasObserver() || STATE.observer) return;

        // Ultra-safe gesture nav: wheel/touch/drag gestures trigger prev/next.
        // We explicitly ignore the React Flow area and disable in grid view.
        const cooldownMs = 520;
        let lastNavAt = 0;

        STATE.observer = window.gsap.plugins.Observer.create({
            target: window,
            type: 'wheel,touch,pointer',
            wheelSpeed: -1,
            // Do NOT preventDefault globally — keep it non-invasive.
            preventDefault: false,
            tolerance: 18,
            ignore: '#flowchart-root, .react-flow, .flowchart-toggles, input, button, a',
            onDown: () => {
                if (!shouldEnableObserverNow()) return;
                const now = Date.now();
                if (now - lastNavAt < cooldownMs) return;
                lastNavAt = now;
                if (typeof window.nextSlide === 'function') window.nextSlide();
            },
            onUp: () => {
                if (!shouldEnableObserverNow()) return;
                const now = Date.now();
                if (now - lastNavAt < cooldownMs) return;
                lastNavAt = now;
                if (typeof window.prevSlide === 'function') window.prevSlide();
            },
        });

        // Start disabled until we confirm we should be active.
        setObserverEnabled(false);
    }

    function simpleCrossfadeToIndex(targetIndex, direction, options) {
        const slides = getSlides();
        const total = slides.length;
        if (total === 0) return;

        const nextIndex = normalizeIndex(targetIndex, total);
        const incoming = slides[nextIndex];
        const outgoing = document.querySelector('.slide-container.active');

        // If we're leaving the Lego slide, reset so it can replay next time.
        if (outgoing) resetLegoAnimation(outgoing);

        // If there's no outgoing (first paint), keep it simple.
        if (!outgoing || outgoing === incoming) {
            STATE.original.showSlide(targetIndex, direction, { ...(options || {}), force: true });
            return;
        }

        // If GSAP isn't available, fall back to instant.
        if (!hasGSAP()) {
            STATE.original.showSlide(targetIndex, direction, options);
            return;
        }

        // Kill any ongoing animations on these slides
        window.gsap.killTweensOf([outgoing, incoming]);

        // Commit the state change first, then animate
        STATE.transitioning = true;
        
        // Set incoming to opacity 0 before making it active
        incoming.style.opacity = '0';
        
        STATE.original.showSlide(targetIndex, direction, { ...(options || {}), force: true });

        // Now animate the fade
        window.gsap.to(incoming, {
            opacity: 1,
            duration: 0.35,
            ease: 'power2.out',
            onComplete: () => {
                incoming.style.opacity = '';
                STATE.transitioning = false;
                setObserverToCurrentState();
            }
        });
    }

    function doPushTransition(outgoing, incoming, targetIndex, direction, options) {
        const layer = createTransitionLayer();
        const outData = cloneSlideForLayer(outgoing);
        const inData = cloneSlideForLayer(incoming);

        layer.appendChild(outData.clone);
        layer.appendChild(inData.clone);

        // Hide real slides during animation.
        setTempVisible(outgoing, 0);
        setTempVisible(incoming, 0);

        window.gsap.set([outData.clone, inData.clone], { willChange: 'transform,opacity' });
        window.gsap.set(inData.clone, { y: direction === 'prev' ? -80 : 80, opacity: 0.001 });

        STATE.transitioning = true;

        window.gsap.timeline({
            defaults: { ease: 'power3.inOut' },
            onComplete: () => {
                STATE.original.showSlide(targetIndex, direction, { ...(options || {}), force: true });
                clearTempStyles(outgoing);
                clearTempStyles(incoming);
                cleanupTransitionLayer(layer);
                STATE.transitioning = false;
                if (!prefersReducedMotion()) {
                    const active = currentActiveSlide();
                    if (active) {
                        animateEntrance(active, direction);
                        animateListStagger(active, direction);
                    }
                }
                setObserverToCurrentState();
            },
        })
            .to(outData.clone, { y: direction === 'prev' ? 80 : -80, opacity: 0, duration: 0.55 }, 0)
            .to(inData.clone, { y: 0, opacity: 1, duration: 0.6 }, 0.06);
    }

    function doSplitRevealTransition(outgoing, incoming, targetIndex, direction, options) {
        const layer = createTransitionLayer();

        const outTop = cloneSlideForLayer(outgoing).clone;
        const outBottom = cloneSlideForLayer(outgoing).clone;
        const inTop = cloneSlideForLayer(incoming).clone;
        const inBottom = cloneSlideForLayer(incoming).clone;

        // Clip halves
        const topHalf = 'inset(0% 0% 50% 0%)';
        const bottomHalf = 'inset(50% 0% 0% 0%)';
        outTop.style.clipPath = topHalf;
        outBottom.style.clipPath = bottomHalf;
        inTop.style.clipPath = 'inset(0% 0% 100% 0%)';
        inBottom.style.clipPath = 'inset(100% 0% 0% 0%)';

        layer.appendChild(outTop);
        layer.appendChild(outBottom);
        layer.appendChild(inTop);
        layer.appendChild(inBottom);

        // Hide real slides during animation.
        setTempVisible(outgoing, 0);
        setTempVisible(incoming, 0);

        window.gsap.set([outTop, outBottom, inTop, inBottom], { willChange: 'transform,opacity,clip-path' });
        window.gsap.set([inTop, inBottom], { opacity: 1 });

        STATE.transitioning = true;

        const outY = 70;
        const inY = 14;

        window.gsap.timeline({
            defaults: { ease: 'power3.inOut' },
            onComplete: () => {
                STATE.original.showSlide(targetIndex, direction, { ...(options || {}), force: true });
                clearTempStyles(outgoing);
                clearTempStyles(incoming);
                cleanupTransitionLayer(layer);
                STATE.transitioning = false;
                if (!prefersReducedMotion()) {
                    const active = currentActiveSlide();
                    if (active) {
                        animateEntrance(active, direction);
                        animateListStagger(active, direction);
                    }
                }
                setObserverToCurrentState();
            },
        })
            // Outgoing splits away
            .to(outTop, { y: -outY, opacity: 0, duration: 0.5 }, 0)
            .to(outBottom, { y: outY, opacity: 0, duration: 0.5 }, 0)
            // Incoming reveals top then bottom
            .fromTo(inTop, { y: inY }, { y: 0, duration: 0.45 }, 0.08)
            .to(inTop, { clipPath: topHalf, duration: 0.55 }, 0.08)
            .fromTo(inBottom, { y: inY }, { y: 0, duration: 0.45 }, 0.22)
            .to(inBottom, { clipPath: bottomHalf, duration: 0.55 }, 0.22);
    }

    function transitionToIndex(targetIndex, direction, options) {
        const slides = getSlides();
        const total = slides.length;
        if (total === 0) return;

        const nextIndex = normalizeIndex(targetIndex, total);
        const incoming = slides[nextIndex];
        const outgoing = document.querySelector('.slide-container.active');

        // First paint / no-op.
        if (!outgoing || outgoing === incoming) {
            return simpleCrossfadeToIndex(targetIndex, direction, options);
        }

        // Reduced motion or missing GSAP -> fallback.
        if (!hasGSAP() || prefersReducedMotion()) {
            return STATE.original.showSlide(targetIndex, direction, options);
        }

        // Use simple crossfade for all transitions to avoid stutter
        return simpleCrossfadeToIndex(targetIndex, direction, options);
    }

    function wrapNavigation() {
        if (STATE.initialized) return;

        // These are global function declarations from animations.js
        const originalShowSlide = window.showSlide;
        const originalNext = window.nextSlide;
        const originalPrev = window.prevSlide;
        const originalToggleGridView = window.toggleGridView;

        if (typeof originalShowSlide !== 'function') return;

        STATE.original.showSlide = originalShowSlide;
        STATE.original.nextSlide = typeof originalNext === 'function' ? originalNext : null;
        STATE.original.prevSlide = typeof originalPrev === 'function' ? originalPrev : null;
        STATE.original.toggleGridView = typeof originalToggleGridView === 'function' ? originalToggleGridView : null;

        // Wrap showSlide for arrow keys + buttons.
        window.showSlide = function (n, direction, options) {
            if (STATE.transitioning) return;
            if (isGridView()) {
                // Preserve existing behavior: no slide changes during grid view.
                return STATE.original.showSlide(n, direction, options);
            }
            transitionToIndex(n, direction, options);
        };

        // Wrap next/prev too, in case they’re called directly.
        if (STATE.original.nextSlide) {
            window.nextSlide = function () {
                if (STATE.transitioning || isGridView()) return;
                // Delegate to showSlide wrapper by calling the original.
                STATE.original.nextSlide();
            };
        }

        if (STATE.original.prevSlide) {
            window.prevSlide = function () {
                if (STATE.transitioning || isGridView()) return;
                STATE.original.prevSlide();
            };
        }

        // Wrap grid toggle with a subtle enter/exit polish.
        if (STATE.original.toggleGridView) {
            window.toggleGridView = function () {
                if (!hasGSAP() || prefersReducedMotion()) {
                    const result = STATE.original.toggleGridView();
                    setObserverToCurrentState();
                    return result;
                }

                // Determine current state BEFORE toggling.
                const currentlyGrid = isGridView();

                if (!currentlyGrid) {
                    // Enter grid: toggle first so layout is correct, then animate in.
                    const result = STATE.original.toggleGridView();
                    // Observer should be off in grid.
                    setObserverToCurrentState();
                    animateGridEnter();
                    setupGridScrollReveal();
                    return result;
                }

                // Exit grid: animate out, then toggle.
                return animateGridExit(() => {
                    STATE.original.toggleGridView();
                    setObserverToCurrentState();

                    const active = currentActiveSlide();
                    if (active && hasGSAP() && !prefersReducedMotion()) {
                        animateEntrance(active, 'next');
                        animateListStagger(active, 'next');
                    }
                });
            };
        }

        STATE.initialized = true;
    }

    // Init when DOM is ready; also retry briefly in case scripts load out of order.
    function init() {
        registerPlugins();
        wrapNavigation();
        setupObserverNav();

        // Keep observer state in sync with slide changes and grid view.
        const syncObserver = () => setObserverEnabled(shouldEnableObserverNow());
        window.addEventListener('keydown', () => syncObserver(), { passive: true });
        window.addEventListener('click', () => syncObserver(), { passive: true });
        window.addEventListener('resize', () => syncObserver(), { passive: true });
        // Initial sync.
        syncObserver();

        if (STATE.initialized) return;
        // Retry a few times (CDN + script order safety)
        let tries = 0;
        const timer = setInterval(() => {
            wrapNavigation();
            tries += 1;
            if (STATE.initialized || tries > 50) clearInterval(timer);
        }, 50);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
