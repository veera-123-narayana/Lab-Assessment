import React, { useEffect, useRef } from 'react';

// Global helper to trigger the 3D particle warp acceleration effect across components
export function triggerParticleWarp(durationMs = 260) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apogee:warp', { detail: { duration: durationMs } }));
  }
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseRadius: number;
  color: string;
  baseAlpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  angle: number;
  distFromCenter: number;
  rotSpeed: number;
  isVortex: boolean;
}

interface RippleRing {
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  color: string;
}

interface ParticleFieldProps {
  density?: 'subtle' | 'medium' | 'dense';
  speed?: 'slow' | 'normal';
  color?: 'blue' | 'cyan' | 'mixed';
  className?: string;
  showFloorRipples?: boolean;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  density = 'medium',
  speed = 'slow',
  color = 'mixed',
  className = '',
  showFloorRipples = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const isMobile = width < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Warp acceleration state
    let isWarping = false;
    let warpEndTime = 0;
    let warpFactor = 1.0;

    const onWarpEvent = (e: Event) => {
      if (prefersReducedMotion) return;
      const customEvent = e as CustomEvent<{ duration?: number }>;
      const duration = customEvent.detail?.duration || 260;
      isWarping = true;
      warpEndTime = performance.now() + duration;
    };
    window.addEventListener('apogee:warp', onWarpEvent);

    // Color palette based on Master Prompt & reference video
    const palette =
      color === 'blue'
        ? ['#087EFF', '#21A7FF', '#031225', '#5DE8FF']
        : color === 'cyan'
        ? ['#5DE8FF', '#21A7FF', '#FFFFFF', '#087EFF']
        : ['#5DE8FF', '#21A7FF', '#087EFF', '#FFFFFF', '#8CEBFF'];

    // Particle count
    let count = density === 'subtle' ? 70 : density === 'dense' ? 220 : 150;
    if (isMobile) count = Math.floor(count * 0.45);

    const fov = 450;
    const particles: Particle3D[] = [];

    // Create 3D particles: ~40% form the swirling central vortex (like the Anchor AI reference video), ~60% spatial ambient field
    for (let i = 0; i < count; i++) {
      const isVortex = i < Math.floor(count * 0.45);
      const distFromCenter = isVortex ? Math.random() * (width * 0.28) + 20 : Math.random() * width * 0.6 + 50;
      const angle = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 800;

      particles.push({
        x: Math.cos(angle) * distFromCenter,
        y: isVortex ? (Math.random() - 0.3) * height * 0.7 : (Math.random() - 0.5) * height * 1.2,
        z,
        vx: (Math.random() - 0.5) * 0.4,
        vy: isVortex ? -(Math.random() * 0.6 + 0.3) : (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.5,
        baseRadius: Math.random() * 1.8 + 0.7,
        color: palette[Math.floor(Math.random() * palette.length)],
        baseAlpha: Math.random() * 0.5 + 0.2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.006,
        angle,
        distFromCenter,
        rotSpeed: (Math.random() * 0.008 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        isVortex,
      });
    }

    // Floor Ripple Rings (Matching concentric ground waves in the reference video!)
    const rippleRings: RippleRing[] = [
      { radius: 60, maxRadius: Math.min(width, 700) * 0.75, speed: 0.65, alpha: 0.28, color: '#21A7FF' },
      { radius: 180, maxRadius: Math.min(width, 700) * 0.75, speed: 0.65, alpha: 0.2, color: '#5DE8FF' },
      { radius: 300, maxRadius: Math.min(width, 700) * 0.75, speed: 0.65, alpha: 0.15, color: '#087EFF' },
      { radius: 420, maxRadius: Math.min(width, 700) * 0.75, speed: 0.65, alpha: 0.08, color: '#21A7FF' },
    ];

    let time = 0;

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      time += 1;

      // Handle warp smoothing
      if (isWarping) {
        if (now < warpEndTime) {
          warpFactor += (4.5 - warpFactor) * 0.15;
        } else {
          warpFactor += (1.0 - warpFactor) * 0.1;
          if (warpFactor < 1.05) {
            warpFactor = 1.0;
            isWarping = false;
          }
        }
      }

      const cx = width / 2;
      const cy = height / 2;
      const floorY = height * 0.82; // Ground level for concentric ripple rings

      // 1. Draw 3D floor ripple rings (Reference Video: glowing blue rings expanding on the floor plane)
      if (showFloorRipples && !prefersReducedMotion) {
        ctx.save();
        for (const ring of rippleRings) {
          ring.radius += ring.speed * (isWarping ? 2.5 : 1.0);
          if (ring.radius > ring.maxRadius) {
            ring.radius = 30;
          }

          const progress = ring.radius / ring.maxRadius;
          const currentAlpha = ring.alpha * (1 - progress);
          const rx = ring.radius;
          const ry = ring.radius * 0.28; // 3D perspective foreshortening

          ctx.beginPath();
          ctx.ellipse(cx, floorY, rx, ry, 0, 0, Math.PI * 2);
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = Math.max(0, currentAlpha);
          ctx.shadowBlur = 12;
          ctx.shadowColor = ring.color;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Camera floating movement
      const camX = prefersReducedMotion ? 0 : Math.sin(time * 0.001) * 16;
      const camY = prefersReducedMotion ? 0 : Math.cos(time * 0.0008) * 12;

      // Sort particles by Z so far particles draw first (proper 3D painter's algorithm)
      particles.sort((a, b) => b.z - a.z);

      // 3. Render 3D particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          // Update particle position
          if (p.isVortex) {
            p.angle += p.rotSpeed * (isWarping ? 2.2 : 1.0);
            p.x = Math.cos(p.angle) * p.distFromCenter;
            p.z = Math.sin(p.angle) * (p.distFromCenter * 0.65);
            p.y += p.vy * (isWarping ? 3.0 : 1.0);

            // Reset vortex particles when rising out of bounds
            if (p.y < -height * 0.4) {
              p.y = height * 0.45;
            }
          } else {
            p.x += p.vx * warpFactor;
            p.y += p.vy * warpFactor;
            p.z += (p.vz - (isWarping ? 8.0 : 0)) * warpFactor;

            // Boundary wrap
            if (p.z < -400) p.z = 400;
            if (p.z > 400) p.z = -400;
            if (p.x < -width * 0.6) p.x = width * 0.6;
            if (p.x > width * 0.6) p.x = -width * 0.6;
            if (p.y < -height * 0.6) p.y = height * 0.6;
            if (p.y > height * 0.6) p.y = -height * 0.6;
          }
        }

        p.pulsePhase += p.pulseSpeed;

        // 3D Perspective Projection
        const adjustedZ = p.z + 400; // Shift range to 0..800
        const scale = fov / Math.max(80, fov + adjustedZ);
        const screenX = cx + (p.x - camX) * scale;
        const screenY = cy + (p.y - camY) * scale;
        const radius = Math.max(0.4, p.baseRadius * scale);

        // Alpha calculation based on depth and pulsing
        const depthAlpha = Math.min(1, Math.max(0.12, scale * 1.1));
        const pulse = 1 + Math.sin(p.pulsePhase) * 0.25;
        const finalAlpha = Math.min(1, Math.max(0.08, p.baseAlpha * depthAlpha * pulse));

        if (screenX >= -20 && screenX <= width + 20 && screenY >= -20 && screenY <= height + 20) {
          ctx.beginPath();

          // During warp, draw speed streaks along the Z trajectory
          if (isWarping && warpFactor > 1.8) {
            const streakLen = (warpFactor - 1.0) * 12 * scale;
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX, screenY - streakLen);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = radius * 1.2;
            ctx.globalAlpha = Math.min(1, finalAlpha * 1.3);
            ctx.stroke();
          } else {
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = finalAlpha;
            if (scale > 0.8) {
              ctx.shadowBlur = radius * 4;
              ctx.shadowColor = p.color;
            } else {
              ctx.shadowBlur = 0;
            }
            ctx.fill();
          }
        }
      }

      // Reset shadows & global alpha
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('apogee:warp', onWarpEvent);
      cancelAnimationFrame(animationFrameId);
    };
  }, [density, speed, color, showFloorRipples]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
};

export default ParticleField;
