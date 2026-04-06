/* ==========================================================================
   PSYZON STREAM — Lógica Principal da Aplicação
   Aplicação de streaming P2P via WebTorrent com player de vídeo customizado.
   ========================================================================== */

(function () {
    'use strict';

    // ======================================================================
    // 1. CACHE DE ELEMENTOS DOM
    // ======================================================================
    const DOM = {
        // Entrada
        magnetInput:       document.getElementById('magnet-input'),
        torrentFileInput:  document.getElementById('torrent-file'),
        torrentFileLabel:  document.querySelector('label[for="torrent-file"] span'),
        btnStart:          document.getElementById('btn-start'),
        btnClear:          document.getElementById('btn-clear'),

        // Status
        statusDot:         document.querySelector('.status-dot'),
        statusText:        document.getElementById('status-text'),

        // Conteudo principal
        mainContent:       document.getElementById('main-content'),

        // Player de video
        videoPlayer:       document.getElementById('video-player'),
        playerOverlay:     document.getElementById('player-overlay'),
        bufferingOverlay:  document.getElementById('buffering-overlay'),
        videoContainer:    document.querySelector('.video-container'),

        // Controles do player
        btnPlayPause:      document.getElementById('btn-play-pause'),
        btnRewind:         document.getElementById('btn-rewind'),
        btnForward:        document.getElementById('btn-forward'),
        currentTime:       document.getElementById('current-time'),
        duration:          document.getElementById('duration'),
        progressContainer: document.getElementById('progress-container'),
        progressBuffer:    document.getElementById('progress-buffer'),
        progressBar:       document.getElementById('progress-bar'),
        progressHandle:    document.getElementById('progress-handle'),
        btnVolume:         document.getElementById('btn-volume'),
        volumeSlider:      document.getElementById('volume-slider'),
        speedSelector:     document.getElementById('speed-selector'),
        btnFullscreen:     document.getElementById('btn-fullscreen'),

        // Informacoes de reproducao
        nowPlayingName:    document.getElementById('now-playing-name'),
        streamingBadge:    document.querySelector('.badge-streaming'),

        // Lista de arquivos
        fileList:          document.getElementById('file-list'),
        filesSection:      document.getElementById('files-section'),

        // Painel de download
        downloadPanel:     document.getElementById('download-panel'),
        overallProgressText: document.getElementById('overall-progress-text'),
        overallProgressBar:  document.getElementById('overall-progress-bar'),
        downloadSpeed:     document.getElementById('download-speed'),
        uploadSpeed:       document.getElementById('upload-speed'),
        peersCount:        document.getElementById('peers-count'),
        totalSize:         document.getElementById('total-size'),
        downloadedSize:    document.getElementById('downloaded-size'),
        timeRemaining:     document.getElementById('time-remaining'),
        torrentStatus:     document.getElementById('torrent-status'),

        // Log de atividade
        activityLog:       document.getElementById('activity-log'),
        logList:           document.getElementById('log-list'),
        btnClearLog:       document.getElementById('btn-clear-log'),

        // Modal de disclaimer
        disclaimerModal:   document.getElementById('disclaimer-modal'),
        btnAcceptDisclaimer: document.getElementById('btn-accept-disclaimer'),
    };

    // ======================================================================
    // 2. ESTADO DA APLICACAO
    // ======================================================================
    let client = null;
    let currentTorrent = null;
    let currentFile = null;
    let statsInterval = null;
    let fileProgressInterval = null;
    let animFrameId = null;
    let isDraggingProgress = false;
    const MAX_LOG_ENTRIES = 200;
    // .mp4 e .webm têm suporte nativo via MediaSource; demais formatos usam
    // fallback via blob URL e podem não funcionar em todos os navegadores.
    const VIDEO_EXTENSIONS = [
        '.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.ogv',
        '.flv', '.wmv', '.3gp', '.3g2', '.ts', '.m2ts', '.mts',
        '.vob', '.f4v', '.divx', '.rmvb', '.rm', '.asf', '.mpg',
        '.mpeg', '.m2v', '.mxf', '.dv'
    ];

    // ======================================================================
    // 3. FUNCOES UTILITARIAS
    // ======================================================================

    /** Formata bytes em unidade legível (B, KB, MB, GB) */
    function formatBytes(bytes) {
        if (bytes === 0 || bytes == null) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
        return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    }

    /** Formata segundos em MM:SS ou HH:MM:SS */
    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '0:00';
        const s = Math.floor(seconds);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        const secStr = sec.toString().padStart(2, '0');
        if (h > 0) return h + ':' + m.toString().padStart(2, '0') + ':' + secStr;
        return m + ':' + secStr;
    }

    /** Formata tempo restante estimado (milissegundos) */
    function formatETA(ms) {
        if (ms == null || !isFinite(ms) || ms <= 0) return 'Calculando...';
        const totalSec = Math.floor(ms / 1000);
        if (totalSec < 60) return totalSec + 's';
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        if (min < 60) return min + 'm ' + sec + 's';
        const hours = Math.floor(min / 60);
        const mins = min % 60;
        return hours + 'h ' + mins + 'm';
    }

    /** Formata velocidade de transferência (bytes/s) */
    function formatSpeed(bytesPerSec) {
        if (bytesPerSec === 0 || bytesPerSec == null) return '0 KB/s';
        if (bytesPerSec >= 1048576) return (bytesPerSec / 1048576).toFixed(1) + ' MB/s';
        return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
    }

    /** Verifica se o arquivo é um vídeo */
    function isVideoFile(filename) {
        if (!filename) return false;
        const ext = '.' + filename.split('.').pop().toLowerCase();
        return VIDEO_EXTENSIONS.includes(ext);
    }

    /** Retorna o nome do ícone Lucide para o tipo de arquivo */
    function getFileIcon(filename) {
        if (isVideoFile(filename)) return 'video';
        const ext = filename ? filename.split('.').pop().toLowerCase() : '';
        const audioExts = ['mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
        if (audioExts.includes(ext)) return 'music';
        if (imageExts.includes(ext)) return 'image';
        if (docExts.includes(ext)) return 'file-text';
        return 'file';
    }

    /** Escapa HTML para prevenir injeção de conteúdo */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str || ''));
        return div.innerHTML;
    }

    /** Verifica se a URL é um link do YouTube */
    function isYouTubeUrl(url) {
        if (typeof url !== 'string') return false;
        return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/.test(url);
    }

    /** Extrai o ID do vídeo do YouTube a partir da URL */
    function getYouTubeVideoId(url) {
        if (typeof url !== 'string') return null;
        var match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{10,12})/);
        return match ? match[1] : null;
    }

    // ======================================================================
    // 4. GERENCIAMENTO DE STATUS
    // ======================================================================
    const STATUS_MAP = {
        idle:        { text: 'Aguardando entrada...', attr: 'idle' },
        connecting:  { text: 'Conectando peers...', attr: 'connecting' },
        downloading: { text: 'Baixando...', attr: 'downloading' },
        ready:       { text: 'Pronto para reprodução', attr: 'ready' },
        completed:   { text: 'Concluído', attr: 'complete' },
        error:       { text: 'Erro', attr: 'error' },
    };

    function setStatus(state, customText) {
        const config = STATUS_MAP[state] || STATUS_MAP.idle;
        if (DOM.statusDot) DOM.statusDot.setAttribute('data-status', config.attr);
        if (DOM.statusText) DOM.statusText.textContent = customText || config.text;
    }

    // ======================================================================
    // 5. LOG DE ATIVIDADE
    // ======================================================================
    const LOG_ICONS = {
        info:    'info',
        success: 'check-circle',
        warning: 'alert-triangle',
        error:   'x-circle',
    };

    function addLog(message, type) {
        type = type || 'info';
        if (!DOM.logList) return;

        // Mostrar painel de log se estiver escondido
        if (DOM.activityLog && DOM.activityLog.hidden) DOM.activityLog.hidden = false;

        // Limitar entradas
        while (DOM.logList.children.length >= MAX_LOG_ENTRIES) {
            DOM.logList.removeChild(DOM.logList.firstChild);
        }

        const now = new Date();
        const timestamp = [
            now.getHours().toString().padStart(2, '0'),
            now.getMinutes().toString().padStart(2, '0'),
            now.getSeconds().toString().padStart(2, '0'),
        ].join(':');

        const li = document.createElement('li');
        li.className = 'log-entry log-entry--' + type;
        li.innerHTML =
            '<i data-lucide="' + (LOG_ICONS[type] || 'info') + '" class="log-entry-icon" aria-hidden="true"></i>' +
            '<span class="log-entry-time">' + timestamp + '</span>' +
            '<span class="log-entry-message">' + escapeHtml(message) + '</span>';

        DOM.logList.appendChild(li);

        // Recriar ícones Lucide nos novos elementos
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [li] });

        // Auto-scroll para a entrada mais recente
        DOM.logList.scrollTop = DOM.logList.scrollHeight;
    }

    function clearLog() {
        if (DOM.logList) DOM.logList.innerHTML = '';
    }

    // ======================================================================
    // 6. MODAL DE DISCLAIMER
    // ======================================================================
    function initDisclaimer() {
        const accepted = localStorage.getItem('psyzon-disclaimer-accepted');
        if (accepted === 'true') {
            if (DOM.disclaimerModal) DOM.disclaimerModal.hidden = true;
            return;
        }

        // Mostrar modal
        if (DOM.disclaimerModal) DOM.disclaimerModal.hidden = false;

        if (DOM.btnAcceptDisclaimer) {
            DOM.btnAcceptDisclaimer.addEventListener('click', function () {
                localStorage.setItem('psyzon-disclaimer-accepted', 'true');
                if (DOM.disclaimerModal) DOM.disclaimerModal.hidden = true;
            });
        }
    }

    // ======================================================================
    // 7. VALIDACAO DE ENTRADA
    // ======================================================================
    function isValidMagnet(uri) {
        return typeof uri === 'string' &&
               uri.startsWith('magnet:?') &&
               uri.includes('xt=urn:btih:');
    }

    function isValidTorrentFile(file) {
        return file && file.name && file.name.toLowerCase().endsWith('.torrent');
    }

    // ======================================================================
    // 8. MOTOR WEBTORRENT
    // ======================================================================

    /** Inicializa o cliente WebTorrent sob demanda */
    function getClient() {
        if (client) return client;
        if (typeof WebTorrent === 'undefined') {
            throw new Error('WebTorrent não está disponível. Verifique se o CDN foi carregado.');
        }
        client = new WebTorrent();
        client.on('error', function (err) {
            addLog('Erro no cliente WebTorrent: ' + err.message, 'error');
            setStatus('error', 'Erro: ' + err.message);
        });
        return client;
    }

    /** Inicia o download/streaming de um torrent ou reproduz link do YouTube */
    function startTorrent() {
        const magnetUri = DOM.magnetInput ? DOM.magnetInput.value.trim() : '';
        const torrentFile = DOM.torrentFileInput && DOM.torrentFileInput.files
            ? DOM.torrentFileInput.files[0]
            : null;

        // Verificar se é um link do YouTube
        if (magnetUri && isYouTubeUrl(magnetUri)) {
            playYouTubeVideo(magnetUri);
            return;
        }

        // Validar entrada
        if (!magnetUri && !torrentFile) {
            setStatus('error', 'Insira um magnet link, link do YouTube ou selecione um arquivo .torrent');
            addLog('Nenhuma entrada fornecida. Insira um magnet link, link do YouTube ou arquivo .torrent.', 'warning');
            return;
        }

        if (magnetUri && !isValidMagnet(magnetUri)) {
            setStatus('error', 'Link inválido');
            addLog('Formato inválido. Use um magnet link (magnet:?xt=urn:btih:...) ou um link do YouTube.', 'error');
            return;
        }

        if (torrentFile && !isValidTorrentFile(torrentFile)) {
            setStatus('error', 'Arquivo inválido');
            addLog('Arquivo inválido. Selecione um arquivo com extensão .torrent.', 'error');
            return;
        }

        const torrentSource = magnetUri || torrentFile;

        try {
            const wtClient = getClient();

            // Destruir torrent anterior
            if (currentTorrent) {
                try {
                    currentTorrent.destroy();
                } catch (destroyErr) {
                    addLog('Aviso ao destruir torrent anterior: ' + destroyErr.message, 'warning');
                }
                currentTorrent = null;
            }

            setStatus('connecting');
            addLog('Iniciando download...', 'info');

            wtClient.add(torrentSource, function (torrent) {
                currentTorrent = torrent;

                torrent.on('metadata', function () {
                    addLog('Metadados carregados com sucesso.', 'success');
                });

                // Torrent pronto
                onTorrentReady(torrent);

                torrent.on('warning', function (warn) {
                    addLog('Aviso: ' + warn, 'warning');
                });

                torrent.on('error', function (err) {
                    setStatus('error', 'Erro: ' + err.message);
                    addLog('Erro no torrent: ' + err.message, 'error');
                });

                torrent.on('done', function () {
                    setStatus('completed');
                    addLog('Download concluído! Todos os arquivos foram baixados.', 'success');
                    if (DOM.streamingBadge) DOM.streamingBadge.style.display = 'none';
                    updateFileList(torrent);
                });
            });
        } catch (err) {
            setStatus('error', err.message);
            addLog('Erro ao iniciar: ' + err.message, 'error');
        }
    }

    /** Callback quando o torrent está pronto */
    function onTorrentReady(torrent) {
        setStatus('downloading');
        addLog('Torrent carregado: ' + torrent.name + ' (' + formatBytes(torrent.length) + ')', 'success');
        addLog(torrent.files.length + ' arquivo(s) encontrado(s).', 'info');

        if (DOM.mainContent) DOM.mainContent.hidden = false;
        if (DOM.downloadPanel) DOM.downloadPanel.hidden = false;

        renderFileList(torrent);
        startStatsUpdater(torrent);
    }

    /** Reproduz um vídeo do YouTube no player embutido */
    function playYouTubeVideo(url) {
        var videoId = getYouTubeVideoId(url);
        if (!videoId) {
            setStatus('error', 'Link do YouTube inválido');
            addLog('Não foi possível extrair o ID do vídeo do YouTube.', 'error');
            return;
        }

        addLog('Link do YouTube detectado. Carregando vídeo...', 'info');
        setStatus('ready', 'Reproduzindo YouTube');

        if (DOM.mainContent) DOM.mainContent.hidden = false;

        // Esconder overlay e o player HTML5
        if (DOM.playerOverlay) DOM.playerOverlay.style.display = 'none';
        if (DOM.videoPlayer) DOM.videoPlayer.style.display = 'none';

        // Remover iframe anterior se existir
        var container = DOM.videoContainer;
        if (!container) return;
        var oldIframe = container.querySelector('.youtube-iframe');
        if (oldIframe) oldIframe.remove();

        // Criar iframe do YouTube
        var iframe = document.createElement('iframe');
        iframe.className = 'youtube-iframe';
        iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('aria-label', 'Player do YouTube');

        container.insertBefore(iframe, container.firstChild);

        if (DOM.nowPlayingName) DOM.nowPlayingName.textContent = 'YouTube: ' + url;
        if (DOM.streamingBadge) DOM.streamingBadge.style.display = 'none';

        addLog('Vídeo do YouTube carregado com sucesso.', 'success');
    }

    // ======================================================================
    // 9. LISTA DE ARQUIVOS
    // ======================================================================

    function renderFileList(torrent) {
        if (!DOM.fileList) return;
        DOM.fileList.innerHTML = '';

        torrent.files.forEach(function (file, index) {
            const isVideo = isVideoFile(file.name);
            const iconName = getFileIcon(file.name);

            const li = document.createElement('li');
            li.className = 'file-item';
            li.dataset.fileIndex = index;

            li.innerHTML =
                '<div class="file-item-icon">' +
                    '<i data-lucide="' + iconName + '"></i>' +
                '</div>' +
                '<div class="file-item-info">' +
                    '<span class="file-item-name" title="' + escapeHtml(file.name) + '">' + escapeHtml(file.name) + '</span>' +
                    '<span class="file-item-size">' + formatBytes(file.length) + '</span>' +
                    '<div class="file-item-progress">' +
                        '<div class="file-item-progress-bar" data-progress="0"></div>' +
                    '</div>' +
                    '<span class="file-item-percent">0%</span>' +
                '</div>' +
                '<div class="file-item-actions">' +
                    (isVideo
                        ? '<button class="btn btn-sm btn-play" data-file-index="' + index + '" aria-label="Reproduzir ' + escapeHtml(file.name) + '">' +
                              '<i data-lucide="play"></i> Reproduzir' +
                          '</button>'
                        : '') +
                    '<button class="btn btn-sm btn-download" data-file-index="' + index + '" aria-label="Baixar ' + escapeHtml(file.name) + '">' +
                        '<i data-lucide="download"></i> Baixar' +
                    '</button>' +
                    '<span class="badge badge-ready" hidden>Pronto</span>' +
                '</div>';

            // Evento de clique no botao reproduzir
            const playBtn = li.querySelector('.btn-play');
            if (playBtn) {
                playBtn.addEventListener('click', function () {
                    playVideoFile(torrent, index);
                });
            }

            // Evento de clique no botão baixar
            var downloadBtn = li.querySelector('.btn-download');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', function () {
                    downloadFile(torrent, index);
                });
            }

            DOM.fileList.appendChild(li);
        });

        // Recriar ícones Lucide
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [DOM.fileList] });

        // Iniciar atualizacao de progresso individual
        startFileProgressUpdater(torrent);
    }

    /** Atualiza o progresso individual de cada arquivo */
    function updateFileList(torrent) {
        if (!DOM.fileList || !torrent || !torrent.files) return;

        torrent.files.forEach(function (file, index) {
            const li = DOM.fileList.querySelector('[data-file-index="' + index + '"]');
            if (!li) return;

            const progress = file.progress;
            const pct = (progress * 100).toFixed(0);
            const progressBarEl = li.querySelector('.file-item-progress-bar');
            const percentEl = li.querySelector('.file-item-percent');
            const readyBadge = li.querySelector('.badge-ready');

            if (progressBarEl) {
                progressBarEl.style.width = pct + '%';
                progressBarEl.dataset.progress = pct;
            }
            if (percentEl) percentEl.textContent = pct + '%';

            if (progress >= 1 && readyBadge) readyBadge.hidden = false;
        });
    }

    function startFileProgressUpdater(torrent) {
        if (fileProgressInterval) clearInterval(fileProgressInterval);
        fileProgressInterval = setInterval(function () {
            updateFileList(torrent);
        }, 1000);
    }

    // ======================================================================
    // 10. PLAYER DE VIDEO E DOWNLOAD DE ARQUIVOS
    // ======================================================================

    /** Baixa qualquer arquivo do torrent */
    function downloadFile(torrent, fileIndex) {
        var file = torrent.files[fileIndex];
        if (!file) {
            addLog('Arquivo não encontrado.', 'error');
            return;
        }

        addLog('Preparando download: ' + file.name + '...', 'info');

        try {
            file.getBlobURL(function (err, url) {
                if (err) {
                    addLog('Erro ao preparar download: ' + err.message, 'error');
                    return;
                }
                var a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                addLog('Download iniciado: ' + file.name, 'success');
            });
        } catch (err) {
            addLog('Erro ao baixar arquivo: ' + err.message, 'error');
        }
    }

    /** Reproduz um arquivo de vídeo do torrent */
    function playVideoFile(torrent, fileIndex) {
        const file = torrent.files[fileIndex];
        if (!file) {
            addLog('Arquivo não encontrado.', 'error');
            return;
        }

        currentFile = file;
        const video = DOM.videoPlayer;
        if (!video) return;

        // Priorizar download das peças deste arquivo
        try {
            file.select();
        } catch (selectErr) {
            addLog('Aviso na priorização de peças: ' + selectErr.message, 'warning');
        }

        // Esconder overlay, mostrar player (remover iframe do YouTube se existir)
        if (DOM.playerOverlay) DOM.playerOverlay.style.display = 'none';
        video.style.display = '';
        if (DOM.videoContainer) {
            var ytIframe = DOM.videoContainer.querySelector('.youtube-iframe');
            if (ytIframe) ytIframe.remove();
        }
        if (DOM.nowPlayingName) DOM.nowPlayingName.textContent = file.name;

        // Badge de streaming se não está 100% baixado
        if (DOM.streamingBadge) {
            DOM.streamingBadge.style.display = file.progress < 1 ? '' : 'none';
        }

        addLog('Reprodução iniciada: ' + file.name, 'info');
        setStatus('ready');

        const ext = '.' + file.name.split('.').pop().toLowerCase();

        // Limpar src anterior
        video.pause();
        video.removeAttribute('src');
        video.load();

        // Para .mp4 e .webm — usar renderTo com MediaSource
        if (ext === '.mp4' || ext === '.webm') {
            try {
                file.renderTo(video, { autoplay: true }, function (err) {
                    if (err) {
                        addLog('Erro ao reproduzir com renderTo: ' + err.message + '. Tentando método alternativo...', 'warning');
                        fallbackBlobPlayback(file, video);
                    }
                });
            } catch (err) {
                addLog('Erro ao reproduzir: ' + err.message, 'error');
                fallbackBlobPlayback(file, video);
            }
        } else {
            fallbackBlobPlayback(file, video);
        }

        startPlayerUpdateLoop();
    }

    /** Reproducao via Blob URL como fallback */
    function fallbackBlobPlayback(file, video) {
        try {
            file.getBlobURL(function (err, url) {
                if (err) {
                    addLog('Erro ao gerar URL do arquivo: ' + err.message, 'error');
                    addLog('Este formato pode não ser suportado pelo navegador.', 'warning');
                    return;
                }
                video.src = url;
                video.play().catch(function (playErr) {
                    addLog('Codec não suportado pelo navegador: ' + playErr.message, 'error');
                });
            });
        } catch (err) {
            addLog('Erro ao reproduzir arquivo: ' + err.message, 'error');
        }
    }

    // ======================================================================
    // 11. CONTROLES CUSTOMIZADOS DO PLAYER
    // ======================================================================

    function initPlayerControls() {
        const video = DOM.videoPlayer;
        if (!video) return;

        // Play / Pause
        if (DOM.btnPlayPause) DOM.btnPlayPause.addEventListener('click', togglePlayPause);

        // Retroceder 10s
        if (DOM.btnRewind) {
            DOM.btnRewind.addEventListener('click', function () {
                if (video.readyState > 0) video.currentTime = Math.max(0, video.currentTime - 10);
            });
        }

        // Avancar 10s
        if (DOM.btnForward) {
            DOM.btnForward.addEventListener('click', function () {
                if (video.readyState > 0) video.currentTime = Math.min(video.duration, video.currentTime + 10);
            });
        }

        // Barra de progresso — clique e arraste
        if (DOM.progressContainer) {
            DOM.progressContainer.addEventListener('mousedown', onProgressMouseDown);
            DOM.progressContainer.addEventListener('touchstart', onProgressTouchStart, { passive: false });
        }

        // Volume — mute/unmute
        if (DOM.btnVolume) DOM.btnVolume.addEventListener('click', toggleMute);

        // Volume — slider
        if (DOM.volumeSlider) {
            DOM.volumeSlider.addEventListener('input', function (e) {
                video.volume = parseFloat(e.target.value);
                video.muted = video.volume === 0;
                updateVolumeIcon();
            });
        }

        // Velocidade de reprodução
        if (DOM.speedSelector) {
            DOM.speedSelector.addEventListener('change', function (e) {
                video.playbackRate = parseFloat(e.target.value);
            });
        }

        // Tela cheia
        if (DOM.btnFullscreen) DOM.btnFullscreen.addEventListener('click', toggleFullscreen);

        // Eventos do video
        video.addEventListener('play', function () { updatePlayPauseIcon(true); });
        video.addEventListener('pause', function () { updatePlayPauseIcon(false); });
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('waiting', function () {
            if (DOM.bufferingOverlay) DOM.bufferingOverlay.hidden = false;
        });
        video.addEventListener('playing', function () {
            if (DOM.bufferingOverlay) DOM.bufferingOverlay.hidden = true;
        });
        video.addEventListener('ended', function () {
            updatePlayPauseIcon(false);
            addLog('Reprodução encerrada.', 'info');
        });
        video.addEventListener('error', function () {
            const errorMsg = video.error ? video.error.message : 'Erro desconhecido';
            addLog('Erro no player: ' + errorMsg + '. O codec pode não ser compatível com este navegador.', 'error');
        });
        video.addEventListener('loadedmetadata', function () {
            if (DOM.duration) DOM.duration.textContent = formatTime(video.duration);
        });
        video.addEventListener('progress', updateBufferVisualization);

        // Atalhos de teclado
        document.addEventListener('keydown', onKeyboardShortcut);
    }

    function togglePlayPause() {
        const video = DOM.videoPlayer;
        if (!video || !video.src) return;
        if (video.paused) {
            video.play().catch(function () {});
        } else {
            video.pause();
        }
    }

    function updatePlayPauseIcon(isPlaying) {
        const btn = DOM.btnPlayPause;
        if (!btn) return;
        const iconName = isPlaying ? 'pause' : 'play';
        btn.innerHTML = '<i data-lucide="' + iconName + '" aria-hidden="true"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
    }

    function toggleMute() {
        const video = DOM.videoPlayer;
        if (!video) return;
        video.muted = !video.muted;
        if (DOM.volumeSlider) DOM.volumeSlider.value = video.muted ? 0 : video.volume;
        updateVolumeIcon();
    }

    function updateVolumeIcon() {
        const video = DOM.videoPlayer;
        const btn = DOM.btnVolume;
        if (!video || !btn) return;
        let iconName = 'volume-2';
        if (video.muted || video.volume === 0) {
            iconName = 'volume-x';
        } else if (video.volume < 0.5) {
            iconName = 'volume-1';
        }
        btn.innerHTML = '<i data-lucide="' + iconName + '" aria-hidden="true"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
    }

    function toggleFullscreen() {
        const container = DOM.videoContainer;
        if (!container) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(function () {});
        } else {
            container.requestFullscreen().catch(function () {});
        }
    }

    function onTimeUpdate() {
        const video = DOM.videoPlayer;
        if (!video || isDraggingProgress) return;
        if (DOM.currentTime) DOM.currentTime.textContent = formatTime(video.currentTime);
        updateProgressBarPosition();
    }

    function updateProgressBarPosition() {
        const video = DOM.videoPlayer;
        if (!video || !video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        if (DOM.progressBar) DOM.progressBar.style.width = pct + '%';
        if (DOM.progressHandle) DOM.progressHandle.style.left = pct + '%';
    }

    function updateBufferVisualization() {
        const video = DOM.videoPlayer;
        if (!video || !video.duration) return;

        // Usar buffered ranges do HTML5 video
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const pct = (bufferedEnd / video.duration) * 100;
            if (DOM.progressBuffer) DOM.progressBuffer.style.width = pct + '%';
        }

        // Complementar com progresso do WebTorrent
        if (currentFile && DOM.progressBuffer) {
            const filePct = (currentFile.progress || 0) * 100;
            const currentPct = parseFloat(DOM.progressBuffer.style.width) || 0;
            if (filePct > currentPct) {
                DOM.progressBuffer.style.width = filePct + '%';
            }
        }
    }

    // Arraste na barra de progresso (mouse)
    function onProgressMouseDown(e) {
        e.preventDefault();
        isDraggingProgress = true;
        seekToPosition(e);
        document.addEventListener('mousemove', onProgressMouseMove);
        document.addEventListener('mouseup', onProgressMouseUp);
    }

    function onProgressMouseMove(e) {
        if (isDraggingProgress) seekToPosition(e);
    }

    function onProgressMouseUp() {
        isDraggingProgress = false;
        document.removeEventListener('mousemove', onProgressMouseMove);
        document.removeEventListener('mouseup', onProgressMouseUp);
    }

    // Arraste na barra de progresso (touch)
    function onProgressTouchStart(e) {
        e.preventDefault();
        isDraggingProgress = true;
        seekToPosition(e.touches[0]);
        document.addEventListener('touchmove', onProgressTouchMove, { passive: false });
        document.addEventListener('touchend', onProgressTouchEnd);
    }

    function onProgressTouchMove(e) {
        e.preventDefault();
        if (isDraggingProgress) seekToPosition(e.touches[0]);
    }

    function onProgressTouchEnd() {
        isDraggingProgress = false;
        document.removeEventListener('touchmove', onProgressTouchMove);
        document.removeEventListener('touchend', onProgressTouchEnd);
    }

    function seekToPosition(e) {
        const video = DOM.videoPlayer;
        const container = DOM.progressContainer;
        if (!video || !container || !video.duration) return;

        const rect = container.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const pct = x / rect.width;
        video.currentTime = pct * video.duration;
        if (DOM.currentTime) DOM.currentTime.textContent = formatTime(video.currentTime);
        updateProgressBarPosition();
    }

    // Atalhos de teclado
    function onKeyboardShortcut(e) {
        // Não capturar em campos de entrada
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        const video = DOM.videoPlayer;
        if (!video) return;

        switch (e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'arrowleft':
                e.preventDefault();
                if (video.readyState > 0) video.currentTime = Math.max(0, video.currentTime - 10);
                break;
            case 'arrowright':
                e.preventDefault();
                if (video.readyState > 0) video.currentTime = Math.min(video.duration, video.currentTime + 10);
                break;
            case 'm':
                toggleMute();
                break;
            case 'f':
                toggleFullscreen();
                break;
        }
    }

    /** Loop de atualização visual do player via requestAnimationFrame */
    function startPlayerUpdateLoop() {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        function loop() {
            if (!isDraggingProgress) {
                updateProgressBarPosition();
                updateBufferVisualization();
            }
            animFrameId = requestAnimationFrame(loop);
        }
        animFrameId = requestAnimationFrame(loop);
    }

    // ======================================================================
    // 12. ATUALIZACAO DE ESTATISTICAS DE DOWNLOAD
    // ======================================================================

    function startStatsUpdater(torrent) {
        if (statsInterval) clearInterval(statsInterval);

        function update() {
            if (!torrent) return;
            const progress = (torrent.progress * 100).toFixed(1);

            if (DOM.overallProgressText) DOM.overallProgressText.textContent = progress + '%';
            if (DOM.overallProgressBar) DOM.overallProgressBar.style.width = progress + '%';
            if (DOM.downloadSpeed) DOM.downloadSpeed.textContent = formatSpeed(torrent.downloadSpeed);
            if (DOM.uploadSpeed) DOM.uploadSpeed.textContent = formatSpeed(torrent.uploadSpeed);
            if (DOM.peersCount) DOM.peersCount.textContent = torrent.numPeers;
            if (DOM.totalSize) DOM.totalSize.textContent = formatBytes(torrent.length);
            if (DOM.downloadedSize) DOM.downloadedSize.textContent = formatBytes(torrent.downloaded);
            if (DOM.timeRemaining) DOM.timeRemaining.textContent = formatETA(torrent.timeRemaining);

            if (DOM.torrentStatus) {
                if (torrent.progress >= 1) {
                    DOM.torrentStatus.textContent = 'Concluído - Fazendo seed';
                } else if (torrent.numPeers > 0) {
                    DOM.torrentStatus.textContent = 'Baixando de ' + torrent.numPeers + ' peer(s)';
                } else {
                    DOM.torrentStatus.textContent = 'Procurando peers...';
                }
            }
        }

        update();
        statsInterval = setInterval(update, 1000);
    }

    function stopStatsUpdater() {
        if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
        if (fileProgressInterval) { clearInterval(fileProgressInterval); fileProgressInterval = null; }
    }

    // ======================================================================
    // 13. ACOES DA INTERFACE
    // ======================================================================

    function initInputHandlers() {
        if (DOM.btnStart) DOM.btnStart.addEventListener('click', startTorrent);
        if (DOM.btnClear) DOM.btnClear.addEventListener('click', clearAll);

        // Mostrar nome do arquivo selecionado no label
        if (DOM.torrentFileInput) {
            DOM.torrentFileInput.addEventListener('change', function () {
                const file = DOM.torrentFileInput.files ? DOM.torrentFileInput.files[0] : null;
                if (file && DOM.torrentFileLabel) DOM.torrentFileLabel.textContent = file.name;
            });
        }

        if (DOM.btnClearLog) DOM.btnClearLog.addEventListener('click', clearLog);

        // Enter no campo de magnet link
        if (DOM.magnetInput) {
            DOM.magnetInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); startTorrent(); }
            });
        }
    }

    /** Limpa toda a interface e destrói torrents */
    function clearAll() {
        // Destruir torrents ativos
        if (client) {
            try {
                client.torrents.forEach(function (t) { t.destroy(); });
            } catch (err) {
                console.warn('Erro ao destruir torrents:', err);
            }
        }
        currentTorrent = null;
        currentFile = null;

        stopStatsUpdater();
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

        // Limpar entradas
        if (DOM.magnetInput) DOM.magnetInput.value = '';
        if (DOM.torrentFileInput) DOM.torrentFileInput.value = '';
        if (DOM.torrentFileLabel) DOM.torrentFileLabel.textContent = '.torrent';

        // Resetar player
        const video = DOM.videoPlayer;
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
            video.style.display = '';
        }
        // Remover iframe do YouTube se existir
        if (DOM.videoContainer) {
            var ytIframe = DOM.videoContainer.querySelector('.youtube-iframe');
            if (ytIframe) ytIframe.remove();
        }
        if (DOM.playerOverlay) DOM.playerOverlay.style.display = '';
        if (DOM.bufferingOverlay) DOM.bufferingOverlay.hidden = true;
        if (DOM.nowPlayingName) DOM.nowPlayingName.textContent = 'Nenhum vídeo selecionado';
        if (DOM.streamingBadge) DOM.streamingBadge.style.display = '';
        if (DOM.currentTime) DOM.currentTime.textContent = '0:00';
        if (DOM.duration) DOM.duration.textContent = '0:00';
        if (DOM.progressBar) DOM.progressBar.style.width = '0%';
        if (DOM.progressBuffer) DOM.progressBuffer.style.width = '0%';
        if (DOM.progressHandle) DOM.progressHandle.style.left = '0%';
        updatePlayPauseIcon(false);

        // Esconder paineis
        if (DOM.mainContent) DOM.mainContent.hidden = true;
        if (DOM.downloadPanel) DOM.downloadPanel.hidden = true;
        if (DOM.activityLog) DOM.activityLog.hidden = true;

        // Limpar lista de arquivos
        if (DOM.fileList) DOM.fileList.innerHTML = '';

        // Resetar stats
        if (DOM.overallProgressText) DOM.overallProgressText.textContent = '0%';
        if (DOM.overallProgressBar) DOM.overallProgressBar.style.width = '0%';
        if (DOM.downloadSpeed) DOM.downloadSpeed.textContent = '0 KB/s';
        if (DOM.uploadSpeed) DOM.uploadSpeed.textContent = '0 KB/s';
        if (DOM.peersCount) DOM.peersCount.textContent = '0';
        if (DOM.totalSize) DOM.totalSize.textContent = '0 MB';
        if (DOM.downloadedSize) DOM.downloadedSize.textContent = '0 MB';
        if (DOM.timeRemaining) DOM.timeRemaining.textContent = 'Calculando...';
        if (DOM.torrentStatus) DOM.torrentStatus.textContent = 'Verificação de peças';

        setStatus('idle');
        clearLog();
        addLog('Interface limpa. Pronto para novo torrent.', 'info');
    }

    // ======================================================================
    // 14. LIMPEZA DE RECURSOS
    // ======================================================================

    function initCleanup() {
        window.addEventListener('beforeunload', function () {
            stopStatsUpdater();
            if (animFrameId) cancelAnimationFrame(animFrameId);
            if (client) {
                try { client.destroy(); } catch (_) { /* silencioso */ }
                client = null;
            }
        });
    }

    // ======================================================================
    // 15. INICIALIZACAO
    // ======================================================================

    function init() {
        initDisclaimer();
        initPlayerControls();
        initInputHandlers();
        initCleanup();
        setStatus('idle');
        addLog('Psyzon Stream inicializado. Aguardando entrada...', 'info');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
