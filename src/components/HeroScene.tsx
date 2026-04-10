"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Float, Sparkles } from "@react-three/drei";
import { Suspense } from "react";

function VaultCore() {
  return (
    <Float speed={2} rotationIntensity={0.9} floatIntensity={0.9}>
      <mesh>
        <torusKnotGeometry args={[1.1, 0.35, 180, 24]} />
        <meshStandardMaterial
          metalness={0.6}
          roughness={0.25}
          color="#a78bfa"
          emissive="#4c1d95"
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh rotation={[0.5, 0.1, 0]}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          metalness={0.15}
          roughness={0.1}
          color="#e4e4e7"
          emissive="#0ea5e9"
          emissiveIntensity={0.25}
        />
      </mesh>
      <Sparkles count={110} speed={0.6} size={1.5} scale={6} />
    </Float>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 5.7], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <VaultCore />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.25),transparent_40%),radial-gradient(circle_at_70%_30%,rgba(14,165,233,0.18),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(244,63,94,0.08),transparent_50%)]" />
    </div>
  );
}

