import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Volume2,
  Lightbulb,
  Gamepad2,
  BookOpen,
  Trophy,
  Flame,
  MessageSquare,
  HandMetal,
  Eye,
  Ear,
  Smile
} from 'lucide-react';
import type { LessonPlan } from '../../types';
import { playWordAudio } from '../../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'warmup' | 'presentation' | 'sentences' | 'games' | 'wrapup' | 'grid';
  lessonPlan: LessonPlan | null;
  loading: boolean;
  currentVocab?: {
    english: string;
    vietnamese?: string;
    pronunciation?: string;
  } | null;
  currentSentence?: {
    english: string;
    vietnamese?: string;
  } | null;
  onSelectTab?: (tab: 'warmup' | 'presentation' | 'sentences' | 'games' | 'wrapup' | 'grid') => void;
}

export const LiveSessionCopilotDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  activeTab,
  lessonPlan,
  loading,
  currentVocab,
  currentSentence,
  onSelectTab
}) => {
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  // Determine active phase according to activeTab if teacher hasn't manually clicked another phase
  const autoPhaseIndex =
    activeTab === 'warmup'
      ? 0
      : activeTab === 'presentation' || activeTab === 'sentences'
      ? 1
      : activeTab === 'games'
      ? 2
      : activeTab === 'wrapup'
      ? 3
      : 3;

  const effectivePhaseIndex = selectedPhaseIndex !== null ? selectedPhaseIndex : autoPhaseIndex;
  const currentPhase = lessonPlan?.phases?.[effectivePhaseIndex] || null;

  const handleCopyCue = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getTprForWord = (word?: string) => {
    if (!word) return 'Cô làm khẩu hình to, kết hợp chỉ tay và nhún chân theo nhịp.';
    const w = word.toLowerCase();
    if (w.includes('book')) return 'Hai lòng bàn tay chắp lại rồi mở ra như trang sách đang lật.';
    if (w.includes('pen') || w.includes('crayon') || w.includes('pencil')) return 'Cầm ngón tay giả vờ vẽ những đường lượn sóng trên không trung.';
    if (w.includes('chair')) return 'Hạ thấp người như chuẩn bị ngồi xuống ghế rồi đứng lên.';
    if (w.includes('table') || w.includes('desk')) return 'Dang hai tay phẳng ngang như mặt bàn vững chãi.';
    if (w.includes('cat')) return 'Vuốt hai má làm râu mèo và kêu "Meow meow".';
    if (w.includes('dog')) return 'Khum hai bàn tay lên đầu làm tai cún vẫy vẫy.';
    if (w.includes('apple')) return 'Đưa nắm tay lên miệng giả vờ cắn một miếng táo giòn tan "Crumch!".';
    if (w.includes('car')) return 'Hai tay giữ vô lăng giả vờ lái xe "Bíp bíp!".';
    if (w.includes('sun')) return 'Hai tay vươn cao tạo thành vòng tròn mặt trời rực rỡ.';
    if (w.includes('bird')) return 'Dang hai cánh tay vỗ nhẹ như chim đang bay.';
    if (w.includes('teacher')) return 'Đặt một tay lên ngực mỉm cười ấm áp và cúi chào thân thiện.';
    return `Cô làm cử chỉ mô phỏng từ "${word}", mời cả lớp cùng làm theo 3 lần.`;
  };

  return (
    <aside
      role="dialog"
      aria-label="AI Teacher Copilot Drawer"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900/98 text-slate-100 shadow-2xl border-l border-white/15 backdrop-blur-xl flex flex-col transition-all duration-300 select-none animate-in slide-in-from-right"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 bg-slate-950/70">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 shadow-md">
            <Sparkles size={20} className="animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">AI TEACHER COPILOT</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                Trực tiếp trên lớp
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white">
              Kịch Bản Nhắc Bài Thời Gian Thực
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          title="Đóng thanh nhắc bài (Esc hoặc Alt+K)"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
        {loading && !lessonPlan ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="text-xs font-semibold text-slate-400">Đang đồng bộ kịch bản giáo án AI…</p>
          </div>
        ) : (
          <>
            {/* Real-time Stage Synchronizer Banner */}
            <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400">Đang chiếu trên máy chiếu:</span>
                <span className="font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 uppercase text-[10px]">
                  {activeTab === 'warmup'
                    ? '0. Ôn Cũ Học Mới'
                    : activeTab === 'presentation'
                    ? '1. Giảng Từ Vựng'
                    : activeTab === 'sentences'
                    ? '2. Dạy Mẫu Câu'
                    : activeTab === 'games'
                    ? '3. Trò Chơi Lớp'
                    : '4. Quản Lý Điểm'}
                </span>
              </div>

              {/* Dynamic Context Card based on active tab */}
              {activeTab === 'presentation' && currentVocab && (
                <div className="rounded-xl bg-slate-950/60 p-3.5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">Từ vựng đang dạy:</span>
                    <button
                      type="button"
                      onClick={() => playWordAudio(currentVocab.english)}
                      className="p-1 text-slate-400 hover:text-amber-300 transition-colors"
                      title="Phát âm mẫu"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-amber-400 uppercase">{currentVocab.english}</span>
                    <span className="text-xs text-slate-300">({currentVocab.vietnamese})</span>
                    {currentVocab.pronunciation && (
                      <span className="text-[11px] font-mono text-slate-400">{currentVocab.pronunciation}</span>
                    )}
                  </div>

                  {/* Immediate TPR Action */}
                  <div className="rounded-lg bg-amber-400/10 p-2.5 border border-amber-400/20 text-xs space-y-1">
                    <div className="font-black text-amber-300 flex items-center gap-1.5">
                      🤸 Cử chỉ TPR gợi ý cô làm mẫu:
                    </div>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {getTprForWord(currentVocab.english)}
                    </p>
                  </div>

                  {/* Suggested Teacher Talk */}
                  <div className="rounded-lg bg-sky-400/10 p-2.5 border border-sky-400/20 text-xs space-y-1">
                    <div className="font-black text-sky-300 flex items-center justify-between">
                      <span>💬 Khẩu lệnh cô nên hô to:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCue(
                            `"Look at the screen! What is this? It's a ${currentVocab.english}! Say it with me: 1, 2, 3: ${currentVocab.english}!"`
                          )
                        }
                        className="text-[10px] text-sky-400 hover:text-white"
                      >
                        {copiedText ? 'Đã sao chép ✓' : 'Sao chép'}
                      </button>
                    </div>
                    <p className="italic text-sky-100 font-bold">
                      "Look at the screen! What is this? It's a {currentVocab.english}! Say it with me: 1, 2, 3: {currentVocab.english}!"
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'warmup' && (
                <div className="rounded-xl bg-slate-950/60 p-3.5 border border-white/10 space-y-2 text-xs">
                  <div className="font-black text-amber-300 flex items-center gap-1.5">
                    <Flame size={14} className="text-orange-400 fill-orange-400" />
                    Kịch bản khởi động (Warm-up Cue):
                  </div>
                  <div className="rounded-lg bg-amber-400/10 p-2.5 border border-amber-400/20 text-xs space-y-1">
                    <div className="font-bold text-amber-200">💬 Khẩu lệnh cô:</div>
                    <p className="italic text-slate-100 font-medium">
                      "Hello little stars! Stand up please, let's dance with Koko! When music plays, we jump! When music stops, we freeze!"
                    </p>
                  </div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">
                    👉 <b>Cử chỉ TPR:</b> Cô vẫy 2 tay, nhún nhảy làm mẫu sư tử dũng mãnh, hô to khẩu lệnh để thu hút 100% sự tập trung của trẻ.
                  </div>
                </div>
              )}

              {activeTab === 'sentences' && (
                <div className="rounded-xl bg-slate-950/60 p-3.5 border border-white/10 space-y-2 text-xs">
                  <div className="font-black text-teal-300 flex items-center gap-1.5">
                    <MessageSquare size={14} />
                    Mẫu câu giao tiếp đang dạy:
                  </div>
                  <div className="text-sm font-black text-white">
                    {currentSentence?.english || 'I see a... / What is this?'}
                  </div>
                  <div className="rounded-lg bg-teal-400/10 p-2.5 border border-teal-400/20 space-y-1">
                    <div className="font-bold text-teal-200">💬 Khẩu lệnh gợi mở:</div>
                    <p className="italic text-slate-100 font-medium">
                      "Look carefully! Who can tell teacher: What do you see? Touch your eyes and say: I see a...!"
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'games' && (
                <div className="rounded-xl bg-slate-950/60 p-3.5 border border-white/10 space-y-2 text-xs">
                  <div className="font-black text-purple-300 flex items-center gap-1.5">
                    <Gamepad2 size={14} />
                    Luật trò chơi lớp học (Game Directions):
                  </div>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    Cô chia lớp thành 2 đội (Đội Koko & Đội Leo). Mời 2 bạn đại diện lên chạm vào màn hình hoặc chọn thẻ đúng. Đội nào nói nhanh và to hơn được thưởng 1 ngôi sao vàng!
                  </p>
                </div>
              )}
            </div>

            {/* Phase Tabs Selector within Drawer */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Xem kịch bản toàn buổi (4 Giai đoạn):
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { idx: 0, label: 'Khởi động', icon: Flame, color: 'text-amber-400' },
                  { idx: 1, label: 'Giảng bài', icon: BookOpen, color: 'text-teal-400' },
                  { idx: 2, label: 'Trò chơi', icon: Gamepad2, color: 'text-purple-400' },
                  { idx: 3, label: 'Tổng kết', icon: Trophy, color: 'text-emerald-400' }
                ].map(({ idx, label, icon: Icon, color }) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedPhaseIndex(idx);
                      if (onSelectTab) {
                        const targetTab = idx === 0 ? 'warmup' : idx === 1 ? 'presentation' : idx === 2 ? 'games' : 'grid';
                        onSelectTab(targetTab);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all cursor-pointer ${
                      effectivePhaseIndex === idx
                        ? 'border-amber-400 bg-amber-400/20 text-white shadow-md'
                        : 'border-white/10 bg-slate-800/60 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={14} className={color} />
                    <span className="text-[10px] font-bold mt-1">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Phase Activities Display */}
            {currentPhase && (
              <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-extrabold text-sm text-white">{currentPhase.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-amber-300">
                    ⏱️ {currentPhase.durationMin} phút
                  </span>
                </div>

                <div className="space-y-3">
                  {currentPhase.activities.map((act, idx) => (
                    <div key={idx} className="rounded-xl bg-slate-900/70 p-3 border border-white/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">• {act.name}</span>
                        <span className="text-[10px] text-slate-400">{act.durationMin}p</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{act.description}</p>

                      {act.teacherTalk && (
                        <div className="rounded-lg bg-sky-500/10 p-2 border border-sky-500/20 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-sky-300 font-bold">
                            <span>💬 Khẩu lệnh cô:</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCue(act.teacherTalk)}
                              className="text-sky-400 hover:text-white"
                            >
                              {copiedText === act.teacherTalk ? 'Đã chép ✓' : 'Sao chép'}
                            </button>
                          </div>
                          <p className="italic text-sky-100 font-semibold leading-snug">"{act.teacherTalk}"</p>
                        </div>
                      )}

                      {act.tprAction && (
                        <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-500/20 space-y-1">
                          <span className="text-[10px] text-amber-300 font-bold block">🤸 Cử chỉ TPR:</span>
                          <p className="text-slate-300 text-[11px] font-medium leading-snug">{act.tprAction}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Classroom Management Commands */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
                <Lightbulb size={13} className="text-amber-400" />
                Khẩu lệnh điều phối lớp học nhanh:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  {
                    label: 'Tập trung chú ý',
                    cue: '1, 2, 3, eyes on me! 👀',
                    icon: Eye
                  },
                  {
                    label: 'Lắng nghe trật tự',
                    cue: 'Listen carefully, hands on knees! 👂',
                    icon: Ear
                  },
                  {
                    label: 'Khen ngợi nỗ lực',
                    cue: 'Good job! High-five little star! 🌟',
                    icon: HandMetal
                  },
                  {
                    label: 'Đồng thanh đọc to',
                    cue: 'Big voice together: 1, 2, 3! 🗣️',
                    icon: Smile
                  }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCopyCue(item.cue)}
                    className="flex flex-col items-start p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between w-full text-slate-400 group-hover:text-amber-300 text-[10px] font-bold">
                      <span className="flex items-center gap-1">
                        <item.icon size={11} /> {item.label}
                      </span>
                      {copiedText === item.cue && <span className="text-emerald-400 font-bold">✓</span>}
                    </div>
                    <div className="text-[11px] font-extrabold text-slate-200 mt-1 leading-snug">{item.cue}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/10 p-3 sm:p-4 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px]">Bấm <b>Esc</b> hoặc nút <b>X</b> để đóng kịch bản.</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 font-bold text-white transition-all cursor-pointer"
        >
          Đóng ngăn kéo
        </button>
      </div>
    </aside>
  );
};
