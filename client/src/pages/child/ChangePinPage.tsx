import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { PinPad } from '../../components/child/PinPad';
import { authApi } from '../../services/api';
import { sfx } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';

type Step = 'CURRENT' | 'NEW' | 'CONFIRM' | 'SUCCESS';

export const ChangePinPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('CURRENT');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCurrentPinComplete = (pin: string) => {
    sfx.playPop();
    setCurrentPin(pin);
    setError(null);
    setStep('NEW');
  };

  const handleNewPinComplete = (pin: string) => {
    sfx.playPop();
    if (pin === currentPin) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại bé nhé!');
      return;
    }
    setNewPin(pin);
    setError(null);
    setStep('CONFIRM');
  };

  const handleConfirmPinComplete = async (confirmPin: string) => {
    if (confirmPin !== newPin) {
      setError('Mật khẩu xác nhận không khớp! Bé hoặc bố mẹ nhập lại nhé.');
      sfx.playGentleWrong();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.changePin({
        currentPin,
        newPin
      });
      sfx.playCorrect();
      setStep('SUCCESS');
    } catch (err: any) {
      sfx.playGentleWrong();
      setError(err.message || 'Mật khẩu hiện tại chưa chính xác. Vui lòng thử lại!');
      setStep('CURRENT');
      setCurrentPin('');
      setNewPin('');
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    sfx.playPop();
    setCurrentPin('');
    setNewPin('');
    setError(null);
    setStep('CURRENT');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 flex flex-col items-center justify-center p-4 select-none">
      {/* Top bar */}
      <div className="w-full max-w-xl sm:max-w-2xl flex items-center justify-between mb-6">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border-2 border-amber-200 text-amber-950 font-black text-sm sm:text-base shadow-sm hover:bg-amber-50 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Về trang chủ</span>
        </Link>
        <div className="flex items-center gap-1.5 bg-amber-200/90 px-4 py-2 rounded-full text-xs sm:text-sm font-black text-amber-950">
          <ShieldCheck size={18} className="text-amber-800" />
          <span>Mật khẩu của bé</span>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-xl sm:max-w-2xl bg-white rounded-4xl border-4 border-amber-300 p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-200/50 rounded-full blur-3xl pointer-events-none" />

        {step === 'SUCCESS' ? (
          <div className="py-8 flex flex-col items-center animate-pop-in">
            <div className="w-28 h-28 rounded-full bg-emerald-100 border-4 border-emerald-400 flex items-center justify-center text-emerald-600 mb-6 shadow-lg">
              <CheckCircle2 size={64} className="stroke-[2.5]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-3">
              Tuyệt vời bé ơi! 🎉
            </h2>
            <p className="text-slate-600 font-bold text-base sm:text-lg max-w-md mb-8">
              Mật khẩu học tập của bé đã được thay đổi thành công. Bé và bố mẹ nhớ ghi nhớ mật khẩu mới nhé!
            </p>
            <button
              onClick={() => {
                sfx.playPop();
                navigate('/');
              }}
              className="btn-3d-amber w-full py-5 px-8 rounded-3xl text-amber-950 font-black text-xl sm:text-2xl shadow-xl cursor-pointer flex items-center justify-center gap-3"
            >
              <Sparkles size={24} className="fill-amber-400 text-amber-600" />
              <span>Bắt đầu học thôi nào!</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Mascot / Icon Badge */}
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800 mb-4 shadow-inner">
              <KeyRound size={40} />
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-2">
              {step === 'CURRENT' && (user?.name ? `Mật khẩu của bé ${user.name}` : 'Nhập mật khẩu hiện tại')}
              {step === 'NEW' && 'Tạo mật khẩu mới (4 số)'}
              {step === 'CONFIRM' && 'Nhập lại mật khẩu mới'}
            </h2>

            <p className="text-sm sm:text-base font-bold text-slate-600 mb-6 max-w-md mx-auto">
              {step === 'CURRENT' && 'Bé hoặc bố mẹ nhập mật khẩu đang dùng nhé (mặc định: 1234)'}
              {step === 'NEW' && 'Chọn 4 số bí mật thật dễ nhớ cho riêng bé nhé!'}
              {step === 'CONFIRM' && 'Nhập lại 4 số vừa tạo để chắc chắn không bị nhầm.'}
            </p>

            {/* Step progress pills */}
            <div className="flex justify-center gap-2.5 mb-6">
              <span
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  step === 'CURRENT' ? 'w-10 bg-amber-500' : 'w-4 bg-amber-200'
                }`}
              />
              <span
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  step === 'NEW' ? 'w-10 bg-amber-500' : 'w-4 bg-amber-200'
                }`}
              />
              <span
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  step === 'CONFIRM' ? 'w-10 bg-amber-500' : 'w-4 bg-amber-200'
                }`}
              />
            </div>

            {/* PinPad Engine */}
            <div className="my-4">
              {step === 'CURRENT' && (
                <PinPad
                  onComplete={handleCurrentPinComplete}
                  error={error}
                  loading={loading}
                />
              )}
              {step === 'NEW' && (
                <PinPad
                  onComplete={handleNewPinComplete}
                  error={error}
                  loading={loading}
                />
              )}
              {step === 'CONFIRM' && (
                <PinPad
                  onComplete={handleConfirmPinComplete}
                  error={error}
                  loading={loading}
                />
              )}
            </div>

            {/* Reset / helper buttons */}
            {step !== 'CURRENT' && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
                <button
                  type="button"
                  onClick={restart}
                  className="text-sm font-black text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  ↩ Nhập lại từ đầu
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper text footer */}
      <p className="mt-4 text-xs font-bold text-amber-800/80 text-center max-w-sm">
        💡 Nếu bé quên mã PIN hiện tại, vui lòng liên hệ cô giáo chủ nhiệm để được cấp lại mã PIN nhé!
      </p>
    </div>
  );
};
