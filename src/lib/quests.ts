import type { AppLanguage } from '@/lib/i18n';

export type QuestRole = 'player' | 'shopper' | 'business';

export type QuestStatus = 'active' | 'completed' | 'claimed';

export type QuestRewardKind = 'coins' | 'coupon' | 'badge' | 'sample' | 'lead_boost' | 'gift_code';

export type QuestEventInput = {
    event: string;
    [key: string]: unknown;
};

type LocalizedText = Record<AppLanguage, string>;

export type QuestObjectiveDefinition = {
    id: string;
    event: string;
    count: number;
    label: LocalizedText;
    match?: Record<string, string | number | boolean>;
};

export type QuestRewardDefinition = {
    kind: QuestRewardKind;
    value: string | number;
    label: LocalizedText;
};

export type QuestDefinition = {
    id: string;
    role: QuestRole;
    sponsor?: string;
    title: LocalizedText;
    description: LocalizedText;
    objectives: QuestObjectiveDefinition[];
    reward: QuestRewardDefinition;
};

export type QuestObjectiveProgress = {
    current: number;
    target: number;
    completed: boolean;
};

export type QuestProgress = {
    questId: string;
    role: QuestRole;
    status: QuestStatus;
    objectives: Record<string, QuestObjectiveProgress>;
    completedAt?: number;
};

export type QuestRewardState = {
    id: string;
    questId: string;
    kind: QuestRewardKind;
    value: string | number;
    status: 'earned' | 'claimed';
    earnedAt: number;
};

type QuestUpdateResult = {
    questProgress: QuestProgress[];
    questRewards: QuestRewardState[];
    completedQuestIds: string[];
};

export const QUEST_DEFINITIONS: QuestDefinition[] = [
    {
        id: 'player_arena_trial',
        role: 'player',
        sponsor: '3DSFERA Arena',
        title: {
            en: 'Arena Trial',
            ru: 'Испытание арены',
            zh: '竞技场试炼',
        },
        description: {
            en: 'Switch to Player Mode, enter Zombie Arena, and clear your first wave.',
            ru: 'Переключитесь в режим игрока, войдите в Zombie Arena и очистите первую волну.',
            zh: '切换到玩家模式，进入 Zombie Arena，并清理第一波敌人。',
        },
        objectives: [
            {
                id: 'switch_player',
                event: 'mode_changed',
                count: 1,
                match: { mode: 'player' },
                label: {
                    en: 'Switch to Player Mode',
                    ru: 'Переключиться в режим игрока',
                    zh: '切换到玩家模式',
                },
            },
            {
                id: 'enter_arena',
                event: 'game_entered',
                count: 1,
                match: { game: 'ZombieArena' },
                label: {
                    en: 'Enter Zombie Arena',
                    ru: 'Войти в Zombie Arena',
                    zh: '进入 Zombie Arena',
                },
            },
            {
                id: 'clear_zombies',
                event: 'zombie_killed',
                count: 10,
                label: {
                    en: 'Clear 10 zombies',
                    ru: 'Уничтожить 10 зомби',
                    zh: '清理 10 个敌人',
                },
            },
        ],
        reward: {
            kind: 'coins',
            value: 120,
            label: {
                en: '120 arena coins',
                ru: '120 монет арены',
                zh: '120 竞技场金币',
            },
        },
    },
    {
        id: 'shopper_mira_scout',
        role: 'shopper',
        sponsor: 'Youbo Lighting',
        title: {
            en: 'Mira Scout',
            ru: 'Разведка Mira',
            zh: 'Mira 探索',
        },
        description: {
            en: 'Visit Sfera Hall, enter the Youbo pavilion, inspect a product, and start a supplier chat.',
            ru: 'Посетите Sfera Hall, войдите в павильон Youbo, изучите товар и начните чат с поставщиком.',
            zh: '访问 Sfera Hall，进入 Youbo 展馆，查看商品并开始供应商聊天。',
        },
        objectives: [
            {
                id: 'enter_hall',
                event: 'portal_entered',
                count: 1,
                match: { portal: 'SferaHall' },
                label: {
                    en: 'Enter Sfera Hall',
                    ru: 'Войти в Sfera Hall',
                    zh: '进入 Sfera Hall',
                },
            },
            {
                id: 'enter_youbo_pavilion',
                event: 'pavilion_entered',
                count: 1,
                match: { pavilionId: 'youbo' },
                label: {
                    en: 'Enter the Youbo pavilion',
                    ru: 'Войти в павильон Youbo',
                    zh: '进入 Youbo 展馆',
                },
            },
            {
                id: 'view_youbo_product',
                event: 'pavilion_product_viewed',
                count: 1,
                match: { pavilionId: 'youbo' },
                label: {
                    en: 'Inspect a Youbo product',
                    ru: 'Изучить товар Youbo',
                    zh: '查看 Youbo 商品',
                },
            },
            {
                id: 'ask_supplier',
                event: 'supplier_chat_opened',
                count: 1,
                match: { pavilionId: 'youbo' },
                label: {
                    en: 'Start supplier chat',
                    ru: 'Начать чат с поставщиком',
                    zh: '开始供应商聊天',
                },
            },
        ],
        reward: {
            kind: 'coupon',
            value: 'MIRA_SAMPLE_10',
            label: {
                en: '10% Mira sample coupon',
                ru: 'Купон 10% на образец Mira',
                zh: 'Mira 样品 10% 优惠券',
            },
        },
    },
    {
        id: 'city_token_hunt',
        role: 'player',
        sponsor: '3DSFERA City',
        title: {
            en: 'City Token Hunt',
            ru: 'Охота за токенами города',
            zh: '城市代币寻宝',
        },
        description: {
            en: 'Find hidden reward tokens around the city and convert them into marketplace gifts.',
            ru: 'Найдите скрытые токены в городе и обменяйте их на подарки маркетплейса.',
            zh: '在城市中寻找隐藏奖励代币，并兑换市场礼物。',
        },
        objectives: [
            {
                id: 'collect_tokens',
                event: 'token_collected',
                count: 5,
                label: {
                    en: 'Collect 5 city tokens',
                    ru: 'Собрать 5 городских токенов',
                    zh: '收集 5 个城市代币',
                },
            },
        ],
        reward: {
            kind: 'gift_code',
            value: 'GAME_GIFT_PENDING',
            label: {
                en: 'Game gift code reservation',
                ru: 'Резерв подарочного кода на игру',
                zh: '游戏礼品码预留',
            },
        },
    },
    {
        id: 'business_pavilion_launch',
        role: 'business',
        sponsor: '3DSFERA Ops',
        title: {
            en: 'Pavilion Launch Checklist',
            ru: 'Чеклист запуска павильона',
            zh: '展馆上线清单',
        },
        description: {
            en: 'Prepare a supplier pavilion for real buyers: upload products, open the portal, and review lead flow.',
            ru: 'Подготовьте павильон поставщика: загрузите товары, откройте портал и проверьте поток лидов.',
            zh: '为真实买家准备供应商展馆：上传商品、打开门户并检查线索流程。',
        },
        objectives: [
            {
                id: 'open_supplier_portal',
                event: 'supplier_portal_opened',
                count: 1,
                label: {
                    en: 'Open supplier portal',
                    ru: 'Открыть портал поставщика',
                    zh: '打开供应商门户',
                },
            },
            {
                id: 'upload_products',
                event: 'product_upload_started',
                count: 1,
                label: {
                    en: 'Start product upload',
                    ru: 'Начать загрузку товаров',
                    zh: '开始上传商品',
                },
            },
            {
                id: 'review_leads',
                event: 'lead_inbox_opened',
                count: 1,
                label: {
                    en: 'Review lead inbox',
                    ru: 'Проверить входящие лиды',
                    zh: '查看线索收件箱',
                },
            },
        ],
        reward: {
            kind: 'lead_boost',
            value: 'launch_boost_7d',
            label: {
                en: '7-day pavilion lead boost',
                ru: '7 дней усиления лидов павильона',
                zh: '7 天展馆线索提升',
            },
        },
    },
];

export const getQuestDefinition = (questId: string) =>
    QUEST_DEFINITIONS.find((quest) => quest.id === questId) ?? null;

export const getQuestText = (quest: QuestDefinition, language: AppLanguage) => ({
    title: quest.title[language] ?? quest.title.en,
    description: quest.description[language] ?? quest.description.en,
    sponsor: quest.sponsor,
});

export const getQuestObjectiveText = (
    quest: QuestDefinition,
    objectiveId: string,
    language: AppLanguage
) => {
    const objective = quest.objectives.find((candidate) => candidate.id === objectiveId);
    return objective?.label[language] ?? objective?.label.en ?? objectiveId;
};

export const getQuestRewardText = (
    reward: QuestRewardDefinition | QuestRewardState,
    questId: string,
    language: AppLanguage
) => {
    const quest = getQuestDefinition(questId);
    return quest?.reward.label[language] ?? quest?.reward.label.en ?? String(reward.value);
};

export const createInitialQuestProgress = (): QuestProgress[] =>
    QUEST_DEFINITIONS.map((quest) => ({
        questId: quest.id,
        role: quest.role,
        status: 'active',
        objectives: Object.fromEntries(
            quest.objectives.map((objective) => [
                objective.id,
                {
                    current: 0,
                    target: objective.count,
                    completed: false,
                },
            ])
        ),
    }));

const objectiveMatchesEvent = (
    objective: QuestObjectiveDefinition,
    event: QuestEventInput
) => {
    if (objective.event !== event.event) return false;
    if (!objective.match) return true;

    return Object.entries(objective.match).every(([key, expected]) => event[key] === expected);
};

const isQuestCompleted = (progress: QuestProgress) =>
    Object.values(progress.objectives).every((objective) => objective.completed);

const createRewardState = (quest: QuestDefinition): QuestRewardState => ({
    id: `${quest.id}:${quest.reward.kind}`,
    questId: quest.id,
    kind: quest.reward.kind,
    value: quest.reward.value,
    status: 'earned',
    earnedAt: Date.now(),
});

export const applyQuestEvent = (
    questProgress: QuestProgress[],
    questRewards: QuestRewardState[],
    event: QuestEventInput
): QuestUpdateResult => {
    const completedQuestIds: string[] = [];

    const nextQuestProgress = questProgress.map((progress) => {
        if (progress.status !== 'active') return progress;

        const quest = getQuestDefinition(progress.questId);
        if (!quest) return progress;

        let didChange = false;
        const objectives = { ...progress.objectives };

        for (const objective of quest.objectives) {
            const current = objectives[objective.id];
            if (!current || current.completed) continue;
            if (!objectiveMatchesEvent(objective, event)) continue;

            const nextCurrent = Math.min(current.target, current.current + 1);
            objectives[objective.id] = {
                ...current,
                current: nextCurrent,
                completed: nextCurrent >= current.target,
            };
            didChange = true;
        }

        if (!didChange) return progress;

        const nextProgress: QuestProgress = {
            ...progress,
            objectives,
        };

        if (isQuestCompleted(nextProgress)) {
            completedQuestIds.push(quest.id);
            return {
                ...nextProgress,
                status: 'completed' as const,
                completedAt: Date.now(),
            };
        }

        return nextProgress;
    });

    const nextQuestRewards = [...questRewards];
    for (const questId of completedQuestIds) {
        const quest = getQuestDefinition(questId);
        if (!quest) continue;
        const rewardId = `${quest.id}:${quest.reward.kind}`;
        if (!nextQuestRewards.some((reward) => reward.id === rewardId)) {
            nextQuestRewards.push(createRewardState(quest));
        }
    }

    return {
        questProgress: nextQuestProgress,
        questRewards: nextQuestRewards,
        completedQuestIds,
    };
};

export const getQuestCompletionPercent = (progress: QuestProgress) => {
    const objectives = Object.values(progress.objectives);
    if (objectives.length === 0) return 0;

    const totalCurrent = objectives.reduce((sum, objective) => sum + objective.current, 0);
    const totalTarget = objectives.reduce((sum, objective) => sum + objective.target, 0);
    if (totalTarget <= 0) return 0;

    return Math.round((totalCurrent / totalTarget) * 100);
};

export const getRoleQuestProgress = (
    questProgress: QuestProgress[],
    role: QuestRole
) =>
    questProgress.filter((progress) => {
        const quest = getQuestDefinition(progress.questId);
        return quest?.role === role;
    });
