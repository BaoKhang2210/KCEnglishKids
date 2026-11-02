import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Target,
  Volume2,
  Printer,
  Copy,
  Check,
  Rocket,
  ClipboardList,
  Lightbulb,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  MessageCircle,
  Flame,
  CheckSquare,
  Square
} from 'lucide-react';
import { teacherApi, aiApi } from '../../services/api';
import { playWordAudio, sfx } from '../../utils/audio';
import { getPreschoolTprGesture } from '../../utils/tprGestures';

interface GapWord {
  english: string;
  vietnamese?: string;
  severity?: 'critical' | 'moderate' | 'healthy';
  accuracyPercent?: number | null;
  masteredPercent?: number;
  totalAttempts?: number;
  wrongCount?: number;
}

export const TeacherLessonPlanner: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL query params
  const initialClassId = searchParams.get('classroomId') || '';
  const urlGapWords = searchParams.get('gapWords') || '';

  // Data states
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [duration, setDuration] = useState<10 | 15 | 20>(15);
  const [reviewStyle, setReviewStyle] = useState<'tpr' | 'game' | 'interactive'>('tpr');

  // Knowledge gaps state
  const [classGaps, setClassGaps] = useState<GapWord[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [selectedGapWords, setSelectedGapWords] = useState<string[]>(() => {
    if (urlGapWords) {
      return urlGapWords.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });

  const [teacherNote, setTeacherNote] = useState('');
  const [error, setError] = useState<string>('');
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [copiedParentMsg, setCopiedParentMsg] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // Load teacher classes
  useEffect(() => {
    teacherApi.getClasses()
      .then((res) => {
        const clsList = res.data || [];
        setClasses(clsList);
        if (!selectedClassId && clsList.length > 0) {
          setSelectedClassId(String(clsList[0]._id));
        }
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải danh sách lớp học.');
      });
  }, []);

  // Fetch Knowledge Gaps when selectedClassId changes
  useEffect(() => {
    if (!selectedClassId) return;
    setLoadingGaps(true);
    setError('');

    aiApi.detectClassGaps(selectedClassId)
      .then((res) => {
        const list: GapWord[] = res.data?.gaps || [];
        setClassGaps(list);

        // Auto select critical / warning gaps if none specified in URL
        if (!urlGapWords && list.length > 0) {
          const criticals = list.filter((g) => g.severity === 'critical').map((g) => g.english);
          const initialSelect = criticals.length > 0 ? criticals : list.slice(0, 4).map((g) => g.english);
          setSelectedGapWords(initialSelect);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch class gaps:', err);
        setClassGaps([]);
      })
      .finally(() => {
        setLoadingGaps(false);
      });
  }, [selectedClassId]);

  const currentClass = classes.find((c) => String(c._id) === selectedClassId);

  // Toggle single gap word
  const handleToggleGapWord = (word: string) => {
    sfx.playPop();
    setSelectedGapWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    );
  };

  // Select all gaps
  const handleSelectAll = () => {
    sfx.playPop();
    if (selectedGapWords.length === classGaps.length) {
      setSelectedGapWords([]);
    } else {
      setSelectedGapWords(classGaps.map((g) => g.english));
    }
  };

  // Select only critical gaps
  const handleSelectCriticalOnly = () => {
    sfx.playPop();
    const criticalWords = classGaps.filter((g) => g.severity === 'critical').map((g) => g.english);
    setSelectedGapWords(criticalWords.length > 0 ? criticalWords : classGaps.map((g) => g.english));
  };

  // Play audio for a word
  const handlePlayWord = (word: string) => {
    sfx.playPop();
    setPlayingWord(word);
    void playWordAudio(word).finally(() => {
      setPlayingWord(null);
    });
  };

  // Selected gap word objects
  const activeReviewWords = useMemo(() => {
    return selectedGapWords.map((word) => {
      const found = classGaps.find((g) => g.english.toLowerCase() === word.toLowerCase());
      return {
        english: word,
        vietnamese: found?.vietnamese || 'từ vựng',
        severity: found?.severity || 'critical',
        accuracyPercent: found?.accuracyPercent,
        tprGesture: getPreschoolTprGesture(word, found?.vietnamese)
      };
    });
  }, [selectedGapWords, classGaps]);

  const gapWordsString = selectedGapWords.join(', ');

  // Copy full remediation plan
  const handleCopyPlan = () => {
    sfx.playPop();
    const lines = [
      `KẾ HOẠCH ÔN TẬP LỖ HỔNG KIẾN THỨC — KCENGLISHKIDS`,
      `Lớp: ${currentClass?.name || 'Mầm non'} (Độ tuổi ${currentClass?.ageGroupCode || '3-4'} tuổi)`,
      `Thời lượng ôn tập: ${duration} phút`,
      `Trọng tâm khắc phục (${selectedGapWords.length} từ bị cảnh báo): ${gapWordsString}`,
      `--------------------------------------------------`,
      `I. BỘ TỪ VỰNG TRỌNG TÂM & ĐỘNG TÁC TPR:`,
      ...activeReviewWords.map((w, idx) => `${idx + 1}. ${w.english} (${w.vietnamese}): ${w.tprGesture}`),
      `--------------------------------------------------`,
      `II. KỊCH BẢN 3 TRẠM HOẠT ĐỘNG ÔN TẬP (${duration} PHÚT):`,
      `1. Trạm 1: Khởi động & Nhận diện phản xạ (3-5 phút)`,
      `   - Cô giơ thẻ từ vựng hoặc làm động tác TPR, cả lớp làm theo và hô to.`,
      `   - Khẩu lệnh mẫu: "Look at teacher! Listen: [Word]! Everyone say: [Word]!"`,
      `2. Trạm 2: Trò chơi vận động củng cố (${duration === 10 ? '4-5' : duration === 15 ? '7-8' : '10-12'} phút)`,
      `   - Tổ chức trò chơi phản xạ nhanh: "Koko Says" hoặc "Đập thẻ tranh (Flashcard Slap)".`,
      `   - Đố nhóm và trao sao khích lệ cho các bé nỗ lực.`,
      `3. Trạm 3: Thử thách cá nhân & Đập tay High-Five (3 phút)`,
      `   - Mời các bé còn ngập ngừng lên chọn tranh và đập tay High-Five khi đọc đúng.`,
      `--------------------------------------------------`,
      `III. TIN NHẮN DẶN DÒ PHỤ HUYNH VỀ NHÀ:`,
      `Hôm nay lớp ${currentClass?.name || ''} đã cùng cô ôn các từ: ${gapWordsString}. Tối nay ba mẹ hãy dành 5 phút đố vui và đập tay khen ngợi con nhé!`
    ];

    if (!navigator.clipboard?.writeText) {
      setError('Trình duyệt chưa hỗ trợ sao chép tự động. Bạn có thể bấm In để lưu PDF.');
      return;
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2500);
    }).catch(() => setError('Chưa thể sao chép bộ nhớ tạm.'));
  };

  // Copy parent notification message
  const handleCopyParentMessage = () => {
    sfx.playPop();
    const msg = `[KC English Kids - Lớp ${currentClass?.name || 'Mầm non'}] Chào ba mẹ! Hôm nay các bé đã cùng cô ôn luyện phản xạ các từ vựng: ${gapWordsString}. Ba mẹ hãy dành 5 phút buổi tối mở ứng dụng KC English Kids mục "5 Phút Ôn Tập Ở Nhà" để cùng bé đố vui và nhận 3 sao may mắn nhé! ❤️`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedParentMsg(true);
      setTimeout(() => setCopiedParentMsg(false), 2500);
    }).catch(() => {});
  };

  const handlePrint = () => {
    sfx.playPop();
    window.print();
  };

  const handleLaunchLiveSession = () => {
    sfx.playPop();
    if (!selectedClassId) return;
    navigate(`/teacher/classes/${selectedClassId}/sessions/new?reviewMode=true&gapWords=${encodeURIComponent(gapWordsString)}`);
  };

  return (
    <div className="mx-auto max-w-[1920px] space-y-7 pb-16 font-sans">
      {/* Top Banner - Chuyên biệt Ôn Tập Lỗ Hổng Kiến Thức */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-6 sm:p-8 text-white shadow-md">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 h-56 w-56 rounded-full bg-black/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-black tracking-wide text-white backdrop-blur-md">
              <Target size={15} className="text-amber-200" />
              <span>CHUYÊN BIỆT ÔN TẬP LỖ HỔNG KIẾN THỨC & TỪ BỊ CẢNH BÁO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Soạn Bài Ôn Lỗ Hổng Kiến Thức Cho Lớp
            </h1>
            <p className="text-sm sm:text-base text-amber-50 font-medium leading-relaxed">
              Hệ thống tự động phát hiện những từ vựng học sinh trong lớp hay làm sai hoặc chưa vững qua các lượt luyện tập.
              Cô giáo chọn các từ bị cảnh báo để tạo nhanh kế hoạch ôn luyện 10–20 phút thực tế với cử chỉ TPR và trò chơi phản xạ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLaunchLiveSession}
              disabled={selectedGapWords.length === 0 || !selectedClassId}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-amber-950 hover:bg-amber-100 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Rocket size={18} className="text-amber-700" />
              <span>Vào Lớp Dạy Tiết Ôn Tập Ngay</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/teacher/classroom-sessions')}
              className="inline-flex items-center gap-2 rounded-2xl bg-black/10 hover:bg-black/20 border border-white/30 px-4 py-3 text-sm font-bold text-white transition-all cursor-pointer"
            >
              <ClipboardList size={18} />
              <span>Nhật ký buổi dạy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls (Class & Gaps Selection), Right Plan View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Sidebar: Class & Warning Words Selection */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-800">
                <Target size={18} />
              </div>
              <h2 className="text-base font-black text-slate-900">1. Chọn Lớp & Từ Cần Ôn</h2>
            </div>

            {/* Select Classroom */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Lớp học mầm non</span>
                {currentClass && (
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-extrabold text-teal-800 border border-teal-200">
                    Độ tuổi {currentClass.ageGroupCode || '3-4'}
                  </span>
                )}
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedGapWords([]);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
              >
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} ({cls.ageGroupCode ? `Nhóm ${cls.ageGroupCode} tuổi` : 'Mầm non'})
                  </option>
                ))}
              </select>
            </div>

            {/* Warning / Gap Words List */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Flame size={15} className="text-amber-600" />
                  <span>Từ Vựng Bị Cảnh Báo ({classGaps.length})</span>
                </label>
                {classGaps.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectCriticalOnly}
                      className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                    >
                      Cần ôn gấp
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                    >
                      {selectedGapWords.length === classGaps.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  </div>
                )}
              </div>

              {loadingGaps ? (
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 text-center text-xs text-amber-800 font-bold flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang tổng hợp các từ vựng cảnh báo của lớp…</span>
                </div>
              ) : classGaps.length === 0 ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 font-bold space-y-1">
                  <p>🎉 Tuyệt vời! Hiện tại lớp không có từ vựng nào bị cảnh báo hổng kiến thức.</p>
                  <p className="text-[11px] text-emerald-700 font-normal">Các bé đều nắm tương đối tốt bài học.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {classGaps.map((gap) => {
                    const isSelected = selectedGapWords.includes(gap.english);
                    const isCritical = gap.severity === 'critical';
                    return (
                      <div
                        key={gap.english}
                        onClick={() => handleToggleGapWord(gap.english)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-amber-600 focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleGapWord(gap.english);
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare size={18} className="text-amber-700" />
                            ) : (
                              <Square size={18} className="text-slate-300" />
                            )}
                          </button>
                          <div>
                            <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                              <span>{gap.english}</span>
                              {gap.vietnamese && (
                                <span className="font-semibold text-slate-500 text-xs">
                                  ({gap.vietnamese})
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {gap.masteredPercent != null ? `${gap.masteredPercent}% thành thạo` : ''}
                              {gap.accuracyPercent != null ? ` • ${gap.accuracyPercent}% đúng` : ' • Nhiều bé làm sai'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            title="Nghe phát âm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayWord(gap.english);
                            }}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Volume2 size={13} className={playingWord === gap.english ? 'animate-bounce text-amber-600' : ''} />
                          </button>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {isCritical ? 'Cần ôn gấp' : 'Nên ôn'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Select Duration */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={14} className="text-teal-800" />
                <span>Thời lượng tiết ôn tập</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { m: 10, label: '10 phút', desc: 'Khởi động đầu giờ' },
                  { m: 15, label: '15 phút', desc: 'Chuẩn tiết phụ đạo' },
                  { m: 20, label: '20 phút', desc: 'Ôn tập chuyên sâu' }
                ].map(({ m, label, desc }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      sfx.playPop();
                      setDuration(m as any);
                    }}
                    className={`rounded-2xl border p-2.5 text-center transition-all cursor-pointer ${
                      duration === m
                        ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20 font-black'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{label}</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Select Teaching Style */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700">Hình thức tổ chức củng cố</label>
              <div className="space-y-2">
                {[
                  {
                    id: 'tpr',
                    title: 'Phản xạ toàn thân TPR (Khuyên dùng)',
                    desc: 'Nhìn tranh - Nghe khẩu lệnh - Cả lớp làm động tác giải phóng năng lượng'
                  },
                  {
                    id: 'game',
                    title: 'Trò chơi phản xạ nhanh & Đập thẻ tranh',
                    desc: 'Trò "Koko Says", "Bốc hộp thần kỳ" và thi đua đập tay theo nhóm'
                  },
                  {
                    id: 'interactive',
                    title: 'Đố vui cá nhân & Đập tay High-Five',
                    desc: 'Khích lệ từng bé còn ngập ngừng lên phát âm và đập tay nhận sao thưởng'
                  }
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      sfx.playPop();
                      setReviewStyle(item.id as any);
                    }}
                    className={`rounded-2xl border p-3 cursor-pointer transition-all ${
                      reviewStyle === item.id
                        ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">{item.title}</span>
                      {reviewStyle === item.id && <Check size={14} className="text-amber-800 font-bold" />}
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-1 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Ghi chú riêng của cô (Tùy chọn)
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="Ví dụ: Gọi bé An và bé Bình lên chơi trước vì 2 bé còn nhầm từ này..."
                className="mt-1.5 w-full rounded-2xl border border-slate-200 p-3 text-xs font-normal focus:outline-none focus:border-amber-500 bg-slate-50"
              />
            </div>
          </div>

          {/* Quick Tip Card */}
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-700 text-white font-bold">
                <Lightbulb size={18} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Mẹo Sư Phạm Ôn Lỗ Hổng Cho Trẻ
                </h3>
                <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                  Trẻ mầm non quên từ vựng vì chưa có liên kết hành động. Khi cho bé làm động tác TPR hài hước (ví dụ: làm tai mèo vuốt râu cho từ <em>cat</em>), não bộ của trẻ ghi nhớ nhanh gấp 3 lần so với chỉ đọc suông!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Instant Actionable Remediation Plan */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle size={18} className="shrink-0 text-rose-800" />
              <span>{error}</span>
            </div>
          )}

          {selectedGapWords.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-2xl">
                🎯
              </div>
              <h3 className="text-base font-black text-slate-800">
                Chưa chọn từ vựng cần ôn tập
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Vui lòng tích chọn ít nhất 1 từ vựng bị cảnh báo ở cột bên trái để hệ thống hiển thị kịch bản ôn luyện chi tiết cho lớp.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="rounded-3xl border border-amber-200 bg-white p-6 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 border border-amber-300">
                        🎯 KẾ HOẠCH ÔN TẬP TRỌNG TÂM
                      </span>
                      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold text-teal-900 border border-teal-200">
                        {currentClass?.name || 'Lớp mầm non'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                        ⏱️ {duration} phút
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
                      Kịch Bản Khắc Phục {activeReviewWords.length} Từ Vựng Cảnh Báo
                    </h2>
                  </div>

                  {/* Actions: Copy & Print */}
                  <div className="flex items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={handleCopyPlan}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      {copiedPlan ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                      {copiedPlan ? 'Đã sao chép!' : 'Sao chép'}
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      <Printer size={14} /> In kế hoạch
                    </button>
                  </div>
                </div>

                {/* Focus Warning Words with TPR gestures */}
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950 block flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-600" />
                    <span>Bộ thẻ từ vựng & Cử chỉ TPR củng cố ({activeReviewWords.length} từ)</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeReviewWords.map((word) => (
                      <div
                        key={word.english}
                        className="rounded-2xl border-2 border-amber-200/80 bg-amber-50/50 p-4 space-y-2 shadow-2xs hover:border-amber-400 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePlayWord(word.english)}
                              className="w-7 h-7 rounded-lg bg-white border border-amber-300 text-amber-700 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-colors"
                            >
                              <Volume2 size={14} className={playingWord === word.english ? 'animate-bounce' : ''} />
                            </button>
                            <span className="font-black text-base text-slate-900">{word.english}</span>
                            <span className="text-xs text-slate-600 font-semibold">({word.vietnamese})</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                            Cảnh báo
                          </span>
                        </div>

                        {/* TPR Action Box */}
                        <div className="rounded-xl bg-white p-2.5 border border-amber-200 text-xs font-medium text-amber-950 space-y-1">
                          <div className="font-bold text-[11px] text-amber-800 flex items-center gap-1">
                            <span>🤸 Động tác TPR của bé:</span>
                          </div>
                          <p className="leading-snug">{word.tprGesture}</p>
                        </div>

                        {/* Teacher Talk Cue */}
                        <div className="text-[11px] text-slate-600 italic font-medium">
                          💬 Khẩu lệnh cô: "Look at teacher! Listen: <strong>{word.english}</strong>! Everyone say: <strong>{word.english}</strong>!"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3 Practical Remediation Stations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-600" />
                    Kịch Bản 3 Trạm Ôn Tập Thực Tế ({duration} Phút)
                  </h3>
                  <span className="text-xs text-slate-500 font-bold">Thực hành phản xạ</span>
                </div>

                {/* Station 1 */}
                <div className="rounded-3xl border border-sky-200 bg-white overflow-hidden shadow-xs">
                  <div className="bg-sky-50 px-5 py-3.5 border-b border-sky-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-sky-600 text-white font-black text-xs flex items-center justify-center">
                        1
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        Trạm 1: Khởi động & Nhận diện phản xạ (3–5 phút)
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-sky-800 bg-white px-2.5 py-0.5 rounded-lg border border-sky-200">
                      ⏱️ 3–5p
                    </span>
                  </div>
                  <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                    <p>
                      • <strong>Hoạt động:</strong> Cô giơ lần lượt thẻ tranh các từ <span className="font-bold text-amber-800">({gapWordsString})</span> hoặc dùng màn chiếu.
                    </p>
                    <p>
                      • <strong>Phương pháp:</strong> Cô làm mẫu động tác TPR thật hài hước, cả lớp vừa bắt chước động tác vừa hô to từ vựng theo nhịp vỗ tay 1-2-3.
                    </p>
                    <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100 text-sky-950 font-semibold text-xs">
                      💡 <em>Ghi chú sư phạm:</em> Tăng tốc độ hô nhanh dần để tạo không khí sôi nổi, trẻ hào hứng giải phóng năng lượng.
                    </div>
                  </div>
                </div>

                {/* Station 2 */}
                <div className="rounded-3xl border border-amber-200 bg-white overflow-hidden shadow-xs">
                  <div className="bg-amber-50 px-5 py-3.5 border-b border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-amber-600 text-white font-black text-xs flex items-center justify-center">
                        2
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        Trạm 2: Trò chơi vận động củng cố ({duration === 10 ? '4–5' : duration === 15 ? '7–8' : '10–12'} phút)
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-amber-800 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200">
                      ⏱️ {duration === 10 ? '4–5' : duration === 15 ? '7–8' : '10–12'}p
                    </span>
                  </div>
                  <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                    <p>
                      • <strong>Trò chơi gợi ý:</strong> <em>"Koko Says (Simon Says)"</em> hoặc <em>"Đập thẻ tranh (Flashcard Slap)"</em>.
                    </p>
                    <p>
                      • <strong>Luật chơi đơn giản:</strong> Cô dán các thẻ tranh lên bảng hoặc rải dưới sàn. Khi cô đọc to một từ vựng bị cảnh báo, đại diện 2 bạn từ 2 đội chạy lên chạm nhanh vào thẻ tranh và đọc to lại từ đó.
                    </p>
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 text-amber-950 font-semibold text-xs">
                      ⭐ Cả 2 bạn đều được cô tặng sticker/sao khen ngợi; không dùng hình thức phạt để bé không bị rụt rè.
                    </div>
                  </div>
                </div>

                {/* Station 3 */}
                <div className="rounded-3xl border border-emerald-200 bg-white overflow-hidden shadow-xs">
                  <div className="bg-emerald-50 px-5 py-3.5 border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                        3
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        Trạm 3: Thử thách cá nhân & Đập tay High-Five (3–5 phút)
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      ⏱️ 3–5p
                    </span>
                  </div>
                  <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                    <p>
                      • <strong>Tương tác cá nhân:</strong> Cô nhẹ nhàng mời các bạn còn ngập ngừng trong lớp lên bốc 1 thẻ tranh bất kỳ.
                    </p>
                    <p>
                      • <strong>Khen ngợi nồng nhiệt:</strong> Khi bé đọc đúng, cô và cả lớp cùng reo hò <em>"Bravo!"</em> và đập tay High-Five thật kêu với bé!
                    </p>
                  </div>
                </div>
              </div>

              {/* Parent Message Suggestion Card */}
              <div className="rounded-3xl border border-teal-200 bg-teal-50/80 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-950 font-black text-sm">
                    <MessageCircle size={18} className="text-teal-700" />
                    <span>Gợi Ý Tin Nhắn Sổ Liên Lạc Gửi Phụ Huynh Tối Nay</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyParentMessage}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    {copiedParentMsg ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                    <span>{copiedParentMsg ? 'Đã sao chép tin nhắn!' : 'Sao chép tin nhắn'}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-teal-200/80 text-xs text-slate-700 leading-relaxed font-medium">
                  "Chào ba mẹ! Hôm nay các bé lớp {currentClass?.name || ''} đã cùng cô ôn luyện phản xạ các từ vựng: <strong className="text-teal-900">{gapWordsString}</strong>. Ba mẹ hãy dành 5 phút buổi tối mở ứng dụng KC English Kids mục <strong>'5 Phút Ôn Tập Ở Nhà'</strong> để cùng bé đố vui và nhận 3 sao may mắn nhé! ❤️"
                </div>
              </div>

              {/* Bottom Quick Action Bar */}
              <div className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-6 text-white flex flex-wrap items-center justify-between gap-4 print:hidden shadow-md">
                <div className="space-y-1">
                  <div className="text-base font-black flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-amber-200" />
                    <span>Sẵn Sàng Mở Lớp Cho Tiết Ôn Tập Này?</span>
                  </div>
                  <p className="text-xs text-amber-100 font-medium max-w-lg">
                    Hệ thống sẽ nạp danh sách {activeReviewWords.length} từ cảnh báo này vào màn chiếu buổi dạy để cô và các bé cùng ôn luyện trực tiếp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchLiveSession}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-amber-950 hover:bg-amber-100 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                >
                  <Rocket size={18} className="text-amber-700" />
                  <span>Vào Lớp Dạy Tiết Ôn Tập Ngay</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
