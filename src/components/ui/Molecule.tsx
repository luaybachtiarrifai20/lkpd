import { useMemo } from 'react';

/**
 * Animated molecule / atom particle field for hero backgrounds.
 * Pure SVG + CSS — no external deps. Particles drift (Brownian-ish),
 * bonds rotate slowly, and atoms pulse subtly.
 */
export function MoleculeField({ className = '' }: { className?: string }) {
  // Stable random positions generated once
  const atoms = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        cx: 10 + Math.random() * 80,
        cy: 10 + Math.random() * 80,
        r: 3 + Math.random() * 5,
        dur: 5 + Math.random() * 6,
        delay: Math.random() * 4,
        color: i % 3 === 0 ? '#0D9488' : i % 3 === 1 ? '#0891B2' : '#F59E0B',
        opacity: 0.25 + Math.random() * 0.35,
      })),
    [],
  );

  const bonds = useMemo(() => {
    const arr: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      const b = atoms[(i + 1) % atoms.length];
      const dx = a.cx - b.cx;
      const dy = a.cy - b.cy;
      if (Math.sqrt(dx * dx + dy * dy) < 45) {
        arr.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, key: `${i}-${i + 1}` });
      }
    }
    return arr;
  }, [atoms]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        {/* Bonds */}
        <g stroke="#0D9488" strokeWidth="0.25" opacity="0.18">
          {bonds.map((b) => (
            <line key={b.key} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />
          ))}
        </g>
        {/* Atoms */}
        {atoms.map((a) => (
          <g key={a.id} style={{ transformOrigin: `${a.cx}% ${a.cy}%` }}>
            <circle
              cx={a.cx}
              cy={a.cy}
              r={a.r}
              fill={a.color}
              opacity={a.opacity}
              style={{
                animation: `float ${a.dur}s ease-in-out ${a.delay}s infinite`,
                transformOrigin: `${a.cx}px ${a.cy}px`,
              }}
            />
            <circle
              cx={a.cx}
              cy={a.cy}
              r={a.r * 1.8}
              fill="none"
              stroke={a.color}
              strokeWidth="0.2"
              opacity={a.opacity * 0.4}
              style={{
                animation: `moleculeSpin ${a.dur * 2}s linear ${a.delay}s infinite`,
                transformOrigin: `${a.cx}px ${a.cy}px`,
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * A central rotating molecule illustration for the hero.
 */
export function HeroMolecule({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 200 200" className="h-full w-full">
        {/* Outer glow */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="#0D9488" strokeWidth="0.5" opacity="0.15" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="#0891B2" strokeWidth="0.5" opacity="0.2" />

        {/* Rotating molecule structure */}
        <g style={{ transformOrigin: '100px 100px', animation: 'moleculeSpin 24s linear infinite' }}>
          {/* Bonds */}
          <line x1="100" y1="100" x2="100" y2="40" stroke="#0D9488" strokeWidth="2.5" />
          <line x1="100" y1="100" x2="155" y2="130" stroke="#0891B2" strokeWidth="2.5" />
          <line x1="100" y1="100" x2="45" y2="130" stroke="#F59E0B" strokeWidth="2.5" />
          <line x1="100" y1="100" x2="100" y2="155" stroke="#10B981" strokeWidth="2.5" />

          {/* Outer atoms */}
          <circle cx="100" cy="40" r="14" fill="#0D9488" opacity="0.9" />
          <circle cx="155" cy="130" r="12" fill="#0891B2" opacity="0.9" />
          <circle cx="45" cy="130" r="13" fill="#F59E0B" opacity="0.9" />
          <circle cx="100" cy="155" r="11" fill="#10B981" opacity="0.9" />

          {/* Atom highlights */}
          <circle cx="96" cy="36" r="4" fill="white" opacity="0.4" />
          <circle cx="151" cy="126" r="3.5" fill="white" opacity="0.4" />
          <circle cx="41" cy="126" r="4" fill="white" opacity="0.4" />
          <circle cx="96" cy="151" r="3.5" fill="white" opacity="0.4" />
        </g>

        {/* Central atom */}
        <g style={{ transformOrigin: '100px 100px', animation: 'pulseGlow 2.5s ease-in-out infinite' }}>
          <circle cx="100" cy="100" r="18" fill="#0D9488" />
          <circle cx="95" cy="95" r="5" fill="white" opacity="0.45" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Erlenmeyer flask loading animation.
 */
export function FlaskLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 80 100" className="h-24 w-24">
        {/* Flask outline */}
        <path
          d="M30 10 L30 38 L14 78 Q12 88 22 88 L58 88 Q68 88 66 78 L50 38 L50 10 Z"
          fill="none"
          stroke="#0D9488"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Liquid */}
        <clipPath id="flaskClip">
          <path d="M30 10 L30 38 L14 78 Q12 88 22 88 L58 88 Q68 88 66 78 L50 38 L50 10 Z" />
        </clipPath>
        <g clipPath="url(#flaskClip)">
          <rect
            x="10"
            y="100"
            width="60"
            height="60"
            fill="url(#liquidGrad)"
            style={{ animation: 'fillUp 1.6s ease-out infinite' }}
          />
        </g>
        <defs>
          <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0891B2" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
        </defs>
        {/* Bubbles */}
        <circle cx="35" cy="70" r="2" fill="white" opacity="0.6" style={{ animation: 'bubbleRise 2s ease-in 0.2s infinite' }} />
        <circle cx="45" cy="75" r="1.5" fill="white" opacity="0.5" style={{ animation: 'bubbleRise 2.4s ease-in 0.6s infinite' }} />
        <circle cx="40" cy="65" r="1.8" fill="white" opacity="0.5" style={{ animation: 'bubbleRise 1.8s ease-in 1s infinite' }} />
      </svg>
    </div>
  );
}

/**
 * Molecule-shaped confetti burst (for correct answers).
 * Renders a short burst of small molecule shapes that fade out.
 */
export function MoleculeConfetti({ trigger }: { trigger: number }) {
  const pieces = useMemo(
    () =>
      trigger
        ? Array.from({ length: 12 }, (_, i) => ({
            id: i,
            x: 50 + (Math.random() - 0.5) * 60,
            y: 50 + (Math.random() - 0.5) * 40,
            rot: Math.random() * 360,
            color: ['#0D9488', '#0891B2', '#F59E0B', '#10B981'][i % 4],
            delay: Math.random() * 0.3,
          }))
        : [],
    [trigger],
  );
  if (!trigger) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {pieces.map((p) => (
        <svg
          key={`${trigger}-${p.id}`}
          viewBox="0 0 20 20"
          className="absolute h-6 w-6"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `pop 0.6s ease ${p.delay}s both`,
            transform: `rotate(${p.rot}deg)`,
          }}
        >
          <line x1="10" y1="10" x2="4" y2="4" stroke={p.color} strokeWidth="1.5" />
          <line x1="10" y1="10" x2="16" y2="4" stroke={p.color} strokeWidth="1.5" />
          <line x1="10" y1="10" x2="10" y2="17" stroke={p.color} strokeWidth="1.5" />
          <circle cx="10" cy="10" r="3" fill={p.color} />
          <circle cx="4" cy="4" r="2" fill={p.color} opacity="0.7" />
          <circle cx="16" cy="4" r="2" fill={p.color} opacity="0.7" />
          <circle cx="10" cy="17" r="2" fill={p.color} opacity="0.7" />
        </svg>
      ))}
    </div>
  );
}
