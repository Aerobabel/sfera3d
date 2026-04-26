// Per-product specifications for the Zhejiang Double Lin brass-fittings
// catalogue. Source: docx files inside F:\3dsfera Pavillon Data\Double Lin\
// Zhejiang Double Lin\<...>\<LL-CODE>\<LL-CODE>.docx (April 2026 export).
//
// LL2006 had no docx in the source bundle, so its description is a generic
// three-way diverter spec that matches the assigned Sketchfab model.
//
// Prices and MOQ are intentionally omitted — the catalogue uses
// "price on request" to keep B2B inquiries flowing through the contact tab.

export type DoublelinSpecRow = {
    label: string;
    value: string;
};

export type DoublelinSpec = {
    title: string;
    features: string[];
    specs: DoublelinSpecRow[];
    certifications?: string;
    applications?: string[];
};

export const DOUBLELIN_SPECS: Record<string, DoublelinSpec> = {
    '3060e': {
        title: 'Angle Thermostatic Valve',
        features: [
            'Imported thermostat with automatic temperature induction',
            'Double-seal hard-sealing spool, abrasion-resistant',
            'High-density forged brass body — no blisters / air holes',
            'Hexagonal connector + anti-skid teeth for secure install',
            'Ergonomic handle wheel',
        ],
        specs: [
            { label: 'Working pressure', value: '10 bar (145 psi)' },
            { label: 'Working temperature', value: '0 °C to +120 °C' },
            { label: 'Thread standard', value: 'ISO 228 (DIN 259 / BS 2779)' },
            { label: 'Sizes', value: '1/2", 3/4", 1"' },
        ],
        applications: ['Heating systems', 'Hot & cold water', 'Compressed air', 'Non-corrosive fluids'],
    },
    'll1001': {
        title: 'Full Bore Brass Ball Valve',
        features: [
            'Stainless-steel anti-loosening locknut',
            'Double O-ring (NBR + FPM) — leak-free sealing',
            'Polished chrome-plated brass ball, wear-resistant',
            'High-density forged brass bonnet',
        ],
        specs: [
            { label: 'Nominal pressure', value: '2.5 MPa' },
            { label: 'Working medium', value: 'Water · non-corrosive liquids · saturated steam' },
            { label: 'Working temperature', value: '−10 °C to +120 °C' },
            { label: 'Thread standard', value: 'ISO 228' },
            { label: 'Sizes', value: '1/4" – 4"' },
        ],
        certifications: 'CE · ACS · ENI',
    },
    'll1042': {
        title: 'Full Port Brass Ball Valve',
        features: [
            'Stainless-steel locking screw, internal anti-loose design',
            'Double O-ring (NBR + FPM), imported sealing material',
            'Polished, chrome-plated brass ball — smooth inner cavity',
            'High-density forged brass bonnet, no porosity',
        ],
        specs: [
            { label: 'Nominal pressure', value: '2.5 MPa' },
            { label: 'Working medium', value: 'Water · non-corrosive liquids · saturated steam' },
            { label: 'Working temperature', value: '−10 °C to +120 °C' },
            { label: 'Thread standard', value: 'ISO 228' },
            { label: 'Sizes', value: '1/4" – 1¼"' },
        ],
    },
    'll1063': {
        title: 'Full Port Brass Ball Valve · Steel ball',
        features: [
            'Stainless-steel locknut with anti-loose design',
            'Double O-ring (NBR + FPM) for high-reliability sealing',
            'Polished chrome-plated steel ball',
            'High-density forged brass bonnet, CNC-machined',
        ],
        specs: [
            { label: 'Nominal pressure', value: '2.5 MPa' },
            { label: 'Working medium', value: 'Water · non-corrosive liquids · saturated steam' },
            { label: 'Working temperature', value: '−10 °C to +120 °C' },
            { label: 'Thread standard', value: 'ISO 228' },
            { label: 'Sizes', value: '1/4" – 4"' },
        ],
        certifications: 'WRAS · CE · ACS · EH',
    },
    'll2006': {
        title: 'Brass Three-Way Diverter Valve',
        features: [
            'Forged brass body — zero-leakage performance',
            'Three-port design for flow diversion or mixing',
            'T-handle gives clear visual position indication',
            'CNC-machined for precise dimensional accuracy',
        ],
        specs: [
            { label: 'Working pressure', value: '2.5 MPa' },
            { label: 'Working temperature', value: '−10 °C to +120 °C' },
            { label: 'Thread standard', value: 'ISO 228' },
            { label: 'Sizes', value: '1/2", 3/4", 1"' },
        ],
        applications: ['Heating zone control', 'Mixing / diverting circuits', 'Hot & cold water'],
    },
    'll3052a': {
        title: 'Angle Radiator Valve',
        features: [
            'High-density forged brass body — no blisters / air holes',
            'Double-seal spool + conical sealing washer',
            'Ergonomic handle wheel',
            'Stainless-steel anti-loose lock screw',
            'Hexagonal connector + anti-skid teeth',
        ],
        specs: [
            { label: 'Working pressure', value: '10 bar (145 psi)' },
            { label: 'Working temperature', value: '0 °C to +120 °C' },
            { label: 'Thread standard', value: 'ISO 228 (DIN 259 / BS 2779)' },
            { label: 'Sizes', value: '1/2", 3/4"' },
        ],
        applications: ['Heating systems', 'Hot & cold water', 'Compressed air', 'Non-corrosive fluids'],
    },
    'll2055': {
        title: 'Full Flow Brass Ball Valve · Dacromet handle',
        features: [
            'Stainless-steel anti-loosening locknut',
            'Hot-rolled brass valve stem — high tensile strength',
            'High-density forged brass body & bonnet',
            'Dacromet-coated handle (1.3 mm) for corrosion resistance',
            'Double EPDM O-ring · pure PTFE ball seat',
            'SS 304 water outlet',
        ],
        specs: [
            { label: 'Working pressure', value: '16 bar (232 psi)' },
            { label: 'Working temperature', value: '−10 °C to +100 °C' },
            { label: 'Thread standard', value: 'ISO 228 (DIN 259 / BS 2779)' },
            { label: 'Cycle test', value: '10,000 open/close cycles' },
            { label: 'Sizes', value: '1/2"×3/4", 3/4"×3/4", 3/4"×1", 1"×1¼"' },
        ],
    },
    'll1071': {
        title: 'Brass Ball Valve · F/F · Flat Lever',
        features: [
            'Stainless-steel anti-loose locknut',
            'Double O-ring (NBR + FKM) sealing system',
            'Hot-rolled brass stem · Dacromet-coated lever (1.3 mm)',
            'High-density forged brass body & bonnet — zero leakage',
            'Pure PTFE ball seat — high elasticity, age-resistant',
        ],
        specs: [
            { label: 'Working pressure', value: '16 bar (232 psi)' },
            { label: 'Working temperature', value: '−10 °C to +120 °C' },
            { label: 'Thread standard', value: 'ISO 228 (DIN 259 / BS 2779)' },
            { label: 'Cycle test', value: '10,000 open/close cycles' },
            { label: 'Sizes', value: '1/2" – 4"' },
        ],
        certifications: 'CE · ACS',
        applications: ['Water supply', 'Heating & A/C systems', 'Compressed air installations'],
    },
};

export const getDoublelinSpec = (productId: string): DoublelinSpec | null =>
    DOUBLELIN_SPECS[productId] ?? null;
