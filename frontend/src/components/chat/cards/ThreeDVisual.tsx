import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDVisualProps {
  type: 'college' | 'dept' | 'hod' | 'trustees';
}

export default function ThreeDVisual({ type }: ThreeDVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Common lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x8B5CF6, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    let object: THREE.Object3D;

    switch (type) {
      case 'college':
        // A sophisticated torus knot for college
        object = new THREE.Mesh(
          new THREE.TorusKnotGeometry(1.5, 0.4, 200, 32),
          new THREE.MeshStandardMaterial({ color: 0xA5D8FF, roughness: 0.1, metalness: 0.5 })
        );
        break;
      case 'dept':
        // Modern octahedron for department
        object = new THREE.Mesh(
          new THREE.OctahedronGeometry(2),
          new THREE.MeshStandardMaterial({ color: 0xD8F5A2, wireframe: true })
        );
        break;
      case 'hod':
        // Dynamic sphere for HOD
        object = new THREE.Mesh(
          new THREE.IcosahedronGeometry(2, 2),
          new THREE.MeshStandardMaterial({ color: 0xFFD1DC, flatShading: true })
        );
        break;
      case 'trustees':
        // Floating cubes for Trustees
        const group = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.2, 1.2),
            new THREE.MeshStandardMaterial({ color: 0xE1D5E7, opacity: 0.8, transparent: true })
          );
          cube.position.x = (i - 1) * 2;
          group.add(cube);
        }
        object = group;
        break;
    }

    scene.add(object);
    camera.position.z = 5;

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      
      switch (type) {
        case 'college':
          object.rotation.x += 0.01;
          object.rotation.y += 0.01;
          break;
        case 'dept':
          object.rotation.y += 0.005;
          object.position.y = Math.sin(Date.now() * 0.001) * 0.2;
          break;
        case 'hod':
          object.rotation.y += 0.02;
          break;
        case 'trustees':
          object.children.forEach((c, i) => {
            c.rotation.x += 0.01 * (i + 1);
            c.position.y = Math.sin(Date.now() * 0.001 + i) * 0.3;
          });
          break;
      }
      
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [type]);

  return <div ref={containerRef} className="w-full h-full" />;
}
