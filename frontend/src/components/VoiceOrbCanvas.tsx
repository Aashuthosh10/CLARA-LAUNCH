import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbState } from '../types/chat';

interface VoiceOrbCanvasProps {
  state: OrbState;
  amplitude: number; // 0 to 1
  onTap: () => void;
}

export default function VoiceOrbCanvas({ state, amplitude, onTap }: VoiceOrbCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const glowLightRef = useRef<THREE.PointLight | null>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const size = 200; // Increased size for better presence
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Particle Configuration
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Dark palette for light-bg visibility
    const palette = [
      new THREE.Color(0x1e293b), // slate-800 — base (60%)
      new THREE.Color(0x3b82f6), // blue-500  — secondary (30%)
      new THREE.Color(0x9333ea), // violet-500 — accent (10%)
    ];

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution
      const r = 0.8 * Math.pow(Math.random(), 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Random slow drift velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      // Assign from dark palette
      const roll = Math.random();
      const c = roll < 0.6 ? palette[0] : roll < 0.9 ? palette[1] : palette[2];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending, // NormalBlending — additive washes out on light bg
    });

    const particles = new THREE.Points(geometry, material);
    particlesRef.current = particles;
    scene.add(particles);

    // Inner Glow Light — blue-tinted for light bg
    const glowLight = new THREE.PointLight(0x3b82f6, 0.8, 5);
    glowLightRef.current = glowLight;
    scene.add(glowLight);

    let rafId: number;
    const targetColor = new THREE.Color();
    const currentColor = new THREE.Color(0x334155); // Start dark slate
    let lastTime = Date.now() * 0.001;

    const renderLoop = () => {
      rafId = requestAnimationFrame(renderLoop);

      const now = Date.now() * 0.001;
      const deltaTime = now - lastTime;
      lastTime = now;

      const isHighEnergy = state === 'listening' || state === 'speaking';
      const activeAmplitude = amplitude > 0.01 ? amplitude : 0;

      // 1. Color State Management — dark palette for light bg
      if (isHighEnergy) {
        targetColor.setHex(0x3b82f6); // blue-500: vivid on light
      } else if (state === 'processing') {
        targetColor.setHex(0x6366f1); // indigo-500: processing pulse
      } else {
        targetColor.setHex(0x334155); // slate-700: dark idle
      }
      // Faster lerp for reactivity (~0.1 per frame at 60fps is ~160ms)
      currentColor.lerp(targetColor, isHighEnergy ? 0.15 : 0.05);

      // 2. Breathing and Reactive Scale (Idle: 0.95 -> 1.05)
      const breatheSpeed = isHighEnergy ? 4 : 1.2;
      const breatheAmount = isHighEnergy ? 0.04 : 0.05;
      const idleBase = 1.0;
      const pulse = idleBase + Math.sin(now * breatheSpeed) * breatheAmount;

      // Map amplitude to scale: 1.0 -> 1.4 range
      const amplitudeScale = 1.0 + (activeAmplitude * 0.4);
      const finalScale = pulse * amplitudeScale;

      particles.scale.set(finalScale, finalScale, finalScale);

      // 3. Particle Motion
      const posAttr = geometry.attributes.position;
      const colAttr = geometry.attributes.color;

      // Subtle particle drift + vibration when active
      const speedMult = isHighEnergy ? (1.5 + activeAmplitude * 5) : 1.0;
      const vibration = isHighEnergy ? (activeAmplitude * 0.01) : 0;

      for (let i = 0; i < particleCount; i++) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);

        // Apply velocities + vibration
        const vx = velocities[i * 3] * speedMult + (Math.random() - 0.5) * vibration;
        const vy = velocities[i * 3 + 1] * speedMult + (Math.random() - 0.5) * vibration;
        const vz = velocities[i * 3 + 2] * speedMult + (Math.random() - 0.5) * vibration;

        posAttr.setX(i, px + vx);
        posAttr.setY(i, py + vy);
        posAttr.setZ(i, pz + vz);

        // Elastic containment
        const dist = Math.sqrt(px * px + py * py + pz * pz);
        if (dist > 1.0) {
          const factor = 0.98;
          posAttr.setX(i, px * factor);
          posAttr.setY(i, py * factor);
          posAttr.setZ(i, pz * factor);
        }

        // Color update
        colAttr.setXYZ(i, currentColor.r, currentColor.g, currentColor.b);
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      // 4. Glow Logic
      glowLight.color.copy(currentColor);
      // Intensity: higher during voice + dynamic amplitude mapping
      const baseIntensity = isHighEnergy ? 2.5 : 1.2;
      glowLight.intensity = baseIntensity + (activeAmplitude * 6) + (Math.sin(now * 2) * 0.3);

      // 5. External Shadow Reactivity
      if (shadowRef.current) {
        shadowRef.current.style.backgroundColor = `rgba(${Math.floor(currentColor.r * 255)}, ${Math.floor(currentColor.g * 255)}, ${Math.floor(currentColor.b * 255)}, 0.15)`;
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [state, amplitude]);

  return (
    <div
      ref={containerRef}
      onClick={onTap}
      className="relative flex items-center justify-center cursor-pointer"
      style={{
        width: 200,
        height: 200,
        filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.25)) drop-shadow(0 0 24px rgba(147,51,234,0.15))',
      }}
    >
      {/* Dark contrast halo — separation from light bg */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.06)_0%,transparent_70%)] pointer-events-none" />
      {/* Soft atmospheric glow base - updated directly in raf for performance */}
      <div
        ref={shadowRef}
        className="absolute w-32 h-6 bottom-4 left-1/2 -translate-x-1/2 rounded-full blur-2xl pointer-events-none transition-colors duration-300"
      />
    </div>
  );
}
