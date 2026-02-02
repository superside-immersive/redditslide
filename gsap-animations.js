// GSAP Premium Animations - Reddit Slides
// Elegant directional transitions with SplitText, parallax, and micro-interactions
// Duration: 0.6s | Parallax: 1.3x on images | Eases: power3.out, back.out(1.2)

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    const STATE = {
        transitioning: false,
        initialized: false,
        observer: null,
        gridScrollTriggers: [],
        splitInstances: new Map(), // Track SplitText instances for cleanup
        transitionCycle: 0,
        original: {
            showSlide: null,
            nextSlide: null,
            prevSlide: null,
            toggleGridView: null,
        },
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function hasGSAP() {
        return typeof window.gsap !== 'undefined' && window.gsap && typeof window.gsap.timeline === 'function';
    }

    function hasSplitText() {
        return hasGSAP() && typeof window.SplitText !== 'undefined';
    }

    function hasObserver() {
        return hasGSAP() && window.gsap && window.gsap.plugins && window.gsap.plugins.Observer;
    }

    function hasScrollTrigger() {
        return hasGSAP() && typeof window.ScrollTrigger !== 'undefined' && window.ScrollTrigger;
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
        try {
            if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
            if (window.Observer) window.gsap.registerPlugin(window.Observer);
            if (window.SplitText) window.gsap.registerPlugin(window.SplitText);
        } catch {
            // Ignore
        }
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

    function currentActiveSlide() {
        return document.querySelector('.slide-container.active');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SLIDE TYPE DETECTION
    // ═══════════════════════════════════════════════════════════════════════════

    function isFlowchartSlide(slideEl) {
        if (!slideEl) return false;
        return !!slideEl.querySelector('#flowchart-root');
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

    // ═══════════════════════════════════════════════════════════════════════════
    // SNOO 3D SLIDE DETECTION & CAMERA ANIMATION
    // ═══════════════════════════════════════════════════════════════════════════

    function isSnooSlide(slideEl) {
        if (!slideEl) return false;
        return !!slideEl.querySelector('.title-snoo-embed iframe');
    }

    function getSnooIframe(slideEl) {
        if (!slideEl) return null;
        return slideEl.querySelector('.title-snoo-embed iframe');
    }

    /**
     * Animate the Snoo 3D camera before transitioning away from the intro slide
     * Creates a dramatic zoom-out and rotation effect
     */
    function animateSnooCamera(iframe, direction) {
        return new Promise((resolve) => {
            if (!iframe || !iframe.contentWindow) {
                resolve();
                return;
            }

            try {
                const snoo = iframe.contentWindow.snoo;
                if (!snoo || !snoo.camera || !snoo.controls) {
                    resolve();
                    return;
                }

                const camera = snoo.camera;
                const controls = snoo.controls;
                const THREE = iframe.contentWindow.THREE;

                if (!THREE) {
                    resolve();
                    return;
                }

                // Store original camera values
                const originalPos = {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z
                };
                const originalTarget = {
                    x: controls.target.x,
                    y: controls.target.y,
                    z: controls.target.z
                };

                // Define cinematic camera movement
                // Zoom out and rotate around for a dramatic effect
                const isForward = direction === 'next';
                
                const targetPos = isForward 
                    ? { x: 5, y: 3.5, z: 5 }    // Zoom out diagonally
                    : { x: -3, y: 2.5, z: 4 };  // Different angle for backward

                const targetLookAt = isForward
                    ? { x: 0, y: 0.8, z: 0 }    // Look down slightly
                    : { x: 0, y: 1.2, z: 0 };

                // Use GSAP to animate if available
                if (window.gsap) {
                    // Animated target for lookAt
                    const animTarget = { ...originalTarget };

                    const tl = window.gsap.timeline({
                        onUpdate: () => {
                            camera.updateProjectionMatrix();
                            controls.target.set(animTarget.x, animTarget.y, animTarget.z);
                            controls.update();
                        },
                        onComplete: () => {
                            // Reset camera for next time
                            window.gsap.to(camera.position, {
                                x: originalPos.x,
                                y: originalPos.y,
                                z: originalPos.z,
                                duration: 0.01,
                                onComplete: () => {
                                    controls.target.set(originalTarget.x, originalTarget.y, originalTarget.z);
                                    controls.update();
                                }
                            });
                            resolve();
                        }
                    });

                    // Camera position animation
                    tl.to(camera.position, {
                        x: targetPos.x,
                        y: targetPos.y,
                        z: targetPos.z,
                        duration: 0.5,
                        ease: 'power2.inOut'
                    }, 0);

                    // LookAt target animation
                    tl.to(animTarget, {
                        x: targetLookAt.x,
                        y: targetLookAt.y,
                        z: targetLookAt.z,
                        duration: 0.5,
                        ease: 'power2.inOut'
                    }, 0);

                    // Optional: Scale down the model slightly
                    if (snoo.vrmScene) {
                        tl.to(snoo.vrmScene.scale, {
                            x: 0.85,
                            y: 0.85,
                            z: 0.85,
                            duration: 0.4,
                            ease: 'power2.in'
                        }, 0.1);

                        // Reset scale after
                        tl.set(snoo.vrmScene.scale, { x: 1, y: 1, z: 1 }, 0.55);
                    }

                } else {
                    // Fallback without GSAP
                    resolve();
                }

            } catch (e) {
                console.warn('Snoo camera animation failed:', e);
                resolve();
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECTIONAL VALUES
    // Direction: 1 = forward (→), -1 = backward (←)
    // ═══════════════════════════════════════════════════════════════════════════

    function getDirectionalValues(direction) {
        const dir = direction === 'prev' ? -1 : 1;
        return {
            // Exit offsets (element moves in opposite direction of navigation)
            exitTitle: -50 * dir,
            exitContent: -70 * dir,
            exitImage: -90 * dir,  // 1.3x parallax
            exitTiles: -40 * dir,
            exitList: -30 * dir,
            // Enter offsets (element comes from direction of navigation)
            enterTitle: 60 * dir,
            enterContent: 80 * dir,
            enterImage: 100 * dir,  // 1.3x parallax
            enterTiles: 50 * dir,
            enterList: 40 * dir,
            // Stagger direction
            staggerFrom: dir === 1 ? 'start' : 'end',
            staggerFromReverse: dir === 1 ? 'end' : 'start',
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SPLITTEXT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    function splitTitle(titleElement) {
        if (!titleElement || !hasSplitText()) return null;
        
        // Check if already split
        const existingId = titleElement.getAttribute('data-split-id');
        if (existingId && STATE.splitInstances.has(existingId)) {
            return STATE.splitInstances.get(existingId);
        }

        try {
            const split = new window.SplitText(titleElement, {
                type: 'chars,words',
                charsClass: 'gsap-char',
                wordsClass: 'gsap-word',
            });
            
            const id = `split-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            titleElement.setAttribute('data-split-id', id);
            STATE.splitInstances.set(id, split);
            
            // Set initial styles for chars
            window.gsap.set(split.chars, { 
                display: 'inline-block',
                willChange: 'transform, opacity'
            });
            
            return split;
        } catch (e) {
            console.warn('SplitText failed:', e);
            return null;
        }
    }

    function cleanupSplit(titleElement) {
        if (!titleElement) return;
        
        const id = titleElement.getAttribute('data-split-id');
        if (id && STATE.splitInstances.has(id)) {
            const split = STATE.splitInstances.get(id);
            try {
                split.revert();
            } catch {
                // Ignore revert errors
            }
            STATE.splitInstances.delete(id);
            titleElement.removeAttribute('data-split-id');
        }
    }

    function cleanupAllSplits() {
        STATE.splitInstances.forEach((split, id) => {
            try {
                split.revert();
            } catch {
                // Ignore
            }
        });
        STATE.splitInstances.clear();
        
        // Also clean up any orphaned data attributes
        document.querySelectorAll('[data-split-id]').forEach(el => {
            el.removeAttribute('data-split-id');
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXIT ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function createExitTimeline(slideEl, direction) {
        if (!slideEl || !hasGSAP()) return null;
        if (isFlowchartSlide(slideEl)) return null; // Protect React Flow

        // ═══════════════════════════════════════════════════════════════════
        // GOING BACKWARDS: Quick fade out, no elaborate animations
        // ═══════════════════════════════════════════════════════════════════
        if (direction === 'prev') {
            const tl = window.gsap.timeline({ defaults: { ease: 'power2.in' } });
            tl.to(slideEl, { opacity: 0, duration: 0.2 }, 0);
            return tl;
        }

        // ═══════════════════════════════════════════════════════════════════
        // GOING FORWARD: Full exit animations
        // ═══════════════════════════════════════════════════════════════════
        const vals = getDirectionalValues(direction);
        const tl = window.gsap.timeline({ defaults: { ease: 'power2.in' } });

        // Title with SplitText (if available)
        const title = slideEl.querySelector('.slide-title, h1, h2');
        if (title && hasSplitText() && !isFlowchartSlide(slideEl)) {
            const split = splitTitle(title);
            if (split && split.chars && split.chars.length) {
                tl.to(split.chars, {
                    x: vals.exitTitle * 0.8,
                    opacity: 0,
                    duration: 0.25,
                    stagger: {
                        each: 0.015,
                        from: vals.staggerFromReverse,
                    },
                    ease: 'power2.in',
                }, 0);
            } else {
                tl.to(title, { x: vals.exitTitle, opacity: 0, duration: 0.25 }, 0);
            }
        } else if (title) {
            tl.to(title, { x: vals.exitTitle, opacity: 0, duration: 0.25 }, 0);
        }

        // Content areas
        const content = slideEl.querySelector('.content-area, .content-container');
        if (content) {
            tl.to(content, { x: vals.exitContent, opacity: 0, duration: 0.25 }, 0.03);
        }

        // Two-column layouts with parallax
        if (isTwoColumnSlide(slideEl)) {
            const columns = slideEl.querySelectorAll('.two-column > div');
            const leftCol = columns[0];
            const rightCol = columns[1];
            
            if (leftCol) {
                tl.to(leftCol, { x: vals.exitContent, opacity: 0, duration: 0.25 }, 0.02);
            }
            if (rightCol) {
                // Image column gets more offset (parallax 1.3x)
                const hasImage = rightCol.querySelector('img, .image-wrapper');
                const offset = hasImage ? vals.exitImage : vals.exitContent;
                tl.to(rightCol, { x: offset, opacity: 0, scale: 0.98, duration: 0.25 }, 0.02);
            }
        }

        // Tiles with stagger
        const tiles = Array.from(slideEl.querySelectorAll('.tile'));
        if (tiles.length) {
            tl.to(tiles, {
                x: vals.exitTiles,
                opacity: 0,
                rotation: direction === 'prev' ? 2 : -2,
                duration: 0.22,
                stagger: { each: 0.03, from: vals.staggerFromReverse },
            }, 0.02);
        }

        // Bleed images
        const bleedImg = slideEl.querySelector('.bleed-image-side');
        if (bleedImg) {
            tl.to(bleedImg, {
                x: vals.exitImage,
                scale: 0.95,
                opacity: 0,
                duration: 0.28,
            }, 0);
        }

        // Lists
        const listItems = Array.from(slideEl.querySelectorAll('ul li'));
        if (listItems.length) {
            tl.to(listItems, {
                x: vals.exitList,
                opacity: 0,
                duration: 0.2,
                stagger: { each: 0.02, from: vals.staggerFromReverse },
            }, 0.02);
        }

        // Subtitle and hr
        const subtitle = slideEl.querySelector('.subtitle');
        const hr = slideEl.querySelector('hr');
        if (subtitle) tl.to(subtitle, { x: vals.exitContent * 0.5, opacity: 0, duration: 0.2 }, 0.02);
        if (hr) tl.to(hr, { scaleX: 0, opacity: 0, duration: 0.2 }, 0.02);

        // 3D Snoo iframe (title slide)
        const snooFrame = slideEl.querySelector('.snoo-frame');
        if (snooFrame) {
            tl.to(snooFrame, { scale: 0.9, opacity: 0, duration: 0.25 }, 0.02);
        }

        return tl;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENTRANCE ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function createEntranceTimeline(slideEl, direction) {
        if (!slideEl || !hasGSAP()) return null;
        
        // For flowchart slide - always simple fade
        if (isFlowchartSlide(slideEl)) {
            const tl = window.gsap.timeline();
            tl.fromTo(slideEl, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
            return tl;
        }

        // ═══════════════════════════════════════════════════════════════════
        // GOING BACKWARDS: Quick fade, no elaborate animations
        // Elements appear already in their final position
        // ═══════════════════════════════════════════════════════════════════
        if (direction === 'prev') {
            const tl = window.gsap.timeline({ defaults: { ease: 'power2.out' } });
            
            // Just fade in the whole slide quickly - everything already in place
            // No need to animate individual elements
            tl.fromTo(slideEl, 
                { opacity: 0 }, 
                { opacity: 1, duration: 0.25 }
            , 0);
            
            return tl;
        }

        // ═══════════════════════════════════════════════════════════════════
        // GOING FORWARD: Full entrance animations
        // ═══════════════════════════════════════════════════════════════════
        const vals = getDirectionalValues(direction);
        const tl = window.gsap.timeline({ defaults: { ease: 'power3.out' } });

        // ─────────────────────────────────────────────────────────────────────
        // TITLE SLIDE
        // ─────────────────────────────────────────────────────────────────────
        if (isTitleSlide(slideEl)) {
            const h1 = slideEl.querySelector('h1');
            const subtitle = slideEl.querySelector('.subtitle');
            const hr = slideEl.querySelector('hr');
            const snooFrame = slideEl.querySelector('.snoo-frame');

            if (h1 && hasSplitText()) {
                const split = splitTitle(h1);
                if (split && split.chars && split.chars.length) {
                    window.gsap.set(split.chars, { x: vals.enterTitle, opacity: 0 });
                    tl.to(split.chars, {
                        x: 0,
                        opacity: 1,
                        duration: 0.4,
                        stagger: {
                            each: 0.02,
                            from: 'center',
                        },
                        ease: 'elastic.out(1, 0.6)',
                    }, 0);
                }
            } else if (h1) {
                tl.fromTo(h1, { y: vals.enterTitle * 0.3, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0);
            }

            if (hr) {
                tl.fromTo(hr, 
                    { scaleX: 0, transformOrigin: 'center center', opacity: 0 }, 
                    { scaleX: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }, 
                0.15);
            }
            if (subtitle) {
                tl.fromTo(subtitle, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.2);
            }
            if (snooFrame) {
                tl.fromTo(snooFrame, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.2)' }, 0.1);
            }
            return tl;
        }

        // ─────────────────────────────────────────────────────────────────────
        // SECTION TITLE SLIDE
        // ─────────────────────────────────────────────────────────────────────
        if (isSectionTitleSlide(slideEl)) {
            const h2 = slideEl.querySelector('h2');
            const p = slideEl.querySelector('p');

            if (h2 && hasSplitText()) {
                const split = splitTitle(h2);
                if (split && split.words && split.words.length) {
                    window.gsap.set(split.words, { y: 40, opacity: 0 });
                    tl.to(split.words, {
                        y: 0,
                        opacity: 1,
                        duration: 0.5,
                        stagger: {
                            each: 0.08,
                            from: 'center',
                        },
                        ease: 'back.out(1.4)',
                    }, 0);
                }
            } else if (h2) {
                tl.fromTo(h2, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.2)' }, 0);
            }

            if (p) {
                tl.fromTo(p, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.2);
            }
            return tl;
        }

        // ─────────────────────────────────────────────────────────────────────
        // TILED LAYOUTS
        // ─────────────────────────────────────────────────────────────────────
        if (hasTiles(slideEl)) {
            const title = slideEl.querySelector('.slide-title, h2');
            const tiles = Array.from(slideEl.querySelectorAll('.tile'));

            if (title && hasSplitText()) {
                const split = splitTitle(title);
                if (split && split.chars && split.chars.length) {
                    window.gsap.set(split.chars, { x: vals.enterTitle * 0.5, opacity: 0 });
                    tl.to(split.chars, {
                        x: 0, opacity: 1, duration: 0.3,
                        stagger: { each: 0.018, from: vals.staggerFrom },
                        ease: 'back.out(1.2)',
                    }, 0);
                }
            } else if (title) {
                tl.fromTo(title, { x: vals.enterTitle * 0.4, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 }, 0);
            }

            if (tiles.length) {
                window.gsap.set(tiles, { x: vals.enterTiles, opacity: 0, rotation: direction === 'prev' ? -2 : 2 });
                tl.to(tiles, {
                    x: 0, opacity: 1, rotation: 0, duration: 0.4,
                    stagger: { each: 0.06, from: vals.staggerFrom },
                    ease: 'power2.out',
                }, 0.1);
            }
            return tl;
        }

        // ─────────────────────────────────────────────────────────────────────
        // BLEED IMAGE LAYOUTS
        // ─────────────────────────────────────────────────────────────────────
        if (isBleedImageSlide(slideEl)) {
            const title = slideEl.querySelector('.slide-title, h2');
            const content = slideEl.querySelector('.content-area, .content-container');
            const bleedImg = slideEl.querySelector('.bleed-image-side');
            const listItems = Array.from(slideEl.querySelectorAll('ul li'));

            if (bleedImg) {
                // Clip-path reveal for dramatic effect
                const clipFrom = direction === 'prev' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
                window.gsap.set(bleedImg, { clipPath: clipFrom, opacity: 1, scale: 1.02 });
                tl.to(bleedImg, {
                    clipPath: 'inset(0 0% 0 0%)',
                    scale: 1,
                    duration: 0.5,
                    ease: 'power3.out',
                }, 0);
            }

            if (title && hasSplitText()) {
                const split = splitTitle(title);
                if (split && split.chars && split.chars.length) {
                    window.gsap.set(split.chars, { x: vals.enterTitle * 0.4, opacity: 0 });
                    tl.to(split.chars, {
                        x: 0, opacity: 1, duration: 0.35,
                        stagger: { each: 0.02, from: vals.staggerFrom },
                        ease: 'back.out(1.2)',
                    }, 0.08);
                }
            } else if (title) {
                tl.fromTo(title, { x: vals.enterTitle * 0.3, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35 }, 0.08);
            }

            if (content) {
                tl.fromTo(content, { x: vals.enterContent * 0.3, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 }, 0.15);
            }

            if (listItems.length) {
                window.gsap.set(listItems, { x: vals.enterList, opacity: 0 });
                tl.to(listItems, {
                    x: 0, opacity: 1, duration: 0.35,
                    stagger: { each: 0.04, from: vals.staggerFrom },
                }, 0.2);
            }
            return tl;
        }

        // ─────────────────────────────────────────────────────────────────────
        // TWO-COLUMN LAYOUTS
        // ─────────────────────────────────────────────────────────────────────
        if (isTwoColumnSlide(slideEl)) {
            const title = slideEl.querySelector('.slide-title, h2');
            const columns = slideEl.querySelectorAll('.two-column > div');
            const leftCol = columns[0];
            const rightCol = columns[1];
            const listItems = Array.from(slideEl.querySelectorAll('ul li'));

            if (title && hasSplitText()) {
                const split = splitTitle(title);
                if (split && split.chars && split.chars.length) {
                    window.gsap.set(split.chars, { x: vals.enterTitle * 0.5, opacity: 0 });
                    tl.to(split.chars, {
                        x: 0, opacity: 1, duration: 0.35,
                        stagger: { each: 0.02, from: vals.staggerFrom },
                        ease: 'back.out(1.2)',
                    }, 0);
                }
            } else if (title) {
                tl.fromTo(title, { x: vals.enterTitle * 0.4, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35 }, 0);
            }

            if (leftCol) {
                tl.fromTo(leftCol, { x: vals.enterContent * 0.4, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 }, 0.08);
            }

            if (rightCol) {
                // Parallax 1.3x on image column
                const hasImage = rightCol.querySelector('img, .image-wrapper');
                if (hasImage) {
                    tl.fromTo(rightCol, 
                        { x: vals.enterImage * 0.5, opacity: 0, scale: 0.95 }, 
                        { x: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' }, 
                    0.1);
                } else {
                    tl.fromTo(rightCol, { x: vals.enterContent * 0.4, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 }, 0.1);
                }
            }

            if (listItems.length) {
                window.gsap.set(listItems, { x: vals.enterList, opacity: 0 });
                tl.to(listItems, {
                    x: 0, opacity: 1, duration: 0.3,
                    stagger: { each: 0.04, from: vals.staggerFrom },
                }, 0.15);
            }
            return tl;
        }

        // ─────────────────────────────────────────────────────────────────────
        // DEFAULT FALLBACK
        // ─────────────────────────────────────────────────────────────────────
        const title = slideEl.querySelector('.slide-title, h1, h2');
        const content = slideEl.querySelector('.content-area, .content-container');

        if (title) {
            tl.fromTo(title, { x: vals.enterTitle * 0.4, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35 }, 0);
        }
        if (content) {
            tl.fromTo(content, { x: vals.enterContent * 0.3, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 }, 0.08);
        }

        return tl;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MASTER TRANSITION ORCHESTRATOR
    // ═══════════════════════════════════════════════════════════════════════════

    function performTransition(outgoing, incoming, targetIndex, direction, options) {
        if (!hasGSAP()) {
            STATE.original.showSlide(targetIndex, direction, options);
            return;
        }

        // Handle reduced motion
        if (prefersReducedMotion()) {
            STATE.original.showSlide(targetIndex, direction, { ...(options || {}), force: true });
            return;
        }

        STATE.transitioning = true;
        STATE.transitionCycle++;
        const cycleId = STATE.transitionCycle;

        // Kill any running animations on both slides
        window.gsap.killTweensOf(outgoing);
        window.gsap.killTweensOf(incoming);
        
        // Get animated elements and kill their tweens (exclude React Flow elements)
        if (outgoing && !isFlowchartSlide(outgoing)) {
            const outElements = outgoing.querySelectorAll('*:not(.react-flow *):not(#flowchart-root *):not([class*="react-flow"])');
            window.gsap.killTweensOf(outElements);
        }
        if (incoming && !isFlowchartSlide(incoming)) {
            const inElements = incoming.querySelectorAll('*:not(.react-flow *):not(#flowchart-root *):not([class*="react-flow"])');
            window.gsap.killTweensOf(inElements);
        }

        // Create master timeline (total 0.6s)
        const masterTL = window.gsap.timeline({
            onComplete: () => {
                if (cycleId !== STATE.transitionCycle) return; // Stale

                // Cleanup outgoing slide - clear ALL inline styles and transforms
                // BUT exclude React Flow elements which have their own positioning
                if (outgoing && !isFlowchartSlide(outgoing)) {
                    // Clear props on animated children (exclude flowchart elements)
                    const outChildren = outgoing.querySelectorAll('*:not(.react-flow *):not(#flowchart-root *):not([class*="react-flow"])');
                    outChildren.forEach(child => {
                        window.gsap.set(child, { clearProps: 'all' });
                    });
                    window.gsap.set(outgoing, { clearProps: 'all' });
                    
                    // Cleanup SplitText
                    const outTitle = outgoing.querySelector('.slide-title, h1, h2');
                    if (outTitle) cleanupSplit(outTitle);
                }
                
                // For flowchart slide, only clear the container opacity
                if (outgoing && isFlowchartSlide(outgoing)) {
                    window.gsap.set(outgoing, { clearProps: 'opacity' });
                }
                
                // Remove active class from outgoing
                if (outgoing) {
                    outgoing.classList.remove('active');
                }

                // Set final state
                STATE.original.showSlide(targetIndex, direction, { ...(options || {}), force: true });

                // Clear inline styles from incoming and its children
                // BUT exclude React Flow elements
                if (incoming && !isFlowchartSlide(incoming)) {
                    const inChildren = incoming.querySelectorAll('*:not(.react-flow *):not(#flowchart-root *):not([class*="react-flow"])');
                    inChildren.forEach(child => {
                        window.gsap.set(child, { clearProps: 'x,y,opacity,scale,rotation,rotateX,rotateY,clipPath,transform' });
                    });
                }
                if (incoming) {
                    window.gsap.set(incoming, { clearProps: 'opacity,visibility' });
                }

                STATE.transitioning = false;
                setObserverToCurrentState();
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // PHASE 1: EXIT (0 - 0.3s)
        // ─────────────────────────────────────────────────────────────────────
        if (outgoing && !isFlowchartSlide(outgoing)) {
            const exitTL = createExitTimeline(outgoing, direction);
            if (exitTL) {
                masterTL.add(exitTL, 0);
            }
            // Fade out the slide container
            masterTL.to(outgoing, {
                opacity: 0,
                duration: 0.15,
                ease: 'power2.in',
            }, 0.15);
        } else if (outgoing) {
            // Simple fade for flowchart
            masterTL.to(outgoing, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
        }

        // ─────────────────────────────────────────────────────────────────────
        // PHASE 2: CROSSFADE (0.2 - 0.3s overlap)
        // ─────────────────────────────────────────────────────────────────────
        // Reset incoming slide children BEFORE animating
        // BUT exclude React Flow elements which have their own positioning
        if (!isFlowchartSlide(incoming)) {
            const incomingChildren = incoming.querySelectorAll('*:not(.react-flow *):not(#flowchart-root *):not([class*="react-flow"])');
            incomingChildren.forEach(child => {
                window.gsap.set(child, { clearProps: 'x,y,opacity,scale,rotation,rotateX,rotateY,clipPath,transform' });
            });
        }
        
        // Prepare incoming slide
        incoming.classList.add('active');
        incoming.style.visibility = 'visible';
        incoming.style.pointerEvents = 'auto';
        window.gsap.set(incoming, { opacity: 0 });

        // Fade in incoming slide container
        masterTL.to(incoming, {
            opacity: 1,
            duration: 0.2,
            ease: 'power2.out',
        }, 0.2);

        // ─────────────────────────────────────────────────────────────────────
        // PHASE 3: ENTRANCE (0.25 - 0.6s)
        // ─────────────────────────────────────────────────────────────────────
        const entranceTL = createEntranceTimeline(incoming, direction);
        if (entranceTL) {
            masterTL.add(entranceTL, 0.25);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SIMPLE CROSSFADE (for edge cases)
    // ═══════════════════════════════════════════════════════════════════════════

    async function simpleCrossfadeToIndex(targetIndex, direction, options) {
        const slides = getSlides();
        const total = slides.length;
        if (total === 0) return;

        const nextIndex = normalizeIndex(targetIndex, total);
        const incoming = slides[nextIndex];
        const outgoing = document.querySelector('.slide-container.active');

        if (!outgoing || outgoing === incoming) {
            STATE.original.showSlide(targetIndex, direction, { ...(options || {}), force: true });
            return;
        }

        if (!hasGSAP()) {
            STATE.original.showSlide(targetIndex, direction, options);
            return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // SNOO 3D CAMERA ANIMATION - When leaving the intro slide
        // ═══════════════════════════════════════════════════════════════════
        if (isSnooSlide(outgoing) && direction === 'next') {
            const iframe = getSnooIframe(outgoing);
            if (iframe) {
                // Animate Snoo camera before transitioning
                await animateSnooCamera(iframe, direction);
            }
        }

        performTransition(outgoing, incoming, targetIndex, direction, options);
    }

    async function transitionToIndex(targetIndex, direction, options) {
        const slides = getSlides();
        const total = slides.length;
        if (total === 0) return;

        const nextIndex = normalizeIndex(targetIndex, total);
        const incoming = slides[nextIndex];
        const outgoing = document.querySelector('.slide-container.active');

        if (!outgoing || outgoing === incoming) {
            return await simpleCrossfadeToIndex(targetIndex, direction, options);
        }

        if (!hasGSAP() || prefersReducedMotion()) {
            return STATE.original.showSlide(targetIndex, direction, options);
        }

        return await simpleCrossfadeToIndex(targetIndex, direction, options);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GRID VIEW ANIMATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function animateGridEnter() {
        if (!hasGSAP() || prefersReducedMotion()) return;
        const wrapper = document.querySelector('.slides-wrapper');
        const slides = getSlides();

        window.gsap.killTweensOf([wrapper, ...slides]);
        window.gsap.set(wrapper, { willChange: 'opacity,transform' });
        window.gsap.set(slides, { willChange: 'opacity,transform' });

        const tl = window.gsap.timeline({
            defaults: { ease: 'power2.out' },
            onComplete: () => {
                window.gsap.set([wrapper, ...slides], { clearProps: 'willChange,opacity,transform' });
            },
        });

        tl.fromTo(wrapper, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);
        tl.fromTo(slides, { opacity: 0, y: 15, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.02 }, 0.05);
    }

    function clearGridScrollReveal() {
        if (!STATE.gridScrollTriggers || !STATE.gridScrollTriggers.length) return;
        try {
            STATE.gridScrollTriggers.forEach((t) => {
                try { if (t && typeof t.kill === 'function') t.kill(); } catch {}
            });
        } finally {
            STATE.gridScrollTriggers = [];
        }
    }

    function setupGridScrollReveal() {
        if (!hasScrollTrigger() || prefersReducedMotion()) return;
        if (!isGridView()) return;

        clearGridScrollReveal();

        const scroller = document.querySelector('.slides-wrapper');
        if (!scroller) return;

        const slides = getSlides();
        if (!slides.length) return;

        slides.forEach((slideEl) => {
            if (isFlowchartSlide(slideEl)) return;

            window.gsap.set(slideEl, { clearProps: 'opacity,transform' });

            const tween = window.gsap.fromTo(slideEl,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', paused: true }
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

        try { window.ScrollTrigger.refresh(); } catch {}
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
            scale: 0.98,
            duration: 0.18,
            ease: 'power2.in',
            onComplete: () => {
                onDone();
                window.gsap.set(wrapper, { clearProps: 'opacity,scale' });
            },
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OBSERVER NAVIGATION (wheel/touch/drag)
    // ═══════════════════════════════════════════════════════════════════════════

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

    function setObserverToCurrentState() {
        setObserverEnabled(shouldEnableObserverNow());
    }

    function setupObserverNav() {
        if (!hasObserver() || STATE.observer) return;

        const cooldownMs = 650; // Slightly longer for 0.6s transitions
        let lastNavAt = 0;

        STATE.observer = window.gsap.plugins.Observer.create({
            target: window,
            type: 'wheel,touch,pointer',
            wheelSpeed: -1,
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

        setObserverEnabled(false);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MICRO-INTERACTIONS (hover effects)
    // ═══════════════════════════════════════════════════════════════════════════

    function setupHoverEffects() {
        if (!hasGSAP() || prefersReducedMotion()) return;

        // Tiles hover
        document.querySelectorAll('.tile').forEach(tile => {
            tile.addEventListener('mouseenter', () => {
                window.gsap.to(tile, {
                    scale: 1.02,
                    y: -4,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    duration: 0.25,
                    ease: 'power2.out',
                });
            });
            tile.addEventListener('mouseleave', () => {
                window.gsap.to(tile, {
                    scale: 1,
                    y: 0,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    duration: 0.25,
                    ease: 'power2.out',
                });
            });
        });

        // Control buttons hover
        document.querySelectorAll('.controls button, .btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                window.gsap.to(btn, {
                    scale: 1.08,
                    duration: 0.2,
                    ease: 'power2.out',
                });
            });
            btn.addEventListener('mouseleave', () => {
                window.gsap.to(btn, {
                    scale: 1,
                    duration: 0.2,
                    ease: 'power2.out',
                });
            });
        });

        // Image wrappers subtle hover
        document.querySelectorAll('.image-wrapper').forEach(wrapper => {
            wrapper.addEventListener('mouseenter', () => {
                window.gsap.to(wrapper, {
                    scale: 1.01,
                    duration: 0.3,
                    ease: 'power2.out',
                });
            });
            wrapper.addEventListener('mouseleave', () => {
                window.gsap.to(wrapper, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out',
                });
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NAVIGATION WRAPPER
    // ═══════════════════════════════════════════════════════════════════════════

    function wrapNavigation() {
        if (STATE.initialized) return;

        const originalShowSlide = window.showSlide;
        const originalNext = window.nextSlide;
        const originalPrev = window.prevSlide;
        const originalToggleGridView = window.toggleGridView;

        if (typeof originalShowSlide !== 'function') return;

        STATE.original.showSlide = originalShowSlide;
        STATE.original.nextSlide = typeof originalNext === 'function' ? originalNext : null;
        STATE.original.prevSlide = typeof originalPrev === 'function' ? originalPrev : null;
        STATE.original.toggleGridView = typeof originalToggleGridView === 'function' ? originalToggleGridView : null;

        // Wrap showSlide
        window.showSlide = function (n, direction, options) {
            if (STATE.transitioning) return;
            if (isGridView()) {
                return STATE.original.showSlide(n, direction, options);
            }
            transitionToIndex(n, direction, options);
        };

        // Wrap nextSlide
        if (STATE.original.nextSlide) {
            window.nextSlide = function () {
                if (STATE.transitioning || isGridView()) return;
                STATE.original.nextSlide();
            };
        }

        // Wrap prevSlide
        if (STATE.original.prevSlide) {
            window.prevSlide = function () {
                if (STATE.transitioning || isGridView()) return;
                STATE.original.prevSlide();
            };
        }

        // Wrap toggleGridView
        if (STATE.original.toggleGridView) {
            window.toggleGridView = function () {
                if (!hasGSAP() || prefersReducedMotion()) {
                    const result = STATE.original.toggleGridView();
                    setObserverToCurrentState();
                    return result;
                }

                const currentlyGrid = isGridView();

                if (!currentlyGrid) {
                    // Enter grid view
                    cleanupAllSplits(); // Clean up any active splits
                    const result = STATE.original.toggleGridView();
                    setObserverToCurrentState();
                    animateGridEnter();
                    setupGridScrollReveal();
                    return result;
                }

                // Exit grid view
                return animateGridExit(() => {
                    STATE.original.toggleGridView();
                    setObserverToCurrentState();

                    const active = currentActiveSlide();
                    if (active && hasGSAP() && !prefersReducedMotion()) {
                        const entranceTL = createEntranceTimeline(active, 'next');
                        if (entranceTL) entranceTL.play();
                    }
                });
            };
        }

        STATE.initialized = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        registerPlugins();
        wrapNavigation();
        setupObserverNav();
        setupHoverEffects();

        // Keep observer state in sync
        const syncObserver = () => setObserverEnabled(shouldEnableObserverNow());
        window.addEventListener('keydown', () => syncObserver(), { passive: true });
        window.addEventListener('click', () => syncObserver(), { passive: true });
        window.addEventListener('resize', () => syncObserver(), { passive: true });
        syncObserver();

        // Log status
        if (hasGSAP()) {
            console.log('🎬 GSAP Premium Animations loaded');
            if (hasSplitText()) {
                console.log('✨ SplitText enabled for title animations');
            } else {
                console.log('⚠️ SplitText not available - using fallback animations');
            }
        }

        if (STATE.initialized) return;
        
        // Retry a few times for script load order safety
        let tries = 0;
        const timer = setInterval(() => {
            wrapNavigation();
            setupHoverEffects();
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
