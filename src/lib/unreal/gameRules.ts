export const GAME_RULES = {
    zombieArena: {
        startingHealth: 150,
        zombieKillPoints: 10,
        playerHitDamage: 8,
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
        completionRewardCoins: 150,
        arcadeKeyReward: 'WHEEL-7',
    },
    water: {
        bottleName: 'EVIAN 0.5L',
        bottlePriceEuro: 0.79,
        bottlePriceCoins: 160,
        coinRateLabel: '1 coin = 0.5 euro cent / 0.44 RUB',
        productsToShow: 30,
    },
    keys: {
        firstHalf: 'J2',
        secondHalf: 'B3',
        arenaPassword: 'J2B3',
    },
    wheel: {
        couponCode: 'WATER-FIRST-BUYER',
        maxSpins: 1,
    },
    arcade: {
        maxTransactionCents: 12,
        maxSessionWalletCents: 60,
        maxPlaysPerOpen: 5,
        signalMatchSeconds: 8,
        games: [
            { id: 'pulse-runner', prizeCents: 2, bonusCents: 8 },
            { id: 'signal-match', prizeCents: 3, bonusCents: 10 },
            { id: 'vault-drop', prizeCents: 2, bonusCents: 6 },
        ],
    },
} as const;
