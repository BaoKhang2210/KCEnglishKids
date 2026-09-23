import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserCheck, Lock, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sfx } from '../../utils/audio';

export const TeacherLoginPage: React.FC = () => {
  const [email, setEmail] = useState('teacher@kcenglishkids.com');
  const [password, setPassword] = useState('Teacher@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError(err.message || 'Đăng nhập giáo viên thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-emerald-50/40 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Return to Student Portal Link */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-black text-teal-800 hover:text-teal-900 bg-white/80 hover:bg-white px-3.5 py-1.5 rounded-full border border-teal-200 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Bé Học Tại Nhà</span>
          </Link>
        </div>

        {/* Portal Branding */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-teal-600/30 mb-4 ring-8 ring-teal-100">
            <UserCheck className="w-8 h-8" />
          </div>
          <span className="text-xs font-black bg-teal-100 text-teal-800 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-1 border border-teal-200">
            Khu vực Sư phạm
          </span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Cổng Giáo Viên
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">
            Quản lý lớp học, theo dõi học sinh & giao bài tập
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border-2 border-teal-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Email Giáo viên
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-lg shadow-teal-600/30 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập Giáo Viên'}
            </button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] font-bold text-slate-400">
              Tài khoản mẫu: <span className="text-teal-700 font-black">teacher@kcenglishkids.com</span> • Mật khẩu: <span className="text-teal-700 font-black">Teacher@123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
