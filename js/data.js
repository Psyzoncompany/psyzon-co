/* ==========================================================================
   COPA PSYZON — Gerenciamento de Dados (localStorage)
   ========================================================================== */

/* exported CopaPsyzonData */
/* eslint-disable no-unused-vars */
var CopaPsyzonData = (function () {
    'use strict';

    var KEYS = {
        TOURNAMENT: 'copa_psyzon_tournament',
        PLAYERS_DB: 'copa_psyzon_players',
        HISTORY: 'copa_psyzon_history',
        STATS: 'copa_psyzon_stats'
    };

    /* ------------------------------------------------------------------
       Utilidades
    ------------------------------------------------------------------ */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function generateRoomCode() {
        return String(Math.floor(1000 + Math.random() * 9000));
    }

    function save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            // Storage full or unavailable
        }
    }

    function load(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /* ------------------------------------------------------------------
       Torneio
    ------------------------------------------------------------------ */
    function getDefaultTournament() {
        return {
            id: generateId(),
            name: '',
            teamCount: 8,
            homeAway: false,
            prize: '',
            roomCode: generateRoomCode(),
            status: 'setup', // setup | active | finished
            teams: [],
            bracket: null,
            createdAt: new Date().toISOString(),
            finishedAt: null
        };
    }

    function getTournament() {
        var t = load(KEYS.TOURNAMENT);
        if (!t) {
            t = getDefaultTournament();
            save(KEYS.TOURNAMENT, t);
        }
        return t;
    }

    function saveTournament(tournament) {
        save(KEYS.TOURNAMENT, tournament);
    }

    function resetTournament() {
        var t = getDefaultTournament();
        save(KEYS.TOURNAMENT, t);
        return t;
    }

    /* ------------------------------------------------------------------
       Banco de Jogadores (por CPF)
    ------------------------------------------------------------------ */
    function getPlayersDB() {
        return load(KEYS.PLAYERS_DB) || {};
    }

    function savePlayerToDB(player) {
        if (!player.cpf) return;
        var db = getPlayersDB();
        var cleanCPF = player.cpf.replace(/\D/g, '');
        db[cleanCPF] = {
            name: player.name,
            nick: player.nick,
            cpf: player.cpf,
            flag: player.flag,
            instagram: player.instagram,
            whatsapp: player.whatsapp,
            photo: player.photo || ''
        };
        save(KEYS.PLAYERS_DB, db);
    }

    function findPlayerByCPF(cpf) {
        var db = getPlayersDB();
        var cleanCPF = cpf.replace(/\D/g, '');
        return db[cleanCPF] || null;
    }

    /* ------------------------------------------------------------------
       Historico
    ------------------------------------------------------------------ */
    function getHistory() {
        return load(KEYS.HISTORY) || [];
    }

    function addToHistory(tournament) {
        var history = getHistory();
        history.unshift({
            id: tournament.id,
            name: tournament.name,
            winner: tournament.winner || 'N/A',
            winnerFlag: tournament.winnerFlag || '',
            teamCount: tournament.teamCount,
            prize: tournament.prize,
            finishedAt: new Date().toISOString()
        });
        save(KEYS.HISTORY, history);
    }

    /* ------------------------------------------------------------------
       Estatisticas de Jogadores
    ------------------------------------------------------------------ */
    function getStats() {
        return load(KEYS.STATS) || {};
    }

    function saveStats(stats) {
        save(KEYS.STATS, stats);
    }

    function updatePlayerStats(playerNick, data) {
        var stats = getStats();
        if (!stats[playerNick]) {
            stats[playerNick] = {
                nick: playerNick,
                trophies: 0,
                finals: 0,
                semis: 0,
                goalsScored: 0,
                goalsConceded: 0
            };
        }
        var s = stats[playerNick];
        if (data.trophies) s.trophies += data.trophies;
        if (data.finals) s.finals += data.finals;
        if (data.semis) s.semis += data.semis;
        if (data.goalsScored) s.goalsScored += data.goalsScored;
        if (data.goalsConceded) s.goalsConceded += data.goalsConceded;
        save(KEYS.STATS, stats);
    }

    /* ------------------------------------------------------------------
       Backup e Restauracao
    ------------------------------------------------------------------ */
    function exportBackup() {
        return JSON.stringify({
            version: 1,
            tournament: getTournament(),
            playersDB: getPlayersDB(),
            history: getHistory(),
            stats: getStats(),
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    function importBackup(jsonString) {
        try {
            var data = JSON.parse(jsonString);
            if (!data.version) throw new Error('Formato inválido');
            if (data.tournament) save(KEYS.TOURNAMENT, data.tournament);
            if (data.playersDB) save(KEYS.PLAYERS_DB, data.playersDB);
            if (data.history) save(KEYS.HISTORY, data.history);
            if (data.stats) save(KEYS.STATS, data.stats);
            return true;
        } catch (e) {
            return false;
        }
    }

    /* ------------------------------------------------------------------
       API Publica
    ------------------------------------------------------------------ */
    return {
        generateId: generateId,
        generateRoomCode: generateRoomCode,
        getTournament: getTournament,
        saveTournament: saveTournament,
        resetTournament: resetTournament,
        getPlayersDB: getPlayersDB,
        savePlayerToDB: savePlayerToDB,
        findPlayerByCPF: findPlayerByCPF,
        getHistory: getHistory,
        addToHistory: addToHistory,
        getStats: getStats,
        saveStats: saveStats,
        updatePlayerStats: updatePlayerStats,
        exportBackup: exportBackup,
        importBackup: importBackup
    };
})();
