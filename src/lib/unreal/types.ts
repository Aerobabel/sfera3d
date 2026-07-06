import type { QuestProgress, QuestRewardState } from '@/lib/quests';

export type SferaMode = 'shopper' | 'player';
export type SferaLocation = 'city' | 'sferaHall' | 'zombieArena' | 'racingZone';
export type SferaGame = null | 'ZombieArena' | 'RacingZone' | 'TreasureHunt';
export type WalletTransactionKind = 'arcade_win' | 'quest_reward' | 'water_purchase';

export type WalletTransaction = {
    id: string;
    kind: WalletTransactionKind;
    label: string;
    amountCents: number;
    createdAt: number;
};

export type UnrealPixelStreamingEvent =
    | { event: 'mode_changed'; mode?: unknown }
    | { event: 'portal_entered'; portal?: unknown }
    | { event: 'game_entered'; game?: unknown }
    | { event: 'game_access_denied'; game?: unknown; reason?: unknown }
    | { event: 'zombie_killed'; game?: unknown }
    | { event: 'player_hit'; game?: unknown }
    | { event: 'returned_to_city'; from?: unknown }
    | { event: 'product_viewed'; productId?: unknown; supplierId?: unknown; productName?: unknown }
    | { event: 'catalogue_opened'; supplierId?: unknown }
    | { event: 'supplier_chat_opened'; supplierId?: unknown; pavilionId?: unknown }
    | { event: 'pavilion_entered'; pavilionId?: unknown }
    | { event: 'pavilion_product_viewed'; pavilionId?: unknown; productId?: unknown; productCode?: unknown }
    | { event: 'pavilion_catalogue_opened'; pavilionId?: unknown }
    | { event: 'pavilion_contact_opened'; pavilionId?: unknown }
    | { event: 'pavilion_contact_submitted'; pavilionId?: unknown }
    | { event: 'pavilion_meeting_opened'; pavilionId?: unknown }
    | { event: 'meeting_booked'; pavilionId?: unknown }
    | { event: 'quote_request_started'; pavilionId?: unknown; productId?: unknown; productCode?: unknown }
    | { event: 'token_collected'; tokenId?: unknown }
    | { event: 'supplier_portal_opened' }
    | { event: 'product_upload_started' }
    | { event: 'lead_inbox_opened' }
    | { event: 'terminal_nearby' }
    | { event: 'terminal_left' }
    | { event: 'water_nearby' }
    | { event: 'water_left' }
    | { event: 'water_purchase_attempted' }
    | { event: 'water_purchased' }
    | { event: 'dog_mad' }
    | { event: 'dog_calm' }
    | { event: 'wheel' }
    | { event: 'wheel_left' }
    | { event: 'wheel_spun' }
    | { event: 'arena_key_piece_found'; piece?: unknown; pavilionId?: unknown }
    | { event: 'arena_password_submitted'; password?: unknown; success?: unknown }
    | { event: 'arena_completed' }
    | { event: 'arcade_nearby' }
    | { event: 'arcade_left' }
    | { event: 'arcade_prize_won'; amountCents?: unknown; gameTitle?: unknown }
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
    questProgress: QuestProgress[];
    questRewards: QuestRewardState[];
    lastCompletedQuestId: string | null;
    walletBalanceCents: number;
    walletTransactions: WalletTransaction[];
    arenaKeyPieces: string[];
    hasArenaAccess: boolean;
    arcadeKey: string | null;
    waterPurchased: boolean;
    wheelCoupon: string | null;
    wheelSpinsRemaining: number;
    lastDogMood: 'mad' | 'calm' | null;
};
