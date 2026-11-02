import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  AlertCircle,
  Search,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sfx } from '../../utils/audio';
import { KokoMascot } from '../../components/child/KokoMascot';
import { StoryBackdrop } from '../../components/StoryScene';

/* ─────────────────────────────────────────────
   Inline style helpers  (Tailwind không đủ granular)
───────────────────────────────────────────── */
const QS = "'Quicksand','Nunito',system-ui,sans-serif";
const NU = "'Nunito','Quicksand',system-ui,sans-serif";

const inputCls =
  'w-full rounded-2xl border-[3px] border-slate-200 focus:border-amber-400 ' +
  'focus:ring-4 focus:ring-amber-200/60 outline-none text-slate-800 font-bold ' +
  'transition-all bg-amber-50/30';

export const StudentLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPwd]  = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showLookup, setShowLookup]       = useState(false);

  const { loginStudentHome } = useAuth();
  const navigate = useNavigate();

  /* ── handlers ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setError('Bé hoặc bố mẹ vui lòng nhập Email hoặc SĐT nhé!'); return; }
    if (!password)           { setError('Vui lòng nhập mật khẩu học tập của bé!'); return; }
    setSubmitting(true); setError(null); sfx.playPop();
    try {
      await loginStudentHome(identifier.trim(), password);
      sfx.playCorrect(); navigate('/');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('JSON') || msg.includes('Unexpected token') || msg.includes('Failed to fetch')) {
        setError('Không thể kết nối đến máy chủ Backend (Port 5000). Bố mẹ hãy kiểm tra server nhé!');
      } else {
        setError(msg || 'Email/SĐT hoặc mật khẩu chưa đúng. Bố mẹ kiểm tra lại nhé!');
      }
      sfx.playGentleWrong();
    } finally { setSubmitting(false); }
  };


  return (
    <div
      className="story-surface story-login min-h-dvh flex flex-col"
      style={{ fontFamily: NU }}
    >
      <StoryBackdrop scene="adventure"/>

      {/* ══════════════════════════════════════
          TOP NAV
      ══════════════════════════════════════ */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-3.5 flex-shrink-0">
        <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl border-2 border-amber-200 shadow-sm">
          <span className="text-2xl">🦁</span>
          <span className="font-black text-amber-950 text-base" style={{ fontFamily: QS }}>KCEnglishKids</span>
        </div>

        <Link
          to="/teacher/login"
          className="inline-flex items-center gap-2 bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-800 px-4 py-2 rounded-2xl border-2 border-slate-200 hover:border-teal-300 text-sm font-black transition-all shadow-sm cursor-pointer"
        >
          <UserCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Cổng Giáo Viên</span>
          <span>→</span>
        </Link>
      </header>

      {/* ══════════════════════════════════════
          MAIN — 2-col layout fills remaining height
      ══════════════════════════════════════ */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-10 py-3 min-h-0 gap-10 lg:gap-16">

        {/* ─── LEFT PANEL: Mascot + Tagline (Balanced, Centered & Prominent) ─── */}
        <div className="hidden md:flex flex-col items-center justify-center gap-6 flex-shrink-0 w-72 lg:w-80 xl:w-96 my-auto">
          {/* Friendly Mascot Greeting */}
          <div
            className="cursor-pointer group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95"
            onClick={() => sfx.playPop()}
            title="Chạm vào Koko nè!"
          >
            <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-3xl bg-amber-400/95 border-4 border-amber-300 p-2 shadow-2xl flex items-center justify-center animate-soft-bounce">
              <KokoMascot state="waving" size="lg" interactive={false} />
            </div>
            <span className="text-xs lg:text-sm font-black text-amber-950 bg-amber-300/90 px-4 py-1.5 rounded-full shadow-xs border border-amber-400/80">
              Chào bạn nhỏ! 🐵👋
            </span>
          </div>

          {/* 3 Prominent, Beautiful, Balanced Tagline Badges */}
          <div className="flex flex-col items-stretch gap-3 w-full text-center">
            <div
              className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 font-black text-base lg:text-lg py-3 px-5 rounded-2xl shadow-md border-2 border-amber-300/90 hover:scale-102 transition-transform"
              style={{ fontFamily: QS }}
            >
              🎓 Học vui mỗi ngày!
            </div>
            <div
              className="w-full bg-gradient-to-r from-emerald-100 via-teal-50 to-emerald-100 text-emerald-950 font-black text-sm lg:text-base py-3 px-5 rounded-2xl border-2 border-emerald-300/90 shadow-xs hover:scale-102 transition-transform"
              style={{ fontFamily: QS }}
            >
              🌟 Dành cho trẻ 3 – 6 tuổi
            </div>
            <div
              className="w-full bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 text-sky-950 font-black text-sm lg:text-base py-3 px-5 rounded-2xl border-2 border-sky-300/90 shadow-xs hover:scale-102 transition-transform"
              style={{ fontFamily: QS }}
            >
              🏆 Học tiếng Anh cùng Koko!
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Login Form ─── */}
        <div className="w-full max-w-[600px] flex flex-col gap-4">

          {/* Title block — visible on all screens */}
          <div className="flex items-center gap-4">
            {/* Mascot mobile only */}
            <div className="md:hidden flex-shrink-0 animate-soft-bounce" onClick={() => sfx.playPop()}>
              <KokoMascot state="happy" size="sm" interactive={false} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-700 font-black text-xs px-3 py-1 rounded-full mb-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Chào mừng bé yêu! ✨
              </div>
              <h1
                className="font-black leading-tight text-slate-800"
                style={{ fontFamily: QS, fontSize: 'clamp(2rem, 4vw, 2.75rem)' }}
              >
                Bé Học Tại Nhà
              </h1>
            </div>
          </div>

          {/* ── FORM CARD ── */}
          <div
            className="story-login-form bg-white rounded-[28px] border-[3px] border-amber-300 shadow-2xl"
            style={{ padding: 'clamp(1.25rem, 3vw, 2rem)' }}
          >
            {/* Error */}
            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-3 text-rose-700 font-bold animate-pop-in"
                style={{ fontSize: '0.95rem' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">

              {/* ── Email / SĐT ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="student-id"
                    className="flex items-center gap-2 font-black uppercase text-slate-600"
                    style={{ fontSize: '0.82rem', fontFamily: QS, letterSpacing: '0.05em' }}
                  >
                    <Mail className="w-4 h-4 text-amber-500" />
                    Email hoặc Số điện thoại
                  </label>
                  <button
                    type="button"
                    onClick={() => { sfx.playPop(); setShowLookup(true); }}
                    className="flex items-center gap-1 text-amber-600 hover:text-amber-800 font-bold underline cursor-pointer"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <Search className="w-3.5 h-3.5" /> Quên đăng nhập?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-400">
                    {identifier.includes('@') ? <Mail className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                  </div>
                  <input
                    id="student-id"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="leo@kcenglishkids.com hoặc 0901..."
                    className={inputCls}
                    style={{ paddingLeft: '3.2rem', paddingRight: '1rem', paddingTop: '0.875rem', paddingBottom: '0.875rem', fontSize: '1.05rem' }}
                  />
                </div>
              </div>

              {/* ── Mã PIN ── */}
              <div>
                <label
                  htmlFor="student-pwd"
                  className="flex items-center gap-2 font-black uppercase text-slate-600 mb-2"
                  style={{ fontSize: '0.82rem', fontFamily: QS, letterSpacing: '0.05em' }}
                >
                  <Lock className="w-4 h-4 text-amber-500" />
                  Mã PIN / Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <input
                    id="student-pwd"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mã PIN hoặc mật khẩu..."
                    className={inputCls}
                    style={{ paddingLeft: '3.2rem', paddingRight: '3.2rem', paddingTop: '0.875rem', paddingBottom: '0.875rem', fontSize: '1.05rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPassword)}
                    aria-label="Ẩn hiện mật khẩu"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* ── CTA BUTTON ── */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl font-black flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                style={{
                  fontFamily: QS,
                  fontSize: 'clamp(1.15rem, 2.2vw, 1.4rem)',
                  paddingTop: '1.1rem',
                  paddingBottom: '1.1rem',
                  background: submitting
                    ? '#f59e0b'
                    : 'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)',
                  color: '#1c1917',
                  boxShadow: submitting
                    ? 'none'
                    : '0 6px 0 #b45309, 0 10px 28px rgba(245,158,11,0.38)',
                  transform: submitting ? 'translateY(3px)' : undefined,
                }}
              >
                {submitting ? (
                  <div className="w-7 h-7 border-[3px] border-amber-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Vào lớp học ngay! 🚀</span>
                    <ArrowRight className="w-6 h-6 stroke-[3]" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="mt-4 pt-4 border-t border-amber-100 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 text-center">
                👉 Chạm để đăng nhập nhanh tài khoản mẫu (3 nhóm tuổi):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('leo@kcenglishkids.com');
                    setPassword('1232');
                    sfx.playPop();
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer text-center group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">🦁</span>
                  <span className="text-xs font-black text-amber-950">Leo</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded-md mt-0.5">3–4 tuổi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('mia@kcenglishkids.com');
                    setPassword('1232');
                    sfx.playPop();
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all cursor-pointer text-center group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">🐼</span>
                  <span className="text-xs font-black text-teal-950">Mia</span>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-200/60 px-1.5 py-0.5 rounded-md mt-0.5">4–5 tuổi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('toby@kcenglishkids.com');
                    setPassword('1232');
                    sfx.playPop();
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all cursor-pointer text-center group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">🐰</span>
                  <span className="text-xs font-black text-sky-950">Toby</span>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-200/60 px-1.5 py-0.5 rounded-md mt-0.5">5–6 tuổi</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Mobile Tagline badges ── */}
          <div className="flex md:hidden flex-wrap items-center justify-center gap-2 text-center my-0.5">
            <span className="bg-amber-400 text-amber-950 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs border border-amber-300">
              🎓 Học vui mỗi ngày!
            </span>
            <span className="bg-emerald-100 text-emerald-900 font-black text-xs px-3.5 py-1.5 rounded-xl border border-emerald-300">
              🌟 Bé 3 – 6 tuổi
            </span>
            <span className="bg-sky-100 text-sky-900 font-black text-xs px-3.5 py-1.5 rounded-xl border border-sky-300">
              🏆 Cùng Koko!
            </span>
          </div>

          {/* ── Footer note ── */}
          <p className="story-login-note text-center font-bold" style={{ fontSize: '0.78rem' }}>
            🏫 Tài khoản do nhà trường cấp phát &nbsp;•&nbsp; KCEnglishKids 3–6 tuổi
          </p>
        </div>
      </main>

      {/* ══════════════════════════════════════
          STUDENT LOOKUP MODAL
      ══════════════════════════════════════ */}
      {showLookup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-pop-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border-4 border-amber-300 p-6 sm:p-8 shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b-2 border-amber-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800" style={{ fontFamily: QS }}>
                    Quên Mã PIN Đăng Nhập?
                  </h3>
                  <p className="text-xs font-bold text-amber-700">Hỗ trợ tài khoản học sinh mầm non</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLookup(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                <p className="font-bold text-slate-800 text-sm leading-relaxed">
                  Vì tài khoản của bé thuộc lứa tuổi mầm non (3–6 tuổi), mã PIN 4 số được nhà trường cấp phát và quản lý an toàn.
                </p>
                <p className="font-extrabold text-amber-900 text-sm leading-relaxed">
                  Bố mẹ hoặc bé quên mã PIN vui lòng liên hệ trực tiếp với <span className="underline decoration-amber-500 decoration-2 font-black">cô giáo chủ nhiệm</span> hoặc <span className="underline decoration-amber-500 decoration-2 font-black">quản trị viên nhà trường</span> để được cấp lại mã PIN mới ngay lập tức nhé!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>Mã PIN mới gồm 4 số sẽ có hiệu lực ngay khi cô giáo hoặc Admin đặt lại.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { sfx.playPop(); setShowLookup(false); }}
              className="mt-6 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-base py-3.5 px-6 shadow-md cursor-pointer transition-colors"
            >
              Đã hiểu, quay lại đăng nhập
            </button>

          </div>
        </div>
      )}
    </div>
  );
};
