'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Activity,
    ArrowRight,
    BarChart3,
    Box,
    Building2,
    CalendarCheck,
    CheckCircle2,
    ChevronRight,
    CircleDollarSign,
    ClipboardCheck,
    Clock3,
    Coins,
    CreditCard,
    Gamepad2,
    Gift,
    Globe2,
    HeartPulse,
    Home,
    LineChart,
    LockKeyhole,
    Map,
    MessageSquare,
    PackageCheck,
    Search,
    ShieldCheck,
    ShoppingBag,
    Star,
    Store,
    Trophy,
    Truck,
    Users,
    WalletCards,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import {
    createInitialQuestProgress,
    getQuestCompletionPercent,
    getQuestDefinition,
    getQuestObjectiveText,
    getQuestRewardText,
    getQuestText,
    getRoleQuestProgress,
    type QuestProgress,
    type QuestRewardState,
    type QuestRole,
} from '@/lib/quests';
import { GAME_RULES } from '@/lib/unreal/gameRules';
import type { AppLanguage } from '@/lib/i18n';
import type { UnrealEventBridgeState } from '@/lib/unreal/types';

type DashboardProps = {
    bridge?: UnrealEventBridgeState;
    embedded?: boolean;
};

type Tone = 'cyan' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

type MetricProps = {
    title: string;
    value: string;
    helper: string;
    icon: LucideIcon;
    tone: Tone;
    progress?: number;
};

type Marker = {
    label: string;
    className: string;
};

type ShopperOrderDetail = {
    id: string;
    title: string;
    supplier: string;
    status: string;
    eta: string;
    total: string;
    progress: number;
    steps: string[];
    action: string;
};

type DashboardText = {
    roles: string;
    backToScene: string;
    enterWorld: string;
    open: string;
    search: {
        player: string;
        shopper: string;
        business: string;
        shortcut: string;
    };
    player: {
        suite: string;
        nav: string[];
        seasonLabel: string;
        seasonTitle: string;
        playNow: string;
        mode: string;
        signed: string;
        kicker: string;
        title: string;
        subtitle: string;
        startTitle: string;
        startSub: string;
        startSteps: string[];
        level: string;
        playerId: string;
        xp: string;
        city: string;
        currentLocation: string;
        locationHelper: string;
        currentGame: string;
        gameHelper: string;
        health: string;
        healthHelper: string;
        coins: string;
        coinsHelper: string;
        score: string;
        scoreHelper: string;
        quests: string;
        questsHelper: (done: number) => string;
        rewards: string;
        rewardsHelper: string;
        threat: string;
        zonesTitle: string;
        zonesSub: string;
        zones: { title: string; text: string; action: string; tone: Tone; icon: LucideIcon }[];
        rewardQueueTitle: string;
        rewardQueue: string[];
        messagesTitle: string;
        messages: string[];
        recentTitle: string;
        recentFallback: string[];
        cityOverview: string;
        markers: Marker[];
        eventTitle: string;
        eventText: string;
    };
    shopper: {
        mode: string;
        openHall: string;
        kicker: string;
        title: string;
        subtitle: string;
        location: string;
        suppliersOnline: string;
        savedProducts: string;
        savedProductsHelper: string;
        activeOrders: string;
        activeOrdersHelper: string;
        supplierReplies: string;
        supplierRepliesHelper: string;
        protection: string;
        protectionValue: string;
        protectionHelper: string;
        workflowTitle: string;
        workflowSub: string;
        shopIn3d: string;
        workflow: { title: string; text: string; action: string; tone: Tone; icon: LucideIcon }[];
        mapTitle: string;
        markers: Marker[];
        ordersTitle: string;
        orders: string[];
        orderDetailsTitle: string;
        orderDetailsSub: string;
        orderEtaLabel: string;
        orderTotalLabel: string;
        orderDetails: ShopperOrderDetail[];
        messagesTitle: string;
        messages: string[];
        dealsTitle: string;
        deals: string[];
    };
    business: {
        mode: string;
        portal: string;
        kicker: string;
        title: string;
        subtitle: string;
        pavilionHealth: string;
        buyersOnline: string;
        buyerLeads: string;
        buyerLeadsHelper: string;
        productReadiness: string;
        productReadinessHelper: string;
        quotePipeline: string;
        quotePipelineHelper: string;
        pavilionRoi: string;
        pavilionRoiHelper: string;
        operationsTitle: string;
        operationsSub: string;
        uploadProducts: string;
        operations: { title: string; text: string; action: string; tone: Tone; icon: LucideIcon; href: string }[];
        previewTitle: string;
        markers: Marker[];
        pipelineTitle: string;
        pipeline: string[];
        checklistTitle: string;
        checklist: string[];
        revenueTitle: string;
        revenue: string[];
    };
};

const fallback: UnrealEventBridgeState = {
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
    zombieRank: 'Rookie Survivor',
    arenaMoments: [],
    lastUnrealEvent: null,
    accessDeniedMessage: null,
    recentActivity: ['Entered Zombie Arena', 'Cleared a wave', 'Unlocked coin bonus', 'Returned to Sfera Hall'],
    questProgress: createInitialQuestProgress(),
    questRewards: [],
    lastCompletedQuestId: null,
};

const dashboardCopy: Record<AppLanguage, DashboardText> = {
    en: {
        roles: 'Roles',
        backToScene: 'Back to scene',
        enterWorld: 'Enter world',
        open: 'Open',
        search: {
            player: 'Search quests, rewards, pavilions...',
            shopper: 'Search products, suppliers, orders...',
            business: 'Search leads, products, pavilion tasks...',
            shortcut: 'Ctrl K',
        },
        player: {
            suite: 'Player suite',
            nav: ['Dashboard', 'World Map', 'Arena', 'Rewards', 'Wallet', 'Delivery'],
            seasonLabel: 'Season 1',
            seasonTitle: 'Weekly arena rewards are live',
            playNow: 'Play now',
            mode: 'Player role',
            signed: 'Signed player dashboard',
            kicker: 'Your player path',
            title: 'Play, finish quests, unlock rewards',
            subtitle: 'Start in the city, visit Sfera Hall, inspect a pavilion product, enter Zombie Arena, then open the Reward ATM.',
            startTitle: 'Start here',
            startSub: 'This is the simplest path for a new player.',
            startSteps: ['Visit Sfera Hall', 'Enter a pavilion', 'Inspect a product', 'Finish Zombie Arena'],
            level: 'Level 24',
            playerId: 'Player ID',
            xp: 'XP',
            city: '3DSFERA City',
            currentLocation: 'Current location',
            locationHelper: 'Ready to enter the live city',
            currentGame: 'Current game',
            gameHelper: 'Arena access unlocked',
            health: 'Health',
            healthHelper: 'Regenerates before next run',
            coins: 'Coin balance',
            coinsHelper: '+320 earned today',
            score: 'Arena score',
            scoreHelper: 'Top 18 percent this week',
            quests: 'Quest progress',
            questsHelper: (done) => `${done} of 22 tasks complete`,
            rewards: 'Rewards earned',
            rewardsHelper: 'Coupons, gifts, and drops',
            threat: 'Threat level',
            zonesTitle: 'Where to go next',
            zonesSub: 'Use these areas when you are ready to continue playing.',
            zones: [
                { title: 'Zombie Arena', text: 'Survive waves, build combo streaks, and convert points into coin rewards.', action: 'Start run', tone: 'rose', icon: Gamepad2 },
                { title: 'Racing Zone', text: 'Compete in timed city circuits with sponsored weekly prize pools.', action: 'Queue race', tone: 'cyan', icon: Activity },
                { title: 'Treasure Hunt', text: 'Find product coupons and marketplace gifts hidden across pavilions.', action: 'View hunt', tone: 'amber', icon: Gift },
            ],
            rewardQueueTitle: 'Reward and delivery queue',
            rewardQueue: [
                'Gaming headset reward - unlocked, delivery location needed',
                'Zombie Arena coin payout - pending match settlement',
                'Sfera Hall merch drop - ready to claim in marketplace',
            ],
            messagesTitle: 'Player messages',
            messages: [
                'Arena host opened the weekly survival tournament.',
                'Marketplace concierge can bundle a reward with a real product order.',
                'Youbo supplier sent a player-only discount code.',
            ],
            recentTitle: 'Recent activity',
            recentFallback: ['Entered Zombie Arena', 'Cleared a wave', 'Unlocked coin bonus', 'Returned to Sfera Hall'],
            cityOverview: 'City overview',
            markers: [
                { label: 'Sfera Hall', className: 'left-[12%] top-[24%] border-cyan-300/45 text-cyan-100' },
                { label: 'Arena', className: 'right-[12%] top-[34%] border-rose-300/45 text-rose-100' },
                { label: 'Racing', className: 'bottom-[22%] left-[10%] border-sky-300/45 text-sky-100' },
                { label: 'Rewards', className: 'bottom-[16%] right-[12%] border-amber-300/45 text-amber-100' },
            ],
            eventTitle: 'Double coin event',
            eventText: 'Earn 2X coins in all player zones.',
        },
        shopper: {
            mode: 'Buyer role',
            openHall: 'Open hall',
            kicker: 'Spatial commerce dashboard',
            title: 'Shopper workspace',
            subtitle: 'Manage discovery, saved products, supplier messages, order status, and delivery in one buying cockpit.',
            location: 'Location',
            suppliersOnline: 'Verified suppliers online',
            savedProducts: 'Saved products',
            savedProductsHelper: '3 in comparison, 2 price alerts',
            activeOrders: 'Active orders',
            activeOrdersHelper: 'One awaiting payment',
            supplierReplies: 'Supplier replies',
            supplierRepliesHelper: 'Two quotes need review',
            protection: 'Protection status',
            protectionValue: 'Ready',
            protectionHelper: 'Escrow and return rules placeholder',
            workflowTitle: 'Buying workflow',
            workflowSub: 'A compact view of discovery, comparison, and delivery.',
            shopIn3d: 'Shop in 3D',
            workflow: [
                { title: 'Product discovery', text: 'Browse pavilions, product cards, catalogues, previews, and supplier chat.', action: 'Browse', tone: 'amber', icon: ShoppingBag },
                { title: 'Comparison board', text: 'Shortlist lighting, furniture, samples, and verified supplier options.', action: 'Compare', tone: 'sky', icon: BarChart3 },
                { title: 'Order tracking', text: 'Follow cart, payment, supplier confirmation, packing, delivery, and returns.', action: 'Track', tone: 'emerald', icon: Truck },
            ],
            mapTitle: 'Hall map',
            markers: [
                { label: 'Youbo', className: 'left-[12%] top-[22%] border-amber-300/45 text-amber-100' },
                { label: 'Double Lin', className: 'right-[10%] top-[38%] border-cyan-300/45 text-cyan-100' },
                { label: 'Samples', className: 'bottom-[18%] left-[16%] border-emerald-300/45 text-emerald-100' },
            ],
            ordersTitle: 'Orders and delivery',
            orders: [
                'Mira pendant lights - supplier confirmed, awaiting payment',
                'Double Lin sample box - in delivery, ETA 3 to 5 days',
                'Saved cart - 3 products waiting for checkout',
            ],
            orderDetailsTitle: 'Order details',
            orderDetailsSub: 'Payment, supplier, delivery, and next action for every active order.',
            orderEtaLabel: 'ETA',
            orderTotalLabel: 'Total',
            orderDetails: [
                {
                    id: 'ORD-2048',
                    title: 'Mira pendant lights',
                    supplier: 'Youbo Lighting',
                    status: 'Awaiting payment',
                    eta: 'Ships after payment',
                    total: '$1,240',
                    progress: 42,
                    steps: ['Quote accepted', 'Supplier confirmed', 'Payment pending'],
                    action: 'Pay deposit',
                },
                {
                    id: 'ORD-2031',
                    title: 'Double Lin sample box',
                    supplier: 'Double Lin Studio',
                    status: 'In delivery',
                    eta: '3 to 5 days',
                    total: '$86',
                    progress: 76,
                    steps: ['Packed', 'Courier pickup', 'Customs check'],
                    action: 'Track package',
                },
            ],
            messagesTitle: 'Supplier messages',
            messages: [
                'Youbo supplier replied with a bulk discount.',
                'Concierge suggested 4 matching pendant lights.',
                'Delivery support needs confirmation for sample timing.',
            ],
            dealsTitle: 'Deals and gifts',
            deals: [
                'Player reward coupons can be applied to real marketplace orders.',
                'Supplier gifts are available for sample requests this week.',
                'Hotel lobby lighting list is ready for quote review.',
            ],
        },
        business: {
            mode: 'Supplier role',
            portal: 'Supplier portal',
            kicker: 'Pavilion and supplier operations',
            title: 'Business control room',
            subtitle: 'Operate a branded pavilion, manage product readiness, follow buyer leads, and coordinate fulfilment.',
            pavilionHealth: 'Pavilion health: 92%',
            buyersOnline: 'Buyers online: 18',
            buyerLeads: 'Buyer leads',
            buyerLeadsHelper: '7 need reply today',
            productReadiness: 'Product readiness',
            productReadinessHelper: 'Models, catalogues, pricing',
            quotePipeline: 'Quote pipeline',
            quotePipelineHelper: 'Open sample and bulk requests',
            pavilionRoi: 'Pavilion ROI',
            pavilionRoiHelper: 'Visits, dwell, chat conversion',
            operationsTitle: 'Operations board',
            operationsSub: 'Everything a premium pavilion operator expects to control.',
            uploadProducts: 'Upload products',
            operations: [
                { title: 'Pavilion management', text: 'Configure showroom identity, 3D scenes, banners, floor placement, and store details.', action: 'Configure', tone: 'emerald', icon: Store, href: '/supplier/upload' },
                { title: 'Rent a pavilion', text: 'Choose mall zone, lease duration, promotion level, and launch date.', action: 'Open portal', tone: 'sky', icon: Building2, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: 'Run a campaign', text: 'Coordinate product drops, showroom demos, coupon offers, and launch events.', action: 'Plan', tone: 'amber', icon: Gamepad2, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: 'Lead inbox', text: 'Review buyer conversations, quotes, sample requests, and follow-ups.', action: 'Reply', tone: 'cyan', icon: MessageSquare, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: 'Fulfilment', text: 'Set warehouses, delivery regions, sample rules, return windows, and support contacts.', action: 'Manage', tone: 'emerald', icon: Truck, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: 'Analytics', text: 'Monitor visits, dwell time, product focus, chat conversion, and reward redemptions.', action: 'Review', tone: 'violet', icon: BarChart3, href: '/login?role=supplier&next=/supplier/dashboard' },
            ],
            previewTitle: 'Pavilion preview',
            markers: [
                { label: 'Hotspots', className: 'left-[12%] top-[24%] border-emerald-300/45 text-emerald-100' },
                { label: 'Catalog', className: 'right-[10%] top-[36%] border-cyan-300/45 text-cyan-100' },
                { label: 'Event', className: 'bottom-[18%] right-[16%] border-amber-300/45 text-amber-100' },
            ],
            pipelineTitle: 'Order pipeline',
            pipeline: [
                'Youbo buyer lead - new message, reply needed',
                'Double Lin bulk quote - quote draft ready',
                'Sample shipment - packing, delivery details received',
            ],
            checklistTitle: 'Launch checklist',
            checklist: [
                'Upload localized product descriptions and certifications.',
                'Approve pavilion hero media and product hotspots.',
                'Confirm campaign budget, sample stock, and approval owners.',
            ],
            revenueTitle: 'Revenue controls',
            revenue: [
                'Set sample pricing, bulk terms, and payment milestones.',
                'Review escrow, refund, and dispute support settings.',
                'Track coupon redemptions from marketplace campaigns.',
            ],
        },
    },
    ru: {
        roles: 'Роли',
        backToScene: 'Назад в сцену',
        enterWorld: 'Войти в мир',
        open: 'Открыть',
        search: {
            player: 'Поиск квестов, наград, павильонов...',
            shopper: 'Поиск товаров, поставщиков, заказов...',
            business: 'Поиск лидов, товаров, задач павильона...',
            shortcut: 'Ctrl K',
        },
        player: {
            suite: 'Панель игрока',
            nav: ['Панель', 'Карта мира', 'Арена', 'Награды', 'Кошелек', 'Доставка'],
            seasonLabel: 'Сезон 1',
            seasonTitle: 'Еженедельные награды арены активны',
            playNow: 'Играть',
            mode: 'Роль игрока',
            signed: 'Личный кабинет игрока',
            kicker: 'Путь игрока',
            title: 'Играйте, выполняйте квесты, открывайте награды',
            subtitle: 'Начните в городе, посетите Sfera Hall, изучите товар в павильоне, войдите в Zombie Arena, затем откройте банкомат наград.',
            startTitle: 'Начните здесь',
            startSub: 'Самый простой путь для нового игрока.',
            startSteps: ['Посетить Sfera Hall', 'Войти в павильон', 'Изучить товар', 'Завершить Zombie Arena'],
            level: 'Уровень 24',
            playerId: 'ID игрока',
            xp: 'XP',
            city: 'Город 3DSFERA',
            currentLocation: 'Текущая локация',
            locationHelper: 'Готово к входу в live-город',
            currentGame: 'Текущая игра',
            gameHelper: 'Доступ к арене открыт',
            health: 'Здоровье',
            healthHelper: 'Восстановится перед следующим заходом',
            coins: 'Баланс монет',
            coinsHelper: '+320 заработано сегодня',
            score: 'Счет арены',
            scoreHelper: 'Топ 18% за неделю',
            quests: 'Прогресс квестов',
            questsHelper: (done) => `${done} из 22 задач выполнено`,
            rewards: 'Получено наград',
            rewardsHelper: 'Купоны, подарки и дропы',
            threat: 'Уровень угрозы',
            zonesTitle: 'Куда идти дальше',
            zonesSub: 'Используйте эти зоны, когда будете готовы продолжить игру.',
            zones: [
                { title: 'Zombie Arena', text: 'Выживайте в волнах, набирайте комбо и переводите очки в монеты.', action: 'Начать', tone: 'rose', icon: Gamepad2 },
                { title: 'Racing Zone', text: 'Соревнуйтесь в городских заездах с призами от спонсоров.', action: 'В гонку', tone: 'cyan', icon: Activity },
                { title: 'Treasure Hunt', text: 'Ищите купоны и подарки маркетплейса, спрятанные в павильонах.', action: 'Смотреть', tone: 'amber', icon: Gift },
            ],
            rewardQueueTitle: 'Награды и доставка',
            rewardQueue: [
                'Игровая гарнитура - открыта, нужен адрес доставки',
                'Монеты Zombie Arena - ожидают расчета матча',
                'Мерч Sfera Hall - готов к получению в маркетплейсе',
            ],
            messagesTitle: 'Сообщения игрока',
            messages: [
                'Организатор арены открыл еженедельный турнир.',
                'Консьерж может объединить награду с реальным заказом.',
                'Поставщик Youbo отправил скидку только для игроков.',
            ],
            recentTitle: 'Недавняя активность',
            recentFallback: ['Вход в Zombie Arena', 'Волна очищена', 'Бонус монет открыт', 'Возврат в Sfera Hall'],
            cityOverview: 'Обзор города',
            markers: [
                { label: 'Sfera Hall', className: 'left-[12%] top-[24%] border-cyan-300/45 text-cyan-100' },
                { label: 'Арена', className: 'right-[12%] top-[34%] border-rose-300/45 text-rose-100' },
                { label: 'Гонки', className: 'bottom-[22%] left-[10%] border-sky-300/45 text-sky-100' },
                { label: 'Награды', className: 'bottom-[16%] right-[12%] border-amber-300/45 text-amber-100' },
            ],
            eventTitle: 'Двойные монеты',
            eventText: 'Получайте 2X монет во всех игровых зонах.',
        },
        shopper: {
            mode: 'Роль покупателя',
            openHall: 'Открыть холл',
            kicker: 'Панель пространственной торговли',
            title: 'Рабочее место покупателя',
            subtitle: 'Поиск товаров, избранное, сообщения поставщиков, статусы заказов и доставка в одной панели.',
            location: 'Локация',
            suppliersOnline: 'Проверенные поставщики онлайн',
            savedProducts: 'Сохраненные товары',
            savedProductsHelper: '3 в сравнении, 2 уведомления о цене',
            activeOrders: 'Активные заказы',
            activeOrdersHelper: 'Один ожидает оплаты',
            supplierReplies: 'Ответы поставщиков',
            supplierRepliesHelper: '2 предложения требуют проверки',
            protection: 'Защита покупки',
            protectionValue: 'Готово',
            protectionHelper: 'Эскроу и правила возврата',
            workflowTitle: 'Процесс покупки',
            workflowSub: 'Компактный обзор поиска, сравнения и доставки.',
            shopIn3d: 'Покупать в 3D',
            workflow: [
                { title: 'Поиск товаров', text: 'Павильоны, карточки товаров, каталоги, превью и чат с поставщиком.', action: 'Открыть', tone: 'amber', icon: ShoppingBag },
                { title: 'Сравнение', text: 'Короткий список света, мебели, образцов и проверенных поставщиков.', action: 'Сравнить', tone: 'sky', icon: BarChart3 },
                { title: 'Статус заказа', text: 'Корзина, оплата, подтверждение, упаковка, доставка и возвраты.', action: 'Отследить', tone: 'emerald', icon: Truck },
            ],
            mapTitle: 'Карта холла',
            markers: [
                { label: 'Youbo', className: 'left-[12%] top-[22%] border-amber-300/45 text-amber-100' },
                { label: 'Double Lin', className: 'right-[10%] top-[38%] border-cyan-300/45 text-cyan-100' },
                { label: 'Образцы', className: 'bottom-[18%] left-[16%] border-emerald-300/45 text-emerald-100' },
            ],
            ordersTitle: 'Заказы и доставка',
            orders: [
                'Светильники Mira - поставщик подтвердил, ожидается оплата',
                'Набор образцов Double Lin - в доставке, 3-5 дней',
                'Сохраненная корзина - 3 товара ждут оформления',
            ],
            orderDetailsTitle: 'Детали заказа',
            orderDetailsSub: 'Оплата, поставщик, доставка и следующий шаг по каждому активному заказу.',
            orderEtaLabel: 'Срок',
            orderTotalLabel: 'Сумма',
            orderDetails: [
                {
                    id: 'ORD-2048',
                    title: 'Светильники Mira',
                    supplier: 'Youbo Lighting',
                    status: 'Ожидается оплата',
                    eta: 'Отправка после оплаты',
                    total: '$1,240',
                    progress: 42,
                    steps: ['КП принято', 'Поставщик подтвердил', 'Ожидается оплата'],
                    action: 'Оплатить депозит',
                },
                {
                    id: 'ORD-2031',
                    title: 'Набор образцов Double Lin',
                    supplier: 'Double Lin Studio',
                    status: 'В доставке',
                    eta: '3-5 дней',
                    total: '$86',
                    progress: 76,
                    steps: ['Упаковано', 'Передано курьеру', 'Проверка на таможне'],
                    action: 'Отследить посылку',
                },
            ],
            messagesTitle: 'Сообщения поставщиков',
            messages: [
                'Поставщик Youbo ответил со скидкой на объем.',
                'Консьерж предложил 4 подходящих светильника.',
                'Служба доставки просит подтвердить время образцов.',
            ],
            dealsTitle: 'Скидки и подарки',
            deals: [
                'Купоны игрока можно применить к реальным заказам.',
                'Подарки поставщиков доступны для запросов образцов.',
                'Список света для лобби отеля готов к проверке КП.',
            ],
        },
        business: {
            mode: 'Роль поставщика',
            portal: 'Портал поставщика',
            kicker: 'Операции павильона и поставщика',
            title: 'Центр управления бизнесом',
            subtitle: 'Управляйте фирменным павильоном, готовностью товаров, лидами покупателей и доставкой.',
            pavilionHealth: 'Состояние павильона: 92%',
            buyersOnline: 'Покупателей онлайн: 18',
            buyerLeads: 'Лиды покупателей',
            buyerLeadsHelper: '7 требуют ответа сегодня',
            productReadiness: 'Готовность товаров',
            productReadinessHelper: 'Модели, каталоги, цены',
            quotePipeline: 'Воронка КП',
            quotePipelineHelper: 'Запросы образцов и опта',
            pavilionRoi: 'ROI павильона',
            pavilionRoiHelper: 'Визиты, время, конверсия чата',
            operationsTitle: 'Операционная доска',
            operationsSub: 'Все, что нужно оператору премиального павильона.',
            uploadProducts: 'Загрузить товары',
            operations: [
                { title: 'Управление павильоном', text: 'Бренд, 3D-сцены, баннеры, место в холле и данные магазина.', action: 'Настроить', tone: 'emerald', icon: Store, href: '/supplier/upload' },
                { title: 'Аренда павильона', text: 'Зона молла, срок аренды, уровень промо и дата запуска.', action: 'В портал', tone: 'sky', icon: Building2, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: 'Кампания', text: 'Планируйте запуски товаров, демо в шоуруме, купоны и промо-события.', action: 'Запланировать', tone: 'amber', icon: Gamepad2, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: 'Входящие лиды', text: 'Диалоги, КП, запросы образцов и follow-up.', action: 'Ответить', tone: 'cyan', icon: MessageSquare, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: 'Доставка', text: 'Склады, регионы, правила образцов, возвраты и поддержка.', action: 'Управлять', tone: 'emerald', icon: Truck, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: 'Аналитика', text: 'Визиты, фокус на товарах, конверсия чата и погашение наград.', action: 'Смотреть', tone: 'violet', icon: BarChart3, href: '/login?role=supplier&next=/supplier/dashboard' },
            ],
            previewTitle: 'Превью павильона',
            markers: [
                { label: 'Хотспоты', className: 'left-[12%] top-[24%] border-emerald-300/45 text-emerald-100' },
                { label: 'Каталог', className: 'right-[10%] top-[36%] border-cyan-300/45 text-cyan-100' },
                { label: 'Ивент', className: 'bottom-[18%] right-[16%] border-amber-300/45 text-amber-100' },
            ],
            pipelineTitle: 'Воронка заказов',
            pipeline: [
                'Лид Youbo - новое сообщение, нужен ответ',
                'Оптовый запрос Double Lin - черновик КП готов',
                'Отправка образцов - упаковка, адрес получен',
            ],
            checklistTitle: 'Чеклист запуска',
            checklist: [
                'Загрузить локализованные описания и сертификаты.',
                'Утвердить медиа павильона и товарные хотспоты.',
                'Подтвердить бюджет кампании, образцы и ответственных.',
            ],
            revenueTitle: 'Контроль выручки',
            revenue: [
                'Настроить цены образцов, оптовые условия и этапы оплаты.',
                'Проверить эскроу, возвраты и поддержку споров.',
                'Отследить погашение купонов из маркетплейс-кампаний.',
            ],
        },
    },
    zh: {
        roles: '角色',
        backToScene: '返回场景',
        enterWorld: '进入世界',
        open: '打开',
        search: {
            player: '搜索任务、奖励、展馆...',
            shopper: '搜索商品、供应商、订单...',
            business: '搜索线索、商品、展馆任务...',
            shortcut: 'Ctrl K',
        },
        player: {
            suite: '玩家套件',
            nav: ['仪表盘', '世界地图', '竞技场', '奖励', '钱包', '配送'],
            seasonLabel: '第 1 赛季',
            seasonTitle: '每周竞技场奖励已开启',
            playNow: '开始游戏',
            mode: '玩家角色',
            signed: '玩家登录仪表盘',
            kicker: '玩家路径',
            title: '游玩、完成任务、解锁奖励',
            subtitle: '从城市开始，访问 Sfera Hall，查看展馆商品，进入 Zombie Arena，然后打开奖励 ATM。',
            startTitle: '从这里开始',
            startSub: '这是新玩家最简单的路径。',
            startSteps: ['访问 Sfera Hall', '进入展馆', '查看商品', '完成 Zombie Arena'],
            level: '等级 24',
            playerId: '玩家 ID',
            xp: '经验',
            city: '3DSFERA 城市',
            currentLocation: '当前位置',
            locationHelper: '可进入实时城市',
            currentGame: '当前游戏',
            gameHelper: '竞技场已解锁',
            health: '生命值',
            healthHelper: '下一局前恢复',
            coins: '金币余额',
            coinsHelper: '今日 +320',
            score: '竞技场分数',
            scoreHelper: '本周前 18%',
            quests: '任务进度',
            questsHelper: (done) => `已完成 ${done}/22 个任务`,
            rewards: '已获得奖励',
            rewardsHelper: '优惠券、礼物和掉落',
            threat: '威胁等级',
            zonesTitle: '下一步去哪',
            zonesSub: '准备继续游玩时使用这些区域。',
            zones: [
                { title: 'Zombie Arena', text: '抵御尸潮，累积连击，并把积分兑换为金币奖励。', action: '开始', tone: 'rose', icon: Gamepad2 },
                { title: 'Racing Zone', text: '参加城市计时赛，赢取每周赞助奖池。', action: '排队', tone: 'cyan', icon: Activity },
                { title: 'Treasure Hunt', text: '在展馆中寻找隐藏的商品优惠券和市场礼物。', action: '查看', tone: 'amber', icon: Gift },
            ],
            rewardQueueTitle: '奖励与配送队列',
            rewardQueue: [
                '游戏耳机奖励 - 已解锁，需要配送地址',
                'Zombie Arena 金币结算 - 等待比赛结算',
                'Sfera Hall 周边 - 可在市场领取',
            ],
            messagesTitle: '玩家消息',
            messages: [
                '竞技场主办方开启了每周生存赛。',
                '市场助手可将奖励与真实订单合并。',
                'Youbo 供应商发送了玩家专属折扣码。',
            ],
            recentTitle: '最近活动',
            recentFallback: ['进入 Zombie Arena', '清理一波敌人', '解锁金币奖励', '返回 Sfera Hall'],
            cityOverview: '城市概览',
            markers: [
                { label: 'Sfera Hall', className: 'left-[12%] top-[24%] border-cyan-300/45 text-cyan-100' },
                { label: '竞技场', className: 'right-[12%] top-[34%] border-rose-300/45 text-rose-100' },
                { label: '赛车', className: 'bottom-[22%] left-[10%] border-sky-300/45 text-sky-100' },
                { label: '奖励', className: 'bottom-[16%] right-[12%] border-amber-300/45 text-amber-100' },
            ],
            eventTitle: '双倍金币活动',
            eventText: '所有玩家区域获得 2X 金币。',
        },
        shopper: {
            mode: '买家角色',
            openHall: '打开大厅',
            kicker: '空间商务仪表盘',
            title: '买家工作区',
            subtitle: '在一个购买控制台中管理发现、收藏商品、供应商消息、订单状态和配送。',
            location: '位置',
            suppliersOnline: '认证供应商在线',
            savedProducts: '收藏商品',
            savedProductsHelper: '3 个对比，2 个价格提醒',
            activeOrders: '活跃订单',
            activeOrdersHelper: '1 个等待付款',
            supplierReplies: '供应商回复',
            supplierRepliesHelper: '2 份报价待审核',
            protection: '保障状态',
            protectionValue: '就绪',
            protectionHelper: '托管支付和退货规则占位',
            workflowTitle: '购买流程',
            workflowSub: '发现、对比和配送的紧凑视图。',
            shopIn3d: '在 3D 中购买',
            workflow: [
                { title: '商品发现', text: '浏览展馆、商品卡、目录、预览和供应商聊天。', action: '浏览', tone: 'amber', icon: ShoppingBag },
                { title: '对比板', text: '整理灯具、家具、样品和认证供应商选项。', action: '对比', tone: 'sky', icon: BarChart3 },
                { title: '订单跟踪', text: '跟踪购物车、付款、供应商确认、打包、配送和退货。', action: '跟踪', tone: 'emerald', icon: Truck },
            ],
            mapTitle: '大厅地图',
            markers: [
                { label: 'Youbo', className: 'left-[12%] top-[22%] border-amber-300/45 text-amber-100' },
                { label: 'Double Lin', className: 'right-[10%] top-[38%] border-cyan-300/45 text-cyan-100' },
                { label: '样品', className: 'bottom-[18%] left-[16%] border-emerald-300/45 text-emerald-100' },
            ],
            ordersTitle: '订单与配送',
            orders: [
                'Mira 吊灯 - 供应商已确认，等待付款',
                'Double Lin 样品盒 - 配送中，预计 3 到 5 天',
                '已保存购物车 - 3 件商品等待结算',
            ],
            orderDetailsTitle: '订单详情',
            orderDetailsSub: '每个活跃订单的付款、供应商、配送和下一步操作。',
            orderEtaLabel: '预计',
            orderTotalLabel: '合计',
            orderDetails: [
                {
                    id: 'ORD-2048',
                    title: 'Mira 吊灯',
                    supplier: 'Youbo Lighting',
                    status: '等待付款',
                    eta: '付款后发货',
                    total: '$1,240',
                    progress: 42,
                    steps: ['报价已接受', '供应商已确认', '等待付款'],
                    action: '支付定金',
                },
                {
                    id: 'ORD-2031',
                    title: 'Double Lin 样品盒',
                    supplier: 'Double Lin Studio',
                    status: '配送中',
                    eta: '3 到 5 天',
                    total: '$86',
                    progress: 76,
                    steps: ['已打包', '快递已取件', '海关检查'],
                    action: '跟踪包裹',
                },
            ],
            messagesTitle: '供应商消息',
            messages: [
                'Youbo 供应商回复了批量折扣。',
                '助手推荐了 4 款匹配吊灯。',
                '配送支持需要确认样品时间。',
            ],
            dealsTitle: '优惠与礼物',
            deals: [
                '玩家奖励券可用于真实市场订单。',
                '本周样品请求可获得供应商礼物。',
                '酒店大堂灯具清单已准备好审核报价。',
            ],
        },
        business: {
            mode: '供应商角色',
            portal: '供应商门户',
            kicker: '展馆与供应商运营',
            title: '商务控制室',
            subtitle: '运营品牌展馆，管理商品准备度、买家线索和履约。',
            pavilionHealth: '展馆健康度：92%',
            buyersOnline: '在线买家：18',
            buyerLeads: '买家线索',
            buyerLeadsHelper: '7 个今天需回复',
            productReadiness: '商品准备度',
            productReadinessHelper: '模型、目录、定价',
            quotePipeline: '报价管线',
            quotePipelineHelper: '样品和批量请求',
            pavilionRoi: '展馆 ROI',
            pavilionRoiHelper: '访问、停留、聊天转化',
            operationsTitle: '运营面板',
            operationsSub: '高级展馆运营者需要控制的全部内容。',
            uploadProducts: '上传商品',
            operations: [
                { title: '展馆管理', text: '配置展厅身份、3D 场景、横幅、楼层位置和店铺信息。', action: '配置', tone: 'emerald', icon: Store, href: '/supplier/upload' },
                { title: '租赁展馆', text: '选择商场区域、租期、推广级别和上线日期。', action: '打开门户', tone: 'sky', icon: Building2, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: '营销活动', text: '安排商品发布、展厅演示、优惠券和上线活动。', action: '计划', tone: 'amber', icon: Gamepad2, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: '线索收件箱', text: '查看买家对话、报价、样品请求和跟进。', action: '回复', tone: 'cyan', icon: MessageSquare, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: '履约', text: '设置仓库、配送区域、样品规则、退货窗口和支持联系人。', action: '管理', tone: 'emerald', icon: Truck, href: '/login?role=supplier&next=/supplier/dashboard' },
                { title: '分析', text: '监控访问、停留、商品关注、聊天转化和奖励兑换。', action: '查看', tone: 'violet', icon: BarChart3, href: '/login?role=supplier&next=/supplier/dashboard' },
            ],
            previewTitle: '展馆预览',
            markers: [
                { label: '热点', className: 'left-[12%] top-[24%] border-emerald-300/45 text-emerald-100' },
                { label: '目录', className: 'right-[10%] top-[36%] border-cyan-300/45 text-cyan-100' },
                { label: '活动', className: 'bottom-[18%] right-[16%] border-amber-300/45 text-amber-100' },
            ],
            pipelineTitle: '订单管线',
            pipeline: [
                'Youbo 买家线索 - 新消息，需要回复',
                'Double Lin 批量报价 - 报价草稿已准备',
                '样品发货 - 打包中，已收到配送信息',
            ],
            checklistTitle: '上线清单',
            checklist: [
                '上传本地化商品描述和认证。',
                '批准展馆主视觉和商品热点。',
                '确认活动预算、样品库存和审批负责人。',
            ],
            revenueTitle: '收入控制',
            revenue: [
                '设置样品价格、批量条款和付款节点。',
                '审核托管支付、退款和争议支持设置。',
                '跟踪市场活动中的优惠券兑换。',
            ],
        },
    },
};

const toneStyles: Record<Tone, { icon: string; ring: string; accent: string; bar: string }> = {
    cyan: {
        icon: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200',
        ring: 'shadow-[0_0_40px_rgba(34,211,238,0.14)]',
        accent: 'text-cyan-200',
        bar: 'bg-cyan-300',
    },
    sky: {
        icon: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
        ring: 'shadow-[0_0_40px_rgba(56,189,248,0.14)]',
        accent: 'text-sky-200',
        bar: 'bg-sky-300',
    },
    emerald: {
        icon: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
        ring: 'shadow-[0_0_40px_rgba(52,211,153,0.14)]',
        accent: 'text-emerald-200',
        bar: 'bg-emerald-300',
    },
    amber: {
        icon: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
        ring: 'shadow-[0_0_40px_rgba(251,191,36,0.14)]',
        accent: 'text-amber-200',
        bar: 'bg-amber-300',
    },
    rose: {
        icon: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
        ring: 'shadow-[0_0_40px_rgba(251,113,133,0.14)]',
        accent: 'text-rose-200',
        bar: 'bg-rose-300',
    },
    violet: {
        icon: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
        ring: 'shadow-[0_0_40px_rgba(167,139,250,0.14)]',
        accent: 'text-violet-200',
        bar: 'bg-violet-300',
    },
};

const panel = 'rounded-xl border border-white/10 bg-[#10161f]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-xl';
const compactPanel = 'rounded-lg border border-white/10 bg-[#0c121a] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]';
const metricGrid = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4';
const threeCardGrid = 'grid gap-3 md:grid-cols-3';
const dashboardSideGrid = 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const questDashboardCopy: Record<AppLanguage, {
    activeQuests: string;
    rewardWallet: string;
    rewardTerminal: string;
    terminalSubtitle: string;
    withdrawalTitle: string;
    withdrawalMessage: string;
    giftCodeTitle: string;
    giftCodeMessage: string;
    unavailable: string;
    pending: string;
    noQuests: string;
    noRewards: string;
    complete: string;
    active: string;
    claimed: string;
    reward: string;
    objectives: string;
}> = {
    en: {
        activeQuests: 'Active quests',
        rewardWallet: 'Reward wallet',
        rewardTerminal: 'Reward ATM',
        terminalSubtitle: 'Cash-out is visible as a roadmap feature, not an active promise.',
        withdrawalTitle: 'Withdrawal unavailable',
        withdrawalMessage: 'We are working on the conditions and rules for safe reward withdrawals. Withdrawals are not available yet.',
        giftCodeTitle: 'Game gift codes',
        giftCodeMessage: 'Gift codes for Steam or other game stores can be issued after partner/code inventory is connected.',
        unavailable: 'Unavailable',
        pending: 'Pending',
        noQuests: 'No active quests for this role yet.',
        noRewards: 'Rewards will appear here after quest completion.',
        complete: 'Complete',
        active: 'Active',
        claimed: 'Claimed',
        reward: 'Reward',
        objectives: 'Objectives',
    },
    ru: {
        activeQuests: 'Активные квесты',
        rewardWallet: 'Кошелек наград',
        rewardTerminal: 'Банкомат наград',
        terminalSubtitle: 'Вывод показан как будущая функция, а не как активное обещание.',
        withdrawalTitle: 'Вывод средств недоступен',
        withdrawalMessage: 'Мы работаем над тем, чтобы создать условия для безопасного вывода наград. Сейчас вывод средств недоступен.',
        giftCodeTitle: 'Подарочные коды на игры',
        giftCodeMessage: 'Коды Steam или других игровых площадок можно будет выдавать после подключения партнерской программы или склада кодов.',
        unavailable: 'Недоступно',
        pending: 'В работе',
        noQuests: 'Для этой роли пока нет активных квестов.',
        noRewards: 'Награды появятся здесь после завершения квестов.',
        complete: 'Готово',
        active: 'Активно',
        claimed: 'Получено',
        reward: 'Награда',
        objectives: 'Цели',
    },
    zh: {
        activeQuests: '进行中的任务',
        rewardWallet: '奖励钱包',
        rewardTerminal: '奖励 ATM',
        terminalSubtitle: '提现作为路线图功能展示，并非当前承诺。',
        withdrawalTitle: '提现暂不可用',
        withdrawalMessage: '我们正在制定安全提现奖励的条件和规则。当前暂不支持提现。',
        giftCodeTitle: '游戏礼品码',
        giftCodeMessage: '接入合作伙伴或礼品码库存后，可发放 Steam 或其他游戏平台代码。',
        unavailable: '不可用',
        pending: '待接入',
        noQuests: '此角色暂无进行中的任务。',
        noRewards: '完成任务后奖励会显示在这里。',
        complete: '已完成',
        active: '进行中',
        claimed: '已领取',
        reward: '奖励',
        objectives: '目标',
    },
};

const questStatusLabel = (
    progress: QuestProgress,
    copy: typeof questDashboardCopy[AppLanguage]
) => {
    if (progress.status === 'claimed') return copy.claimed;
    if (progress.status === 'completed') return copy.complete;
    return copy.active;
};

function DashboardBackNav() {
    const { language } = useLanguage();
    const copy = dashboardCopy[language];
    const searchParams = useSearchParams();
    const returnToScene = searchParams.get('returnTo') === '/fastview';

    return (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link
                href={returnToScene ? '/roles?returnTo=/fastview' : '/roles?skipIntro=true'}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
            >
                <Home className="h-3.5 w-3.5" />
                {copy.roles}
            </Link>
            <Link
                href="/fastview?resume=scene"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
            >
                <Globe2 className="h-3.5 w-3.5" />
                {copy.backToScene}
            </Link>
        </div>
    );
}

function DashboardRail({ mode }: { mode: 'player' | 'shopper' | 'business' }) {
    const activeTone: Tone = mode === 'business' ? 'emerald' : mode === 'shopper' ? 'amber' : 'sky';
    const railItems = [
        { href: '/roles?skipIntro=true', icon: Home, label: 'Roles' },
        { href: '/fastview?resume=scene', icon: Globe2, label: 'Scene' },
        { href: '/player/dashboard', icon: Gamepad2, label: 'Player' },
        { href: '/shopper/dashboard', icon: ShoppingBag, label: 'Shopper' },
        { href: '/business/dashboard', icon: Store, label: 'Business' },
    ];

    return (
        <aside className="hidden border-r border-white/10 bg-[#070b11]/92 px-2 py-3 lg:flex lg:flex-col lg:items-center">
            <Link href="/roles?skipIntro=true" className={`grid h-10 w-10 place-items-center rounded-xl border text-sm font-black ${toneStyles[activeTone].icon}`}>
                3D
            </Link>
            <nav className="mt-5 flex flex-1 flex-col items-center gap-2">
                {railItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        (mode === 'player' && item.href === '/player/dashboard') ||
                        (mode === 'shopper' && item.href === '/shopper/dashboard') ||
                        (mode === 'business' && item.href === '/business/dashboard');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-label={item.label}
                            title={item.label}
                            className={`grid h-9 w-9 place-items-center rounded-lg border text-slate-400 transition ${
                                isActive
                                    ? `${toneStyles[activeTone].icon} shadow-[0_0_22px_rgba(56,189,248,0.12)]`
                                    : 'border-transparent bg-white/[0.035] hover:border-white/10 hover:bg-white/[0.07] hover:text-white'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

function DashboardFrame({
    children,
    sidebar,
    mode,
    embedded = false,
}: {
    children: ReactNode;
    sidebar?: ReactNode;
    mode: 'player' | 'shopper' | 'business';
    embedded?: boolean;
}) {
    const modeGlow = {
        player: 'radial-gradient(circle_at_78%_8%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_18%_82%,rgba(34,211,238,0.12),transparent_34%)',
        shopper: 'radial-gradient(circle_at_82%_10%,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_14%_82%,rgba(45,212,191,0.14),transparent_34%)',
        business: 'radial-gradient(circle_at_82%_10%,rgba(52,211,153,0.18),transparent_30%),radial-gradient(circle_at_14%_80%,rgba(56,189,248,0.13),transparent_34%)',
    }[mode];
    const gridColumns = embedded
        ? ''
        : `lg:grid-cols-[3.75rem_minmax(0,1fr)] ${sidebar ? 'xl:grid-cols-[3.75rem_12.75rem_minmax(0,1fr)]' : ''}`;

    return (
        <section className={`relative overflow-hidden border border-white/10 bg-[#090d14] text-white shadow-[0_40px_140px_rgba(0,0,0,0.5)] ${embedded ? 'rounded-2xl' : 'md:rounded-xl'}`}>
            <div className="pointer-events-none absolute inset-0" style={{ background: modeGlow }} />
            <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className={`relative grid ${embedded ? 'min-h-0' : 'min-h-screen'} ${gridColumns}`}>
                {!embedded && <DashboardRail mode={mode} />}
                {!embedded && sidebar}
                <div className={`min-w-0 ${embedded ? 'p-3 sm:p-4' : 'p-3 sm:p-4 lg:p-5'}`}>{children}</div>
            </div>
        </section>
    );
}

function HeaderSearch({ label, shortcut }: { label: string; shortcut: string }) {
    return (
        <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0d131c] pl-10 pr-24 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-cyan-300/[0.07]"
                placeholder={label}
                readOnly
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {shortcut}
            </span>
        </div>
    );
}

function StatusPill({ children, tone = 'cyan' }: { children: ReactNode; tone?: Tone }) {
    return (
        <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] ${toneStyles[tone].icon}`}>
            <span className={`h-2 w-2 rounded-full ${toneStyles[tone].bar}`} />
            {children}
        </span>
    );
}

function MetricCard({ title, value, helper, icon: Icon, tone, progress }: MetricProps) {
    return (
        <article className={`${panel} ${toneStyles[tone].ring} min-h-24 p-3`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{title}</p>
                    <p className="mt-1.5 truncate text-lg font-black leading-tight text-white sm:text-xl">{value}</p>
                </div>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${toneStyles[tone].icon}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
            </div>
            <p className="mt-1.5 truncate text-xs leading-5 text-slate-400">{helper}</p>
            {typeof progress === 'number' && (
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${toneStyles[tone].bar}`} style={{ width: `${clampPercent(progress)}%` }} />
                </div>
            )}
        </article>
    );
}

function WorkCard({
    title,
    text,
    icon: Icon,
    tone,
    href = '/fastview',
    action,
}: {
    title: string;
    text: string;
    icon: LucideIcon;
    tone: Tone;
    href?: string;
    action: string;
}) {
    return (
        <Link href={href} className={`${compactPanel} group flex min-h-28 flex-col justify-between p-3 transition hover:border-cyan-300/30 hover:bg-white/[0.055]`}>
            <div>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles[tone].icon}`}>
                    <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-2.5 text-sm font-black tracking-tight text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">{text}</p>
            </div>
            <span className={`mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] ${toneStyles[tone].accent}`}>
                {action}
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}

function ListPanel({
    title,
    items,
    icon: Icon,
    tone = 'cyan',
}: {
    title: string;
    items: string[];
    icon: LucideIcon;
    tone?: Tone;
}) {
    return (
        <section className={`${panel} p-3`}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{title}</h2>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles[tone].icon}`}>
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item} className="flex gap-2.5 rounded-lg border border-white/10 bg-black/20 p-2.5">
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${toneStyles[tone].accent}`} />
                        <p className="text-xs leading-5 text-slate-300">{item}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function QuestPanel({
    role,
    progress,
    language,
}: {
    role: QuestRole;
    progress: QuestProgress[];
    language: AppLanguage;
}) {
    const copy = questDashboardCopy[language];
    const roleProgress = getRoleQuestProgress(progress, role).slice(0, 3);

    return (
        <section className={`${panel} p-3`}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{copy.activeQuests}</h2>
                    <p className="mt-1 text-sm text-slate-500">{copy.objectives}</p>
                </div>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles.emerald.icon}`}>
                    <ClipboardCheck className="h-4 w-4" />
                </span>
            </div>

            {roleProgress.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-400">{copy.noQuests}</p>
            ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                    {roleProgress.map((item) => {
                        const quest = getQuestDefinition(item.questId);
                        if (!quest) return null;
                        const questText = getQuestText(quest, language);
                        const percent = getQuestCompletionPercent(item);
                        const statusTone: Tone = item.status === 'active' ? 'cyan' : 'emerald';

                        return (
                            <article key={item.questId} className={`${compactPanel} min-w-0 p-3`}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${toneStyles[statusTone].accent}`}>
                                            {questText.sponsor ?? '3DSFERA'}
                                        </p>
                                        <h3 className="mt-1 text-base font-black leading-tight text-white">{questText.title}</h3>
                                        <p className="mt-1.5 text-xs leading-5 text-slate-400">{questText.description}</p>
                                    </div>
                                    <StatusPill tone={statusTone}>{questStatusLabel(item, copy)}</StatusPill>
                                </div>
                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                                        <span>{percent}%</span>
                                        <span>{copy.reward}: {getQuestRewardText(quest.reward, quest.id, language)}</span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                        <div className={`h-full rounded-full ${toneStyles[statusTone].bar}`} style={{ width: `${clampPercent(percent)}%` }} />
                                    </div>
                                </div>
                                <div className="mt-3 grid gap-2">
                                    {Object.entries(item.objectives).map(([objectiveId, objective]) => (
                                        <div key={objectiveId} className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                            <CheckCircle2 className={`h-4 w-4 shrink-0 ${objective.completed ? 'text-emerald-200' : 'text-slate-600'}`} />
                                            <p className="min-w-0 flex-1 text-xs leading-5 text-slate-300">{getQuestObjectiveText(quest, objectiveId, language)}</p>
                                            <span className="shrink-0 font-mono text-xs text-slate-500">{objective.current}/{objective.target}</span>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function PlayerStartGuidePanel({ copy }: { copy: DashboardText['player'] }) {
    return (
        <section className={`${panel} sfera-guide-enter p-3`}>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{copy.startTitle}</h2>
                    <p className="mt-1 text-sm text-slate-500">{copy.startSub}</p>
                </div>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles.cyan.icon}`}>
                    <Map className="h-4 w-4" />
                </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {copy.startSteps.map((step, index) => (
                    <div key={step} className={`${compactPanel} flex min-w-0 items-center gap-3 p-3`}>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-xs font-black text-cyan-100">
                            {index + 1}
                        </span>
                        <p className="min-w-0 text-sm font-bold leading-5 text-slate-200">{step}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function RewardPanel({
    rewards,
    language,
}: {
    rewards: QuestRewardState[];
    language: AppLanguage;
}) {
    const copy = questDashboardCopy[language];
    const visibleRewards = [...rewards].reverse().slice(0, 4);

    return (
        <section className={`${panel} p-3`}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{copy.rewardWallet}</h2>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles.amber.icon}`}>
                    <Gift className="h-4 w-4" />
                </span>
            </div>
            {visibleRewards.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-400">{copy.noRewards}</p>
            ) : (
                <div className="space-y-2">
                    {visibleRewards.map((reward) => {
                        const quest = getQuestDefinition(reward.questId);
                        const questText = quest ? getQuestText(quest, language) : null;
                        return (
                            <div key={reward.id} className="rounded-lg border border-amber-300/15 bg-amber-300/[0.06] p-2.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-white">{getQuestRewardText(reward, reward.questId, language)}</p>
                                        <p className="mt-1 text-xs text-slate-400">{questText?.title ?? reward.questId}</p>
                                        {reward.kind === 'gift_code' && (
                                            <p className="mt-2 text-xs leading-5 text-amber-100/80">{copy.giftCodeMessage}</p>
                                        )}
                                    </div>
                                    <span className="rounded-full border border-amber-300/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
                                        {reward.kind === 'gift_code' ? copy.pending : reward.status === 'claimed' ? copy.claimed : copy.complete}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function RewardTerminalPanel({
    rewards,
    language,
}: {
    rewards: QuestRewardState[];
    language: AppLanguage;
}) {
    const copy = questDashboardCopy[language];

    return (
        <section className={`${panel} p-3`}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{copy.rewardTerminal}</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{copy.terminalSubtitle}</p>
                </div>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles.cyan.icon}`}>
                    <WalletCards className="h-4 w-4" />
                </span>
            </div>

            <div className="grid gap-2">
                <article className="rounded-lg border border-rose-300/15 bg-rose-300/[0.055] p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-black text-white">{copy.withdrawalTitle}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">{copy.withdrawalMessage}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-rose-300/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-100">
                            {copy.unavailable}
                        </span>
                    </div>
                </article>

                <article className="rounded-lg border border-amber-300/15 bg-amber-300/[0.055] p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-black text-white">{copy.giftCodeTitle}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">{copy.giftCodeMessage}</p>
                            <p className="mt-2 text-[11px] font-bold text-amber-100/80">{rewards.length} {copy.reward.toLowerCase()}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-amber-300/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
                            {copy.pending}
                        </span>
                    </div>
                </article>
            </div>
        </section>
    );
}

function OrderDetailsPanel({
    title,
    subtitle,
    etaLabel,
    totalLabel,
    orders,
}: {
    title: string;
    subtitle: string;
    etaLabel: string;
    totalLabel: string;
    orders: ShopperOrderDetail[];
}) {
    return (
        <section className={`${panel} p-3`}>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneStyles.emerald.icon}`}>
                    <PackageCheck className="h-4 w-4" />
                </span>
            </div>

            <div className="grid gap-2.5">
                {orders.map((order) => (
                    <article key={order.id} className={`${compactPanel} min-w-0 p-3`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{order.id}</p>
                                <h3 className="mt-1 truncate text-base font-black text-white">{order.title}</h3>
                                <p className="mt-1 text-sm text-slate-400">{order.supplier}</p>
                            </div>
                            <StatusPill tone="emerald">{order.status}</StatusPill>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{etaLabel}</p>
                                <p className="mt-1 text-sm font-bold text-slate-200">{order.eta}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{totalLabel}</p>
                                <p className="mt-1 text-sm font-bold text-slate-200">{order.total}</p>
                            </div>
                        </div>

                        <div className="mt-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                                <span>{order.status}</span>
                                <span>{clampPercent(order.progress)}%</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-emerald-300" style={{ width: `${clampPercent(order.progress)}%` }} />
                            </div>
                        </div>

                        <div className="mt-3 grid gap-1.5">
                            {order.steps.map((step) => (
                                <div key={step} className="flex items-center gap-2 text-xs text-slate-300">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>

                        <Link href="/fastview?resume=scene&mode=shopper" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300/15">
                            {order.action}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}

function VisualPanel({
    src,
    alt,
    title,
    markers,
}: {
    src: string;
    alt: string;
    title: string;
    markers: Marker[];
}) {
    return (
        <section className={`${panel} overflow-hidden`}>
            <div className="p-3 pb-2">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{title}</h2>
            </div>
            <div className="relative mx-3 mb-3 h-44 overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                <Image src={src} alt={alt} width={1200} height={760} className="h-full w-full object-cover opacity-75" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/15" />
                {markers.map((marker) => (
                    <span key={marker.label} className={`absolute rounded-lg border bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur ${marker.className}`}>
                        {marker.label}
                    </span>
                ))}
            </div>
        </section>
    );
}

function PlayerSidebar({ copy }: { copy: DashboardText }) {
    const icons = [Activity, Map, Gamepad2, Gift, WalletCards, Truck];
    const hrefs = ['/player/dashboard', '/fastview?resume=scene', '/fastview?resume=scene&mode=gamer', '/fastview', '/fastview', '/fastview'];

    return (
        <aside className="hidden border-r border-white/10 bg-[#0b1119]/88 p-3 backdrop-blur-xl xl:flex xl:flex-col">
            <div className="flex items-center gap-3 px-2 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-base font-black text-cyan-100">3D</span>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-white">3DSFERA</p>
                    <p className="text-xs text-slate-500">{copy.player.suite}</p>
                </div>
            </div>
            <nav className="mt-5 space-y-1.5">
                {copy.player.nav.map((label, index) => {
                    const Icon = icons[index];
                    const active = index === 0;
                    return (
                        <Link
                            key={label}
                            href={hrefs[index]}
                            className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                                active
                                    ? 'border-cyan-300/35 bg-cyan-300/12 text-white shadow-[0_0_32px_rgba(34,211,238,0.16)]'
                                    : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100'
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                <Icon className="h-4 w-4" />
                                {label}
                            </span>
                            {active && <ChevronRight className="h-4 w-4 text-cyan-200" />}
                        </Link>
                    );
                })}
            </nav>
            <div className="mt-auto rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">{copy.player.seasonLabel}</p>
                <p className="mt-2 text-base font-black leading-tight text-white">{copy.player.seasonTitle}</p>
                <Link href="/fastview?resume=scene&mode=gamer" className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-300/30 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
                    {copy.player.playNow}
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </aside>
    );
}

function DashboardHero({
    kicker,
    title,
    subtitle,
    src,
    alt,
    tone,
    children,
}: {
    kicker: string;
    title: string;
    subtitle: string;
    src: string;
    alt: string;
    tone: Tone;
    children?: ReactNode;
}) {
    return (
        <section className="relative min-h-36 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <Image src={src} alt={alt} width={1200} height={760} className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-50 sm:block" priority />
            <Image src={src} alt="" width={900} height={560} className="absolute inset-0 h-full w-full object-cover opacity-20 sm:hidden" aria-hidden="true" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.98),rgba(2,6,23,0.86)_54%,rgba(2,6,23,0.28))]" />
            <div className="relative max-w-2xl">
                <StatusPill tone={tone}>{kicker}</StatusPill>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{subtitle}</p>
                {children}
            </div>
        </section>
    );
}

export function GamerDashboard({ bridge = fallback, embedded = false }: DashboardProps) {
    const { language } = useLanguage();
    const copy = dashboardCopy[language];
    const coinsPreview = bridge.zombieCoins || Math.floor(bridge.zombieScore / GAME_RULES.zombieArena.zombieKillPoints) * GAME_RULES.zombieArena.coinsPerKill;
    const healthPercent = clampPercent(bridge.zombieHealth);
    const levelProgress = clampPercent(Math.max(18, bridge.zombieScore / 100));
    const playerQuestProgress = getRoleQuestProgress(bridge.questProgress, 'player');
    const questProgress = clampPercent(
        playerQuestProgress.length > 0
            ? playerQuestProgress.reduce((sum, item) => sum + getQuestCompletionPercent(item), 0) / playerQuestProgress.length
            : 0
    );
    const questDone = playerQuestProgress.reduce(
        (sum, item) => sum + Object.values(item.objectives).filter((objective) => objective.completed).length,
        0
    );
    const rewardCount = Math.max(bridge.zombieKills + bridge.maxZombieCombo, 27);
    const activityItems = bridge.recentActivity.length > 0 ? bridge.recentActivity : copy.player.recentFallback;
    const currentGame = bridge.currentGame ?? 'Zombie Arena';
    const currentLocation = bridge.currentLocation === 'city' ? copy.player.city : bridge.currentLocation;

    return (
        <DashboardFrame mode="player" sidebar={<PlayerSidebar copy={copy} />} embedded={embedded}>
            {!embedded && <DashboardBackNav />}
            <header className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <HeaderSearch label={copy.search.player} shortcut={copy.search.shortcut} />
                <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone="sky">{copy.player.mode}</StatusPill>
                    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
                        <LockKeyhole className="h-4 w-4 text-emerald-200" />
                        {copy.player.signed}
                    </span>
                </div>
            </header>

            <div className="grid gap-4">
                <main className="min-w-0 space-y-4">
                    <DashboardHero
                        kicker={copy.player.kicker}
                        title={copy.player.title}
                        subtitle={copy.player.subtitle}
                        src="/visuals/player-arena.svg"
                        alt="3DSFERA player arena dashboard"
                        tone="sky"
                    >
                        <div className="mt-4 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
                            <div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-slate-200">{copy.player.level}</span>
                                    <span className="text-slate-400">{bridge.zombieScore.toLocaleString()} / 10,000 {copy.player.xp}</span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.75)]" style={{ width: `${levelProgress}%` }} />
                                </div>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{copy.player.playerId}</p>
                                <p className="mt-1 font-mono text-sm text-slate-200">3DSF-7A2B-9C4D</p>
                            </div>
                        </div>
                    </DashboardHero>

                    <div className={metricGrid}>
                        <MetricCard title={copy.player.currentLocation} value={currentLocation} helper={copy.player.locationHelper} icon={Map} tone="cyan" />
                        <MetricCard title={copy.player.currentGame} value={currentGame} helper={copy.player.gameHelper} icon={Gamepad2} tone="sky" />
                        <MetricCard title={copy.player.health} value={`${bridge.zombieHealth} / 100`} helper={copy.player.healthHelper} icon={HeartPulse} tone="rose" progress={healthPercent} />
                        <MetricCard title={copy.player.coins} value={coinsPreview.toLocaleString()} helper={copy.player.coinsHelper} icon={Coins} tone="amber" />
                        <MetricCard title={copy.player.score} value={bridge.zombieScore.toLocaleString()} helper={copy.player.scoreHelper} icon={Trophy} tone="violet" />
                        <MetricCard title={copy.player.quests} value={`${questProgress}%`} helper={copy.player.questsHelper(questDone)} icon={ClipboardCheck} tone="emerald" progress={questProgress} />
                        <MetricCard title={copy.player.rewards} value={String(rewardCount)} helper={copy.player.rewardsHelper} icon={Gift} tone="amber" />
                        <MetricCard title={copy.player.threat} value={String(bridge.zombieThreatLevel)} helper={bridge.zombieRank} icon={Zap} tone="rose" />
                    </div>

                    <PlayerStartGuidePanel copy={copy.player} />
                    <QuestPanel role="player" progress={bridge.questProgress} language={language} />

                    <section className={`${panel} p-3`}>
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{copy.player.zonesTitle}</h2>
                                <p className="mt-1 text-sm text-slate-500">{copy.player.zonesSub}</p>
                            </div>
                            <Link href="/fastview?resume=scene&mode=gamer" className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-sky-100">
                                {copy.enterWorld}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className={threeCardGrid}>
                            {copy.player.zones.map((zone) => (
                                <WorkCard key={zone.title} title={zone.title} text={zone.text} icon={zone.icon} tone={zone.tone} href="/fastview?resume=scene&mode=gamer" action={zone.action} />
                            ))}
                        </div>
                    </section>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <ListPanel title={copy.player.rewardQueueTitle} icon={Truck} tone="amber" items={copy.player.rewardQueue} />
                        <ListPanel title={copy.player.messagesTitle} icon={MessageSquare} tone="cyan" items={copy.player.messages} />
                    </div>
                </main>

                <aside className={dashboardSideGrid}>
                    <ListPanel title={copy.player.recentTitle} icon={Clock3} tone="sky" items={activityItems.slice(0, 5)} />
                    <RewardPanel rewards={bridge.questRewards} language={language} />
                    <RewardTerminalPanel rewards={bridge.questRewards} language={language} />
                    <VisualPanel src="/visuals/shopper-market.svg" alt="3DSFERA city overview map" title={copy.player.cityOverview} markers={copy.player.markers} />
                    <section className={`${panel} p-3`}>
                        <div className="flex items-center gap-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                                <ShieldCheck className="h-6 w-6" />
                            </span>
                            <div>
                                <p className="font-black text-white">{copy.player.eventTitle}</p>
                                <p className="text-sm text-slate-400">{copy.player.eventText}</p>
                            </div>
                            <div className="ml-auto text-right font-mono text-lg text-slate-200">02:18</div>
                        </div>
                    </section>
                </aside>
            </div>
        </DashboardFrame>
    );
}

export function ShopperDashboard({ bridge = fallback, embedded = false }: DashboardProps) {
    const { language } = useLanguage();
    const copy = dashboardCopy[language];
    const currentLocation = bridge.currentLocation === 'city' ? 'Sfera Hall' : bridge.currentLocation;

    return (
        <DashboardFrame mode="shopper" embedded={embedded}>
            {!embedded && <DashboardBackNav />}
            <header className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <HeaderSearch label={copy.search.shopper} shortcut={copy.search.shortcut} />
                <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone="amber">{copy.shopper.mode}</StatusPill>
                    <Link href="/fastview?resume=scene&mode=shopper" className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
                        {copy.shopper.openHall}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </header>

            <div className="grid gap-4">
                <main className="min-w-0 space-y-4">
                    <DashboardHero
                        kicker={copy.shopper.kicker}
                        title={copy.shopper.title}
                        subtitle={copy.shopper.subtitle}
                        src="/visuals/shopper-market.svg"
                        alt="3DSFERA shopper marketplace dashboard"
                        tone="amber"
                    >
                        <div className="mt-4 flex flex-wrap gap-3">
                            <StatusPill tone="cyan">{copy.shopper.location}: {currentLocation}</StatusPill>
                            <StatusPill tone="emerald">{copy.shopper.suppliersOnline}</StatusPill>
                        </div>
                    </DashboardHero>

                    <div className={metricGrid}>
                        <MetricCard title={copy.shopper.savedProducts} value="12" helper={copy.shopper.savedProductsHelper} icon={Star} tone="amber" />
                        <MetricCard title={copy.shopper.activeOrders} value="3" helper={copy.shopper.activeOrdersHelper} icon={PackageCheck} tone="emerald" />
                        <MetricCard title={copy.shopper.supplierReplies} value="5" helper={copy.shopper.supplierRepliesHelper} icon={MessageSquare} tone="cyan" />
                        <MetricCard title={copy.shopper.protection} value={copy.shopper.protectionValue} helper={copy.shopper.protectionHelper} icon={ShieldCheck} tone="sky" />
                    </div>

                    <section className={`${panel} p-3`}>
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{copy.shopper.workflowTitle}</h2>
                                <p className="mt-1 text-sm text-slate-500">{copy.shopper.workflowSub}</p>
                            </div>
                            <Link href="/fastview?resume=scene&mode=shopper" className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
                                {copy.shopper.shopIn3d}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className={threeCardGrid}>
                            {copy.shopper.workflow.map((item) => (
                                <WorkCard key={item.title} title={item.title} text={item.text} icon={item.icon} tone={item.tone} action={item.action} />
                            ))}
                        </div>
                    </section>
                </main>

                <aside className={dashboardSideGrid}>
                    <OrderDetailsPanel
                        title={copy.shopper.orderDetailsTitle}
                        subtitle={copy.shopper.orderDetailsSub}
                        etaLabel={copy.shopper.orderEtaLabel}
                        totalLabel={copy.shopper.orderTotalLabel}
                        orders={copy.shopper.orderDetails}
                    />
                    <VisualPanel src="/visuals/shopper-market.svg" alt="Sfera Hall shopper map" title={copy.shopper.mapTitle} markers={copy.shopper.markers} />
                    <ListPanel title={copy.shopper.messagesTitle} icon={MessageSquare} tone="cyan" items={copy.shopper.messages} />
                    <ListPanel title={copy.shopper.dealsTitle} icon={Gift} tone="amber" items={copy.shopper.deals} />
                </aside>
            </div>
        </DashboardFrame>
    );
}

export function SupplierDashboard({ embedded = false }: DashboardProps = {}) {
    const { language } = useLanguage();
    const copy = dashboardCopy[language];

    return (
        <DashboardFrame mode="business" embedded={embedded}>
            {!embedded && <DashboardBackNav />}
            <header className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <HeaderSearch label={copy.search.business} shortcut={copy.search.shortcut} />
                <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone="emerald">{copy.business.mode}</StatusPill>
                    <Link href="/login?role=supplier&next=/supplier/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
                        {copy.business.portal}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </header>

            <div className="grid gap-4">
                <main className="min-w-0 space-y-4">
                    <DashboardHero
                        kicker={copy.business.kicker}
                        title={copy.business.title}
                        subtitle={copy.business.subtitle}
                        src="/visuals/business-pavilion.svg"
                        alt="3DSFERA supplier pavilion dashboard"
                        tone="emerald"
                    >
                        <div className="mt-4 flex flex-wrap gap-3">
                            <StatusPill tone="emerald">{copy.business.pavilionHealth}</StatusPill>
                            <StatusPill tone="cyan">{copy.business.buyersOnline}</StatusPill>
                        </div>
                    </DashboardHero>

                    <div className={metricGrid}>
                        <MetricCard title={copy.business.buyerLeads} value="28" helper={copy.business.buyerLeadsHelper} icon={Users} tone="emerald" />
                        <MetricCard title={copy.business.productReadiness} value="84%" helper={copy.business.productReadinessHelper} icon={Box} tone="cyan" progress={84} />
                        <MetricCard title={copy.business.quotePipeline} value="$42K" helper={copy.business.quotePipelineHelper} icon={CircleDollarSign} tone="amber" />
                        <MetricCard title={copy.business.pavilionRoi} value="3.8x" helper={copy.business.pavilionRoiHelper} icon={LineChart} tone="sky" />
                    </div>

                    <section className={`${panel} p-3`}>
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">{copy.business.operationsTitle}</h2>
                                <p className="mt-1 text-sm text-slate-500">{copy.business.operationsSub}</p>
                            </div>
                            <Link href="/supplier/upload" className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
                                {copy.business.uploadProducts}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className={threeCardGrid}>
                            {copy.business.operations.map((item) => (
                                <WorkCard key={item.title} title={item.title} text={item.text} icon={item.icon} tone={item.tone} href={item.href} action={item.action} />
                            ))}
                        </div>
                    </section>
                </main>

                <aside className={dashboardSideGrid}>
                    <VisualPanel src="/visuals/business-pavilion.svg" alt="Supplier pavilion preview" title={copy.business.previewTitle} markers={copy.business.markers} />
                    <ListPanel title={copy.business.pipelineTitle} icon={PackageCheck} tone="emerald" items={copy.business.pipeline} />
                    <ListPanel title={copy.business.checklistTitle} icon={CalendarCheck} tone="cyan" items={copy.business.checklist} />
                    <ListPanel title={copy.business.revenueTitle} icon={CreditCard} tone="amber" items={copy.business.revenue} />
                </aside>
            </div>
        </DashboardFrame>
    );
}
