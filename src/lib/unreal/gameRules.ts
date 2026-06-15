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
} as const;
