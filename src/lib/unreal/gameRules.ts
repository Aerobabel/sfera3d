export const GAME_RULES = {
    zombieArena: {
        startingHealth: 100,
        zombieKillPoints: 10,
        playerHitDamage: 10,
        coinsPerKill: 2,
        comboBonusEveryKills: 3,
        comboBonusPoints: 15,
        maxThreatLevel: 5,
        rewardPreview: 'Coins convert into arena reward credits after the match.',
        ranks: [
            { minScore: 0, label: 'Rookie Survivor' },
            { minScore: 50, label: 'Arena Fighter' },
            { minScore: 120, label: 'Zombie Hunter' },
            { minScore: 250, label: 'Sfera Champion' },
        ],
    },
    arcade: {
        maxTransactionCents: 12,
        maxSessionWalletCents: 60,
        maxPlaysPerOpen: 5,
        signalMatchSeconds: 8,
        games: [
            { id: 'pulse-runner', prizeCents: 2, bonusCents: 8 },
            { id: 'signal-match', prizeCents: 3, bonusCents: 10 },
            { id: 'vault-drop', prizeCents: 1, bonusCents: 6 },
        ],
    },
} as const;
