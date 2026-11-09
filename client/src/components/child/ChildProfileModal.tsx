import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  X,
  BookOpen,
  BookOpenCheck,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Star,
  Flame,
  Award,
  UserCircle2,
  ChevronRight
} from 'lucide-react';
import { PinPad } from './PinPad';
import { authApi } from '../../services/api';
import { sfx } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';
import { useRewards } from '../../context/RewardContext';
import { browserStorage } from '../../utils/browserStorage';

type PinStep = 'CURRENT' | 'NEW' | 'CONFIRM' | 'FRIENDS' | 'SUCCESS';
type Picture = { id: string; emoji: string; label: string };

export const getChildAvatarEmoji = (avatar?: string): string => {
  switch (avatar?.toLowerCase()) {
    case 'lion':
      return '🦁';
    case 'panda':
      return '🐼';
    case 'rabbit':
    case 'bunny':
      return '🐰';
    case 'fox':
      return '🦊';
    case 'bear':
      return '🐻';
    case 'cat':
      return '🐱';
    case 'dog':
      return '🐶';
    case 'monkey':
      return '🐵';
    case 'koala':
      return '🐨';
    case 'tiger':
      return '🐯';
    case 'frog':
      return '🐸';
    case 'unicorn':
      return '🦄';
    default:
      if (avatar && avatar.length <= 4 && !avatar.startsWith('/') && !avatar.startsWith('http')) {
        return avatar;
      }
      return '🐼';
  }
};

interface ChildProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookLabel: string;
  ageLabel: string;
  ageCode: string;
  totalStars?: number;
  completedCount?: number;
  streakDays?: number;
  onOpenBadges?: () => void;
}

export const ChildProfileModal: React.FC<ChildProfileModalProps> = ({
  isOpen,
  onClose,
  bookLabel,
  ageLabel,
  ageCode,
  totalStars = 0,
  completedCount = 0,
  streakDays = 1,
  onOpenBadges
}) => {
  const { user } = useAuth();
  const { rewards } = useRewards();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'info' | 'pin'>('info');
  const [imgError, setImgError] = useState(false);

  // Change PIN flow states (integrated from /child/change-pin)
  const [step, setStep] = useState<PinStep>('CURRENT');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSecret, setHasSecret] = useState(true);
  const [catalog, setCatalog] = useState<Picture[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveView('info');
    setStep('CURRENT');
    setCurrentPin('');
    setNewPin('');
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeView !== 'pin') return;
    void Promise.all([authApi.recoveryStatus(), authApi.recoveryOptions()])
      .then(([status, options]) => {
        setHasSecret(Boolean(status.data?.configured));
        setCatalog(options.data || []);
      })
      .catch(() => {
        /* setup stays optional if status is unreachable */
      });
  }, [isOpen, activeView]);

  if (!isOpen || !user) return null;

  const effectiveStars = rewards?.totalStars ?? totalStars;
  const effectiveLessons = rewards?.completedLessons ?? completedCount;
  const avatarEmoji = getChildAvatarEmoji(user.avatar);

  const handleCurrentPinComplete = (pin: string) => {
    sfx.playPop();
    setCurrentPin(pin);
    setError(null);
    setStep('NEW');
  };

  const handleNewPinComplete = (pin: string) => {
    sfx.playPop();
    if (pin === currentPin) {
      setError('Mã PIN mới phải khác mã PIN hiện tại bé nhé!');
      return;
    }
    setNewPin(pin);
    setError(null);
    setStep('CONFIRM');
  };

  const handleConfirmPinComplete = async (confirmPin: string) => {
    if (confirmPin !== newPin) {
      setError('Mã PIN xác nhận không khớp! Bé hoặc bố mẹ nhập lại nhé.');
      sfx.playGentleWrong();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authApi.changePin({
        currentPin,
        newPin
      });
      if (response.token) browserStorage.setItem('kc_token', response.token);
      sfx.playCorrect();
      if (hasSecret) {
        setStep('SUCCESS');
      } else {
        setPicked([]);
        setError(null);
        setStep('FRIENDS');
      }
    } catch (err: any) {
      sfx.playGentleWrong();
      setError(err.message || 'Mã PIN hiện tại chưa chính xác. Vui lòng thử lại!');
      setStep('CURRENT');
      setCurrentPin('');
      setNewPin('');
    } finally {
      setLoading(false);
    }
  };

  const saveSecretFriends = async () => {
    if (picked.length !== 2) {
      setError('Bé chạm đúng 2 bạn bí mật nhé!');
      return;
    }
    setLoading(true);
    try {
      await authApi.recoverySetup({ currentPin: newPin, pictures: picked });
      sfx.playCorrect();
      setStep('SUCCESS');
    } catch (err: any) {
      sfx.playGentleWrong();
      setError(err.message || 'Lưu bạn bí mật chưa thành công, bé bỏ qua cũng được nhé!');
      setStep('SUCCESS');
    } finally {
      setLoading(false);
    }
  };

  const restartPin = () => {
    sfx.playPop();
    setCurrentPin('');
    setNewPin('');
    setError(null);
    setStep('CURRENT');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none"
      onClick={() => {
        sfx.playPop();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl border-4 border-amber-300 shadow-2xl max-w-lg w-full p-5 sm:p-7 relative overflow-hidden animate-pop-in max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Background Glows */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-100/70 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-100/60 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            sfx.playPop();
            onClose();
          }}
          aria-label="Đóng"
          className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors z-20"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Top Child Profile Header Card */}
        <div className="flex items-center gap-4 mb-4 relative z-10 pr-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 border-3 border-amber-300 p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
            {user.avatarUrl && !imgError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain rounded-2xl"
              />
            ) : (
              <span className="text-4xl sm:text-5xl leading-none" aria-hidden="true">
                {avatarEmoji}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 font-black text-xs px-2.5 py-0.5 rounded-full mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Thông tin của bé</span>
            </div>
            <h3
              className="text-xl sm:text-2xl font-black text-slate-800 truncate"
              style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
            >
              {user.name}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-amber-500/15 border border-amber-300 text-amber-900 font-black text-xs">
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                {bookLabel}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-emerald-500/15 border border-emerald-300 text-emerald-900 font-black text-xs">
                🎂 {ageLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs: Hồ sơ của bé vs Đổi mã PIN */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-4 relative z-10 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setActiveView('info');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeView === 'info'
                ? 'bg-white text-amber-950 shadow-xs ring-2 ring-amber-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCircle2 className="w-4 h-4 text-amber-600" />
            <span>Hồ sơ học tập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setActiveView('pin');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeView === 'pin'
                ? 'bg-white text-amber-950 shadow-xs ring-2 ring-amber-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Đổi mã PIN</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 pr-0.5 relative z-10">
          {activeView === 'info' ? (
            <div className="space-y-4">
              {/* Info Cards Grid: Age, Book, Stars, Streak */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-3.5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/25 border border-amber-300 flex items-center justify-center text-2xl flex-shrink-0">
                    📚
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-amber-800/80 block uppercase">
                      Giáo trình đang học
                    </span>
                    <span className="text-base sm:text-lg font-black text-amber-950">
                      {bookLabel}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-400/25 border border-emerald-300 flex items-center justify-center text-2xl flex-shrink-0">
                    🧒
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800/80 block uppercase">
                      Độ tuổi của bé
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-950">
                      {ageLabel} ({ageCode})
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50/70 p-3.5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-yellow-400/30 border border-yellow-300 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <Star className="w-6 h-6 fill-amber-400 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-amber-800/80 block uppercase">
                      Sao tích lũy
                    </span>
                    <span className="text-base sm:text-lg font-black text-amber-950">
                      {effectiveStars} ⭐ ({effectiveLessons} bài)
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/70 p-3.5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-400/25 border border-orange-300 flex items-center justify-center text-orange-600 flex-shrink-0">
                    <Flame className="w-6 h-6 fill-orange-500 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-orange-800/80 block uppercase">
                      Chuỗi ngày học
                    </span>
                    <span className="text-base sm:text-lg font-black text-orange-950">
                      {streakDays} ngày liên tiếp
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions inside Child Profile */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    onClose();
                    navigate('/?tab=diary');
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 hover:from-orange-100 hover:to-amber-100 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                      <BookOpenCheck className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="font-black text-sm sm:text-base text-slate-800 block">
                        Nhật ký & Tiến độ học tập của bé
                      </span>
                      <span className="text-xs font-bold text-slate-500 block">
                        Xem bé đã học bài gì, đang học bài nào và kết quả từng chặng
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-orange-700 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    setActiveView('pin');
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 hover:from-amber-100 hover:to-orange-100 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                      <KeyRound className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="font-black text-sm sm:text-base text-slate-800 block">
                        Đổi mã PIN học tập của bé
                      </span>
                      <span className="text-xs font-bold text-slate-500 block">
                        Thay đổi mã PIN 4 số hoặc cài đặt 2 bạn bí mật
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-700 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </button>

                {onOpenBadges && (
                  <button
                    type="button"
                    onClick={() => {
                      sfx.playPop();
                      onClose();
                      onOpenBadges();
                    }}
                    className="w-full p-4 rounded-2xl border-2 border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-11 h-11 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                        <Award className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className="font-black text-sm sm:text-base text-slate-800 block">
                          Góc phần thưởng & Huy hiệu
                        </span>
                        <span className="text-xs font-bold text-slate-500 block">
                          Xem huy hiệu và bộ sưu tập sticker của {user.name}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-purple-700 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* CHANGE PIN VIEW (Integrated from /child/change-pin) */
            <div className="bg-amber-50/40 rounded-3xl border-2 border-amber-200/80 p-4 sm:p-6 text-center">
              {step === 'SUCCESS' ? (
                <div className="py-4 flex flex-col items-center animate-pop-in">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-400 flex items-center justify-center text-emerald-600 mb-4 shadow-md">
                    <CheckCircle2 size={48} className="stroke-[2.5]" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 mb-2">
                    Tuyệt vời bé ơi! 🎉
                  </h4>
                  <p className="text-slate-600 font-bold text-sm max-w-sm mb-6">
                    Mã PIN học tập của bé đã được thay đổi thành công. Bé và bố mẹ nhớ ghi nhớ mã PIN mới nhé!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      sfx.playPop();
                      setActiveView('info');
                      restartPin();
                    }}
                    className="btn-3d-amber w-full py-3.5 px-6 rounded-2xl text-amber-950 font-black text-base shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles size={20} className="fill-amber-400 text-amber-600" />
                    <span>Quay lại hồ sơ của bé</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-amber-200/80 px-3 py-1 rounded-full text-xs font-black text-amber-950 mb-3">
                    <ShieldCheck size={15} className="text-amber-800" />
                    <span>Bảo mật mã PIN 4 số</span>
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
                    {step === 'CURRENT' && `Nhập mã PIN hiện tại của ${user.name}`}
                    {step === 'NEW' && 'Tạo mã PIN mới (4 số)'}
                    {step === 'CONFIRM' && 'Nhập lại mã PIN mới'}
                    {step === 'FRIENDS' && 'Chọn hai bạn bí mật của bé'}
                  </h4>

                  <p className="text-xs sm:text-sm font-bold text-slate-600 mb-4 max-w-md mx-auto">
                    {step === 'CURRENT' && 'Bé hoặc bố mẹ nhập mã PIN đang dùng nhé (mặc định: 1234)'}
                    {step === 'NEW' && 'Chọn 4 số bí mật thật dễ nhớ cho riêng bé nhé!'}
                    {step === 'CONFIRM' && 'Nhập lại 4 số vừa tạo để chắc chắn không bị nhầm.'}
                    {step === 'FRIENDS' && 'Hai bạn này giúp bé tự lấy lại PIN nếu quên.'}
                  </p>

                  {/* Step progress pills */}
                  <div className="flex justify-center gap-2 mb-4">
                    <span
                      className={`h-2 rounded-full transition-all duration-300 ${
                        step === 'CURRENT' ? 'w-8 bg-amber-500' : 'w-3 bg-amber-200'
                      }`}
                    />
                    <span
                      className={`h-2 rounded-full transition-all duration-300 ${
                        step === 'NEW' ? 'w-8 bg-amber-500' : 'w-3 bg-amber-200'
                      }`}
                    />
                    <span
                      className={`h-2 rounded-full transition-all duration-300 ${
                        step === 'CONFIRM' ? 'w-8 bg-amber-500' : 'w-3 bg-amber-200'
                      }`}
                    />
                  </div>

                  <div className="my-2">
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
                    {step === 'FRIENDS' && (
                      <div className="space-y-4">
                        <p role="status" className="font-black text-sm text-emerald-700">
                          Đổi PIN thành công! 🎉 Bây giờ bé chọn 2 bạn bí mật nhé.
                        </p>
                        <div className="grid grid-cols-4 gap-2.5">
                          {catalog.map((picture) => (
                            <button
                              key={picture.id}
                              type="button"
                              aria-label={picture.label}
                              aria-pressed={picked.includes(picture.id)}
                              onClick={() => {
                                sfx.playPop();
                                setPicked((current) =>
                                  current.includes(picture.id)
                                    ? current.filter((value) => value !== picture.id)
                                    : [...current, picture.id].slice(-2)
                                );
                              }}
                              className={`rounded-2xl border-2 p-2.5 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                picked.includes(picture.id)
                                  ? 'border-amber-400 bg-amber-100 scale-105 shadow-md'
                                  : 'border-slate-200 bg-white hover:border-amber-300'
                              }`}
                            >
                              <span className="text-3xl" aria-hidden="true">
                                {picture.emoji}
                              </span>
                              <span className="text-[11px] font-black text-slate-700">
                                {picture.label}
                              </span>
                            </button>
                          ))}
                        </div>
                        {error && (
                          <p role="alert" className="text-rose-700 font-bold text-xs">
                            {error}
                          </p>
                        )}
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playPop();
                              setError(null);
                              setStep('SUCCESS');
                            }}
                            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm cursor-pointer"
                          >
                            Để bé làm sau
                          </button>
                          <button
                            type="button"
                            disabled={picked.length !== 2 || loading}
                            onClick={() => void saveSecretFriends()}
                            className="btn-3d-amber flex-1 py-3 rounded-2xl text-amber-950 font-black text-sm shadow-lg cursor-pointer disabled:opacity-50"
                          >
                            {loading ? 'Đang lưu…' : `Lưu 2 bạn (${picked.length}/2)`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {step !== 'CURRENT' && step !== 'FRIENDS' && (
                    <div className="mt-4 pt-3 border-t border-amber-200/60 flex justify-center">
                      <button
                        type="button"
                        onClick={restartPin}
                        className="text-xs font-black text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        ↩ Nhập lại từ đầu
                      </button>
                    </div>
                  )}

                  <p className="mt-3 text-[11px] font-bold text-amber-800/80 text-center">
                    💡 Quên mã PIN? Khôi phục bằng “hai bạn bí mật” tại{' '}
                    <Link
                      to="/recover"
                      onClick={() => onClose()}
                      className="underline font-black"
                    >
                      trang khôi phục
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

