'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { GAME_RULES } from '@/lib/unreal/gameRules';
import type { AppLanguage } from '@/lib/i18n';
import type { UnrealEventBridgeState } from '@/lib/unreal/types';

type DashboardProps = {
    bridge?: UnrealEventBridgeState;
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
    recentActivity: ['entered Zombie Arena', 'zombie killed', 'player hit', 'returned to city'],
};

const shell = 'relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(102,217,203,0.18),transparent_34%),linear-gradient(145deg,rgba(3,7,18,0.96),rgba(15,23,42,0.9)_48%,rgba(3,7,18,0.98))] p-6 text-white shadow-[0_40px_140px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-8';
const card = 'group relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#66d9cb]/35 hover:bg-[#66d9cb]/[0.08] hover:shadow-[0_24px_70px_rgba(102,217,203,0.12)]';
const sectionTitle = 'inline-flex rounded-full border border-[#66d9cb]/25 bg-[#66d9cb]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#9ff4ec] shadow-[0_0_30px_rgba(102,217,203,0.12)]';

const dashboardCopy = {
    en: {
        enterWorld: 'Enter world',
        playerTitle: 'Player / Gamer Dashboard',
        playerMode: 'Current mode: Player Mode',
        playerReady: 'Ready for game zones, rewards, quests, and marketplace gifts.',
        zombieScore: 'Zombie score',
        health: 'Health / lives',
        coins: 'Coins / rewards preview',
        overwhelmed: 'You were overwhelmed',
        arenaStreak: 'Arena streak',
        maxCombo: 'Max combo',
        threat: 'Threat level',
        survivorRank: 'Survivor rank',
        kills: 'Kills',
        hits: 'Hits taken',
        quests: 'Quests available',
        gameZones: 'Game zones available',
        playerQuestItems: ['Clear a zombie wave', 'Win a racing challenge', 'Find marketplace treasure gifts'],
        zoneItems: ['Zombie Arena', 'Racing Zone', 'Treasure Hunt'],
        giftsTitle: 'Gifts from playing games',
        gifts: ['Daily gift: claim a mystery product coupon after one arena run.', 'Skill gift: combo streaks unlock better reward tiers.', 'Delivery gift: physical rewards can be sent to the saved delivery location.'],
        playerOrdersTitle: 'Orders / rewards status',
        playerOrders: ['Gaming headset reward — Gift unlocked · choose delivery location', 'Zombie Arena coin payout — Pending match settlement', 'Sfera Hall merch drop — Ready to claim in marketplace'],
        messages: 'Messages',
        playerMessages: ['Arena host: New weekly survival tournament is open.', 'Marketplace concierge: Your reward gift can be bundled with a real product order.', 'Supplier: You received a player-only discount code.'],
        deliveryLocation: 'Delivery location',
        playerDelivery: 'No address connected yet. Add city, phone, and delivery preference before claiming physical game gifts.',
        addDelivery: 'Add delivery location',
        recentActivity: 'Recent activity',
        wallet: 'Wallet preview',
        walletText: 'Coins, coupon gifts, and tournament prizes appear here before payout or checkout integration.',
        arenaMoments: 'Interactive arena moments',
        shopperTitle: 'Shopper / Buyer Dashboard',
        shopperMode: 'Current mode: Shopper Mode',
        currentLocation: 'Current location',
        hallAccess: 'Sfera Hall and marketplace access are open to everyone.',
        productDiscovery: 'Product discovery',
        productDiscoveryText: 'Browse pavilions, product cards, catalogues, showroom previews, and supplier chat.',
        savedProducts: 'Saved products',
        savedProductsText: '12 favorites · 3 products in comparison · 2 price alerts.',
        orderStatus: 'Order status',
        orderStatusText: 'Track cart, payment, supplier confirmation, packing, delivery, and returns.',
        gameZonesShopper: 'Game zones are only available in Player Mode.',
        ordersDelivery: 'Orders / delivery',
        buyerOrders: ['Mira pendant lights — Supplier confirmed · awaiting payment', 'Double Lin sample box — In delivery · ETA 3-5 days', 'Saved cart — 3 products waiting for checkout'],
        buyerDelivery: 'Primary: Dubai Marina, UAE · Evening delivery preferred · Contact by WhatsApp before courier handoff.',
        manageDelivery: 'Manage delivery location',
        buyerMessages: ['Youbo supplier replied with a bulk discount.', 'Concierge suggested 4 matching pendant lights.', 'Delivery support needs confirmation for sample timing.'],
        deals: 'Deals / gifts',
        dealsText: 'Player reward coupons and supplier gifts can be applied to real marketplace orders.',
        shoppingList: 'Shopping list',
        shoppingItems: ['Kitchen lighting upgrade', 'Hotel lobby sample request', 'Compare verified suppliers'],
        buyerProtection: 'Buyer protection',
        buyerProtectionText: 'Placeholder for escrow, verified supplier badges, return rules, and dispute support.',
        businessTitle: 'Business / Supplier Dashboard',
        businessHeading: 'Pavilion, store, and game-hosting control center',
        businessSub: 'Manage showroom presence, products, buyer messages, pavilion rental, events, leads, and fulfilment.',
        pavilionManagement: 'Pavilion management',
        pavilionManagementText: 'Configure showroom identity, 3D scenes, banners, floor placement, and store details.',
        rentPavilion: 'Rent a pavilion',
        rentPavilionText: 'Choose mall zone, lease duration, promotion level, and launch date.',
        hostGame: 'Host a game',
        hostGameText: 'Sponsor treasure hunts, branded arena rewards, racing events, or coupon quests.',
        leads: 'Orders / leads',
        leadsText: 'Review buyer conversations, quotes, sample requests, order status, and follow-ups.',
        productUpload: 'Product upload / management',
        productUploadText: 'Upload product data, pricing, inventory, 3D models, catalogues, certifications, and localized descriptions.',
        supplierMessages: ['3 buyer messages awaiting reply', '1 pavilion rental question from 3DSFERA ops', '2 game-sponsorship leads requested coupon terms'],
        orderPipeline: 'Order pipeline',
        supplierOrders: ['Youbo buyer lead — New message · reply needed', 'Double Lin bulk quote — Quote draft ready', 'Sample shipment — Packing · delivery details received'],
        analytics: 'Analytics',
        analyticsText: 'Visits, dwell time, product focus, chat conversion, quote conversion, game reward redemptions, and pavilion ROI.',
        fulfilment: 'Fulfilment settings',
        fulfilmentText: 'Set warehouses, delivery regions, sample shipment rules, return windows, and buyer support contacts.',
        showroomPreview: 'Showroom / pavilion preview',
        showroomPreviewText: 'Preview how your store, sponsored quests, and product hotspots appear inside the Unreal world.',
    },
    ru: {
        enterWorld: 'Войти в мир', playerTitle: 'Панель игрока / геймера', playerMode: 'Текущий режим: режим игрока', playerReady: 'Готово для игровых зон, наград, квестов и подарков маркетплейса.', zombieScore: 'Счёт в Zombie Arena', health: 'Здоровье / жизни', coins: 'Монеты / прогноз наград', overwhelmed: 'Тебя окружили', arenaStreak: 'Серия арены', maxCombo: 'Макс. комбо', threat: 'Уровень угрозы', survivorRank: 'Ранг выжившего', kills: 'Убийства', hits: 'Получено ударов', quests: 'Доступные квесты', gameZones: 'Доступные игровые зоны', playerQuestItems: ['Очистить волну зомби', 'Выиграть гонку', 'Найти подарки-сокровища в маркетплейсе'], zoneItems: ['Zombie Arena', 'Racing Zone', 'Treasure Hunt'], giftsTitle: 'Подарки за игры', gifts: ['Ежедневный подарок: купон после одного захода на арену.', 'Подарок за навык: серии комбо открывают лучшие награды.', 'Подарок с доставкой: физические награды можно отправить на адрес доставки.'], playerOrdersTitle: 'Статус заказов / наград', playerOrders: ['Игровая гарнитура — подарок открыт · выберите адрес', 'Монеты Zombie Arena — ожидают расчёта матча', 'Мерч Sfera Hall — готов к получению в маркетплейсе'], messages: 'Сообщения', playerMessages: ['Организатор арены: открыт недельный турнир.', 'Консьерж: подарок можно объединить с реальным заказом.', 'Поставщик: получен скидочный код для игроков.'], deliveryLocation: 'Адрес доставки', playerDelivery: 'Адрес пока не подключён. Добавьте город, телефон и способ доставки перед получением физических подарков.', addDelivery: 'Добавить адрес', recentActivity: 'Последняя активность', wallet: 'Кошелёк', walletText: 'Монеты, купоны и призы турниров появятся здесь до выплат или оформления заказа.', arenaMoments: 'Интерактивные моменты арены', shopperTitle: 'Панель покупателя', shopperMode: 'Текущий режим: режим покупателя', currentLocation: 'Текущая локация', hallAccess: 'Sfera Hall и маркетплейс доступны всем.', productDiscovery: 'Поиск товаров', productDiscoveryText: 'Смотрите павильоны, карточки товаров, каталоги, шоурумы и чат с поставщиком.', savedProducts: 'Сохранённые товары', savedProductsText: '12 избранных · 3 товара в сравнении · 2 уведомления о цене.', orderStatus: 'Статус заказа', orderStatusText: 'Отслеживайте корзину, оплату, подтверждение поставщика, упаковку, доставку и возвраты.', gameZonesShopper: 'Игровые зоны доступны только в режиме игрока.', ordersDelivery: 'Заказы / доставка', buyerOrders: ['Светильники Mira — поставщик подтвердил · ожидается оплата', 'Образцы Double Lin — в доставке · 3–5 дней', 'Сохранённая корзина — 3 товара ждут оформления'], buyerDelivery: 'Основной адрес: Dubai Marina, UAE · вечерняя доставка · связаться в WhatsApp перед курьером.', manageDelivery: 'Управлять доставкой', buyerMessages: ['Поставщик Youbo ответил со скидкой.', 'Консьерж предложил 4 подходящих светильника.', 'Служба доставки просит подтвердить время.'], deals: 'Скидки / подарки', dealsText: 'Игровые купоны и подарки поставщиков можно применять к реальным заказам.', shoppingList: 'Список покупок', shoppingItems: ['Обновление освещения кухни', 'Запрос образцов для лобби отеля', 'Сравнить проверенных поставщиков'], buyerProtection: 'Защита покупателя', buyerProtectionText: 'Плейсхолдер для эскроу, проверенных поставщиков, возвратов и споров.', businessTitle: 'Панель бизнеса / поставщика', businessHeading: 'Центр управления павильоном, магазином и играми', businessSub: 'Управляйте шоурумом, товарами, сообщениями, арендой павильона, событиями, лидами и доставкой.', pavilionManagement: 'Управление павильоном', pavilionManagementText: 'Настройте бренд, 3D-сцены, баннеры, место на карте и данные магазина.', rentPavilion: 'Арендовать павильон', rentPavilionText: 'Выберите зону молла, срок аренды, промо-уровень и дату запуска.', hostGame: 'Провести игру', hostGameText: 'Спонсируйте охоту за сокровищами, награды арены, гонки или купонные квесты.', leads: 'Заказы / лиды', leadsText: 'Работайте с переписками, КП, образцами, статусом заказов и follow-up.', productUpload: 'Загрузка / управление товарами', productUploadText: 'Загружайте данные, цены, остатки, 3D-модели, каталоги, сертификаты и локализации.', supplierMessages: ['3 сообщения покупателей ждут ответа', '1 вопрос об аренде павильона от команды 3DSFERA', '2 лида по игровому спонсорству запросили условия купонов'], orderPipeline: 'Воронка заказов', supplierOrders: ['Лид Youbo — новое сообщение · нужен ответ', 'Оптовый запрос Double Lin — черновик КП готов', 'Отправка образцов — упаковка · адрес получен'], analytics: 'Аналитика', analyticsText: 'Визиты, время в павильоне, фокус на товарах, конверсия чата, КП, игровые купоны и ROI.', fulfilment: 'Настройки доставки', fulfilmentText: 'Склады, регионы доставки, правила образцов, возвраты и контакты поддержки.', showroomPreview: 'Превью шоурума / павильона', showroomPreviewText: 'Посмотрите, как магазин, квесты и хотспоты товаров выглядят в Unreal-мире.',
    },
    zh: {
        enterWorld: '进入世界', playerTitle: '玩家 / 游戏仪表盘', playerMode: '当前模式：玩家模式', playerReady: '可进入游戏区、奖励、任务和商城礼物。', zombieScore: '僵尸积分', health: '生命 / 血量', coins: '金币 / 奖励预览', overwhelmed: '你被包围了', arenaStreak: '竞技场连击', maxCombo: '最高连击', threat: '威胁等级', survivorRank: '幸存者等级', kills: '击杀', hits: '受击', quests: '可用任务', gameZones: '可用游戏区', playerQuestItems: ['清理一波僵尸', '赢得赛车挑战', '寻找商城宝藏礼物'], zoneItems: ['Zombie Arena', 'Racing Zone', 'Treasure Hunt'], giftsTitle: '游戏礼物', gifts: ['每日礼物：完成一次竞技场后领取神秘优惠券。', '技巧礼物：连击越高奖励等级越好。', '配送礼物：实物奖励可寄送到保存的地址。'], playerOrdersTitle: '订单 / 奖励状态', playerOrders: ['游戏耳机奖励 — 已解锁 · 选择配送地址', 'Zombie Arena 金币结算 — 等待比赛结算', 'Sfera Hall 周边 — 可在商城领取'], messages: '消息', playerMessages: ['竞技场主办方：每周生存赛已开放。', '商城助手：你的奖励可与真实订单合并。', '供应商：你获得了玩家专属折扣码。'], deliveryLocation: '配送地址', playerDelivery: '尚未绑定地址。领取实物游戏礼物前请添加城市、电话和配送偏好。', addDelivery: '添加配送地址', recentActivity: '最近活动', wallet: '钱包预览', walletText: '金币、优惠券和锦标赛奖品会先显示在这里，之后接入结算或下单。', arenaMoments: '竞技场互动时刻', shopperTitle: '购物者 / 买家仪表盘', shopperMode: '当前模式：购物者模式', currentLocation: '当前位置', hallAccess: 'Sfera Hall 和商城对所有人开放。', productDiscovery: '商品发现', productDiscoveryText: '浏览展馆、商品卡、目录、展厅预览和供应商聊天。', savedProducts: '收藏商品', savedProductsText: '12 个收藏 · 3 个对比商品 · 2 个价格提醒。', orderStatus: '订单状态', orderStatusText: '追踪购物车、付款、供应商确认、打包、配送和退货。', gameZonesShopper: '游戏区仅在玩家模式开放。', ordersDelivery: '订单 / 配送', buyerOrders: ['Mira 吊灯 — 供应商已确认 · 等待付款', 'Double Lin 样品盒 — 配送中 · 预计 3-5 天', '已保存购物车 — 3 件商品待结算'], buyerDelivery: '默认地址：Dubai Marina, UAE · 偏好晚间配送 · 快递交接前 WhatsApp 联系。', manageDelivery: '管理配送地址', buyerMessages: ['Youbo 供应商回复了批量折扣。', '助手推荐了 4 款匹配吊灯。', '配送支持需要确认样品时间。'], deals: '优惠 / 礼物', dealsText: '玩家奖励券和供应商礼物可用于真实商城订单。', shoppingList: '购物清单', shoppingItems: ['厨房照明升级', '酒店大堂样品申请', '比较认证供应商'], buyerProtection: '买家保障', buyerProtectionText: '用于托管支付、认证供应商标识、退货规则和争议支持的占位模块。', businessTitle: '商家 / 供应商仪表盘', businessHeading: '展馆、店铺和游戏主办控制中心', businessSub: '管理展厅、商品、买家消息、展馆租赁、活动、线索和履约。', pavilionManagement: '展馆管理', pavilionManagementText: '配置展厅身份、3D 场景、横幅、楼层位置和店铺信息。', rentPavilion: '租赁展馆', rentPavilionText: '选择商城区域、租期、推广等级和上线日期。', hostGame: '主办游戏', hostGameText: '赞助寻宝、品牌竞技场奖励、赛车活动或优惠券任务。', leads: '订单 / 线索', leadsText: '查看买家对话、报价、样品请求、订单状态和跟进。', productUpload: '商品上传 / 管理', productUploadText: '上传商品数据、价格、库存、3D 模型、目录、认证和本地化描述。', supplierMessages: ['3 条买家消息待回复', '1 条来自 3DSFERA 运营的展馆租赁问题', '2 条游戏赞助线索请求优惠券条款'], orderPipeline: '订单流程', supplierOrders: ['Youbo 买家线索 — 新消息 · 需要回复', 'Double Lin 批量报价 — 报价草稿已就绪', '样品发货 — 打包中 · 已收到配送信息'], analytics: '数据分析', analyticsText: '访问、停留时间、商品关注、聊天转化、报价转化、游戏奖励兑换和展馆 ROI。', fulfilment: '履约设置', fulfilmentText: '设置仓库、配送区域、样品规则、退货窗口和买家支持联系人。', showroomPreview: '展厅 / 展馆预览', showroomPreviewText: '预览你的店铺、赞助任务和商品热点在 Unreal 世界中的呈现。',
    },
} satisfies Record<AppLanguage, Record<string, string | string[]>>;

const list = (items: string[]) => items.map((item) => <li key={item}>{item}</li>);

const DashboardBackNav = () => (
    <div className="relative mb-5 flex flex-wrap items-center gap-2">
        <Link href="/roles" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-[#66d9cb]/40 hover:bg-[#66d9cb]/10 hover:text-[#9ff4ec]">← Roles</Link>
        <Link href="/experience" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-[#66d9cb]/40 hover:bg-[#66d9cb]/10 hover:text-[#9ff4ec]">World</Link>
        <Link href="/" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-[#66d9cb]/40 hover:bg-[#66d9cb]/10 hover:text-[#9ff4ec]">Home</Link>
    </div>
);

export function GamerDashboard({ bridge = fallback }: DashboardProps) {
    const { language } = useLanguage();
    const t = dashboardCopy[language];
    const coinsPreview = bridge.zombieCoins || Math.floor(bridge.zombieScore / GAME_RULES.zombieArena.zombieKillPoints) * GAME_RULES.zombieArena.coinsPerKill;
    const healthPercent = Math.max(0, Math.min(100, bridge.zombieHealth));
    const nextRewardProgress = Math.min(100, (bridge.zombieKills % 5) * 20);

    return (
        <section className={shell}>
            <DashboardBackNav />
            <div className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#66d9cb]/20 shadow-[0_28px_90px_rgba(0,0,0,0.36)]">
                <Image src="/visuals/player-arena.svg" alt="Premium Zombie Arena dashboard illustration" width={1200} height={760} className="h-56 w-full object-cover md:h-72" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-slate-950/20" />
            </div>
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#66d9cb]/15 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-indigo-500/10 blur-[110px]" />

            <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="overflow-hidden rounded-[2rem] border border-[#66d9cb]/20 bg-[radial-gradient(circle_at_18%_18%,rgba(102,217,203,0.2),transparent_32%),linear-gradient(145deg,rgba(15,23,42,0.72),rgba(2,6,23,0.82))] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className={sectionTitle}>{t.playerTitle}</p>
                            <h2 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                                <span className="bg-[linear-gradient(135deg,#ffffff,#9ff4ec_55%,#ffffff)] bg-clip-text text-transparent">{t.survivorRank}</span>
                                <span className="block text-2xl text-white/80 md:text-3xl">{bridge.zombieRank}</span>
                            </h2>
                            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
                                {bridge.isInGame ? `${bridge.currentGame}` : t.playerReady}
                            </p>
                        </div>
                        <Link href="/experience" className="rounded-full bg-[linear-gradient(135deg,#66d9cb,#d9fff9)] px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_12px_35px_rgba(102,217,203,0.28)] transition hover:scale-[1.02]">
                            {t.enterWorld}
                        </Link>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-[13rem_1fr]">
                        <div className="relative mx-auto flex h-52 w-52 items-center justify-center rounded-full border border-white/10 bg-black/30 shadow-[inset_0_0_45px_rgba(102,217,203,0.14)]" style={{ background: `conic-gradient(#66d9cb ${healthPercent}%, rgba(255,255,255,0.08) 0)` }}>
                            <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full border border-white/10 bg-slate-950 text-center shadow-[0_18px_55px_rgba(0,0,0,0.45)]">
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t.health}</span>
                                <strong className="mt-1 text-5xl font-black text-white">{bridge.zombieHealth}</strong>
                                <span className="text-xs text-[#9ff4ec]">{bridge.zombieCombo}x {t.arenaStreak}</span>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className={card}><p className="text-xs uppercase text-slate-400">{t.zombieScore}</p><p className="mt-2 text-4xl font-black">{bridge.zombieScore}</p></div>
                            <div className={card}><p className="text-xs uppercase text-slate-400">{t.coins}</p><p className="mt-2 text-4xl font-black">{coinsPreview}</p></div>
                            <div className={card}><p className="text-xs uppercase text-slate-400">{t.maxCombo}</p><p className="mt-2 text-4xl font-black">{bridge.maxZombieCombo}x</p></div>
                            <div className={card}><p className="text-xs uppercase text-slate-400">{t.threat}</p><p className="mt-2 text-4xl font-black">{bridge.zombieThreatLevel}</p></div>
                        </div>
                    </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-black/25 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                        <div><p className={sectionTitle}>{t.quests}</p><h3 className="mt-3 text-2xl font-black">Mission constellation</h3></div>
                        <span className="rounded-full border border-[#66d9cb]/25 bg-[#66d9cb]/10 px-3 py-1 text-xs font-black text-[#9ff4ec]">{nextRewardProgress}%</span>
                    </div>
                    <div className="relative mt-8 min-h-64 rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(102,217,203,0.12),transparent_44%)] p-5">
                        <div className="absolute left-[18%] top-[28%] h-2 w-[62%] rotate-6 bg-gradient-to-r from-[#66d9cb]/10 via-[#66d9cb]/60 to-[#66d9cb]/10" />
                        {(t.playerQuestItems as string[]).map((item, index) => (
                            <div key={item} className={`absolute ${index === 0 ? 'left-[6%] top-[18%]' : index === 1 ? 'right-[10%] top-[36%]' : 'left-[28%] bottom-[12%]'}`}>
                                <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border border-[#66d9cb]/35 bg-slate-950/85 p-3 text-center shadow-[0_0_45px_rgba(102,217,203,0.16)]">
                                    <span className="text-lg">{index === 0 ? '⚔️' : index === 1 ? '🏁' : '🎁'}</span>
                                    <span className="mt-1 text-[10px] font-bold leading-tight text-slate-200">{item}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr_0.9fr]">
                <div className={card}>
                    <h3 className="font-semibold">{t.giftsTitle}</h3>
                    <div className="mt-4 space-y-3">{(t.gifts as string[]).map((gift, index) => <div key={gift} className="rounded-2xl border border-white/10 bg-black/25 p-3"><div className="flex items-start gap-3"><span className="text-2xl">{index === 0 ? '🎲' : index === 1 ? '🔥' : '📦'}</span><p className="text-sm leading-5 text-slate-300">{gift}</p></div></div>)}</div>
                </div>
                <div className={card}>
                    <div className="flex items-center justify-between"><h3 className="font-semibold">Reward vault</h3><span className="text-xs font-bold text-[#9ff4ec]">{coinsPreview} coins</span></div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[linear-gradient(90deg,#66d9cb,#d9fff9)]" style={{ width: `${nextRewardProgress}%` }} /></div>
                    <ul className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-3">{list(t.playerOrders as string[])}</ul>
                </div>
                <div className={card}>
                    <h3 className="font-semibold">{t.messages}</h3>
                    <ul className="mt-4 space-y-3 text-sm text-slate-300">{list(t.playerMessages as string[])}</ul>
                </div>
            </div>

            <div className="relative mt-6 grid gap-4 lg:grid-cols-3">
                <div className={card}><h3 className="font-semibold">{t.deliveryLocation}</h3><p className="mt-3 text-sm text-slate-300">{t.playerDelivery}</p><button className="mt-4 rounded-full border border-[#66d9cb]/45 bg-[#66d9cb]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#9ff4ec] transition hover:bg-[#66d9cb]/20">{t.addDelivery}</button></div>
                <div className={card}><h3 className="font-semibold">{t.recentActivity}</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{bridge.recentActivity.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>
                <div className={card}><h3 className="font-semibold">{t.wallet}</h3><p className="mt-3 text-sm text-slate-300">{t.walletText}</p></div>
            </div>

            {bridge.arenaMoments.length > 0 && <div className="relative mt-4 rounded-[1.5rem] border border-[#66d9cb]/20 bg-[#66d9cb]/10 p-4"><h3 className="font-semibold">{t.arenaMoments}</h3><div className="mt-3 grid gap-2 md:grid-cols-2">{bridge.arenaMoments.map((moment) => <div key={moment.id} className="rounded-xl border border-white/10 bg-black/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"><p className="text-sm font-semibold text-white">{moment.title}</p><p className="mt-1 text-xs text-slate-300">{moment.description}</p></div>)}</div></div>}
        </section>
    );
}

export function ShopperDashboard({ bridge = fallback }: DashboardProps) {
    const { language } = useLanguage();
    const t = dashboardCopy[language];
    return <section className={shell}><DashboardBackNav /><div className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#66d9cb]/20 shadow-[0_28px_90px_rgba(0,0,0,0.36)]"><Image src="/visuals/shopper-market.svg" alt="Premium Sfera Hall shopping illustration" width={1200} height={760} className="h-52 w-full object-cover md:h-64" /><div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-slate-950/20" /></div><p className={sectionTitle}>{t.shopperTitle}</p><h2 className="mt-2 text-3xl font-semibold">{t.shopperMode}</h2><p className="mt-2 text-sm text-slate-300">{t.currentLocation}: {bridge.currentLocation}. {t.hallAccess}</p><div className="mt-6 grid gap-4 md:grid-cols-4"><div className={card}><h3 className="font-semibold">{t.productDiscovery}</h3><p className="mt-2 text-sm text-slate-300">{t.productDiscoveryText}</p></div><div className={card}><h3 className="font-semibold">{t.savedProducts}</h3><p className="mt-2 text-sm text-slate-300">{t.savedProductsText}</p></div><div className={card}><h3 className="font-semibold">{t.orderStatus}</h3><p className="mt-2 text-sm text-slate-300">{t.orderStatusText}</p></div><div className={card}><h3 className="font-semibold">{t.gameZones}</h3><p className="mt-2 text-sm text-amber-200">{t.gameZonesShopper}</p></div></div><div className="mt-6 grid gap-4 lg:grid-cols-3"><div className={card}><h3 className="font-semibold">{t.ordersDelivery}</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{list(t.buyerOrders as string[])}</ul></div><div className={card}><h3 className="font-semibold">{t.deliveryLocation}</h3><p className="mt-3 text-sm text-slate-300">{t.buyerDelivery}</p><button className="mt-4 rounded-full border border-[#66d9cb]/45 bg-[#66d9cb]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#9ff4ec] transition hover:bg-[#66d9cb]/20">{t.manageDelivery}</button></div><div className={card}><h3 className="font-semibold">{t.messages}</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{list(t.buyerMessages as string[])}</ul></div><div className={card}><h3 className="font-semibold">{t.deals}</h3><p className="mt-3 text-sm text-slate-300">{t.dealsText}</p></div><div className={card}><h3 className="font-semibold">{t.shoppingList}</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{list(t.shoppingItems as string[])}</ul></div><div className={card}><h3 className="font-semibold">{t.buyerProtection}</h3><p className="mt-3 text-sm text-slate-300">{t.buyerProtectionText}</p></div></div></section>;
}

export function SupplierDashboard() {
    const { language } = useLanguage();
    const t = dashboardCopy[language];
    return <section className={shell}><DashboardBackNav /><div className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#66d9cb]/20 shadow-[0_28px_90px_rgba(0,0,0,0.36)]"><Image src="/visuals/business-pavilion.svg" alt="Premium supplier pavilion illustration" width={1200} height={760} className="h-52 w-full object-cover md:h-64" /><div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-slate-950/20" /></div><p className={sectionTitle}>{t.businessTitle}</p><h2 className="mt-2 text-3xl font-semibold">{t.businessHeading}</h2><p className="mt-2 text-sm text-slate-300">{t.businessSub}</p><div className="mt-6 grid gap-4 md:grid-cols-4"><div className={card}><h3 className="font-semibold">{t.pavilionManagement}</h3><p className="mt-2 text-sm text-slate-300">{t.pavilionManagementText}</p></div><div className={card}><h3 className="font-semibold">{t.rentPavilion}</h3><p className="mt-2 text-sm text-slate-300">{t.rentPavilionText}</p></div><div className={card}><h3 className="font-semibold">{t.hostGame}</h3><p className="mt-2 text-sm text-slate-300">{t.hostGameText}</p></div><div className={card}><h3 className="font-semibold">{t.leads}</h3><p className="mt-2 text-sm text-slate-300">{t.leadsText}</p></div></div><div className="mt-6 grid gap-4 lg:grid-cols-3"><div className={card}><h3 className="font-semibold">{t.productUpload}</h3><p className="mt-3 text-sm text-slate-300">{t.productUploadText}</p></div><div className={card}><h3 className="font-semibold">{t.messages}</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{list(t.supplierMessages as string[])}</ul></div><div className={card}><h3 className="font-semibold">{t.orderPipeline}</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{list(t.supplierOrders as string[])}</ul></div><div className={card}><h3 className="font-semibold">{t.analytics}</h3><p className="mt-3 text-sm text-slate-300">{t.analyticsText}</p></div><div className={card}><h3 className="font-semibold">{t.fulfilment}</h3><p className="mt-3 text-sm text-slate-300">{t.fulfilmentText}</p></div><div className={card}><h3 className="font-semibold">{t.showroomPreview}</h3><p className="mt-3 text-sm text-slate-300">{t.showroomPreviewText}</p></div></div></section>;
}
