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
    const params = new URLSearchParams({
        autostart: '1',
        ui_theme: 'dark',
        ui_infos: '0',
        ui_inspector: '0',
        ui_stop: '0',
        ui_animations: '0',
        ui_help: '0',
        transparent: '1',
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
