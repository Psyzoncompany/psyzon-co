/* ==========================================================================
   COPA PSYZON — Utilitários compartilhados
   Toast, Modal, localStorage helpers
   ========================================================================== */

var Utils = (function () {
    'use strict';

    /* ------------------------------------------------------------------
       Toast Notifications
    ------------------------------------------------------------------ */
    function ensureToastContainer() {
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function toast(message, type) {
        type = type || 'info';
        var container = ensureToastContainer();
        var el = document.createElement('div');
        el.className = 'toast ' + type;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 3000);
    }

    /* ------------------------------------------------------------------
       Modal de Confirmação
    ------------------------------------------------------------------ */
    function confirm(title, message, onConfirm, options) {
        options = options || {};
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';

        var needsPassword = options.requirePassword;
        var passwordHtml = needsPassword
            ? '<div class="form-group mt-2"><label>Senha de segurança</label><input type="password" class="form-input" id="modal-password" placeholder="Digite a senha"></div>'
            : '';

        overlay.innerHTML =
            '<div class="modal-box">' +
            '<h3>' + title + '</h3>' +
            '<p>' + message + '</p>' +
            passwordHtml +
            '<div class="modal-actions">' +
            '<button class="btn" id="modal-cancel">Cancelar</button>' +
            '<button class="btn ' + (options.danger ? 'btn-danger' : 'btn-primary') + '" id="modal-confirm">' + (options.confirmText || 'Confirmar') + '</button>' +
            '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.querySelector('#modal-cancel').addEventListener('click', function () {
            document.body.removeChild(overlay);
        });

        overlay.querySelector('#modal-confirm').addEventListener('click', function () {
            if (needsPassword) {
                var pw = overlay.querySelector('#modal-password').value;
                if (pw !== '153090') {
                    toast('Senha incorreta!', 'error');
                    return;
                }
            }
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    /* ------------------------------------------------------------------
       LocalStorage helpers
    ------------------------------------------------------------------ */
    function lsGet(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function lsSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            // storage unavailable
        }
    }

    function lsRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            // noop
        }
    }

    /* ------------------------------------------------------------------
       Navegação
    ------------------------------------------------------------------ */
    function navigate(url) {
        window.location.href = url;
    }

    /* ------------------------------------------------------------------
       Formato de data
    ------------------------------------------------------------------ */
    function formatDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    /* ------------------------------------------------------------------
       Gerar ID
    ------------------------------------------------------------------ */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /* ------------------------------------------------------------------
       API Pública
    ------------------------------------------------------------------ */
    return {
        toast: toast,
        confirm: confirm,
        lsGet: lsGet,
        lsSet: lsSet,
        lsRemove: lsRemove,
        navigate: navigate,
        formatDate: formatDate,
        generateId: generateId
    };
})();
