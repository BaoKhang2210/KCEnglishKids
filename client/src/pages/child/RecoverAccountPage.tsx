import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, CheckCircle2, ShieldCheck, Sparkles, Search, UserRound } from 'lucide-react';
import { PinPad } from '../../components/child/PinPad';
import { authApi } from '../../services/api';
import { sfx } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';
import { browserStorage } from '../../utils/browserStorage';

type Step = 'IDENTIFY' | 'FRIENDS' | 'NEW_PIN' | 'CONFIRM' | 'SUCCESS';
type Picture = { id: string; emoji: string; label: string };

/* Bé tự lấy lại mã PIN bằng "hai bạn bí mật" — không cần gọi cho quản trị viên. */
export const RecoverAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [step, setStep] = useState<Step>('IDENTIFY');
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { void authApi.recoveryOptions().then(r => setPictures(r.data || [])); }, []);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setError('Bố mẹ nhập tên đăng nhập, email hoặc số điện thoại của bé nhé!'); return; }
    setLoading(true); setError(null);
    try {
      const res = await authApi.recoveryBegin(identifier.trim());
      setToken(res.data.token);
      setPictures(res.data.pictures || []);
      setPicked([]);
      sfx.playPop();
      setStep('FRIENDS');
    } catch (err: any) {
      setError(err.message || 'Không tìm thấy hồ sơ của bé. Bố mẹ kiểm tra lại thông tin nhé!');
      sfx.playGentleWrong();
    } finally { setLoading(false); }
  };

  const toggle = (id: string) => {
    sfx.playPop();
    setPicked(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id].slice(-2));
  };

  const handleFriends = async () => {
    if (picked.length !== 2) { setError('Bé chạm đúng 2 bạn bí mật nhé!'); return; }
    setLoading(true); setError(null);
    try {
      const options = await authApi.recoveryOptions();
      // Validate against the static catalog so a stale grid cannot lock the flow.
      const valid = options.data.filter((p: Picture) => picked.includes(p.id)).map((p: Picture) => p.id);
      if (valid.length !== 2) { setError('Bạn bí mật vừa thay đổi, bé chọn lại nhé!'); return; }
      sfx.playCorrect();
      setStep('NEW_PIN');
    } catch (err: any) {
      setError(err.message || 'Chưa đúng bạn bí mật, bé thử lại nhé!');
      sfx.playGentleWrong();
      setPicked([]);
    } finally { setLoading(false); }
  };

  const handleNewPin = (pin: string) => {
    sfx.playPop();
    if (/^(1234|(\d)\2{3})$/.test(pin)) { setError('Mã PIN này dễ đoán quá, bé chọn 4 số khác nhé!'); return; }
    setNewPin(pin); setError(null); setStep('CONFIRM');
  };

  const handleConfirm = async (confirmPin: string) => {
    if (confirmPin !== newPin) { setError('Hai lần nhập chưa giống nhau, bé nhập lại nhé!'); sfx.playGentleWrong(); return; }
    setLoading(true); setError(null);
    try {
      const res = await authApi.recoveryComplete({ token, pictures: picked, newPin });
      browserStorage.setItem('kc_token', res.token);
      browserStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
      sfx.playCorrect();
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Bé chọn chưa đúng bạn bí mật. Hãy bắt đầu lại nhé!');
      sfx.playGentleWrong();
      if (err.statusCode === 410 || /bắt đầu lại|hết hạn/i.test(String(err.message))) { restart(); return; }
      setStep('FRIENDS'); setPicked([]);
    } finally { setLoading(false); }
  };

  const restart = () => {
    setToken(''); setPicked([]); setNewPin(''); setError(null); setStep('IDENTIFY');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl sm:max-w-2xl flex items-center justify-between mb-6">
        <Link to="/login" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border-2 border-amber-200 text-amber-950 font-black text-sm sm:text-base shadow-sm hover:bg-amber-50 transition-colors">
          <ArrowLeft size={20} />
          <span>Về đăng nhập</span>
        </Link>
        <div className="flex items-center gap-1.5 bg-amber-200/90 px-4 py-2 rounded-full text-xs sm:text-sm font-black text-amber-950">
          <ShieldCheck size={18} className="text-amber-800" />
          <span>Lấy lại PIN của bé</span>
        </div>
      </div>

      <div className="w-full max-w-xl sm:max-w-2xl bg-white rounded-4xl border-4 border-amber-300 p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-200/50 rounded-full blur-3xl pointer-events-none" />

        {step === 'SUCCESS' ? (
          <div className="py-8 flex flex-col items-center animate-pop-in">
            <div className="w-28 h-28 rounded-full bg-emerald-100 border-4 border-emerald-400 flex items-center justify-center text-emerald-600 mb-6 shadow-lg">
              <CheckCircle2 size={64} className="stroke-[2.5]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-3">Bé lấy lại PIN rồi! 🎉</h2>
            <p className="text-slate-600 font-bold text-base sm:text-lg max-w-md mb-8">
              Mã PIN mới đã sẵn sàng và bé đã được đăng nhập. Bé nhớ ghi nhớ mã PIN mới cùng bố mẹ nhé!
            </p>
            <button onClick={() => { sfx.playPop(); navigate('/'); }} className="btn-3d-amber w-full py-5 px-8 rounded-3xl text-amber-950 font-black text-xl sm:text-2xl shadow-xl cursor-pointer flex items-center justify-center gap-3">
              <Sparkles size={24} className="fill-amber-400 text-amber-600" />
              <span>Vào lớp học thôi nào!</span>
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800 mb-4 shadow-inner">
              {step === 'IDENTIFY' ? <Search size={40} /> : step === 'FRIENDS' ? <UserRound size={40} /> : <KeyRound size={40} />}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-2">
              {step === 'IDENTIFY' && 'Bé là ai trong lớp mình?'}
              {step === 'FRIENDS' && 'Chạm 2 bạn bí mật của bé'}
              {step === 'NEW_PIN' && 'Tạo mã PIN mới (4 số)'}
              {step === 'CONFIRM' && 'Nhập lại mã PIN mới'}
            </h2>
            <p className="text-sm sm:text-base font-bold text-slate-600 mb-6 max-w-md mx-auto">
              {step === 'IDENTIFY' && 'Bố mẹ hoặc bé nhập tên đăng nhập, email hoặc số điện thoại đã đăng ký.'}
              {step === 'FRIENDS' && 'Đây là 2 bức tranh bé đã chọn khi cài PIN. Chỉ bé và bố mẹ biết thôi nhé!'}
              {step === 'NEW_PIN' && 'Chọn 4 số bí mật thật dễ nhớ cho riêng bé!'}
              {step === 'CONFIRM' && 'Nhập lại 4 số vừa tạo để chắc chắn không bị nhầm.'}
            </p>

            {error && (
              <p role="alert" className="mb-4 p-3 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-700 font-bold text-sm">{error}</p>
            )}

            {step === 'IDENTIFY' && (
              <form onSubmit={handleIdentify} className="space-y-4">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="ví dụ: be.leo hoặc 0901..."
                  className="w-full rounded-2xl border-[3px] border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-200/60 outline-none text-slate-800 font-bold text-lg px-5 py-4 bg-amber-50/30 text-center"
                />
                <button type="submit" disabled={loading} className="btn-3d-amber w-full py-4 px-8 rounded-3xl text-amber-950 font-black text-lg sm:text-xl shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3">
                  {loading ? 'Đang tìm hồ sơ của bé…' : 'Tiếp tục nào! ✨'}
                </button>
              </form>
            )}

            {step === 'FRIENDS' && (
              <div className="space-y-5">
                <div className="grid grid-cols-4 gap-3">
                  {pictures.map(picture => (
                    <button
                      key={picture.id}
                      type="button"
                      aria-label={picture.label}
                      aria-pressed={picked.includes(picture.id)}
                      onClick={() => toggle(picture.id)}
                      className={`rounded-3xl border-[3px] p-3 sm:p-4 flex flex-col items-center gap-1 transition-all cursor-pointer ${picked.includes(picture.id) ? 'border-amber-400 bg-amber-100 scale-105 shadow-lg' : 'border-slate-200 bg-white hover:border-amber-300 storybook-hover'}`}
                    >
                      <span className="text-4xl sm:text-5xl" aria-hidden="true">{picture.emoji}</span>
                      <span className="text-xs sm:text-sm font-black text-slate-700">{picture.label}</span>
                    </button>
                  ))}
                </div>
                <button type="button" disabled={loading || picked.length !== 2} onClick={() => void handleFriends()} className="btn-3d-amber w-full py-4 px-8 rounded-3xl text-amber-950 font-black text-lg shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3">
                  {loading ? 'Đang kiểm tra…' : `Đúng 2 bạn của bé rồi! (${picked.length}/2)`}
                </button>
              </div>
            )}

            {(step === 'NEW_PIN' || step === 'CONFIRM') && (
              <PinPad
                onComplete={step === 'NEW_PIN' ? handleNewPin : handleConfirm}
                error={error || undefined}
                loading={loading}
              />
            )}

            {step !== 'IDENTIFY' && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
                <button type="button" onClick={restart} className="text-sm font-black text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  ↩ Làm lại từ đầu
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs font-bold text-amber-800/80 text-center max-w-sm">
        💡 Bé chưa kịp cài "bạn bí mật"? Nhờ cô giáo hoặc quản trị viên đặt lại PIN — và lần đổi PIN tới nhớ cài hai bạn bí mật nhé!
      </p>
    </div>
  );
};

export default RecoverAccountPage;
