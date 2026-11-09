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
          particleCount: 120,
          spread: 80,
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

  // Accurate real data directly from system rewards state
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
      className="relative w-full my-6 overflow-hidden rounded-[32px] sm:rounded-[40px] border-4 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50/70 to-yellow-50 p-6 sm:p-8 md:p-10 text-slate-900 shadow-xl"
      aria-label="Góc vinh danh và bảng vàng thành tích của bé"
    >
      {/* Decorative playful ambient shapes */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-yellow-300/30 blur-2xl" />

      {/* TOP HEADER - LARGE, SCREEN-FILLING & CELEBRATORY */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-amber-200/90 pb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 shrink-0 items-center justify-center rounded-3xl border-3 border-amber-300 bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-300 text-3xl sm:text-4xl lg:text-5xl shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">
            🏆
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-amber-950 tracking-tight leading-tight">
                Góc Vinh Danh Của Bé
              </h2>
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 fill-amber-400 animate-pulse shrink-0" />
            </div>
            <p className="mt-1 sm:mt-1.5 text-sm sm:text-base md:text-lg font-bold text-amber-900">
              Bảng vàng ghi nhận nỗ lực xuất sắc & các cột mốc ngôi sao của bé <span className="text-orange-950 font-black underline decoration-amber-400">{user.name}</span> ✨
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap self-end md:self-center">
          {unread.length > 0 && (
            <span
              role="status"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm md:text-base font-black text-amber-950 shadow-md animate-bounce"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 fill-amber-950" /> {unread.length} Lời Khen Mới
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setShowBadgesModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-amber-300 bg-white px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm md:text-base font-black text-amber-900 shadow-md hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            <span>Mở Sổ Huy Hiệu</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="relative z-10 mt-4 rounded-2xl bg-amber-100/90 p-4 text-sm sm:text-base font-bold text-amber-900 flex items-center justify-between gap-3 shadow-inner">
          <span>Chưa tải được bảng vinh danh từ thầy cô.</span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-amber-500 px-4 py-1.5 font-black text-white hover:bg-amber-600 transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}
      {error && <p role="alert" className="relative z-10 mt-3 text-sm sm:text-base font-bold text-rose-700">{error}</p>}

      {/* SECTION 1: OFFICIAL AWARDS PUBLISHED BY TEACHER / SCHOOL (IF ANY) */}
      {items.length > 0 && (
        <div className="relative z-10 mt-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              🎖️ Cúp Vinh Danh Từ Thầy Cô & Nhà Trường
            </span>
          </div>

          <div className={visible.length === 1 ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2'}>
            {visible.map(item => {
              const isUnread = !item.readAt;
              return (
                <article
                  key={item._id}
                  className={`relative overflow-hidden rounded-3xl border-3 p-5 sm:p-6 transition-all ${
                    isUnread
                      ? 'border-amber-400 bg-gradient-to-br from-amber-100 via-yellow-50 to-white shadow-xl'
                      : 'border-amber-200 bg-white shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-3xl sm:text-4xl shadow-inner border-2 border-amber-300">
                        {item.reward?.symbol || '⭐'}
                      </span>
                      <div>
                        <span className="inline-block px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wide bg-amber-200 text-amber-950 mb-1">
                          {item.kind === 'WEEK' ? 'Tuần Này' : 'Tháng Này'} · {item.className}
                        </span>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-amber-950 leading-tight">
                          {item.reward?.title || 'Ngôi sao chăm chỉ'}
                        </h3>
                      </div>
                    </div>
                    {isUnread && (
                      <span className="h-3.5 w-3.5 rounded-full bg-orange-500 animate-ping shrink-0" title="Chưa đọc" />
                    )}
                  </div>

                  <p className="mt-3.5 text-sm sm:text-base md:text-lg font-bold text-slate-800 leading-relaxed">
                    🎉 Hoan hô <span className="text-amber-950 font-black">{item.name}</span>! Bé đạt thành tích xuất sắc với{' '}
                    <span className="text-amber-900 font-black inline-flex items-center gap-1 bg-amber-200/80 px-2.5 py-0.5 rounded-xl">
                      ⭐ {item.stars} sao
                    </span>{' '}
                    trong kỳ học tập vừa qua!
                  </p>

                  {item.reward?.suggestion && (
                    <p className="mt-3 text-xs sm:text-sm text-amber-900 bg-amber-50/80 rounded-2xl p-3 border border-amber-200 font-semibold">
                      💡 {item.reward.suggestion}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-amber-100 pt-3 text-xs sm:text-sm font-bold text-slate-500">
                    <span>
                      {recognitionDate(item.periodStart)} – {recognitionDate(new Date(new Date(item.periodEnd).getTime() - 1).toISOString())}
                    </span>
                    {!item.readAt ? (
                      <button
                        type="button"
                        disabled={busy === item._id}
                        onClick={() => markRead(item)}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-black text-white hover:from-teal-700 hover:to-emerald-700 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {busy === item._id ? 'Đang nhận…' : '🎈 Bé Nhận Lời Khen!'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs sm:text-sm font-black">
                        <CheckCircle2 className="h-5 w-5" /> Đã Lưu Vào Sổ Khen
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
              className="mt-2 text-xs sm:text-sm font-black text-amber-900 underline hover:text-amber-950 cursor-pointer"
            >
              {expanded ? 'Thu gọn vinh danh' : `Xem thêm ${items.length - 2} vinh danh trước đây`}
            </button>
          )}
        </div>
      )}

      {/* SECTION 2: 4 MASSIVE ACHIEVEMENT & EFFORT CARDS (ALWAYS VISIBLE & 100% ACCURATE REAL DATA) */}
      <div className="relative z-10 mt-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            🌟 Thành Tích & Cấp Độ Nỗ Lực Thực Tế Của Bé
          </span>
          {items.length === 0 && (
            <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-3 py-1 rounded-full">
              Chờ Thầy Cô công bố Bảng Vàng tuần này 🏆
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Explorer Level */}
          <div className="rounded-3xl border-3 border-amber-200 bg-white p-5 sm:p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-4xl sm:text-5xl" aria-hidden="true">{explorerLevel.icon}</span>
              <span className="rounded-2xl bg-amber-100 px-3 py-1 text-xs sm:text-sm font-black text-amber-900">
                Level {explorerLevel.level}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 truncate" title={explorerLevel.title}>
                {explorerLevel.title}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 truncate mt-0.5">
                {explorerLevel.titleEn}
              </p>
              <div className="mt-3 h-2.5 sm:h-3 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 transition-all duration-500"
                  style={{ width: `${Math.max(10, explorerLevel.progressPercent || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Streak Flame */}
          <div className="rounded-3xl border-3 border-orange-200 bg-white p-5 sm:p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <Flame className="h-7 w-7 fill-orange-500 text-orange-600" />
              </div>
              <span className="rounded-2xl bg-orange-100 px-3 py-1 text-xs sm:text-sm font-black text-orange-900">
                Chuyên Cần
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-orange-600">
                {streak} Ngày
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                Học liên tục mỗi ngày 🔥
              </p>
            </div>
          </div>

          {/* Card 3: Total Stars (Live & includes 5-minute home review) */}
          <div className="rounded-3xl border-3 border-yellow-300 bg-white p-5 sm:p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-yellow-100 text-amber-600">
                <Star className="h-7 w-7 fill-yellow-400 text-yellow-500" />
              </div>
              <span className="rounded-2xl bg-yellow-100 px-3 py-1 text-xs sm:text-sm font-black text-amber-950">
                Kho Sao
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-900">
                {totalStars} ⭐
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5 truncate" title={`${homePracticeStars} sao từ ôn tập tại nhà`}>
                {homePracticeStars > 0 ? `+${homePracticeStars} sao từ ôn tập ở nhà ⚡` : 'Tích lũy từ bài học & rèn luyện'}
              </p>
            </div>
          </div>

          {/* Card 4: Lessons Completed */}
          <div className="rounded-3xl border-3 border-emerald-200 bg-white p-5 sm:p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <Target className="h-7 w-7 text-emerald-600" />
              </div>
              <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs sm:text-sm font-black text-emerald-900">
                Bài Học
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-700">
                {completedLessons} Lesson
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                Đã hoàn thành xuất sắc
              </p>
            </div>
          </div>
        </div>

        {/* INSPIRING CHEERING BANNER FROM KOKO - FULL WIDTH & PROMINENT */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 rounded-3xl border-2 border-amber-200 bg-white/80 p-5 sm:p-6 backdrop-blur-xs shadow-md">
          <div className="shrink-0">
            <KokoMascot state="celebrating" size="sm" interactive={false} />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-base sm:text-lg md:text-xl font-black text-amber-950">
              Chú gấu Koko rất tự hào về bé {user.name}! 🌟
            </p>
            <p className="text-xs sm:text-sm md:text-base font-bold text-amber-900 mt-1">
              Mỗi ngày bé ôn tập 5 phút cùng ba mẹ và vượt qua các bài học mới sẽ giúp ngọn lửa chuyên cần rực sáng và nhanh chóng giành Cúp Vàng tuần tới của lớp nhé!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setShowBadgesModal(true);
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 px-6 py-3 sm:px-7 sm:py-3.5 text-sm sm:text-base font-black text-amber-950 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span>Bộ Sưu Tập Huy Hiệu</span>
            <ArrowRight className="h-5 w-5" />
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
