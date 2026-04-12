/* ==========================================================================
   COPA PSYZON — Escolher Jogo Page Controller
   Visitante seleciona o jogo e entra direto no chaveamento
   ========================================================================== */

(function () {
    'use strict';

    function init() {
        bindEvents();
    }

    function bindEvents() {
        // Voltar
        document.getElementById('btn-back').addEventListener('click', function () {
            Utils.navigate('login.html');
        });

        // Game cards
        document.getElementById('game-fifa').addEventListener('click', function () {
            Utils.lsSet('copa_psyzon_game', 'fifa');
            Utils.navigate('chaveamento.html?role=visitor&game=fifa');
        });

        // Disabled games show toast
        var disabledCards = document.querySelectorAll('.game-card.disabled');
        for (var i = 0; i < disabledCards.length; i++) {
            disabledCards[i].addEventListener('click', function () {
                Utils.toast('Este jogo estará disponível em breve!', 'warning');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
