import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { adminApi } from '../../../services/api';

interface ResetPinModalProps {
  isOpen: boolean;
  user: any;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
}

export const ResetPinModal: React.FC<ResetPinModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess
}) => {
  const [pin, setPin] = useState('1234');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError('Mã PIN mới phải đúng 4 chữ số (0-9).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.resetChildPin(user._id, pin);
      if (res.success) {
        onSuccess(`Đã đặt lại mã PIN cho bé ${user.name} thành: ${pin}`);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Đặt lại mã PIN thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-pop-in">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Đặt Lại Mã PIN</h3>
              <p className="text-xs text-amber-100">Bé {user.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          <div className="text-center py-2">
            <span className="text-4xl block mb-2">{user.avatar === 'lion' ? '🦁' : user.avatar === 'panda' ? '🐼' : user.avatar === 'rabbit' ? '🐰' : '🦁'}</span>
            <p className="text-sm font-bold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.assignedClass?.name || 'Chưa vào lớp'}</p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-2 text-center">
              Nhập mã PIN 4 số mới
            </label>
            <input
              type="text"
              required
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-40 mx-auto block px-4 py-3 text-2xl bg-amber-50/70 border-2 border-amber-300 rounded-2xl focus:ring-2 focus:ring-amber-500 font-mono font-black tracking-widest outline-none text-center text-slate-900"
            />
            <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
              Gợi ý mã mặc định dễ nhớ: 1234, 0000, 2026
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu…' : 'Cập nhật mã PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
