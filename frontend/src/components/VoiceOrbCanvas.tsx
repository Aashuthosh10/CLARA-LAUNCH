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
      new THREE.Color(0x1e293b), // slate-800
      new THREE.Color(0x334155), // slate-700
      new THREE.Color(0x475569), // slate-600
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

      // 1. Color State Management
      const readyColor = new THREE.Color(0x22d3ee); // light cyan glow
      const idleColor = new THREE.Color(0x94a3b8); // soft grey-blue
      let activeAmplitude = amplitude > 0.01 ? amplitude : 0;
      
      // Simulate subtle rhythm if speaking but no true volume yet
      if (state === 'speaking' && activeAmplitude < 0.1) {
         activeAmplitude = Math.max(0, 0.1 + Math.sin(now * 8) * 0.1 + Math.sin(now * 15) * 0.05);
      }

      if (state === 'idle') {
        targetColor.copy(idleColor);
      } else if (state === 'ready') {
        targetColor.copy(readyColor);
      } else if (state === 'listening') {
        if (activeAmplitude < 0.05) {
            targetColor.copy(idleColor); // fallback calm state when noisy mic is silent
        } else {
            // Dynamic map based on audio volume level
            const lowColor = new THREE.Color(0x93c5fd); // soft light blue
            const midColor = new THREE.Color(0x3b82f6); // richer blue
            const highColor = new THREE.Color(0x06b6d4); // electric bright cyan
            
            const normalizedVol = Math.min(1, (activeAmplitude - 0.05) / 0.95);
            if (normalizedVol < 0.5) {
                targetColor.lerpColors(lowColor, midColor, normalizedVol * 2);
            } else {
                targetColor.lerpColors(midColor, highColor, (normalizedVol - 0.5) * 2);
            }
        }
      } else if (state === 'processing') {
        targetColor.setHex(0x8b5cf6); // violet/indigo
      } else if (state === 'speaking') {
        targetColor.setHex(0x3b82f6); // balanced blue
      }

      // Smooth color lerp
      const isHighEnergy = state === 'listening' || state === 'speaking' || state === 'ready';
      currentColor.lerp(targetColor, isHighEnergy ? 0.2 : 0.05);

      // 2. Breathing and Reactive Scale
      let breatheSpeed = 1.0;
      let breatheAmount = 0.02;
      let targetScale = 1.0;
      let scaleBoost = 0;
      
      if (state === 'idle') {
        breatheSpeed = 0.5;
        breatheAmount = 0.02;
      } else if (state === 'ready') {
        breatheSpeed = 1.5;
        breatheAmount = 0.04;
      } else if (state === 'listening') {
        if (activeAmplitude < 0.05) {
             breatheSpeed = 1.0;
             breatheAmount = 0.02; // calm pulse
        } else {
             breatheSpeed = 2.0; 
             breatheAmount = 0.01;
             scaleBoost = activeAmplitude * 0.1; // Scale 1.0 -> 1.1 based on volume
        }
      } else if (state === 'processing') {
        breatheSpeed = 1.0;
        breatheAmount = 0.02;
        targetScale = 0.95;
      } else if (state === 'speaking') {
        breatheSpeed = 2.5;
        breatheAmount = 0.05;
        targetScale = 1.0;
      }
      
      const pulse = targetScale + Math.sin(now * breatheSpeed) * breatheAmount;
      const finalScale = pulse + scaleBoost;

      particles.scale.set(finalScale, finalScale, finalScale);

      // 3. Particle Motion
      const posAttr = geometry.attributes.position;
      const colAttr = geometry.attributes.color;

      let speedMult = 1.0;
      let vibration = 0;
      if (state === 'listening') {
         if (activeAmplitude < 0.05) {
             speedMult = 1.0; // calm motion
             vibration = 0;
         } else {
             speedMult = 1.5 + activeAmplitude * 6; // high spread
             vibration = activeAmplitude * 0.02;
         }
      } else if (state === 'speaking') {
        speedMult = 1.5 + activeAmplitude * 4;
        vibration = activeAmplitude * 0.01;
      } else if (state === 'ready') {
        speedMult = 1.2;
      } else if (state === 'processing') {
        speedMult = 0.5;
      } else {
        speedMult = 0.8; // idle
      }

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
      
      let baseIntensity = 1.0;
      if (state === 'ready') {
          baseIntensity = 1.5;
      } else if (state === 'listening') {
          if (activeAmplitude < 0.05) baseIntensity = 1.5;
          else baseIntensity = 1.5 + activeAmplitude * 3; // grow with volume
      } else if (state === 'speaking') {
          baseIntensity = 2.0;
      } else if (state === 'processing') {
          baseIntensity = 1.2;
      } else {
          baseIntensity = 0.8; // idle
      }
      
      // Dynamic addition
      let pulseMod = (state === 'speaking' || state === 'ready') ? Math.sin(now * 2) * 0.2 : 0;
      glowLight.intensity = baseIntensity + pulseMod;

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
