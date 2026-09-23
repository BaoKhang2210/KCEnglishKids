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
  Sparkles,
  User,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sfx } from '../../utils/audio';
import { KokoMascot } from '../../components/child/KokoMascot';
import type { AgeGroupCode } from '../../types';

export const StudentLoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [identifier, setIdentifier] = useState('leo@kcenglishkids.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regAgeGroup, setRegAgeGroup] = useState<AgeGroupCode>('3-4');
  const [regAvatar, setRegAvatar] = useState('lion');
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { loginStudentHome, registerChild } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Bé hoặc bố mẹ vui lòng nhập Email hoặc Số điện thoại nhé!');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu đăng nhập!');
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setError('Bố mẹ vui lòng nhập tên đáng yêu của bé nhé!');
      return;
    }
    if (!regIdentifier.trim()) {
      setError('Vui lòng nhập Email hoặc Số điện thoại của phụ huynh!');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setError('Mật khẩu tối thiểu 4 ký tự bố mẹ nhé!');
      return;
    }

    setSubmitting(true);
    setError(null);
    sfx.playPop();

    try {
      await registerChild({
        name: regName.trim(),
        identifier: regIdentifier.trim(),
        password: regPassword,
        ageGroupCode: regAgeGroup,
        avatar: regAvatar
      });
      sfx.playCorrect();
      navigate('/');
    } catch (err: any) {
      setError(
        err.message || 'Đăng ký chưa thành công. Bố mẹ vui lòng kiểm tra thông tin nhé!'
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

  const avatarOptions = [
    { key: 'lion', emoji: '🦁', name: 'Sư tử Leo' },
    { key: 'rabbit', emoji: '🐰', name: 'Thỏ Mia' },
    { key: 'panda', emoji: '🐼', name: 'Gấu Toby' },
    { key: 'bear', emoji: '🐻', name: 'Gấu Koko' },
    { key: 'fox', emoji: '🦊', name: 'Cáo Foxy' },
    { key: 'koala', emoji: '🐨', name: 'Koala Ola' }
  ];

  const ageGroupOptions: { code: AgeGroupCode; title: string; desc: string; book: string; color: string }[] = [
    {
      code: '3-4',
      title: 'Lớp Mầm (3–4 tuổi)',
      desc: 'Bắt đầu làm quen với từ vựng mầm non cơ bản',
      book: 'Sách 1 (Book 1)',
      color: 'border-amber-300 bg-amber-50/70 text-amber-950'
    },
    {
      code: '4-5',
      title: 'Lớp Chồi (4–5 tuổi)',
      desc: 'Mở rộng từ vựng đời sống, thói quen & giác quan',
      book: 'Sách 2 (Book 2)',
      color: 'border-pink-300 bg-pink-50/70 text-pink-950'
    },
    {
      code: '5-6',
      title: 'Lớp Lá (5–6 tuổi)',
      desc: 'Sẵn sàng vào lớp 1, chủ đề cộng đồng & thế giới',
      book: 'Sách 3 (Book 3)',
      color: 'border-sky-300 bg-sky-50/70 text-sky-950'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/50 to-yellow-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Ambient Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/40 via-orange-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-sky-200/40 via-emerald-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full max-w-lg mx-auto mb-4 flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xl">🦁</span>
          <span className="font-black text-amber-950 text-sm tracking-tight">KCEnglishKids</span>
        </div>

        <Link
          to="/teacher/login"
          className="inline-flex items-center gap-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 px-4 py-2 rounded-2xl border-2 border-slate-200 hover:border-teal-300 text-xs sm:text-sm font-black transition-all shadow-sm group cursor-pointer"
        >
          <div className="w-6 h-6 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 group-hover:scale-110 transition-transform">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <span>Cổng Giáo Viên →</span>
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Mascot Greeting Stage */}
        <div className="text-center mb-5 pt-1">
          <div className="flex justify-center mb-2.5 animate-soft-bounce">
            <KokoMascot
              state="happy"
              size="md"
              interactive={true}
              onClick={() => sfx.playPop()}
            />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-amber-100/90 border-2 border-amber-300 text-amber-900 font-extrabold text-xs px-4 py-1.5 rounded-full mb-2 shadow-xs">
            <span>Chào mừng bé về nhà học tiếng Anh! 🐻✨</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
            {authMode === 'LOGIN' ? 'Bé Học Tại Nhà' : 'Đăng Ký Bé Học'}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-amber-700 mt-1 max-w-sm mx-auto">
            {authMode === 'LOGIN'
              ? 'Nhập Email hoặc Số điện thoại của bé để tiếp tục khám phá bài học nhé!'
              : 'Tạo tài khoản để nhận lộ trình từ vựng & trò chơi đúng chuẩn độ tuổi của bé!'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-amber-200/60 p-1.5 rounded-2xl mb-4 border-2 border-amber-300/80 shadow-xs">
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setAuthMode('LOGIN');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === 'LOGIN'
                ? 'bg-white text-amber-950 shadow-md scale-100'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            <span>Đăng Nhập Bé Học</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setAuthMode('REGISTER');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === 'REGISTER'
                ? 'bg-white text-amber-950 shadow-md scale-100'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>Đăng Ký Tài Khoản</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border-4 border-amber-300 p-5 sm:p-7 shadow-xl relative overflow-hidden">
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm font-bold animate-pop-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'LOGIN' ? (
            /* ===== LOGIN FORM ===== */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Identifier Input */}
              <div>
                <label
                  htmlFor="student-identifier"
                  className="block text-xs font-black uppercase text-slate-600 mb-1.5 ml-1"
                >
                  Email hoặc Số điện thoại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                    {identifier.includes('@') ? (
                      <Mail className="w-5 h-5" />
                    ) : (
                      <Phone className="w-5 h-5" />
                    )}
                  </div>
                  <input
                    id="student-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Ví dụ: leo@kcenglishkids.com hoặc 0901234567"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none text-slate-800 font-bold text-sm sm:text-base transition-all bg-amber-50/20"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="student-password"
                  className="block text-xs font-black uppercase text-slate-600 mb-1.5 ml-1"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="student-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none text-slate-800 font-bold text-sm sm:text-base transition-all bg-amber-50/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Ẩn hiện mật khẩu"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Demo Accounts */}
              <div className="pt-1">
                <span className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase ml-1">
                  Tài khoản mẫu thử nghiệm theo lớp:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillQuickAccount('leo@kcenglishkids.com')}
                    className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>🦁</span>
                    <span>Leo (3–4)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickAccount('mia@kcenglishkids.com')}
                    className="px-2.5 py-1.5 rounded-xl border border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-900 text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>🐰</span>
                    <span>Mia (4–5)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickAccount('toby@kcenglishkids.com')}
                    className="px-2.5 py-1.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>🐶</span>
                    <span>Toby (5–6)</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-3d-amber w-full py-3.5 px-6 rounded-2xl text-amber-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-6 h-6 border-3 border-amber-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Vào lớp học ngay! 🚀</span>
                      <ArrowRight className="w-5 h-5 stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ===== REGISTER FORM ===== */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Child Name */}
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-black uppercase text-slate-600 mb-1 ml-1"
                >
                  Tên của bé
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ví dụ: Bé Bắp, Bé An, Minh Khôi..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none text-slate-800 font-bold text-sm transition-all bg-amber-50/20"
                  />
                </div>
              </div>

              {/* Age Group / Grade Selection */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1 ml-1">
                  Chọn Lớp Học / Độ Tuổi Của Bé
                </label>
                <div className="space-y-1.5">
                  {ageGroupOptions.map((opt) => {
                    const isSelected = regAgeGroup === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setRegAgeGroup(opt.code);
                        }}
                        className={`w-full p-2.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? `${opt.color} border-current ring-3 ring-amber-300/50 shadow-sm font-black`
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap
                            className={`w-4 h-4 ${
                              isSelected ? 'text-amber-600' : 'text-slate-400'
                            }`}
                          />
                          <div>
                            <div className="text-xs font-black">{opt.title}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-600">
                          {opt.book}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mascot Avatar Selection */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1 ml-1">
                  Chọn nhân vật của bé
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {avatarOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setRegAvatar(item.key);
                      }}
                      className={`p-1.5 rounded-xl border-2 text-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                        regAvatar === item.key
                          ? 'border-amber-400 bg-amber-100 scale-105 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <span>{item.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent Identifier (Email / Phone) */}
              <div>
                <label
                  htmlFor="reg-identifier"
                  className="block text-xs font-black uppercase text-slate-600 mb-1 ml-1"
                >
                  Email hoặc Số điện thoại phụ huynh
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-identifier"
                    type="text"
                    required
                    value={regIdentifier}
                    onChange={(e) => setRegIdentifier(e.target.value)}
                    placeholder="bome@example.com hoặc 0912345678"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none text-slate-800 font-bold text-sm transition-all bg-amber-50/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-black uppercase text-slate-600 mb-1 ml-1"
                >
                  Mật khẩu đăng nhập
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mật khẩu ít nhất 4 số hoặc chữ..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none text-slate-800 font-bold text-sm transition-all bg-amber-50/20"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-3d-amber w-full py-3.5 px-6 rounded-2xl text-amber-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-6 h-6 border-3 border-amber-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Đăng Ký & Khám Phá Ngay! ✨</span>
                      <ArrowRight className="w-5 h-5 stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-5">
          <p className="text-xs font-bold text-slate-400">
            KCEnglishKids • Nền tảng học tiếng Anh chuẩn mầm non (3–6 tuổi)
          </p>
        </div>
      </div>
    </div>
  );
};

