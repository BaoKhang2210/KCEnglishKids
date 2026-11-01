import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserCheck, Lock, Mail, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { sfx } from '../../utils/audio';

export const TeacherLoginPage: React.FC = () => {
  const [email, setEmail] = useState('teacher@kcenglishkids.com');
  const [password, setPassword] = useState('Teacher@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Password recovery with the one-time code the teacher saved earlier.
  const [recoverStep, setRecoverStep] = useState<'NONE' | 'EMAIL' | 'CODE' | 'DONE'>('NONE');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');

  const { loginTeacher } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    sfx.playPop();

    try {
      await loginTeacher(email, password);
      navigate('/teacher/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('JSON') || msg.includes('Unexpected token') || msg.includes('Failed to fetch')) {
        setError('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng khởi động backend server.');
      } else {
        setError(msg || 'Đăng nhập giáo viên thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await authApi.teacherRecoveryBegin(recoveryEmail.trim());
      setRecoveryToken(res.data.token);
      sfx.playPop();
      setRecoverStep('CODE');
    } catch (err: any) {
      setError(err.message || 'Không tìm thấy tài khoản có mã khôi phục.');
    } finally { setLoading(false); }
  };

  const finishRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await authApi.teacherRecoveryComplete({ token: recoveryToken, code: recoveryCode.trim(), newPassword: recoveryPassword });
      sfx.playCorrect();
      setRecoverStep('DONE');
    } catch (err: any) {
      setError(err.message || 'Mã khôi phục chưa đúng. Cô kiểm tra lại mã đã lưu nhé.');
      if (/bắt đầu lại|hết hạn|không còn hợp lệ/i.test(String(err.message))) { setRecoverStep('NONE'); setRecoveryToken(''); }
    } finally { setLoading(false); }
  };

  if (recoverStep !== 'NONE') {
    return (
      <div className="staff-workspace min-h-screen bg-teal-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="flex items-center justify-between mb-6">
            <button type="button" onClick={() => { setRecoverStep('NONE'); setError(null); }} className="inline-flex items-center gap-1.5 text-xs font-black text-teal-800 bg-slate-100 hover:bg-white px-3.5 py-1.5 rounded-full border border-teal-200 transition-colors cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Về đăng nhập</span>
            </button>
          </div>
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-700 flex items-center justify-center text-white mb-4 ring-8 ring-teal-100">
              <KeyRound className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {recoverStep === 'DONE' ? 'Đã đổi mật khẩu!' : 'Khôi phục mật khẩu giáo viên'}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {recoverStep === 'DONE'
                ? 'Cô dùng mật khẩu mới để đăng nhập lại nhé. Các phiên đăng nhập cũ đã bị thu hồi.'
                : recoverStep === 'CODE'
                  ? 'Nhập mã khôi phục 6 ký tự cô đã lưu khi lập tài khoản (không phân biệt hoa/thường).'
                  : 'Nếu tài khoản của cô chưa có mã khôi phục, hãy liên hệ quản trị viên — còn nếu đã có, nhập email để bắt đầu.'}
            </p>
          </div>
        </div>
        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-white py-8 px-6 rounded-3xl sm:px-10 border-2 border-teal-100">
            {error && <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl">{error}</div>}
            {recoverStep === 'DONE' ? (
              <button type="button" onClick={() => setRecoverStep('NONE')} className="w-full py-3.5 px-4 rounded-2xl bg-teal-700 text-white font-black text-sm cursor-pointer">
                Về màn hình đăng nhập
              </button>
            ) : recoverStep === 'CODE' ? (
              <form className="space-y-5" onSubmit={finishRecovery}>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Mã khôi phục</label>
                  <input
                    required
                    value={recoveryCode}
                    onChange={e => setRecoveryCode(e.target.value)}
                    placeholder="6 ký tự, ví dụ QK7M2P"
                    className="w-full rounded-2xl border-2 border-slate-200 py-2.5 px-3.5 text-slate-900 font-mono font-bold tracking-[0.3em] uppercase text-center text-lg focus:outline-none focus:border-teal-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={recoveryPassword}
                    onChange={e => setRecoveryPassword(e.target.value)}
                    placeholder="Mật khẩu mới"
                    className="w-full rounded-2xl border-2 border-slate-200 py-2.5 px-3.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-teal-500 bg-slate-50"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 px-4 rounded-2xl bg-teal-700 hover:bg-teal-700 text-white font-black text-sm cursor-pointer transition-all disabled:opacity-50">
                  {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={startRecovery}>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Email giáo viên</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={e => setRecoveryEmail(e.target.value)}
                      placeholder="email giảng dạy của cô"
                      className="pl-10 w-full rounded-2xl border-2 border-slate-200 py-2.5 px-3.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-teal-500 bg-slate-50"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 px-4 rounded-2xl bg-teal-700 hover:bg-teal-700 text-white font-black text-sm cursor-pointer transition-all disabled:opacity-50">
                  {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-workspace min-h-screen bg-teal-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Return to Student Portal Link */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-black text-teal-800 hover:text-teal-900 bg-slate-100 hover:bg-white px-3.5 py-1.5 rounded-full border border-teal-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Bé Học Tại Nhà</span>
          </Link>
        </div>

        {/* Portal Branding */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-700 flex items-center justify-center text-white  mb-4 ring-8 ring-teal-100">
            <UserCheck className="w-8 h-8" />
          </div>
          <span className="text-xs font-black bg-teal-100 text-teal-800 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-1 border border-teal-200">
            Khu vực Sư phạm
          </span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Cổng Giáo Viên
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600">
            Quản lý lớp học, theo dõi học sinh & giao bài tập
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 rounded-3xl sm:px-10 border-2 border-teal-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Email Giáo viên
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@kcenglishkids.com"
                  className="pl-10 w-full rounded-2xl border-2 border-slate-200 py-2.5 px-3.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-teal-500 focus:bg-white bg-slate-50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu giáo viên"
                  className="pl-10 pr-10 w-full rounded-2xl border-2 border-slate-200 py-2.5 px-3.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-teal-500 focus:bg-white bg-slate-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-600 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => { setError(null); setRecoveryEmail(email.includes('@') ? email : ''); setRecoverStep('EMAIL'); }}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-teal-700 hover:bg-teal-700 text-white font-black text-sm  cursor-pointer transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập Giáo Viên'}
            </button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] font-bold text-slate-600">
              Tài khoản mẫu: <span className="text-teal-800 font-black">teacher@kcenglishkids.com</span> • Mật khẩu: <span className="text-teal-800 font-black">Teacher@123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
