import React from 'react';
import { motion } from 'motion/react';

// §Island map v3 (2026-11) — wide horizontal archipelago that fills the whole panel:
// units are islands in a serpentine trail (left→right, then back) across the frame,
// with a custom vibrant tropical ocean storybook illustration as the sea backdrop.
// Flicker fix: the sea route now uses a mathematically seamless CSS stroke-dashoffset loop
// (dash period 18px, offset moves exactly -180px) and separates entry animations so Framer Motion
// never collides with or overrides the running SVG stroke styles.

export interface RoadmapUnit {
  unitNumber: number;
  topicName?: string;
  topicIcon?: string;
  isCompleted: boolean;
  accessible: boolean;
}

interface JourneyRoadmapProps {
  units: RoadmapUnit[];
  onNodeClick: (index: number) => void;
}

const W = 1000;
const COLS = 3;
const XS = [170, 500, 830];
const ROW_H = 172;
const TOP = 108;

function nodePos(i: number) {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  // Serpentine: even rows run left→right, odd rows run right→left.
  return { x: row % 2 === 0 ? XS[col] : XS[COLS - 1 - col], y: TOP + row * ROW_H };
}

// Catmull-Rom -> cubic bezier, so the sea route flows through every island.
function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// Deterministic scatter for sea decorations so waves/fish never sit on top of islands.
const isNearRoute = (p: { x: number; y: number }, points: { x: number; y: number }[]) =>
  points.some(q => Math.abs(q.x - p.x) < 130 && Math.abs(q.y - p.y) < 80);

const Island = ({ unit, x, y, isCurrent, onClick }: {
  unit: RoadmapUnit; x: number; y: number; isCurrent: boolean; onClick: () => void;
}) => {
  const isLocked = !unit.accessible;
  const ring = isLocked ? '#9db4c0' : unit.isCompleted ? '#34d399' : '#0ea5e9';
  const face = isLocked ? '#eef2f5' : unit.isCompleted ? '#ecfdf5' : '#f0f9ff';
  const sandFill = isLocked ? '#e2e8f0' : '#fbe1a5';
  const grassFill = isLocked ? '#c3d1d9' : unit.isCompleted ? '#4ade80' : '#6ee7b7';
  const clip = `island-clip-${unit.unitNumber ?? x}`;

  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} style={{ cursor: 'pointer' }}
      role="button" aria-label={`Unit ${unit.unitNumber}: ${unit.topicName || ''}`}>
      {/* Wet sand shadow on the water */}
      <ellipse cy={18} rx={46} ry={13} fill="#1e4e6f" opacity={0.32} />
      {/* Soft breathing glow — transform-based, no flicker, only on the current island */}
      {isCurrent && !isLocked && (
        <motion.ellipse
          cy={6} rx={60} ry={24} fill="#7dd3fc"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          animate={{ scale: [1, 1.09, 1], opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Sand base */}
      <ellipse cy={6} rx={43} ry={15.5} fill={sandFill} stroke={isLocked ? '#cbd5e1' : '#eecf8d'} strokeWidth={2} />
      <clipPath id={clip}><ellipse cy={6} rx={43} ry={15.5} /></clipPath>
      {!isLocked && (
        <g clipPath={`url(#${clip})`} opacity={0.5}>
          <circle cx={-30} cy={12} r={1.7} fill="#fff" />
          <circle cx={27} cy={14} r={1.5} fill="#fff" />
          <circle cx={-8} cy={16} r={1.3} fill="#f8d488" />
        </g>
      )}
      {/* Grass top */}
      <ellipse cy={-4} rx={31} ry={11.5} fill={grassFill} />
      <ellipse cy={-7} rx={20} ry={7} fill={isLocked ? '#d5e0e6' : '#a7f3d0'} opacity={0.85} />
      {/* Palm tree leaning over the beach */}
      <text x={-27} y={-9} fontSize={16} aria-hidden transform="rotate(-14 -27 -9)">🌴</text>
      {!isLocked && <text x={30} y={-3} fontSize={10} aria-hidden>🌺</text>}
      {isLocked && <ellipse cy={-16} rx={37} ry={13} fill="#dbe6ec" opacity={0.55} aria-hidden />}

      {/* Unit medallion */}
      <circle cy={-31} r={20} fill={ring} opacity={0.3} />
      <circle cy={-31} r={17} fill={face} stroke={ring} strokeWidth={3.5} />
      <text y={-25} textAnchor="middle" fontSize={17} aria-hidden>
        {isLocked ? '🔒' : unit.isCompleted ? '⭐' : unit.topicIcon || '🐾'}
      </text>
      {/* Koko mascot visiting the current island — 100% vector, guaranteed sparkling eyes */}
      {isCurrent && !isLocked && (
        <g transform="translate(12, -42) scale(0.22)" className="map-koko-bob" aria-label="Koko ở đây">
          {/* Bear Left Ear */}
          <circle cx="42" cy="46" r="22" fill="#D97706" />
          <circle cx="42" cy="46" r="13" fill="#FDE68A" />
          {/* Bear Right Ear */}
          <circle cx="118" cy="46" r="22" fill="#D97706" />
          <circle cx="118" cy="46" r="13" fill="#FDE68A" />
          {/* Bear Head */}
          <rect x="28" y="38" width="104" height="92" rx="46" fill="#F59E0B" stroke="#D97706" strokeWidth="3" />
          {/* Cheerful Rosy Cheeks */}
          <ellipse cx="44" cy="94" rx="9" ry="6" fill="#F472B6" fillOpacity="0.85" />
          <ellipse cx="116" cy="94" rx="9" ry="6" fill="#F472B6" fillOpacity="0.85" />
          {/* Snout */}
          <ellipse cx="80" cy="95" rx="26" ry="20" fill="#FFFBEB" />
          {/* Nose */}
          <ellipse cx="80" cy="88" rx="8" ry="6" fill="#78350F" />
          <ellipse cx="78" cy="86" rx="2.5" ry="1.5" fill="#FFFFFF" fillOpacity="0.85" />
          {/* Cheerful Mouth */}
          <path d="M 72 97 Q 80 106 88 97" stroke="#78350F" strokeWidth="4" strokeLinecap="round" fill="none" />
          {/* Big Expressive Sparkling Eyes */}
          <circle cx="56" cy="71" r="8" fill="#291809" stroke="#451A03" strokeWidth="1" />
          <circle cx="59" cy="68" r="3.2" fill="#FFFFFF" />
          <circle cx="53.5" cy="73.5" r="1.3" fill="#FFFFFF" />
          <circle cx="104" cy="71" r="8" fill="#291809" stroke="#451A03" strokeWidth="1" />
          <circle cx="107" cy="68" r="3.2" fill="#FFFFFF" />
          <circle cx="101.5" cy="73.5" r="1.3" fill="#FFFFFF" />
        </g>
      )}
      {/* Finish flag on conquered islands */}
      {unit.isCompleted && (
        <text x={24} y={-13} fontSize={14} aria-hidden>🚩</text>
      )}
      {/* Name plate */}
      <text y={45} textAnchor="middle" fontSize={14} fontWeight={900} fill={isLocked ? '#64748b' : '#0369a1'}>
        U{unit.unitNumber}
      </text>
      {unit.topicName && (
        <text y={59} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={isLocked ? '#94a3b8' : '#0284c7'}>
          {unit.topicName.length > 16 ? `${unit.topicName.slice(0, 15)}…` : unit.topicName}
        </text>
      )}
    </g>
  );
};

export const JourneyRoadmap: React.FC<JourneyRoadmapProps> = ({ units, onNodeClick }) => {
  const points = units.map((_, i) => nodePos(i));
  const pathD = smoothPath(points);
  const rows = Math.max(1, Math.ceil(units.length / COLS));
  const height = TOP + (rows - 1) * ROW_H + 120;
  const currentIndex = units.findIndex(u => u.accessible && !u.isCompleted);
  const boat = points.length > 1
    ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 + 26 }
    : null;
  const waves = Array.from({ length: 16 }, (_, k) => ({
    x: 55 + ((k * 271) % (W - 110)), y: 50 + ((k * 233) % (height - 100))
  })).filter(p => !isNearRoute(p, points));
  const fish = Array.from({ length: 6 }, (_, k) => ({
    x: 90 + ((k * 389 + 120) % (W - 180)), y: 80 + ((k * 311 + 60) % (height - 160))
  })).filter(p => !isNearRoute(p, points));

  return (
    <div className="relative rounded-[32px] border-4 border-sky-300 shadow-md overflow-hidden bg-sky-200">
      {/* Dedicated tropical ocean archipelago background artwork */}
      <img
        src="/images/scenes/island-map-backdrop-v1.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      />
      {/* Delicate translucent tint so the illustration shines while keeping island nodes crystal-clear */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-sky-200/40 via-cyan-100/20 to-sky-900/40 select-none pointer-events-none"
        aria-hidden
      />

      {/* Sky decorations */}
      <div className="absolute top-3 left-10 text-3xl opacity-85 pointer-events-none animate-float-slow" aria-hidden>☁️</div>
      <div className="absolute top-6 right-24 text-2xl opacity-75 pointer-events-none animate-float-slow [animation-delay:1.4s]" aria-hidden>☁️</div>
      <div className="absolute top-2 right-8 text-3xl opacity-90 pointer-events-none" aria-hidden>🌞</div>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full block relative z-10"
        role="group"
        aria-label="Bản đồ quần đảo hành trình học tập"
      >
        {/* Sparkles on the water */}
        <g fill="#ffffff">
          {waves.slice(0, 6).map((p, k) => <circle key={`s${k}`} cx={p.x + 30} cy={p.y + 14} r={2.2} opacity={0.6} />)}
        </g>
        {/* Little waves */}
        <g stroke="#ffffff" strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.6}>
          {waves.map((p, k) => (
            <path key={`w${k}`} d={`M ${p.x - 13} ${p.y} q 6.5 -6.5 13 0 q 6.5 6.5 13 0`} />
          ))}
        </g>
        {/* Friendly fish */}
        <g>
          {fish.map((p, k) => (
            <text key={`f${k}`} x={p.x} y={p.y} fontSize={14} opacity={0.75} aria-hidden
              transform={k % 2 ? `rotate(180 ${p.x} ${p.y})` : undefined}>🐠</text>
          ))}
        </g>

        {/* Sea route: glowing wake + smoothly marching foam dots (flicker-free) */}
        <g className="sea-route-wake">
          {/* Layer 1: Wide ocean wake glow */}
          <path
            d={pathD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={14}
            strokeLinecap="round"
            opacity={0.35}
          />
          {/* Layer 2: Core translucent white wake */}
          <path
            d={pathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.5}
          />
          {/* Layer 3: Marching sea foam dots (seamless mathematical loop, zero flicker) */}
          <path
            d={pathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeDasharray="0 18"
            className="road-dots"
            opacity={0.95}
          />
        </g>

        {/* Sailboat cruising between the first islands */}
        {boat && (
          <motion.text
            x={boat.x} y={boat.y} fontSize={22} textAnchor="middle" aria-hidden
            animate={{ y: [0, -4, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >⛵</motion.text>
        )}

        {units.map((unit, i) => {
          const { x, y } = nodePos(i);
          const isCurrent = i === currentIndex;
          return (
            <motion.g
              key={unit.unitNumber ?? i}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.12 + i * 0.08 }}
            >
              <Island unit={unit} x={x} y={y} isCurrent={isCurrent} onClick={() => onNodeClick(i)} />
            </motion.g>
          );
        })}

        {/* Treasure hint at the far end of the archipelago */}
        <text x={W - 60} y={height - 26} fontSize={20} opacity={0.8} aria-hidden>🏆</text>
      </svg>

      <p className="text-center text-[11px] sm:text-xs font-black text-sky-950 pb-3 relative z-10 drop-shadow-xs">
        Chạm vào một hòn đảo để mở bài học tương ứng 🏝️⛵
      </p>
    </div>
  );
};
