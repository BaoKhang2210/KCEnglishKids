import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowLeft, UserCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@kcenglishkids.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await loginAdmin(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập quản trị viên thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Return to Student / Teacher Portals Link */}
        <div className="flex items-center justify-between mb-6">
          <a
            href="http://localhost:5173/login"
            className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full border border-slate-200 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cổng Trẻ Em & Phụ Huynh</span>
          </a>

          <a
            href="http://localhost:5173/teacher/login"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-teal-700 bg-white/60 hover:bg-white px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
          >
            <UserCheck className="w-3 h-3 text-teal-600" />
            <span>Cổng Giáo Viên</span>
          </a>
        </div>

        {/* Portal Branding */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 ring-8 ring-indigo-100">
            <Shield className="w-8 h-8" />
          </div>
          <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-1 border border-indigo-200">
            Khu vực Quản trị Cấp cao
          </span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Cổng Quản Trị Hệ Thống
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">
            Quản lý tài khoản, dữ liệu giáo trình & kiểm toán hệ thống
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border-2 border-indigo-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Email Quản trị
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kcenglishkids.com"
                  className="pl-10 w-full rounded-2xl border-2 border-slate-200 py-2.5 px-3.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu Quản trị
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu quản trị"
                  className="pl-10 pr-10 w-full rounded-2xl border-2 border-slate-200 py-2.5 px-3.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 transition-colors"
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
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-600/30 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập Quản trị viên'}
            </button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] font-bold text-slate-400">
              Tài khoản mẫu: <span className="text-indigo-700 font-black">admin@kcenglishkids.com</span> • Mật khẩu: <span className="text-indigo-700 font-black">Admin@123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
