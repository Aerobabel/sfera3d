'use client';

// Embeds a Sketchfab model via iframe. We use the URL params to strip
// the heaviest UI elements (info popups, inspector, animations panel,
// help) and force the dark theme so the embed blends with the lightbox.
//
// Free Sketchfab accounts keep the watermark; ui_watermark/ui_watermark_link
// only respect the override on Pro plans, so we don't bother trying.

interface SketchfabEmbedProps {
    modelId: string;
    title: string;
}

export default function SketchfabEmbed({ modelId, title }: SketchfabEmbedProps) {
    // Sketchfab embed params — strip every UI element the free tier allows.
    // The bottom-left Sketchfab logo / link requires Pro to hide
    // (ui_watermark, ui_watermark_link), so it stays for now.
    const params = new URLSearchParams({
        autostart: '1',
        ui_theme: 'dark',
        transparent: '1',
        // Top-left avatar / model title / share button.
        ui_infos: '0',
        // Bottom-right cluster (settings, fullscreen, VR, AR, help, etc.).
        ui_general_controls: '0',
        ui_settings: '0',
        ui_fullscreen: '0',
        ui_vr: '0',
        ui_ar: '0',
        ui_help: '0',
        ui_hint: '0',
        // Side panels.
        ui_inspector: '0',
        ui_animations: '0',
        ui_annotations: '0',
        ui_sound: '0',
        // Misc.
        ui_stop: '0',
        ui_loading: '0',
    });
    const src = `https://sketchfab.com/models/${modelId}/embed?${params.toString()}`;

    return (
        <iframe
            title={title}
            src={src}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
        />
    );
}
