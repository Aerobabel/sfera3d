'use client';

// Lightweight WebGL 360° panorama viewer used inside the product lightbox.
// Renders an equirectangular image onto an inverted sphere; pointer drag
// looks around, idle frames slowly auto-rotate. Loaded via next/dynamic so
// the ~600 KB three.js bundle doesn't ship until a panorama is opened.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface PanoramaViewerProps {
    src: string;
    alt: string;
}

export default function PanoramaViewer({ src, alt }: PanoramaViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Reset load state when src changes — render-time setter pattern, avoids
    // the cascading useEffect → setState lint warning.
    const [prevSrc, setPrevSrc] = useState(src);
    if (prevSrc !== src) {
        setPrevSrc(src);
        setLoading(true);
        setError(null);
    }

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight || 1,
            0.1,
            1100
        );

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.domElement.style.display = 'block';
        container.appendChild(renderer.domElement);

        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // render the inside of the sphere

        const loader = new THREE.TextureLoader();
        let texture: THREE.Texture | null = null;
        let material: THREE.MeshBasicMaterial | null = null;
        let sphere: THREE.Mesh | null = null;

        loader.load(
            src,
            (loaded) => {
                texture = loaded;
                texture.colorSpace = THREE.SRGBColorSpace;
                material = new THREE.MeshBasicMaterial({ map: texture });
                sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
                setLoading(false);
            },
            undefined,
            () => setError('Не удалось загрузить панораму.')
        );

        // Look-around state. lon/lat are in degrees; clamp lat to avoid pole flip.
        // Start at lon=180 because three.js' default SphereGeometry UV mapping
        // (after the x-flip we did) puts the image *center* at -X, so we have
        // to rotate the camera 180° to face it on first paint.
        let lon = 180;
        let lat = 0;
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartLon = 0;
        let dragStartLat = 0;

        const handlePointerDown = (event: PointerEvent) => {
            isDragging = true;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            dragStartLon = lon;
            dragStartLat = lat;
            container.style.cursor = 'grabbing';
            (event.target as Element).setPointerCapture?.(event.pointerId);
        };
        const handlePointerMove = (event: PointerEvent) => {
            if (!isDragging) return;
            const dx = event.clientX - dragStartX;
            const dy = event.clientY - dragStartY;
            lon = dragStartLon - dx * 0.18;
            lat = Math.max(-80, Math.min(80, dragStartLat + dy * 0.18));
        };
        const handlePointerUp = () => {
            isDragging = false;
            container.style.cursor = 'grab';
        };

        container.style.cursor = 'grab';
        container.addEventListener('pointerdown', handlePointerDown);
        container.addEventListener('pointermove', handlePointerMove);
        container.addEventListener('pointerup', handlePointerUp);
        container.addEventListener('pointercancel', handlePointerUp);
        container.addEventListener('pointerleave', handlePointerUp);

        const target = new THREE.Vector3();
        let rafId = 0;
        const animate = () => {
            rafId = requestAnimationFrame(animate);
            // Gentle drift while idle, so the modal feels alive on first paint.
            if (!isDragging) lon += 0.04;
            const phi = THREE.MathUtils.degToRad(90 - lat);
            const theta = THREE.MathUtils.degToRad(lon);
            target.set(
                500 * Math.sin(phi) * Math.cos(theta),
                500 * Math.cos(phi),
                500 * Math.sin(phi) * Math.sin(theta)
            );
            camera.lookAt(target);
            renderer.render(scene, camera);
        };
        animate();

        const resizeObserver = new ResizeObserver(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });
        resizeObserver.observe(container);

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            container.removeEventListener('pointerdown', handlePointerDown);
            container.removeEventListener('pointermove', handlePointerMove);
            container.removeEventListener('pointerup', handlePointerUp);
            container.removeEventListener('pointercancel', handlePointerUp);
            container.removeEventListener('pointerleave', handlePointerUp);
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material?.dispose();
            texture?.dispose();
            renderer.dispose();
        };
    }, [src]);

    return (
        <div className="absolute inset-0 w-full h-full select-none touch-none" aria-label={alt} role="img">
            <div ref={containerRef} className="absolute inset-0" />
            {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.3em] text-white/50">
                    360°
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-rose-300">
                    {error}
                </div>
            )}
            {!loading && !error && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/70">
                    360°
                </div>
            )}
        </div>
    );
}
