/* ==========================================================================
   COPA PSYZON — Configuração Firebase
   Auth + Realtime Database + Storage
   ========================================================================== */

/* global firebase */

var FirebaseConfig = (function () {
    'use strict';

    /* ------------------------------------------------------------------
       Configuração do projeto Firebase
       IMPORTANTE: Substitua pelos dados reais do projeto no console Firebase
    ------------------------------------------------------------------ */
    var config = {
        apiKey: "AIzaSyD_PLACEHOLDER_KEY",
        authDomain: "copa-psyzon.firebaseapp.com",
        databaseURL: "https://copa-psyzon-default-rtdb.firebaseio.com",
        projectId: "copa-psyzon",
        storageBucket: "copa-psyzon.appspot.com",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:placeholder"
    };

    var _initialized = false;

    function init() {
        if (_initialized) return;
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(config);
            _initialized = true;
        }
    }

    function getAuth() {
        init();
        return firebase.auth();
    }

    function getDB() {
        init();
        return firebase.database();
    }

    function getStorage() {
        init();
        return firebase.storage();
    }

    /* ------------------------------------------------------------------
       Auth helpers
    ------------------------------------------------------------------ */
    function loginOrganizer(email, password) {
        return getAuth().signInWithEmailAndPassword(email, password);
    }

    function logoutOrganizer() {
        return getAuth().signOut();
    }

    function onAuthChange(callback) {
        return getAuth().onAuthStateChanged(callback);
    }

    function getCurrentUser() {
        return getAuth().currentUser;
    }

    /* ------------------------------------------------------------------
       Database helpers
    ------------------------------------------------------------------ */
    function ref(path) {
        return getDB().ref(path);
    }

    function set(path, data) {
        return getDB().ref(path).set(data);
    }

    function push(path, data) {
        return getDB().ref(path).push(data);
    }

    function get(path) {
        return getDB().ref(path).once('value').then(function (snap) {
            return snap.val();
        });
    }

    function update(path, data) {
        return getDB().ref(path).update(data);
    }

    function remove(path) {
        return getDB().ref(path).remove();
    }

    function listen(path, callback) {
        getDB().ref(path).on('value', function (snap) {
            callback(snap.val());
        });
    }

    function unlisten(path) {
        getDB().ref(path).off();
    }

    /* ------------------------------------------------------------------
       Códigos de acesso
    ------------------------------------------------------------------ */
    function generateAccessCodes(tournamentId, count) {
        var codes = {};
        for (var i = 0; i < count; i++) {
            var code = String(Math.floor(1000 + Math.random() * 9000));
            codes[code] = { used: false, player: null, createdAt: new Date().toISOString() };
        }
        return set('tournaments/' + tournamentId + '/accessCodes', codes).then(function () {
            return Object.keys(codes);
        });
    }

    function validateAccessCode(tournamentId, code) {
        var path = 'tournaments/' + tournamentId + '/accessCodes/' + code;
        return get(path).then(function (data) {
            if (!data) return { valid: false, reason: 'Código não encontrado' };
            if (data.used) return { valid: false, reason: 'Código já utilizado' };
            return { valid: true };
        });
    }

    function markCodeUsed(tournamentId, code, playerName) {
        var path = 'tournaments/' + tournamentId + '/accessCodes/' + code;
        return update(path, { used: true, player: playerName, usedAt: new Date().toISOString() });
    }

    /* ------------------------------------------------------------------
       API Pública
    ------------------------------------------------------------------ */
    return {
        init: init,
        getAuth: getAuth,
        getDB: getDB,
        getStorage: getStorage,
        loginOrganizer: loginOrganizer,
        logoutOrganizer: logoutOrganizer,
        onAuthChange: onAuthChange,
        getCurrentUser: getCurrentUser,
        ref: ref,
        set: set,
        push: push,
        get: get,
        update: update,
        remove: remove,
        listen: listen,
        unlisten: unlisten,
        generateAccessCodes: generateAccessCodes,
        validateAccessCode: validateAccessCode,
        markCodeUsed: markCodeUsed
    };
})();
