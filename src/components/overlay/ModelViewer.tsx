'use client';

// WebGL 3D model viewer used inside the product lightbox. Renders the GLB
// under a procedural studio HDRI (RoomEnvironment) with ACES filmic tone
// mapping, soft contact shadow, and a slow auto-rotate that stops on the
// first user interaction — aimed at a "Meshy-preview" finish.
//
// Loaded via next/dynamic so the addon imports (GLTFLoader, OrbitControls,
// RoomEnvironment, MeshoptDecoder) only ship when a model actually opens.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Per-model corrective transforms — for cases where the GLB is exported
// with the wrong axis up, sitting underground, or scaled badly. All optional.
export type ModelOrientation = {
    rotateX?: number; // degrees applied around model's X axis
    rotateY?: number;
    rotateZ?: number;
    yOffset?: number; // extra vertical shift (units), applied after centring
    scale?: number;   // multiplier on the auto-fit scale (1 = unchanged)
};

interface ModelViewerProps {
    src: string;
    alt: string;
    orientation?: ModelOrientation;
}

export default function ModelViewer({ src, alt, orientation }: ModelViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [bytesLoaded, setBytesLoaded] = useState(0);
    const [error, setError] = useState<string | null>(null);
    // Render-time setter pattern: reset state when the source changes.
    const [prevSrc, setPrevSrc] = useState(src);
    if (prevSrc !== src) {
        setPrevSrc(src);
        setLoading(true);
        setProgress(0);
        setBytesLoaded(0);
        setError(null);
    }

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(
            32,
            container.clientWidth / container.clientHeight || 1,
            0.01,
            100
        );
        camera.position.set(0, 0.55, 1.9);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.display = 'block';
        container.appendChild(renderer.domElement);

        // Procedural studio HDRI — no extra texture file needed. Drives all
        // PBR reflections (chrome, glass, lacquer) so the materials read
        // physically rather than flat-lit.
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTexture;

        // Key + fill light so silhouettes still read on the dark UI panel
        // and the contact shadow has something to project.
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(2.5, 4, 3);
        keyLight.castShadow = true;
        // Bigger shadow map = sharper, less crawl on edges.
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 12;
        keyLight.shadow.camera.left = -1.6;
        keyLight.shadow.camera.right = 1.6;
        keyLight.shadow.camera.top = 1.6;
        keyLight.shadow.camera.bottom = -1.6;
        keyLight.shadow.bias = -0.0002;
        keyLight.shadow.radius = 4;
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xbcd9ff, 0.35);
        fillLight.position.set(-3, 2, -2);
        scene.add(fillLight);

        // No separate contact-shadow plane: the Mira GLBs ship with their
        // own floor mesh at y=0, so adding our own at the same height
        // z-fights with it (visible as flickering on the floor under the
        // vanity). Letting the GLB's floor receive the shadow directly
        // avoids the depth conflict.

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.minDistance = 0.6;
        controls.maxDistance = 4;
        controls.autoRotate = false;
        // Keep the camera inside a "showroom front arc": user can look
        // at the product from front, left and right, slightly down or
        // very slightly up — no flipping behind the back wall.
        controls.minPolarAngle = Math.PI * 0.18; // ~32° from top (looking down)
        controls.maxPolarAngle = Math.PI * 0.52; // just below horizon
        controls.minAzimuthAngle = -Math.PI * 0.3; // ~54° left
        controls.maxAzimuthAngle = Math.PI * 0.3;  // ~54° right

        let model: THREE.Object3D | null = null;
        let cancelled = false;

        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        loader.load(
            src,
            (gltf) => {
                if (cancelled) return;
                model = gltf.scene;

                // 1. Apply user-provided rotation overrides (degrees → radians).
                if (orientation?.rotateX) model.rotation.x = THREE.MathUtils.degToRad(orientation.rotateX);
                if (orientation?.rotateY) model.rotation.y = THREE.MathUtils.degToRad(orientation.rotateY);
                if (orientation?.rotateZ) model.rotation.z = THREE.MathUtils.degToRad(orientation.rotateZ);

                // 2. Cast & receive shadows on every mesh. Walls / floors
                //    stay visible — they're part of the showroom context.
                model.traverse((obj) => {
                    if (!(obj as THREE.Mesh).isMesh) return;
                    const mesh = obj as THREE.Mesh;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                });

                // 3. Scale the whole scene so the longest axis is ~1 unit.
                //    Tried product-only bbox earlier; on these Mira GLBs
                //    it was unstable (some wall thicknesses passed the
                //    aspect-ratio filter, others didn't, and the camera
                //    ended up outside the room with single-sided wall
                //    geometry hiding everything). Whole-scene scaling is
                //    coarser but predictable.
                const initialBox = new THREE.Box3().setFromObject(model);
                const initialSize = initialBox.getSize(new THREE.Vector3());
                const longest = Math.max(initialSize.x, initialSize.y, initialSize.z);
                if (longest > 0) {
                    const baseScale = 1 / longest;
                    const finalScale = baseScale * (orientation?.scale ?? 1);
                    model.scale.setScalar(finalScale);
                }

                // Centre horizontally, drop the lowest mesh (floor) on y=0.
                const scaledBox = new THREE.Box3().setFromObject(model);
                const scaledCentre = scaledBox.getCenter(new THREE.Vector3());
                model.position.x -= scaledCentre.x;
                model.position.y -= scaledBox.min.y;
                model.position.z -= scaledCentre.z;

                // 4. Optional manual nudge for misplaced models.
                if (orientation?.yOffset) model.position.y += orientation.yOffset;

                scene.add(model);

                // 5. Frame the camera on the lower third of the scene
                //    (where the vanity sits) at a distance that puts the
                //    camera *inside* the open side of the room rather
                //    than behind a back-face-culled front wall.
                const finalBox = new THREE.Box3().setFromObject(model);
                const finalSize = finalBox.getSize(new THREE.Vector3());
                const targetY = finalBox.min.y + finalSize.y * 0.45;
                // Tighter zoom — feels showroom-close without clipping
                // the back wall.
                const cameraDistance = Math.max(1.05, finalSize.z * 0.45 + 0.45);
                controls.target.set(0, targetY, 0);
                camera.position.set(0, targetY + 0.05, cameraDistance);
                controls.update();
                camera.updateProjectionMatrix();

                setLoading(false);
            },
            (event) => {
                if (cancelled) return;
                setBytesLoaded(event.loaded);
                if (event.lengthComputable && event.total > 0) {
                    setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
                }
            },
            (errEvent) => {
                if (cancelled) return;
                const detail = errEvent instanceof Error
                    ? errEvent.message
                    : (errEvent as ErrorEvent)?.message;
                console.error('[ModelViewer] failed to load', src, errEvent);
                setError(detail ? `Ошибка: ${detail}` : 'Не удалось загрузить модель.');
            }
        );

        let rafId = 0;
        const animate = () => {
            rafId = requestAnimationFrame(animate);
            controls.update();
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
            cancelled = true;
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            controls.dispose();
            if (model) {
                scene.remove(model);
                model.traverse((obj) => {
                    if ((obj as THREE.Mesh).isMesh) {
                        const mesh = obj as THREE.Mesh;
                        mesh.geometry?.dispose();
                        const mat = mesh.material;
                        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                        else mat?.dispose();
                    }
                });
            }
            envTexture.dispose();
            pmrem.dispose();
            renderer.dispose();
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [src, orientation]);

    return (
        <div className="absolute inset-0 w-full h-full select-none touch-none" aria-label={alt} role="img">
            {/* Soft showroom backdrop — replaces the modal's near-black
                gradient in this region only, gives furniture a warmer
                gallery-lit feel without affecting the panorama / sketchfab
                viewers. */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#ece4d6_0%,#b6ad9d_55%,#3a342c_100%)]" />
            <div ref={containerRef} className="absolute inset-0" />
            {loading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
                    <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-cyan-300 animate-spin" />
                    <div className="text-[10px] uppercase tracking-[0.3em]">
                        {progress > 0 ? `${progress}%` : 'Loading 3D'}
                    </div>
                    {bytesLoaded > 0 && (
                        <div className="font-mono text-[10px] text-white/50">
                            {(bytesLoaded / (1024 * 1024)).toFixed(1)} MB
                        </div>
                    )}
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-rose-300">
                    {error}
                </div>
            )}
            {!loading && !error && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/70">
                    3D · drag to rotate
                </div>
            )}
        </div>
    );
}
