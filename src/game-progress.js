/* global window */

/**
 * Game Progress Manager
 * =====================
 * - Tracks quiz progress, scores, collectibles, and timer.
 * - Dispatches browser events so UI components can react.
 * - Persists aggregated stats to Firestore via window.updateQuizStatsToFirestore.
 */

const POINTS = {
  correctAnswer: 5,
  wrongAnswer: -3,
  collectible: 10,
};

const TIMER_INTERVAL_MS = 1000;
const FIRESTORE_SYNC_DELAY = 1500;
const LOCAL_STORAGE_KEY = 'nusaDwipaProgress';

const state = {
  score: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  answeredQuestionIds: new Set(),
  guardTotals: new Map(), // guardId -> total questions
  guardAnswered: new Map(), // guardId -> Set(questionId)
  guardLastQuestionIndex: new Map(), // guardId -> next question index
  completedGuards: new Set(),
  collectibleRegistry: new Set(),
  collectedItems: new Set(),
  timer: {
    startedAt: null,
    elapsedMs: 0,
    intervalId: null,
  },
  lastSyncTimeout: null,
  completed: false,
  restored: false,
  cachedTotalQuestions: 0,
  cachedTotalCostumes: 0,
};

function getTotalQuestions() {
  let total = 0;
  state.guardTotals.forEach((count) => {
    total += count;
  });
  return total || state.cachedTotalQuestions || 0;
}

function dispatchUpdate() {
  const detail = getPublicState();
  window.dispatchEvent(new CustomEvent('gameProgress:update', { detail }));
}

function dispatchCompletion() {
  const detail = getPublicState();
  window.dispatchEvent(new CustomEvent('gameProgress:completed', { detail }));
}

function getPublicState() {
  const totalQuestions = getTotalQuestions();
  const totalCostumes = Math.max(state.collectibleRegistry.size, state.cachedTotalCostumes || 0);
  return {
    score: state.score,
    correctAnswers: state.correctAnswers,
    wrongAnswers: state.wrongAnswers,
    answeredQuestions: state.answeredQuestionIds.size,
    totalQuestions,
    collectedCostumes: state.collectedItems.size,
    totalCostumes,
    completedGuards: Array.from(state.completedGuards),
    isCompleted: state.completed,
    elapsedMs: state.timer.elapsedMs,
    formattedTime: formatElapsed(state.timer.elapsedMs),
    timerStartedAt: state.timer.startedAt, // Expose untuk check di RoomFlow
  };
}

function ensureTimerRunning() {
  // Jangan start timer jika game belum dimulai (belum in-progress)
  // Timer akan di-start dari room.startedAt saat status in-progress
  if (!state.timer.startedAt) {
    // Cek apakah ada room session dengan startedAt
    const roomSession = window.roomSession;
    if (roomSession && roomSession.roomStartedAt) {
      state.timer.startedAt = roomSession.roomStartedAt;
      state.timer.elapsedMs = Date.now() - state.timer.startedAt;
    } else {
      // Fallback: start dari sekarang (untuk backward compatibility atau solo mode)
      state.timer.startedAt = Date.now();
      state.timer.elapsedMs = 0;
    }
  }
  // CRITICAL: Pastikan interval selalu berjalan, jangan pernah berhenti meskipun settings dibuka
  if (!state.timer.intervalId) {
    let lastSyncTime = Date.now();
    state.timer.intervalId = window.setInterval(() => {
      if (state.timer.startedAt) {
        state.timer.elapsedMs = Date.now() - state.timer.startedAt;
        dispatchUpdate(); // Dispatch update setiap detik
        
        // Sync waktu ke Realtime Database setiap 5 detik (dengan debouncing)
        const now = Date.now();
        if (now - lastSyncTime >= 5000) {
          const elapsedSeconds = Math.floor(state.timer.elapsedMs / 1000);
          const roomSession = window.roomSession;
          if (roomSession && roomSession.roomCode && typeof window.updateGameTime === 'function') {
            // Gunakan setTimeout untuk mencegah blocking dan stack overflow
            window.setTimeout(() => {
              window.updateGameTime(roomSession.roomCode, elapsedSeconds).catch((error) => {
                console.error('[GameProgress] Failed to sync time to database', error);
              });
            }, 0);
          }
          lastSyncTime = now;
        }
      }
    }, TIMER_INTERVAL_MS);
    console.log('[GameProgress] ✅ Timer interval started, startedAt:', new Date(state.timer.startedAt), '- Timer will NOT stop when settings opens');
  } else {
    // Timer sudah berjalan, pastikan tidak berhenti
    console.log('[GameProgress] ✅ Timer already running, ensuring it continues (settings may be open)');
  }
}

// Start timer dari room startedAt (dipanggil saat game dimulai)
// Guard untuk mencegah multiple calls
let lastStartedAt = null;
function startTimerFromRoomStartedAt(roomStartedAt) {
  if (!roomStartedAt || typeof roomStartedAt !== 'number') {
    console.warn('[GameProgress] Invalid roomStartedAt:', roomStartedAt);
    return;
  }
  
  // Skip jika sudah di-start dengan startedAt yang sama
  if (lastStartedAt === roomStartedAt && state.timer.startedAt === roomStartedAt && state.timer.intervalId) {
    return;
  }
  
  lastStartedAt = roomStartedAt;
  
  // Stop timer yang mungkin sudah berjalan
  stopTimer();
  
  // Set timer dari room startedAt
  state.timer.startedAt = roomStartedAt;
  state.timer.elapsedMs = Date.now() - state.timer.startedAt;
  
  // Start interval
  if (!state.timer.intervalId) {
    let lastSyncTime = Date.now();
    state.timer.intervalId = window.setInterval(() => {
      if (state.timer.startedAt) {
        state.timer.elapsedMs = Date.now() - state.timer.startedAt;
        dispatchUpdate();
        
        // Sync waktu ke Realtime Database setiap 5 detik (dengan debouncing)
        const now = Date.now();
        if (now - lastSyncTime >= 5000) {
          const elapsedSeconds = Math.floor(state.timer.elapsedMs / 1000);
          const roomSession = window.roomSession;
          if (roomSession && roomSession.roomCode && typeof window.updateGameTime === 'function') {
            // Gunakan setTimeout untuk mencegah blocking dan stack overflow
            window.setTimeout(() => {
              window.updateGameTime(roomSession.roomCode, elapsedSeconds).catch((error) => {
                console.error('[GameProgress] Failed to sync time to database', error);
              });
            }, 0);
          }
          lastSyncTime = now;
        }
      }
    }, TIMER_INTERVAL_MS);
  }
  
  dispatchUpdate();
  console.log('[GameProgress] Timer started from room startedAt:', new Date(roomStartedAt));
}

function stopTimer() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  if (state.timer.startedAt) {
    state.timer.elapsedMs = Date.now() - state.timer.startedAt;
  }
}

function registerGuard(guardId, totalQuestions) {
  if (!guardId || typeof totalQuestions !== 'number') return;
  state.guardTotals.set(guardId, totalQuestions);
  state.guardAnswered.set(guardId, new Set());
  state.guardLastQuestionIndex.set(guardId, 0);
  applyAnsweredProgressToGuard(guardId);
  let computedTotal = 0;
  state.guardTotals.forEach((count) => {
    computedTotal += count;
  });
  if (computedTotal > state.cachedTotalQuestions) {
    state.cachedTotalQuestions = computedTotal;
  }
  console.log('[GameProgress] Guard registered:', { guardId, totalQuestions, totalGuards: state.guardTotals.size, totalQuestions: computedTotal });
  dispatchUpdate();
  // Check completion after registering guard (in case all guards are already registered and completed)
  checkCompletion();
}

function getNextQuestionIndex(guardId) {
  const idx = state.guardLastQuestionIndex.get(guardId);
  if (typeof idx === 'number') {
    return Math.min(idx, state.guardTotals.get(guardId) || 0);
  }
  const answeredSet = state.guardAnswered.get(guardId);
  return answeredSet ? answeredSet.size : 0;
}

function isGuardCompleted(guardId) {
  if (!state.guardTotals.has(guardId)) return false;
  const answered = state.guardAnswered.get(guardId);
  return answered && answered.size >= (state.guardTotals.get(guardId) || 0);
}

function registerCollectible(itemId) {
  if (!itemId) return;
  if (!state.collectibleRegistry.has(itemId)) {
    state.collectibleRegistry.add(itemId);
    if (state.collectibleRegistry.size > state.cachedTotalCostumes) {
      state.cachedTotalCostumes = state.collectibleRegistry.size;
    }
    console.log('[GameProgress] Collectible registered:', { itemId, totalCollectibles: state.collectibleRegistry.size });
    dispatchUpdate();
    // Check completion after registering collectible (in case all collectibles are already registered and collected)
    checkCompletion();
  }
}

function recordItemCollected(itemId, options = {}) {
  if (!itemId || state.collectedItems.has(itemId)) {
    return;
  }
  // Timer sudah di-start dari room startedAt saat game dimulai
  // Tidak perlu ensureTimerRunning di sini lagi
  state.collectedItems.add(itemId);
  const awardPoints = options.awardPoints !== false;
  if (awardPoints) {
    state.score += POINTS.collectible;
  }
  if (typeof window.roomSession?.recordCollectible === 'function') {
    window.roomSession.recordCollectible(itemId, awardPoints ? POINTS.collectible : 0);
  }
  scheduleSync();
  checkCompletion();
  dispatchUpdate();
}

function recordQuestionResult({ guardId, questionId, isCorrect }) {
  if (!guardId || !questionId) return;
  const answeredSet = state.guardAnswered.get(guardId);
  if (answeredSet && answeredSet.has(questionId)) {
    return; // already processed
  }

  // Timer sudah di-start dari room startedAt saat game dimulai
  // Tidak perlu ensureTimerRunning di sini lagi

  if (answeredSet) {
    answeredSet.add(questionId);
  }
  state.answeredQuestionIds.add(`${guardId}:${questionId}`);

  if (isCorrect) {
    state.correctAnswers += 1;
    state.score += POINTS.correctAnswer;
  } else {
    state.wrongAnswers += 1;
    state.score += POINTS.wrongAnswer;
  }
  if (typeof window.roomSession?.recordQuiz === 'function') {
    const pointsAwarded = isCorrect ? POINTS.correctAnswer : POINTS.wrongAnswer;
    window.roomSession.recordQuiz(guardId, questionId, isCorrect, pointsAwarded);
  }

  // Update next question index
  if (answeredSet) {
    state.guardLastQuestionIndex.set(guardId, answeredSet.size);
  }

  // Guard completion check
  if (isGuardCompleted(guardId)) {
    state.completedGuards.add(guardId);
  }

  scheduleSync();
  checkCompletion();
  dispatchUpdate();
}

function checkCompletion() {
  if (state.completed) return;
  
  const totalQuestions = getTotalQuestions();
  const allQuestionsDone = totalQuestions > 0 && state.answeredQuestionIds.size >= totalQuestions;
  const totalCostumes = Math.max(state.collectibleRegistry.size, state.cachedTotalCostumes || 0);
  const allCostumesCollected = totalCostumes > 0 && state.collectedItems.size >= totalCostumes;

  // Debug logging
  console.log('[GameProgress] Completion check:', {
    totalQuestions,
    answeredQuestions: state.answeredQuestionIds.size,
    allQuestionsDone,
    totalCostumes,
    collectedItems: state.collectedItems.size,
    allCostumesCollected,
    completed: allQuestionsDone && allCostumesCollected
  });

  if (allQuestionsDone && allCostumesCollected) {
    console.log('[GameProgress] ✅ Game completed! All items collected and all quizzes answered.');
    state.completed = true;
    stopTimer();
    const elapsedSeconds = Math.floor(state.timer.elapsedMs / 1000);
    
    // For multiplayer mode
    if (typeof window.roomSession?.markSquadCompleted === 'function') {
      window.roomSession.markSquadCompleted(elapsedSeconds);
    }
    
    scheduleSync(true);
    dispatchUpdate();
    dispatchCompletion();
    
    // Check if solo mode or convert page - redirect to leaderboard
    // game.html is always solo mode (no room/squad system)
    const isSoloMode = () => {
      try {
        const pathname = window.location.pathname;
        // game.html is always solo mode
        if (pathname.includes('game.html') || pathname.endsWith('/game')) {
          return true;
        }
        // Also check for convert page or explicit solo mode flag
        const isConvert = pathname.includes('convert.html') || 
                         pathname.endsWith('/convert') || 
                         window.__isConvertPage === true;
        const isSolo = window.__soloMode === true;
        return isSolo || isConvert;
      } catch {
        return false;
      }
    };
    
    if (isSoloMode()) {
      console.log('[GameProgress] Solo mode detected, saving to leaderboard and redirecting...');
      
      // Show completion message
      if (typeof window.showSimpleNotification === 'function') {
        window.showSimpleNotification('🎉 Selamat! Semua item terkumpul dan semua quiz terjawab!', 'success', 3000);
      }
      
      // Determine leaderboard path
      const getLeaderboardPath = () => {
        try {
          const pathname = window.location.pathname;
          // If we're in /public/game.html, go to /public/leaderboard.html
          if (pathname.includes('/public/')) {
            return pathname.replace('/game.html', '/leaderboard.html').replace('/game', '/leaderboard.html');
          }
          // Default to root-relative path
          return '/leaderboard.html';
        } catch {
          return '/leaderboard.html';
        }
      };
      
      const leaderboardPath = getLeaderboardPath();
      console.log('[GameProgress] Leaderboard path:', leaderboardPath);
      
      // Save to leaderboard and redirect
      saveToLeaderboard(state.score, elapsedSeconds)
        .then(() => {
          console.log('[GameProgress] ✅ Saved to leaderboard, redirecting in 2 seconds...');
          setTimeout(() => {
            window.location.href = leaderboardPath;
          }, 2000);
        })
        .catch((error) => {
          console.error('[GameProgress] ❌ Error saving to leaderboard:', error);
          // Still redirect even if save fails
          console.log('[GameProgress] Redirecting anyway...');
          setTimeout(() => {
            window.location.href = leaderboardPath;
          }, 2000);
        });
    } else {
      console.log('[GameProgress] Multiplayer mode - not redirecting (handled by RoomFlow)');
    }
  }
}

function scheduleSync(force = false) {
  if (state.lastSyncTimeout) {
    clearTimeout(state.lastSyncTimeout);
  }
  state.lastSyncTimeout = window.setTimeout(() => {
    syncToFirestore(force);
  }, force ? 300 : FIRESTORE_SYNC_DELAY);
}

function buildProgressSnapshot() {
  return {
    score: state.score,
    correctAnswers: state.correctAnswers,
    wrongAnswers: state.wrongAnswers,
    answeredQuestions: state.answeredQuestionIds.size,
    totalQuestions: getTotalQuestions(),
    collectedCostumes: state.collectedItems.size,
    totalCostumes: Math.max(state.collectibleRegistry.size, state.cachedTotalCostumes || 0),
    completedGuards: Array.from(state.completedGuards),
    durationSeconds: Math.floor(state.timer.elapsedMs / 1000),
    completed: state.completed,
    answeredQuestionIds: Array.from(state.answeredQuestionIds),
  };
}

function buildLocalSnapshot() {
  const snapshot = buildProgressSnapshot();
  return {
    ...snapshot,
    cachedTotalQuestions: state.cachedTotalQuestions || snapshot.totalQuestions || 0,
    cachedTotalCostumes: state.cachedTotalCostumes || snapshot.totalCostumes || 0,
    collectedItemIds: Array.from(state.collectedItems),
    savedAt: Date.now(),
  };
}

function persistLocalSnapshot() {
  try {
    const localSnapshot = buildLocalSnapshot();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localSnapshot));
  } catch (error) {
    console.warn('[GameProgress] Unable to persist progress locally:', error);
  }
}

function loadLocalSnapshot() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[GameProgress] Unable to load local progress snapshot:', error);
    return null;
  }
}

async function syncToFirestore(force = false) {
  persistLocalSnapshot();

  const syncFn = window.updateQuizStatsToFirestore;
  const userId = localStorage.getItem('userId');
  if (typeof syncFn !== 'function' || !userId) {
    return;
  }

  const payload = {
    ...buildProgressSnapshot(),
    force,
  };

  try {
    await syncFn(userId, payload);
  } catch (error) {
    console.error('[GameProgress] Failed to sync stats:', error);
  }
}

function resetProgress() {
  stopTimer();
  state.score = 0;
  state.correctAnswers = 0;
  state.wrongAnswers = 0;
  state.answeredQuestionIds.clear();
  state.guardTotals.clear();
  state.guardAnswered.clear();
  state.guardLastQuestionIndex.clear();
  state.completedGuards.clear();
  state.collectibleRegistry.clear();
  state.collectedItems.clear();
  state.timer.startedAt = null;
  state.timer.elapsedMs = 0;
  state.completed = false;
  dispatchUpdate();
}

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, '0'));
  return `${parts[0]}:${parts[1]}:${parts[2]}`;
}

function getGuardProgress(guardId) {
  const answered = state.guardAnswered.get(guardId);
  return {
    answeredCount: answered ? answered.size : 0,
    totalQuestions: state.guardTotals.get(guardId) || 0,
    completed: isGuardCompleted(guardId),
    nextQuestionIndex: getNextQuestionIndex(guardId),
  };
}

function restoreFromFirestore(snapshot = {}, collectedItemIds = []) {
  const data = snapshot || {};
  stopTimer();

  state.score = data.score || 0;
  state.correctAnswers = data.correctAnswers || 0;
  state.wrongAnswers = data.wrongAnswers || 0;
  state.completed = !!data.completed;

  state.answeredQuestionIds = new Set(
    Array.isArray(data.answeredQuestionIds) ? data.answeredQuestionIds : []
  );

  state.completedGuards = new Set(
    Array.isArray(data.completedGuards) ? data.completedGuards : []
  );

  state.collectedItems = new Set(
    Array.isArray(collectedItemIds) ? collectedItemIds : []
  );

  if (typeof data.totalQuestions === 'number') {
    state.cachedTotalQuestions = Math.max(state.cachedTotalQuestions, data.totalQuestions);
  }
  if (typeof data.cachedTotalQuestions === 'number') {
    state.cachedTotalQuestions = Math.max(state.cachedTotalQuestions, data.cachedTotalQuestions);
  }
  if (typeof data.totalCostumes === 'number') {
    state.cachedTotalCostumes = Math.max(state.cachedTotalCostumes, data.totalCostumes);
  }
  if (typeof data.cachedTotalCostumes === 'number') {
    state.cachedTotalCostumes = Math.max(state.cachedTotalCostumes, data.cachedTotalCostumes);
  }

  // Restore timer dari room startedAt jika ada (prioritas utama)
  const roomSession = window.roomSession;
  if (roomSession && roomSession.roomStartedAt) {
    state.timer.startedAt = roomSession.roomStartedAt;
    state.timer.elapsedMs = Date.now() - state.timer.startedAt;
    console.log('[GameProgress] Timer restored from room startedAt:', new Date(roomSession.roomStartedAt));
  } else {
    // Fallback: restore dari Firestore durationSeconds
    const elapsedSeconds = data.durationSeconds || 0;
    state.timer.elapsedMs = elapsedSeconds * 1000;
    state.timer.startedAt = Date.now() - state.timer.elapsedMs;
    if (state.timer.startedAt < 0) {
      state.timer.startedAt = Date.now();
    }
  }

  state.guardTotals.forEach((_, guardId) => {
    state.guardAnswered.set(guardId, new Set());
    applyAnsweredProgressToGuard(guardId);
  });

  // Jangan start timer otomatis di sini, tunggu sampai status in-progress
  // Timer akan di-start dari room startedAt saat game dimulai
  checkCompletion();
  state.restored = true;
  dispatchUpdate();
  persistLocalSnapshot();
}

function applyAnsweredProgressToGuard(guardId) {
  const total = state.guardTotals.get(guardId) || 0;
  if (!state.guardAnswered.has(guardId)) {
    state.guardAnswered.set(guardId, new Set());
  }
  const answeredSet = state.guardAnswered.get(guardId);
  answeredSet.clear();

  state.answeredQuestionIds.forEach((value) => {
    const separatorIndex = value.indexOf(':');
    if (separatorIndex === -1) return;
    const gid = value.slice(0, separatorIndex);
    const questionId = value.slice(separatorIndex + 1);
    if (gid === guardId && questionId) {
      answeredSet.add(questionId);
    }
  });

  const answeredCount = answeredSet.size;
  state.guardLastQuestionIndex.set(guardId, Math.min(answeredCount, total));

  if (answeredCount >= total && total > 0) {
    state.completedGuards.add(guardId);
  }
}

// Save to leaderboard
async function saveToLeaderboard(score, elapsedSeconds) {
  try {
    const username = localStorage.getItem('userUsername') || localStorage.getItem('username') || 'Anonymous';
    console.log('[GameProgress] Preparing to save to leaderboard:', { username, score, elapsedSeconds });
    
    if (typeof window.saveToLeaderboard === 'function') {
      console.log('[GameProgress] Calling window.saveToLeaderboard...');
      await window.saveToLeaderboard(username, score, elapsedSeconds);
      console.log('[GameProgress] ✅ Successfully saved to leaderboard');
    } else {
      console.warn('[GameProgress] ⚠️ window.saveToLeaderboard function not available');
      console.warn('[GameProgress] Available window functions:', Object.keys(window).filter(k => k.includes('save') || k.includes('leaderboard')));
      // Try to wait a bit and retry (in case firebaseService hasn't loaded yet)
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (typeof window.saveToLeaderboard === 'function') {
        console.log('[GameProgress] Retrying after delay...');
        await window.saveToLeaderboard(username, score, elapsedSeconds);
        console.log('[GameProgress] ✅ Successfully saved to leaderboard (retry)');
      } else {
        throw new Error('saveToLeaderboard function not available on window object');
      }
    }
  } catch (error) {
    console.error('[GameProgress] ❌ Error saving to leaderboard:', error);
    throw error;
  }
}

// Start timer for solo mode when Enter is clicked
// Timer TIDAK BOLEH berhenti meskipun settings dibuka
function startSoloTimer() {
  if (!state.timer.startedAt) {
    state.timer.startedAt = Date.now();
    state.timer.elapsedMs = 0; // Start from 0
    ensureTimerRunning();
    dispatchUpdate(); // Dispatch initial update
    console.log('[GameProgress] Solo timer started at:', new Date(state.timer.startedAt));
  } else {
    // Timer already started, just ensure it's running
    // CRITICAL: Timer tidak boleh berhenti meskipun settings dibuka
    ensureTimerRunning();
    console.log('[GameProgress] Solo timer already started, ensuring it runs (settings may be open)');
  }
}

// Expose API
window.gameProgress = {
  registerGuard,
  registerCollectible,
  recordQuestionResult,
  recordItemCollected,
  ensureTimerRunning,
  startTimerFromRoomStartedAt,
  startSoloTimer,
  isGuardCompleted,
  getNextQuestionIndex,
  getGuardProgress,
  getState: getPublicState,
  reset: resetProgress,
  formatElapsed,
  restoreFromFirestore,
};

if (window.pendingGameProgressRestore) {
  const { stats, collectedItems } = window.pendingGameProgressRestore;
  restoreFromFirestore(stats, collectedItems);
  delete window.pendingGameProgressRestore;
}

const localSnapshot = loadLocalSnapshot();
if (localSnapshot && !state.restored) {
  restoreFromFirestore(localSnapshot, localSnapshot.collectedItemIds || []);
}

window.addEventListener('beforeunload', () => {
  persistLocalSnapshot();
  if (state.lastSyncTimeout) {
    clearTimeout(state.lastSyncTimeout);
  }
  syncToFirestore(true);
});

// Dispatch initial state for listeners that mount early
dispatchUpdate();


