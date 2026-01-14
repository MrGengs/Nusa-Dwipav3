// Firebase Service for Nusa-Dwipa
// Handles user data synchronization with Firestore

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, Timestamp, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBA4qQj_Mg0Tanfe8nQNLqL33Rtii0ZhqA",
  authDomain: "nusa-dwipa.firebaseapp.com",
  databaseURL: "https://nusa-dwipa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nusa-dwipa",
  storageBucket: "nusa-dwipa.firebasestorage.app",
  messagingSenderId: "231878445619",
  appId: "1:231878445619:web:ea7b04746f23afd73e7146",
  measurementId: "G-MZ67EDBKF5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper function to wait for auth state
export function waitForAuth(timeout: number = 5000, opts?: { strict?: boolean }): Promise<any> {
  const strict = !!(opts && opts.strict);
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        if (strict) {
          reject(new Error('Auth state timeout'));
          return;
        }
        // Non-strict: allow localStorage fallback
        const userId = localStorage.getItem('userId');
        if (userId) {
          console.warn('[Firebase] Auth state timeout, using localStorage userId as fallback');
          resolve({ uid: userId });
        } else {
          reject(new Error('Auth state timeout and no userId in localStorage'));
        }
      }
    }, timeout);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      unsubscribe();
      
      if (user) {
        console.log('[Firebase] Auth state ready, user authenticated:', user.uid);
        resolve(user);
      } else {
        if (strict) {
          reject(new Error('User not authenticated'));
          return;
        }
        // Non-strict: allow localStorage fallback
        const userId = localStorage.getItem('userId');
        if (userId) {
          console.warn('[Firebase] No auth user, using localStorage userId as fallback');
          resolve({ uid: userId });
        } else {
          reject(new Error('User not authenticated'));
        }
      }
    }, (error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      unsubscribe();
      reject(error);
    });
  });
}

// User data interface
export interface UserData {
  username: string;
  email: string;
  uid: string;
  level: number;
  experience: number;
  collectedItems: string[];
  achievements: string[];
  avatarSrc?: string;
  totalPlayTime: number;
  quizStats?: QuizStatsPayload & { finishedAt?: Date };
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
}

export interface QuizStatsPayload {
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  answeredQuestions: number;
  totalQuestions: number;
  collectedCostumes: number;
  totalCostumes: number;
  completedGuards: string[];
  durationSeconds: number;
  completed: boolean;
  answeredQuestionIds: string[];
  force?: boolean;
}

// Initialize user data in Firestore
export async function initializeUserData(userId: string, username: string, email: string): Promise<void> {
  try {
    // Ensure auth state is ready
    const currentUser = auth.currentUser;
    if (!currentUser && !localStorage.getItem('userId')) {
      throw new Error('User not authenticated');
    }
    
    // Use currentUser.uid if available, otherwise use userId from parameter
    const actualUserId = currentUser?.uid || userId;
    
    // Verify userId matches auth.uid for security
    if (currentUser && currentUser.uid !== userId) {
      console.warn('[Firebase] userId mismatch, using auth.uid instead');
    }
    
    const userRef = doc(db, 'users', actualUserId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new user document
      const userData = {
        username: username,
        email: email,
        uid: actualUserId,
        level: 1,
        experience: 0,
        collectedItems: [],
        achievements: [],
        avatarSrc: '',
        totalPlayTime: 0,
        quizStats: {
          score: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          answeredQuestions: 0,
          totalQuestions: 0,
          collectedCostumes: 0,
          totalCostumes: 0,
          completedGuards: [],
          durationSeconds: 0,
          completed: false,
        answeredQuestionIds: [],
          updatedAt: Timestamp.now(),
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLogin: Timestamp.now()
      };

      await setDoc(userRef, userData);
      console.log('[Firebase] User data initialized:', userData);
    } else {
      // Update last login for existing user
      await updateDoc(userRef, {
        lastLogin: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      console.log('[Firebase] User login updated');
    }
  } catch (error: any) {
    console.error('[Firebase] Error initializing user data:', error);
    if (error.code === 'permission-denied') {
      console.error('[Firebase] Permission denied. Make sure user is authenticated and Firestore rules allow write access.');
    }
    throw error;
  }
}

// Get user data from Firestore
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    // Use currentUser.uid if available, otherwise use userId from parameter
    const currentUser = auth.currentUser;
    const actualUserId = currentUser?.uid || userId;
    
    const userRef = doc(db, 'users', actualUserId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        username: data.username,
        email: data.email,
        uid: data.uid,
        level: data.level || 1,
        experience: data.experience || 0,
        collectedItems: data.collectedItems || [],
        achievements: data.achievements || [],
        avatarSrc: data.avatarSrc || '',
        totalPlayTime: data.totalPlayTime || 0,
        quizStats: data.quizStats || undefined,
        createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt.seconds * 1000)) : new Date(),
        updatedAt: data.updatedAt ? (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : new Date(data.updatedAt.seconds * 1000)) : new Date(),
        lastLogin: data.lastLogin ? (typeof data.lastLogin.toDate === 'function' ? data.lastLogin.toDate() : new Date(data.lastLogin.seconds * 1000)) : new Date()
      };
    }
    return null;
  } catch (error: any) {
    // Log more details about the error
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
      console.warn('[Firebase] Permission denied getting user data. This might be a Firestore security rules issue.');
      console.warn('[Firebase] Make sure Firestore security rules allow read access for authenticated users.');
    } else {
      console.error('[Firebase] Error getting user data:', error);
    }
    return null;
  }
}

// Add collected item to user's collection
export async function addCollectedItem(userId: string, itemId: string): Promise<void> {
  try {
    // Ensure auth state is ready
    const currentUser = auth.currentUser;
    const actualUserId = currentUser?.uid || userId;
    
    // Verify userId matches auth.uid for security
    if (currentUser && currentUser.uid !== userId) {
      console.warn('[Firebase] userId mismatch, using auth.uid instead');
    }
    
    const userRef = doc(db, 'users', actualUserId);
    let userData = await getUserData(actualUserId);

    // If user data doesn't exist, create it with minimal data
    if (!userData) {
      console.log('[Firebase] User data not found, creating minimal user data...');
      const username = localStorage.getItem('userUsername') || 'User';
      const email = localStorage.getItem('userEmail') || '';
      
      // Try to initialize user data first
      try {
        await initializeUserData(actualUserId, username, email);
        userData = await getUserData(actualUserId);
      } catch (initError) {
        console.error('[Firebase] Error initializing user data, creating minimal document:', initError);
        // Create minimal user document as fallback
        const minimalUserData = {
          username: username,
          email: email,
          uid: userId,
          level: 1,
          experience: 0,
          collectedItems: [],
          achievements: [],
          avatarSrc: '',
          totalPlayTime: 0,
        quizStats: {
          score: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          answeredQuestions: 0,
          totalQuestions: 0,
          collectedCostumes: 0,
          totalCostumes: 0,
          completedGuards: [],
          durationSeconds: 0,
          completed: false,
          answeredQuestionIds: [],
          updatedAt: Timestamp.now(),
        },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastLogin: Timestamp.now()
        };
        await setDoc(userRef, minimalUserData);
        userData = {
          username: username,
          email: email,
          uid: actualUserId,
          level: 1,
          experience: 0,
          collectedItems: [],
          achievements: [],
          avatarSrc: '',
          totalPlayTime: 0,
          quizStats: {
            score: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            answeredQuestions: 0,
            totalQuestions: 0,
            collectedCostumes: 0,
            totalCostumes: 0,
            completedGuards: [],
            durationSeconds: 0,
            completed: false,
            answeredQuestionIds: [],
            updatedAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLogin: new Date()
        };
      }
    }

    if (!userData) {
      throw new Error('Failed to create or retrieve user data');
    }

    // Check if item already collected
    if (userData.collectedItems.includes(itemId)) {
      console.log('[Firebase] Item already collected:', itemId);
      return;
    }

    // Add item to collection
    await updateDoc(userRef, {
      collectedItems: arrayUnion(itemId),
      updatedAt: Timestamp.now()
    });

    // Give experience for collecting item
    const experienceGain = 10;
    const newExperience = userData.experience + experienceGain;
    
    // Check if level up
    const newLevel = calculateLevel(newExperience);
    const updates: any = {
      experience: newExperience,
      updatedAt: Timestamp.now()
    };

    if (newLevel > userData.level) {
      updates.level = newLevel;
      console.log('[Firebase] Level up! New level:', newLevel);
    }

    await updateDoc(userRef, updates);

    // Check for achievements
    await checkAndAddAchievements(actualUserId, userData.collectedItems.length + 1);

    console.log('[Firebase] Item collected and experience added:', itemId, experienceGain);
  } catch (error) {
    console.error('[Firebase] Error adding collected item:', error);
    throw error;
  }
}

// Calculate level based on experience
function calculateLevel(experience: number): number {
  // Level 1: 0-99 XP
  // Level 2: 100-299 XP
  // Level 3: 300-599 XP
  // Level 4: 600-999 XP
  // Level 5: 1000+ XP
  
  if (experience < 100) return 1;
  if (experience < 300) return 2;
  if (experience < 600) return 3;
  if (experience < 1000) return 4;
  return 5;
}

// Check and add achievements
async function checkAndAddAchievements(userId: string, itemCount: number): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);

    if (!userData) return;

    const newAchievements: string[] = [];
    
    // First collection achievement
    if (itemCount === 1 && !userData.achievements.includes('first-collection')) {
      newAchievements.push('first-collection');
    }

    // Other achievements can be added here
    if (itemCount >= 3 && !userData.achievements.includes('collector-novice')) {
      newAchievements.push('collector-novice');
    }

    if (itemCount >= 5 && !userData.achievements.includes('collector-expert')) {
      newAchievements.push('collector-expert');
    }

    // Add achievements if any
    if (newAchievements.length > 0) {
      await updateDoc(userRef, {
        achievements: arrayUnion(...newAchievements),
        updatedAt: Timestamp.now()
      });
      console.log('[Firebase] Achievements unlocked:', newAchievements);
    }
  } catch (error) {
    console.error('[Firebase] Error checking achievements:', error);
  }
}

// Update play time
export async function updatePlayTime(userId: string, additionalTime: number): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);

    if (!userData) return;

    await updateDoc(userRef, {
      totalPlayTime: userData.totalPlayTime + additionalTime,
      updatedAt: Timestamp.now()
    });

    console.log('[Firebase] Play time updated');
  } catch (error) {
    console.error('[Firebase] Error updating play time:', error);
  }
}

// Update avatar source
export async function updateAvatarSrc(userId: string, avatarSrc: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      avatarSrc: avatarSrc,
      updatedAt: Timestamp.now()
    });

    console.log('[Firebase] Avatar source updated');
  } catch (error) {
    console.error('[Firebase] Error updating avatar source:', error);
  }
}

export async function updateQuizStats(userId: string, stats: QuizStatsPayload): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    const actualUserId = currentUser?.uid || userId;
    const userRef = doc(db, 'users', actualUserId);

    const payload: any = {
      quizStats: {
        score: stats.score,
        correctAnswers: stats.correctAnswers,
        wrongAnswers: stats.wrongAnswers,
        answeredQuestions: stats.answeredQuestions,
        totalQuestions: stats.totalQuestions,
        collectedCostumes: stats.collectedCostumes,
        totalCostumes: stats.totalCostumes,
        completedGuards: stats.completedGuards,
        durationSeconds: stats.durationSeconds,
        completed: stats.completed,
        answeredQuestionIds: stats.answeredQuestionIds || [],
        finishedAt: stats.completed ? Timestamp.now() : null,
        updatedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    };

    await updateDoc(userRef, payload);
    console.log('[Firebase] Quiz stats updated');
  } catch (error: any) {
    if (error.code === 'not-found') {
      console.warn('[Firebase] User not found when updating quiz stats. Attempting initialization.');
      const username = localStorage.getItem('userUsername') || 'Explorer';
      const email = localStorage.getItem('userEmail') || '';
      try {
        await initializeUserData(userId, username, email);
        await updateQuizStats(userId, stats);
      } catch (initError) {
        console.error('[Firebase] Failed to initialize user before updating quiz stats:', initError);
      }
      return;
    }
    console.error('[Firebase] Error updating quiz stats:', error);
  }
}

// Save to leaderboard
export async function saveToLeaderboard(username: string, score: number, elapsedSeconds: number): Promise<void> {
  try {
    console.log('[Firebase] Saving to leaderboard:', { username, score, time: elapsedSeconds });
    const leaderboardRef = collection(db, 'leaderboard');
    const docData = {
      username: username || 'Anonymous',
      score: score || 0,
      time: elapsedSeconds || 0, // Time in seconds
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(leaderboardRef, docData);
    console.log('[Firebase] ✅ Successfully saved to leaderboard with ID:', docRef.id, docData);
  } catch (error) {
    console.error('[Firebase] ❌ Error saving to leaderboard:', error);
    throw error;
  }
}

// Get leaderboard data (sorted by score desc, then time asc)
// Note: Using only orderBy('score') to avoid composite index requirement, then sorting by time in JavaScript
export async function getLeaderboard(limitCount: number = 100): Promise<any[]> {
  try {
    const leaderboardRef = collection(db, 'leaderboard');
    // Only orderBy score to avoid composite index requirement
    // We'll sort by time in JavaScript after fetching
    const q = query(leaderboardRef, orderBy('score', 'desc'), limit(limitCount * 2)); // Fetch more to ensure we have enough after sorting
    const querySnapshot = await getDocs(q);
    const leaderboard: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      leaderboard.push({
        id: doc.id,
        username: data.username || 'Anonymous',
        score: data.score || 0,
        time: data.time || 0,
        createdAt: data.createdAt,
      });
    });
    
    // Sort by score (desc) first, then by time (asc) for same scores
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      return a.time - b.time; // Lower time first for same score
    });
    
    // Limit to requested count after sorting
    return leaderboard.slice(0, limitCount);
  } catch (error) {
    console.error('[Firebase] Error getting leaderboard:', error);
    throw error;
  }
}

// Expose to window for game-progress.js
if (typeof window !== 'undefined') {
  (window as any).saveToLeaderboard = saveToLeaderboard;
}

