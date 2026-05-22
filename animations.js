let currentIndex = 0;
let isGridView = false;

function getSlides() {
    return Array.from(document.querySelectorAll('.slide-container:not(.gsap-clone)'));
}

function normalizeIndex(n, total) {
    if (n >= total) return 0;
    if (n < 0) return total - 1;
    return n;
}

function refreshSlideNumbers() {
    const slides = getSlides();
    slides.forEach((slide, idx) => {
        slide.dataset.slideNum = String(idx + 1);
        slide.dataset.slideIndex = String(idx);
    });
}

function showSlide(n, direction = 'next', options = {}) {
    const slides = getSlides();
    const totalSlides = slides.length;
    if (totalSlides === 0) return;

    const nextIndex = normalizeIndex(n, totalSlides);
    if (isGridView) return;
    if (!options.force && nextIndex === currentIndex) return;

    slides.forEach(slide => slide.classList.remove('active'));
    slides[nextIndex].classList.add('active');

    currentIndex = nextIndex;
    updateIndicator(totalSlides);
}

function toggleGridView() {
    const body = document.body;
    const slides = getSlides();
    isGridView = !isGridView;

    if (isGridView) {
        body.classList.add('grid-view');
        refreshSlideNumbers();
        slides.forEach(slide => {
            slide.classList.add('active');
            slide.onclick = (e) => {
                // Don't navigate if clicking inside React Flow
                if (e.target.closest('#flowchart-root') || e.target.closest('.flowchart-toggles')) {
                    return;
                }
                goToSlide(parseInt(slide.dataset.slideIndex, 10));
            };
        });
        const indicator = document.getElementById('slideIndicator');
        if (indicator) indicator.innerText = 'Grid View';
        return;
    }

    body.classList.remove('grid-view');
    slides.forEach(slide => {
        slide.classList.remove('active');
        slide.onclick = null;
    });
    const currentEl = slides[currentIndex];
    if (currentEl) currentEl.classList.add('active');
    updateIndicator(slides.length);
}

function goToSlide(n) {
    if (!isGridView) return;
    currentIndex = normalizeIndex(n, getSlides().length);
    toggleGridView();
}

window.goToSlide = goToSlide;

function updateIndicator(totalSlides) {
    const indicator = document.getElementById('slideIndicator');
    if (indicator) indicator.innerText = `${currentIndex + 1} / ${totalSlides}`;
}

function nextSlide() {
    showSlide(currentIndex + 1, 'next');
}

function prevSlide() {
    showSlide(currentIndex - 1, 'prev');
}

function downloadHTML() {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reddit_modular_proposal.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Flowchart Sidebar Toggle
let isSidebarOpen = false;

function toggleFlowchartSidebar() {
    const sidebar = document.getElementById('flowchartSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    isSidebarOpen = !isSidebarOpen;
    
    if (isSidebarOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }
}

// Keyboard navigation
window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
        nextSlide();
    } else if (event.key === 'ArrowLeft') {
        prevSlide();
    } else if (event.key === 'g' || event.key === 'G') {
        toggleGridView();
    } else if (event.key === 'a' || event.key === 'A') {
        toggleFlowchartSidebar();
    } else if (event.key === 'Escape' && isSidebarOpen) {
        toggleFlowchartSidebar();
    }
});

// Touch / swipe navigation for mobile + on-screen prev/next buttons
(function setupTouchNavigation() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let trackingTouch = false;
    let suppressClickUntil = 0;

    const SWIPE_THRESHOLD = 50;      // min horizontal px
    const VERTICAL_LIMIT = 80;       // max vertical drift
    const MAX_DURATION = 800;        // ms
    const TAP_MOVE_LIMIT = 12;       // max movement to still count as tap

    function isInteractiveTarget(target) {
        if (!target || !(target instanceof Element)) return false;
        return !!target.closest(
            'button, a, input, textarea, select, label, ' +
            '#flowchart-root, .flowchart-toggles, ' +
            '#sidebar-flowchart-root, .flowchart-sidebar, ' +
            '.title-snoo-embed, .scan-slideshow, .react-flow'
        );
    }

    function navigateByScreenHalf(clientX) {
        if (clientX < window.innerWidth / 2) {
            prevSlide();
        } else {
            nextSlide();
        }
    }

    window.addEventListener('touchstart', (e) => {
        if (isGridView || isSidebarOpen) { trackingTouch = false; return; }
        if (e.touches.length !== 1) { trackingTouch = false; return; }
        if (isInteractiveTarget(e.target)) { trackingTouch = false; return; }
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
        trackingTouch = true;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (!trackingTouch) return;
        trackingTouch = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const dt = Date.now() - touchStartTime;
        if (dt > MAX_DURATION) return;
        if (Math.abs(dy) > VERTICAL_LIMIT) return;
        if (Math.abs(dx) >= SWIPE_THRESHOLD) {
            if (dx < 0) nextSlide(); else prevSlide();
            suppressClickUntil = Date.now() + 450;
            return;
        }

        // Tap on left/right half also navigates on touch devices.
        if (Math.abs(dx) <= TAP_MOVE_LIMIT && Math.abs(dy) <= TAP_MOVE_LIMIT) {
            navigateByScreenHalf(t.clientX);
            suppressClickUntil = Date.now() + 450;
        }
    }, { passive: true });

    window.addEventListener('pointerup', (e) => {
        if (Date.now() < suppressClickUntil) return;
        if (window.innerWidth > 900) return;
        if (isGridView || isSidebarOpen) return;
        if (isInteractiveTarget(e.target)) return;
        if (typeof e.clientX !== 'number') return;

        navigateByScreenHalf(e.clientX);
        suppressClickUntil = Date.now() + 250;
    });

    // Fallback so taps on left/right half navigate even when touch events are not exposed.
    window.addEventListener('click', (e) => {
        if (Date.now() < suppressClickUntil) return;
        if (window.innerWidth > 900) return;
        if (isGridView || isSidebarOpen) return;
        if (isInteractiveTarget(e.target)) return;
        if (typeof e.clientX !== 'number') return;

        navigateByScreenHalf(e.clientX);
    });

    // Inject on-screen prev/next buttons (mobile-friendly fallback)
    window.addEventListener('DOMContentLoaded', () => {
        const controls = document.querySelector('.controls');
        if (!controls || document.getElementById('mobileNavBtns')) return;
        const wrap = document.createElement('div');
        wrap.id = 'mobileNavBtns';
        wrap.className = 'mobile-nav-btns';
        wrap.innerHTML = `
            <button class="btn nav-btn" aria-label="Previous slide" onclick="prevSlide()">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button class="btn nav-btn" aria-label="Next slide" onclick="nextSlide()">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;
        controls.parentNode.insertBefore(wrap, controls);
    });

    window.addEventListener('DOMContentLoaded', () => {
        const prevBtn = document.getElementById('mobilePrevBtn');
        const nextBtn = document.getElementById('mobileNextBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                prevSlide();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                nextSlide();
            });
        }
    });
})();

// Animate the first slide in on load
window.addEventListener('DOMContentLoaded', () => {
    const totalSlides = getSlides().length;
    refreshSlideNumbers();
    updateIndicator(totalSlides);
    showSlide(currentIndex, 'next', { force: true });
});

// Expose controls to HTML buttons
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.downloadHTML = downloadHTML;
window.toggleGridView = toggleGridView;
window.toggleFlowchartSidebar = toggleFlowchartSidebar;
