import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HeroThreeBackgroundProps {
  className?: string;
}

export const HeroThreeBackground: React.FC<HeroThreeBackgroundProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    // Camera positioned to focus on the right hemisphere
    camera.position.set(4, -3, 30);
    camera.lookAt(4, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // =========================================================================
    // 1. TOPOLOGICAL QUANTUM WAVE MATRIX (Positioned at Base of Right Side)
    // =========================================================================
    const gridRows = 36;
    const gridCols = 40;
    const gridSpacingX = 1.1;
    const gridSpacingY = 1.0;

    const planeGeometry = new THREE.PlaneGeometry(
      gridCols * gridSpacingX,
      gridRows * gridSpacingY,
      gridCols - 1,
      gridRows - 1
    );

    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.12, // Very subtle, clean wireframe
      blending: THREE.AdditiveBlending,
    });

    const wavePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    wavePlane.rotation.x = -Math.PI / 2.5;
    wavePlane.position.set(6, -9, -4);
    scene.add(wavePlane);

    // Baseline coordinates for wave displacement
    const planePositions = planeGeometry.attributes.position;
    const initialPositions = new Float32Array(planePositions.count * 3);
    for (let i = 0; i < planePositions.count; i++) {
      initialPositions[i * 3] = planePositions.getX(i);
      initialPositions[i * 3 + 1] = planePositions.getY(i);
      initialPositions[i * 3 + 2] = planePositions.getZ(i);
    }

    // =========================================================================
    // 2. SUBTLE FLOATING QUANTUM HEXAGONAL LATTICE (Low Opacity ~0.04 - 0.05)
    // =========================================================================
    const hexGroup = new THREE.Group();
    hexGroup.position.set(4, 0, -2); // Centered behind the robotic head

    const createHexRing = (radius: number, color: number, opacity: number, segments: number) => {
      const geo = new THREE.RingGeometry(radius - 0.04, radius, segments);
      const mat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity, // Ultra-low opacity per user request
        blending: THREE.AdditiveBlending,
      });
      return new THREE.Mesh(geo, mat);
    };

    // Low-opacity refined hexagonal rings
    const hex1 = createHexRing(10, 0x7c3aed, 0.05, 6);
    const hex2 = createHexRing(14, 0xc084fc, 0.038, 6);
    const hex3 = createHexRing(18, 0xddd6fe, 0.025, 8);

    hex1.rotation.z = Math.PI / 6;
    hex2.rotation.z = -Math.PI / 12;
    hex3.rotation.z = Math.PI / 4;

    hexGroup.add(hex1, hex2, hex3);
    scene.add(hexGroup);

    // =========================================================================
    // 3. LOW-DENSITY PINPOINT STARLIGHT PARTICLES (No High Crossing Lines)
    // =========================================================================
    const starCount = 80;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const starPalette = [
      new THREE.Color('#7C3AED'),
      new THREE.Color('#C084FC'),
      new THREE.Color('#FFFFFF'),
    ];

    for (let i = 0; i < starCount; i++) {
      // Anchored strictly within the right hemisphere
      const x = Math.random() * 20 - 4 + 4;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 12;

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      const col = starPalette[Math.floor(Math.random() * starPalette.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.55,
      transparent: true,
      opacity: 0.3,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // --- MOUSE TRACKING ---
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = x * 2.0;
      mouseRef.current.targetY = y * 1.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // --- RESIZE OBSERVER ---
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // --- RENDER & ANIMATION LOOP ---
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.045;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.045;

      // 1. Gentle Undulating Wave Motion at the Bottom Right
      const posAttr = wavePlane.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const u = initialPositions[i * 3];
        const v = initialPositions[i * 3 + 1];

        const wave1 = Math.sin(u * 0.18 + elapsedTime * 1.0) * 0.9;
        const wave2 = Math.cos(v * 0.2 + elapsedTime * 0.8) * 0.7;
        const ripple = Math.sin(Math.sqrt(u * u + v * v) * 0.25 - elapsedTime * 1.2) * 0.5;

        posAttr.setZ(i, wave1 + wave2 + ripple);
      }
      posAttr.needsUpdate = true;

      // 2. Slow Geometric Rotation of Subtle Hexagons
      hex1.rotation.z += 0.0012;
      hex2.rotation.z -= 0.001;
      hex3.rotation.z += 0.0007;

      hexGroup.rotation.y = mouseRef.current.x * 0.06;
      hexGroup.rotation.x = mouseRef.current.y * 0.04;

      // 3. Starlight Gentle Drift
      starField.rotation.y = elapsedTime * 0.015;

      // 4. Parallax Camera
      camera.position.x = 4 + mouseRef.current.x * 0.8;
      camera.position.y = -3 + mouseRef.current.y * 0.6;
      camera.lookAt(4, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      planeGeometry.dispose();
      planeMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      hex1.geometry.dispose();
      hex1.material.dispose();
      hex2.geometry.dispose();
      hex2.material.dispose();
      hex3.geometry.dispose();
      hex3.material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={`absolute top-0 right-0 w-full lg:w-3/5 h-full pointer-events-none overflow-hidden ${className}`}
      style={{
        zIndex: 1,
        maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 12%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 12%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 100%)',
      }}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Feathered White Vignette Overlays for Zero Hard Border Lines */}
      <div className="absolute top-0 left-0 w-36 sm:w-56 h-full bg-gradient-to-r from-white via-white/70 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-b from-white via-white/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-24 bg-gradient-to-t from-white via-white/60 to-transparent pointer-events-none" />
    </div>
  );
};
