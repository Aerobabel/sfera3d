export type SferaMode = 'shopper' | 'player';
export type SferaLocation = 'city' | 'sferaHall' | 'zombieArena' | 'racingZone';
export type SferaGame = null | 'ZombieArena' | 'RacingZone' | 'TreasureHunt';

export type UnrealPixelStreamingEvent =
    | { event: 'mode_changed'; mode?: unknown }
    | { event: 'portal_entered'; portal?: unknown }
    | { event: 'game_entered'; game?: unknown }
    | { event: 'game_access_denied'; game?: unknown; reason?: unknown }
    | { event: 'zombie_killed'; game?: unknown }
    | { event: 'player_hit'; game?: unknown }
    | { event: 'returned_to_city'; from?: unknown }
    | { event: string; [key: string]: unknown };

export type ArenaMomentKind = 'kill' | 'hit' | 'combo' | 'rank' | 'game_over';

export type ArenaMoment = {
    id: number;
    kind: ArenaMomentKind;
    title: string;
    description: string;
};

export type UnrealEventBridgeState = {
    currentMode: SferaMode;
    currentLocation: SferaLocation;
    currentGame: SferaGame;
    isInGame: boolean;
    zombieScore: number;
    zombieHealth: number;
    zombieGameOver: boolean;
    zombieKills: number;
    playerHits: number;
    zombieCombo: number;
    maxZombieCombo: number;
    zombieCoins: number;
    zombieThreatLevel: number;
    zombieRank: string;
    arenaMoments: ArenaMoment[];
    lastUnrealEvent: UnrealPixelStreamingEvent | null;
    accessDeniedMessage: string | null;
    recentActivity: string[];
};
