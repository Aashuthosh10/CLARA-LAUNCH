import React, { useEffect, useRef } from 'react';

interface ClaraCoreCanvasProps {
  size?: number;
  mode?: 'idle' | 'thinking' | 'radiant' | 'listening' | 'connecting';
  intensity?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  baseRadius: number;
  angle: number;
  speed: number;
  distance: number;
  size: number;
  alpha: number;
  color: string;
  wobbleSpeed: number;
  wobblePhase: number;
}

export const ClaraCoreCanvas: React.FC<ClaraCoreCanvasProps> = ({
  size = 320,
  mode = 'idle',
  intensity = 1.0,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const colors = [
      'rgba(128, 102, 217, ', // Violet
      'rgba(185, 232, 255, ', // Icy Blue
      'rgba(216, 205, 247, ', // Lavender
      'rgba(241, 217, 250, ', // Soft Pink
      'rgba(114, 84, 199, ',  // Deep Violet
    ];

    // Initialize subtle floating particles around the orb
    const particleCount = mode === 'radiant' ? 48 : mode === 'thinking' ? 56 : 36;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const colorBase = colors[i % colors.length];
      const dist = (size * 0.18) + Math.random() * (size * 0.28);
      particles.push({
        x: 0,
        y: 0,
        baseRadius: dist,
        distance: dist,
        angle: Math.random() * Math.PI * 2,
        speed: (0.003 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1),
        size: 1.2 + Math.random() * 2.4,
        alpha: 0.2 + Math.random() * 0.6,
        color: colorBase,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - size / 2;
      const clientY = e.clientY - rect.top - size / 2;
      mouseRef.current.targetX = clientX * 0.08;
      mouseRef.current.targetY = clientY * 0.08;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      time += 0.018;

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2 + mouseRef.current.x;
      const centerY = size / 2 + mouseRef.current.y;
      const baseRadius = (size * 0.22) * intensity;

      // 1. Outermost soft atmospheric violet/lavender/blue halo
      const outerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.2,
        centerX,
        centerY,
        baseRadius * 2.4
      );
      outerGlow.addColorStop(0, 'rgba(216, 205, 247, 0.45)');
      outerGlow.addColorStop(0.35, 'rgba(185, 232, 255, 0.28)');
      outerGlow.addColorStop(0.65, 'rgba(241, 217, 250, 0.18)');
      outerGlow.addColorStop(1, 'rgba(250, 249, 255, 0)');

      ctx.save();
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Concentric breathing aura rings
      const ringCount = mode === 'thinking' ? 4 : mode === 'radiant' ? 3 : 2;
      for (let r = 0; r < ringCount; r++) {
        const ringTime = time * (0.8 + r * 0.2) + r * 1.5;
        const ringRadius = baseRadius * (1.15 + r * 0.35 + Math.sin(ringTime) * 0.08);
        const ringAlpha = (0.22 - r * 0.05) * (0.8 + Math.sin(ringTime * 1.2) * 0.2);

        ctx.save();
        ctx.strokeStyle = `rgba(128, 102, 217, ${ringAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6 + r * 4, 8 + r * 2]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Floating orbit particles with fluid trails
      particles.forEach((p) => {
        p.angle += p.speed * (mode === 'thinking' ? 2.0 : 1.0);
        const wobble = Math.sin(time * p.wobbleSpeed * 60 + p.wobblePhase) * 6;
        const currentDist = p.baseRadius + wobble;

        p.x = centerX + Math.cos(p.angle) * currentDist;
        p.y = centerY + Math.sin(p.angle) * (currentDist * 0.85);

        ctx.save();
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.shadowColor = 'rgba(128, 102, 217, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 4. Core glowing orb body (Layered volumetric gradients)
      const corePulse = Math.sin(time * 2.2) * 0.04;
      const coreRadius = baseRadius * (1 + corePulse);

      // Deep inner gradient
      const coreGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.3,
        centerY - coreRadius * 0.35,
        coreRadius * 0.1,
        centerX,
        centerY,
        coreRadius
      );
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.2, '#E7E0FA');
      coreGrad.addColorStop(0.5, '#C7B9F2');
      coreGrad.addColorStop(0.8, '#8066D9');
      coreGrad.addColorStop(1, '#49358F');

      ctx.save();
      ctx.shadowColor = 'rgba(128, 102, 217, 0.45)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Glassy surface refraction highlight (Upper crescent)
      const highlightGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.32,
        centerY - coreRadius * 0.38,
        coreRadius * 0.05,
        centerX - coreRadius * 0.25,
        centerY - coreRadius * 0.3,
        coreRadius * 0.55
      );
      highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      highlightGrad.addColorStop(0.4, 'rgba(221, 245, 255, 0.6)');
      highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.arc(centerX - coreRadius * 0.15, centerY - coreRadius * 0.18, coreRadius * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Icy blue rim light
      ctx.save();
      ctx.strokeStyle = 'rgba(185, 232, 255, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius - 1, Math.PI * 0.8, Math.PI * 1.6);
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [size, mode, intensity]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pointer-events-none"
      />
    </div>
  );
};
