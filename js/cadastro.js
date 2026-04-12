/* ==========================================================================
   COPA PSYZON — Cadastro Page Controller
   Validação de código de acesso de 4 dígitos via Firebase
   ========================================================================== */

(function () {
    'use strict';

    function init() {
        FirebaseConfig.init();
        bindEvents();
    }

    function bindEvents() {
        // Voltar
        document.getElementById('btn-back').addEventListener('click', function () {
            Utils.navigate('login.html');
        });

        // Auto-format: only digits
        var codeInput = document.getElementById('input-code');
        codeInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 4);
        });

        // Validate button
        document.getElementById('btn-validate').addEventListener('click', validateCode);

        // Enter key
        codeInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                validateCode();
            }
        });
    }

    function validateCode() {
        var code = document.getElementById('input-code').value.trim();
        var errorEl = document.getElementById('code-error');
        var successEl = document.getElementById('code-success');
        var spinner = document.getElementById('loading-spinner');

        errorEl.hidden = true;
        successEl.hidden = true;

        if (!code || code.length !== 4 || !/^\d{4}$/.test(code)) {
            errorEl.textContent = 'Insira um código válido de 4 dígitos.';
            errorEl.hidden = false;
            return;
        }

        spinner.hidden = false;

        // Buscar o torneio ativo para validar o código
        FirebaseConfig.get('activeTournament').then(function (tournamentId) {
            if (!tournamentId) {
                spinner.hidden = true;
                errorEl.textContent = 'Nenhum torneio ativo no momento.';
                errorEl.hidden = false;
                return;
            }

            return FirebaseConfig.validateAccessCode(tournamentId, code).then(function (result) {
                spinner.hidden = true;

                if (result.valid) {
                    successEl.textContent = 'Código válido! Entrando...';
                    successEl.hidden = false;

                    // Marcar código como usado
                    FirebaseConfig.markCodeUsed(tournamentId, code, 'Participante');

                    Utils.lsSet('copa_psyzon_participant_code', code);
                    Utils.lsSet('copa_psyzon_tournament_id', tournamentId);

                    setTimeout(function () {
                        Utils.navigate('chaveamento.html?role=participant&tournament=' + tournamentId);
                    }, 1000);
                } else {
                    errorEl.textContent = result.reason || 'Código inválido.';
                    errorEl.hidden = false;
                }
            });
        }).catch(function () {
            spinner.hidden = true;
            errorEl.textContent = 'Erro de conexão. Tente novamente.';
            errorEl.hidden = false;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
