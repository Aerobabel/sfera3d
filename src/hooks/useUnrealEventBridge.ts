'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyQuestEvent, createInitialQuestProgress, getQuestDefinition } from '@/lib/quests';
import { GAME_RULES } from '@/lib/unreal/gameRules';
import type { ArenaMoment, UnrealEventBridgeState, UnrealPixelStreamingEvent } from '@/lib/unreal/types';

const ACCESS_DENIED_PLAYER_MODE_NEEDED = 'Switch to Player Mode to enter game zones.';
const ACCESS_DENIED_ARENA_KEY_NEEDED = 'Zombie Hall locked. Find the supplier key fragments in Sfera Hall first.';
const MAX_RECENT_ACTIVITY = 8;
const MAX_ARENA_MOMENTS = 5;
const PERSISTED_STATE_KEY = '3dsfera:player-progress:v2';
const ARENA_KEY_PIECES = [GAME_RULES.keys.firstHalf, GAME_RULES.keys.secondHalf] as const;

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
    `${amountCents.toLocaleString('en-US')} coins`;

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
    questRewards.some((reward) => reward.questId === 'water_arena_run' && reward.kind === 'coins');

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
        const questRewards = parsed.questRewards ?? INITIAL_STATE.questRewards;
        const hasArenaPayout = hasWaterArenaPayout(questRewards);
        const waterPurchased = Boolean(parsed.waterPurchased) && hasArenaPayout;

        return {
            ...INITIAL_STATE,
            currentMode: parsed.currentMode ?? INITIAL_STATE.currentMode,
            questProgress: parsed.questProgress ?? INITIAL_STATE.questProgress,
            questRewards,
            walletBalanceCents: parsed.walletBalanceCents ?? INITIAL_STATE.walletBalanceCents,
            walletTransactions: parsed.walletTransactions ?? INITIAL_STATE.walletTransactions,
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

const createWalletTransaction = (
    kind: 'arcade_win' | 'quest_reward' | 'water_purchase',
    label: string,
    amountCents: number
) => ({
    id: `${kind}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    kind,
    label,
    amountCents,
    createdAt: Date.now(),
});

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

    useEffect(() => {
        persistBridgeState(state);
    }, [state]);

    const handleUnrealResponse = useCallback((message: string): UnrealPixelStreamingEvent | null => {
        const unrealEvent = parseUnrealEvent(message);
        if (!unrealEvent) return null;

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
                        arenaMoments: withArenaMoment(previous.arenaMoments, {
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
                    const arenaCleared = zombieKills >= 5;
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
                              description: `+${pointsEarned} points and +${GAME_RULES.zombieArena.coinsPerKill} coins preview.`,
                          };

                    return withQuestUpdate({
                        ...nextBase,
                        zombieKills,
                        zombieCombo,
                        maxZombieCombo: Math.max(previous.maxZombieCombo, zombieCombo),
                        zombieScore,
                        zombieGameOver: arenaCleared,
                        zombieCoins: previous.zombieCoins + GAME_RULES.zombieArena.coinsPerKill,
                        zombieThreatLevel: resolveThreatLevel(zombieKills),
                        zombieRank,
                        arenaMoments: withArenaMoment(previous.arenaMoments, moment),
                        recentActivity: withActivity(previous.recentActivity, arenaCleared ? 'Zombie Hall cleared: 160 coins earned for water' : comboBonusUnlocked ? `Zombie killed — ${zombieCombo}x combo` : 'Zombie killed'),
                    }, unrealEvent);
                }
                case 'player_hit': {
                    const zombieHealth = Math.max(0, previous.zombieHealth - GAME_RULES.zombieArena.playerHitDamage);
                    const zombieGameOver = zombieHealth <= 0;
                    return withQuestUpdate({
                        ...nextBase,
                        zombieHealth,
                        zombieGameOver,
                        playerHits: previous.playerHits + 1,
                        zombieCombo: 0,
                        accessDeniedMessage: zombieGameOver ? 'You were overwhelmed' : null,
                        arenaMoments: withArenaMoment(previous.arenaMoments, {
                            kind: zombieGameOver ? 'game_over' : 'hit',
                            title: zombieGameOver ? 'You were overwhelmed' : 'Combo broken',
                            description: zombieGameOver
                                ? `Final score ${previous.zombieScore}. Max combo ${previous.maxZombieCombo}x.`
                                : `-${GAME_RULES.zombieArena.playerHitDamage} health. Dodge the next attack to rebuild your streak.`,
                        }),
                        recentActivity: withActivity(previous.recentActivity, zombieGameOver ? 'You were overwhelmed' : 'Player hit — combo reset'),
                    }, unrealEvent);
                }
                case 'returned_to_city':
                    return withQuestUpdate({
                        ...nextBase,
                        currentLocation: 'city',
                        currentGame: null,
                        isInGame: false,
                        zombieCombo: 0,
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
                case 'dog_mad':
                    return withQuestUpdate({
                        ...nextBase,
                        lastDogMood: 'mad',
                        recentActivity: withActivity(previous.recentActivity, 'Heyy, stay focused haha. Doggy is mad.'),
                    }, unrealEvent);
                case 'dog_calm':
                    return withQuestUpdate({
                        ...nextBase,
                        lastDogMood: 'calm',
                        recentActivity: withActivity(previous.recentActivity, 'Doggy is calm again'),
                    }, unrealEvent);
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
                    return withQuestUpdate({
                        ...nextBase,
                        recentActivity: withActivity(previous.recentActivity, `Zombie Arena cleared: enough coins earned for ${GAME_RULES.water.bottleName}`),
                    }, unrealEvent);
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
                        recentActivity: withActivity(previous.recentActivity, `${formatWalletAmount(amountCents)} won at ${gameTitle}`),
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
