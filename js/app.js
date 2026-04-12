/* ==========================================================================
   COPA PSYZON — Controlador Principal da Aplicacao
   Roteamento de telas, eventos, UI
   ========================================================================== */

(function () {
    'use strict';

    var Data = CopaPsyzonData;
    var Engine = CopaPsyzonTournament;

    /* ------------------------------------------------------------------
       Estado da Aplicacao
    ------------------------------------------------------------------ */
    var state = {
        currentScreen: 'screen-landing',
        currentTab: null,
        currentMatchId: null,
        currentTeamId: null,
        bracketView: 'tree',
        participantData: null
    };

    /* ------------------------------------------------------------------
       Navegacao entre Telas
    ------------------------------------------------------------------ */
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(function (s) {
            s.classList.remove('active');
        });
        var target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            state.currentScreen = screenId;
        }
    }

    /* ------------------------------------------------------------------
       Tabs
    ------------------------------------------------------------------ */
    function setupTabs() {
        document.querySelectorAll('.org-tabs').forEach(function (nav) {
            nav.querySelectorAll('.tab-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var tabId = btn.getAttribute('data-tab');
                    // Deactivate siblings
                    nav.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    // Show content
                    var parent = nav.parentElement;
                    parent.querySelectorAll('.tab-content').forEach(function (tc) { tc.classList.remove('active'); });
                    var tab = document.getElementById(tabId);
                    if (tab) tab.classList.add('active');
                });
            });
        });
    }

    /* ------------------------------------------------------------------
       Toast
    ------------------------------------------------------------------ */
    function toast(msg) {
        var el = document.getElementById('toast');
        var msgEl = document.getElementById('toast-message');
        msgEl.textContent = msg;
        el.hidden = false;
        el.classList.add('show');
        setTimeout(function () {
            el.classList.remove('show');
            setTimeout(function () { el.hidden = true; }, 300);
        }, 2500);
    }

    /* ------------------------------------------------------------------
       CPF Mask
    ------------------------------------------------------------------ */
    function maskCPF(value) {
        var digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return digits.slice(0, 3) + '.' + digits.slice(3);
        if (digits.length <= 9) return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6);
        return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6, 9) + '-' + digits.slice(9);
    }

    function setupCPFMasks() {
        ['reg-cpf', 'search-cpf'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function () {
                    el.value = maskCPF(el.value);
                });
            }
        });
    }

    /* ------------------------------------------------------------------
       Phone Mask
    ------------------------------------------------------------------ */
    function setupPhoneMask() {
        var el = document.getElementById('reg-whatsapp');
        if (el) {
            el.addEventListener('input', function () {
                var d = el.value.replace(/\D/g, '').slice(0, 11);
                if (d.length <= 2) { el.value = d; return; }
                if (d.length <= 7) { el.value = '(' + d.slice(0, 2) + ') ' + d.slice(2); return; }
                el.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
            });
        }
    }

    /* ------------------------------------------------------------------
       LANDING — Eventos dos Botoes de Perfil
    ------------------------------------------------------------------ */
    function setupLanding() {
        document.getElementById('btn-enter-organizer').addEventListener('click', function () {
            showScreen('screen-organizer');
            refreshOrganizerPanel();
        });

        document.getElementById('btn-enter-participant').addEventListener('click', function () {
            showScreen('screen-room-code');
        });

        document.getElementById('btn-enter-visitor').addEventListener('click', function () {
            showScreen('screen-visitor');
            refreshVisitorView();
        });
    }

    /* ------------------------------------------------------------------
       ROOM CODE — Entrada por Codigo
    ------------------------------------------------------------------ */
    function setupRoomCode() {
        document.getElementById('btn-back-room').addEventListener('click', function () {
            showScreen('screen-landing');
        });

        var input = document.getElementById('input-room-code');
        input.addEventListener('input', function () {
            input.value = input.value.replace(/\D/g, '').slice(0, 4);
        });

        document.getElementById('btn-join-room').addEventListener('click', function () {
            var code = input.value.trim();
            var tournament = Data.getTournament();
            var error = document.getElementById('room-code-error');

            if (code === tournament.roomCode && code.length === 4) {
                error.hidden = true;
                showScreen('screen-register');
            } else {
                error.hidden = false;
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                document.getElementById('btn-join-room').click();
            }
        });
    }

    /* ------------------------------------------------------------------
       REGISTRATION — Cadastro do Participante
    ------------------------------------------------------------------ */
    function setupRegistration() {
        document.getElementById('btn-back-register').addEventListener('click', function () {
            showScreen('screen-room-code');
        });

        // Photo upload
        document.getElementById('input-photo').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                var preview = document.getElementById('photo-preview');
                preview.innerHTML = '<img src="' + ev.target.result + '" alt="Foto">';
                preview.dataset.photo = ev.target.result;
            };
            reader.readAsDataURL(file);
        });

        // Search by CPF
        document.getElementById('btn-search-cpf').addEventListener('click', function () {
            var cpf = document.getElementById('search-cpf').value;
            var result = document.getElementById('cpf-search-result');
            var player = Data.findPlayerByCPF(cpf);

            if (player) {
                document.getElementById('reg-name').value = player.name || '';
                document.getElementById('reg-nick').value = player.nick || '';
                document.getElementById('reg-cpf').value = player.cpf || '';
                document.getElementById('reg-instagram').value = player.instagram || '';
                document.getElementById('reg-whatsapp').value = player.whatsapp || '';
                if (player.flag) {
                    document.getElementById('reg-flag').value = player.flag;
                }
                if (player.photo) {
                    var preview = document.getElementById('photo-preview');
                    preview.innerHTML = '<img src="' + player.photo + '" alt="Foto">';
                    preview.dataset.photo = player.photo;
                }
                result.textContent = 'Cadastro encontrado! Dados preenchidos.';
                result.style.color = 'var(--green)';
                result.hidden = false;
            } else {
                result.textContent = 'Nenhum cadastro encontrado com esse CPF.';
                result.style.color = 'var(--red)';
                result.hidden = false;
            }
        });

        // Form submit
        document.getElementById('form-register').addEventListener('submit', function (e) {
            e.preventDefault();

            var preview = document.getElementById('photo-preview');
            var playerData = {
                name: document.getElementById('reg-name').value.trim(),
                nick: document.getElementById('reg-nick').value.trim(),
                cpf: document.getElementById('reg-cpf').value.trim(),
                flag: document.getElementById('reg-flag').value,
                instagram: document.getElementById('reg-instagram').value.trim(),
                whatsapp: document.getElementById('reg-whatsapp').value.trim(),
                photo: preview.dataset.photo || ''
            };

            if (!playerData.name || !playerData.nick || !playerData.cpf) {
                var missing = [];
                if (!playerData.name) missing.push('Nome');
                if (!playerData.nick) missing.push('Nick');
                if (!playerData.cpf) missing.push('CPF');
                toast('Preencha: ' + missing.join(', '));
                return;
            }

            // Save to DB
            Data.savePlayerToDB(playerData);
            state.participantData = playerData;

            toast('Cadastro realizado com sucesso!');
            showScreen('screen-participant-view');
            refreshParticipantView();
        });
    }

    /* ------------------------------------------------------------------
       PARTICIPANT VIEW
    ------------------------------------------------------------------ */
    function refreshParticipantView() {
        var bar = document.getElementById('participant-info-bar');
        if (state.participantData) {
            var p = state.participantData;
            var photoHtml = p.photo ? '<img class="participant-photo" src="' + p.photo + '" alt="Foto">' : '';
            bar.innerHTML = photoHtml +
                '<span class="participant-name">' + escapeHtml(p.flag + ' ' + p.nick) + '</span>' +
                '<span class="participant-nick">' + escapeHtml(p.name) + '</span>';
        }

        var tournament = Data.getTournament();
        renderBracketView(document.getElementById('participant-bracket-container'), tournament, false);
        renderStatsTable(document.getElementById('participant-stats-body'));
    }

    function setupParticipantView() {
        document.getElementById('btn-participant-back').addEventListener('click', function () {
            state.participantData = null;
            showScreen('screen-landing');
        });
    }

    /* ------------------------------------------------------------------
       ORGANIZER PANEL
    ------------------------------------------------------------------ */
    function refreshOrganizerPanel() {
        var t = Data.getTournament();

        // Setup tab
        document.getElementById('tournament-name').value = t.name || '';
        document.getElementById('tournament-teams').value = t.teamCount;
        document.getElementById('tournament-prize').value = t.prize || '';
        document.getElementById('tournament-home-away').checked = t.homeAway || false;
        document.getElementById('home-away-label').textContent = t.homeAway ? 'Ativado' : 'Desativado';
        document.getElementById('display-room-code').textContent = t.roomCode || '----';

        // Teams
        refreshTeamsList();

        // Bracket
        renderBracketView(document.getElementById('bracket-container'), t, true);

        // Results
        renderMatchesList(t);

        // Stats
        renderStatsTable(document.getElementById('stats-body'));

        // History
        renderHistory(document.getElementById('history-list'));

        // Update badge
        document.getElementById('teams-count-badge').textContent = t.teams.length + ' / ' + t.teamCount;
    }

    function setupOrganizer() {
        // Logout
        document.getElementById('btn-logout').addEventListener('click', function () {
            showScreen('screen-landing');
        });

        // Home/away toggle
        document.getElementById('tournament-home-away').addEventListener('change', function () {
            document.getElementById('home-away-label').textContent = this.checked ? 'Ativado' : 'Desativado';
        });

        // Save setup
        document.getElementById('btn-save-setup').addEventListener('click', function () {
            var t = Data.getTournament();
            t.name = document.getElementById('tournament-name').value.trim();
            t.teamCount = parseInt(document.getElementById('tournament-teams').value, 10);
            t.prize = document.getElementById('tournament-prize').value.trim();
            t.homeAway = document.getElementById('tournament-home-away').checked;
            Data.saveTournament(t);
            document.getElementById('teams-count-badge').textContent = t.teams.length + ' / ' + t.teamCount;
            toast('Configuração salva!');
        });

        // Room code
        document.getElementById('btn-new-code').addEventListener('click', function () {
            var t = Data.getTournament();
            t.roomCode = Data.generateRoomCode();
            Data.saveTournament(t);
            document.getElementById('display-room-code').textContent = t.roomCode;
            toast('Novo código gerado: ' + t.roomCode);
        });

        document.getElementById('btn-copy-code').addEventListener('click', function () {
            var code = document.getElementById('display-room-code').textContent;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(function () {
                    toast('Código copiado!');
                });
            } else {
                toast('Código: ' + code);
            }
        });

        // Add team
        document.getElementById('btn-add-team').addEventListener('click', function () {
            var nameInput = document.getElementById('new-team-name');
            var flagSelect = document.getElementById('new-team-flag');
            var name = nameInput.value.trim();
            if (!name) { toast('Digite o nome do time'); return; }

            var t = Data.getTournament();
            if (t.teams.length >= t.teamCount) {
                toast('Limite de ' + t.teamCount + ' times atingido!');
                return;
            }

            t.teams.push({
                id: Data.generateId(),
                name: name,
                flag: flagSelect.value,
                players: []
            });
            Data.saveTournament(t);
            nameInput.value = '';
            refreshTeamsList();
            document.getElementById('teams-count-badge').textContent = t.teams.length + ' / ' + t.teamCount;
            toast('Time adicionado!');
        });

        // Bracket actions
        document.getElementById('btn-shuffle').addEventListener('click', function () {
            var t = Data.getTournament();
            t.teams = Engine.shuffleArray(t.teams);
            Data.saveTournament(t);
            refreshTeamsList();
            toast('Times embaralhados!');
        });

        document.getElementById('btn-generate-bracket').addEventListener('click', function () {
            var t = Data.getTournament();
            if (t.teams.length < 2) {
                toast('Cadastre pelo menos 2 times!');
                return;
            }
            if (t.teams.length !== t.teamCount) {
                toast('Cadastre exatamente ' + t.teamCount + ' times! (Atual: ' + t.teams.length + ')');
                return;
            }
            t.bracket = Engine.generateBracket(t.teams);
            t.status = 'active';
            Data.saveTournament(t);
            renderBracketView(document.getElementById('bracket-container'), t, true);
            renderMatchesList(t);
            toast('Chaveamento gerado!');
        });

        // Bracket view toggle
        document.getElementById('btn-view-tree').addEventListener('click', function () {
            state.bracketView = 'tree';
            document.getElementById('btn-view-tree').classList.add('active');
            document.getElementById('btn-view-list').classList.remove('active');
            var t = Data.getTournament();
            renderBracketView(document.getElementById('bracket-container'), t, true);
        });

        document.getElementById('btn-view-list').addEventListener('click', function () {
            state.bracketView = 'list';
            document.getElementById('btn-view-list').classList.add('active');
            document.getElementById('btn-view-tree').classList.remove('active');
            var t = Data.getTournament();
            renderBracketView(document.getElementById('bracket-container'), t, true);
        });

        // Backup
        document.getElementById('btn-backup').addEventListener('click', function () {
            var json = Data.exportBackup();
            var blob = new Blob([json], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'copa_psyzon_backup_' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
            URL.revokeObjectURL(url);
            toast('Backup baixado!');
        });

        // Restore
        document.getElementById('btn-restore').addEventListener('click', function () {
            document.getElementById('input-restore').click();
        });

        document.getElementById('input-restore').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                var success = Data.importBackup(ev.target.result);
                if (success) {
                    toast('Backup restaurado com sucesso!');
                    refreshOrganizerPanel();
                } else {
                    toast('Erro ao restaurar backup!');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // End tournament
        document.getElementById('btn-end-tournament').addEventListener('click', function () {
            var t = Data.getTournament();
            if (!t.bracket) {
                toast('Nenhum torneio ativo para encerrar.');
                return;
            }

            var champion = Engine.getChampion(t.bracket, t.teams);
            t.winner = champion ? champion.name : 'N/A';
            t.winnerFlag = champion ? champion.flag : '';
            t.finishedAt = new Date().toISOString();

            // Update stats
            if (t.bracket) {
                // Champion stats
                if (champion) {
                    Data.updatePlayerStats(champion.name, { trophies: 1 });
                }

                // Finalists
                var finalists = Engine.getTeamsAtStage(t.bracket, 'final');
                finalists.forEach(function (tid) {
                    var team = t.teams.find(function (tt) { return tt.id === tid; });
                    if (team) Data.updatePlayerStats(team.name, { finals: 1 });
                });

                // Semifinalists
                var semis = Engine.getTeamsAtStage(t.bracket, 'semi');
                semis.forEach(function (tid) {
                    var team = t.teams.find(function (tt) { return tt.id === tid; });
                    if (team) Data.updatePlayerStats(team.name, { semis: 1 });
                });

                // Goals
                var tournamentStats = Engine.getTournamentStats(t.bracket, t.homeAway);
                Object.keys(tournamentStats).forEach(function (tid) {
                    var ts = tournamentStats[tid];
                    Data.updatePlayerStats(ts.name, {
                        goalsScored: ts.goalsScored,
                        goalsConceded: ts.goalsConceded
                    });
                });
            }

            Data.addToHistory(t);
            Data.resetTournament();
            refreshOrganizerPanel();
            toast('Torneio encerrado e salvo no histórico!');
        });
    }

    /* ------------------------------------------------------------------
       TEAMS LIST
    ------------------------------------------------------------------ */
    function refreshTeamsList() {
        var t = Data.getTournament();
        var container = document.getElementById('teams-list');

        if (t.teams.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum time cadastrado ainda.</p>';
            return;
        }

        container.innerHTML = t.teams.map(function (team) {
            return '<div class="team-card" data-team-id="' + team.id + '">' +
                '<span class="team-flag">' + team.flag + '</span>' +
                '<span class="team-name">' + escapeHtml(team.name) + '</span>' +
                '<span class="team-players-count">' + team.players.length + ' jogador(es)</span>' +
                '<div class="team-actions">' +
                '<button class="btn btn-sm btn-secondary btn-team-players" data-team-id="' + team.id + '">&#128101; Jogadores</button>' +
                '<button class="btn btn-sm btn-danger btn-team-remove" data-team-id="' + team.id + '">&#128465;</button>' +
                '</div>' +
                '</div>';
        }).join('');

        // Event: remove team
        container.querySelectorAll('.btn-team-remove').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = btn.getAttribute('data-team-id');
                t.teams = t.teams.filter(function (tt) { return tt.id !== id; });
                Data.saveTournament(t);
                refreshTeamsList();
                document.getElementById('teams-count-badge').textContent = t.teams.length + ' / ' + t.teamCount;
                toast('Time removido!');
            });
        });

        // Event: manage players
        container.querySelectorAll('.btn-team-players').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = btn.getAttribute('data-team-id');
                openPlayersModal(id);
            });
        });
    }

    /* ------------------------------------------------------------------
       PLAYERS MODAL
    ------------------------------------------------------------------ */
    function openPlayersModal(teamId) {
        state.currentTeamId = teamId;
        var t = Data.getTournament();
        var team = t.teams.find(function (tt) { return tt.id === teamId; });
        if (!team) return;

        document.getElementById('modal-players-title').textContent = 'Jogadores - ' + team.name;
        document.getElementById('modal-players').hidden = false;
        refreshPlayersList(team);
    }

    function refreshPlayersList(team) {
        var container = document.getElementById('modal-players-list');
        if (team.players.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum jogador neste time.</p>';
            return;
        }

        container.innerHTML = team.players.map(function (p, idx) {
            return '<div class="player-item">' +
                '<span class="player-item-name">' + escapeHtml(p.name) + '</span>' +
                '<span class="player-item-nick">(' + escapeHtml(p.nick) + ')</span>' +
                '<button class="btn btn-sm btn-danger btn-remove-player" data-idx="' + idx + '">&#128465;</button>' +
                '</div>';
        }).join('');

        container.querySelectorAll('.btn-remove-player').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.getAttribute('data-idx'), 10);
                var t = Data.getTournament();
                var tm = t.teams.find(function (tt) { return tt.id === state.currentTeamId; });
                if (tm) {
                    tm.players.splice(idx, 1);
                    Data.saveTournament(t);
                    refreshPlayersList(tm);
                    refreshTeamsList();
                }
            });
        });
    }

    function setupPlayersModal() {
        document.getElementById('btn-close-players').addEventListener('click', function () {
            document.getElementById('modal-players').hidden = true;
        });

        document.getElementById('btn-add-player').addEventListener('click', function () {
            var name = document.getElementById('new-player-name').value.trim();
            var nick = document.getElementById('new-player-nick').value.trim();
            if (!name) { toast('Digite o nome do jogador'); return; }

            var t = Data.getTournament();
            var team = t.teams.find(function (tt) { return tt.id === state.currentTeamId; });
            if (!team) return;

            team.players.push({ name: name, nick: nick || name });
            Data.saveTournament(t);
            document.getElementById('new-player-name').value = '';
            document.getElementById('new-player-nick').value = '';
            refreshPlayersList(team);
            refreshTeamsList();
            toast('Jogador adicionado!');
        });
    }

    /* ------------------------------------------------------------------
       BRACKET VIEW
    ------------------------------------------------------------------ */
    function renderBracketView(container, tournament, interactive) {
        if (!tournament.bracket) {
            container.innerHTML = '<p class="empty-state">Configure o torneio e gere o chaveamento para começar.</p>';
            return;
        }

        if (state.bracketView === 'tree') {
            renderBracketTree(container, tournament, interactive);
        } else {
            renderBracketList(container, tournament, interactive);
        }
    }

    function renderBracketTree(container, tournament, interactive) {
        var bracket = tournament.bracket;
        var html = '<div class="bracket-tree">';

        bracket.rounds.forEach(function (round, rIdx) {
            var roundName = Engine.getRoundName(rIdx, bracket.totalRounds);
            html += '<div class="bracket-round">';
            html += '<div class="round-title">' + roundName + '</div>';

            round.forEach(function (match) {
                var clickable = interactive && match.team1 && match.team2 && !match.played ? ' clickable' : '';
                var played = match.played ? ' played' : '';

                html += '<div class="bracket-match' + clickable + played + '" data-match-id="' + match.id + '">';
                html += renderMatchTeam(match.team1, match.scoreHome1, match.scoreAway1, match.winner, match, tournament.homeAway);
                html += renderMatchTeam(match.team2, match.scoreHome2, match.scoreAway2, match.winner, match, tournament.homeAway);
                html += '</div>';
            });

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;

        if (interactive) {
            container.querySelectorAll('.bracket-match.clickable').forEach(function (el) {
                el.addEventListener('click', function () {
                    openResultModal(el.getAttribute('data-match-id'));
                });
            });
        }
    }

    function renderMatchTeam(team, scoreHome, scoreAway, winnerId, match, homeAway) {
        if (!team) {
            return '<div class="match-team tbd"><span class="match-team-name">A definir</span></div>';
        }
        var isWinner = match.played && winnerId === team.id;
        var cls = isWinner ? ' winner' : '';

        var scoreText = '';
        if (match.played) {
            scoreText = String(scoreHome || 0);
            if (homeAway && scoreAway !== null) {
                scoreText += ' (' + (scoreAway || 0) + ')';
            }
        }

        return '<div class="match-team' + cls + '">' +
            '<span class="team-flag">' + team.flag + '</span>' +
            '<span class="match-team-name">' + escapeHtml(team.name) + '</span>' +
            (scoreText ? '<span class="match-team-score">' + scoreText + '</span>' : '') +
            '</div>';
    }

    function renderBracketList(container, tournament, interactive) {
        var bracket = tournament.bracket;
        var html = '<div class="bracket-list">';

        bracket.rounds.forEach(function (round, rIdx) {
            var roundName = Engine.getRoundName(rIdx, bracket.totalRounds);
            html += '<div class="bracket-list-round">';
            html += '<div class="round-title">' + roundName + '</div>';
            html += '<div class="bracket-list-matches">';

            round.forEach(function (match) {
                var clickable = interactive && match.team1 && match.team2 && !match.played ? ' clickable' : '';
                var played = match.played ? ' played' : '';

                var t1Name = match.team1 ? (match.team1.flag + ' ' + escapeHtml(match.team1.name)) : 'A definir';
                var t2Name = match.team2 ? (match.team2.flag + ' ' + escapeHtml(match.team2.name)) : 'A definir';
                var score = '';

                if (match.played) {
                    score = (match.scoreHome1 || 0) + ' x ' + (match.scoreHome2 || 0);
                } else {
                    score = 'VS';
                }

                html += '<div class="list-match' + clickable + played + '" data-match-id="' + match.id + '">' +
                    '<span class="list-match-team">' + t1Name + '</span>' +
                    (match.played ?
                        '<span class="list-match-score">' + score + '</span>' :
                        '<span class="list-match-vs">' + score + '</span>') +
                    '<span class="list-match-team right">' + t2Name + '</span>' +
                    '</div>';
            });

            html += '</div></div>';
        });

        html += '</div>';
        container.innerHTML = html;

        if (interactive) {
            container.querySelectorAll('.list-match.clickable').forEach(function (el) {
                el.addEventListener('click', function () {
                    openResultModal(el.getAttribute('data-match-id'));
                });
            });
        }
    }

    /* ------------------------------------------------------------------
       MATCHES LIST (Results Tab)
    ------------------------------------------------------------------ */
    function renderMatchesList(tournament) {
        var container = document.getElementById('matches-list');
        if (!tournament.bracket) {
            container.innerHTML = '<p class="empty-state">Gere o chaveamento primeiro para ver as partidas.</p>';
            return;
        }

        var html = '';
        tournament.bracket.rounds.forEach(function (round, rIdx) {
            var roundName = Engine.getRoundName(rIdx, tournament.bracket.totalRounds);
            round.forEach(function (match) {
                if (!match.team1 || !match.team2) return;
                var completed = match.played ? ' completed' : '';
                var t1 = match.team1.flag + ' ' + escapeHtml(match.team1.name);
                var t2 = match.team2.flag + ' ' + escapeHtml(match.team2.name);
                var score = match.played ? ((match.scoreHome1 || 0) + ' x ' + (match.scoreHome2 || 0)) : 'Pendente';

                html += '<div class="match-result-card' + completed + '" data-match-id="' + match.id + '">' +
                    '<span class="match-round-label">' + roundName + '</span>' +
                    '<span class="match-result-teams">' + t1 + ' vs ' + t2 + '</span>' +
                    '<span class="match-result-score">' + score + '</span>' +
                    '</div>';
            });
        });

        container.innerHTML = html || '<p class="empty-state">Nenhuma partida disponível.</p>';

        container.querySelectorAll('.match-result-card').forEach(function (el) {
            el.addEventListener('click', function () {
                openResultModal(el.getAttribute('data-match-id'));
            });
        });
    }

    /* ------------------------------------------------------------------
       RESULT MODAL
    ------------------------------------------------------------------ */
    function openResultModal(matchId) {
        var t = Data.getTournament();
        if (!t.bracket) return;

        var match = null;
        t.bracket.rounds.forEach(function (round) {
            round.forEach(function (m) {
                if (m.id === matchId) match = m;
            });
        });

        if (!match || !match.team1 || !match.team2) return;
        state.currentMatchId = matchId;

        document.getElementById('result-team1').textContent = match.team1.flag + ' ' + match.team1.name;
        document.getElementById('result-team2').textContent = match.team2.flag + ' ' + match.team2.name;

        document.getElementById('score-home-1').value = match.scoreHome1 || 0;
        document.getElementById('score-home-2').value = match.scoreHome2 || 0;

        // Away section
        var awaySection = document.getElementById('away-section');
        if (t.homeAway) {
            awaySection.hidden = false;
            document.getElementById('score-away-1').value = match.scoreAway1 || 0;
            document.getElementById('score-away-2').value = match.scoreAway2 || 0;
        } else {
            awaySection.hidden = true;
        }

        // Penalties
        var hasPenalties = match.penalties1 !== null && match.penalties1 !== undefined;
        document.getElementById('toggle-penalties').checked = hasPenalties;
        document.getElementById('penalty-section').hidden = !hasPenalties;
        document.getElementById('score-pen-1').value = match.penalties1 || 0;
        document.getElementById('score-pen-2').value = match.penalties2 || 0;

        document.getElementById('modal-result').hidden = false;
    }

    function setupResultModal() {
        document.getElementById('btn-close-result').addEventListener('click', function () {
            document.getElementById('modal-result').hidden = true;
        });

        document.getElementById('toggle-penalties').addEventListener('change', function () {
            document.getElementById('penalty-section').hidden = !this.checked;
        });

        document.getElementById('btn-save-result').addEventListener('click', function () {
            var t = Data.getTournament();
            if (!state.currentMatchId || !t.bracket) return;

            var penaltiesOn = document.getElementById('toggle-penalties').checked;
            var scores = {
                scoreHome1: parseInt(document.getElementById('score-home-1').value, 10) || 0,
                scoreHome2: parseInt(document.getElementById('score-home-2').value, 10) || 0
            };

            if (t.homeAway) {
                scores.scoreAway1 = parseInt(document.getElementById('score-away-1').value, 10) || 0;
                scores.scoreAway2 = parseInt(document.getElementById('score-away-2').value, 10) || 0;
            }

            if (penaltiesOn) {
                scores.penalties1 = parseInt(document.getElementById('score-pen-1').value, 10) || 0;
                scores.penalties2 = parseInt(document.getElementById('score-pen-2').value, 10) || 0;
            }

            Engine.registerResult(t.bracket, state.currentMatchId, scores, t.homeAway);
            Data.saveTournament(t);

            document.getElementById('modal-result').hidden = true;
            renderBracketView(document.getElementById('bracket-container'), t, true);
            renderMatchesList(t);
            toast('Resultado salvo!');

            // Check if tournament is complete
            if (Engine.isTournamentComplete(t.bracket)) {
                var champion = Engine.getChampion(t.bracket, t.teams);
                if (champion) {
                    toast('🏆 Campeão: ' + champion.flag + ' ' + champion.name + '!');
                }
            }
        });
    }

    /* ------------------------------------------------------------------
       STATS TABLE
    ------------------------------------------------------------------ */
    function renderStatsTable(tbody) {
        var stats = Data.getStats();
        var entries = Object.keys(stats).map(function (key) { return stats[key]; });

        entries.sort(function (a, b) {
            if (b.trophies !== a.trophies) return b.trophies - a.trophies;
            if (b.finals !== a.finals) return b.finals - a.finals;
            var sgA = a.goalsScored - a.goalsConceded;
            var sgB = b.goalsScored - b.goalsConceded;
            return sgB - sgA;
        });

        if (entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma estatística disponível.</td></tr>';
            return;
        }

        tbody.innerHTML = entries.map(function (s, idx) {
            var sg = s.goalsScored - s.goalsConceded;
            return '<tr>' +
                '<td>' + (idx + 1) + '</td>' +
                '<td><strong>' + escapeHtml(s.nick) + '</strong></td>' +
                '<td>' + s.trophies + '</td>' +
                '<td>' + s.finals + '</td>' +
                '<td>' + s.semis + '</td>' +
                '<td>' + s.goalsScored + '</td>' +
                '<td>' + s.goalsConceded + '</td>' +
                '<td>' + (sg >= 0 ? '+' : '') + sg + '</td>' +
                '</tr>';
        }).join('');
    }

    /* ------------------------------------------------------------------
       HISTORY
    ------------------------------------------------------------------ */
    function renderHistory(container) {
        var history = Data.getHistory();
        if (history.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum torneio encerrado ainda.</p>';
            return;
        }

        container.innerHTML = history.map(function (h) {
            var date = h.finishedAt ? new Date(h.finishedAt).toLocaleDateString('pt-BR') : '';
            return '<div class="history-card">' +
                '<span class="history-trophy">&#127942;</span>' +
                '<div class="history-info">' +
                '<div class="history-name">' + escapeHtml(h.name || 'Torneio') + '</div>' +
                '<div class="history-winner">' + (h.winnerFlag || '') + ' Campeão: ' + escapeHtml(h.winner || 'N/A') + '</div>' +
                '<div class="history-date">' + h.teamCount + ' times | ' + (h.prize || 'Sem premiação') + ' | ' + date + '</div>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    /* ------------------------------------------------------------------
       VISITOR VIEW
    ------------------------------------------------------------------ */
    function refreshVisitorView() {
        var t = Data.getTournament();
        renderBracketView(document.getElementById('visitor-bracket-container'), t, false);
        renderStatsTable(document.getElementById('visitor-stats-body'));
        renderHistory(document.getElementById('visitor-history-list'));
    }

    function setupVisitor() {
        document.getElementById('btn-visitor-back').addEventListener('click', function () {
            showScreen('screen-landing');
        });
    }

    /* ------------------------------------------------------------------
       Utilidades HTML
    ------------------------------------------------------------------ */
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    /* ------------------------------------------------------------------
       Fechar modais ao clicar fora
    ------------------------------------------------------------------ */
    function setupModalBackdropClose() {
        document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) {
                    overlay.hidden = true;
                }
            });
        });
    }

    /* ------------------------------------------------------------------
       INICIALIZACAO
    ------------------------------------------------------------------ */
    function init() {
        setupTabs();
        setupLanding();
        setupRoomCode();
        setupRegistration();
        setupOrganizer();
        setupPlayersModal();
        setupResultModal();
        setupVisitor();
        setupParticipantView();
        setupCPFMasks();
        setupPhoneMask();
        setupModalBackdropClose();
    }

    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
