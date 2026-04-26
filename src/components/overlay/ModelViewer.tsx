'use client';

// Lightweight WebGL 3D model viewer used in the Doublelin product lightbox.
// Loads a GLB asset, frames it to the camera, and renders it under a
// neutral studio HDRI so the materials look closer to Meshy's preview
// than the default three.js "1 directional light" presentation.
//
// Loaded via next/dynamic so the addon imports (GLTFLoader, OrbitControls,
// RoomEnvironment) only ship when a model actually opens.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

interface ModelViewerProps {
    src: string;
    alt: string;
}

export default function ModelViewer({ src, alt }: ModelViewerProps) {
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
            35,
            container.clientWidth / container.clientHeight || 1,
            0.01,
            100
        );
        camera.position.set(0, 0.6, 1.8);

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

        // Studio-room HDRI (procedural — no extra texture file needed).
        // This is what gives the metallic/glass surfaces their "Meshy" feel.
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTexture;

        // Key light casts the contact shadow; fill softens the back.
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(2.5, 4, 3);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 12;
        keyLight.shadow.camera.left = -1.4;
        keyLight.shadow.camera.right = 1.4;
        keyLight.shadow.camera.top = 1.4;
        keyLight.shadow.camera.bottom = -1.4;
        keyLight.shadow.bias = -0.0002;
        keyLight.shadow.radius = 6;
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xbcd9ff, 0.35);
        fillLight.position.set(-3, 2, -2);
        scene.add(fillLight);

        // Soft circular contact shadow underneath the model.
        const shadowGeometry = new THREE.PlaneGeometry(3, 3);
        const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.42 });
        const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.minDistance = 0.2;
        controls.maxDistance = 5;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.6;
        // Stop auto-rotate once the user interacts.
        const stopAutoRotate = () => { controls.autoRotate = false; };
        controls.addEventListener('start', stopAutoRotate);

        let model: THREE.Object3D | null = null;
        let cancelled = false;

        const loader = new GLTFLoader();
        // Required to decode the meshopt-compressed geometry produced by
        // gltf-transform's optimize step (~8× geometry size reduction).
        loader.setMeshoptDecoder(MeshoptDecoder);
        loader.load(
            src,
            (gltf) => {
                if (cancelled) return;
                model = gltf.scene;

                // Cast shadows from every mesh so the contact-shadow plane
                // actually receives something.
                model.traverse((obj) => {
                    if ((obj as THREE.Mesh).isMesh) {
                        const mesh = obj as THREE.Mesh;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                    }
                });

                // Step 1: scale so the longest axis is ~1 unit.
                const initialBox = new THREE.Box3().setFromObject(model);
                const initialSize = initialBox.getSize(new THREE.Vector3());
                const longest = Math.max(initialSize.x, initialSize.y, initialSize.z);
                if (longest > 0) model.scale.setScalar(1 / longest);

                // Step 2: with the scaled model, drop its bottom onto y=0
                // and centre horizontally — this anchors the contact shadow
                // beneath the actual geometry, not behind it.
                const scaledBox = new THREE.Box3().setFromObject(model);
                const scaledCentre = scaledBox.getCenter(new THREE.Vector3());
                model.position.x -= scaledCentre.x;
                model.position.y -= scaledBox.min.y;
                model.position.z -= scaledCentre.z;

                scene.add(model);

                // Frame the camera at a flattering ~3/4 angle on the
                // model's vertical centre.
                const finalBox = new THREE.Box3().setFromObject(model);
                const targetY = (finalBox.min.y + finalBox.max.y) / 2;
                controls.target.set(0, targetY, 0);
                camera.position.set(0, targetY + 0.45, 1.7);
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
            controls.removeEventListener('start', stopAutoRotate);
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
            shadowGeometry.dispose();
            shadowMaterial.dispose();
            envTexture.dispose();
            pmrem.dispose();
            renderer.dispose();
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [src]);

    return (
        <div className="absolute inset-0 w-full h-full select-none touch-none" aria-label={alt} role="img">
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
