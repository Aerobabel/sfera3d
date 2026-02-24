export type Supplier = {
    id: string;
    name: string;
    logoUrl?: string; // e.g. "/logos/nike.png"
    description: string;
    contactEmail: string;
};

export type Pavilion = {
    id: string; // e.g. "pav_sports"
    name: string; // "Sports Hall"
    description?: string;
};

export type Product = {
    id: string; // Corresponds to the Unreal Tag (e.g. "prod_101")

    // Relations
    supplierId: string;
    pavilionId: string;

    // Metadata
    name: string;
    price: number;
    currency: string;
    shortDescription: string;
    fullDescription: string;

    // Formatting
    buyUrl?: string; // External link or internal shop link
    status: 'active' | 'out_of_stock' | 'hidden';
};
