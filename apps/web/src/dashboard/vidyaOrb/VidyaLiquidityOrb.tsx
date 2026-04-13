import { Html, MeshDistortMaterial } from '@react-three/drei';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import * as TWEEN from '@tweenjs/tween.js';
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { formatMoney } from '../../lib/formatMoney';

export type LiquidityOrbTotals = {
  banks: string;
  wallets: string;
  investments: string;
};

type Props = {
  currencyCode: string;
  totals: LiquidityOrbTotals;
  /** Cuando el canvas WebGL está listo (una vez por montaje). */
  onSceneReady?: () => void;
};

type SatelliteDatum = {
  key: string;
  label: string;
  amount: number;
  color: string;
  emissive: string;
  phase: number;
};

const ORBIT_RADIUS = 2.35;
const BASE_ORBIT_SPEED = 0.22;

function useTweenFrame() {
  useFrame(() => {
    TWEEN.update(performance.now());
  });
}

function CentralOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
      meshRef.current.rotation.x += delta * 0.04;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.08, 5]} />
      <MeshDistortMaterial
        color="#0f172a"
        emissive="#3b82f6"
        emissiveIntensity={0.55}
        roughness={0.15}
        metalness={0.65}
        distort={0.32}
        speed={1.35}
        radius={0.85}
      />
    </mesh>
  );
}

function LiquiditySatellite({
  datum,
  currencyCode,
  scale,
  globalOrbitRef,
  hovered,
  onHover,
}: {
  datum: SatelliteDatum;
  currencyCode: string;
  scale: number;
  globalOrbitRef: MutableRefObject<number>;
  hovered: boolean;
  onHover: (hover: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const frozenAngle = useRef<number | null>(null);
  const frozenY = useRef<number | null>(null);
  const emissiveState = useMemo(() => ({ i: 0.28 }), []);
  const tweenRef = useRef<TWEEN.Tween<{ i: number }> | null>(null);

  useTweenFrame();

  useEffect(() => {
    return () => {
      tweenRef.current?.stop();
    };
  }, []);

  const runEmissiveTween = (target: number) => {
    tweenRef.current?.stop();
    tweenRef.current = new TWEEN.Tween(emissiveState)
      .to({ i: target }, 320)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  };

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshPhongMaterial;
    mat.emissiveIntensity = emissiveState.i;

    const angle =
      frozenAngle.current !== null ? frozenAngle.current : globalOrbitRef.current + datum.phase;
    mesh.position.x = Math.cos(angle) * ORBIT_RADIUS;
    mesh.position.z = Math.sin(angle) * ORBIT_RADIUS;
    mesh.position.y =
      frozenY.current !== null
        ? frozenY.current
        : Math.sin(globalOrbitRef.current * 0.65 + datum.phase) * 0.22;
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    frozenAngle.current = globalOrbitRef.current + datum.phase;
    if (meshRef.current) {
      frozenY.current = meshRef.current.position.y;
    }
    onHover(true);
    runEmissiveTween(1.15);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    frozenAngle.current = null;
    frozenY.current = null;
    onHover(false);
    runEmissiveTween(0.28);
  };

  return (
    <mesh
      ref={meshRef}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[0.42, 32, 32]} />
      <meshPhongMaterial
        color={datum.color}
        emissive={datum.emissive}
        emissiveIntensity={0.28}
        transparent
        opacity={0.62}
        shininess={96}
        depthWrite={false}
      />
      {hovered ? (
        <Html position={[0, scale * 0.52 + 0.2, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div
            className="min-w-[140px] rounded-lg border border-sky-400/40 px-2.5 py-1.5 text-left shadow-lg backdrop-blur-md"
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              boxShadow: '0 0 24px rgba(59, 130, 246, 0.45)',
            }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">{datum.label}</div>
            <div className="text-sm font-bold tabular-nums text-white">
              {formatMoney(String(datum.amount), currencyCode)}
            </div>
          </div>
        </Html>
      ) : null}
    </mesh>
  );
}

function OrbScene({
  data,
  currencyCode,
}: {
  data: SatelliteDatum[];
  currencyCode: string;
}) {
  const globalOrbitRef = useRef(0);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useFrame((_, delta) => {
    globalOrbitRef.current += delta * BASE_ORBIT_SPEED;
  });

  const maxAmt = Math.max(...data.map((d) => d.amount), 1);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={0.85} color="#e2e8f0" />
      <pointLight position={[-3, -2, 4]} intensity={1.15} color="#3b82f6" distance={12} decay={2} />
      <pointLight position={[3, 2, -4]} intensity={0.7} color="#60a5fa" distance={10} decay={2} />

      <group>
        <CentralOrb />
        {data.map((datum) => {
          const t = datum.amount / maxAmt;
          const scale = 0.55 + 0.55 * t;
          return (
            <LiquiditySatellite
              key={datum.key}
              datum={datum}
              currencyCode={currencyCode}
              scale={scale}
              globalOrbitRef={globalOrbitRef}
              hovered={hoveredKey === datum.key}
              onHover={(h) => setHoveredKey(h ? datum.key : null)}
            />
          );
        })}
      </group>
    </>
  );
}

function buildData(totals: LiquidityOrbTotals): SatelliteDatum[] {
  const banks = Math.max(0, Number(totals.banks));
  const wallets = Math.max(0, Number(totals.wallets));
  const inv = Math.max(0, Number(totals.investments));
  return [
    {
      key: 'banks',
      label: 'Bancos',
      amount: banks,
      color: '#38bdf8',
      emissive: '#0ea5e9',
      phase: 0,
    },
    {
      key: 'wallets',
      label: 'Carteras',
      amount: wallets,
      color: '#a78bfa',
      emissive: '#7c3aed',
      phase: (2 * Math.PI) / 3,
    },
    {
      key: 'investments',
      label: 'Inversiones',
      amount: inv,
      color: '#34d399',
      emissive: '#059669',
      phase: (4 * Math.PI) / 3,
    },
  ];
}

/**
 * Vidya Orb: liquidez real en 3D (bancos, carteras, inversiones como satélites orbitando).
 */
export function VidyaLiquidityOrb({ currencyCode, totals, onSceneReady }: Props) {
  const data = useMemo(() => buildData(totals), [totals]);
  const sum = data.reduce((s, d) => s + d.amount, 0);

  if (!Number.isFinite(sum) || sum <= 0) {
    return (
      <div
        className="flex h-[260px] w-full max-w-[360px] items-center justify-center rounded-xl border border-dashed border-white/15 px-4 text-center text-sm text-slate-300"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        Sin saldos para la órbita. Añade cuentas o movimientos para ver tu liquidez en 3D.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full max-w-[380px] overflow-hidden rounded-xl border border-white/10 md:h-[300px]">
      <Canvas
        camera={{ position: [0, 0.35, 6.2], fov: 42 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        onCreated={() => onSceneReady?.()}
      >
        <Suspense fallback={null}>
          <OrbScene data={data} currencyCode={currencyCode} />
        </Suspense>
      </Canvas>
    </div>
  );
}
