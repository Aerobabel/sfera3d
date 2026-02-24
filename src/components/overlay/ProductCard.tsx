'use client';

import { Product, Supplier } from "@/lib/types";
import { X, ShoppingCart, MessageSquare, ExternalLink } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getLocalizedProduct } from "@/lib/i18n";

interface ProductCardProps {
    product: Product;
    supplier?: Supplier;
    onClose: () => void;
    onAddToCart: () => void;
    onChatWithSupplier: () => void;
    onViewCatalogue: () => void;
}

export default function ProductCard({ product, supplier, onClose, onAddToCart, onChatWithSupplier, onViewCatalogue }: ProductCardProps) {
    const { language } = useLanguage();
    const localizedProduct = getLocalizedProduct(product, language);
    const text = {
        en: {
            verified: '3DSFERA VERIFIED',
            inStock: 'In Stock',
            specifications: 'Specifications',
            addToCart: 'Add to Cart',
            chatSupplier: 'Chat Supplier',
            details: 'Details',
            authorizedDealer: 'Authorized Dealer',
        },
        ru: {
            verified: '3DSFERA VERIFIED',
            inStock: 'В наличии',
            specifications: 'Характеристики',
            addToCart: 'В корзину',
            chatSupplier: 'Чат с поставщиком',
            details: 'Подробнее',
            authorizedDealer: 'Официальный дилер',
        },
        zh: {
            verified: '3DSFERA VERIFIED',
            inStock: '有现货',
            specifications: '规格参数',
            addToCart: '加入购物车',
            chatSupplier: '联系供应商',
            details: '详情',
            authorizedDealer: '授权经销商',
        },
    }[language];

    return (
        <div className="absolute top-24 left-4 md:left-8 z-50 w-80 overflow-hidden rounded-2xl border border-[#66d9cb]/22 bg-[#0d1118]/88 p-6 text-[#f5f1e9] shadow-[0_24px_70px_rgba(0,0,0,0.52)] backdrop-blur-2xl pointer-events-auto md:w-96">
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(102,217,203,0.22),rgba(102,217,203,0)_70%)]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(246,186,79,0.16),rgba(246,186,79,0)_72%)]" />

            {/* Header */}
            <div className="relative mb-6 border-b border-white/10 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="mb-2 flex items-center gap-2.5">
                            <div className="h-4 w-4 rounded-sm border border-[#66d9cb]/55 bg-[#66d9cb]/18 shadow-[0_0_10px_rgba(102,217,203,0.32)]" />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66d9cb]">
                                {text.verified}
                            </span>
                        </div>
                        <h2 className="text-xl font-extrabold uppercase tracking-[0.14em] text-[#f7f4ed]">
                            {localizedProduct.name}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full border border-white/10 bg-white/5 p-2.5 transition hover:border-white/25 hover:bg-white/10"
                    >
                        <X size={16} className="text-[#b9b3a8] transition hover:text-white" />
                    </button>
                </div>
            </div>

            {/* Price */}
            <div className="relative mb-7 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                    <span className="mr-1 self-start text-lg font-semibold text-[#a79f92]">
                        {localizedProduct.currency === 'USD' ? '$' : localizedProduct.currency}
                    </span>
                    <span className="text-5xl font-black tracking-tight text-[#f8f5ee]">
                        {localizedProduct.price.toFixed(2)}
                    </span>
                </div>
                {localizedProduct.status === 'active' ? (
                    <div className="rounded-md border border-[#66d9cb]/35 bg-[#66d9cb]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#66d9cb]">
                        {text.inStock}
                    </div>
                ) : (
                    <div className="rounded-md border border-red-400/35 bg-red-500/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-300">
                        {localizedProduct.status.replace('_', ' ')}
                    </div>
                )}
            </div>

            {/* Description */}
            <div className="relative mb-8">
                <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f887d]">{text.specifications}</h3>
                <p className="text-sm leading-relaxed text-[#d1cac0]">
                    {localizedProduct.fullDescription}
                </p>
            </div>

            {/* Actions */}
            <div className="relative mb-8 grid grid-cols-2 gap-3">
                <button
                    onClick={onAddToCart}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#66d9cb] py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#08100f] transition hover:bg-[#8de6dc]"
                >
                    <ShoppingCart size={16} />
                    {text.addToCart}
                </button>

                <button
                    onClick={onChatWithSupplier}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#d8d1c6] transition hover:border-[#66d9cb]/45 hover:text-white"
                >
                    <MessageSquare size={14} />
                    {text.chatSupplier}
                </button>

                <button
                    onClick={onViewCatalogue}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#d8d1c6] transition hover:border-[#66d9cb]/45 hover:text-white"
                >
                    <ExternalLink size={14} />
                    {text.details}
                </button>
            </div>

            {/* Supplier Info Footer */}
            {supplier && (
                <div className="relative mt-auto border-t border-white/10 pt-4">
                    <div className="flex items-center gap-3">
                        {supplier.logoUrl ? (
                            <img
                                src={supplier.logoUrl}
                                alt={supplier.name}
                                className="h-8 w-8 rounded-full border border-white/10 bg-white object-contain p-1 grayscale transition hover:grayscale-0"
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[10px] font-bold uppercase text-[#f5f1e9]">
                                {supplier.name.substring(0, 2)}
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8f887d]">{text.authorizedDealer}</div>
                            <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#f5f1e9]">{supplier.name}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
