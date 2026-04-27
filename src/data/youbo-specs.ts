// Per-product technical specifications for the ZHEJIANG YOUBO REID series.
// Source: F:\3dsfera Pavillon Data\Santexnika\ZHEJIANG YOUBO REID Series
//   - Quotation sheet QN202604003 (06-Apr-26)
//   - REID_specsheet 产品详情.pdf (2023-02 revision)
//
// Prices are intentionally omitted (the catalogue uses "price on request"
// to keep B2B inquiries flowing through the contact form).
//
// Dimensions are written as "W × D × H mm". Variant codes (M002, V040…)
// match the manufacturer's lacquer / wood-veneer reference palette.

export type ProductComponentKind = 'cabinet' | 'basin' | 'mirror' | 'side-cabinet' | 'legs';

export type ProductComponent = {
    kind: ProductComponentKind;
    code: string;
    dimensions: string;
    finish: string;
    weight?: string;
};

export type ProductSpec = {
    series: string;
    variant: string;
    components: ProductComponent[];
};

export const YOUBO_SPECS: Record<string, ProductSpec> = {
    'reid-500-m047': {
        series: 'REID 500',
        variant: 'M047 — Stone-resin pedestal',
        components: [
            { kind: 'basin', code: 'REI50M047', dimensions: '500 × 400 × 850 mm', finish: 'Pedestal basin · matte stone-resin · M047', weight: '45 kg' },
            { kind: 'mirror', code: 'REI90RM', dimensions: '900 × 35 × 900 mm', finish: 'Frameless · copper-free · surrounding LED', weight: '11 kg' },
        ],
    },
    'reid-1000-m002': {
        series: 'REID 1000',
        variant: 'M002 — Lacquer matte',
        components: [
            { kind: 'cabinet', code: 'REI100M002', dimensions: '994 × 547 × 450 mm', finish: 'Lacquer matte · M002 · E0 plywood', weight: '35 kg' },
            { kind: 'basin', code: 'REI100B-M002', dimensions: '1000 × 550 × 12 mm', finish: 'Solid-surface · matte M002 colour basin', weight: '16 kg' },
            { kind: 'mirror', code: 'REI90RM', dimensions: '900 × 35 × 900 mm', finish: 'Frameless · copper-free · surrounding LED', weight: '11 kg' },
        ],
    },
    'reid-1000-m048': {
        series: 'REID 1000',
        variant: 'M048 — Lacquer matte',
        components: [
            { kind: 'cabinet', code: 'REI100M048', dimensions: '994 × 547 × 450 mm', finish: 'Lacquer matte · M048 · E0 plywood', weight: '35 kg' },
            { kind: 'basin', code: 'REI100B-M048', dimensions: '1000 × 550 × 12 mm', finish: 'Solid-surface · matte M048 colour basin', weight: '16 kg' },
            { kind: 'mirror', code: 'REI90RM', dimensions: '900 × 35 × 900 mm', finish: 'Frameless · copper-free · surrounding LED', weight: '11 kg' },
        ],
    },
    'reid-1000-v008': {
        series: 'REID 1000',
        variant: 'V008 — Wood veneer',
        components: [
            { kind: 'cabinet', code: 'REI100V008', dimensions: '994 × 547 × 450 mm', finish: 'Wood veneer · V008 · E0 plywood core', weight: '35 kg' },
            { kind: 'basin', code: 'REI100B', dimensions: '1000 × 550 × 12 mm', finish: 'Solid-surface · matte pure white', weight: '16 kg' },
            { kind: 'mirror', code: 'REI90RM', dimensions: '900 × 35 × 900 mm', finish: 'Frameless · copper-free · surrounding LED', weight: '11 kg' },
        ],
    },
    'reid-1200-v': {
        series: 'REID 1200',
        variant: 'V008 — Wood veneer',
        components: [
            { kind: 'cabinet', code: 'REI120V008', dimensions: '1194 × 547 × 450 mm', finish: 'Wood veneer · V008 · E0 plywood core', weight: '36 kg' },
            { kind: 'basin', code: 'REI120MB', dimensions: '1200 × 550 × 12 mm', finish: 'Solid-surface · matte pure white', weight: '19 kg' },
            { kind: 'mirror', code: 'REI90RM', dimensions: '900 × 35 × 900 mm', finish: 'Frameless · copper-free · surrounding LED', weight: '11 kg' },
            { kind: 'side-cabinet', code: 'REI120V008SC', dimensions: '500 × 300 × 1000 mm', finish: 'Wood veneer · V008 · Unihopper soft-close hinges', weight: '30 kg' },
        ],
    },
    'reid-1500-v': {
        series: 'REID 1500',
        variant: 'V040 — Wood veneer',
        components: [
            { kind: 'cabinet', code: 'REI150V040', dimensions: '1494 × 547 × 450 mm', finish: 'Wood veneer · V040 · E0 plywood core', weight: '45 kg' },
            { kind: 'basin', code: 'REI150B', dimensions: '1500 × 550 × 12 mm', finish: 'Solid-surface · single basin · matte pure white', weight: '22 kg' },
            { kind: 'mirror', code: 'REI150M', dimensions: '1500 × 35 × 600 mm', finish: 'Frameless · copper-free · surrounding LED', weight: '13 kg' },
        ],
    },
    'reid-1500-1-v042': {
        series: 'REID 1500-1',
        variant: 'V042 — Wood veneer',
        components: [
            { kind: 'cabinet', code: 'REI150V042', dimensions: '1494 × 547 × 450 mm', finish: 'Wood veneer · V042 · E0 plywood core', weight: '45 kg' },
            { kind: 'basin', code: 'REI150B', dimensions: '1500 × 550 × 12 mm', finish: 'Solid-surface · single basin · matte pure white', weight: '22 kg' },
            { kind: 'mirror', code: 'REI150M', dimensions: '1500 × 35 × 600 mm', finish: 'Frameless · copper-free · surrounding LED', weight: '13 kg' },
        ],
    },
    'reid-1800-1-v040': {
        series: 'REID 1800',
        variant: 'V040 — Wood veneer',
        components: [
            { kind: 'cabinet', code: 'REI180V040', dimensions: '1794 × 547 × 450 mm', finish: 'Wood veneer · V040 · E0 plywood core', weight: '52 kg' },
            { kind: 'basin', code: 'REI180B', dimensions: '1800 × 550 × 12 mm', finish: 'Solid-surface · double basins · matte pure white', weight: '28 kg' },
            { kind: 'mirror', code: 'REI180M', dimensions: '1800 × 35 × 600 mm', finish: 'Frameless · copper-free · surrounding LED', weight: '17 kg' },
        ],
    },
};

export const getYouboSpec = (productId: string): ProductSpec | null =>
    YOUBO_SPECS[productId] ?? null;
