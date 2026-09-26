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
  School
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { sfx } from '../../utils/audio';
import { KokoMascot } from '../../components/child/KokoMascot';

export const StudentLoginPage: React.FC = () => {
  // Login form state
  const [identifier, setIdentifier] = useState('leo@kcenglishkids.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forgot identifier / student lookup state
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<any[]>([]);

  const { loginStudentHome } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Bé hoặc bố mẹ vui lòng nhập Email hoặc Số điện thoại nhé!');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu học tập của bé!');
      return;
    }

    setSubmitting(true);
    setError(null);
    sfx.playPop();

    try {
      await loginStudentHome(identifier.trim(), password);
      sfx.playCorrect();
      navigate('/');
    } catch (err: any) {
      setError(
        err.message ||
          'Email/Số điện thoại hoặc mật khẩu chưa đúng. Bố mẹ vui lòng kiểm tra lại nhé!'
      );
      sfx.playGentleWrong();
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickAccount = (email: string) => {
    sfx.playPop();
    setIdentifier(email);
    setPassword('123456');
    setError(null);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPhone.trim()) {
      setLookupError('Vui lòng nhập Số điện thoại phụ huynh đã đăng ký.');
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setLookupResults([]);

    try {
      const res = await authApi.lookupStudent(lookupPhone.trim());
      if (res.success && res.data) {
        setLookupResults(res.data);
        sfx.playCorrect();
      }
    } catch (err: any) {
      setLookupError(
        err.message ||
          'Không tìm thấy tài khoản bé nào gắn với Số điện thoại này. Bố mẹ vui lòng liên hệ giáo viên chủ nhiệm để được cấp lại tài khoản nhé!'
      );
      sfx.playGentleWrong();
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/50 to-yellow-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Ambient Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/40 via-orange-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-sky-200/40 via-emerald-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full max-w-2xl mx-auto mb-6 flex items-center justify-between pt-2 px-4">
        <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-xs px-4 py-2 rounded-2xl border-2 border-amber-200 shadow-sm">
          <span className="text-2xl">🦁</span>
          <span className="font-black text-amber-950 text-base tracking-tight">KCEnglishKids</span>
        </div>

        <Link
          to="/teacher/login"
          className="inline-flex items-center gap-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 px-5 py-2.5 rounded-2xl border-2 border-slate-200 hover:border-teal-300 text-sm sm:text-base font-black transition-all shadow-sm group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 group-hover:scale-110 transition-transform">
            <UserCheck className="w-4 h-4" />
          </div>
          <span>Cổng Giáo Viên →</span>
        </Link>
      </div>

      <div className="max-w-xl sm:max-w-2xl w-full mx-auto relative z-10 px-4">
        {/* Mascot Greeting Stage */}
        <div className="text-center mb-6 pt-1">
          <div className="flex justify-center mb-3 animate-soft-bounce">
            <KokoMascot
              state="happy"
              size="lg"
              interactive={true}
              onClick={() => sfx.playPop()}
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-100/95 border-2 border-amber-300 text-amber-950 font-black text-sm sm:text-base px-5 py-2 rounded-full mb-3 shadow-xs">
            <span>Chào mừng bé đến lớp học tiếng Anh! 🐻✨</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-800 tracking-tight">
            Bé Học Tại Nhà
          </h1>
          <p className="text-sm sm:text-base font-bold text-amber-800 mt-2 max-w-md mx-auto">
            Nhập Email hoặc Số điện thoại của bé để tiếp tục khám phá bài học nhé!
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-4xl border-4 border-amber-300 p-7 sm:p-10 shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-3 text-rose-700 text-sm sm:text-base font-bold animate-pop-in">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ===== LOGIN FORM ===== */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Identifier Input */}
            <div>
              <div className="flex items-center justify-between mb-2 ml-1">
                <label
                  htmlFor="student-identifier"
                  className="block text-sm sm:text-base font-black uppercase text-slate-700"
                >
                  Email hoặc Số điện thoại
                </label>
                <button
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    setShowLookupModal(true);
                    setLookupError(null);
                    setLookupResults([]);
                  }}
                  className="text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <Search size={14} />
                  <span>Quên tên đăng nhập?</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-500">
                  {identifier.includes('@') ? (
                    <Mail className="w-6 h-6" />
                  ) : (
                    <Phone className="w-6 h-6" />
                  )}
                </div>
                <input
                  id="student-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ví dụ: leo@kcenglishkids.com hoặc 0901234567"
                  className="w-full pl-13 pr-4 py-4 sm:py-5 rounded-2xl sm:rounded-3xl border-3 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none text-slate-800 font-bold text-base sm:text-lg transition-all bg-amber-50/20"
                />
              </div>
            </div>

            {/* Password / Learning PIN Input */}
            <div>
              <label
                htmlFor="student-password"
                className="block text-sm sm:text-base font-black uppercase text-slate-700 mb-2 ml-1"
              >
                Mã PIN học tập / Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-500">
                  <Lock className="w-6 h-6" />
                </div>
                <input
                  id="student-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mã PIN hoặc mật khẩu..."
                  className="w-full pl-13 pr-14 py-4 sm:py-5 rounded-2xl sm:rounded-3xl border-3 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none text-slate-800 font-bold text-base sm:text-lg transition-all bg-amber-50/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Ẩn hiện mật khẩu"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-6 h-6" />
                  ) : (
                    <Eye className="w-6 h-6" />
                  )}
                </button>
              </div>
              <p className="mt-2 ml-1 text-xs sm:text-sm text-slate-500 font-bold flex items-center gap-1">
                <span>💡 Quên mã PIN? Bé hãy hỏi cô giáo chủ nhiệm hoặc bố mẹ nhé!</span>
              </p>
            </div>

            {/* Quick Demo Accounts */}
            <div className="pt-2">
              <span className="text-xs sm:text-sm font-black text-slate-500 block mb-2 uppercase ml-1">
                Tài khoản mẫu thử nghiệm theo lớp:
              </span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => fillQuickAccount('leo@kcenglishkids.com')}
                  className="px-3 py-2.5 sm:py-3 rounded-2xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs sm:text-base font-black flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <span>🦁</span>
                  <span>Leo (3–4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount('mia@kcenglishkids.com')}
                  className="px-3 py-2.5 sm:py-3 rounded-2xl border-2 border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-950 text-xs sm:text-base font-black flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <span>🐰</span>
                  <span>Mia (3–4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount('toby@kcenglishkids.com')}
                  className="px-3 py-2.5 sm:py-3 rounded-2xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-950 text-xs sm:text-base font-black flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <span>🐶</span>
                  <span>Toby (4–5)</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="btn-3d-amber w-full py-4 sm:py-5 px-8 rounded-3xl text-amber-950 font-black text-lg sm:text-2xl flex items-center justify-center gap-3 cursor-pointer shadow-xl disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-7 h-7 border-4 border-amber-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Vào lớp học ngay! 🚀</span>
                    <ArrowRight className="w-6 h-6 stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* School management note & footer info */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm sm:text-base font-bold text-slate-600">
            🏫 Tài khoản học viên do nhà trường & giáo viên chủ nhiệm quản lý và cấp phát.
          </p>
          <p className="text-xs sm:text-sm font-extrabold text-amber-900/60">
            KCEnglishKids • Nền tảng học tiếng Anh chuẩn mầm non (3–6 tuổi)
          </p>
        </div>
      </div>

      {/* Forgot Identifier / Student Lookup Modal */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-pop-in">
          <div className="w-full max-w-xl sm:max-w-2xl bg-white rounded-4xl border-4 border-amber-300 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-amber-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800">
                  <Search size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl sm:text-2xl text-slate-800">Tra Cứu Tài Khoản Của Bé</h3>
                  <p className="text-xs sm:text-sm font-bold text-amber-700">Khôi phục tên đăng nhập bằng SĐT phụ huynh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLookupModal(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLookup} className="space-y-5">
              <div>
                <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                  Số điện thoại phụ huynh đăng ký:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-500">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={lookupPhone}
                    onChange={(e) => setLookupPhone(e.target.value)}
                    placeholder="Ví dụ: 0901234567 hoặc 0902345678"
                    className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200 outline-none text-slate-800 font-bold text-base sm:text-lg bg-amber-50/20"
                  />
                </div>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-400">Gợi ý tra cứu nhanh:</span>
                  <button
                    type="button"
                    onClick={() => setLookupPhone('0901234567')}
                    className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Bé Leo (0901234567)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookupPhone('0902345678')}
                    className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Bé Mia (0902345678)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookupPhone('0903456789')}
                    className="text-xs font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Bé Ben (0903456789)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                {lookupLoading ? (
                  <div className="w-6 h-6 border-3 border-amber-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search size={20} />
                    <span>Tra Cứu Tài Khoản</span>
                  </>
                )}
              </button>
            </form>

            {/* Error state */}
            {lookupError && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-sm text-rose-700 font-bold flex items-start gap-2.5">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{lookupError}</span>
              </div>
            )}

            {/* Results found */}
            {lookupResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-black text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={18} />
                  <span>Đã tìm thấy tài khoản của bé:</span>
                </p>
                {lookupResults.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center shadow-xs overflow-hidden">
                        {st.avatarUrl ? (
                          <img src={st.avatarUrl} alt={st.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-2xl">🦁</span>
                        )}
                      </div>
                      <div>
                        <b className="text-base text-slate-800 block">{st.name}</b>
                        <span className="text-sm font-mono font-bold text-teal-800 block">{st.email}</span>
                        <span className="text-xs text-slate-500 block">{st.className} (Độ tuổi: {st.ageGroupCode})</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setIdentifier(st.email || st.phone);
                        setShowLookupModal(false);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      Dùng tài khoản này
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Support footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <School size={16} className="text-slate-500" />
                Văn phòng mầm non: 028.3888.xxxx
              </span>
              <span className="text-amber-800">Hỗ trợ 24/7</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
