/* eslint-disable */
declare var NAF: {
  InterpolationBuffer: any;
  clientId: string;
  connection: {
    adapter?: {
      enableMicrophone: (enabled: boolean) => void;
    };
    broadcastDataGuaranteed: (dataType: string, data: object) => void;
    sendDataGuaranteed?: (clientId: string, dataType: string, data: object) => void;
    isConnected: () => boolean;
    subscribeToDataChannel: (
      dataType: string,
      callback: (senderId: string, dataType: string, data: object, targetId: string | undefined) => void,
    ) => void;
  };
  utils: {
    getNetworkedEntity: (el: any) => any;
  };
};

declare global {
  interface Window {
    gameProgress?: any;
    showSatpamDialog?: (data: any) => void;
    showSimpleNotification?: (data: any) => void;
    updateQuizStatsToFirestore?: (userId: string, stats: any) => Promise<void>;
    saveCollectedItemToFirestore?: (userId: string, itemId: string) => Promise<void>;
    getUserDataFromFirestore?: (userId: string) => Promise<any>;
    addItemToBackpack?: (item: any) => void;
    logout?: () => void;
    pendingGameProgressRestore?: {
      stats?: any;
      collectedItems?: string[];
    };
    startExperience?: () => void;
    respawnToCheckpoint?: () => void;
    enterLobbyArea?: () => void;
    exitLobbyArea?: () => void;
    __activeSquadId?: string | null;
    roomSession?: {
      roomCode: string;
      squadId: string;
      userId: string;
      playerName: string;
      recordCollectible?: (itemId: string, points: number) => void | Promise<void>;
      recordQuiz?: (guardId: string, questionId: string, isCorrect: boolean, points: number) => void | Promise<void>;
      markSquadCompleted?: (durationSeconds: number) => void | Promise<void>;
    };
  }
}

export {};
