import { NextResponse } from 'next/server';
import { getProductById, getSupplierById, PRODUCTS } from '@/lib/db';
import { Product } from '@/lib/types';

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

        return (
            normalizedText.includes(idLoose) ||
            normalizedText.includes(nameLoose) ||
            compactText.includes(idCompact) ||
            compactText.includes(nameCompact)
        );
    });
};

const formatProductPrice = (product: Product) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: product.currency,
        maximumFractionDigits: 2,
    }).format(product.price);

const getAssistantReply = (text: string, productHint?: string): string => {
    const normalizedText = normalize(text);
    const resolvedProduct =
        (productHint ? getProductById(productHint) : undefined) ?? findProductFromText(normalizedText);

    if (resolvedProduct) {
        const supplier = getSupplierById(resolvedProduct.supplierId);
        const supplierName = supplier?.name ?? 'the supplier';
        const stockStatus = resolvedProduct.status === 'out_of_stock' ? 'currently out of stock' : 'in stock';
        const isPriceQuestion = /(price|cost|how much|quote)/.test(normalizedText);
        const isSpecQuestion = /(spec|detail|feature|compatib|info|description)/.test(normalizedText);
        const isStockQuestion = /(stock|available|availability|in stock)/.test(normalizedText);
        const isSupplierQuestion = /(supplier|seller|dealer|manufacturer|brand)/.test(normalizedText);

        if (isPriceQuestion) {
            return `${resolvedProduct.name} is ${formatProductPrice(resolvedProduct)} and is ${stockStatus}.`;
        }

        if (isSpecQuestion) {
            return `${resolvedProduct.name}: ${resolvedProduct.fullDescription}`;
        }

        if (isStockQuestion) {
            return `${resolvedProduct.name} is ${stockStatus}.`;
        }

        if (isSupplierQuestion) {
            return `${resolvedProduct.name} is offered by ${supplierName}.`;
        }

        return `Selected ${resolvedProduct.name}. Price: ${formatProductPrice(resolvedProduct)}. Ask me for specs, stock, or supplier details.`;
    }

    const isListingRequest = /(show|list|available|catalog|products|items)/.test(normalizedText);
    if (isListingRequest) {
        const shortlist = PRODUCTS.filter((product) => product.status === 'active')
            .slice(0, 5)
            .map((product) => `${product.name} (${formatProductPrice(product)})`)
            .join(', ');

        return `Current featured products: ${shortlist}. Mention a product name for full details.`;
    }

    const isColorRequest = /(color|red|blue|green|black|white)/.test(normalizedText);
    if (isColorRequest) {
        return 'Color changes are scene-dependent. Select a product first, then ask for available color options.';
    }

    return 'Ask me about any product price, specs, stock, or supplier. You can mention names like Monitor 001 or Tablet 002.';
};

export async function POST(request: Request) {
    const body: unknown = await request.json();
    const payload = (body && typeof body === 'object' ? body : {}) as {
        user?: unknown;
        text?: unknown;
        productId?: unknown;
    };
    const user = typeof payload.user === 'string' && payload.user.trim().length > 0 ? payload.user.trim() : 'Guest';
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    const productId = typeof payload.productId === 'string' ? payload.productId : undefined;

    if (!text) {
        return NextResponse.json({ success: false, error: 'Message text is required.' }, { status: 400 });
    }

    const newMessage: StoredMessage = {
        id: Date.now().toString(),
        user,
        text: text,
        timestamp: Date.now(),
        role: 'user',
    };

    messages.push(newMessage);
    const assistantMessage: StoredMessage = {
        id: `${Date.now()}-ai`,
        user: 'AI Concierge',
        text: getAssistantReply(text, productId),
        timestamp: Date.now(),
        role: 'assistant',
    };
    messages.push(assistantMessage);

    return NextResponse.json({ success: true, userMessage: newMessage, assistantMessage });
}

export async function GET() {
    return NextResponse.json({ messages });
}
