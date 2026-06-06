"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { AdditiveBlending, DoubleSide } from "three";

type TraceCardThreeProps = {
  variant: "pyramid" | "diamond";
};

type TraceLineProps = {
  color: string;
  opacity: number;
  points: [number, number, number][];
};

const pyramidLines: [number, number, number][][] = [
  [
    [-0.95, -0.7, 0],
    [0.95, -0.7, 0],
    [0.95, 0.7, 0],
    [-0.95, 0.7, 0],
    [-0.95, -0.7, 0],
  ],
  [
    [-0.95, -0.7, 0],
    [0, 0.92, 0.28],
    [0.95, -0.7, 0],
    [0, 0.92, 0.28],
    [0.95, 0.7, 0],
    [0, 0.92, 0.28],
    [-0.95, 0.7, 0],
  ],
  [
    [-0.45, -0.28, 0.12],
    [0.45, -0.28, 0.12],
    [0.45, 0.28, 0.12],
    [-0.45, 0.28, 0.12],
    [-0.45, -0.28, 0.12],
  ],
];

const diamondLines: [number, number, number][][] = [
  [
    [0, -0.92, 0],
    [0.92, 0, 0],
    [0, 0.92, 0],
    [-0.92, 0, 0],
    [0, -0.92, 0],
  ],
  [
    [0, -0.52, 0.16],
    [0.52, 0, 0.16],
    [0, 0.52, 0.16],
    [-0.52, 0, 0.16],
    [0, -0.52, 0.16],
  ],
  [
    [0, -0.92, 0],
    [0, -0.52, 0.16],
    [0.92, 0, 0],
    [0.52, 0, 0.16],
    [0, 0.92, 0],
    [0, 0.52, 0.16],
    [-0.92, 0, 0],
    [-0.52, 0, 0.16],
  ],
];

function TraceLine({ color, opacity, points }: TraceLineProps) {
  const vertices = useMemo(
    () => new Float32Array(points.flatMap((point) => point)),
    [points],
  );

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
      />
    </line>
  );
}

function TracePlane({ variant }: TraceCardThreeProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.z = clock.elapsedTime * 0.16;
    meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.5) * 0.035);
  });

  if (variant === "diamond") {
    return (
      <mesh ref={meshRef} rotation={[0, 0, Math.PI / 4]} position={[0, 0, -0.18]}>
        <planeGeometry args={[1.1, 1.1]} />
        <meshBasicMaterial
          color="#0be0a0"
          transparent
          opacity={0.12}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef} position={[0, 0.02, -0.18]}>
      <circleGeometry args={[0.88, 3]} />
      <meshBasicMaterial
        color="#d92d62"
        transparent
        opacity={0.12}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function TraceScene({ variant }: TraceCardThreeProps) {
  const groupRef = useRef<Group>(null);
  const trailRef = useRef<Group>(null);
  const lines = variant === "diamond" ? diamondLines : pyramidLines;
  const primary = variant === "diamond" ? "#0be0a0" : "#d92d62";
  const secondary = variant === "diamond" ? "#c88a1f" : "#097a72";

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.x = pointer.y * 0.18 + Math.sin(t * 0.9) * 0.025;
      groupRef.current.rotation.y = pointer.x * 0.22 + Math.cos(t * 0.8) * 0.025;
      groupRef.current.rotation.z = Math.sin(t * 0.7) * 0.025;
      groupRef.current.position.x = pointer.x * 0.08;
      groupRef.current.position.y = pointer.y * 0.06;
    }
    if (trailRef.current) {
      trailRef.current.position.y = Math.sin(t * 0.85) * 0.08;
      trailRef.current.position.z = -0.28 + Math.cos(t * 0.75) * 0.04;
    }
  });

  return (
    <group scale={1.28}>
      <ambientLight intensity={1.35} />
      <group ref={trailRef}>
        {[0, 1, 2].map((layer) => (
          <group
            key={layer}
            position={[layer * 0.055, -layer * 0.075, -layer * 0.2]}
            scale={1 + layer * 0.08}
          >
            {lines.map((points, i) => (
              <TraceLine
                key={`${layer}-${i}`}
                color={i === 1 ? secondary : primary}
                opacity={0.16 + (2 - layer) * 0.06}
                points={points}
              />
            ))}
          </group>
        ))}
      </group>
      <group ref={groupRef}>
        <TracePlane variant={variant} />
        {lines.map((points, i) => (
          <TraceLine
            key={i}
            color={i === 1 ? secondary : primary}
            opacity={i === 1 ? 0.9 : 0.78}
            points={points}
          />
        ))}
      </group>
    </group>
  );
}

export function TraceCardThree({ variant }: TraceCardThreeProps) {
  return (
    <div
      aria-hidden="true"
      className="trace-card-three"
      style={{
        inset: 0,
        position: "absolute",
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 8], zoom: 112 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={{ inset: 0, position: "absolute" }}
      >
        <TraceScene variant={variant} />
      </Canvas>
    </div>
  );
}
