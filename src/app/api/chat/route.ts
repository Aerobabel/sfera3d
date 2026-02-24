import { NextResponse } from 'next/server';
import { getProductById, getSupplierById, PRODUCTS } from '@/lib/db';
import { Product } from '@/lib/types';
import { AppLanguage, getLocalizedProduct, isAppLanguage } from '@/lib/i18n';

// Mock database for chat messages
type StoredMessage = {
    id: string;
    user: string;
    text: string;
    timestamp: number;
    role: 'user' | 'assistant';
};

const messages: StoredMessage[] = [];

const normalize = (value: string) => value.trim().toLowerCase();
const compact = (value: string) => normalize(value).replace(/[^a-z0-9]/g, '');

const findProductFromText = (text: string): Product | undefined => {
    const normalizedText = normalize(text);
    const compactText = compact(text);

    return PRODUCTS.find((product) => {
        const idLoose = normalize(product.id);
        const idCompact = compact(product.id);
        const nameLoose = normalize(product.name);
        const nameCompact = compact(product.name);
        const localizedRu = getLocalizedProduct(product, 'ru').name.toLowerCase();
        const localizedZh = getLocalizedProduct(product, 'zh').name.toLowerCase();

        return (
            normalizedText.includes(idLoose) ||
            normalizedText.includes(nameLoose) ||
            normalizedText.includes(localizedRu) ||
            normalizedText.includes(localizedZh) ||
            compactText.includes(idCompact) ||
            compactText.includes(nameCompact)
        );
    });
};

const formatProductPrice = (product: Product, language: AppLanguage) => {
    const locale = language === 'ru' ? 'ru-RU' : language === 'zh' ? 'zh-CN' : 'en-US';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: product.currency,
        maximumFractionDigits: 2,
    }).format(product.price);
};

const getAssistantReply = (
    text: string,
    language: AppLanguage,
    productHint?: string
): string => {
    const normalizedText = normalize(text);
    const resolvedProduct =
        (productHint ? getProductById(productHint) : undefined) ?? findProductFromText(normalizedText);

    if (resolvedProduct) {
        const localizedProduct = getLocalizedProduct(resolvedProduct, language);
        const supplier = getSupplierById(resolvedProduct.supplierId);
        const supplierName =
            supplier?.name ??
            (language === 'ru' ? 'поставщик' : language === 'zh' ? '供应商' : 'the supplier');
        const stockStatus =
            resolvedProduct.status === 'out_of_stock'
                ? language === 'ru'
                    ? 'нет в наличии'
                    : language === 'zh'
                      ? '缺货'
                      : 'currently out of stock'
                : language === 'ru'
                  ? 'в наличии'
                  : language === 'zh'
                    ? '有现货'
                    : 'in stock';
        const isPriceQuestion = /(price|cost|how much|quote|цена|сколько|стоим|价格|报价|多少钱)/.test(normalizedText);
        const isSpecQuestion = /(spec|detail|feature|compatib|info|description|характер|детал|описан|совмест|规格|参数|详情|描述|兼容)/.test(normalizedText);
        const isStockQuestion = /(stock|available|availability|in stock|налич|доступ|库存|有货|现货|可用)/.test(normalizedText);
        const isSupplierQuestion = /(supplier|seller|dealer|manufacturer|brand|постав|продав|дилер|бренд|供应商|卖家|品牌|厂商)/.test(normalizedText);

        if (isPriceQuestion) {
            if (language === 'ru') {
                return `${localizedProduct.name}: ${formatProductPrice(localizedProduct, language)}, ${stockStatus}.`;
            }
            if (language === 'zh') {
                return `${localizedProduct.name} 价格为 ${formatProductPrice(localizedProduct, language)}，当前${stockStatus}。`;
            }
            return `${localizedProduct.name} is ${formatProductPrice(localizedProduct, language)} and is ${stockStatus}.`;
        }

        if (isSpecQuestion) {
            if (language === 'ru') {
                return `${localizedProduct.name}: ${localizedProduct.fullDescription}`;
            }
            if (language === 'zh') {
                return `${localizedProduct.name}：${localizedProduct.fullDescription}`;
            }
            return `${localizedProduct.name}: ${localizedProduct.fullDescription}`;
        }

        if (isStockQuestion) {
            if (language === 'ru') {
                return `${localizedProduct.name} — ${stockStatus}.`;
            }
            if (language === 'zh') {
                return `${localizedProduct.name} 当前${stockStatus}。`;
            }
            return `${localizedProduct.name} is ${stockStatus}.`;
        }

        if (isSupplierQuestion) {
            if (language === 'ru') {
                return `${localizedProduct.name} поставляется компанией ${supplierName}.`;
            }
            if (language === 'zh') {
                return `${localizedProduct.name} 由 ${supplierName} 提供。`;
            }
            return `${localizedProduct.name} is offered by ${supplierName}.`;
        }

        if (language === 'ru') {
            return `Выбран товар ${localizedProduct.name}. Цена: ${formatProductPrice(localizedProduct, language)}. Могу подсказать характеристики, наличие и поставщика.`;
        }
        if (language === 'zh') {
            return `已选中 ${localizedProduct.name}。价格：${formatProductPrice(localizedProduct, language)}。可继续询问规格、库存或供应商信息。`;
        }
        return `Selected ${localizedProduct.name}. Price: ${formatProductPrice(localizedProduct, language)}. Ask me for specs, stock, or supplier details.`;
    }

    const isListingRequest = /(show|list|available|catalog|products|items|покаж|спис|каталог|товар|продук|产品|商品|目录|列表)/.test(normalizedText);
    if (isListingRequest) {
        const shortlist = PRODUCTS.filter((product) => product.status === 'active')
            .slice(0, 5)
            .map((product) => {
                const localizedProduct = getLocalizedProduct(product, language);
                return `${localizedProduct.name} (${formatProductPrice(localizedProduct, language)})`;
            })
            .join(', ');

        if (language === 'ru') {
            return `Сейчас в подборке: ${shortlist}. Назовите товар, чтобы получить детали.`;
        }
        if (language === 'zh') {
            return `当前推荐产品：${shortlist}。可直接输入产品名称查看详细信息。`;
        }
        return `Current featured products: ${shortlist}. Mention a product name for full details.`;
    }

    const isColorRequest = /(color|red|blue|green|black|white|цвет|красн|син|зел|черн|бел|颜色|红|蓝|绿|黑|白)/.test(normalizedText);
    if (isColorRequest) {
        if (language === 'ru') {
            return 'Смена цвета зависит от сцены. Сначала выберите товар, затем спросите доступные цветовые варианты.';
        }
        if (language === 'zh') {
            return '颜色切换取决于当前场景。请先选择产品，再询问可选颜色。';
        }
        return 'Color changes are scene-dependent. Select a product first, then ask for available color options.';
    }

    if (language === 'ru') {
        return 'Спросите цену, характеристики, наличие или поставщика. Можно указать название, например «Монитор 001» или «Планшет 002».';
    }
    if (language === 'zh') {
        return '你可以问我价格、规格、库存或供应商信息。也可以直接输入产品名，例如“显示器 001”或“平板 002”。';
    }
    return 'Ask me about any product price, specs, stock, or supplier. You can mention names like Monitor 001 or Tablet 002.';
};

export async function POST(request: Request) {
    const body: unknown = await request.json();
    const payload = (body && typeof body === 'object' ? body : {}) as {
        user?: unknown;
        text?: unknown;
        productId?: unknown;
        language?: unknown;
    };
    const user = typeof payload.user === 'string' && payload.user.trim().length > 0 ? payload.user.trim() : 'Guest';
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    const productId = typeof payload.productId === 'string' ? payload.productId : undefined;
    const language = isAppLanguage(payload.language) ? payload.language : 'ru';

    if (!text) {
        return NextResponse.json(
            {
                success: false,
                error:
                    language === 'ru'
                        ? 'Текст сообщения обязателен.'
                        : language === 'zh'
                          ? '消息内容不能为空。'
                          : 'Message text is required.',
            },
            { status: 400 }
        );
    }

    const newMessage: StoredMessage = {
        id: Date.now().toString(),
        user,
        text: text,
        timestamp: Date.now(),
        role: 'user',
    };

    messages.push(newMessage);
    const assistantUser =
        language === 'ru'
            ? 'AI-консьерж'
            : language === 'zh'
              ? 'AI 助理'
              : 'AI Concierge';
    const assistantMessage: StoredMessage = {
        id: `${Date.now()}-ai`,
        user: assistantUser,
        text: getAssistantReply(text, language, productId),
        timestamp: Date.now(),
        role: 'assistant',
    };
    messages.push(assistantMessage);

    return NextResponse.json({ success: true, userMessage: newMessage, assistantMessage });
}

export async function GET() {
    return NextResponse.json({ messages });
}
