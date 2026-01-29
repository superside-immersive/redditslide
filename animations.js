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
