/* ==========================================================================
   PSYZON STREAM — Lógica da Sala Compartilhada (Watch Party)
   Gerencia salas em tempo real via Socket.IO: criação/entrada, chat,
   sincronização de player (HTML5 e YouTube) e participantes.
   ========================================================================== */

(function () {
    'use strict';

    // ======================================================================
    // 1. CACHE DE ELEMENTOS DOM
    // ======================================================================

    const DOM = {
        // Lobby
        usernameInput:        document.getElementById('username-input'),
        roomCodeInput:        document.getElementById('room-code-input'),
        btnCreateRoom:        document.getElementById('btn-create-room'),
        btnJoinRoom:          document.getElementById('btn-join-room'),
        lobbyError:           document.getElementById('lobby-error'),
        lobbyErrorText:       document.querySelector('#lobby-error .lobby-error-text'),
        connectionStatus:     document.getElementById('connection-status'),
        lobbySection:         document.getElementById('lobby-section'),

        // Room info
        roomSection:          document.getElementById('room-section'),
        roomCodeDisplay:      document.getElementById('room-code-display'),
        btnCopyInvite:        document.getElementById('btn-copy-invite'),
        roomHostName:         document.getElementById('room-host-name'),
        participantCount:     document.getElementById('participant-count'),
        mediaTypeBadge:       document.getElementById('media-type-badge'),
        syncStatusIndicator:  document.getElementById('sync-status-indicator'),
        roomModeToggle:       document.getElementById('room-mode-toggle'),
        lastActionInfo:       document.getElementById('last-action-info'),
        lastActionText:       document.querySelector('#last-action-info .last-action-text'),
        btnLeaveRoom:         document.getElementById('btn-leave-room'),
        btnCloseRoom:         document.getElementById('btn-close-room'),

        // Media source selector
        sourceTabs:           document.querySelectorAll('.source-tab'),
        sourcePanels:         document.querySelectorAll('.source-panel'),
        mediaFileInput:       document.getElementById('media-file-input'),
        mediaLinkInput:       document.getElementById('media-link-input'),
        youtubeUrlInput:      document.getElementById('youtube-url-input'),
        btnLoadYoutube:       document.getElementById('btn-load-youtube'),

        // HTML5 player
        html5PlayerContainer: document.getElementById('html5-player-container'),
        videoPlayer:          document.getElementById('room-video-player'),
        playerOverlay:        document.getElementById('room-player-overlay'),
        bufferingOverlay:     document.getElementById('room-buffering-overlay'),
        syncOverlay:          document.getElementById('room-sync-overlay'),

        // YouTube player
        youtubePlayerContainer: document.getElementById('youtube-player-container'),
        youtubeVideoTitle:    document.getElementById('youtube-video-title'),
        youtubeSyncIndicator: document.getElementById('youtube-sync-indicator'),

        // Player controls
        progressContainer:    document.getElementById('room-progress-container'),
        progressBar:          document.getElementById('room-progress-bar'),
        progressBuffer:       document.getElementById('room-progress-buffer'),
        progressHandle:       document.getElementById('room-progress-handle'),
        btnPlayPause:         document.getElementById('room-btn-play-pause'),
        btnRewind:            document.getElementById('room-btn-rewind'),
        btnForward:           document.getElementById('room-btn-forward'),
        currentTime:          document.getElementById('room-current-time'),
        duration:             document.getElementById('room-duration'),
        btnVolume:            document.getElementById('room-btn-volume'),
        volumeSlider:         document.getElementById('room-volume-slider'),
        speedSelector:        document.getElementById('room-speed-selector'),
        btnFullscreen:        document.getElementById('room-btn-fullscreen'),

        // Participants
        participantsList:     document.getElementById('participants-list'),
        participantsCountBadge: document.getElementById('participants-count-badge'),

        // Chat
        chatMessages:         document.getElementById('chat-messages'),
        chatInput:            document.getElementById('chat-input'),
        btnSendChat:          document.getElementById('btn-send-chat'),
        typingIndicator:      document.getElementById('typing-indicator'),
        typingText:           document.querySelector('#typing-indicator .typing-text'),
    };

    // ======================================================================
    // 2. ESTADO DA APLICAÇÃO
    // ======================================================================

    let socket = null;
    let currentRoom = null;     // { roomId, hostId, hostName, mode, isHost, participants, mediaSource, playbackState }
    let mySocketId = null;
    let myUserName = '';
    let youtubePlayer = null;   // YouTube IFrame API player instance
    let isRemoteAction = false; // Prevents echo loops on sync events
    let syncCheckInterval = null;
    let typingTimeout = null;
    let isDraggingProgress = false;
    let typingHideTimeout = null;
    let errorHideTimeout = null;

    const SYNC_THRESHOLD = 2;          // seconds — force-seek if drift exceeds this
    const SYNC_CHECK_INTERVAL = 3000;  // ms

    // ======================================================================
    // 3. FUNÇÕES UTILITÁRIAS
    // ======================================================================

    /** Formata segundos em M:SS ou H:MM:SS */
    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '0:00';
        var s = Math.floor(seconds);
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        var sec = s % 60;
        var secStr = sec.toString().padStart(2, '0');
        if (h > 0) return h + ':' + m.toString().padStart(2, '0') + ':' + secStr;
        return m + ':' + secStr;
    }

    /** Escapa HTML para prevenir injeção de conteúdo (XSS) */
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str || ''));
        return div.innerHTML;
    }

    /** Gera link de convite para a sala */
    function generateInviteLink(roomId) {
        return window.location.origin + '/sala.html?room=' + encodeURIComponent(roomId);
    }

    /** Exibe mensagem de erro no lobby com auto-hide de 5 s */
    function showError(message) {
        if (!DOM.lobbyError) return;
        if (DOM.lobbyErrorText) DOM.lobbyErrorText.textContent = message;
        DOM.lobbyError.hidden = false;
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.lobbyError] });
        clearTimeout(errorHideTimeout);
        errorHideTimeout = setTimeout(hideError, 5000);
    }

    /** Oculta a mensagem de erro do lobby */
    function hideError() {
        if (DOM.lobbyError) DOM.lobbyError.hidden = true;
    }

    /** Extrai o ID do vídeo do YouTube a partir da URL */
    function getYouTubeVideoId(url) {
        if (typeof url !== 'string') return null;
        var match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{10,12})/);
        return match ? match[1] : null;
    }

    /** Verifica se a URL é um link do YouTube */
    function isYouTubeUrl(url) {
        if (typeof url !== 'string') return false;
        return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/.test(url);
    }

    /** Formata timestamp em HH:MM para o chat */
    function formatChatTime(timestamp) {
        var d = new Date(timestamp);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }

    // ======================================================================
    // 4. CONEXÃO SOCKET.IO
    // ======================================================================

    function initSocket() {
        socket = io();

        socket.on('connect', function () {
            mySocketId = socket.id;
            updateConnectionStatus('connected');
        });

        socket.on('disconnect', function () {
            updateConnectionStatus('disconnected');
        });

        socket.on('connect_error', function () {
            updateConnectionStatus('error');
        });

        setupRoomEvents();
        setupChatEvents();
        setupPlayerEvents();
    }

    /** Atualiza o indicador de status de conexão no lobby */
    function updateConnectionStatus(status) {
        if (!DOM.connectionStatus) return;
        var dot = DOM.connectionStatus.querySelector('.status-dot');
        var text = DOM.connectionStatus.querySelector('.status-text');
        if (!dot || !text) return;

        var map = {
            connected:    { attr: 'ready',   label: 'Conectado' },
            disconnected: { attr: 'idle',    label: 'Desconectado' },
            error:        { attr: 'error',   label: 'Erro de conexão' },
        };

        var cfg = map[status] || map.disconnected;
        dot.setAttribute('data-status', cfg.attr);
        text.textContent = cfg.label;
    }

    // ======================================================================
    // 5. GERENCIAMENTO DE SALAS
    // ======================================================================

    /** Cria uma nova sala */
    function createRoom() {
        var name = DOM.usernameInput ? DOM.usernameInput.value.trim() : '';
        if (!name) {
            showError('Digite seu nome para criar uma sala.');
            return;
        }
        myUserName = name;
        setBtnLoading(DOM.btnCreateRoom, true);
        socket.emit('room:create', { userName: name });
    }

    /** Entra em uma sala existente */
    function joinRoom() {
        var name = DOM.usernameInput ? DOM.usernameInput.value.trim() : '';
        var code = DOM.roomCodeInput ? DOM.roomCodeInput.value.trim().toUpperCase() : '';
        if (!name) {
            showError('Digite seu nome para entrar na sala.');
            return;
        }
        if (!code || code.length !== 6) {
            showError('Digite um código de sala válido (6 caracteres).');
            return;
        }
        myUserName = name;
        setBtnLoading(DOM.btnJoinRoom, true);
        socket.emit('room:join', { roomId: code, userName: name });
    }

    /** Aplica / remove estado de carregamento em um botão */
    function setBtnLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        if (loading) {
            btn.dataset.originalText = btn.querySelector('span') ? btn.querySelector('span').textContent : '';
            var span = btn.querySelector('span');
            if (span) span.textContent = 'Aguarde...';
        } else {
            var span = btn.querySelector('span');
            if (span && btn.dataset.originalText) span.textContent = btn.dataset.originalText;
        }
    }

    /** Registra todos os eventos de sala do Socket.IO */
    function setupRoomEvents() {

        // --- Sala criada com sucesso ---
        socket.on('room:created', function (data) {
            setBtnLoading(DOM.btnCreateRoom, false);
            currentRoom = {
                roomId:        data.roomId,
                hostId:        data.hostId,
                hostName:      data.hostName,
                mode:          data.mode,
                isHost:        true,
                participants:  data.participants || [],
                mediaSource:   data.mediaSource  || { type: null, url: null, name: null },
                playbackState: data.playbackState || { playing: false, currentTime: 0, lastUpdate: Date.now(), speed: 1 },
            };
            switchToRoom();
            updateRoomInfo();
            updateParticipantsList(currentRoom.participants);
            renderExistingMessages(data.messages || []);
            startSyncCheck();
        });

        // --- Entrou em sala existente ---
        socket.on('room:joined', function (data) {
            setBtnLoading(DOM.btnJoinRoom, false);
            currentRoom = {
                roomId:        data.roomId,
                hostId:        data.hostId,
                hostName:      data.hostName,
                mode:          data.mode,
                isHost:        data.hostId === mySocketId,
                participants:  data.participants || [],
                mediaSource:   data.mediaSource  || { type: null, url: null, name: null },
                playbackState: data.playbackState || { playing: false, currentTime: 0, lastUpdate: Date.now(), speed: 1 },
            };
            switchToRoom();
            updateRoomInfo();
            updateParticipantsList(currentRoom.participants);
            renderExistingMessages(data.messages || []);

            // Load existing media and sync to current position
            if (currentRoom.mediaSource && currentRoom.mediaSource.type) {
                loadMediaFromSource(currentRoom.mediaSource);
                applySyncState(currentRoom.playbackState);
            }

            startSyncCheck();
        });

        // --- Erro de sala ---
        socket.on('room:error', function (data) {
            setBtnLoading(DOM.btnCreateRoom, false);
            setBtnLoading(DOM.btnJoinRoom, false);
            showError(data.message || 'Erro desconhecido.');
        });

        // --- Novo participante ---
        socket.on('room:participant-joined', function (data) {
            if (!currentRoom) return;
            currentRoom.participants = data.participants || currentRoom.participants;
            updateParticipantsList(currentRoom.participants);
            if (data.message) renderChatMessage(data.message);
        });

        // --- Participante saiu ---
        socket.on('room:participant-left', function (data) {
            if (!currentRoom) return;
            currentRoom.participants = data.participants || currentRoom.participants;
            updateParticipantsList(currentRoom.participants);
            if (data.message) renderChatMessage(data.message);
        });

        // --- Host transferido ---
        socket.on('room:host-changed', function (data) {
            if (!currentRoom) return;
            currentRoom.hostId   = data.hostId;
            currentRoom.hostName = data.hostName;
            currentRoom.isHost   = data.hostId === mySocketId;
            updateRoomInfo();
            if (data.message) renderChatMessage(data.message);
        });

        // --- Modo alterado ---
        socket.on('room:mode-changed', function (data) {
            if (!currentRoom) return;
            currentRoom.mode = data.mode;
            updateRoomInfo();
            if (data.message) renderChatMessage(data.message);
        });

        // --- Sala fechada pelo host ---
        socket.on('room:closed', function (data) {
            alert(data.message || 'A sala foi encerrada pelo host.');
            returnToLobby();
        });
    }

    /** Alterna da visão de lobby para a visão de sala */
    function switchToRoom() {
        if (DOM.lobbySection) DOM.lobbySection.hidden = true;
        if (DOM.roomSection)  DOM.roomSection.hidden  = false;
    }

    /** Retorna para o lobby e limpa o estado */
    function returnToLobby() {
        stopSyncCheck();
        resetPlayer();
        currentRoom = null;

        if (DOM.roomSection)  DOM.roomSection.hidden  = true;
        if (DOM.lobbySection) DOM.lobbySection.hidden = false;

        // Limpar chat
        if (DOM.chatMessages) DOM.chatMessages.innerHTML = '';
        if (DOM.participantsList) DOM.participantsList.innerHTML = '';
    }

    /** Sair da sala voluntariamente */
    function leaveRoom() {
        if (!currentRoom) return;
        socket.emit('room:leave', { roomId: currentRoom.roomId });
        returnToLobby();
    }

    /** Fechar a sala (somente host) */
    function closeRoom() {
        if (!currentRoom || !currentRoom.isHost) return;
        if (!confirm('Tem certeza que deseja fechar a sala? Todos os participantes serão desconectados.')) return;
        socket.emit('room:close', { roomId: currentRoom.roomId });
        returnToLobby();
    }

    /** Atualiza todas as informações visuais da sala */
    function updateRoomInfo() {
        if (!currentRoom) return;

        if (DOM.roomCodeDisplay) DOM.roomCodeDisplay.textContent = currentRoom.roomId;
        if (DOM.roomHostName)    DOM.roomHostName.textContent    = currentRoom.hostName;

        var count = currentRoom.participants ? currentRoom.participants.length : 0;
        if (DOM.participantCount)      DOM.participantCount.textContent      = count;
        if (DOM.participantsCountBadge) DOM.participantsCountBadge.textContent = count;

        // Media type badge
        if (DOM.mediaTypeBadge) {
            var ms = currentRoom.mediaSource;
            if (ms && ms.type) {
                DOM.mediaTypeBadge.hidden = false;
                var labels = { file: 'Arquivo', link: 'Link', youtube: 'YouTube' };
                var icons  = { file: 'file-video', link: 'link', youtube: 'play-circle' };
                var icon = DOM.mediaTypeBadge.querySelector('i');
                var span = DOM.mediaTypeBadge.querySelector('span');
                if (icon) icon.setAttribute('data-lucide', icons[ms.type] || 'film');
                if (span) span.textContent = labels[ms.type] || 'Mídia';
                if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.mediaTypeBadge] });
            } else {
                DOM.mediaTypeBadge.hidden = true;
            }
        }

        // Host-only controls
        if (DOM.btnCloseRoom)   DOM.btnCloseRoom.hidden   = !currentRoom.isHost;
        if (DOM.roomModeToggle) DOM.roomModeToggle.hidden  = !currentRoom.isHost;

        // Mode toggle button text
        if (DOM.roomModeToggle) {
            var modeBtn = DOM.roomModeToggle.querySelector('.btn-mode');
            if (modeBtn) {
                var modeIcon = modeBtn.querySelector('i');
                var modeSpan = modeBtn.querySelector('span');
                if (currentRoom.mode === 'host') {
                    if (modeIcon) modeIcon.setAttribute('data-lucide', 'shield');
                    if (modeSpan) modeSpan.textContent = 'Host Controla';
                } else {
                    if (modeIcon) modeIcon.setAttribute('data-lucide', 'users');
                    if (modeSpan) modeSpan.textContent = 'Colaborativo';
                }
                if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.roomModeToggle] });
            }
        }
    }

    /** Reconstrói a lista de participantes no sidebar */
    function updateParticipantsList(participants) {
        if (!DOM.participantsList) return;
        DOM.participantsList.innerHTML = '';

        var count = participants ? participants.length : 0;
        if (DOM.participantCount)      DOM.participantCount.textContent      = count;
        if (DOM.participantsCountBadge) DOM.participantsCountBadge.textContent = count;

        if (!participants) return;

        participants.forEach(function (p) {
            var li = document.createElement('li');
            li.className = 'participant-item';
            li.dataset.userId = p.id;
            if (p.id === mySocketId) li.classList.add('participant-item--me');

            var initial = p.userName ? p.userName.charAt(0).toUpperCase() : '?';

            li.innerHTML =
                '<div class="participant-avatar">' + escapeHtml(initial) + '</div>' +
                '<div class="participant-info">' +
                    '<span class="participant-name">' + escapeHtml(p.userName) + (p.id === mySocketId ? ' (você)' : '') + '</span>' +
                    (p.isHost
                        ? '<span class="badge badge-host"><i data-lucide="crown"></i> Host</span>'
                        : '') +
                '</div>' +
                '<span class="participant-sync-dot" data-sync="synced" title="Sincronizado"></span>';

            DOM.participantsList.appendChild(li);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.participantsList] });
    }

    // ======================================================================
    // 6. CHAT
    // ======================================================================

    /** Registra eventos de chat do Socket.IO */
    function setupChatEvents() {

        socket.on('chat:message', function (message) {
            if (!currentRoom) return;
            renderChatMessage(message);
        });

        socket.on('chat:typing', function (data) {
            if (!currentRoom) return;
            showTypingIndicator(data.userName);
        });

        socket.on('chat:rate-limited', function () {
            // Brief subtle feedback — could use a toast, for now we ignore silently
        });
    }

    /** Envia uma mensagem no chat */
    function sendMessage() {
        if (!currentRoom || !DOM.chatInput) return;
        var text = DOM.chatInput.value.trim();
        if (!text) return;
        socket.emit('chat:message', { roomId: currentRoom.roomId, text: text });
        DOM.chatInput.value = '';
    }

    /** Renderiza uma mensagem individual no painel de chat */
    function renderChatMessage(message) {
        if (!DOM.chatMessages || !message) return;

        var div = document.createElement('div');

        if (message.type === 'system') {
            div.className = 'chat-message chat-message--system';
            div.innerHTML = '<span class="chat-message-text">' + escapeHtml(message.text) + '</span>';
        } else {
            var isOwn = message.userId === mySocketId;
            div.className = 'chat-message ' + (isOwn ? 'chat-message--own' : 'chat-message--other');
            div.innerHTML =
                '<div class="chat-message-header">' +
                    '<span class="chat-message-name">' + escapeHtml(isOwn ? 'Você' : message.userName) + '</span>' +
                    '<span class="chat-message-time">' + formatChatTime(message.timestamp) + '</span>' +
                '</div>' +
                '<p class="chat-message-text">' + escapeHtml(message.text) + '</p>';
        }

        DOM.chatMessages.appendChild(div);

        // Auto-scroll
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    }

    /** Renderiza mensagens existentes ao entrar/criar sala */
    function renderExistingMessages(messages) {
        if (!DOM.chatMessages) return;
        DOM.chatMessages.innerHTML = '';
        messages.forEach(function (msg) { renderChatMessage(msg); });
    }

    /** Emite evento de digitação com debounce de 2 s */
    function handleTyping() {
        if (!currentRoom) return;
        if (typingTimeout) return; // já emitiu recentemente
        socket.emit('chat:typing', { roomId: currentRoom.roomId });
        typingTimeout = setTimeout(function () { typingTimeout = null; }, 2000);
    }

    /** Mostra indicador de digitação e oculta após 3 s */
    function showTypingIndicator(userName) {
        if (!DOM.typingIndicator) return;
        if (DOM.typingText) DOM.typingText.textContent = userName + ' está digitando...';
        DOM.typingIndicator.hidden = false;
        clearTimeout(typingHideTimeout);
        typingHideTimeout = setTimeout(function () {
            if (DOM.typingIndicator) DOM.typingIndicator.hidden = true;
        }, 3000);
    }

    // ======================================================================
    // 7. SELETOR DE FONTE DE MÍDIA
    // ======================================================================

    /** Alterna abas de fonte de mídia */
    function switchSourceTab(selectedTab) {
        if (!selectedTab) return;
        var source = selectedTab.dataset.source;

        DOM.sourceTabs.forEach(function (tab) {
            tab.classList.toggle('source-tab--active', tab === selectedTab);
            tab.setAttribute('aria-selected', tab === selectedTab ? 'true' : 'false');
        });

        DOM.sourcePanels.forEach(function (panel) {
            var panelSource = panel.id.replace('source-panel-', '');
            var isActive = panelSource === source;
            panel.classList.toggle('source-panel--active', isActive);
            panel.hidden = !isActive;
        });
    }

    /** Carrega arquivo de vídeo local via file input */
    function handleFileSource(file) {
        if (!file || !currentRoom) return;
        if (!canControl()) {
            showError('Apenas o host pode alterar a mídia neste modo.');
            return;
        }

        var url = URL.createObjectURL(file);
        loadHTML5Video(url, file.name);

        // File blobs can't be shared; notify others they need the same file
        socket.emit('player:media-change', {
            roomId: currentRoom.roomId,
            mediaSource: { type: 'file', url: null, title: file.name },
        });

        currentRoom.mediaSource = { type: 'file', url: null, name: file.name };
        updateRoomInfo();
    }

    /** Carrega vídeo de link direto */
    function handleLinkSource() {
        if (!DOM.mediaLinkInput || !currentRoom) return;
        var url = DOM.mediaLinkInput.value.trim();
        if (!url) return;

        if (!canControl()) {
            showError('Apenas o host pode alterar a mídia neste modo.');
            return;
        }

        try { new URL(url); } catch (e) {
            showError('URL inválida. Insira uma URL completa.');
            return;
        }

        loadHTML5Video(url, url);

        socket.emit('player:media-change', {
            roomId: currentRoom.roomId,
            mediaSource: { type: 'link', url: url, title: url },
        });

        currentRoom.mediaSource = { type: 'link', url: url, name: url };
        updateRoomInfo();
    }

    /** Carrega vídeo do YouTube */
    function handleYouTubeSource() {
        if (!DOM.youtubeUrlInput || !currentRoom) return;
        var url = DOM.youtubeUrlInput.value.trim();
        if (!url) return;

        if (!canControl()) {
            showError('Apenas o host pode alterar a mídia neste modo.');
            return;
        }

        if (!isYouTubeUrl(url)) {
            showError('Insira uma URL válida do YouTube.');
            return;
        }

        var videoId = getYouTubeVideoId(url);
        if (!videoId) {
            showError('Não foi possível extrair o ID do vídeo.');
            return;
        }

        loadYouTubeVideo(videoId);

        socket.emit('player:media-change', {
            roomId: currentRoom.roomId,
            mediaSource: { type: 'youtube', url: videoId, title: 'YouTube: ' + videoId },
        });

        currentRoom.mediaSource = { type: 'youtube', url: videoId, name: 'YouTube: ' + videoId };
        updateRoomInfo();
    }

    /** Carrega mídia recebida de outro participante */
    function loadMediaFromSource(ms) {
        if (!ms || !ms.type) return;

        if (ms.type === 'youtube' && ms.url) {
            loadYouTubeVideo(ms.url);
        } else if (ms.type === 'link' && ms.url) {
            loadHTML5Video(ms.url, ms.name || ms.url);
        } else if (ms.type === 'file') {
            // File blobs are local only — show placeholder
            showMediaPlaceholder(ms.name || 'Arquivo local');
        }
    }

    /** Mostra placeholder quando a mídia não pode ser carregada (arquivo local de outro) */
    function showMediaPlaceholder(name) {
        if (DOM.html5PlayerContainer) DOM.html5PlayerContainer.hidden = false;
        if (DOM.youtubePlayerContainer) DOM.youtubePlayerContainer.hidden = true;
        if (DOM.playerOverlay) {
            DOM.playerOverlay.style.display = '';
            var p = DOM.playerOverlay.querySelector('p');
            if (p) p.textContent = 'Mídia local: ' + name + ' (carregue o mesmo arquivo)';
        }
    }

    // ======================================================================
    // 8. PLAYER HTML5
    // ======================================================================

    /** Validates that a URL uses a safe protocol for media playback */
    function isSafeMediaUrl(url) {
        if (typeof url !== 'string') return false;
        // blob: URLs are from URL.createObjectURL (local files)
        if (url.startsWith('blob:')) return true;
        try {
            var parsed = new URL(url, window.location.origin);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch (e) {
            return false;
        }
    }

    /** Carrega vídeo no player HTML5 */
    function loadHTML5Video(url, name) {
        if (!isSafeMediaUrl(url)) return;

        if (DOM.html5PlayerContainer) DOM.html5PlayerContainer.hidden = false;
        if (DOM.youtubePlayerContainer) DOM.youtubePlayerContainer.hidden = true;
        if (DOM.playerOverlay) DOM.playerOverlay.style.display = 'none';

        if (DOM.videoPlayer) {
            DOM.videoPlayer.src = url;
            DOM.videoPlayer.load();
        }

        updateLastAction('Mídia carregada: ' + escapeHtml(name || 'vídeo'));
    }

    /** Retorna true se o usuário pode controlar a reprodução */
    function canControl() {
        if (!currentRoom) return false;
        return currentRoom.mode === 'collaborative' || currentRoom.isHost;
    }

    // --- Eventos do player HTML5 ---

    function onVideoPlay() {
        if (isRemoteAction) return;
        if (!canControl() || !currentRoom) return;
        socket.emit('player:play', {
            roomId: currentRoom.roomId,
            currentTime: DOM.videoPlayer ? DOM.videoPlayer.currentTime : 0,
        });
        updatePlayPauseIcon(true);
    }

    function onVideoPause() {
        if (isRemoteAction) return;
        if (!canControl() || !currentRoom) return;
        socket.emit('player:pause', {
            roomId: currentRoom.roomId,
            currentTime: DOM.videoPlayer ? DOM.videoPlayer.currentTime : 0,
        });
        updatePlayPauseIcon(false);
    }

    function onVideoSeeked() {
        if (isRemoteAction || isDraggingProgress) return;
        if (!canControl() || !currentRoom) return;
        socket.emit('player:seek', {
            roomId: currentRoom.roomId,
            currentTime: DOM.videoPlayer ? DOM.videoPlayer.currentTime : 0,
        });
    }

    function onVideoTimeUpdate() {
        if (!DOM.videoPlayer || isDraggingProgress) return;
        var v = DOM.videoPlayer;
        if (DOM.currentTime) DOM.currentTime.textContent = formatTime(v.currentTime);
        if (DOM.duration)    DOM.duration.textContent     = formatTime(v.duration);

        if (v.duration > 0) {
            var pct = (v.currentTime / v.duration) * 100;
            if (DOM.progressBar)    DOM.progressBar.style.width    = pct + '%';
            if (DOM.progressHandle) DOM.progressHandle.style.left  = pct + '%';
        }
    }

    function onVideoLoadedMetadata() {
        if (!DOM.videoPlayer) return;
        if (DOM.duration) DOM.duration.textContent = formatTime(DOM.videoPlayer.duration);
    }

    function onVideoProgress() {
        if (!DOM.videoPlayer || !DOM.progressBuffer) return;
        var v = DOM.videoPlayer;
        if (v.buffered.length > 0 && v.duration > 0) {
            var buffered = v.buffered.end(v.buffered.length - 1);
            DOM.progressBuffer.style.width = (buffered / v.duration) * 100 + '%';
        }
    }

    function onVideoWaiting() {
        if (DOM.bufferingOverlay) DOM.bufferingOverlay.hidden = false;
    }

    function onVideoCanPlay() {
        if (DOM.bufferingOverlay) DOM.bufferingOverlay.hidden = true;
    }

    // --- Controles do player ---

    /** Alterna play/pause */
    function togglePlayPause() {
        if (!DOM.videoPlayer) return;
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube') {
            toggleYouTubePlayPause();
            return;
        }
        if (!canControl()) return;
        if (DOM.videoPlayer.paused) {
            DOM.videoPlayer.play().catch(function () {});
        } else {
            DOM.videoPlayer.pause();
        }
    }

    /** Retrocede 10 s */
    function rewind() {
        if (!canControl()) return;
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube') {
            rewindYouTube();
            return;
        }
        if (!DOM.videoPlayer) return;
        DOM.videoPlayer.currentTime = Math.max(0, DOM.videoPlayer.currentTime - 10);
    }

    /** Avança 10 s */
    function forward() {
        if (!canControl()) return;
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube') {
            forwardYouTube();
            return;
        }
        if (!DOM.videoPlayer) return;
        DOM.videoPlayer.currentTime = Math.min(DOM.videoPlayer.duration || 0, DOM.videoPlayer.currentTime + 10);
    }

    /** Seek na barra de progresso por clique */
    function seekFromProgressClick(e) {
        if (!DOM.videoPlayer || !DOM.progressContainer) return;
        if (!canControl()) return;
        var rect = DOM.progressContainer.getBoundingClientRect();
        var pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        DOM.videoPlayer.currentTime = pct * (DOM.videoPlayer.duration || 0);
    }

    /** Drag na barra de progresso */
    function onProgressDragStart(e) {
        if (!canControl()) return;
        isDraggingProgress = true;
        seekFromProgressClick(e);
    }

    function onProgressDragMove(e) {
        if (!isDraggingProgress) return;
        seekFromProgressClick(e);
    }

    function onProgressDragEnd() {
        if (!isDraggingProgress) return;
        isDraggingProgress = false;
        // Emit seek after drag
        if (DOM.videoPlayer && currentRoom && canControl()) {
            socket.emit('player:seek', {
                roomId: currentRoom.roomId,
                currentTime: DOM.videoPlayer.currentTime,
            });
        }
    }

    /** Alterna mudo / volume */
    function toggleMute() {
        if (!DOM.videoPlayer) return;
        DOM.videoPlayer.muted = !DOM.videoPlayer.muted;
        updateVolumeIcon();
    }

    /** Atualiza volume via slider */
    function setVolume() {
        if (!DOM.videoPlayer || !DOM.volumeSlider) return;
        DOM.videoPlayer.volume = parseFloat(DOM.volumeSlider.value);
        DOM.videoPlayer.muted  = DOM.videoPlayer.volume === 0;
        updateVolumeIcon();
    }

    /** Atualiza velocidade de reprodução */
    function setSpeed() {
        if (!DOM.videoPlayer || !DOM.speedSelector) return;
        DOM.videoPlayer.playbackRate = parseFloat(DOM.speedSelector.value);
    }

    /** Tela cheia */
    function toggleFullscreen() {
        var container = DOM.html5PlayerContainer;
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube') {
            container = DOM.youtubePlayerContainer;
        }
        if (!container) return;

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(function () {});
        } else {
            container.requestFullscreen().catch(function () {});
        }
    }

    /** Atualiza ícone de play/pause */
    function updatePlayPauseIcon(isPlaying) {
        if (!DOM.btnPlayPause) return;
        var icon = DOM.btnPlayPause.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.btnPlayPause] });
        }
    }

    /** Atualiza ícone de volume */
    function updateVolumeIcon() {
        if (!DOM.btnVolume || !DOM.videoPlayer) return;
        var icon = DOM.btnVolume.querySelector('i');
        if (!icon) return;
        var name;
        if (DOM.videoPlayer.muted || DOM.videoPlayer.volume === 0) {
            name = 'volume-x';
        } else if (DOM.videoPlayer.volume < 0.5) {
            name = 'volume-1';
        } else {
            name = 'volume-2';
        }
        icon.setAttribute('data-lucide', name);
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.btnVolume] });
    }

    /** Reseta o player ao estado inicial */
    function resetPlayer() {
        if (DOM.videoPlayer) {
            DOM.videoPlayer.pause();
            DOM.videoPlayer.removeAttribute('src');
            DOM.videoPlayer.load();
        }
        if (DOM.playerOverlay)    DOM.playerOverlay.style.display = '';
        if (DOM.bufferingOverlay) DOM.bufferingOverlay.hidden = true;
        if (DOM.syncOverlay)      DOM.syncOverlay.hidden = true;
        if (DOM.progressBar)      DOM.progressBar.style.width = '0%';
        if (DOM.progressBuffer)   DOM.progressBuffer.style.width = '0%';
        if (DOM.progressHandle)   DOM.progressHandle.style.left = '0%';
        if (DOM.currentTime)      DOM.currentTime.textContent = '0:00';
        if (DOM.duration)         DOM.duration.textContent = '0:00';
        updatePlayPauseIcon(false);

        if (DOM.html5PlayerContainer) DOM.html5PlayerContainer.hidden = false;
        if (DOM.youtubePlayerContainer) DOM.youtubePlayerContainer.hidden = true;

        // Destroy YouTube player
        if (youtubePlayer) {
            try { youtubePlayer.destroy(); } catch (e) { /* ignore */ }
            youtubePlayer = null;
        }
    }

    // ======================================================================
    // 9. PLAYER YOUTUBE
    // ======================================================================

    // YouTube IFrame API calls this global when ready
    window.onYouTubeIframeAPIReady = function () {
        // API is ready — player will be created on demand in loadYouTubeVideo
    };

    /** Carrega um vídeo do YouTube pelo ID */
    function loadYouTubeVideo(videoId) {
        if (DOM.youtubePlayerContainer) DOM.youtubePlayerContainer.hidden = false;
        if (DOM.html5PlayerContainer)   DOM.html5PlayerContainer.hidden   = true;
        if (DOM.youtubeVideoTitle)      DOM.youtubeVideoTitle.textContent = 'YouTube: ' + videoId;

        if (youtubePlayer && typeof youtubePlayer.loadVideoById === 'function') {
            youtubePlayer.loadVideoById(videoId);
            return;
        }

        // Verify YouTube API is loaded
        if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
            showError('YouTube API ainda não carregou. Tente novamente em instantes.');
            return;
        }

        youtubePlayer = new YT.Player('youtube-player-frame', {
            videoId: videoId,
            playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                iv_load_policy: 3,
                fs: 1,
                playsinline: 1,
            },
            events: {
                onReady: onYouTubePlayerReady,
                onStateChange: onYouTubePlayerStateChange,
            },
        });
    }

    /** Callback: YouTube player pronto */
    function onYouTubePlayerReady() {
        if (currentRoom && currentRoom.playbackState) {
            applySyncState(currentRoom.playbackState);
        }
        if (currentRoom) {
            socket.emit('player:status', { roomId: currentRoom.roomId, status: 'ready' });
        }
    }

    /** Callback: mudança de estado no YouTube player */
    function onYouTubePlayerStateChange(event) {
        if (isRemoteAction || !currentRoom) return;
        if (!canControl()) return;

        var state = event.data;

        if (state === YT.PlayerState.PLAYING) {
            socket.emit('player:play', {
                roomId: currentRoom.roomId,
                currentTime: youtubePlayer.getCurrentTime(),
            });
            updatePlayPauseIcon(true);
        } else if (state === YT.PlayerState.PAUSED) {
            socket.emit('player:pause', {
                roomId: currentRoom.roomId,
                currentTime: youtubePlayer.getCurrentTime(),
            });
            updatePlayPauseIcon(false);
        } else if (state === YT.PlayerState.BUFFERING) {
            socket.emit('player:status', { roomId: currentRoom.roomId, status: 'buffering' });
        }
    }

    /** Alterna play/pause no YouTube */
    function toggleYouTubePlayPause() {
        if (!youtubePlayer || !canControl()) return;
        var state = youtubePlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            youtubePlayer.pauseVideo();
        } else {
            youtubePlayer.playVideo();
        }
    }

    /** Retrocede 10 s no YouTube */
    function rewindYouTube() {
        if (!youtubePlayer || !canControl()) return;
        var t = youtubePlayer.getCurrentTime();
        youtubePlayer.seekTo(Math.max(0, t - 10), true);
    }

    /** Avança 10 s no YouTube */
    function forwardYouTube() {
        if (!youtubePlayer || !canControl()) return;
        var t = youtubePlayer.getCurrentTime();
        var d = youtubePlayer.getDuration() || 0;
        youtubePlayer.seekTo(Math.min(d, t + 10), true);
    }

    // ======================================================================
    // 10. SINCRONIZAÇÃO DE REPRODUÇÃO
    // ======================================================================

    /** Registra eventos de sincronização do Socket.IO */
    function setupPlayerEvents() {

        socket.on('player:play', function (data) {
            isRemoteAction = true;
            seekToTime(data.currentTime);
            playMedia();
            updatePlayPauseIcon(true);
            updateLastAction(data.userName + ' deu play');
            if (data.message) renderChatMessage(data.message);
            isRemoteAction = false;
        });

        socket.on('player:pause', function (data) {
            isRemoteAction = true;
            pauseMedia();
            seekToTime(data.currentTime);
            updatePlayPauseIcon(false);
            updateLastAction(data.userName + ' pausou');
            if (data.message) renderChatMessage(data.message);
            isRemoteAction = false;
        });

        socket.on('player:seek', function (data) {
            isRemoteAction = true;
            seekToTime(data.currentTime);
            updateLastAction(data.userName + ' avançou para ' + formatTime(data.currentTime));
            isRemoteAction = false;
        });

        socket.on('player:media-change', function (data) {
            if (!currentRoom) return;
            currentRoom.mediaSource   = data.mediaSource;
            currentRoom.playbackState = data.playbackState;
            loadMediaFromSource(data.mediaSource);
            updateRoomInfo();
            updateLastAction(data.userName + ' alterou a mídia');
            if (data.message) renderChatMessage(data.message);
        });

        socket.on('player:sync-response', function (data) {
            if (!currentRoom) return;
            currentRoom.playbackState = data.playbackState;

            // If no media is loaded yet, try to load it
            if (data.mediaSource && data.mediaSource.type && !hasMediaLoaded()) {
                currentRoom.mediaSource = data.mediaSource;
                loadMediaFromSource(data.mediaSource);
            }

            applySyncState(data.playbackState);
        });

        socket.on('player:status', function (data) {
            updateParticipantSyncStatus(data.userId, data.status);
        });
    }

    /** Abstração: dar play na mídia atual */
    function playMedia() {
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube' && youtubePlayer) {
            youtubePlayer.playVideo();
        } else if (DOM.videoPlayer) {
            DOM.videoPlayer.play().catch(function () {});
        }
    }

    /** Abstração: pausar a mídia atual */
    function pauseMedia() {
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube' && youtubePlayer) {
            youtubePlayer.pauseVideo();
        } else if (DOM.videoPlayer) {
            DOM.videoPlayer.pause();
        }
    }

    /** Abstração: seek para um tempo específico */
    function seekToTime(time) {
        if (typeof time !== 'number' || !isFinite(time)) return;
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube' && youtubePlayer) {
            youtubePlayer.seekTo(time, true);
        } else if (DOM.videoPlayer) {
            DOM.videoPlayer.currentTime = time;
        }
    }

    /** Retorna o tempo atual da mídia em reprodução */
    function getCurrentPlaybackTime() {
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube' && youtubePlayer) {
            return typeof youtubePlayer.getCurrentTime === 'function' ? youtubePlayer.getCurrentTime() : 0;
        }
        return DOM.videoPlayer ? DOM.videoPlayer.currentTime : 0;
    }

    /** Verifica se alguma mídia está carregada no player */
    function hasMediaLoaded() {
        if (currentRoom && currentRoom.mediaSource && currentRoom.mediaSource.type === 'youtube' && youtubePlayer) {
            return true;
        }
        return DOM.videoPlayer && DOM.videoPlayer.src && DOM.videoPlayer.src !== window.location.href;
    }

    /** Aplica o estado de playback sincronizado */
    function applySyncState(playbackState) {
        if (!playbackState) return;

        isRemoteAction = true;

        // Account for elapsed time since last server update if playing
        var targetTime = playbackState.currentTime || 0;
        if (playbackState.playing && playbackState.lastUpdate) {
            var elapsed = (Date.now() - playbackState.lastUpdate) / 1000;
            targetTime += elapsed * (playbackState.speed || 1);
        }

        seekToTime(targetTime);

        if (playbackState.playing) {
            playMedia();
            updatePlayPauseIcon(true);
        } else {
            pauseMedia();
            updatePlayPauseIcon(false);
        }

        isRemoteAction = false;
    }

    /** Inicia verificação periódica de sincronização */
    function startSyncCheck() {
        stopSyncCheck();
        syncCheckInterval = setInterval(function () {
            if (!currentRoom) return;
            socket.emit('player:sync-request', { roomId: currentRoom.roomId });
        }, SYNC_CHECK_INTERVAL);
    }

    /** Para a verificação periódica de sincronização */
    function stopSyncCheck() {
        if (syncCheckInterval) {
            clearInterval(syncCheckInterval);
            syncCheckInterval = null;
        }
    }

    // ======================================================================
    // 11. STATUS DE SINCRONIZAÇÃO (UI)
    // ======================================================================

    /** Atualiza o indicador de sync na barra superior */
    function updateSyncStatus(state) {
        var el = DOM.syncStatusIndicator;
        if (!el) return;
        var dot  = el.querySelector('.sync-dot');
        var text = el.querySelector('.sync-text');

        var map = {
            synced:    { attr: 'synced', label: 'Sincronizado' },
            adjusting: { attr: 'idle',   label: 'Ajustando sincronização...' },
            buffering: { attr: 'idle',   label: 'Buffering...' },
            idle:      { attr: 'idle',   label: 'Aguardando mídia' },
        };

        var cfg = map[state] || map.idle;
        el.setAttribute('data-sync', cfg.attr);
        if (text) text.textContent = cfg.label;
    }

    /** Atualiza o indicador de sync de um participante específico */
    function updateParticipantSyncStatus(userId, status) {
        if (!DOM.participantsList) return;
        var item = DOM.participantsList.querySelector('[data-user-id="' + userId + '"]');
        if (!item) return;
        var dot = item.querySelector('.participant-sync-dot');
        if (!dot) return;

        var syncMap = { ready: 'synced', buffering: 'idle', error: 'error' };
        dot.setAttribute('data-sync', syncMap[status] || 'synced');
        dot.title = status === 'buffering' ? 'Buffering...' : status === 'error' ? 'Erro' : 'Sincronizado';
    }

    /** Atualiza o texto da última ação na barra superior */
    function updateLastAction(text) {
        if (DOM.lastActionText) DOM.lastActionText.textContent = text;
    }

    // ======================================================================
    // 12. COPIAR CONVITE
    // ======================================================================

    function copyInvite() {
        if (!currentRoom) return;
        var link = generateInviteLink(currentRoom.roomId);

        navigator.clipboard.writeText(link).then(function () {
            // Visual feedback
            if (DOM.btnCopyInvite) {
                var icon = DOM.btnCopyInvite.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', 'check');
                    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.btnCopyInvite] });
                }
                setTimeout(function () {
                    if (icon) {
                        icon.setAttribute('data-lucide', 'copy');
                        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.btnCopyInvite] });
                    }
                }, 2000);
            }
        }).catch(function () {
            // Fallback: prompt
            prompt('Copie o link:', link);
        });
    }

    // ======================================================================
    // 13. PARÂMETROS DE URL
    // ======================================================================

    function checkUrlParams() {
        var params = new URLSearchParams(window.location.search);
        var roomParam = params.get('room');
        if (roomParam && DOM.roomCodeInput) {
            DOM.roomCodeInput.value = roomParam.toUpperCase();
            if (DOM.usernameInput) DOM.usernameInput.focus();
        }
    }

    // ======================================================================
    // 14. ATALHOS DE TECLADO
    // ======================================================================

    function handleKeyboard(e) {
        // Don't capture keys when typing in inputs
        var tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        // Only active when inside a room
        if (!currentRoom) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'Escape':
                if (confirm('Deseja sair da sala?')) leaveRoom();
                break;
        }
    }

    // ======================================================================
    // 15. MODO DA SALA
    // ======================================================================

    /** Alterna o modo da sala entre host e collaborative */
    function toggleRoomMode() {
        if (!currentRoom || !currentRoom.isHost) return;
        var newMode = currentRoom.mode === 'host' ? 'collaborative' : 'host';
        socket.emit('room:set-mode', { roomId: currentRoom.roomId, mode: newMode });
    }

    // ======================================================================
    // 16. LINK DIRETO — BOTÃO CARREGAR
    // ======================================================================

    /** Localiza o botão "Carregar" no painel de link direto */
    function findLoadLinkButton() {
        var panel = document.getElementById('source-panel-link');
        if (!panel) return null;
        return panel.querySelector('.btn-primary');
    }

    // ======================================================================
    // 17. CLEANUP
    // ======================================================================

    function cleanup() {
        if (currentRoom && socket) {
            socket.emit('room:leave', { roomId: currentRoom.roomId });
        }
        stopSyncCheck();
        if (youtubePlayer) {
            try { youtubePlayer.destroy(); } catch (e) { /* ignore */ }
        }
        if (socket) socket.disconnect();
    }

    // ======================================================================
    // 18. EVENT LISTENERS & INICIALIZAÇÃO
    // ======================================================================

    function setupEventListeners() {
        // Lobby buttons
        if (DOM.btnCreateRoom) DOM.btnCreateRoom.addEventListener('click', createRoom);
        if (DOM.btnJoinRoom)   DOM.btnJoinRoom.addEventListener('click', joinRoom);

        // Room buttons
        if (DOM.btnLeaveRoom) DOM.btnLeaveRoom.addEventListener('click', leaveRoom);
        if (DOM.btnCloseRoom) DOM.btnCloseRoom.addEventListener('click', closeRoom);
        if (DOM.btnCopyInvite) DOM.btnCopyInvite.addEventListener('click', copyInvite);

        // Mode toggle
        if (DOM.roomModeToggle) {
            var modeBtn = DOM.roomModeToggle.querySelector('.btn-mode');
            if (modeBtn) modeBtn.addEventListener('click', toggleRoomMode);
        }

        // Source tabs
        DOM.sourceTabs.forEach(function (tab) {
            tab.addEventListener('click', function () { switchSourceTab(tab); });
        });

        // File source
        if (DOM.mediaFileInput) {
            DOM.mediaFileInput.addEventListener('change', function () {
                if (this.files && this.files[0]) handleFileSource(this.files[0]);
            });
        }

        // Link source
        var btnLoadLink = findLoadLinkButton();
        if (btnLoadLink) btnLoadLink.addEventListener('click', handleLinkSource);

        // YouTube source
        if (DOM.btnLoadYoutube) DOM.btnLoadYoutube.addEventListener('click', handleYouTubeSource);

        // HTML5 player events
        if (DOM.videoPlayer) {
            DOM.videoPlayer.addEventListener('play',            onVideoPlay);
            DOM.videoPlayer.addEventListener('pause',           onVideoPause);
            DOM.videoPlayer.addEventListener('seeked',          onVideoSeeked);
            DOM.videoPlayer.addEventListener('timeupdate',      onVideoTimeUpdate);
            DOM.videoPlayer.addEventListener('loadedmetadata',  onVideoLoadedMetadata);
            DOM.videoPlayer.addEventListener('progress',        onVideoProgress);
            DOM.videoPlayer.addEventListener('waiting',         onVideoWaiting);
            DOM.videoPlayer.addEventListener('canplay',         onVideoCanPlay);
        }

        // Player controls
        if (DOM.btnPlayPause)  DOM.btnPlayPause.addEventListener('click',  togglePlayPause);
        if (DOM.btnRewind)     DOM.btnRewind.addEventListener('click',     rewind);
        if (DOM.btnForward)    DOM.btnForward.addEventListener('click',    forward);
        if (DOM.btnVolume)     DOM.btnVolume.addEventListener('click',     toggleMute);
        if (DOM.volumeSlider)  DOM.volumeSlider.addEventListener('input',  setVolume);
        if (DOM.speedSelector) DOM.speedSelector.addEventListener('change', setSpeed);
        if (DOM.btnFullscreen) DOM.btnFullscreen.addEventListener('click', toggleFullscreen);

        // Progress bar drag
        if (DOM.progressContainer) {
            DOM.progressContainer.addEventListener('mousedown', onProgressDragStart);
            document.addEventListener('mousemove', onProgressDragMove);
            document.addEventListener('mouseup', onProgressDragEnd);
            // Touch
            DOM.progressContainer.addEventListener('touchstart', function (e) {
                onProgressDragStart(e.touches[0]);
            });
            document.addEventListener('touchmove', function (e) {
                if (isDraggingProgress) onProgressDragMove(e.touches[0]);
            });
            document.addEventListener('touchend', onProgressDragEnd);
        }

        // Chat
        if (DOM.btnSendChat) DOM.btnSendChat.addEventListener('click', sendMessage);
        if (DOM.chatInput) {
            DOM.chatInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
            });
            DOM.chatInput.addEventListener('input', handleTyping);
        }

        // Room code input: Enter to join
        if (DOM.roomCodeInput) {
            DOM.roomCodeInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); joinRoom(); }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);

        // Page unload
        window.addEventListener('beforeunload', cleanup);
    }

    /** Ponto de entrada da aplicação */
    function init() {
        initSocket();
        setupEventListeners();
        checkUrlParams();
    }

    // Inicia quando o DOM estiver pronto (script no final do body)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
