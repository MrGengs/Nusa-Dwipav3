import { getDatabase, ref, onValue, off, set, update, runTransaction, get, DataSnapshot, type DatabaseReference } from 'firebase/database';
import { app, firebaseConfig } from './firebaseService';

export type RoomStatus = 'waiting' | 'countdown' | 'in-progress' | 'completed';

export type SquadStatus = 'waiting' | 'completed';

export interface SquadContribution {
  items: number;
  quizzes: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
}

export interface RoomPlayer {
  userId: string;
  name: string;
  avatarSrc?: string;
  squadId: string;
  joinedAt: number;
  isHost?: boolean;
  contributions?: SquadContribution;
  readyInLobbyAt?: number;
}

export interface SquadCollectible {
  itemId: string;
  playerId: string;
  playerName: string;
  collectedAt: number;
}

export interface SquadQuizAnswer {
  guardId: string;
  questionId: string;
  playerId: string;
  playerName: string;
  isCorrect: boolean;
  answeredAt: number;
}

export interface RoomSquad {
  id: string;
  name: string;
  capacity: number;
  score: number;
  points?: number; // Squad points (used for real-time scoring)
  status: SquadStatus;
  completedAt?: number;
  durationSeconds?: number;
  collectibles?: number; // Count of collected items
  quizzes?: number; // Count of completed quizzes
  members?: Record<string, RoomPlayer>;
  collectedItems?: Record<string, SquadCollectible>;
  answeredQuestions?: Record<string, SquadQuizAnswer>;
}

export interface LeaderboardEntry {
  squadId: string;
  squadName: string;
  score: number;
  durationSeconds?: number;
  placement: number;
}

export interface RoomCountdownState {
  startedAt: number;
  endsAt: number;
}

export interface GameTargets {
  totalCostumes?: number;
  totalQuestions?: number;
}

export interface Room {
  roomCode: string;
  roomName: string;
  hostId: string;
  hostName: string;
  hostSquadId: string;
  status: RoomStatus;
  createdAt: number;
  countdown?: RoomCountdownState;
  startedAt?: number;
  finishedAt?: number;
  currentElapsedSeconds?: number; // Waktu saat ini dalam detik (diupdate berkala)
  squads: Record<string, RoomSquad>;
  players: Record<string, RoomPlayer>;
  leaderboard?: LeaderboardEntry[];
  targets?: GameTargets;
  lastUpdatedAt?: number;
}

export interface CreateRoomPayload {
  roomName: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  squadNames: [string, string, string];
}

export interface JoinRoomPayload {
  roomCode: string;
  userId: string;
  name: string;
  avatarSrc?: string;
}

export interface RecordCollectiblePayload {
  roomCode: string;
  squadId: string;
  playerId: string;
  playerName: string;
  itemId: string;
  points: number;
  avatarSrc?: string;
}

export interface RecordQuizPayload {
  roomCode: string;
  squadId: string;
  playerId: string;
  playerName: string;
  guardId: string;
  questionId: string;
  points: number;
  isCorrect: boolean;
  avatarSrc?: string;
}

export interface SquadCompletionPayload {
  roomCode: string;
  squadId: string;
  durationSeconds: number;
  completedAt?: number;
}

export interface CollectibleResult {
  accepted: boolean;
  scoreDelta: number;
  reason?: 'duplicate' | 'not-in-room' | 'room-completed' | 'squad-full';
}

export interface QuizResult {
  accepted: boolean;
  scoreDelta: number;
  reason?: 'duplicate' | 'room-completed' | 'not-in-room';
}

const database = getDatabase(app, firebaseConfig.databaseURL);

const ROOM_CAPACITY_PER_SQUAD = 3;

// Recursively remove any undefined values to satisfy RTDB validator
const removeUndefinedDeep = (value: unknown): void => {
  if (!value || typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  Object.keys(obj).forEach((key) => {
    const v = obj[key];
    if (v === undefined) {
      delete obj[key];
      return;
    }
    removeUndefinedDeep(v);
  });
};

// Normalize any readyInLobbyAt fields to either a valid number or null
const normalizeReadyFields = (room: Room): void => {
  Object.values(room.players ?? {}).forEach((player) => {
    if (!player) return;
    if ('readyInLobbyAt' in player) {
      const v = (player as any).readyInLobbyAt;
      if (typeof v === 'number') {
        (player as any).readyInLobbyAt = v;
      } else {
        // Hapus kunci agar tidak pernah mengembalikan undefined/null ke RTDB
        delete (player as any).readyInLobbyAt;
      }
    }
  });
  Object.values(room.squads ?? {}).forEach((squad) => {
    Object.values(squad?.members ?? {}).forEach((member) => {
      if (!member) return;
      if ('readyInLobbyAt' in member) {
        const v = (member as any).readyInLobbyAt;
        if (typeof v === 'number') {
          (member as any).readyInLobbyAt = v;
        } else {
          delete (member as any).readyInLobbyAt;
        }
      }
    });
  });
};

// As a last resort, delete any readyInLobbyAt keys that are still undefined
const purgeUndefinedReadyFields = (room: Room): void => {
  Object.values(room.players ?? {}).forEach((player) => {
    if (!player) return;
    if ('readyInLobbyAt' in player && (player as any).readyInLobbyAt === undefined) {
      delete (player as any).readyInLobbyAt;
    }
  });
  Object.values(room.squads ?? {}).forEach((squad) => {
    Object.values(squad?.members ?? {}).forEach((member) => {
      if (!member) return;
      if ('readyInLobbyAt' in member && (member as any).readyInLobbyAt === undefined) {
        delete (member as any).readyInLobbyAt;
      }
    });
  });
};

// Full sanitize pass applied at the start of transactions to guarantee valid RTDB payloads
const sanitizeRoomInPlace = (room: Room): void => {
  try {
    normalizeReadyFields(room);
    purgeUndefinedReadyFields(room);
    removeUndefinedDeep(room);
  } catch {
    // no-op
  }
};

export const generateRoomCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return code;
};

const roomRef = (roomCode: string): DatabaseReference => ref(database, `rooms/${roomCode}`);

const normalizeName = (name: string) => name.trim().slice(0, 50);

const buildDefaultSquads = (names: [string, string, string]): Record<string, RoomSquad> => {
  return {
    squad1: {
      id: 'squad1',
      name: names[0],
      capacity: ROOM_CAPACITY_PER_SQUAD,
      score: 0,
      status: 'waiting',
      members: {},
      collectedItems: {},
      answeredQuestions: {},
    },
    squad2: {
      id: 'squad2',
      name: names[1],
      capacity: ROOM_CAPACITY_PER_SQUAD,
      score: 0,
      status: 'waiting',
      members: {},
      collectedItems: {},
      answeredQuestions: {},
    },
    squad3: {
      id: 'squad3',
      name: names[2],
      capacity: ROOM_CAPACITY_PER_SQUAD,
      score: 0,
      status: 'waiting',
      members: {},
      collectedItems: {},
      answeredQuestions: {},
    },
  };
};

export const createRoom = async ({
  roomName,
  hostId,
  hostName,
  hostAvatar,
  squadNames,
}: CreateRoomPayload): Promise<Room> => {
  const normalizedName = normalizeName(roomName || 'Arena Nusantara');
  const code = generateRoomCode();
  const squads = buildDefaultSquads([
    normalizeName(squadNames[0] || 'Squad Garuda'),
    normalizeName(squadNames[1] || 'Squad Rajawali'),
    normalizeName(squadNames[2] || 'Squad Nusa'),
  ]);

  const now = Date.now();

  squads.squad1.members = squads.squad1.members || {};
  squads.squad1.members[hostId] = {
    userId: hostId,
    name: hostName,
    avatarSrc: hostAvatar,
    squadId: 'squad1',
    joinedAt: now,
    isHost: true,
    contributions: {
      items: 0,
      quizzes: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      score: 0,
    },
  };

  const roomData: Room = {
    roomCode: code,
    roomName: normalizedName,
    hostId,
    hostName,
    hostSquadId: 'squad1',
    status: 'waiting',
    createdAt: now,
    squads,
    players: {
      [hostId]: {
        userId: hostId,
        name: hostName,
        avatarSrc: hostAvatar,
        squadId: 'squad1',
        joinedAt: now,
        isHost: true,
        contributions: {
          items: 0,
          quizzes: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          score: 0,
        },
      },
    },
    lastUpdatedAt: now,
  };

  await set(roomRef(code), roomData);
  return roomData;
};

const findAvailableSquad = (room: Room): string | null => {
  const ids = ['squad1', 'squad2', 'squad3'];
  for (const id of ids) {
    const squad = room.squads[id];
    const memberCount = squad?.members ? Object.keys(squad.members).length : 0;
    if (memberCount < ROOM_CAPACITY_PER_SQUAD) {
      return id;
    }
  }
  return null;
};

export const joinRoom = async ({ roomCode, userId, name, avatarSrc }: JoinRoomPayload): Promise<Room | null> => {
  const result = await runTransaction(roomRef(roomCode), (room: Room | null) => {
    if (!room) {
      return room;
    }

    if (room.status === 'completed') {
      return room;
    }

    const existingPlayer = room.players?.[userId];
    const now = Date.now();

    if (existingPlayer) {
      // Player rejoining, update data
      existingPlayer.name = name;
      existingPlayer.avatarSrc = avatarSrc;
      existingPlayer.joinedAt = now;
      room.players[userId] = existingPlayer;
      const squad = room.squads[existingPlayer.squadId];
      if (squad) {
        squad.members = squad.members || {};
        squad.members[userId] = {
          ...existingPlayer,
          contributions: squad.members[userId]?.contributions || existingPlayer.contributions,
        };
      }
      room.lastUpdatedAt = now;
      return room;
    }

    const availableSquadId = findAvailableSquad(room);
    if (!availableSquadId) {
      return room;
    }

    const member: RoomPlayer = {
      userId,
      name,
      avatarSrc,
      squadId: availableSquadId,
      joinedAt: now,
      contributions: {
        items: 0,
        quizzes: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        score: 0,
      },
    };

    room.players = room.players || {};
    room.players[userId] = member;
    room.squads[availableSquadId].members = room.squads[availableSquadId].members || {};
    room.squads[availableSquadId].members![userId] = member;
    room.lastUpdatedAt = now;
    return room;
  });

  if (!result.committed) {
    return null;
  }

  return result.snapshot.val() as Room;
};

export const leaveRoom = async (roomCode: string, userId: string) => {
  await runTransaction(roomRef(roomCode), (room: Room | null) => {
    if (!room) return room;
    if (!room.players || !room.players[userId]) return room;

    const player = room.players[userId];
    const squad = room.squads[player.squadId];
    if (squad && squad.members) {
      delete squad.members[userId];
    }

    delete room.players[userId];

    const remainingPlayers = Object.keys(room.players).length;
    if (remainingPlayers === 0) {
      return null;
    }

    if (room.hostId === userId) {
      // Transfer host to next player if available
      const nextHostId = Object.keys(room.players)[0];
      room.hostId = nextHostId;
      room.hostName = room.players[nextHostId].name;
      room.hostSquadId = room.players[nextHostId].squadId;
      room.players[nextHostId].isHost = true;
      const nextSquad = room.squads[room.players[nextHostId].squadId];
      if (nextSquad?.members?.[nextHostId]) {
        nextSquad.members[nextHostId].isHost = true;
      }
    }

    room.lastUpdatedAt = Date.now();
    return room;
  });
};

export const updateSquadName = async (roomCode: string, squadId: string, name: string) => {
  const prepared = normalizeName(name);
  await update(ref(database, `rooms/${roomCode}/squads/${squadId}`), {
    name: prepared,
    lastRenamedAt: Date.now(),
  });
};

export const movePlayerToSquad = async (roomCode: string, userId: string, targetSquadId: string) => {
  await runTransaction(roomRef(roomCode), (room: Room | null) => {
    if (!room) return room;
    const player = room.players?.[userId];
    if (!player) return room;
    if (!room.squads[targetSquadId]) return room;

    const currentSquad = room.squads[player.squadId];
    const targetSquad = room.squads[targetSquadId];
    const targetCount = targetSquad.members ? Object.keys(targetSquad.members).length : 0;
    if (targetCount >= ROOM_CAPACITY_PER_SQUAD) {
      return room;
    }

    if (currentSquad?.members) {
      delete currentSquad.members[userId];
    }

    player.squadId = targetSquadId;
    room.players[userId] = player;
    targetSquad.members = targetSquad.members || {};
    targetSquad.members[userId] = player;
    room.lastUpdatedAt = Date.now();
    return room;
  });
};

const resetLobbyReadiness = (room: Room) => {
  Object.values(room.players ?? {}).forEach((player) => {
    if (player && 'readyInLobbyAt' in player) {
      // Use null to signal RTDB deletion instead of risking undefined
      (player as any).readyInLobbyAt = null;
    }
  });
  Object.values(room.squads ?? {}).forEach((squad) => {
    Object.values(squad?.members ?? {}).forEach((member) => {
      if (member && 'readyInLobbyAt' in member) {
        (member as any).readyInLobbyAt = null;
      }
    });
  });
};

export const startGameCountdown = async (roomCode: string, hostId: string, durationMs = 10000) => {
  console.log('[RoomService] startGameCountdown - NEW MULTIPATH VERSION');
  const roomReference = roomRef(roomCode);
  const snapshot = await new Promise<DataSnapshot>((resolve, reject) => {
    onValue(roomReference, resolve, { onlyOnce: true });
    setTimeout(() => reject(new Error('Timeout reading room')), 5000);
  });
  
  const room = snapshot.val() as Room | null;
  if (!room) throw new Error('Room not found');
  if (room.hostId !== hostId) throw new Error('Not host');
  if (room.status !== 'waiting') throw new Error('Room not waiting');

  const now = Date.now();
  const updates: Record<string, any> = {
    [`rooms/${roomCode}/status`]: 'countdown',
    [`rooms/${roomCode}/countdown`]: {
      startedAt: now,
      endsAt: now + durationMs,
    },
    [`rooms/${roomCode}/lastUpdatedAt`]: now,
  };

  // Remove readyInLobbyAt from all players
  Object.keys(room.players || {}).forEach((uid) => {
    updates[`rooms/${roomCode}/players/${uid}/readyInLobbyAt`] = null;
  });

  // Remove readyInLobbyAt from all squad members
  Object.entries(room.squads || {}).forEach(([squadId, squad]) => {
    Object.keys(squad.members || {}).forEach((uid) => {
      updates[`rooms/${roomCode}/squads/${squadId}/members/${uid}/readyInLobbyAt`] = null;
    });
  });

  console.log('[RoomService] Applying multipath updates:', Object.keys(updates).length, 'paths');
  await update(ref(database), updates);
  console.log('[RoomService] startGameCountdown SUCCESS');
};

export const markPlayerLobbyReady = async (roomCode: string, userId: string) => {
  await runTransaction(roomRef(roomCode), (room: Room | null) => {
    if (!room) return room;
    sanitizeRoomInPlace(room);
    if (!room.players || !room.players[userId]) return room;

    const player = room.players[userId];
    const now = Date.now();
    player.readyInLobbyAt = now;
    if (player.squadId) {
      const squad = room.squads?.[player.squadId];
      if (squad) {
        squad.members = squad.members || {};
        if (squad.members[userId]) {
          squad.members[userId]!.readyInLobbyAt = now;
        }
      }
    }
    room.lastUpdatedAt = now;
    return room;
  });
};

export const beginGame = async (roomCode: string, starterId: string) => {
  const roomReference = roomRef(roomCode);
  const snapshot = await new Promise<DataSnapshot>((resolve, reject) => {
    onValue(roomReference, resolve, { onlyOnce: true });
    setTimeout(() => reject(new Error('Timeout reading room')), 5000);
  });
  
  const room = snapshot.val() as Room | null;
  if (!room) throw new Error('Room not found');
  if (room.hostId !== starterId) throw new Error('Not host');
  if (room.status !== 'countdown') throw new Error('Room not in countdown');

  const now = Date.now();
  const updates: Record<string, any> = {
    [`rooms/${roomCode}/status`]: 'in-progress',
    [`rooms/${roomCode}/startedAt`]: now,
    [`rooms/${roomCode}/countdown`]: null,
    [`rooms/${roomCode}/lastUpdatedAt`]: now,
  };

  // Remove readyInLobbyAt from all players
  Object.keys(room.players || {}).forEach((uid) => {
    updates[`rooms/${roomCode}/players/${uid}/readyInLobbyAt`] = null;
  });

  // Remove readyInLobbyAt from all squad members
  Object.entries(room.squads || {}).forEach(([squadId, squad]) => {
    Object.keys(squad.members || {}).forEach((uid) => {
      updates[`rooms/${roomCode}/squads/${squadId}/members/${uid}/readyInLobbyAt`] = null;
    });
  });

  await update(ref(database), updates);
};

const ensureContribution = (member?: RoomPlayer): SquadContribution => {
  if (!member) {
    return {
      items: 0,
      quizzes: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      score: 0,
    };
  }

  member.contributions = member.contributions || {
    items: 0,
    quizzes: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0,
  };

  return member.contributions;
};

export const recordCollectible = async ({
  roomCode,
  squadId,
  playerId,
  playerName,
  itemId,
  points,
  avatarSrc,
}: RecordCollectiblePayload): Promise<CollectibleResult> => {
  let outcome: CollectibleResult = { accepted: false, scoreDelta: 0 };

  await runTransaction(roomRef(roomCode), (room: Room | null) => {
    if (!room) return room;
    if (room.status === 'completed') {
      outcome = { accepted: false, scoreDelta: 0, reason: 'room-completed' };
      return room;
    }

    const squad = room.squads?.[squadId];
    if (!squad) {
      outcome = { accepted: false, scoreDelta: 0, reason: 'not-in-room' };
      return room;
    }

    squad.collectedItems = squad.collectedItems || {};
    if (squad.collectedItems[itemId]) {
      outcome = { accepted: false, scoreDelta: 0, reason: 'duplicate' };
      return room;
    }

    const now = Date.now();
    squad.collectedItems[itemId] = {
      itemId,
      playerId,
      playerName,
      collectedAt: now,
    };
    squad.score = (squad.score || 0) + points;

    const member = squad.members?.[playerId];
    const contributions = ensureContribution(member);
    contributions.items += 1;
    contributions.score += points;

    const playerOverview = room.players?.[playerId];
    if (playerOverview) {
      const overviewContribution = ensureContribution(playerOverview);
      overviewContribution.items = contributions.items;
      overviewContribution.score = contributions.score;
    }

    squad.members = squad.members || {};
    squad.members[playerId] = {
      userId: playerId,
      name: playerName,
      avatarSrc,
      squadId,
      joinedAt: member?.joinedAt || now,
      isHost: member?.isHost,
      contributions,
    };

    room.players[playerId] = {
      userId: playerId,
      name: playerName,
      avatarSrc,
      squadId,
      joinedAt: playerOverview?.joinedAt || now,
      isHost: playerOverview?.isHost,
      contributions,
    };

    squad.members[playerId].contributions = contributions;

    outcome = { accepted: true, scoreDelta: points };
    room.lastUpdatedAt = now;
    return room;
  });

  return outcome;
};

export const recordQuizResult = async ({
  roomCode,
  squadId,
  playerId,
  playerName,
  guardId,
  questionId,
  points,
  isCorrect,
  avatarSrc,
}: RecordQuizPayload): Promise<QuizResult> => {
  let outcome: QuizResult = { accepted: false, scoreDelta: 0 };

  await runTransaction(roomRef(roomCode), (room: Room | null) => {
    if (!room) return room;
    if (room.status === 'completed') {
      outcome = { accepted: false, scoreDelta: 0, reason: 'room-completed' };
      return room;
    }

    const squad = room.squads?.[squadId];
    if (!squad) {
      outcome = { accepted: false, scoreDelta: 0, reason: 'not-in-room' };
      return room;
    }

    const key = `${guardId}:${questionId}`;
    squad.answeredQuestions = squad.answeredQuestions || {};
    if (squad.answeredQuestions[key]) {
      outcome = { accepted: false, scoreDelta: 0, reason: 'duplicate' };
      return room;
    }

    const now = Date.now();
    squad.answeredQuestions[key] = {
      guardId,
      questionId,
      playerId,
      playerName,
      isCorrect,
      answeredAt: now,
    };

    squad.score = (squad.score || 0) + points;

    const member = squad.members?.[playerId];
    const contributions = ensureContribution(member);
    contributions.quizzes += 1;
    contributions.score += points;
    if (isCorrect) {
      contributions.correctAnswers += 1;
    } else {
      contributions.wrongAnswers += 1;
    }

    const playerOverview = room.players?.[playerId];
    if (playerOverview) {
      const overviewContribution = ensureContribution(playerOverview);
      overviewContribution.quizzes = contributions.quizzes;
      overviewContribution.correctAnswers = contributions.correctAnswers;
      overviewContribution.wrongAnswers = contributions.wrongAnswers;
      overviewContribution.score = contributions.score;
    }

    squad.members = squad.members || {};
    squad.members[playerId] = {
      userId: playerId,
      name: playerName,
      avatarSrc,
      squadId,
      joinedAt: member?.joinedAt || now,
      isHost: member?.isHost,
      contributions,
    };

    room.players[playerId] = {
      userId: playerId,
      name: playerName,
      avatarSrc,
      squadId,
      joinedAt: playerOverview?.joinedAt || now,
      isHost: playerOverview?.isHost,
      contributions,
    };

    outcome = { accepted: true, scoreDelta: points };
    room.lastUpdatedAt = now;
    return room;
  });

  return outcome;
};

const computeLeaderboard = (room: Room): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = Object.values(room.squads || {}).map((squad) => ({
    squadId: squad.id,
    squadName: squad.name,
    score: squad.score || 0,
    durationSeconds: squad.durationSeconds,
    placement: 0,
  }));

  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((a.durationSeconds ?? Number.MAX_SAFE_INTEGER) !== (b.durationSeconds ?? Number.MAX_SAFE_INTEGER)) {
      return (a.durationSeconds ?? Number.MAX_SAFE_INTEGER) - (b.durationSeconds ?? Number.MAX_SAFE_INTEGER);
    }
    return a.squadName.localeCompare(b.squadName);
  });

  entries.forEach((entry, index) => {
    entry.placement = index + 1;
  });

  return entries;
};

export const markSquadCompleted = async ({
  roomCode,
  squadId,
  durationSeconds,
  completedAt,
}: SquadCompletionPayload) => {
  await runTransaction(roomRef(roomCode), (room: Room | null) => {
    if (!room) return room;
    const squad = room.squads?.[squadId];
    if (!squad) return room;

    if (squad.status === 'completed') {
      return room;
    }

    const now = completedAt || Date.now();
    squad.status = 'completed';
    squad.completedAt = now;
    squad.durationSeconds = durationSeconds;

    // Update leaderboard setiap kali ada squad yang selesai (bukan hanya saat semua selesai)
    // Leaderboard akan menampilkan semua squad yang sudah selesai
    const completedSquads = Object.values(room.squads || {}).filter((s) => s.status === 'completed');
    if (completedSquads.length > 0) {
      // Buat room sementara dengan hanya squad yang sudah selesai untuk leaderboard
      const tempRoom: Room = {
        ...room,
        squads: Object.fromEntries(
          Object.entries(room.squads || {}).filter(([id, s]) => s.status === 'completed')
        ),
      };
      room.leaderboard = computeLeaderboard(tempRoom);
    }

    const allCompleted = Object.values(room.squads || {}).every((s) => s.status === 'completed');
    if (allCompleted) {
      room.status = 'completed';
      room.finishedAt = now;
      // Final leaderboard dengan semua squad
      room.leaderboard = computeLeaderboard(room);
    }

    room.lastUpdatedAt = now;
    return room;
  });
};

// Update waktu game ke Realtime Database secara berkala
// Gunakan singleton database instance dan throttling untuk mencegah terlalu banyak update
let lastUpdateTime = 0;
let pendingUpdate: { roomCode: string; elapsedSeconds: number } | null = null;
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

export const updateGameTime = async (roomCode: string, elapsedSeconds: number) => {
  // Throttle: hanya update setiap 5 detik
  const now = Date.now();
  if (now - lastUpdateTime < 5000) {
    // Simpan update terbaru untuk diproses nanti
    pendingUpdate = { roomCode, elapsedSeconds };
    if (!updateTimeout) {
      updateTimeout = setTimeout(() => {
        if (pendingUpdate) {
          updateGameTime(pendingUpdate.roomCode, pendingUpdate.elapsedSeconds).catch(() => {});
          pendingUpdate = null;
        }
        updateTimeout = null;
      }, 5000 - (now - lastUpdateTime));
    }
    return;
  }

  try {
    // Gunakan database instance yang sudah ada
    const roomRef = ref(database, `rooms/${roomCode}`);
    await update(roomRef, {
      currentElapsedSeconds: elapsedSeconds,
      lastUpdatedAt: Date.now(),
    });
    lastUpdateTime = Date.now();
    pendingUpdate = null;
    if (updateTimeout) {
      clearTimeout(updateTimeout);
      updateTimeout = null;
    }
  } catch (error) {
    console.error('[RoomService] updateGameTime error', error);
    // Reset lastUpdateTime jika error untuk retry
    lastUpdateTime = 0;
  }
};

export const resetRoomToLobby = async (roomCode: string) => {
  console.log('[RoomService] resetRoomToLobby - NEW MULTIPATH VERSION');
  const roomReference = roomRef(roomCode);
  const snapshot = await new Promise<DataSnapshot>((resolve, reject) => {
    onValue(roomReference, resolve, { onlyOnce: true });
    setTimeout(() => reject(new Error('Timeout reading room')), 5000);
  });
  
  const room = snapshot.val() as Room | null;
  if (!room) throw new Error('Room not found');

  const now = Date.now();
  const updates: Record<string, any> = {
    [`rooms/${roomCode}/status`]: 'waiting',
    [`rooms/${roomCode}/countdown`]: null,
    [`rooms/${roomCode}/startedAt`]: null,
    [`rooms/${roomCode}/finishedAt`]: null,
    [`rooms/${roomCode}/currentElapsedSeconds`]: null,
    [`rooms/${roomCode}/leaderboard`]: null,
    [`rooms/${roomCode}/lastUpdatedAt`]: now,
  };

  // Reset all squads
  Object.entries(room.squads || {}).forEach(([squadId, squad]) => {
    updates[`rooms/${roomCode}/squads/${squadId}/status`] = 'waiting';
    updates[`rooms/${roomCode}/squads/${squadId}/completedAt`] = null;
    updates[`rooms/${roomCode}/squads/${squadId}/durationSeconds`] = null;
    updates[`rooms/${roomCode}/squads/${squadId}/score`] = 0;
    updates[`rooms/${roomCode}/squads/${squadId}/collectedItems`] = {};
    updates[`rooms/${roomCode}/squads/${squadId}/answeredQuestions`] = {};

    // Reset squad members
    Object.keys(squad.members || {}).forEach((uid) => {
      updates[`rooms/${roomCode}/squads/${squadId}/members/${uid}/readyInLobbyAt`] = null;
      updates[`rooms/${roomCode}/squads/${squadId}/members/${uid}/contributions`] = {
        items: 0,
        quizzes: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        score: 0,
      };
    });
  });

  // Reset all players
  Object.keys(room.players || {}).forEach((uid) => {
    updates[`rooms/${roomCode}/players/${uid}/readyInLobbyAt`] = null;
    updates[`rooms/${roomCode}/players/${uid}/contributions`] = {
      items: 0,
      quizzes: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      score: 0,
    };
  });

  console.log('[RoomService] Applying multipath updates:', Object.keys(updates).length, 'paths');
  await update(ref(database), updates);
  console.log('[RoomService] resetRoomToLobby SUCCESS');
};

export type RoomSubscription = (room: Room | null) => void;

export const subscribeToRoom = (roomCode: string, callback: RoomSubscription) => {
  console.log('[roomService] 🔍 subscribeToRoom called for:', roomCode);
  const r = roomRef(roomCode);
  
  // Set up onValue listener first - this will work even if get() fails
  // onValue will automatically handle permission errors and retry when permissions are available
  const listener = onValue(
    r,
    (snapshot: DataSnapshot) => {
      const value = snapshot.val();
      console.log('[roomService] 📥 onValue callback triggered, data:', value ? 'found' : 'null');
      if (value) {
        console.log('[roomService] 📥 Room data keys:', Object.keys(value));
        console.log('[roomService] 📥 Room name:', value.roomName);
      }
      callback(value ?? null);
    },
    (error) => {
      console.error('[roomService] ❌ onValue error:', error);
      console.error('[roomService] ❌ Error code:', error.code);
      console.error('[roomService] ❌ Error message:', error.message);
      // Still call callback with null to indicate error
      callback(null);
    },
    {
      onlyOnce: false,
    },
  );
  
  // Also try to get the room data immediately (once) to ensure we have it
  // But don't fail if this errors - onValue will handle it
  get(r).then((snapshot) => {
    const value = snapshot.val();
    console.log('[roomService] 📥 Initial room data fetch:', value ? 'found' : 'null');
    if (value) {
      console.log('[roomService] 📥 Initial fetch - Room data keys:', Object.keys(value));
      callback(value);
    }
  }).catch((err) => {
    console.warn('[roomService] ⚠️ Error fetching initial room data (onValue will handle):', err.code || err.message);
    // Don't fail completely - onValue listener will still work
    // This might be a permission issue that will resolve when user is properly authenticated
  });

  return () => {
    console.log('[roomService] 🧹 Unsubscribing from room:', roomCode);
    off(r, 'value', listener);
  };
};

