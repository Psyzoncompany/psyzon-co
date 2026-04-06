'use strict';

// ======================================================================
// PSYZON STREAM — Backend de Sessões Compartilhadas (Watch Party)
// Servidor Node.js com Express + Socket.IO para sincronização em tempo real
// ======================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });

// ======================================================================
// 1. CONFIGURAÇÃO E CONSTANTES
// ======================================================================

const PORT = process.env.PORT || 3000;

const MAX_ROOMS = 100;
const MAX_PARTICIPANTS = 20;
const MAX_MESSAGES = 50;
const MAX_USERNAME_LENGTH = 30;
const MAX_CHAT_LENGTH = 500;
const CHAT_RATE_LIMIT_MS = 1000;
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// ======================================================================
// 2. ARMAZENAMENTO EM MEMÓRIA
// ======================================================================

/** @type {Map<string, Object>} Mapa de salas ativas */
const rooms = new Map();

/** @type {Map<string, number>} Último timestamp de mensagem por socket.id (rate limit) */
const lastMessageTime = new Map();

// ======================================================================
// 3. FUNÇÕES UTILITÁRIAS
// ======================================================================

/** Gera um código de sala alfanumérico de 6 caracteres (maiúsculas) */
function generateRoomId() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return code;
}

/** Gera um código de sala único que não colide com salas existentes */
function generateUniqueRoomId() {
  let roomId;
  let attempts = 0;
  do {
    roomId = generateRoomId();
    attempts++;
    if (attempts > 1000) {
      throw new Error('Não foi possível gerar um código de sala único');
    }
  } while (rooms.has(roomId));
  return roomId;
}

/** Sanitiza texto para prevenir injeção de HTML */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Valida formato de código de sala (6 caracteres alfanuméricos maiúsculos) */
function isValidRoomCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
}

/** Trunca e sanitiza nome de usuário */
function sanitizeUserName(name) {
  if (typeof name !== 'string' || name.trim().length === 0) return 'Anônimo';
  return escapeHtml(name.trim().substring(0, MAX_USERNAME_LENGTH));
}

/** Adiciona mensagem de sistema ao chat da sala */
function addSystemMessage(room, text) {
  const message = {
    id: Date.now() + '-system-' + Math.random().toString(36).substring(2, 7),
    type: 'system',
    text,
    timestamp: Date.now()
  };
  room.messages.push(message);
  if (room.messages.length > MAX_MESSAGES) {
    room.messages.shift();
  }
  return message;
}

/** Remove uma sala e limpa recursos */
function destroyRoom(roomId) {
  rooms.delete(roomId);
  console.log(`[Sala] Sala ${roomId} destruída — Total de salas: ${rooms.size}`);
}

// ======================================================================
// 4. SERVIR ARQUIVOS ESTÁTICOS
// ======================================================================

app.use(express.static(path.join(__dirname, '.')));

// ======================================================================
// 5. GERENCIAMENTO DE CONEXÕES SOCKET.IO
// ======================================================================

io.on('connection', (socket) => {

  // ------------------------------------------------------------------
  // 5.1. CICLO DE VIDA DA SALA
  // ------------------------------------------------------------------

  /** Criar sala */
  socket.on('room:create', ({ userName } = {}) => {
    if (rooms.size >= MAX_ROOMS) {
      socket.emit('room:error', { message: 'Limite máximo de salas atingido' });
      return;
    }

    const safeName = sanitizeUserName(userName);
    let roomId;
    try {
      roomId = generateUniqueRoomId();
    } catch (err) {
      socket.emit('room:error', { message: err.message });
      return;
    }

    const room = {
      id: roomId,
      hostId: socket.id,
      hostName: safeName,
      mediaSource: { type: null, url: null, name: null },
      playbackState: {
        playing: false,
        currentTime: 0,
        lastUpdate: Date.now(),
        speed: 1
      },
      participants: new Map(),
      messages: [],
      mode: 'host',
      createdAt: Date.now()
    };

    room.participants.set(socket.id, {
      id: socket.id,
      userName: safeName,
      isHost: true,
      joinedAt: Date.now()
    });

    rooms.set(roomId, room);
    socket.join(roomId);

    const systemMsg = addSystemMessage(room, `${safeName} criou a sala`);

    socket.emit('room:created', {
      roomId,
      hostId: socket.id,
      hostName: safeName,
      mode: room.mode,
      participants: Array.from(room.participants.values()),
      messages: room.messages,
      playbackState: room.playbackState,
      mediaSource: room.mediaSource
    });

    console.log(`[Sala] Sala ${roomId} criada por ${safeName} (${socket.id}) — Total de salas: ${rooms.size}`);
  });

  /** Entrar em sala existente */
  socket.on('room:join', ({ roomId, userName } = {}) => {
    // Normalize room code to uppercase before validation
    const normalizedRoomId = typeof roomId === 'string' ? roomId.toUpperCase() : '';
    if (!normalizedRoomId || !isValidRoomCode(normalizedRoomId)) {
      socket.emit('room:error', { message: 'Código de sala inválido' });
      return;
    }
    roomId = normalizedRoomId;

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room:error', { message: 'Sala não encontrada' });
      return;
    }

    if (room.participants.size >= MAX_PARTICIPANTS) {
      socket.emit('room:error', { message: 'Sala lotada (máximo de participantes atingido)' });
      return;
    }

    const safeName = sanitizeUserName(userName);

    room.participants.set(socket.id, {
      id: socket.id,
      userName: safeName,
      isHost: false,
      joinedAt: Date.now()
    });

    socket.join(roomId);

    const systemMsg = addSystemMessage(room, `${safeName} entrou na sala`);

    // Send current room state to the new participant
    socket.emit('room:joined', {
      roomId,
      hostId: room.hostId,
      hostName: room.hostName,
      mode: room.mode,
      participants: Array.from(room.participants.values()),
      messages: room.messages,
      playbackState: room.playbackState,
      mediaSource: room.mediaSource
    });

    // Notify existing participants
    socket.to(roomId).emit('room:participant-joined', {
      participant: room.participants.get(socket.id),
      participants: Array.from(room.participants.values()),
      message: systemMsg
    });

    console.log(`[Sala] ${safeName} (${socket.id}) entrou na sala ${roomId} — Participantes: ${room.participants.size}`);
  });

  /** Sair da sala */
  socket.on('room:leave', ({ roomId } = {}) => {
    handleLeaveRoom(socket, roomId);
  });

  /** Fechar sala (somente host) */
  socket.on('room:close', ({ roomId } = {}) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (socket.id !== room.hostId) {
      socket.emit('room:error', { message: 'Apenas o host pode fechar a sala' });
      return;
    }

    io.to(roomId).emit('room:closed', {
      roomId,
      message: 'A sala foi encerrada pelo host'
    });

    // Remove all participants from the Socket.IO room
    for (const [participantId] of room.participants) {
      const participantSocket = io.sockets.sockets.get(participantId);
      if (participantSocket) {
        participantSocket.leave(roomId);
      }
    }

    destroyRoom(roomId);
  });

  // ------------------------------------------------------------------
  // 5.2. CHAT
  // ------------------------------------------------------------------

  /** Enviar mensagem no chat */
  socket.on('chat:message', ({ roomId, text } = {}) => {
    if (!roomId || !text) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    // Rate limit: 1 message per second per user
    const now = Date.now();
    const lastTime = lastMessageTime.get(socket.id) || 0;
    if (now - lastTime < CHAT_RATE_LIMIT_MS) {
      socket.emit('chat:rate-limited', { message: 'Aguarde antes de enviar outra mensagem' });
      return;
    }
    lastMessageTime.set(socket.id, now);

    const sanitizedText = escapeHtml(
      typeof text === 'string' ? text.substring(0, MAX_CHAT_LENGTH) : ''
    );
    if (sanitizedText.length === 0) return;

    const message = {
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      type: 'user',
      userId: socket.id,
      userName: participant.userName,
      text: sanitizedText,
      timestamp: Date.now()
    };

    room.messages.push(message);
    if (room.messages.length > MAX_MESSAGES) {
      room.messages.shift();
    }

    io.to(roomId).emit('chat:message', message);
  });

  /** Indicador de digitação */
  socket.on('chat:typing', ({ roomId } = {}) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    socket.to(roomId).emit('chat:typing', {
      userId: socket.id,
      userName: participant.userName
    });
  });

  // ------------------------------------------------------------------
  // 5.3. SINCRONIZAÇÃO DO PLAYER
  // ------------------------------------------------------------------

  /** Play */
  socket.on('player:play', ({ roomId, currentTime } = {}) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    // In host mode, only the host can control playback
    if (room.mode === 'host' && socket.id !== room.hostId) {
      socket.emit('room:error', { message: 'Apenas o host pode controlar a reprodução' });
      return;
    }

    room.playbackState.playing = true;
    room.playbackState.currentTime = currentTime || 0;
    room.playbackState.lastUpdate = Date.now();

    const systemMsg = addSystemMessage(room, `${participant.userName} deu play`);

    socket.to(roomId).emit('player:play', {
      currentTime: room.playbackState.currentTime,
      timestamp: room.playbackState.lastUpdate,
      userName: participant.userName,
      message: systemMsg
    });
  });

  /** Pause */
  socket.on('player:pause', ({ roomId, currentTime } = {}) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    if (room.mode === 'host' && socket.id !== room.hostId) {
      socket.emit('room:error', { message: 'Apenas o host pode controlar a reprodução' });
      return;
    }

    room.playbackState.playing = false;
    room.playbackState.currentTime = currentTime || 0;
    room.playbackState.lastUpdate = Date.now();

    const systemMsg = addSystemMessage(room, `${participant.userName} pausou`);

    socket.to(roomId).emit('player:pause', {
      currentTime: room.playbackState.currentTime,
      timestamp: room.playbackState.lastUpdate,
      userName: participant.userName,
      message: systemMsg
    });
  });

  /** Seek */
  socket.on('player:seek', ({ roomId, currentTime } = {}) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    if (room.mode === 'host' && socket.id !== room.hostId) {
      socket.emit('room:error', { message: 'Apenas o host pode controlar a reprodução' });
      return;
    }

    room.playbackState.currentTime = currentTime || 0;
    room.playbackState.lastUpdate = Date.now();

    socket.to(roomId).emit('player:seek', {
      currentTime: room.playbackState.currentTime,
      timestamp: room.playbackState.lastUpdate,
      userName: participant.userName
    });
  });

  /** Mudança de mídia */
  socket.on('player:media-change', ({ roomId, mediaSource } = {}) => {
    if (!roomId || !mediaSource) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    if (room.mode === 'host' && socket.id !== room.hostId) {
      socket.emit('room:error', { message: 'Apenas o host pode alterar a mídia' });
      return;
    }

    const validTypes = ['file', 'link', 'youtube'];
    const type = validTypes.includes(mediaSource.type) ? mediaSource.type : 'link';

    // Client sends 'title', stored as 'name' to match room mediaSource schema
    room.mediaSource = {
      type,
      url: typeof mediaSource.url === 'string' ? mediaSource.url : null,
      name: typeof mediaSource.title === 'string'
        ? escapeHtml(mediaSource.title.substring(0, 200))
        : null
    };

    // Reset playback state on media change
    room.playbackState = {
      playing: false,
      currentTime: 0,
      lastUpdate: Date.now(),
      speed: 1
    };

    const systemMsg = addSystemMessage(room, `${participant.userName} alterou a mídia`);

    socket.to(roomId).emit('player:media-change', {
      mediaSource: room.mediaSource,
      playbackState: room.playbackState,
      userName: participant.userName,
      message: systemMsg
    });
  });

  /** Solicitação de sincronização */
  socket.on('player:sync-request', ({ roomId } = {}) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    socket.emit('player:sync-response', {
      playbackState: room.playbackState,
      mediaSource: room.mediaSource,
      timestamp: Date.now()
    });
  });

  /** Status do player de um participante */
  socket.on('player:status', ({ roomId, status } = {}) => {
    if (!roomId || !status) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    socket.to(roomId).emit('player:status', {
      userId: socket.id,
      userName: participant.userName,
      status
    });
  });

  // ------------------------------------------------------------------
  // 5.4. MODO DA SALA
  // ------------------------------------------------------------------

  /** Alternar modo (host / collaborative) — somente host */
  socket.on('room:set-mode', ({ roomId, mode } = {}) => {
    if (!roomId || !mode) return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (socket.id !== room.hostId) {
      socket.emit('room:error', { message: 'Apenas o host pode alterar o modo da sala' });
      return;
    }

    const validModes = ['host', 'collaborative'];
    if (!validModes.includes(mode)) {
      socket.emit('room:error', { message: 'Modo inválido' });
      return;
    }

    room.mode = mode;

    const modeLabel = mode === 'host' ? 'Host Controla' : 'Colaborativo';
    const systemMsg = addSystemMessage(room, `Modo alterado para: ${modeLabel}`);

    io.to(roomId).emit('room:mode-changed', {
      mode,
      message: systemMsg
    });

    console.log(`[Sala] Modo da sala ${roomId} alterado para "${mode}" por ${room.hostName}`);
  });

  // ------------------------------------------------------------------
  // 5.5. DESCONEXÃO
  // ------------------------------------------------------------------

  socket.on('disconnect', () => {
    lastMessageTime.delete(socket.id);

    // Clean up participant from all rooms they were in
    for (const [roomId, room] of rooms) {
      if (room.participants.has(socket.id)) {
        handleLeaveRoom(socket, roomId);
      }
    }
  });

  // ------------------------------------------------------------------
  // 5.6. FUNÇÃO AUXILIAR — SAIR DA SALA
  // ------------------------------------------------------------------

  /**
   * Handles a participant leaving a room: removes them, broadcasts the
   * departure, transfers host if needed, or destroys an empty room.
   */
  function handleLeaveRoom(sock, roomId) {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(sock.id);
    if (!participant) return;

    const userName = participant.userName;
    const wasHost = sock.id === room.hostId;

    room.participants.delete(sock.id);
    sock.leave(roomId);

    // Destroy empty rooms
    if (room.participants.size === 0) {
      destroyRoom(roomId);
      return;
    }

    const systemMsg = addSystemMessage(room, `${userName} saiu da sala`);

    // Transfer host to the next participant if the host left
    if (wasHost) {
      const nextParticipant = room.participants.values().next().value;
      room.hostId = nextParticipant.id;
      room.hostName = nextParticipant.userName;
      nextParticipant.isHost = true;

      const transferMsg = addSystemMessage(room, `${nextParticipant.userName} agora é o host`);

      io.to(roomId).emit('room:host-changed', {
        hostId: room.hostId,
        hostName: room.hostName,
        message: transferMsg
      });

      console.log(`[Sala] Host da sala ${roomId} transferido para ${room.hostName} (${room.hostId})`);
    }

    io.to(roomId).emit('room:participant-left', {
      userId: sock.id,
      userName,
      participants: Array.from(room.participants.values()),
      message: systemMsg
    });

    console.log(`[Sala] ${userName} (${sock.id}) saiu da sala ${roomId} — Participantes: ${room.participants.size}`);
  }
});

// ======================================================================
// 6. INICIAR SERVIDOR
// ======================================================================

server.listen(PORT, () => {
  console.log(`\n🎬 Psyzon Stream — Servidor rodando na porta ${PORT}`);
  console.log(`   Acesse: http://localhost:${PORT}\n`);
});
