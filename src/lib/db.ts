import { Product, Supplier, Pavilion } from './types';

// 1. Pavilions
export const PAVILIONS: Pavilion[] = [
    { id: 'pav_sports', name: 'Sports & Leisure' },
    { id: 'pav_tech', name: 'Techway' },
    { id: 'pav_nonagon', name: 'Nonagon' },
];

// 2. Suppliers
export const SUPPLIERS: Supplier[] = [
    {
        id: 'sup_nike',
        name: 'Nike',
        description: 'Just Do It.',
        contactEmail: 'sales@nike.com',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg'
    },
    {
        id: 'sup_sony',
        name: 'Sony',
        description: 'Be Moved.',
        contactEmail: 'contact@sony.com',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg'
    },
    {
        id: 'sup_techway',
        name: 'Techway Systems',
        description: 'Future is Here.',
        contactEmail: 'sales@techway.com',
        logoUrl: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png' // Laptop icon
    },
    {
        id: 'sup_nonagon',
        name: 'Nonagon Tech',
        description: 'Supplier support for products in the Nonagon pavilion.',
        contactEmail: 'sales@nonagontech.com',
    },
];

// 3. Products (The "Tag" is the ID)
export const PRODUCTS: Product[] = [
    {
        id: 'prod_101', // Unreal Tag: prod_101 (Was Red Shoe)
        supplierId: 'sup_techway',
        pavilionId: 'pav_tech',
        name: 'Techway Gaming G15',
        price: 1499.00,
        currency: 'USD',
        shortDescription: 'Ultimate Gaming Performance.',
        fullDescription: 'Dominate the battlefield with the Techway G15. Features RTX 4080 graphics, 240Hz display, and mechanical RGB keyboard.',
        status: 'active',
    },
    {
        id: 'prod_102', // Unreal Tag: prod_102 (Was Blue Shoe)
        supplierId: 'sup_techway',
        pavilionId: 'pav_tech',
        name: 'Techway Ultrabook Air',
        price: 999.00,
        currency: 'USD',
        shortDescription: 'Thin. Light. Powerful.',
        fullDescription: 'The Ultrabook Air redefines mobility with all-day battery life, 4K OLED display, and aerospace-grade aluminum chassis.',
        status: 'active',
    },
    {
        id: 'prod_201', // Unreal Tag: prod_201 (PS5)
        supplierId: 'sup_sony',
        pavilionId: 'pav_tech',
        name: 'PlayStation 5 Pro',
        price: 699.99,
        currency: 'USD',
        shortDescription: 'Play Has No Limits.',
        fullDescription: 'Experience lightning-fast loading with an ultra-high speed SSD, deeper immersion with haptic feedback, adaptive triggers and 3D Audio.',
        status: 'active',
    },
    {
        id: 'monitor_001',
        supplierId: 'sup_nonagon',
        pavilionId: 'pav_nonagon',
        name: 'Monitor 001',
        price: 249.00,
        currency: 'USD',
        shortDescription: 'A monitor.',
        fullDescription: 'A monitor in the Nonagon pavilion. Chat with the supplier for detailed specs and compatibility.',
        status: 'active',
    },
    {
        id: 'monitor_002',
        supplierId: 'sup_nonagon',
        pavilionId: 'pav_nonagon',
        name: 'Monitor 002',
        price: 329.00,
        currency: 'USD',
        shortDescription: 'A monitor.',
        fullDescription: 'A monitor in the Nonagon pavilion. Chat with the supplier for detailed specs and availability.',
        status: 'active',
    },
    {
        id: 'phone_001',
        supplierId: 'sup_nonagon',
        pavilionId: 'pav_nonagon',
        name: 'Phone 001',
        price: 699.00,
        currency: 'USD',
        shortDescription: 'A phone.',
        fullDescription: 'A phone in the Nonagon pavilion. Chat with the supplier for full specifications.',
        status: 'active',
    },
    {
        id: 'phone_002',
        supplierId: 'sup_nonagon',
        pavilionId: 'pav_nonagon',
        name: 'Phone 002',
        price: 899.00,
        currency: 'USD',
        shortDescription: 'A phone.',
        fullDescription: 'A phone in the Nonagon pavilion. Chat with the supplier for full specifications.',
        status: 'active',
    },
    {
        id: 'tablet_001',
        supplierId: 'sup_nonagon',
        pavilionId: 'pav_nonagon',
        name: 'Tablet 001',
        price: 449.00,
        currency: 'USD',
        shortDescription: 'A tablet.',
        fullDescription: 'A tablet in the Nonagon pavilion. Chat with the supplier for full specifications.',
        status: 'active',
    },
    {
        id: 'tablet_002',
        supplierId: 'sup_nonagon',
        pavilionId: 'pav_nonagon',
        name: 'Tablet 002',
        price: 599.00,
        currency: 'USD',
        shortDescription: 'A tablet.',
        fullDescription: 'A tablet in the Nonagon pavilion. Chat with the supplier for full specifications.',
        status: 'active',
    },
];

// Helper to simulate DB Lookup
export const getProductById = (id: string): Product | undefined => {
    if (!id) return undefined;

    // Normalize UE tags from different input paths (desktop/mobile):
    // examples: "tablet_001", "tablet 001", "TABLET-001", "tablet001".
    const normalizeLoose = (value: string) => value.trim().toLowerCase();
    const normalizeCompact = (value: string) => normalizeLoose(value).replace(/[^a-z0-9]/g, '');

    const targetLoose = normalizeLoose(id);
    const targetCompact = normalizeCompact(id);

    const exactMatch = PRODUCTS.find((product) => {
        const productLoose = normalizeLoose(product.id);
        const productCompact = normalizeCompact(product.id);
        return productLoose === targetLoose || productCompact === targetCompact;
    });
    if (exactMatch) return exactMatch;

    // Fallback for decorated actor/component names like:
    // "bp_monitor_001", "monitor_001_staticmesh", etc.
    const fuzzyMatches = PRODUCTS.filter((product) => {
        const productCompact = normalizeCompact(product.id);
        return (
            targetCompact.includes(productCompact) ||
            productCompact.includes(targetCompact)
        );
    });

    return fuzzyMatches.length === 1 ? fuzzyMatches[0] : undefined;
};

export const getProductsBySupplier = (supplierId: string): Product[] => {
    return PRODUCTS.filter(p => p.supplierId === supplierId);
};

export const getSupplierById = (id: string): Supplier | undefined => {
    return SUPPLIERS.find(s => s.id === id);
};
