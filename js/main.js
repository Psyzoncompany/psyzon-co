document.addEventListener('DOMContentLoaded', () => {
    initAnimation();
    initScrollAnimations();
    initCardHoverAnimations();
    initCursorBlinkAnimation();
    initSkeletonShimmer();
    initAuthModal();
    initFirebase();
});

// ── Admin e-mail – troque aqui e em firestore.rules para liberar o painel de upload ──
const ADMIN_EMAIL = 'ADMIN_EMAIL_AQUI';

// Firebase Configuration (Request: User should fill these with their actual project keys)
const firebaseConfig = {
    apiKey: "AIzaSyCJu5MqpS4oIPvmaz3tyvVbQm92CR3yYEU",
    authDomain: "site-psyzon.firebaseapp.com",
    projectId: "site-psyzon",
    storageBucket: "site-psyzon.firebasestorage.app",
    messagingSenderId: "782092420102",
    appId: "1:782092420102:web:aa9822b42fad3d1a5f6f87"
};

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log("Firebase Initialized");

        initGallery();

        firebase.auth().onAuthStateChanged(user => {
            const isAdmin = user && user.email === ADMIN_EMAIL;
            const isLoggedIn = !!user;
            const fabBtn = document.getElementById('admin-upload-btn');
            if (fabBtn) fabBtn.style.display = isLoggedIn ? 'flex' : 'none';

            // Update login trigger to reflect auth state
            const loginTrigger = document.getElementById('login-trigger');
            if (loginTrigger) {
                if (user) {
                    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário');
                    loginTrigger.textContent = displayName;
                    loginTrigger.dataset.logged = 'true';
                } else {
                    loginTrigger.textContent = 'Login';
                    loginTrigger.dataset.logged = 'false';
                }
            }

            // Re-render gallery cards to show/hide delete buttons
            renderGalleryAdminState(isAdmin);
        });
    } else {
        console.error("Firebase SDK not loaded");
    }
}

function initAuthModal() {
    const modal = document.getElementById('auth-modal');
    const loginTrigger = document.getElementById('login-trigger');
    const closeBtn = document.getElementById('close-modal');
    const toSignup = document.getElementById('to-signup');
    const toLogin = document.getElementById('to-login');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');

    if (!modal || !loginTrigger) return;

    // Show/Hide Modal or Logout
    loginTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginTrigger.dataset.logged === 'true') {
            if (confirm('Deseja sair da sua conta?')) {
                firebase.auth().signOut().then(() => {
                    console.log('User signed out');
                }).catch(err => {
                    alert('Erro ao sair: ' + err.message);
                });
            }
        } else {
            modal.classList.add('active');
            anime({
                targets: modal,
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutCubic'
            });
        }
    });

    function closeModal() {
        anime({
            targets: modal,
            opacity: [1, 0],
            duration: 300,
            easing: 'easeInCubic',
            complete: () => modal.classList.remove('active')
        });
    }

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Switch Views
    toSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.style.display = 'none';
        signupView.style.display = 'block';
    });

    toLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupView.style.display = 'none';
        loginView.style.display = 'block';
    });

    // Auth Logic
    const googleBtns = document.querySelectorAll('#google-login, #google-signup');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider)
                .then(result => {
                    console.log("Logged in with Google:", result.user.displayName);
                    closeModal();
                })
                .catch(error => {
                    alert("Erro ao entrar com Google: " + error.message);
                });
        });
    });

    // Email Login
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        firebase.auth().signInWithEmailAndPassword(email, pass)
            .then(() => {
                closeModal();
            })
            .catch(err => alert("Erro ao fazer login: " + err.message));
    });

    // Email Signup
    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-password').value;
        firebase.auth().createUserWithEmailAndPassword(email, pass)
            .then(() => {
                closeModal();
            })
            .catch(err => alert("Erro ao criar conta: " + err.message));
    });
}

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
    anime({
        targets: actions,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        easing: 'easeOutCubic'
    });
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
                anime({
                    targets: entry.target,
                    opacity: [0, 1],
                    translateY: [30, 0],
                    duration: 1000,
                    easing: 'easeOutCubic'
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.glass-card, .fade-in');
    fadeElements.forEach(el => observer.observe(el));
}

function initCardHoverAnimations() {
    const cards = document.querySelectorAll('.glass-card, .gallery-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            anime({
                targets: card,
                translateY: -10,
                background: 'rgba(255, 255, 255, 0.6)',
                duration: 400,
                easing: 'cubicBezier(0.165, 0.84, 0.44, 1)'
            });
        });
        card.addEventListener('mouseleave', () => {
            anime({
                targets: card,
                translateY: 0,
                background: 'rgba(255, 255, 255, 0.4)',
                duration: 400,
                easing: 'cubicBezier(0.165, 0.84, 0.44, 1)'
            });
        });
    });
}

function initCursorBlinkAnimation() {
    const cursors = document.querySelectorAll('.typewriter-cursor::after');
    if (cursors.length === 0) {
        // Animate cursor blink via a style injection for the pseudo-element
        anime({
            targets: '.typewriter-cursor',
            keyframes: [
                { opacity: 1 },
                { opacity: 0 },
                { opacity: 1 }
            ],
            duration: 1000,
            loop: true,
            easing: 'steps(1)'
        });
    }
}

function initSkeletonShimmer() {
    const skeletons = document.querySelectorAll('.gallery-skeleton');
    if (skeletons.length > 0) {
        anime({
            targets: '.gallery-skeleton',
            backgroundPosition: ['200% 0', '-200% 0'],
            duration: 1400,
            loop: true,
            easing: 'linear'
        });
    }
}

// ── Gallery ──────────────────────────────────────────────────────────────────

let galleryItems = [];
let galleryIsAdmin = false;

function initGallery() {
    const db = firebase.firestore();
    db.collection('gallery')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            galleryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderGallery();
        }, err => {
            console.error('Gallery load error:', err);
        });

    initUploadModal();
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (galleryItems.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">Nenhuma peça adicionada ainda.</p>';
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                anime({
                    targets: entry.target,
                    opacity: [0, 1],
                    translateY: [30, 0],
                    duration: 1000,
                    easing: 'easeOutCubic'
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    galleryItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gallery-card fade-in';
        card.dataset.id = item.id;
        card.dataset.storagePath = item.storagePath || '';

        const date = item.createdAt && item.createdAt.toDate
            ? item.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
            : '';

        card.innerHTML = `
            <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy">
            <div class="gallery-card-info">
                <h3>${escapeHtml(item.name)}</h3>
                ${date ? `<span>${date}</span>` : ''}
            </div>
            ${galleryIsAdmin ? `<button class="gallery-delete-btn" title="Excluir peça">🗑</button>` : ''}
        `;

        if (galleryIsAdmin) {
            const deleteBtn = card.querySelector('.gallery-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => deleteGalleryItem(item));
            }
        }

        // Anime.js hover animation for gallery cards
        card.addEventListener('mouseenter', () => {
            anime({
                targets: card,
                translateY: -10,
                background: 'rgba(255, 255, 255, 0.6)',
                duration: 400,
                easing: 'cubicBezier(0.165, 0.84, 0.44, 1)'
            });
        });
        card.addEventListener('mouseleave', () => {
            anime({
                targets: card,
                translateY: 0,
                background: 'rgba(255, 255, 255, 0.4)',
                duration: 400,
                easing: 'cubicBezier(0.165, 0.84, 0.44, 1)'
            });
        });

        grid.appendChild(card);
        observer.observe(card);
    });
}

function renderGalleryAdminState(isAdmin) {
    galleryIsAdmin = isAdmin;
    renderGallery();
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
}

async function deleteGalleryItem(item) {
    if (!confirm(`Excluir "${item.name}"?`)) return;
    try {
        if (item.storagePath) {
            await firebase.storage().ref(item.storagePath).delete();
        }
        await firebase.firestore().collection('gallery').doc(item.id).delete();
    } catch (err) {
        console.error('Erro ao excluir:', err);
        alert('Não foi possível excluir a peça. Tente novamente.');
    }
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

function initUploadModal() {
    const fabBtn = document.getElementById('admin-upload-btn');
    const modal = document.getElementById('upload-modal');
    const closeBtn = document.getElementById('close-upload-modal');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('gallery-file-input');
    const preview = document.getElementById('upload-preview');
    const dropLabel = document.getElementById('drop-zone-label');
    const publishBtn = document.getElementById('publish-btn');
    const nameInput = document.getElementById('gallery-item-name');

    if (!fabBtn || !modal) return;

    let selectedFile = null;

    fabBtn.addEventListener('click', () => {
        resetUploadModal();
        modal.classList.add('active');
        anime({
            targets: modal,
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutCubic'
        });
    });

    function closeUploadModal() {
        anime({
            targets: modal,
            opacity: [1, 0],
            duration: 300,
            easing: 'easeInCubic',
            complete: () => modal.classList.remove('active')
        });
    }

    closeBtn.addEventListener('click', closeUploadModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeUploadModal(); });

    // Drag-and-drop
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelected(file);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFileSelected(fileInput.files[0]);
    });

    function handleFileSelected(file) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('Formato inválido. Use JPG, PNG ou WebP.');
            return;
        }
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            dropLabel.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    publishBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        if (!selectedFile) { alert('Selecione uma foto.'); return; }
        if (!name) { alert('Informe o nome da peça.'); return; }

        publishBtn.disabled = true;
        publishBtn.textContent = 'Publicando…';

        try {
            const timestamp = Date.now();
            const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storagePath = `gallery/${timestamp}_${safeName}`;
            const storageRef = firebase.storage().ref(storagePath);
            await storageRef.put(selectedFile);
            const imageUrl = await storageRef.getDownloadURL();

            await firebase.firestore().collection('gallery').add({
                name,
                imageUrl,
                storagePath,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            closeUploadModal();
        } catch (err) {
            console.error('Erro ao publicar:', err);
            alert('Não foi possível publicar a peça. Verifique sua conexão e tente novamente.');
        } finally {
            publishBtn.disabled = false;
            publishBtn.textContent = 'Publicar';
        }
    });

    function resetUploadModal() {
        selectedFile = null;
        fileInput.value = '';
        preview.src = '';
        preview.style.display = 'none';
        dropLabel.style.display = '';
        nameInput.value = '';
    }
}
