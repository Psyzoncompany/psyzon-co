/* ==========================================================================
   COPA PSYZON — Chaveamento Page Controller
   Bracket, Ranking, History, Sponsors, Organizer controls
   ========================================================================== */

(function () {
    'use strict';

    /* ------------------------------------------------------------------
       Estado
    ------------------------------------------------------------------ */
    var state = {
        role: 'visitor',
        tournamentId: null,
        tournament: null,
        bracketView: 'tree',
        currentMatchId: null,
        sponsorIndex: 0,
        sponsorTimer: null,
        sponsors: []
    };

    var SECURITY_PASSWORD = '153090';

    /* ------------------------------------------------------------------
       Init
    ------------------------------------------------------------------ */
    function init() {
        FirebaseConfig.init();
        parseParams();
        setupRole();
        bindEvents();
        loadTournament();
        loadHistory();
        loadRanking();
        loadSponsors();
        startAutosave();
    }

    function parseParams() {
        var params = new URLSearchParams(window.location.search);
        state.role = params.get('role') || 'visitor';
        state.tournamentId = params.get('tournament') || null;
    }

    function setupRole() {
        var orgControls = document.getElementById('org-controls');
        var sponsorManage = document.getElementById('sponsor-manage');

        if (state.role === 'organizer') {
            orgControls.hidden = false;
            sponsorManage.hidden = false;
        } else {
            orgControls.hidden = true;
            sponsorManage.hidden = true;
        }
    }

    /* ------------------------------------------------------------------
       Eventos
    ------------------------------------------------------------------ */
    function bindEvents() {
        // Back
        document.getElementById('btn-back').addEventListener('click', function () {
            Utils.navigate('login.html');
        });

        // Tabs
        var tabBtns = document.querySelectorAll('#main-tabs .tab-btn');
        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].addEventListener('click', handleTabClick);
        }

        // View toggle
        document.getElementById('view-tree').addEventListener('click', function () { setBracketView('tree'); });
        document.getElementById('view-list').addEventListener('click', function () { setBracketView('list'); });

        // Custom teams toggle
        document.getElementById('cfg-teams').addEventListener('change', function () {
            document.getElementById('custom-teams-group').hidden = this.value !== 'custom';
        });

        // Organizer actions
        if (state.role === 'organizer') {
            document.getElementById('btn-add-player').addEventListener('click', addPlayer);
            document.getElementById('add-player-name').addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); addPlayer(); }
            });

            document.getElementById('btn-shuffle').addEventListener('click', shuffleBracket);
            document.getElementById('btn-generate-codes').addEventListener('click', generateCodes);
            document.getElementById('btn-export').addEventListener('click', exportJSON);
            document.getElementById('btn-import').addEventListener('click', function () {
                document.getElementById('import-file').click();
            });
            document.getElementById('import-file').addEventListener('change', importJSON);

            document.getElementById('btn-end-tournament').addEventListener('click', function () {
                Utils.confirm('Encerrar Torneio', 'Tem certeza que deseja encerrar o torneio?', endTournament, { requirePassword: true, danger: true, confirmText: 'Encerrar' });
            });
            document.getElementById('btn-reset-tournament').addEventListener('click', function () {
                Utils.confirm('Resetar Torneio', 'Isso vai limpar o chaveamento mas manter os jogadores.', resetTournament, { requirePassword: true, danger: true, confirmText: 'Resetar' });
            });
            document.getElementById('btn-cancel-tournament').addEventListener('click', function () {
                Utils.confirm('Cancelar Torneio', 'O torneio será cancelado e removido.', cancelTournament, { requirePassword: true, danger: true, confirmText: 'Cancelar Torneio' });
            });
            document.getElementById('btn-reset-all').addEventListener('click', function () {
                Utils.confirm('Resetar Tudo', 'ATENÇÃO: Isso vai apagar TODOS os dados do torneio, jogadores, ranking e histórico!', resetAll, { requirePassword: true, danger: true, confirmText: 'Resetar Tudo' });
            });

            // Sponsor add
            document.getElementById('btn-add-sponsor').addEventListener('click', addSponsor);
        }

        // Score modal
        document.getElementById('score-cancel').addEventListener('click', closeScoreModal);
        document.getElementById('score-save').addEventListener('click', saveScore);
        document.getElementById('score-modal').addEventListener('click', function (e) {
            if (e.target === this) closeScoreModal();
        });

        // Sponsor carousel nav
        document.getElementById('sponsor-prev').addEventListener('click', function () { moveSponsor(-1); });
        document.getElementById('sponsor-next').addEventListener('click', function () { moveSponsor(1); });
    }

    /* ------------------------------------------------------------------
       Tabs
    ------------------------------------------------------------------ */
    function handleTabClick() {
        var tabId = this.getAttribute('data-tab');
        var btns = document.querySelectorAll('#main-tabs .tab-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
        this.classList.add('active');

        var contents = document.querySelectorAll('.tab-content');
        for (var j = 0; j < contents.length; j++) contents[j].classList.remove('active');
        document.getElementById(tabId).classList.add('active');
    }

    /* ------------------------------------------------------------------
       Bracket View Toggle
    ------------------------------------------------------------------ */
    function setBracketView(view) {
        state.bracketView = view;
        document.getElementById('view-tree').classList.toggle('active', view === 'tree');
        document.getElementById('view-list').classList.toggle('active', view === 'list');
        renderBracket();
    }

    /* ------------------------------------------------------------------
       Load Tournament from Firebase
    ------------------------------------------------------------------ */
    function loadTournament() {
        // Se tem torneio ativo, escutar
        if (state.tournamentId) {
            listenTournament(state.tournamentId);
            return;
        }

        // Buscar torneio ativo
        FirebaseConfig.get('activeTournament').then(function (id) {
            if (id) {
                state.tournamentId = id;
                listenTournament(id);
            }
        });
    }

    function listenTournament(id) {
        FirebaseConfig.listen('tournaments/' + id, function (data) {
            if (!data) {
                state.tournament = null;
                renderBracket();
                return;
            }
            state.tournament = data;
            state.tournament._id = id;
            updateUI();
        });
    }

    function updateUI() {
        var t = state.tournament;
        if (!t) return;

        // Header
        document.getElementById('copa-name').textContent = t.name || 'Copa Psyzon';
        document.getElementById('prize-text').textContent = t.prize || 'Premiação a definir';

        var statusEl = document.getElementById('copa-status');
        if (t.status === 'finished') {
            statusEl.textContent = 'Finalizado';
            statusEl.className = 'badge badge-live';
        } else if (t.status === 'active') {
            statusEl.textContent = 'Ao Vivo';
            statusEl.className = 'badge badge-live';
        } else {
            statusEl.textContent = 'Configurando';
            statusEl.className = 'badge badge-active';
        }

        // Org form
        if (state.role === 'organizer') {
            document.getElementById('cfg-name').value = t.name || '';
            document.getElementById('cfg-prize').value = t.prize || '';
            document.getElementById('cfg-homeaway').value = t.homeAway ? 'true' : 'false';
        }

        renderPlayers();
        renderBracket();
    }

    /* ------------------------------------------------------------------
       Players
    ------------------------------------------------------------------ */
    function renderPlayers() {
        var list = document.getElementById('player-list');
        if (!list) return;

        var t = state.tournament;
        var teams = (t && t.teams) ? t.teams : [];

        if (!teams.length) {
            list.innerHTML = '<div class="empty-state"><p class="text-muted">Nenhum jogador cadastrado.</p></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < teams.length; i++) {
            var team = teams[i];
            html +=
                '<div class="player-item">' +
                '<span class="player-number">' + (i + 1) + '</span>' +
                '<span class="player-flag">' + (team.flag || '🏳️') + '</span>' +
                '<span class="player-name">' + escapeHtml(team.name) + '</span>';
            if (state.role === 'organizer') {
                html +=
                    '<span class="player-actions">' +
                    '<button class="btn-icon btn" data-action="edit" data-index="' + i + '" title="Editar">&#9998;</button>' +
                    '<button class="btn-icon btn" data-action="remove" data-index="' + i + '" title="Remover">&#10006;</button>' +
                    '</span>';
            }
            html += '</div>';
        }
        list.innerHTML = html;

        // Bind player action buttons
        if (state.role === 'organizer') {
            var actionBtns = list.querySelectorAll('[data-action]');
            for (var j = 0; j < actionBtns.length; j++) {
                actionBtns[j].addEventListener('click', handlePlayerAction);
            }
        }
    }

    function addPlayer() {
        var input = document.getElementById('add-player-name');
        var name = input.value.trim();
        if (!name) {
            Utils.toast('Digite o nome do jogador.', 'warning');
            return;
        }

        ensureTournament(function () {
            var t = state.tournament;
            if (!t.teams) t.teams = [];
            t.teams.push({
                id: Utils.generateId(),
                name: name,
                flag: '🏳️'
            });
            saveTournament();
            input.value = '';
            input.focus();
            Utils.toast('Jogador adicionado!', 'success');
        });
    }

    function handlePlayerAction(e) {
        var btn = e.currentTarget;
        var action = btn.getAttribute('data-action');
        var index = parseInt(btn.getAttribute('data-index'), 10);

        if (action === 'remove') {
            state.tournament.teams.splice(index, 1);
            saveTournament();
            Utils.toast('Jogador removido.', 'info');
        } else if (action === 'edit') {
            var team = state.tournament.teams[index];
            var newName = prompt('Novo nome:', team.name);
            if (newName !== null && newName.trim()) {
                team.name = newName.trim();
                saveTournament();
                Utils.toast('Jogador editado.', 'success');
            }
        }
    }

    /* ------------------------------------------------------------------
       Bracket Render
    ------------------------------------------------------------------ */
    function renderBracket() {
        var t = state.tournament;
        var emptyEl = document.getElementById('bracket-empty');
        var treeEl = document.getElementById('bracket-tree-view');
        var listEl = document.getElementById('bracket-list-view');

        if (!t || !t.bracket || !t.bracket.rounds || !t.bracket.rounds.length) {
            emptyEl.hidden = false;
            treeEl.hidden = true;
            listEl.hidden = true;
            return;
        }

        emptyEl.hidden = true;
        var bracket = t.bracket;
        var isOrg = state.role === 'organizer';

        if (state.bracketView === 'tree') {
            treeEl.hidden = false;
            listEl.hidden = true;
            renderBracketTree(bracket, treeEl, isOrg);
        } else {
            treeEl.hidden = true;
            listEl.hidden = false;
            renderBracketList(bracket, listEl, isOrg);
        }
    }

    function renderBracketTree(bracket, container, isOrg) {
        var html = '';
        for (var r = 0; r < bracket.rounds.length; r++) {
            var round = bracket.rounds[r];
            var roundName = getRoundName(r, bracket.rounds.length);
            html += '<div class="bracket-round">';
            html += '<div class="bracket-round-title">' + roundName + '</div>';
            for (var m = 0; m < round.length; m++) {
                html += renderMatchCard(round[m], isOrg);
            }
            html += '</div>';
        }
        container.innerHTML = html;
        bindMatchCards(container);
    }

    function renderBracketList(bracket, container, isOrg) {
        var html = '';
        for (var r = 0; r < bracket.rounds.length; r++) {
            var round = bracket.rounds[r];
            var roundName = getRoundName(r, bracket.rounds.length);
            html += '<div class="bracket-list-round">';
            html += '<h4 style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;">' + roundName + '</h4>';
            for (var m = 0; m < round.length; m++) {
                html += renderMatchCard(round[m], isOrg);
            }
            html += '</div>';
        }
        container.innerHTML = html;
        bindMatchCards(container);
    }

    function renderMatchCard(match, isOrg) {
        var t1 = match.team1;
        var t2 = match.team2;
        var clickable = isOrg && t1 && t2 ? ' editable' : '';

        var html = '<div class="match-card' + clickable + '" data-match="' + match.id + '">';

        if (match.datetime) {
            html += '<div class="match-datetime">' + Utils.formatDate(match.datetime) + '</div>';
        }

        // Team 1
        html += '<div class="match-team' + (match.winner && match.winner === (t1 ? t1.id : '') ? ' winner' : '') + '">';
        if (t1) {
            html += '<span class="team-flag">' + (t1.flag || '') + '</span>';
            html += '<span class="team-name">' + escapeHtml(t1.name) + '</span>';
            html += '<span class="team-score">' + (match.played ? (match.scoreHome1 || 0) : '—') + '</span>';
        } else {
            html += '<span class="empty-slot">A definir</span>';
        }
        html += '</div>';

        // Team 2
        html += '<div class="match-team' + (match.winner && match.winner === (t2 ? t2.id : '') ? ' winner' : '') + '">';
        if (t2) {
            html += '<span class="team-flag">' + (t2.flag || '') + '</span>';
            html += '<span class="team-name">' + escapeHtml(t2.name) + '</span>';
            html += '<span class="team-score">' + (match.played ? (match.scoreHome2 || 0) : '—') + '</span>';
        } else {
            html += '<span class="empty-slot">A definir</span>';
        }
        html += '</div>';

        html += '</div>';
        return html;
    }

    function bindMatchCards(container) {
        var cards = container.querySelectorAll('.match-card.editable');
        for (var i = 0; i < cards.length; i++) {
            cards[i].addEventListener('click', function () {
                openScoreModal(this.getAttribute('data-match'));
            });
        }
    }

    function getRoundName(index, total) {
        var remaining = total - index;
        if (remaining === 1) return 'Final';
        if (remaining === 2) return 'Semifinal';
        if (remaining === 3) return 'Quartas de Final';
        if (remaining === 4) return 'Oitavas de Final';
        if (remaining === 5) return '16 Avos';
        return 'Rodada ' + (index + 1);
    }

    /* ------------------------------------------------------------------
       Score Modal
    ------------------------------------------------------------------ */
    function openScoreModal(matchId) {
        state.currentMatchId = matchId;
        var match = findMatch(matchId);
        if (!match) return;

        var t = state.tournament;
        var homeAway = t && t.homeAway;

        document.getElementById('score-match-label').textContent =
            (match.team1 ? match.team1.name : '?') + ' vs ' + (match.team2 ? match.team2.name : '?');
        document.getElementById('score-team1-label').textContent = match.team1 ? match.team1.name : 'Time 1';
        document.getElementById('score-team2-label').textContent = match.team2 ? match.team2.name : 'Time 2';

        document.getElementById('score-home1').value = match.scoreHome1 || '';
        document.getElementById('score-home2').value = match.scoreHome2 || '';
        document.getElementById('score-away1').value = match.scoreAway1 || '';
        document.getElementById('score-away2').value = match.scoreAway2 || '';
        document.getElementById('score-pen1').value = match.penalties1 || '';
        document.getElementById('score-pen2').value = match.penalties2 || '';
        document.getElementById('score-datetime').value = match.datetime || '';
        document.getElementById('away-scores').hidden = !homeAway;

        document.getElementById('score-modal').classList.add('active');
    }

    function closeScoreModal() {
        document.getElementById('score-modal').classList.remove('active');
        state.currentMatchId = null;
    }

    function saveScore() {
        var matchId = state.currentMatchId;
        if (!matchId) return;

        var scores = {
            scoreHome1: parseInt(document.getElementById('score-home1').value, 10) || 0,
            scoreHome2: parseInt(document.getElementById('score-home2').value, 10) || 0,
            scoreAway1: parseInt(document.getElementById('score-away1').value, 10) || 0,
            scoreAway2: parseInt(document.getElementById('score-away2').value, 10) || 0,
            penalties1: parseInt(document.getElementById('score-pen1').value, 10) || 0,
            penalties2: parseInt(document.getElementById('score-pen2').value, 10) || 0
        };
        var datetime = document.getElementById('score-datetime').value || null;

        var bracket = state.tournament.bracket;
        var homeAway = state.tournament.homeAway;

        // Find and update match
        for (var r = 0; r < bracket.rounds.length; r++) {
            for (var m = 0; m < bracket.rounds[r].length; m++) {
                var match = bracket.rounds[r][m];
                if (match.id === matchId) {
                    match.scoreHome1 = scores.scoreHome1;
                    match.scoreHome2 = scores.scoreHome2;
                    match.scoreAway1 = scores.scoreAway1;
                    match.scoreAway2 = scores.scoreAway2;
                    match.penalties1 = scores.penalties1;
                    match.penalties2 = scores.penalties2;
                    match.datetime = datetime;
                    match.played = true;

                    // Calculate winner
                    var total1 = scores.scoreHome1 + (homeAway ? scores.scoreAway1 : 0);
                    var total2 = scores.scoreHome2 + (homeAway ? scores.scoreAway2 : 0);
                    var winnerId = null;

                    if (total1 > total2) winnerId = match.team1.id;
                    else if (total2 > total1) winnerId = match.team2.id;
                    else if (scores.penalties1 > scores.penalties2) winnerId = match.team1.id;
                    else if (scores.penalties2 > scores.penalties1) winnerId = match.team2.id;

                    match.winner = winnerId;

                    // Advance winner
                    if (winnerId) {
                        var nextRound = r + 1;
                        if (nextRound < bracket.rounds.length) {
                            var nextMatch = bracket.rounds[nextRound][Math.floor(m / 2)];
                            if (nextMatch) {
                                var winnerTeam = winnerId === match.team1.id ? match.team1 : match.team2;
                                if (m % 2 === 0) {
                                    nextMatch.team1 = winnerTeam;
                                } else {
                                    nextMatch.team2 = winnerTeam;
                                }
                            }
                        }
                    }

                    break;
                }
            }
        }

        saveTournament();
        closeScoreModal();
        Utils.toast('Resultado salvo!', 'success');
    }

    function findMatch(matchId) {
        if (!state.tournament || !state.tournament.bracket) return null;
        var bracket = state.tournament.bracket;
        for (var r = 0; r < bracket.rounds.length; r++) {
            for (var m = 0; m < bracket.rounds[r].length; m++) {
                if (bracket.rounds[r][m].id === matchId) return bracket.rounds[r][m];
            }
        }
        return null;
    }

    /* ------------------------------------------------------------------
       Tournament Actions
    ------------------------------------------------------------------ */
    function ensureTournament(callback) {
        if (state.tournament && state.tournamentId) {
            callback();
            return;
        }

        var id = Utils.generateId();
        var t = {
            name: document.getElementById('cfg-name').value || 'Copa Psyzon',
            prize: document.getElementById('cfg-prize').value || '',
            teamCount: getTeamCount(),
            homeAway: document.getElementById('cfg-homeaway').value === 'true',
            status: 'setup',
            teams: [],
            bracket: null,
            createdAt: new Date().toISOString()
        };

        state.tournamentId = id;
        state.tournament = t;

        FirebaseConfig.set('tournaments/' + id, t).then(function () {
            FirebaseConfig.set('activeTournament', id);
            listenTournament(id);
            callback();
        });
    }

    function getTeamCount() {
        var sel = document.getElementById('cfg-teams');
        if (sel.value === 'custom') {
            return parseInt(document.getElementById('cfg-custom-teams').value, 10) || 8;
        }
        return parseInt(sel.value, 10);
    }

    function saveTournament() {
        if (!state.tournament || !state.tournamentId) return;

        // Sync config fields
        state.tournament.name = document.getElementById('cfg-name').value || state.tournament.name;
        state.tournament.prize = document.getElementById('cfg-prize').value || state.tournament.prize;
        state.tournament.homeAway = document.getElementById('cfg-homeaway').value === 'true';

        FirebaseConfig.set('tournaments/' + state.tournamentId, state.tournament)
            .catch(function () {
                Utils.toast('Erro ao salvar. Tentando novamente...', 'error');
            });
    }

    function shuffleBracket() {
        if (!state.tournament) {
            Utils.toast('Crie o torneio primeiro.', 'warning');
            return;
        }

        var teams = state.tournament.teams || [];
        if (teams.length < 2) {
            Utils.toast('Adicione pelo menos 2 jogadores.', 'warning');
            return;
        }

        // Fisher-Yates shuffle
        var shuffled = teams.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = tmp;
        }

        // Generate bracket
        var count = shuffled.length;
        var rounds = Math.ceil(Math.log2(count));
        var bracket = { rounds: [], totalRounds: rounds };

        // First round
        var firstRound = [];
        for (var k = 0; k < count; k += 2) {
            firstRound.push({
                id: 'r1_m' + (k / 2),
                round: 0,
                matchIndex: k / 2,
                team1: shuffled[k] || null,
                team2: shuffled[k + 1] || null,
                scoreHome1: null, scoreHome2: null,
                scoreAway1: null, scoreAway2: null,
                penalties1: null, penalties2: null,
                winner: null, played: false, datetime: null
            });
        }
        bracket.rounds.push(firstRound);

        // Subsequent rounds
        var prevCount = firstRound.length;
        for (var r = 1; r < rounds; r++) {
            var roundMatches = [];
            var mCount = Math.ceil(prevCount / 2);
            for (var mi = 0; mi < mCount; mi++) {
                roundMatches.push({
                    id: 'r' + (r + 1) + '_m' + mi,
                    round: r,
                    matchIndex: mi,
                    team1: null, team2: null,
                    scoreHome1: null, scoreHome2: null,
                    scoreAway1: null, scoreAway2: null,
                    penalties1: null, penalties2: null,
                    winner: null, played: false, datetime: null
                });
            }
            bracket.rounds.push(roundMatches);
            prevCount = mCount;
        }

        // Auto-advance byes (odd teams)
        for (var bi = 0; bi < firstRound.length; bi++) {
            var bMatch = firstRound[bi];
            if (bMatch.team1 && !bMatch.team2) {
                bMatch.winner = bMatch.team1.id;
                bMatch.played = true;
                // Advance
                var nRound = 1;
                if (nRound < bracket.rounds.length) {
                    var nMatch = bracket.rounds[nRound][Math.floor(bi / 2)];
                    if (nMatch) {
                        if (bi % 2 === 0) nMatch.team1 = bMatch.team1;
                        else nMatch.team2 = bMatch.team1;
                    }
                }
            }
        }

        state.tournament.bracket = bracket;
        state.tournament.status = 'active';
        saveTournament();
        Utils.toast('Chaveamento gerado!', 'success');
    }

    function generateCodes() {
        if (!state.tournamentId) {
            Utils.toast('Crie o torneio primeiro.', 'warning');
            return;
        }

        var teams = state.tournament.teams || [];
        var count = Math.max(teams.length, 4);

        FirebaseConfig.generateAccessCodes(state.tournamentId, count).then(function (codes) {
            var display = document.getElementById('codes-display');
            var list = document.getElementById('codes-list');
            display.hidden = false;
            list.innerHTML = '';
            codes.forEach(function (code) {
                var span = document.createElement('span');
                span.className = 'badge badge-active';
                span.textContent = code;
                span.style.fontSize = '1rem';
                span.style.padding = '0.4rem 0.8rem';
                list.appendChild(span);
            });
            Utils.toast(codes.length + ' códigos gerados!', 'success');
        });
    }

    function exportJSON() {
        if (!state.tournament) return;
        var data = JSON.stringify(state.tournament, null, 2);
        var blob = new Blob([data], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'copa-psyzon-' + (state.tournamentId || 'export') + '.json';
        a.click();
        URL.revokeObjectURL(url);
        Utils.toast('Exportado com sucesso!', 'success');
    }

    function importJSON(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var data = JSON.parse(ev.target.result);
                if (!data.teams && !data.bracket) {
                    Utils.toast('Formato inválido.', 'error');
                    return;
                }
                ensureTournament(function () {
                    Object.assign(state.tournament, data);
                    saveTournament();
                    Utils.toast('Importado com sucesso!', 'success');
                });
            } catch (err) {
                Utils.toast('Erro ao ler arquivo.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function endTournament() {
        if (!state.tournament) return;
        state.tournament.status = 'finished';
        state.tournament.finishedAt = new Date().toISOString();

        // Save to history
        var champion = getChampionName();
        var historyEntry = {
            name: state.tournament.name || 'Copa Psyzon',
            winner: champion || 'N/A',
            prize: state.tournament.prize || '',
            teamCount: (state.tournament.teams || []).length,
            finishedAt: state.tournament.finishedAt
        };
        FirebaseConfig.push('history', historyEntry);

        saveTournament();
        Utils.toast('Torneio encerrado!', 'success');
    }

    function getChampionName() {
        var t = state.tournament;
        if (!t || !t.bracket || !t.bracket.rounds.length) return null;
        var finalRound = t.bracket.rounds[t.bracket.rounds.length - 1];
        if (!finalRound || !finalRound.length) return null;
        var finalMatch = finalRound[0];
        if (!finalMatch.winner) return null;
        if (finalMatch.team1 && finalMatch.winner === finalMatch.team1.id) return finalMatch.team1.name;
        if (finalMatch.team2 && finalMatch.winner === finalMatch.team2.id) return finalMatch.team2.name;
        return null;
    }

    function resetTournament() {
        if (!state.tournament) return;
        state.tournament.bracket = null;
        state.tournament.status = 'setup';
        saveTournament();
        Utils.toast('Chaveamento resetado.', 'info');
    }

    function cancelTournament() {
        if (!state.tournamentId) return;
        FirebaseConfig.remove('tournaments/' + state.tournamentId);
        FirebaseConfig.set('activeTournament', null);
        state.tournament = null;
        state.tournamentId = null;
        renderBracket();
        Utils.toast('Torneio cancelado.', 'info');
    }

    function resetAll() {
        FirebaseConfig.remove('tournaments');
        FirebaseConfig.remove('history');
        FirebaseConfig.remove('ranking');
        FirebaseConfig.set('activeTournament', null);
        state.tournament = null;
        state.tournamentId = null;
        renderBracket();
        document.getElementById('history-list').innerHTML = '<div class="empty-state"><span class="empty-icon">&#128220;</span><p>Nenhum torneio finalizado ainda.</p></div>';
        document.getElementById('ranking-container').innerHTML = '<div class="empty-state"><span class="empty-icon">&#128200;</span><p>Nenhuma estatística disponível.</p></div>';
        Utils.toast('Tudo foi resetado.', 'info');
    }

    /* ------------------------------------------------------------------
       Ranking
    ------------------------------------------------------------------ */
    function loadRanking() {
        FirebaseConfig.listen('ranking', function (data) {
            renderRanking(data);
        });
    }

    function renderRanking(data) {
        var container = document.getElementById('ranking-container');
        if (!data) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">&#128200;</span><p>Nenhuma estatística disponível ainda.</p></div>';
            return;
        }

        var players = [];
        var keys = Object.keys(data);
        keys.forEach(function (k) {
            var p = data[k];
            p._key = k;
            players.push(p);
        });

        players.sort(function (a, b) {
            return (b.trophies || 0) - (a.trophies || 0) || (b.goalsScored || 0) - (a.goalsScored || 0);
        });

        var html = '<div style="overflow-x:auto;"><table class="ranking-table"><thead><tr>';
        html += '<th>#</th><th>Jogador</th><th>&#127942;</th><th>&#9917; Gols</th><th>Saldo</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < players.length; i++) {
            var p = players[i];
            var posClass = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : ''));
            html += '<tr>';
            html += '<td><span class="ranking-position ' + posClass + '">' + (i + 1) + '</span></td>';
            html += '<td>' + escapeHtml(p.nick || p.name || 'N/A') + '</td>';
            html += '<td>' + (p.trophies || 0) + '</td>';
            html += '<td>' + (p.goalsScored || 0) + '</td>';
            html += '<td>' + ((p.goalsScored || 0) - (p.goalsConceded || 0)) + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    /* ------------------------------------------------------------------
       History
    ------------------------------------------------------------------ */
    function loadHistory() {
        FirebaseConfig.listen('history', function (data) {
            renderHistory(data);
        });
    }

    function renderHistory(data) {
        var list = document.getElementById('history-list');
        if (!data) {
            list.innerHTML = '<div class="empty-state"><span class="empty-icon">&#128220;</span><p>Nenhum torneio finalizado ainda.</p></div>';
            return;
        }

        var entries = [];
        var keys = Object.keys(data);
        keys.forEach(function (k) { entries.push(data[k]); });
        entries.sort(function (a, b) { return (b.finishedAt || '').localeCompare(a.finishedAt || ''); });

        var html = '';
        entries.forEach(function (e) {
            html +=
                '<div class="history-item">' +
                '<div>' +
                '<div class="history-name">' + escapeHtml(e.name || 'Copa Psyzon') + '</div>' +
                '<div class="history-date">' + Utils.formatDate(e.finishedAt) + '</div>' +
                '</div>' +
                '<div class="history-winner">&#127942; ' + escapeHtml(e.winner || 'N/A') + '</div>' +
                '</div>';
        });

        list.innerHTML = html;
    }

    /* ------------------------------------------------------------------
       Sponsors
    ------------------------------------------------------------------ */
    function loadSponsors() {
        FirebaseConfig.listen('sponsors', function (data) {
            if (!data) {
                state.sponsors = [];
                renderSponsorCarousel();
                return;
            }
            state.sponsors = [];
            var keys = Object.keys(data);
            keys.forEach(function (k) {
                var s = data[k];
                s._key = k;
                state.sponsors.push(s);
            });
            renderSponsorCarousel();
        });
    }

    function renderSponsorCarousel() {
        var track = document.getElementById('sponsor-track');
        var dots = document.getElementById('sponsor-dots');

        if (!state.sponsors.length) {
            track.innerHTML = '<div class="sponsor-slide"><p class="text-muted">Nenhum patrocinador cadastrado.</p></div>';
            dots.innerHTML = '';
            return;
        }

        var html = '';
        var dotsHtml = '';
        state.sponsors.forEach(function (s, i) {
            html +=
                '<div class="sponsor-slide">' +
                (s.image ? '<img src="' + s.image + '" alt="' + escapeHtml(s.name || '') + '">' : '') +
                '<div class="sponsor-name">' + escapeHtml(s.name || '') + '</div>' +
                (s.link ? '<a href="' + s.link + '" target="_blank" rel="noopener" class="btn btn-sm">Visitar &#8599;</a>' : '') +
                '</div>';
            dotsHtml += '<div class="sponsor-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></div>';
        });

        track.innerHTML = html;
        dots.innerHTML = dotsHtml;
        state.sponsorIndex = 0;
        updateSponsorPosition();

        // Dot clicks
        var dotEls = dots.querySelectorAll('.sponsor-dot');
        for (var i = 0; i < dotEls.length; i++) {
            dotEls[i].addEventListener('click', function () {
                state.sponsorIndex = parseInt(this.getAttribute('data-index'), 10);
                updateSponsorPosition();
            });
        }

        // Auto play
        clearInterval(state.sponsorTimer);
        if (state.sponsors.length > 1) {
            state.sponsorTimer = setInterval(function () {
                moveSponsor(1);
            }, 5000);
        }
    }

    function moveSponsor(dir) {
        var total = state.sponsors.length;
        if (total <= 1) return;
        state.sponsorIndex = (state.sponsorIndex + dir + total) % total;
        updateSponsorPosition();
    }

    function updateSponsorPosition() {
        var track = document.getElementById('sponsor-track');
        track.style.transform = 'translateX(-' + (state.sponsorIndex * 100) + '%)';

        var dots = document.querySelectorAll('#sponsor-dots .sponsor-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('active', i === state.sponsorIndex);
        }
    }

    function addSponsor() {
        var name = document.getElementById('sponsor-name').value.trim();
        var link = document.getElementById('sponsor-link').value.trim();
        var image = document.getElementById('sponsor-image').value.trim();

        if (!name) {
            Utils.toast('Insira o nome do patrocinador.', 'warning');
            return;
        }

        FirebaseConfig.push('sponsors', {
            name: name,
            link: link,
            image: image,
            createdAt: new Date().toISOString()
        }).then(function () {
            document.getElementById('sponsor-name').value = '';
            document.getElementById('sponsor-link').value = '';
            document.getElementById('sponsor-image').value = '';
            Utils.toast('Patrocinador adicionado!', 'success');
        });
    }

    /* ------------------------------------------------------------------
       Autosave
    ------------------------------------------------------------------ */
    function startAutosave() {
        if (state.role !== 'organizer') return;

        // Autosave config changes on blur
        var inputs = document.querySelectorAll('#cfg-name, #cfg-prize, #cfg-homeaway');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener('change', function () {
                if (state.tournament) saveTournament();
            });
        }
    }

    /* ------------------------------------------------------------------
       Helpers
    ------------------------------------------------------------------ */
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
