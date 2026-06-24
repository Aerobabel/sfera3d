'use client';

import { useCallback, useMemo, useState } from 'react';
import { applyQuestEvent, createInitialQuestProgress, getQuestDefinition } from '@/lib/quests';
import { GAME_RULES } from '@/lib/unreal/gameRules';
import type { ArenaMoment, UnrealEventBridgeState, UnrealPixelStreamingEvent } from '@/lib/unreal/types';

const ACCESS_DENIED_PLAYER_MODE_NEEDED = 'Switch to Player Mode to enter game zones.';
const MAX_RECENT_ACTIVITY = 8;
const MAX_ARENA_MOMENTS = 5;

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
    `$${(amountCents / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

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

    return {
        ...nextState,
        questProgress: questUpdate.questProgress,
        questRewards: questUpdate.questRewards,
        lastCompletedQuestId,
        recentActivity,
    };
};

export const useUnrealEventBridge = () => {
    const [state, setState] = useState<UnrealEventBridgeState>(INITIAL_STATE);

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
                    const moment = rankedUp
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
                        zombieCoins: previous.zombieCoins + GAME_RULES.zombieArena.coinsPerKill,
                        zombieThreatLevel: resolveThreatLevel(zombieKills),
                        zombieRank,
                        arenaMoments: withArenaMoment(previous.arenaMoments, moment),
                        recentActivity: withActivity(previous.recentActivity, comboBonusUnlocked ? `Zombie killed — ${zombieCombo}x combo` : 'Zombie killed'),
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
                    const remainingSessionCents = Math.max(
                        0,
                        GAME_RULES.arcade.maxSessionWalletCents - previous.walletBalanceCents
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
