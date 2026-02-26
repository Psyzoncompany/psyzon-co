document.addEventListener('DOMContentLoaded', () => {
    initAnimation();
    initScrollAnimations();
});

/**
 * Image Sequence Animation (Hero Section)
 * Plays once over 6 seconds and stops.
 */
function initAnimation() {
    const canvas = document.getElementById('tshirt-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const frameCount = 80;
    const totalDuration = 6000; // 6 seconds as requested
    const frameDelay = totalDuration / frameCount;
    const imagePath = 'image/tshit animação/Tshirt_animation_studio_workbench_delpmaspu__';

    const images = [];
    const animationState = { frame: 0, loaded: 0 };

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
        render();
    }

    window.addEventListener('resize', resizeCanvas);

    // Preload images
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.src = `${imagePath}${i.toString().padStart(3, '0')}.jpg`;
        img.onload = () => {
            animationState.loaded++;
            if (animationState.loaded === frameCount) {
                resizeCanvas();
                startExperience();
            }
        };
        images.push(img);
    }

    function render() {
        if (!images[animationState.frame]) return;

        const img = images[animationState.frame];
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        const imgRatio = 1280 / 720;
        const canvasRatio = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasRatio > imgRatio) {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
            offsetX = 0;
            offsetY = (canvasHeight - drawHeight) / 2;
        } else {
            drawWidth = canvasHeight * imgRatio;
            drawHeight = canvasHeight;
            offsetX = (canvasWidth - drawWidth) / 2;
            offsetY = 0;
        }

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    function startExperience() {
        // Start typing sequence
        typeHeroText();

        // Start background animation
        function animate() {
            if (animationState.frame < frameCount - 1) {
                animationState.frame++;
                render();
                setTimeout(() => {
                    requestAnimationFrame(animate);
                }, frameDelay);
            }
        }
        requestAnimationFrame(animate);
    }
}

async function typeHeroText() {
    const h1 = document.querySelector('.hero-content h1');
    const p = document.querySelector('.hero-content p');
    const actions = document.querySelector('.hero-actions');

    if (!h1 || !p) return;

    const h1Full = "Moda Streetwear Premium.";
    const pFull = "Estúdio de vestuário personalizado focado em design minimalista e qualidade têxtil superior.";

    h1.innerHTML = '';
    p.innerHTML = '';

    h1.classList.add('visible');
    await typeEffect(h1, h1Full, 70);

    await new Promise(r => setTimeout(r, 300));

    p.classList.add('visible');
    await typeEffect(p, pFull, 25);

    await new Promise(r => setTimeout(r, 500));
    actions.classList.add('visible');
}

function typeEffect(element, text, speed) {
    return new Promise(resolve => {
        let i = 0;
        element.classList.add('typewriter-cursor');

        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                element.classList.remove('typewriter-cursor');
                resolve();
            }
        }
        type();
    });
}

function initScrollAnimations() {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.glass-card, .fade-in');
    fadeElements.forEach(el => observer.observe(el));
}
