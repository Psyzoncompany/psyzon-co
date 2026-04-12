/* ==========================================================================
   COPA PSYZON — Login Page Controller
   ========================================================================== */

(function () {
    'use strict';

    var LS_ROLE_KEY = 'copa_psyzon_role';
    var LS_REMEMBER_KEY = 'copa_psyzon_remember';

    /* ------------------------------------------------------------------
       Inicialização
    ------------------------------------------------------------------ */
    function init() {
        FirebaseConfig.init();
        checkRememberedChoice();
        bindEvents();
        loadSponsors();
    }

    /* ------------------------------------------------------------------
       Lembrar escolha
    ------------------------------------------------------------------ */
    function checkRememberedChoice() {
        var remember = Utils.lsGet(LS_REMEMBER_KEY);
        var role = Utils.lsGet(LS_ROLE_KEY);

        if (remember && role) {
            document.getElementById('remember-choice').checked = true;
            redirectByRole(role);
        }
    }

    function saveChoice(role) {
        var remember = document.getElementById('remember-choice').checked;
        if (remember) {
            Utils.lsSet(LS_REMEMBER_KEY, true);
            Utils.lsSet(LS_ROLE_KEY, role);
        } else {
            Utils.lsRemove(LS_REMEMBER_KEY);
            Utils.lsRemove(LS_ROLE_KEY);
        }
    }

    function redirectByRole(role) {
        switch (role) {
            case 'organizer':
                Utils.navigate('chaveamento.html?role=organizer');
                break;
            case 'participant':
                Utils.navigate('cadastro.html');
                break;
            case 'bettor':
                Utils.toast('Área do apostador em breve!', 'warning');
                break;
            case 'visitor':
                Utils.navigate('escolherjogo.html');
                break;
        }
    }

    /* ------------------------------------------------------------------
       Eventos
    ------------------------------------------------------------------ */
    function bindEvents() {
        // Organizador
        document.getElementById('btn-organizer').addEventListener('click', function () {
            // Verificar se já está logado
            var user = FirebaseConfig.getCurrentUser();
            if (user) {
                saveChoice('organizer');
                redirectByRole('organizer');
                return;
            }
            openOrgLoginModal();
        });

        // Participante
        document.getElementById('btn-participant').addEventListener('click', function () {
            saveChoice('participant');
            redirectByRole('participant');
        });

        // Apostador
        document.getElementById('btn-bettor').addEventListener('click', function () {
            Utils.toast('Área do apostador em breve!', 'warning');
        });

        // Visitante
        document.getElementById('btn-visitor').addEventListener('click', function () {
            saveChoice('visitor');
            redirectByRole('visitor');
        });

        // Login form
        document.getElementById('org-login-form').addEventListener('submit', handleOrgLogin);
        document.getElementById('org-login-cancel').addEventListener('click', closeOrgLoginModal);

        // Toggle password
        document.getElementById('toggle-password').addEventListener('click', function () {
            var input = document.getElementById('org-password');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        // Click outside modal
        document.getElementById('org-login-modal').addEventListener('click', function (e) {
            if (e.target === this) closeOrgLoginModal();
        });
    }

    /* ------------------------------------------------------------------
       Modal Login Organizador
    ------------------------------------------------------------------ */
    function openOrgLoginModal() {
        document.getElementById('org-login-modal').classList.add('active');
        document.getElementById('org-email').focus();
    }

    function closeOrgLoginModal() {
        document.getElementById('org-login-modal').classList.remove('active');
        document.getElementById('org-login-error').hidden = true;
        document.getElementById('org-login-form').reset();
    }

    function handleOrgLogin(e) {
        e.preventDefault();
        var email = document.getElementById('org-email').value.trim();
        var password = document.getElementById('org-password').value;
        var errorEl = document.getElementById('org-login-error');
        errorEl.hidden = true;

        if (!email || !password) {
            errorEl.textContent = 'Preencha todos os campos.';
            errorEl.hidden = false;
            return;
        }

        FirebaseConfig.loginOrganizer(email, password)
            .then(function () {
                Utils.toast('Login realizado com sucesso!', 'success');
                saveChoice('organizer');
                redirectByRole('organizer');
            })
            .catch(function (err) {
                var msg = 'Erro ao entrar.';
                if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                    msg = 'E-mail ou senha incorretos.';
                } else if (err.code === 'auth/too-many-requests') {
                    msg = 'Muitas tentativas. Tente mais tarde.';
                }
                errorEl.textContent = msg;
                errorEl.hidden = false;
            });
    }

    /* ------------------------------------------------------------------
       Patrocinadores (carregar do Firebase)
    ------------------------------------------------------------------ */
    function loadSponsors() {
        FirebaseConfig.listen('sponsors', function (data) {
            if (!data) return;
            var grid = document.getElementById('sponsor-grid');
            grid.innerHTML = '';
            var keys = Object.keys(data);
            keys.forEach(function (key) {
                var s = data[key];
                var a = document.createElement('a');
                a.className = 'sponsor-card';
                a.href = s.link || '#';
                a.target = '_blank';
                a.rel = 'noopener';
                a.innerHTML =
                    '<img src="' + (s.image || '') + '" alt="' + (s.name || 'Patrocinador') + '">' +
                    '<span class="sponsor-name">' + (s.name || '') + '</span>';
                grid.appendChild(a);
            });
        });
    }

    /* ------------------------------------------------------------------
       Start
    ------------------------------------------------------------------ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
