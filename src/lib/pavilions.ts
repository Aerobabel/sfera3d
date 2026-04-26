// Pavilion metadata consumed by the PavilionExposition overlay.
//
// The `entered_pavilion:<id>` message coming from the Unreal blueprint maps to
// one of the entries here. Hero images are produced by
// `scripts/copy-pavilion-assets.mjs` and enumerated in the per-pavilion
// manifest.json files under public/pavilions/.

import doubleLinManifest from '../../public/pavilions/doublelin/manifest.json';
import youboManifest from '../../public/pavilions/youbo/manifest.json';

export type PavilionProduct = {
    id: string;
    code: string;
    hero: string;
    panorama?: string;
    // Sketchfab model UUID (extracted from the share/embed URL). Renders as
    // an iframe inside the lightbox with their progressive-loading viewer.
    sketchfabModelId?: string;
};

export type PavilionManifest = {
    products: PavilionProduct[];
};

export type Pavilion = {
    id: string; // matches the suffix in `entered_pavilion:<id>`
    name: string;
    tagline: string;
    description: string;
    contactEmail: string;
    contactPhone?: string;
    website?: string;
    heroColor: string; // tailwind color token for the accent glow
    products: PavilionProduct[];
};

// Known Unreal trigger IDs. Keep these lowercase; the response string is
// normalized before comparison.
export const PAVILION_IDS = ['youbo', 'doublelin'] as const;
export type PavilionId = (typeof PAVILION_IDS)[number];

export const isPavilionId = (value: string): value is PavilionId =>
    (PAVILION_IDS as readonly string[]).includes(value);

export const PAVILIONS: Record<PavilionId, Pavilion> = {
    doublelin: {
        id: 'doublelin',
        name: 'Zhejiang Double Lin',
        tagline: 'Precision brass valves and fittings',
        description:
            'Zhejiang Double Lin manufactures high-pressure angle valves, ball valves, and three-way fittings for residential and commercial plumbing systems. Browse the authorized product catalogue below.',
        contactEmail: 'sales@doublelin.cn',
        contactPhone: '+86 573-000-0000',
        website: 'https://doublelin.cn',
        heroColor: 'from-amber-500/20 via-transparent to-orange-500/20',
        products: (doubleLinManifest as PavilionManifest).products,
    },
    youbo: {
        id: 'youbo',
        name: 'Zhejiang Youbo',
        tagline: 'REID Series bathroom vanities & sinks',
        description:
            'Zhejiang Youbo designs premium bathroom vanity units, storage cabinets, and stone-top sinks under the REID series. Request a quotation or book a video walkthrough with the sales team.',
        contactEmail: 'sales@youbo-bath.cn',
        contactPhone: '+86 573-111-1111',
        website: 'https://youbo-bath.cn',
        heroColor: 'from-cyan-500/20 via-transparent to-fuchsia-500/20',
        products: (youboManifest as PavilionManifest).products,
    },
};

export const getPavilionById = (id: string): Pavilion | null => {
    const normalized = id.trim().toLowerCase();
    return isPavilionId(normalized) ? PAVILIONS[normalized] : null;
};

// Parse a `entered_pavilion:<id>` message. Returns the matched pavilion id or
// null if the message doesn't match the expected shape.
export const parseEnterPavilionMessage = (raw: string): PavilionId | null => {
    const match = raw.trim().match(/^entered_pavilion:([\w-]+)$/i);
    if (!match) return null;
    const candidate = match[1].toLowerCase();
    return isPavilionId(candidate) ? candidate : null;
};
