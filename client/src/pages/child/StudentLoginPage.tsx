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
  CheckCircle2,
  School,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { sfx } from '../../utils/audio';
import { KokoMascot } from '../../components/child/KokoMascot';

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
  const [identifier, setIdentifier] = useState('leo@kcenglishkids.com');
  const [password, setPassword]     = useState('123456');
  const [showPassword, setShowPwd]  = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showLookup, setShowLookup]       = useState(false);
  const [lookupPhone, setLookupPhone]     = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError]     = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<any[]>([]);

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
      setError(err.message || 'Email/SĐT hoặc mật khẩu chưa đúng. Bố mẹ kiểm tra lại nhé!');
      sfx.playGentleWrong();
    } finally { setSubmitting(false); }
  };

  const fillQuick = (email: string) => { sfx.playPop(); setIdentifier(email); setPassword('123456'); setError(null); };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPhone.trim()) { setLookupError('Vui lòng nhập SĐT phụ huynh đã đăng ký.'); return; }
    setLookupLoading(true); setLookupError(null); setLookupResults([]);
    try {
      const res = await authApi.lookupStudent(lookupPhone.trim());
      if (res.success && res.data) { setLookupResults(res.data); sfx.playCorrect(); }
    } catch (err: any) {
      setLookupError(err.message || 'Không tìm thấy tài khoản. Liên hệ giáo viên chủ nhiệm nhé!');
      sfx.playGentleWrong();
    } finally { setLookupLoading(false); }
  };

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(145deg,#fffbeb 0%,#fef3c7 45%,#ecfdf5 100%)', fontFamily: NU }}
    >
      {/* ── decorative blobs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-amber-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-rose-200/10 rounded-full blur-3xl" />
      </div>

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

        {/* ─── LEFT PANEL: Mascot + Tagline ─── */}
        <div className="hidden md:flex flex-col items-center justify-center gap-5 flex-shrink-0 w-52 lg:w-64">
          {/* Mascot — large, bouncing */}
          <div className="animate-soft-bounce cursor-pointer" onClick={() => sfx.playPop()}>
            <KokoMascot state="waving" size="lg" interactive={false} />
          </div>

          {/* Tagline pills */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className="bg-amber-400/90 text-amber-950 font-black text-sm px-4 py-2 rounded-2xl shadow-md"
              style={{ fontFamily: QS }}
            >
              🎓 Học vui mỗi ngày!
            </div>
            <div className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-300">
              🌟 Dành cho trẻ 3 – 6 tuổi
            </div>
            <div className="bg-sky-100 text-sky-800 font-bold text-xs px-3 py-1.5 rounded-xl border border-sky-300">
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
            className="bg-white/95 backdrop-blur-sm rounded-[28px] border-[3px] border-amber-300 shadow-2xl"
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
                    onClick={() => { sfx.playPop(); setShowLookup(true); setLookupError(null); setLookupResults([]); }}
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

              {/* ── Quick Demo Accounts ── */}
              <div>
                <span
                  className="block font-black uppercase text-slate-400 mb-2"
                  style={{ fontSize: '0.75rem', letterSpacing: '0.06em' }}
                >
                  Thử nhanh — Tài khoản mẫu:
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { email: 'leo@kcenglishkids.com',  icon: '🦁', name: 'Leo',  border: 'border-amber-300', bg: 'bg-amber-50 hover:bg-amber-100', text: 'text-amber-950' },
                    { email: 'mia@kcenglishkids.com',  icon: '🐰', name: 'Mia',  border: 'border-pink-300',  bg: 'bg-pink-50  hover:bg-pink-100',  text: 'text-pink-950'  },
                    { email: 'toby@kcenglishkids.com', icon: '🐶', name: 'Toby', border: 'border-sky-300',   bg: 'bg-sky-50   hover:bg-sky-100',   text: 'text-sky-950'   },
                  ].map(({ email, icon, name, border, bg, text }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => fillQuick(email)}
                      className={`py-2.5 rounded-2xl border-2 ${border} ${bg} ${text} font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm`}
                      style={{ fontSize: '1rem' }}
                    >
                      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                      <span>{name}</span>
                    </button>
                  ))}
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
          </div>

          {/* ── Footer note ── */}
          <p className="text-center font-bold text-slate-400" style={{ fontSize: '0.78rem' }}>
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
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800" style={{ fontFamily: QS }}>
                    Tra Cứu Tài Khoản Bé
                  </h3>
                  <p className="text-xs font-bold text-amber-700">Nhập SĐT phụ huynh đã đăng ký</p>
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

            {/* Lookup form */}
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                  Số điện thoại phụ huynh:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={lookupPhone}
                    onChange={(e) => setLookupPhone(e.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    className={inputCls}
                    style={{ paddingLeft: '2.75rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', fontSize: '1rem' }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-400">Thử nhanh:</span>
                  {[
                    { label: 'Leo', phone: '0901234567', cls: 'text-amber-700 bg-amber-100 hover:bg-amber-200' },
                    { label: 'Mia', phone: '0902345678', cls: 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200' },
                    { label: 'Ben', phone: '0903456789', cls: 'text-sky-700 bg-sky-100 hover:bg-sky-200' },
                  ].map(({ label, phone, cls }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setLookupPhone(phone)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${cls}`}
                    >
                      {label} ({phone})
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-base flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {lookupLoading ? (
                  <div className="w-5 h-5 border-[3px] border-amber-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Search className="w-4 h-4" /><span>Tra Cứu Tài Khoản</span></>
                )}
              </button>
            </form>

            {lookupError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 text-sm text-rose-700 font-bold flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{lookupError}</span>
              </div>
            )}

            {lookupResults.length > 0 && (
              <div className="mt-5 space-y-2.5">
                <p className="text-sm font-black text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Đã tìm thấy tài khoản của bé:
                </p>
                {lookupResults.map((st) => (
                  <div key={st.id} className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shadow-xs overflow-hidden flex-shrink-0">
                        {st.avatarUrl ? <img src={st.avatarUrl} alt={st.name} className="w-full h-full object-contain" /> : <span className="text-xl">🦁</span>}
                      </div>
                      <div>
                        <b className="text-sm text-slate-800 block">{st.name}</b>
                        <span className="text-xs font-mono font-bold text-teal-800 block">{st.email}</span>
                        <span className="text-xs text-slate-500">{st.className}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { sfx.playPop(); setIdentifier(st.email || st.phone); setShowLookup(false); }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-xs active:scale-95 transition-all whitespace-nowrap"
                    >
                      Dùng ngay
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <School className="w-4 h-4" /> Văn phòng: 028.3888.xxxx
              </span>
              <span className="text-amber-700">Hỗ trợ 24/7</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
