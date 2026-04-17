/* ============================================
   PANTO PITCH DECK — APP LOGIC (FIXED)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    let currentSlide = 0;
    let isTransitioning = false;

    // DOM refs
    const currentSlideEl = document.getElementById('current-slide');
    const totalSlidesEl = document.getElementById('total-slides');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const navDotsContainer = document.getElementById('nav-dots');
    const keyboardHint = document.getElementById('keyboard-hint');

    // Initialize
    totalSlidesEl.textContent = totalSlides;
    createNavDots();
    initSlides();
    updateArrowStates();

    // Hide keyboard hint after 5 seconds
    setTimeout(() => {
        keyboardHint.classList.add('hidden');
    }, 5000);

    // --- Initialize slide states ---
    function initSlides() {
        slides.forEach((slide, i) => {
            if (i === 0) {
                slide.classList.add('active');
                slide.style.opacity = '1';
                slide.style.visibility = 'visible';
                slide.style.transform = 'translateX(0)';
            } else {
                slide.classList.remove('active');
                slide.style.opacity = '0';
                slide.style.visibility = 'hidden';
                slide.style.transform = 'translateX(60px)';
            }
        });
    }

    // --- Navigation dots ---
    function createNavDots() {
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = 'nav-dot' + (i === 0 ? ' active' : '');
            dot.dataset.slide = i;
            dot.addEventListener('click', () => goToSlide(i));
            navDotsContainer.appendChild(dot);
        }
    }

    function updateNavDots() {
        navDotsContainer.querySelectorAll('.nav-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
        });
    }

    // --- Slide transitions (FIXED) ---
    function goToSlide(index) {
        if (isTransitioning || index === currentSlide || index < 0 || index >= totalSlides) return;
        isTransitioning = true;

        const goingForward = index > currentSlide;
        const outgoing = slides[currentSlide];
        const incoming = slides[index];

        // 1. Prepare incoming slide at off-screen position (no transition yet)
        incoming.style.transition = 'none';
        incoming.style.visibility = 'visible';
        incoming.style.opacity = '0';
        incoming.style.transform = goingForward ? 'translateX(80px)' : 'translateX(-80px)';
        incoming.classList.remove('active');

        // Force reflow so the "no transition" positioning takes effect
        incoming.offsetHeight;

        // 2. Re-enable transitions
        incoming.style.transition = '';

        // 3. Animate both slides
        requestAnimationFrame(() => {
            // Outgoing slides out
            outgoing.classList.remove('active');
            outgoing.style.opacity = '0';
            outgoing.style.transform = goingForward ? 'translateX(-80px)' : 'translateX(80px)';

            // Incoming slides in
            incoming.classList.add('active');
            incoming.style.opacity = '1';
            incoming.style.transform = 'translateX(0)';

            // 4. After transition completes, clean up
            const onDone = () => {
                outgoing.style.visibility = 'hidden';
                currentSlide = index;
                currentSlideEl.textContent = currentSlide + 1;
                updateNavDots();
                updateArrowStates();
                isTransitioning = false;
                incoming.removeEventListener('transitionend', onDone);
            };

            // Listen for transition end on incoming slide
            incoming.addEventListener('transitionend', onDone, { once: true });

            // Safety timeout in case transitionend doesn't fire
            setTimeout(() => {
                if (isTransitioning) {
                    onDone();
                }
            }, 700);
        });
    }

    function nextSlide() {
        if (currentSlide < totalSlides - 1) goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        if (currentSlide > 0) goToSlide(currentSlide - 1);
    }

    function updateArrowStates() {
        prevBtn.style.opacity = currentSlide === 0 ? '0.3' : '1';
        prevBtn.style.pointerEvents = currentSlide === 0 ? 'none' : 'auto';
        nextBtn.style.opacity = currentSlide === totalSlides - 1 ? '0.3' : '1';
        nextBtn.style.pointerEvents = currentSlide === totalSlides - 1 ? 'none' : 'auto';
    }

    // --- Event listeners ---
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevSlide();
        }
    });

    // Touch / swipe
    let touchStartX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) < 50) return;
        if (diff > 0) nextSlide();
        else prevSlide();
    }, { passive: true });

    // Mouse wheel
    let wheelTimeout;
    document.addEventListener('wheel', (e) => {
        if (wheelTimeout) return;
        wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 800);
        if (e.deltaY > 0) nextSlide();
        else prevSlide();
    }, { passive: true });

    // Click on slides to advance (skip nav area)
    document.querySelectorAll('.slide').forEach(slide => {
        slide.addEventListener('click', (e) => {
            if (e.target.closest('button, a, .nav-dots, .slide-nav')) return;
            const rect = slide.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            if (clickX > rect.width / 2) nextSlide();
            else prevSlide();
        });
    });
});
