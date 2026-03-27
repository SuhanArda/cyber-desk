"use client";

import React, { Suspense, useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, RoundedBox, useGLTF, Float, Html, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING SCREEN — spinner while GLB assets are fetched
   ═══════════════════════════════════════════════════════════════════════════ */
function SceneLoader() {
    return (
        <Html center>
            <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "16px", fontFamily: "monospace", color: "#00ffcc",
            }}>
                <div style={{
                    width: "48px", height: "48px",
                    border: "3px solid rgba(0,255,204,0.15)",
                    borderTop: "3px solid #00ffcc",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                }} />
                <span style={{ fontSize: "12px", letterSpacing: "0.15em", opacity: 0.7 }}>
                    LOADING_ASSETS...
                </span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </Html>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIEGETIC TOOLTIP — glowing amber monospace text floating above objects
   ═══════════════════════════════════════════════════════════════════════════ */
function DiegeticTooltip({
    text,
    visible,
    position,
}: {
    text: string;
    visible: boolean;
    position: [number, number, number];
}) {
    const ref = useRef<THREE.Group>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame(({ clock }) => {
        if (!ref.current || !matRef.current) return;
        const t = clock.getElapsedTime();
        ref.current.position.y = position[1] + Math.sin(t * 2) * 0.03;
        matRef.current.opacity = visible ? 0.75 + Math.sin(t * 3) * 0.25 : 0;
        const target = visible ? 1 : 0;
        ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    });

    return (
        <group ref={ref} position={position} scale={0}>
            <Text fontSize={0.12} anchorX="center" anchorY="middle" letterSpacing={0.08}>
                {`> ${text}_`}
                <meshBasicMaterial ref={matRef} color="#ffb300" transparent opacity={0} toneMapped={false} />
            </Text>
            <mesh position={[0, -0.1, 0]}>
                <planeGeometry args={[text.length * 0.08 + 0.3, 0.008]} />
                <meshBasicMaterial color="#ffb300" transparent opacity={0.5} toneMapped={false} />
            </mesh>
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERACTIVE DESK OBJECT — hover/click logic wrapper with cursor fix
   ═══════════════════════════════════════════════════════════════════════════ */
function InteractiveObject({
    children,
    position,
    tooltipText,
    tooltipOffset = [0, 0.6, 0],
    onAction,
}: {
    children: React.ReactNode;
    position: [number, number, number];
    tooltipText: string;
    tooltipOffset?: [number, number, number];
    onAction: () => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    useFrame(() => {
        if (!groupRef.current) return;
        const s = hovered ? 1.08 : 1;
        groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
    });

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.setProperty('cursor', 'pointer', 'important');
    }, []);

    const handlePointerOut = useCallback(() => {
        setHovered(false);
        document.body.style.setProperty('cursor', 'default', 'important');
    }, []);

    const handleClick = useCallback(
        (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onAction();
        },
        [onAction]
    );

    return (
        <group ref={groupRef} position={position}>
            <group
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                {children}
            </group>
            <DiegeticTooltip text={tooltipText} visible={hovered} position={tooltipOffset} />
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MACBOOK GLB MODEL — /models/mac.glb + emissive code lines overlay
   ═══════════════════════════════════════════════════════════════════════════ */
function MacBookGLB({ hovered }: { hovered?: boolean }) {
    const { scene } = useGLTF("/models/mac.glb");
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    useFrame(() => {
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (mat && mat.emissive) {
                    mat.emissiveIntensity = THREE.MathUtils.lerp(
                        mat.emissiveIntensity, hovered ? 0.35 : 0, 0.08
                    );
                    if (hovered) mat.emissive.set("#00ffcc");
                }
            }
        });
    });

    return (
        <group rotation={[0, -0.3, 0]}>
            <primitive object={clonedScene} scale={3} position={[0, 0.08, 0]} castShadow />
            {/* ── Emissive code-lines overlay on screen area ── */}
            <group position={[0, 0.5, -0.25]} rotation={[-0.28, 0, 0]}>
                {[0.1, 0.065, 0.03, -0.005, -0.04, -0.075].map((y, i) => (
                    <mesh key={i} position={[0, y, 0.001]}>
                        <planeGeometry args={[0.25 + (i % 3) * 0.06, 0.02]} />
                        <meshBasicMaterial
                            color={i % 3 === 0 ? "#00ff41" : i % 3 === 1 ? "#00ccff" : "#b080ff"}
                            transparent
                            opacity={hovered ? 0.85 : 0.5}
                            toneMapped={false}
                        />
                    </mesh>
                ))}
            </group>
        </group>
    );
}

useGLTF.preload("/models/mac.glb");

/* ═══════════════════════════════════════════════════════════════════════════
   PRIMITIVE NOTEBOOK — procedurally generated open notebook (restored)
   ═══════════════════════════════════════════════════════════════════════════ */
function NotebookModel({ hovered }: { hovered?: boolean }) {
    const emissiveIntensity = hovered ? 0.5 : 0;
    return (
        <group rotation={[0, -0.3, 0]}>
            {/* Left page */}
            <RoundedBox args={[0.6, 0.02, 0.8]} radius={0.01} position={[-0.32, 0.09, 0]} castShadow>
                <meshStandardMaterial
                    color="#f5f0e8"
                    roughness={0.9}
                    emissive="#ffb300"
                    emissiveIntensity={emissiveIntensity}
                />
            </RoundedBox>
            {/* Right page */}
            <RoundedBox args={[0.6, 0.02, 0.8]} radius={0.01} position={[0.32, 0.09, 0]} castShadow>
                <meshStandardMaterial
                    color="#f5f0e8"
                    roughness={0.9}
                    emissive="#ffb300"
                    emissiveIntensity={emissiveIntensity}
                />
            </RoundedBox>
            {/* Spine */}
            <mesh position={[0, 0.085, 0]} castShadow>
                <boxGeometry args={[0.04, 0.03, 0.82]} />
                <meshStandardMaterial color="#8b4513" roughness={0.7} />
            </mesh>
            {/* Diagram lines on left page */}
            {[-0.15, -0.05, 0.05, 0.15].map((z, i) => (
                <mesh key={`l${i}`} position={[-0.32, 0.101, z]}>
                    <planeGeometry args={[0.45, 0.008]} />
                    <meshBasicMaterial color="#333" transparent opacity={0.4} />
                </mesh>
            ))}
            {/* Blue circle diagram on right page */}
            <mesh position={[0.32, 0.101, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.08, 0.1, 32]} />
                <meshBasicMaterial color="#2563eb" transparent opacity={0.6} />
            </mesh>
            {/* Red hexagon diagram on right page */}
            <mesh position={[0.32, 0.101, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.05, 0.065, 6]} />
                <meshBasicMaterial color="#dc2626" transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   IPHONE GLB MODEL — /models/iphone.glb (between notebook and PCB)
   ═══════════════════════════════════════════════════════════════════════════ */
function IPhoneGLB({ hovered }: { hovered?: boolean }) {
    const { scene } = useGLTF("/models/iphone.glb");
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    useFrame(() => {
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (mat && mat.emissive) {
                    mat.emissiveIntensity = THREE.MathUtils.lerp(
                        mat.emissiveIntensity, hovered ? 0.35 : 0, 0.08
                    );
                    if (hovered) mat.emissive.set("#00ffcc");
                }
            }
        });
    });

    return (
        <group>
            <primitive object={clonedScene} scale={0.01} position={[0, 0.1, -0.5]} rotation={[-1.5, 0, 0]} castShadow receiveShadow />
        </group>
    );
}

useGLTF.preload("/models/iphone.glb");

/* ═══════════════════════════════════════════════════════════════════════════
   PCB GLB MODEL — /models/pcb.glb (right side)
   ═══════════════════════════════════════════════════════════════════════════ */
function PcbModel({ hovered }: { hovered?: boolean }) {
    const { scene } = useGLTF("/models/pcb.glb");
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    useFrame(() => {
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (mat && mat.emissive) {
                    mat.emissiveIntensity = THREE.MathUtils.lerp(
                        mat.emissiveIntensity, hovered ? 0.4 : 0, 0.08
                    );
                    if (hovered) mat.emissive.set("#00ffcc");
                }
            }
        });
    });

    return (
        <Float speed={2} rotationIntensity={0.08} floatIntensity={0.15}>
            <group>
                <primitive
                    object={clonedScene}
                    scale={1}
                    position={[0.75, 2, -3]}
                    rotation={[0, 0.5, 1.5]}
                    castShadow
                />
                {/* Orange accent light to illuminate PCB details */}
                <pointLight
                    position={[0, 0.3, 0]}
                    intensity={0.5}
                    distance={2}
                    color="#ff8800"
                />
            </group>
        </Float>
    );
}

useGLTF.preload("/models/pcb.glb");

/* ═══════════════════════════════════════════════════════════════════════════
   REAL DESK — /models table from supabase (or fallback primitive)
   ═══════════════════════════════════════════════════════════════════════════ */
const DESK_URL =
    "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/table-wood/model.gltf";

function RealDesk() {
    const { scene } = useGLTF(DESK_URL);
    return <primitive object={scene} position={[0, -1, 0]} scale={2} receiveShadow />;
}

function DeskFallback() {
    return (
        <group>
            <mesh position={[0, 0, 0]} receiveShadow>
                <boxGeometry args={[6, 0.15, 3]} />
                <meshStandardMaterial color="#3a2518" roughness={0.75} metalness={0.05} />
            </mesh>
            <mesh position={[0, -0.01, 1.505]}>
                <boxGeometry args={[6.02, 0.08, 0.02]} />
                <meshStandardMaterial color="#666" metalness={0.9} roughness={0.2} />
            </mesh>
            {([[-2.7, -0.9, 1.2], [2.7, -0.9, 1.2], [-2.7, -0.9, -1.2], [2.7, -0.9, -1.2]] as [number, number, number][]).map((pos, i) => (
                <mesh key={i} position={pos}>
                    <cylinderGeometry args={[0.06, 0.06, 1.65, 8]} />
                    <meshStandardMaterial color="#2a1a0e" roughness={0.8} />
                </mesh>
            ))}
        </group>
    );
}

useGLTF.preload(DESK_URL);

/* ── ErrorBoundary for desk GLTF ── */
class DeskErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLOOR — grid plane with neon lines
   ═══════════════════════════════════════════════════════════════════════════ */
function Floor() {
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.75, 0]}>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#0e0e12" roughness={0.9} />
            </mesh>
            {Array.from({ length: 21 }, (_, i) => i - 10).map((offset) => (
                <React.Fragment key={offset}>
                    <mesh position={[offset, -1.749, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.005, 20]} />
                        <meshBasicMaterial color="#00ffcc" transparent opacity={0.04} toneMapped={false} />
                    </mesh>
                    <mesh position={[0, -1.749, offset]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                        <planeGeometry args={[0.005, 20]} />
                        <meshBasicMaterial color="#00ffcc" transparent opacity={0.04} toneMapped={false} />
                    </mesh>
                </React.Fragment>
            ))}
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCENE — assembles everything inside the Canvas
   ═══════════════════════════════════════════════════════════════════════════ */
function Scene() {
    const router = useRouter();

    return (
        <>
            {/* ── Lighting (tuned for GLB model textures) ── */}
            <ambientLight intensity={1.3} color="#eaeeff" />
            <spotLight
                position={[0, 6, 0]}
                angle={0.6}
                penumbra={0.4}
                intensity={2.8}
                color="#00ffcc"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
            <pointLight position={[-3, 4, 3]} intensity={0.8} color="#ffffff" />
            <pointLight position={[3, 3, -2]} intensity={0.5} color="#3366ff" />
            <pointLight position={[0, 2, 4]} intensity={0.6} color="#ff6600" />
            <pointLight position={[0, 3, 5]} intensity={0.7} color="#ffffff" />

            {/* ── Floor ── */}
            <Floor />

            {/* ── Desk (remote GLTF with primitive fallback) ── */}
            <DeskErrorBoundary fallback={<DeskFallback />}>
                <Suspense fallback={<DeskFallback />}>
                    <RealDesk />
                </Suspense>
            </DeskErrorBoundary>

            {/* ── ContactShadows for realistic object grounding ── */}
            <ContactShadows
                position={[0, -0.09, 0]}
                opacity={0.8}
                scale={15}
                blur={2}
                far={3}
            />

            {/* ── MacBook (Left side) ── */}
            <InteractiveObject
                position={[-1.8, 0.08, -0.2]}
                tooltipText="GITHUB"
                tooltipOffset={[0, 0.9, 0]}
                onAction={() => window.open("https://github.com/SuhanArda", "_blank")}
            >
                <Suspense fallback={null}>
                    <MacBookGLB />
                </Suspense>
            </InteractiveObject>

            {/* ── Primitive Notebook (Center) ── */}
            <InteractiveObject
                position={[0.3, 0.01, 0.2]}
                tooltipText="CV"
                tooltipOffset={[0, 0.7, 0]}
                onAction={() => window.open("/cv.pdf", "_blank")}
            >
                <NotebookModel />
            </InteractiveObject>

            {/* ── iPhone (Center-Right) ── */}
            <InteractiveObject
                position={[1.3, 0.01, 0.1]}
                tooltipText="LINKEDIN"
                tooltipOffset={[0, 0.8, 0]}
                onAction={() => window.open("https://linkedin.com/in/suhan-arda-öner", "_blank")}
            >
                <Suspense fallback={null}>
                    <IPhoneGLB />
                </Suspense>
            </InteractiveObject>

            {/* ── PCB Board (Right side) ── */}
            <InteractiveObject
                position={[2, 0.01, -0.1]}
                tooltipText="PROJECTS"
                tooltipOffset={[0, 0.8, 0]}
                onAction={() => router.push("/projects")}
            >
                <Suspense fallback={null}>
                    <PcbModel />
                </Suspense>
            </InteractiveObject>

            {/* ── Camera Controls ── */}
            <OrbitControls
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 2.3}
                minAzimuthAngle={-Math.PI / 4}
                maxAzimuthAngle={Math.PI / 4}
                minDistance={3}
                maxDistance={10}
                enablePan={false}
                target={[0, 0.2, 0]}
            />

            {/* ── Post-processing ── */}
            <EffectComposer>
                <Bloom
                    intensity={0.4}
                    luminanceThreshold={0.8}
                    luminanceSmoothing={0.5}
                    mipmapBlur
                />
            </EffectComposer>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE — full-screen canvas + HUD overlay + cursor fix
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CyberDeskPage() {
    /* Fix 3: force OS cursor visible globally */
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            * { cursor: default !important; }
            canvas { cursor: default !important; }
        `;
        document.head.appendChild(style);

        return () => { document.head.removeChild(style); };
    }, []);

    return (
        <div className="h-screen w-screen relative bg-[#0a0a0f] text-white overflow-hidden">
            {/* ═══ R3F Canvas ═══ */}
            <Canvas
                camera={{ position: [0, 3, 5], fov: 50 }}
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
                style={{ position: "absolute", inset: 0 }}
            >
                <Suspense fallback={<SceneLoader />}>
                    <Scene />
                </Suspense>
            </Canvas>

            {/* ═══ HUD: Back Button ═══ */}
            <div className="absolute top-6 left-6" style={{ zIndex: 50 }}>
                <Link
                    href="/"
                    className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-mono text-sm transition-all duration-300"
                    style={{
                        background: "rgba(127, 29, 29, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#f87171",
                        boxShadow: "0 0 12px rgba(239, 68, 68, 0.1)",
                        backdropFilter: "blur(12px)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(127, 29, 29, 0.35)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
                        e.currentTarget.style.boxShadow = "0 0 20px rgba(239, 68, 68, 0.25)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(127, 29, 29, 0.15)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
                        e.currentTarget.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.1)";
                    }}
                >
                    <ArrowLeft size={15} />
                    TERMINATE_LINK
                </Link>
            </div>

            {/* ═══ Bottom Status Bar ═══ */}
            <div
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 font-mono text-[10px] tracking-[0.2em] px-4 py-1.5 rounded-full"
                style={{
                    zIndex: 50,
                    color: "rgba(0, 255, 204, 0.4)",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(0, 255, 204, 0.08)",
                    backdropFilter: "blur(12px)",
                }}
            >
                CYBER_DESK_ENGINE v1.0 • DIEGETIC_UI_ACTIVE • INTERACT_TO_NAVIGATE
            </div>
        </div>
    );
}
