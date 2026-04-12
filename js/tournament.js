/* ==========================================================================
   COPA PSYZON — Motor do Torneio
   Geracao de chaveamento, resultados e estatisticas
   ========================================================================== */

/* exported CopaPsyzonTournament */
/* eslint-disable no-unused-vars */
var CopaPsyzonTournament = (function () {
    'use strict';

    /* ------------------------------------------------------------------
       Embaralhar Array (Fisher-Yates)
    ------------------------------------------------------------------ */
    function shuffleArray(arr) {
        var shuffled = arr.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        return shuffled;
    }

    /* ------------------------------------------------------------------
       Gerar Chaveamento
       Recebe array de times e retorna estrutura de bracket
    ------------------------------------------------------------------ */
    function generateBracket(teams) {
        var count = teams.length;
        if (count < 2) return null;

        // Calcular numero de rodadas
        var rounds = Math.ceil(Math.log2(count));
        var bracket = {
            rounds: [],
            totalRounds: rounds
        };

        // Primeira rodada
        var firstRound = [];
        for (var i = 0; i < count; i += 2) {
            firstRound.push({
                id: 'r1_m' + (i / 2),
                round: 0,
                matchIndex: i / 2,
                team1: teams[i] ? { id: teams[i].id, name: teams[i].name, flag: teams[i].flag } : null,
                team2: teams[i + 1] ? { id: teams[i + 1].id, name: teams[i + 1].name, flag: teams[i + 1].flag } : null,
                scoreHome1: null,
                scoreHome2: null,
                scoreAway1: null,
                scoreAway2: null,
                penalties1: null,
                penalties2: null,
                winner: null,
                played: false
            });
        }
        bracket.rounds.push(firstRound);

        // Rodadas seguintes (vazias)
        var prevMatchCount = firstRound.length;
        for (var r = 1; r < rounds; r++) {
            var roundMatches = [];
            var matchCount = Math.ceil(prevMatchCount / 2);
            for (var m = 0; m < matchCount; m++) {
                roundMatches.push({
                    id: 'r' + (r + 1) + '_m' + m,
                    round: r,
                    matchIndex: m,
                    team1: null,
                    team2: null,
                    scoreHome1: null,
                    scoreHome2: null,
                    scoreAway1: null,
                    scoreAway2: null,
                    penalties1: null,
                    penalties2: null,
                    winner: null,
                    played: false
                });
            }
            bracket.rounds.push(roundMatches);
            prevMatchCount = matchCount;
        }

        return bracket;
    }

    /* ------------------------------------------------------------------
       Nomes das Rodadas
    ------------------------------------------------------------------ */
    function getRoundName(roundIndex, totalRounds) {
        var remaining = totalRounds - roundIndex;
        if (remaining === 1) return 'Final';
        if (remaining === 2) return 'Semifinal';
        if (remaining === 3) return 'Quartas de Final';
        if (remaining === 4) return 'Oitavas de Final';
        if (remaining === 5) return '16 Avos';
        return 'Rodada ' + (roundIndex + 1);
    }

    /* ------------------------------------------------------------------
       Calcular Vencedor de uma Partida
    ------------------------------------------------------------------ */
    function calculateWinner(match, homeAway) {
        if (!match.team1 || !match.team2) return null;

        var s1 = (parseInt(match.scoreHome1, 10) || 0);
        var s2 = (parseInt(match.scoreHome2, 10) || 0);

        if (homeAway) {
            s1 += (parseInt(match.scoreAway1, 10) || 0);
            s2 += (parseInt(match.scoreAway2, 10) || 0);
        }

        if (s1 > s2) return match.team1.id;
        if (s2 > s1) return match.team2.id;

        // Empate - verificar penaltis
        var p1 = parseInt(match.penalties1, 10) || 0;
        var p2 = parseInt(match.penalties2, 10) || 0;
        if (p1 > p2) return match.team1.id;
        if (p2 > p1) return match.team2.id;

        return null; // Sem vencedor definido
    }

    /* ------------------------------------------------------------------
       Avancar Vencedor para Proxima Rodada
    ------------------------------------------------------------------ */
    function advanceWinner(bracket, roundIndex, matchIndex, winnerTeam) {
        var nextRound = roundIndex + 1;
        if (nextRound >= bracket.rounds.length) return;

        var nextMatchIndex = Math.floor(matchIndex / 2);
        var nextMatch = bracket.rounds[nextRound][nextMatchIndex];
        if (!nextMatch) return;

        if (matchIndex % 2 === 0) {
            nextMatch.team1 = winnerTeam;
        } else {
            nextMatch.team2 = winnerTeam;
        }
    }

    /* ------------------------------------------------------------------
       Registrar Resultado
    ------------------------------------------------------------------ */
    function registerResult(bracket, matchId, scores, homeAway) {
        for (var r = 0; r < bracket.rounds.length; r++) {
            for (var m = 0; m < bracket.rounds[r].length; m++) {
                var match = bracket.rounds[r][m];
                if (match.id === matchId) {
                    match.scoreHome1 = scores.scoreHome1;
                    match.scoreHome2 = scores.scoreHome2;
                    match.scoreAway1 = scores.scoreAway1 !== undefined ? scores.scoreAway1 : null;
                    match.scoreAway2 = scores.scoreAway2 !== undefined ? scores.scoreAway2 : null;
                    match.penalties1 = scores.penalties1 !== undefined ? scores.penalties1 : null;
                    match.penalties2 = scores.penalties2 !== undefined ? scores.penalties2 : null;
                    match.played = true;

                    var winnerId = calculateWinner(match, homeAway);
                    match.winner = winnerId;

                    if (winnerId) {
                        var winnerTeam = winnerId === match.team1.id ? match.team1 : match.team2;
                        advanceWinner(bracket, r, m, winnerTeam);
                    }

                    return { match: match, roundIndex: r };
                }
            }
        }
        return null;
    }

    /* ------------------------------------------------------------------
       Verificar se o Torneio esta Completo
    ------------------------------------------------------------------ */
    function isTournamentComplete(bracket) {
        if (!bracket || !bracket.rounds.length) return false;
        var finalRound = bracket.rounds[bracket.rounds.length - 1];
        if (!finalRound || !finalRound.length) return false;
        return finalRound[0].played && finalRound[0].winner !== null;
    }

    /* ------------------------------------------------------------------
       Obter Campeao
    ------------------------------------------------------------------ */
    function getChampion(bracket, teams) {
        if (!isTournamentComplete(bracket)) return null;
        var finalMatch = bracket.rounds[bracket.rounds.length - 1][0];
        var winnerId = finalMatch.winner;
        var team = teams.find(function (t) { return t.id === winnerId; });
        return team || null;
    }

    /* ------------------------------------------------------------------
       Obter Estatisticas do Torneio
       Retorna gols por time baseado nos resultados do bracket
    ------------------------------------------------------------------ */
    function getTournamentStats(bracket, homeAway) {
        var teamStats = {};

        if (!bracket) return teamStats;

        bracket.rounds.forEach(function (round) {
            round.forEach(function (match) {
                if (!match.played || !match.team1 || !match.team2) return;

                var t1 = match.team1.id;
                var t2 = match.team2.id;

                if (!teamStats[t1]) {
                    teamStats[t1] = { name: match.team1.name, flag: match.team1.flag, goalsScored: 0, goalsConceded: 0 };
                }
                if (!teamStats[t2]) {
                    teamStats[t2] = { name: match.team2.name, flag: match.team2.flag, goalsScored: 0, goalsConceded: 0 };
                }

                var g1 = (parseInt(match.scoreHome1, 10) || 0);
                var g2 = (parseInt(match.scoreHome2, 10) || 0);

                if (homeAway) {
                    g1 += (parseInt(match.scoreAway1, 10) || 0);
                    g2 += (parseInt(match.scoreAway2, 10) || 0);
                }

                teamStats[t1].goalsScored += g1;
                teamStats[t1].goalsConceded += g2;
                teamStats[t2].goalsScored += g2;
                teamStats[t2].goalsConceded += g1;
            });
        });

        return teamStats;
    }

    /* ------------------------------------------------------------------
       Obter Times que Chegaram a Semi/Final
    ------------------------------------------------------------------ */
    function getTeamsAtStage(bracket, stage) {
        if (!bracket || !bracket.rounds.length) return [];

        var totalRounds = bracket.rounds.length;
        var targetRound;

        if (stage === 'final') {
            targetRound = totalRounds - 1;
        } else if (stage === 'semi') {
            targetRound = totalRounds - 2;
        } else {
            return [];
        }

        if (targetRound < 0 || targetRound >= totalRounds) return [];

        var teams = [];
        bracket.rounds[targetRound].forEach(function (match) {
            if (match.team1) teams.push(match.team1.id);
            if (match.team2) teams.push(match.team2.id);
        });

        return teams;
    }

    /* ------------------------------------------------------------------
       API Publica
    ------------------------------------------------------------------ */
    return {
        shuffleArray: shuffleArray,
        generateBracket: generateBracket,
        getRoundName: getRoundName,
        calculateWinner: calculateWinner,
        registerResult: registerResult,
        isTournamentComplete: isTournamentComplete,
        getChampion: getChampion,
        getTournamentStats: getTournamentStats,
        getTeamsAtStage: getTeamsAtStage
    };
})();
