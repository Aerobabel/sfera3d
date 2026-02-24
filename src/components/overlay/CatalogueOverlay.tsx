import { Product, Supplier } from "@/lib/types";
import { X, ShoppingCart } from "lucide-react";

interface CatalogueOverlayProps {
    supplier: Supplier;
    products: Product[];
    onClose: () => void;
    onSelectProduct: (product: Product) => void;
}

export default function CatalogueOverlay({ supplier, products, onClose, onSelectProduct }: CatalogueOverlayProps) {
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
            <div className="relative bg-slate-950/40 backdrop-blur-2xl border border-white/10 w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">

                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/10 blur-[100px] pointer-events-none" />

                {/* Header */}
                <div className="relative p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <div className="flex items-center gap-4">
                        {supplier.logoUrl ? (
                            <img src={supplier.logoUrl} alt={supplier.name} className="w-12 h-12 rounded-full bg-white p-1 object-contain grayscale hover:grayscale-0 transition duration-300" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg text-white border border-white/10">
                                {supplier.name.substring(0, 2)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                {supplier.name} <span className="text-cyan-400 font-light">Catalogue</span>
                            </h2>
                            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mt-1">Authorized Collection</p>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white border border-transparent hover:border-white/10">
                        <X size={24} />
                    </button>
                </div>

                {/* Grid */}
                <div className="relative flex-1 overflow-y-auto p-6 custom-scrollbar z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map(product => (
                            <div
                                key={product.id}
                                onClick={() => onSelectProduct(product)}
                                className="group/item relative bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 rounded-xl p-4 transition duration-300 cursor-pointer flex flex-col overflow-hidden hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                            >
                                {/* Hover Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-fuchsia-500/0 group-hover/item:from-cyan-500/5 group-hover/item:to-fuchsia-500/5 transition duration-500" />

                                {/* Placeholder Image */}
                                <div className="relative aspect-video bg-black/40 rounded-lg mb-4 flex items-center justify-center border border-white/5 group-hover/item:border-white/10 transition">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-600 group-hover/item:text-cyan-400 transition">Visual</span>
                                </div>

                                <div className="relative flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-200 group-hover/item:text-white transition text-sm uppercase tracking-wide">{product.name}</h3>
                                    <span className="text-cyan-400 font-bold text-sm drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">
                                        {product.currency === 'USD' ? '$' : product.currency}
                                        {product.price.toFixed(0)}
                                    </span>
                                </div>
                                <p className="relative text-xs text-gray-500 line-clamp-2 mb-4 flex-1 group-hover/item:text-gray-400 transition">
                                    {product.shortDescription}
                                </p>

                                <button className="relative w-full py-2 bg-white/5 hover:bg-cyan-600 rounded-lg text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider transition flex items-center justify-center gap-2 group-hover/item:bg-white/10">
                                    <ShoppingCart size={14} />
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
