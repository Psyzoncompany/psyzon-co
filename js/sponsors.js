/* ==========================================================================
   PSYZON STREAM — Carrossel de Patrocinadores
   Exibe imagens de patrocinadores individualmente com rotação automática.
   Cada imagem aparece por 7 segundos; após as imagens de um cliente
   finalizarem, avança para o próximo cliente.
   ========================================================================== */

(function () {
    'use strict';

    // ======================================================================
    // 1. DADOS DOS PATROCINADORES
    // Cada cliente tem um nome e até 3 imagens.
    // Para adicionar novos patrocinadores, basta adicionar objetos aqui.
    // ======================================================================
    var sponsorClients = [
        {
            name: 'Patrocinador 1',
            images: [
                'https://placehold.co/800x400/8b5cf6/ffffff?text=Patrocinador+1A',
                'https://placehold.co/600x600/7c3aed/ffffff?text=Patrocinador+1B',
                'https://placehold.co/400x800/6d28d9/ffffff?text=Patrocinador+1C'
            ]
        },
        {
            name: 'Patrocinador 2',
            images: [
                'https://placehold.co/900x500/06b6d4/ffffff?text=Patrocinador+2A',
                'https://placehold.co/500x500/0891b2/ffffff?text=Patrocinador+2B',
                'https://placehold.co/700x400/0e7490/ffffff?text=Patrocinador+2C'
            ]
        },
        {
            name: 'Patrocinador 3',
            images: [
                'https://placehold.co/800x600/22c55e/ffffff?text=Patrocinador+3A',
                'https://placehold.co/600x800/16a34a/ffffff?text=Patrocinador+3B',
                'https://placehold.co/500x400/15803d/ffffff?text=Patrocinador+3C'
            ]
        }
    ];

    // ======================================================================
    // 2. ESTADO DO CARROSSEL
    // ======================================================================
    var DISPLAY_DURATION = 7000; // 7 segundos por imagem
    var currentClientIndex = 0;
    var currentImageIndex = 0;
    var timerId = null;
    var progressTimerId = null;

    // ======================================================================
    // 3. CACHE DE ELEMENTOS DOM
    // ======================================================================
    var sponsorDisplay = document.getElementById('sponsor-display');
    var sponsorProgressBar = document.getElementById('sponsor-progress-bar');
    var sponsorClientName = document.getElementById('sponsor-client-name');
    var sponsorCounter = document.getElementById('sponsor-counter');

    // ======================================================================
    // 4. LOGICA DO CARROSSEL
    // ======================================================================

    /**
     * Exibe a imagem atual do patrocinador com animação de entrada.
     */
    function showCurrentSponsor() {
        if (sponsorClients.length === 0) return;

        var client = sponsorClients[currentClientIndex];
        var imageSrc = client.images[currentImageIndex];

        // Atualiza informações do patrocinador
        sponsorClientName.textContent = client.name;

        var totalImages = getTotalImageCount();
        var currentGlobal = getGlobalImageIndex() + 1;
        sponsorCounter.textContent = currentGlobal + ' / ' + totalImages;

        // Cria novo card com a imagem
        var card = document.createElement('div');
        card.className = 'sponsor-card sponsor-card--entering';
        card.setAttribute('role', 'img');
        card.setAttribute('aria-label', client.name + ' - Imagem ' + (currentImageIndex + 1));

        var img = document.createElement('img');
        img.src = imageSrc;
        img.alt = client.name;
        img.className = 'sponsor-card-image';
        img.draggable = false;

        // Quando a imagem carrega, adapta o card ao formato da imagem
        img.addEventListener('load', function () {
            var ratio = img.naturalWidth / img.naturalHeight;
            if (ratio > 1.4) {
                // Imagem paisagem larga
                card.classList.add('sponsor-card--landscape');
            } else if (ratio < 0.7) {
                // Imagem retrato alta
                card.classList.add('sponsor-card--portrait');
            } else {
                // Imagem quadrada ou próxima
                card.classList.add('sponsor-card--square');
            }
        });

        card.appendChild(img);

        // Remove card anterior com animação de saída
        var existingCards = sponsorDisplay.querySelectorAll('.sponsor-card');
        for (var i = 0; i < existingCards.length; i++) {
            (function (oldCard) {
                oldCard.classList.remove('sponsor-card--entering');
                oldCard.classList.add('sponsor-card--exiting');
                setTimeout(function () {
                    if (oldCard.parentNode) {
                        oldCard.parentNode.removeChild(oldCard);
                    }
                }, 600);
            })(existingCards[i]);
        }

        sponsorDisplay.appendChild(card);

        // Remove classe de entrada após animação
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                card.classList.remove('sponsor-card--entering');
                card.classList.add('sponsor-card--visible');
            });
        });

        // Reinicia barra de progresso
        startProgressBar();
    }

    /**
     * Avança para a próxima imagem.
     * Se terminou as imagens do cliente atual, vai para o próximo cliente.
     */
    function advanceToNext() {
        var client = sponsorClients[currentClientIndex];

        currentImageIndex++;
        if (currentImageIndex >= client.images.length) {
            // Terminou as imagens deste cliente, avança para o próximo
            currentImageIndex = 0;
            currentClientIndex++;
            if (currentClientIndex >= sponsorClients.length) {
                // Voltou ao início
                currentClientIndex = 0;
            }
        }

        showCurrentSponsor();
    }

    /**
     * Retorna o número total de imagens de todos os clientes.
     */
    function getTotalImageCount() {
        var total = 0;
        for (var i = 0; i < sponsorClients.length; i++) {
            total += sponsorClients[i].images.length;
        }
        return total;
    }

    /**
     * Retorna o índice global da imagem atual (posição entre todas as imagens).
     */
    function getGlobalImageIndex() {
        var index = 0;
        for (var i = 0; i < currentClientIndex; i++) {
            index += sponsorClients[i].images.length;
        }
        index += currentImageIndex;
        return index;
    }

    /**
     * Inicia a barra de progresso visual de 7 segundos.
     */
    function startProgressBar() {
        // Reseta a barra
        sponsorProgressBar.style.transition = 'none';
        sponsorProgressBar.style.width = '0%';

        // Força reflow para reiniciar a animação
        void sponsorProgressBar.offsetWidth;

        // Anima até 100% em DISPLAY_DURATION
        sponsorProgressBar.style.transition = 'width ' + (DISPLAY_DURATION / 1000) + 's linear';
        sponsorProgressBar.style.width = '100%';
    }

    /**
     * Inicia o timer de rotação automática.
     */
    function startCarousel() {
        if (sponsorClients.length === 0) return;

        showCurrentSponsor();

        timerId = setInterval(function () {
            advanceToNext();
        }, DISPLAY_DURATION);
    }

    /**
     * Para o carrossel.
     */
    function stopCarousel() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    // ======================================================================
    // 5. INICIALIZACAO
    // ======================================================================

    function initSponsors() {
        if (sponsorClients.length === 0 || !sponsorDisplay) return;
        startCarousel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSponsors);
    } else {
        initSponsors();
    }

})();
