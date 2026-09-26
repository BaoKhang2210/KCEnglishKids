import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Sparkles, Star } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { sfx } from '../../../utils/audio';

interface StarCatcherEngineProps {
  question: ActivityQuestion;
  selectedOptionId?: string | null;
  feedbackState?: 'idle' | 'correct' | 'wrong';
  onSelectOption: (option: ActivityOption) => void;
  onPlayPrompt: () => void;
}

interface FallingStar {
  id: string;
  option: ActivityOption;
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

const STAR_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'];

export const StarCatcherEngine: React.FC<StarCatcherEngineProps> = ({
  question,
  onSelectOption,
  onPlayPrompt
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [basketX, setBasketX] = useState(250);
  const [hasWon, setHasWon] = useState(false);

  // References for animation loop
  const fallingStarsRef = useRef<FallingStar[]>([]);
  const particlesRef = useRef<SparkleParticle[]>([]);
  const basketXRef = useRef(250);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Initialize falling stars for each option
  useEffect(() => {
    setHasWon(false);
    particlesRef.current = [];

    const options = question.options || [];
    const width = 600; // logical canvas width
    const slotWidth = width / Math.max(1, options.length);

    fallingStarsRef.current = options.map((opt, i) => {
      return {
        id: opt.id,
        option: opt,
        x: slotWidth * i + slotWidth / 2 + (Math.random() * 40 - 20),
        y: -40 - Math.random() * 120,
        speed: 1.2 + Math.random() * 0.8,
        size: 44,
        color: STAR_COLORS[i % STAR_COLORS.length],
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.02
      };
    });
  }, [question]);

  // Sync basket position ref
  useEffect(() => {
    basketXRef.current = basketX;
  }, [basketX]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const spawnSparkles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 5;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color,
          alpha: 1,
          size: 4 + Math.random() * 5
        });
      }
    };

    const render = (time: number) => {
      if (!isRunning) return;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const cw = canvas.width;
      const ch = canvas.height;

      ctx.clearRect(0, 0, cw, ch);

      // 1. Draw Starry Night Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(0.5, '#1E1B4B');
      bgGrad.addColorStop(1, '#312E81');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Background gentle twinking stars
      for (let i = 0; i < 20; i++) {
        const sx = (i * 137.5) % cw;
        const sy = (i * 269.3) % (ch * 0.7);
        const sa = 0.3 + 0.3 * Math.sin(time * 0.003 + i);
        ctx.fillStyle = `rgba(255, 255, 255, ${sa})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Update and Draw Falling Stars
      const basketY = ch - 65;
      const basketWidth = 90;
      const bx = basketXRef.current;

      fallingStarsRef.current.forEach((star) => {
        if (!hasWon) {
          star.y += star.speed * (dt * 60);
          star.wobble += star.wobbleSpeed;
          star.rotation += star.rotationSpeed;

          // If reached bottom without catching, loop back up
          if (star.y > ch + 40) {
            star.y = -50 - Math.random() * 50;
            star.x = 60 + Math.random() * (cw - 120);
          }

          // Check collision with basket
          const starX = star.x + Math.sin(star.wobble) * 15;
          const distToBasket = Math.hypot(starX - bx, star.y - basketY);

          if (distToBasket < basketWidth / 2 + star.size / 2 && star.y > basketY - 30) {
            // Star caught by basket!
            spawnSparkles(starX, star.y, star.color);

            if (star.option.isCorrect) {
              setHasWon(true);
              sfx.playCorrect();
              onSelectOption(star.option);
            } else {
              sfx.playGentleWrong();
              // Bounce away
              star.y = -60;
              star.x = 60 + Math.random() * (cw - 120);
            }
          }
        }

        // Draw the Star
        const renderX = star.x + Math.sin(star.wobble) * 15;
        const renderY = star.y;

        ctx.save();
        ctx.translate(renderX, renderY);
        ctx.rotate(star.rotation);

        // Glow ring
        ctx.shadowColor = star.color;
        ctx.shadowBlur = 15;

        // Star 5 points path
        ctx.fillStyle = star.color;
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const outerAngle = (p * Math.PI * 2) / 5 - Math.PI / 2;
          const innerAngle = outerAngle + Math.PI / 5;
          const rOuter = star.size / 2;
          const rInner = star.size / 4;
          if (p === 0) {
            ctx.moveTo(Math.cos(outerAngle) * rOuter, Math.sin(outerAngle) * rOuter);
          } else {
            ctx.lineTo(Math.cos(outerAngle) * rOuter, Math.sin(outerAngle) * rOuter);
          }
          ctx.lineTo(Math.cos(innerAngle) * rInner, Math.sin(innerAngle) * rInner);
        }
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Label on Star (Option Text)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px "Baloo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelText = star.option.text || star.option.id;
        ctx.fillText(labelText.length > 8 ? labelText.slice(0, 7) + '…' : labelText, 0, 0);

        ctx.restore();
      });

      // 3. Update & Draw Sparkle Particles
      for (let pIdx = particlesRef.current.length - 1; pIdx >= 0; pIdx--) {
        const p = particlesRef.current[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.alpha -= 0.02;

        if (p.alpha <= 0) {
          particlesRef.current.splice(pIdx, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 4. Draw Catcher Basket / Koko Cloud at Bottom
      ctx.save();
      ctx.translate(bx, basketY);

      // Cloud basket base
      const basketGrad = ctx.createLinearGradient(-45, 0, 45, 0);
      basketGrad.addColorStop(0, '#F59E0B');
      basketGrad.addColorStop(0.5, '#FDE047');
      basketGrad.addColorStop(1, '#F59E0B');
      ctx.fillStyle = basketGrad;
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 20;

      // Draw Basket Body
      ctx.beginPath();
      ctx.roundRect(-45, -20, 90, 45, 18);
      ctx.fill();

      // Cute Mascot Eyes & Smile inside Basket
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.arc(-15, -4, 4, 0, Math.PI * 2);
      ctx.arc(15, -4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Cheeks
      ctx.fillStyle = '#F87171';
      ctx.beginPath();
      ctx.arc(-24, 4, 5, 0, Math.PI * 2);
      ctx.arc(24, 4, 5, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [hasWon, onSelectOption]);

  // Touch and Mouse Controls for Basket
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const clientX = e.clientX - rect.left;
    const newX = Math.max(50, Math.min(canvas.width - 50, clientX * scaleX));
    setBasketX(newX);
  };

  // Direct Click on Star option
  const handleOptionDirectClick = (opt: ActivityOption) => {
    sfx.playPop();
    setBasketX(
      fallingStarsRef.current.find(s => s.id === opt.id)?.x || 300
    );
    if (opt.isCorrect) {
      setHasWon(true);
      sfx.playCorrect();
      onSelectOption(opt);
    } else {
      sfx.playGentleWrong();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 select-none">
      {/* Prompt Banner */}
      <div className="w-full text-center mb-4">
        <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-6 py-2 rounded-full text-sm sm:text-base mb-3 shadow-md">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          Game HTML5 Động: Hứng Ngôi Sao Từ Vựng 🚀
        </span>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPlayPrompt}
            className="w-14 h-14 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer border-3 border-amber-300"
            title="Bấm để nghe cô phát âm từ cần hứng"
          >
            <Volume2 className="w-7 h-7" />
          </button>
          <div className="bg-white/95 px-6 py-3 rounded-2xl border-3 border-indigo-300 shadow-md">
            <span className="text-xs font-black uppercase text-indigo-600 block">Từ cần hứng vào giỏ:</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-800 font-display">
              "{question.promptText}"
            </span>
          </div>
        </div>
      </div>

      {/* HTML5 Canvas Game Screen */}
      <div className="relative w-full max-w-[620px] aspect-[4/3] rounded-3xl overflow-hidden border-4 border-indigo-400 shadow-2xl bg-slate-900 touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={450}
          className="w-full h-full cursor-ew-resize"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
        />

        {/* Floating Controls Overlay */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none text-white text-xs font-black">
          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            Di chuyển ngón tay hoặc chuột để hứng sao ⭐
          </span>
        </div>

        {/* Win Fanfare Overlay */}
        {hasWon && (
          <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-pop-in">
            <div className="w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center text-4xl mb-3 shadow-xl animate-bounce">
              🏆
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Bé hứng đúng ngôi sao rồi! 🎉
            </h3>
            <p className="text-amber-200 text-sm font-bold max-w-xs mb-4">
              Koko rất tự hào về bé! Bé vừa ghi thêm sao vàng lấp lánh!
            </p>
          </div>
        )}
      </div>

      {/* Alternative Quick Touch Buttons under canvas for smaller devices */}
      <div className="w-full max-w-[620px] mt-4">
        <p className="text-xs font-black text-slate-500 text-center mb-2">
          Hoặc bé có thể bấm trực tiếp vào ngôi sao bên dưới:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleOptionDirectClick(opt)}
              className="py-3 px-4 rounded-2xl bg-white hover:bg-amber-50 active:bg-amber-100 border-3 border-indigo-200 hover:border-indigo-400 text-slate-800 font-black text-sm sm:text-base shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>⭐</span>
              <span className="truncate">{opt.text || opt.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
