import { useCallback, useEffect, useState } from 'react';
import { Award, Bell, CheckCircle2, Flame, Star, Sparkles, Target, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { recognitionApi, recognitionDate } from '../../services/recognitionApi';
import type { ChildRecognition } from '../../services/recognitionApi';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardContext';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';
import { ChildBadgesModal } from './ChildBadgesModal';

export function ChildRecognitions() {
  const { user } = useAuth();
  const { rewards } = useRewards();
  const [items, setItems] = useState<ChildRecognition[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);

  const load = useCallback(() => setRetry(value => value + 1), []);

  useEffect(() => {
    if (user?.role !== 'CHILD') return;
    let active = true;
    const refresh = () => {
      if (document.hidden) return;
      setLoading(true);
      recognitionApi.mine().then(response => {
        if (active) {
          setItems(response.data || []);
          setLoadError(false);
        }
      }).catch(() => {
        if (active) setLoadError(true);
      }).finally(() => {
        if (active) setLoading(false);
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [user?._id, user?.role, retry]);

  const markRead = async (item: ChildRecognition) => {
    setBusy(item._id);
    setError('');
    try {
      await recognitionApi.read(item._id);
      setItems(current => current.map(row => row._id === item._id ? { ...row, readAt: new Date().toISOString() } : row));
      sfx.playStarFanfare();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_) {}
    } catch {
      setError('Chưa lưu được lời khen. Bé thử lại nhé!');
    } finally {
      setBusy('');
    }
  };

  if (user?.role !== 'CHILD') return null;

  const unread = items.filter(item => !item.readAt);
  const visible = expanded ? items : items.filter((item, index) => !item.readAt || index < 2);

  // Fallback and accurate real data from rewards state
  const totalStars = rewards?.totalStars ?? 0;
  const explorerLevel = rewards?.explorerLevel || {
    level: 1,
    title: 'Mầm Nhí Khám Phá',
    titleEn: 'Sprout Explorer',
    icon: '🌱',
    progressPercent: 20
  };
  const streak = (user as any)?.streak || 1;
  const completedLessons = rewards?.completedLessons ?? 0;
  const homePracticeStars = rewards?.homePracticeStars ?? 0;

  return (
    <section
      className="relative mb-5 overflow-hidden rounded-3xl border-3 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50/60 to-yellow-50 p-4 sm:p-6 text-slate-900 shadow-md"
      aria-label="Góc vinh danh và thành tích của bé"
    >
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-yellow-200/30 blur-xl" />

      {/* HEADER */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-300 bg-gradient-to-tr from-amber-400 to-yellow-300 text-2xl sm:text-3xl shadow-sm">
            🏆
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-amber-950 flex items-center gap-1.5">
                Góc Vinh Danh Của Bé
              </h2>
              <Sparkles className="h-5 w-5 text-amber-500 fill-amber-400 animate-pulse" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-amber-800">
              Ghi nhận nỗ lực học tập và các cột mốc ngôi sao của bé {user.name} ✨
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unread.length > 0 && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1.5 text-xs sm:text-sm font-black text-amber-950 shadow-sm animate-bounce"
            >
              <Bell className="h-4 w-4 fill-amber-950" /> {unread.length} vinh danh mới
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setShowBadgesModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-amber-300 bg-white/90 px-3.5 py-1.5 text-xs sm:text-sm font-black text-amber-900 shadow-2xs hover:bg-amber-100/70 transition-all active:scale-95 cursor-pointer"
          >
            <Award className="h-4 w-4 text-amber-600" />
            <span>Sổ Huy Hiệu</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="relative z-10 mt-3 rounded-2xl bg-amber-100/80 p-3 text-xs sm:text-sm font-bold text-amber-900 flex items-center justify-between gap-2">
          <span>Chưa tải được bảng vinh danh từ thầy cô.</span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-amber-500 px-3 py-1 font-black text-white hover:bg-amber-600"
          >
            Thử lại
          </button>
        </div>
      )}
      {error && <p role="alert" className="relative z-10 mt-2 text-xs sm:text-sm font-bold text-rose-700">{error}</p>}

      {/* SECTION 1: TEACHER / SCHOOL AWARDS (IF PUBLISHED) */}
      {items.length > 0 && (
        <div className="relative z-10 mt-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-amber-800">
            🎖️ Vinh danh từ Thầy Cô & Nhà Trường
          </p>
          <div className={visible.length === 1 ? 'grid gap-3.5' : 'grid gap-3.5 sm:grid-cols-2'}>
            {visible.map(item => {
              const isUnread = !item.readAt;
              return (
                <article
                  key={item._id}
                  className={`relative overflow-hidden rounded-2xl border-2 p-4 transition-all ${
                    isUnread
                      ? 'border-amber-400 bg-gradient-to-br from-amber-100/90 via-yellow-50 to-white shadow-md'
                      : 'border-amber-200/90 bg-white shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-3xl shadow-inner border border-amber-300">
                        {item.reward?.symbol || '⭐'}
                      </span>
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-200 text-amber-900 mb-1">
                          {item.kind === 'WEEK' ? 'Tuần này' : 'Tháng này'} · {item.className}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-amber-950 leading-tight">
                          {item.reward?.title || 'Ngôi sao chăm chỉ'}
                        </h3>
                      </div>
                    </div>
                    {isUnread && (
                      <span className="h-3 w-3 rounded-full bg-orange-500 animate-ping shrink-0" title="Chưa đọc" />
                    )}
                  </div>

                  <p className="mt-2.5 text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
                    🎉 Hoan hô <span className="text-amber-950 font-black">{item.name}</span>! Bé đạt thành tích xuất sắc với{' '}
                    <span className="text-amber-900 font-black inline-flex items-center gap-0.5">
                      ⭐ {item.stars} sao
                    </span>{' '}
                    trong kỳ học tập vừa qua!
                  </p>

                  {item.reward?.suggestion && (
                    <p className="mt-2 text-[11px] sm:text-xs text-amber-800 bg-amber-50 rounded-xl p-2 border border-amber-200/60 font-semibold">
                      💡 {item.reward.suggestion}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-amber-100 pt-2.5 text-[11px] font-bold text-slate-500">
                    <span>
                      {recognitionDate(item.periodStart)} – {recognitionDate(new Date(new Date(item.periodEnd).getTime() - 1).toISOString())}
                    </span>
                    {!item.readAt ? (
                      <button
                        type="button"
                        disabled={busy === item._id}
                        onClick={() => markRead(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:from-teal-700 hover:to-emerald-700 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {busy === item._id ? 'Đang nhận…' : '🎈 Bé nhận lời khen!'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-black">
                        <CheckCircle2 className="h-4 w-4" /> Đã lưu vào sổ
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {items.length > 2 && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => {
                sfx.playPop();
                setExpanded(value => !value);
              }}
              className="mt-2 text-xs font-black text-amber-900 underline hover:text-amber-950 cursor-pointer"
            >
              {expanded ? 'Thu gọn vinh danh' : `Xem thêm ${items.length - 2} vinh danh trước đây`}
            </button>
          )}
        </div>
      )}

      {/* SECTION 2: PERSONAL EFFORT & STATS SHOWCASE (ALWAYS VISIBLE & ACCURATE) */}
      <div className="relative z-10 mt-4 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-amber-800">
          🌟 Thành tích & Cấp độ nỗ lực của bé
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Explorer Level */}
          <div className="rounded-2xl border-2 border-amber-200/80 bg-white/95 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl" aria-hidden="true">{explorerLevel.icon}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-amber-900">
                Level {explorerLevel.level}
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate" title={explorerLevel.title}>
                {explorerLevel.title}
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">
                {explorerLevel.titleEn}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                  style={{ width: `${Math.max(10, explorerLevel.progressPercent || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Streak Flame */}
          <div className="rounded-2xl border-2 border-orange-200/80 bg-white/95 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Flame className="h-5 w-5 fill-orange-500 text-orange-600" />
              </div>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-orange-900">
                Chuyên cần
              </span>
            </div>
            <div className="mt-2">
              <p className="text-base sm:text-lg font-black text-orange-950">
                {streak} Ngày
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                Học liên tục cùng Koko 🔥
              </p>
            </div>
          </div>

          {/* Card 3: Total Stars (Live & includes 5-minute home review) */}
          <div className="rounded-2xl border-2 border-yellow-200/90 bg-white/95 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-yellow-100 text-amber-600">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />
              </div>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-amber-950">
                Kho sao
              </span>
            </div>
            <div className="mt-2">
              <p className="text-base sm:text-lg font-black text-amber-950">
                {totalStars} ⭐
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate" title={`${homePracticeStars} sao từ ôn tập tại nhà`}>
                {homePracticeStars > 0 ? `+${homePracticeStars} sao ôn tại nhà` : 'Tích lũy từ bài học'}
              </p>
            </div>
          </div>

          {/* Card 4: Lessons Completed */}
          <div className="rounded-2xl border-2 border-emerald-200/80 bg-white/95 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-emerald-900">
                Bài học
              </span>
            </div>
            <div className="mt-2">
              <p className="text-base sm:text-lg font-black text-emerald-950">
                {completedLessons} Lesson
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                Đã hoàn thành xuất sắc
              </p>
            </div>
          </div>
        </div>

        {/* CHEERING MESSAGE FROM KOKO */}
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white/70 p-3 sm:p-4 backdrop-blur-xs">
          <div className="shrink-0">
            <KokoMascot state="celebrating" size="sm" interactive={false} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-black text-amber-950">
              Koko rất tự hào về bé {user.name}! 🌟
            </p>
            <p className="text-[11px] sm:text-xs font-bold text-amber-800">
              Mỗi ngày bé ôn tập 5 phút và học thêm bài mới sẽ giúp ngọn lửa chuyên cần rực sáng và nhanh chóng giành Cúp Vàng của lớp nhé!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setShowBadgesModal(true);
            }}
            className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-black text-amber-950 hover:bg-amber-500 active:scale-95 transition-all cursor-pointer"
          >
            Huy hiệu <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* BADGES & STICKERS MODAL */}
      <ChildBadgesModal
        isOpen={showBadgesModal}
        onClose={() => setShowBadgesModal(false)}
        totalStars={totalStars}
        completedCount={completedLessons}
        childName={user?.name || 'Bé'}
      />
    </section>
  );
}
