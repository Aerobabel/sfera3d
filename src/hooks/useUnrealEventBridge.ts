'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyQuestEvent, createInitialQuestProgress, getQuestDefinition } from '@/lib/quests';
import { GAME_RULES } from '@/lib/unreal/gameRules';
import type { ArenaMoment, UnrealEventBridgeState, UnrealPixelStreamingEvent, WalletTransaction } from '@/lib/unreal/types';

const ACCESS_DENIED_PLAYER_MODE_NEEDED = 'Switch to Player Mode to enter game zones.';
const ACCESS_DENIED_ARENA_KEY_NEEDED = 'Zombie Hall locked. Find the supplier key fragments in Sfera Hall first.';
const MAX_RECENT_ACTIVITY = 8;
const MAX_ARENA_MOMENTS = 5;
const PERSISTED_STATE_KEY = '3dsfera:player-progress:v2';
const ARENA_KEY_PIECES = [GAME_RULES.keys.firstHalf, GAME_RULES.keys.secondHalf] as const;
const WATER_ARENA_QUEST_ID = 'water_arena_run';

type ProximityTrigger = 'terminal' | 'water' | 'arcade' | 'wheel';

const PROXIMITY_ENTER_EVENTS: Readonly<Record<string, ProximityTrigger>> = {
    terminal_nearby: 'terminal',
    water_nearby: 'water',
    arcade_nearby: 'arcade',
    wheel: 'wheel',
};

const PROXIMITY_LEAVE_EVENTS: Readonly<Record<string, ProximityTrigger>> = {
    terminal_left: 'terminal',
    water_left: 'water',
    arcade_left: 'arcade',
    wheel_left: 'wheel',
};

const resolveZombieRank = (score: number) => {
    const rank = [...GAME_RULES.zombieArena.ranks]
        .reverse()
        .find((candidate) => score >= candidate.minScore);
    return rank?.label ?? GAME_RULES.zombieArena.ranks[0].label;
};

const resolveThreatLevel = (kills: number) =>
    Math.min(GAME_RULES.zombieArena.maxThreatLevel, Math.floor(kills / 5) + 1);

const resolvePrizeAmountCents = (value: unknown) => {
    const amount = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.min(Math.round(amount), GAME_RULES.arcade.maxTransactionCents);
};

const resolveGameTitle = (value: unknown) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 80) : 'Sfera Arcade';

const formatWalletAmount = (amountCents: number) =>
    amountCents.toLocaleString('en-US');

const INITIAL_STATE: UnrealEventBridgeState = {
    currentMode: 'shopper',
    currentLocation: 'city',
    currentGame: null,
    isInGame: false,
    zombieScore: 0,
    zombieHealth: GAME_RULES.zombieArena.startingHealth,
    zombieGameOver: false,
    zombieKills: 0,
    playerHits: 0,
    zombieCombo: 0,
    maxZombieCombo: 0,
    zombieCoins: 0,
    zombieThreatLevel: 1,
    zombieRank: resolveZombieRank(0),
    arenaMoments: [],
    lastUnrealEvent: null,
    accessDeniedMessage: null,
    recentActivity: [],
    questProgress: createInitialQuestProgress(),
    questRewards: [],
    lastCompletedQuestId: null,
    walletBalanceCents: 0,
    walletTransactions: [],
    arenaKeyPieces: [],
    hasArenaAccess: false,
    arcadeKey: null,
    waterKey: null,
    waterPurchased: false,
    wheelCoupon: null,
    wheelSpinsRemaining: 0,
    lastDogMood: null,
};

type PersistedBridgeState = Pick<
    UnrealEventBridgeState,
    | 'currentMode'
    | 'questProgress'
    | 'questRewards'
    | 'walletBalanceCents'
    | 'walletTransactions'
    | 'recentActivity'
    | 'arenaKeyPieces'
    | 'hasArenaAccess'
    | 'arcadeKey'
    | 'waterKey'
    | 'waterPurchased'
    | 'wheelCoupon'
    | 'wheelSpinsRemaining'
    | 'lastDogMood'
>;

const hasWaterArenaPayout = (questRewards: UnrealEventBridgeState['questRewards']) =>
    questRewards.some((reward) => reward.questId === WATER_ARENA_QUEST_ID && reward.kind === 'coins');

const resetUnfinishedArenaKillProgress = (
    questProgress: UnrealEventBridgeState['questProgress']
) => questProgress.map((progress) => {
    if (progress.questId !== WATER_ARENA_QUEST_ID) return progress;

    const clearZombies = progress.objectives.clear_zombies;
    if (!clearZombies) return progress;

    return {
        ...progress,
        status: 'active' as const,
        completedAt: undefined,
        objectives: {
            ...progress.objectives,
            clear_zombies: {
                ...clearZombies,
                current: 0,
                completed: false,
            },
        },
    };
});

const normalizePersistedRewards = (questRewards: UnrealEventBridgeState['questRewards']) =>
    questRewards.filter((reward) => reward.questId !== 'player_arena_trial' && reward.questId !== 'city_token_hunt');

const normalizePersistedQuestProgress = (questProgress: UnrealEventBridgeState['questProgress']) => {
    const currentQuestIds = new Set(INITIAL_STATE.questProgress.map((progress) => progress.questId));
    const normalizedProgress = questProgress.filter((progress) => currentQuestIds.has(progress.questId));
    const normalizedIds = new Set(normalizedProgress.map((progress) => progress.questId));
    const missingProgress = INITIAL_STATE.questProgress.filter((progress) => !normalizedIds.has(progress.questId));

    return [...normalizedProgress, ...missingProgress];
};

const createPersistedQuestRewardTransaction = (
    reward: UnrealEventBridgeState['questRewards'][number]
): WalletTransaction | null => {
    const quest = getQuestDefinition(reward.questId);
    if (!quest || reward.kind !== 'coins' || typeof quest.reward.value !== 'number') return null;

    return {
        id: `${reward.questId}:${reward.kind}`,
        kind: 'quest_reward',
        label: quest.reward.label.en,
        amountCents: quest.reward.value,
        createdAt: reward.earnedAt,
    };
};

const normalizePersistedWallet = (
    questRewards: UnrealEventBridgeState['questRewards'],
    walletTransactions: UnrealEventBridgeState['walletTransactions']
) => {
    const questTransactions = questRewards
        .map(createPersistedQuestRewardTransaction)
        .filter((transaction): transaction is WalletTransaction => Boolean(transaction));
    const nonQuestTransactions = walletTransactions.filter((transaction) => transaction.kind !== 'quest_reward');
    const transactions = [...questTransactions, ...nonQuestTransactions].slice(0, 12);
    const balance = Math.max(
        0,
        transactions.reduce((total, transaction) => total + transaction.amountCents, 0)
    );

    return { walletBalanceCents: balance, walletTransactions: transactions };
};

const isPersistedBridgeState = (value: unknown): value is Partial<PersistedBridgeState> => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<PersistedBridgeState>;
    return (
        (candidate.currentMode === undefined || candidate.currentMode === 'player' || candidate.currentMode === 'shopper') &&
        (candidate.questProgress === undefined || Array.isArray(candidate.questProgress)) &&
        (candidate.questRewards === undefined || Array.isArray(candidate.questRewards)) &&
        (candidate.walletBalanceCents === undefined || typeof candidate.walletBalanceCents === 'number') &&
        (candidate.walletTransactions === undefined || Array.isArray(candidate.walletTransactions)) &&
        (candidate.recentActivity === undefined || Array.isArray(candidate.recentActivity)) &&
        (candidate.arenaKeyPieces === undefined || Array.isArray(candidate.arenaKeyPieces)) &&
        (candidate.hasArenaAccess === undefined || typeof candidate.hasArenaAccess === 'boolean') &&
        (candidate.arcadeKey === undefined || candidate.arcadeKey === null || typeof candidate.arcadeKey === 'string') &&
        (candidate.waterKey === undefined || candidate.waterKey === null || typeof candidate.waterKey === 'string') &&
        (candidate.waterPurchased === undefined || typeof candidate.waterPurchased === 'boolean') &&
        (candidate.wheelCoupon === undefined || candidate.wheelCoupon === null || typeof candidate.wheelCoupon === 'string') &&
        (candidate.wheelSpinsRemaining === undefined || typeof candidate.wheelSpinsRemaining === 'number') &&
        (candidate.lastDogMood === undefined || candidate.lastDogMood === null || candidate.lastDogMood === 'mad' || candidate.lastDogMood === 'calm')
    );
};

const readPersistedBridgeState = (): UnrealEventBridgeState => {
    if (typeof window === 'undefined') return INITIAL_STATE;

    try {
        const raw = window.localStorage.getItem(PERSISTED_STATE_KEY);
        if (!raw) return INITIAL_STATE;

        const parsed = JSON.parse(raw) as unknown;
        if (!isPersistedBridgeState(parsed)) return INITIAL_STATE;
        const arenaKeyPieces = parsed.arenaKeyPieces ?? INITIAL_STATE.arenaKeyPieces;
        const hasVerifiedArenaAccess =
            Boolean(parsed.hasArenaAccess) &&
            ARENA_KEY_PIECES.every((piece) => arenaKeyPieces.includes(piece));
        const questRewards = normalizePersistedRewards(parsed.questRewards ?? INITIAL_STATE.questRewards);
        const hasArenaPayout = hasWaterArenaPayout(questRewards);
        const normalizedQuestProgress = normalizePersistedQuestProgress(parsed.questProgress ?? INITIAL_STATE.questProgress);
        const questProgress = hasArenaPayout
            ? normalizedQuestProgress
            : resetUnfinishedArenaKillProgress(normalizedQuestProgress);
        const waterPurchased = Boolean(parsed.waterPurchased) && hasArenaPayout;
        const wallet = normalizePersistedWallet(
            questRewards,
            parsed.walletTransactions ?? INITIAL_STATE.walletTransactions
        );

        const restoredState: UnrealEventBridgeState = {
            ...INITIAL_STATE,
            currentMode: parsed.currentMode ?? INITIAL_STATE.currentMode,
            questProgress,
            questRewards,
            walletBalanceCents: wallet.walletBalanceCents,
            walletTransactions: wallet.walletTransactions,
            recentActivity: parsed.recentActivity ?? INITIAL_STATE.recentActivity,
            arenaKeyPieces,
            hasArenaAccess: hasVerifiedArenaAccess,
            arcadeKey: parsed.arcadeKey ?? INITIAL_STATE.arcadeKey,
            waterKey: parsed.waterKey ?? INITIAL_STATE.waterKey,
            waterPurchased,
            wheelCoupon: waterPurchased ? parsed.wheelCoupon ?? INITIAL_STATE.wheelCoupon : INITIAL_STATE.wheelCoupon,
            wheelSpinsRemaining: waterPurchased ? parsed.wheelSpinsRemaining ?? INITIAL_STATE.wheelSpinsRemaining : INITIAL_STATE.wheelSpinsRemaining,
            lastDogMood: parsed.lastDogMood ?? INITIAL_STATE.lastDogMood,
        };

        return restoredState;
    } catch {
        return INITIAL_STATE;
    }
};

const persistBridgeState = (state: UnrealEventBridgeState) => {
    if (typeof window === 'undefined') return;

    const persisted: PersistedBridgeState = {
        currentMode: state.currentMode,
        questProgress: state.questProgress,
        questRewards: state.questRewards,
        walletBalanceCents: state.walletBalanceCents,
        walletTransactions: state.walletTransactions,
        recentActivity: state.recentActivity,
        arenaKeyPieces: state.arenaKeyPieces,
        hasArenaAccess: state.hasArenaAccess,
        arcadeKey: state.arcadeKey,
        waterKey: state.waterKey,
        waterPurchased: state.waterPurchased,
        wheelCoupon: state.wheelCoupon,
        wheelSpinsRemaining: state.wheelSpinsRemaining,
        lastDogMood: state.lastDogMood,
    };

    try {
        window.localStorage.setItem(PERSISTED_STATE_KEY, JSON.stringify(persisted));
    } catch {
        // Ignore storage failures; gameplay should still work in private mode.
    }
};

const parseUnrealEvent = (message: string): UnrealPixelStreamingEvent | null => {
    try {
        const parsed = JSON.parse(message) as unknown;
        if (!parsed || typeof parsed !== 'object') return null;
        const event = (parsed as Record<string, unknown>).event;
        if (typeof event !== 'string' || event.trim().length === 0) return null;
        return parsed as UnrealPixelStreamingEvent;
    } catch {
        return null;
    }
};

const withActivity = (previous: string[], label: string) => [label, ...previous].slice(0, MAX_RECENT_ACTIVITY);

const withArenaMoment = (previous: ArenaMoment[], moment: Omit<ArenaMoment, 'id'>) => [
    { ...moment, id: Date.now() + Math.floor(Math.random() * 1000) },
    ...previous,
].slice(0, MAX_ARENA_MOMENTS);

const questCompletionActivity = (questId: string) => {
    const quest = getQuestDefinition(questId);
    return `Quest completed: ${quest?.title.en ?? questId}`;
};

const normalizeKeyPiece = (value: unknown) => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
    return ARENA_KEY_PIECES.find((piece) => piece === normalized) ?? null;
};

const hasAllArenaKeyPieces = (pieces: string[]) =>
    ARENA_KEY_PIECES.every((piece) => pieces.includes(piece));

function createWalletTransaction(
    kind: 'arcade_win' | 'quest_reward' | 'water_purchase',
    label: string,
    amountCents: number
) {
    return {
        id: `${kind}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        kind,
        label,
        amountCents,
        createdAt: Date.now(),
    };
}

function grantWaterArenaPayout(state: UnrealEventBridgeState): UnrealEventBridgeState {
    if (hasWaterArenaPayout(state.questRewards)) return state;

    const quest = getQuestDefinition(WATER_ARENA_QUEST_ID);
    if (!quest || quest.reward.kind !== 'coins' || typeof quest.reward.value !== 'number') return state;

    const earnedAt = Date.now();
    const questProgress = state.questProgress.map((progress) => {
        if (progress.questId !== WATER_ARENA_QUEST_ID) return progress;

        return {
            ...progress,
            status: 'completed' as const,
            completedAt: progress.completedAt ?? earnedAt,
            objectives: Object.fromEntries(
                Object.entries(progress.objectives).map(([objectiveId, objective]) => [
                    objectiveId,
                    {
                        ...objective,
                        current: objective.target,
                        completed: true,
                    },
                ])
            ),
        };
    });

    return {
        ...state,
        questProgress,
        questRewards: [
            ...state.questRewards,
            {
                id: `${quest.id}:${quest.reward.kind}`,
                questId: quest.id,
                kind: quest.reward.kind,
                value: quest.reward.value,
                status: 'earned',
                earnedAt,
            },
        ],
        lastCompletedQuestId: WATER_ARENA_QUEST_ID,
        walletBalanceCents: state.walletBalanceCents + quest.reward.value,
        walletTransactions: [
            createWalletTransaction('quest_reward', quest.reward.label.en, quest.reward.value),
            ...state.walletTransactions,
        ].slice(0, 12),
        recentActivity: withActivity(state.recentActivity, questCompletionActivity(WATER_ARENA_QUEST_ID)),
    };
}

const withQuestUpdate = (
    nextState: UnrealEventBridgeState,
    unrealEvent: UnrealPixelStreamingEvent
): UnrealEventBridgeState => {
    const questUpdate = applyQuestEvent(
        nextState.questProgress,
        nextState.questRewards,
        unrealEvent
    );
    const lastCompletedQuestId =
        questUpdate.completedQuestIds.length > 0
            ? questUpdate.completedQuestIds[questUpdate.completedQuestIds.length - 1]
            : null;
    const recentActivity = questUpdate.completedQuestIds.reduce(
        (activity, questId) => withActivity(activity, questCompletionActivity(questId)),
        nextState.recentActivity
    );
    let walletBalanceCents = nextState.walletBalanceCents;
    let walletTransactions = nextState.walletTransactions;
    const arcadeKey = nextState.arcadeKey;

    for (const questId of questUpdate.completedQuestIds) {
        const quest = getQuestDefinition(questId);
        if (!quest) continue;

        if (quest.reward.kind === 'coins' && typeof quest.reward.value === 'number') {
            walletBalanceCents += quest.reward.value;
            walletTransactions = [
                createWalletTransaction('quest_reward', quest.reward.label.en, quest.reward.value),
                ...walletTransactions,
            ].slice(0, 12);
        }
    }

    return {
        ...nextState,
        questProgress: questUpdate.questProgress,
        questRewards: questUpdate.questRewards,
        lastCompletedQuestId,
        recentActivity,
        walletBalanceCents,
        walletTransactions,
        arcadeKey,
    };
};

export const useUnrealEventBridge = () => {
    const [state, setState] = useState<UnrealEventBridgeState>(readPersistedBridgeState);
    // Unreal may emit overlap events on every movement/frame while the player
    // remains inside a trigger volume. Latch each proximity trigger until its
    // matching `*_left` event so dismissing an overlay does not immediately
    // reopen it while the player is walking out of the volume.
    const activeProximityTriggersRef = useRef<Set<ProximityTrigger>>(new Set());

    useEffect(() => {
        persistBridgeState(state);
    }, [state]);

    const handleUnrealResponse = useCallback((message: string): UnrealPixelStreamingEvent | null => {
        const unrealEvent = parseUnrealEvent(message);
        if (!unrealEvent) return null;

        const enteringTrigger = PROXIMITY_ENTER_EVENTS[unrealEvent.event];
        if (enteringTrigger) {
            if (activeProximityTriggersRef.current.has(enteringTrigger)) {
                return unrealEvent;
            }
            activeProximityTriggersRef.current.add(enteringTrigger);
        }

        const leavingTrigger = PROXIMITY_LEAVE_EVENTS[unrealEvent.event];
        if (leavingTrigger) {
            activeProximityTriggersRef.current.delete(leavingTrigger);
        }

        if (process.env.NODE_ENV === 'development') {
            console.info('[UE→Web] normalized event:', unrealEvent);
        }

        setState((previous) => {
            const nextBase = {
                ...previous,
                lastUnrealEvent: unrealEvent,
                accessDeniedMessage: null,
            } satisfies UnrealEventBridgeState;

            switch (unrealEvent.event) {
                case 'mode_changed': {
                    if (unrealEvent.mode !== 'player' && unrealEvent.mode !== 'shopper') {
                        return withQuestUpdate(nextBase, unrealEvent);
                    }
                    return withQuestUpdate({
                        ...nextBase,
                        currentMode: unrealEvent.mode,
                        recentActivity: withActivity(previous.recentActivity, `Mode changed to ${unrealEvent.mode === 'player' ? 'Player Mode' : 'Shopper Mode'}`),
                    }, unrealEvent);
                }
                case 'portal_entered': {
                    if (unrealEvent.portal !== 'SferaHall') {
                        return withQuestUpdate(nextBase, unrealEvent);
                    }
                    return withQuestUpdate({
                        ...nextBase,
                        currentLocation: 'sferaHall',
                        currentGame: null,
                        isInGame: false,
                        recentActivity: withActivity(previous.recentActivity, 'Entered Sfera Hall'),
                    }, unrealEvent);
                }
                case 'game_entered': {
                    if (unrealEvent.game !== 'ZombieArena') {
                        return withQuestUpdate(nextBase, unrealEvent);
                    }
                    // Unreal entrance volumes may emit the same event on every
                    // overlap frame. Once the arena is active, ignore repeats so
                    // they cannot reset combat state or restart web transitions.
                    if (
                        previous.currentGame === 'ZombieArena' &&
                        previous.currentLocation === 'zombieArena' &&
                        previous.isInGame
                    ) {
                        return previous;
                    }
                    if (!previous.hasArenaAccess || !hasAllArenaKeyPieces(previous.arenaKeyPieces)) {
                        const deniedEvent = {
                            event: 'game_access_denied',
                            game: 'ZombieArena',
                            reason: 'arena_key_required',
                        } satisfies UnrealPixelStreamingEvent;
                        return withQuestUpdate({
                            ...nextBase,
                            lastUnrealEvent: deniedEvent,
                            currentGame: null,
                            isInGame: false,
                            accessDeniedMessage: ACCESS_DENIED_ARENA_KEY_NEEDED,
                            recentActivity: withActivity(previous.recentActivity, 'Zombie Hall locked: supplier code required'),
                        }, deniedEvent);
                    }
                    return withQuestUpdate({
                        ...nextBase,
                        questProgress: hasWaterArenaPayout(previous.questRewards)
                            ? previous.questProgress
                            : resetUnfinishedArenaKillProgress(previous.questProgress),
                        currentLocation: 'zombieArena',
                        currentGame: 'ZombieArena',
                        isInGame: true,
                        zombieScore: 0,
                        zombieHealth: GAME_RULES.zombieArena.startingHealth,
                        zombieGameOver: false,
                        zombieKills: 0,
                        playerHits: 0,
                        zombieCombo: 0,
                        maxZombieCombo: 0,
                        zombieCoins: 0,
                        zombieThreatLevel: 1,
                        zombieRank: resolveZombieRank(0),
                        arenaMoments: withArenaMoment([], {
                            kind: 'rank',
                            title: 'Arena run started',
                            description: 'Build a combo streak, protect your health, and climb the survivor rank.',
                        }),
                        recentActivity: withActivity(previous.recentActivity, 'Entered Zombie Arena'),
                    }, unrealEvent);
                }
                case 'game_access_denied':
                    if (unrealEvent.reason === 'arena_key_required') {
                        return withQuestUpdate({
                            ...nextBase,
                            accessDeniedMessage: ACCESS_DENIED_ARENA_KEY_NEEDED,
                            recentActivity: withActivity(previous.recentActivity, 'Zombie Arena locked: key required'),
                        }, unrealEvent);
                    }
                    return withQuestUpdate({
                        ...nextBase,
                        accessDeniedMessage: ACCESS_DENIED_PLAYER_MODE_NEEDED,
                        recentActivity: withActivity(previous.recentActivity, 'Game access denied: Player Mode needed'),
                    }, unrealEvent);
                case 'zombie_killed': {
                    const zombieKills = previous.zombieKills + 1;
                    const zombieCombo = previous.zombieCombo + 1;
                    const comboBonusUnlocked = zombieCombo % GAME_RULES.zombieArena.comboBonusEveryKills === 0;
                    const pointsEarned = GAME_RULES.zombieArena.zombieKillPoints + (comboBonusUnlocked ? GAME_RULES.zombieArena.comboBonusPoints : 0);
                    const zombieScore = previous.zombieScore + pointsEarned;
                    const zombieRank = resolveZombieRank(zombieScore);
                    const rankedUp = zombieRank !== previous.zombieRank;
                    const arenaCleared = zombieKills >= GAME_RULES.zombieArena.zombiesPerRun;
                    const moment = arenaCleared
                        ? {
                            kind: 'game_over' as const,
                            title: 'Zombie Hall cleared',
                            description: `5 zombies down. Arena reward is enough to buy ${GAME_RULES.water.bottleName}.`,
                        }
                        : rankedUp
                        ? {
                            kind: 'rank' as const,
                            title: `Rank up: ${zombieRank}`,
                            description: `Score ${zombieScore} reached. Rewards preview increased.`,
                        }
                        : comboBonusUnlocked
                          ? {
                              kind: 'combo' as const,
                              title: `${zombieCombo}x combo bonus!`,
                              description: `+${pointsEarned} points. Keep the streak alive for stronger rewards.`,
                          }
                          : {
                              kind: 'kill' as const,
                              title: '+1 zombie cleared',
                              description: `+${pointsEarned} arena points. Clear all 5 zombies for the water payout.`,
                          };

                    const updatedState = withQuestUpdate({
                        ...nextBase,
                        zombieKills,
                        zombieCombo,
                        maxZombieCombo: Math.max(previous.maxZombieCombo, zombieCombo),
                        zombieScore,
                        zombieGameOver: false,
                        zombieCoins: previous.zombieCoins + GAME_RULES.zombieArena.coinsPerKill,
                        zombieThreatLevel: resolveThreatLevel(zombieKills),
                        zombieRank,
                        arenaMoments: withArenaMoment(previous.arenaMoments, moment),
                        recentActivity: withActivity(previous.recentActivity, arenaCleared ? 'Zombie Hall cleared: arena payout earned for water' : comboBonusUnlocked ? `Zombie killed — ${zombieCombo}x combo` : 'Zombie killed'),
                    }, unrealEvent);

                    return arenaCleared ? grantWaterArenaPayout(updatedState) : updatedState;
                }
                case 'player_hit': {
                    // The current Unreal arena has no player-death state. Keep
                    // the frontend health display non-lethal and use hits only
                    // to break the combo and drive the damage feedback.
                    const zombieHealth = Math.max(1, previous.zombieHealth - GAME_RULES.zombieArena.playerHitDamage);
                    return withQuestUpdate({
                        ...nextBase,
                        zombieHealth,
                        zombieGameOver: false,
                        playerHits: previous.playerHits + 1,
                        zombieCombo: 0,
                        accessDeniedMessage: null,
                        arenaMoments: withArenaMoment(previous.arenaMoments, {
                            kind: 'hit',
                            title: 'Combo broken',
                            description: `-${GAME_RULES.zombieArena.playerHitDamage} health. Dodge the next attack to rebuild your streak.`,
                        }),
                        recentActivity: withActivity(previous.recentActivity, 'Player hit — combo reset'),
                    }, unrealEvent);
                }
                case 'returned_to_city':
                    return withQuestUpdate({
                        ...nextBase,
                        currentLocation: 'city',
                        currentGame: null,
                        isInGame: false,
                        zombieGameOver: false,
                        zombieCombo: 0,
                        accessDeniedMessage: null,
                        recentActivity: withActivity(previous.recentActivity, 'Returned to city'),
                    }, unrealEvent);
                case 'terminal_nearby':
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, 'Reward ATM opened'),
                    }, unrealEvent);
                case 'terminal_left':
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, 'Left Reward ATM'),
                    }, unrealEvent);
                case 'water_nearby':
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, 'Water dispenser opened'),
                    }, unrealEvent);
                case 'water_left':
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, 'Left water dispenser'),
                    }, unrealEvent);
                case 'water_purchased': {
                    const hasArenaPayout = hasWaterArenaPayout(previous.questRewards);
                    if (
                        previous.waterPurchased ||
                        !hasArenaPayout ||
                        previous.walletBalanceCents < GAME_RULES.water.bottlePriceCoins
                    ) {
                        return withQuestUpdate(nextBase, unrealEvent);
                    }

                    return withQuestUpdate({
                        ...nextBase,
                        walletBalanceCents: previous.walletBalanceCents - GAME_RULES.water.bottlePriceCoins,
                        walletTransactions: [
                            createWalletTransaction('water_purchase', GAME_RULES.water.bottleName, -GAME_RULES.water.bottlePriceCoins),
                            ...previous.walletTransactions,
                        ].slice(0, 12),
                        waterPurchased: true,
                        wheelCoupon: GAME_RULES.wheel.couponCode,
                        wheelSpinsRemaining: GAME_RULES.wheel.maxSpins,
                        recentActivity: withActivity(previous.recentActivity, 'Water purchased: wheel coupon unlocked'),
                    }, unrealEvent);
                }
                case 'arena_key_piece_found': {
                    const piece = normalizeKeyPiece(unrealEvent.piece);
                    if (!piece || previous.arenaKeyPieces.includes(piece)) {
                        return withQuestUpdate(nextBase, unrealEvent);
                    }

                    const arenaKeyPieces = [...previous.arenaKeyPieces, piece];
                    return withQuestUpdate({
                        ...nextBase,
                        arenaKeyPieces,
                        recentActivity: withActivity(previous.recentActivity, `Arena key piece found: ${piece}`),
                    }, unrealEvent);
                }
                case 'arena_password_submitted': {
                    const password = typeof unrealEvent.password === 'string'
                        ? unrealEvent.password.trim().toUpperCase().replace(/\s+/g, '')
                        : '';
                    const hasFragments = hasAllArenaKeyPieces(previous.arenaKeyPieces);
                    const success = hasFragments && (password === GAME_RULES.keys.arenaPassword || unrealEvent.success === true);

                    return withQuestUpdate({
                        ...nextBase,
                        hasArenaAccess: success || previous.hasArenaAccess,
                        accessDeniedMessage: success ? null : ACCESS_DENIED_ARENA_KEY_NEEDED,
                        recentActivity: withActivity(previous.recentActivity, success ? 'Arena password accepted' : 'Arena password rejected'),
                    }, unrealEvent);
                }
                case 'arena_completed':
                    if (previous.zombieKills < GAME_RULES.zombieArena.zombiesPerRun) {
                        return previous;
                    }
                    return grantWaterArenaPayout(withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, `Zombie Arena cleared: water payout ready for ${GAME_RULES.water.bottleName}`),
                    }, unrealEvent));
                case 'wheel':
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, 'Wheel of Fortune opened'),
                    }, unrealEvent);
                case 'wheel_left':
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, 'Left Wheel of Fortune'),
                    }, unrealEvent);
                case 'wheel_spun':
                    return withQuestUpdate({
                        ...nextBase,
                        wheelSpinsRemaining: Math.max(0, previous.wheelSpinsRemaining - 1),
                        recentActivity: withActivity(previous.recentActivity, 'Wheel of Fortune spin used'),
                    }, unrealEvent);
                case 'arcade_nearby':
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, 'Sfera Arcade opened'),
                    }, unrealEvent);
                case 'arcade_left':
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, 'Left Sfera Arcade'),
                    }, unrealEvent);
                case 'arcade_prize_won': {
                    const requestedAmountCents = resolvePrizeAmountCents(unrealEvent.amountCents);
                    const sessionArcadeCoins = previous.walletTransactions
                        .filter((transaction) => transaction.kind === 'arcade_win')
                        .reduce((sum, transaction) => sum + Math.max(0, transaction.amountCents), 0);
                    const remainingSessionCents = Math.max(
                        0,
                        GAME_RULES.arcade.maxSessionWalletCents - sessionArcadeCoins
                    );
                    const amountCents = Math.min(requestedAmountCents, remainingSessionCents);
                    if (amountCents <= 0) {
                        return withQuestUpdate(nextBase, unrealEvent);
                    }

                    const gameTitle = resolveGameTitle(unrealEvent.gameTitle);
                    const transaction = {
                        id: `arcade-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        kind: 'arcade_win' as const,
                        label: gameTitle,
                        amountCents,
                        createdAt: Date.now(),
                    };

                    return withQuestUpdate({
                        ...nextBase,
                        walletBalanceCents: previous.walletBalanceCents + amountCents,
                        walletTransactions: [transaction, ...previous.walletTransactions].slice(0, 12),
                        recentActivity: withActivity(previous.recentActivity, `+${formatWalletAmount(amountCents)} arcade reward at ${gameTitle}`),
                    }, unrealEvent);
                }
                default:
                    return withQuestUpdate(nextBase, unrealEvent);
            }
        });

        return unrealEvent;
    }, []);

    return useMemo(() => ({ ...state, handleUnrealResponse }), [state, handleUnrealResponse]);
};

export const useUnrealPixelStreamingEvents = useUnrealEventBridge;
