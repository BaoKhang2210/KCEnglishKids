import React, { useState } from 'react';
import {
  X,
  Star,
  BookOpen,
  Volume2,
  Ear,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  TrendingUp,
  Brain,
  Clock
} from 'lucide-react';
import type { StudentCompetencyReport } from '../../types';

interface StudentCompetencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  stats?: any;
  competencyReport?: StudentCompetencyReport;
}

export const StudentCompetencyModal: React.FC<StudentCompetencyModalProps> = ({
  isOpen,
  onClose,
  student,
  stats,
  competencyReport
}) => {
  const [copiedNote, setCopiedNote] = useState(false);

  if (!isOpen || !student) return null;

  const totalStars = stats?.totalStars ?? student?.stars ?? 0;
  const completedLessons = stats?.completedLessons ?? 0;
  const learningMinutes = Math.round((stats?.learningTime || 0) / 60);

  // Fallback report if not returned from backend
  const report = competencyReport || {
    explorerLevel: {
      level: totalStars > 300 ? 4 : totalStars > 150 ? 3 : totalStars > 50 ? 2 : 1,
      title: totalStars > 300 ? 'Đại Sứ Anh Ngữ Nhí' : totalStars > 150 ? 'Bạn Nhỏ Tự Tin' : totalStars > 50 ? 'Thám Hiểm Tí Hon' : 'Mầm Nhí Khám Phá',
      titleEn: totalStars > 300 ? 'Master Explorer' : totalStars > 150 ? 'Confident Star' : totalStars > 50 ? 'Little Adventurer' : 'Sprout Explorer',
      icon: totalStars > 300 ? '👑' : totalStars > 150 ? '🦁' : totalStars > 50 ? '🎒' : '🌱',
      minStars: 0,
      maxStars: 150,
      currentStars: totalStars,
      progressPercent: Math.min(100, Math.round((totalStars / 150) * 100))
    },
    vocabularyCompetency: {
      totalEncountered: 0,
      masteredCount: 0,
      practicingCount: 0,
      learningCount: 0,
      masteredWords: [],
      needsReviewWords: []
    },
    listeningCompetency: {
      accuracyRate: null,
      totalResponses: 0,
      correctResponses: 0,
      reactionSpeed: 'Chưa có dữ liệu phản xạ',
      status: 'NOT_ASSESSED'
    },
    pronunciationCompetency: {
      averageScore: null,
      confidence: 'Chưa có dữ liệu đánh giá phát âm',
      starsEarned: 0
    },
    recommendedAction: 'Chưa có dữ liệu để nhận xét. Hãy theo dõi thêm các hoạt động của bé.'
  };

  const parentNoteTemplate = `Dạ kính gửi Phụ huynh bé ${student.name},
Giáo viên xin gửi thông tin học tập tiếng Anh đã ghi nhận của bé:
🌟 Cấp độ thám hiểm: Level ${report.explorerLevel.level} - ${report.explorerLevel.title} (${totalStars} ⭐)
📚 Vốn từ vựng: Bé đã làm chủ ${report.vocabularyCompetency.masteredCount} từ vựng mới.
🗣️ Phát âm & Phản xạ: Điểm phát âm đạt ${report.pronunciationCompetency.averageScore == null ? 'chưa có dữ liệu' : report.pronunciationCompetency.averageScore + '%'}, nghe hiểu ${report.listeningCompetency.accuracyRate == null ? 'chưa có dữ liệu' : report.listeningCompetency.accuracyRate + '%' }.
💡 Gợi ý đồng hành tại nhà: ${report.recommendedAction}
Chúc bé luôn hào hứng và yêu thích tiếng Anh! ❤️`;

  const handleCopy = () => {
    navigator.clipboard.writeText(parentNoteTemplate);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 animate-pop-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-teal-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-black/10 backdrop-blur-md flex items-center justify-center text-2xl font-bold shrink-0">
              {student.avatar === 'lion' ? '🦁' : student.avatar === 'panda' ? '🐼' : student.avatar === 'rabbit' ? '🐰' : '🎒'}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/10 text-[10px] font-black uppercase tracking-wider">
                <Brain size={12} />
                <span>Hồ Sơ Năng Lực Sư Phạm Mầm Non</span>
              </div>
              <h2 className="text-xl font-black">{student.name}</h2>
              <p className="text-xs text-inherit font-medium">
                Khối {student.ageGroupCode || '3-4'} tuổi • {student.assignedClass?.name || 'Lớp học mầm non'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/10 hover:bg-black/10 flex items-center justify-center transition-colors cursor-pointer text-inherit"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          {/* Top Banner: Explorer Level & Stars */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl">
                {report.explorerLevel.icon}
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block">
                  Cột Mốc Cấp Độ Trưởng Thành
                </span>
                <span className="text-base font-black text-slate-900">
                  Level {report.explorerLevel.level}: {report.explorerLevel.title}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 font-black flex items-center gap-1">
                <Star size={14} className="fill-amber-400 text-amber-800" />
                <span>{totalStars} Sao</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-800" />
                <span>{completedLessons} bài hoàn thành</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center gap-1">
                <Clock size={13} className="text-indigo-800" />
                <span>{learningMinutes} phút học</span>
              </div>
            </div>
          </div>

          {/* 3 Pillars Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-teal-800" />
              <span>3 Trụ Cột Năng Lực Đánh Giá (Competency Radar)</span>
            </h3>

            {/* Pillar 1: Vocabulary Mastery */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <BookOpen size={16} className="text-indigo-800" />
                  <span>Trụ cột 1: Độ Thành Thạo Từ Vựng (Vocabulary Mastery)</span>
                </div>
                <span className="text-[11px] font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {report.vocabularyCompetency.masteredCount} / {report.vocabularyCompetency.totalEncountered || 15} từ đã thuộc
                </span>
              </div>

              {/* Mastery Counters */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">🟢 Đã Thuộc Lòng</span>
                  <span className="text-lg font-black text-emerald-800">{report.vocabularyCompetency.masteredCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                  <span className="text-[10px] font-bold text-sky-800 uppercase block">🔵 Đang Luyện Tập</span>
                  <span className="text-lg font-black text-sky-800">{report.vocabularyCompetency.practicingCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">🟡 Đang Làm Quen</span>
                  <span className="text-lg font-black text-amber-800">{report.vocabularyCompetency.learningCount}</span>
                </div>
              </div>

              {/* Mastered and Needs Review Words Tags */}
              <div className="space-y-2 pt-1">
                {report.vocabularyCompetency.masteredWords.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Từ bé nắm chắc nhất:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.vocabularyCompetency.masteredWords.map((w, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 text-[11px] font-bold border border-emerald-200"
                        >
                          <CheckCircle2 size={12} className="text-emerald-800" />
                          <span>{w.english}</span>
                          {w.vietnamese && <span className="opacity-70 font-normal">({w.vietnamese})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {report.vocabularyCompetency.needsReviewWords.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block mb-1">
                      Từ bé hay nhầm (cần cô & mẹ hỗ trợ):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.vocabularyCompetency.needsReviewWords.map((w, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-[11px] font-bold border border-rose-200"
                        >
                          <AlertTriangle size={12} className="text-rose-800" />
                          <span>{w.english}</span>
                          {w.vietnamese && <span className="opacity-70 font-normal">({w.vietnamese})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pillar 2 & Pillar 3 Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pillar 2: Speaking */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Volume2 size={16} className="text-purple-800" />
                  <span>Trụ cột 2: Phát Âm & Bật Âm</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-black text-purple-800">
                    {report.pronunciationCompetency.averageScore == null ? 'Chưa đánh giá' : report.pronunciationCompetency.averageScore + '%'}
                  </span>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                    Koko AI Coach
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-700 h-full rounded-full transition-all"
                    style={{ width: `${report.pronunciationCompetency.averageScore ?? 0}%` }}
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-600">
                  Đánh giá: <b>{report.pronunciationCompetency.confidence}</b>
                </p>
              </div>

              {/* Pillar 3: Listening */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Ear size={16} className="text-teal-800" />
                  <span>Trụ cột 3: Nghe Hiểu & Phản Xạ</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-black text-teal-800">
                    {report.listeningCompetency.accuracyRate == null ? 'Chưa đánh giá' : report.listeningCompetency.accuracyRate + '%'}
                  </span>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                    Độ chính xác
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-700 h-full rounded-full transition-all"
                    style={{ width: `${report.listeningCompetency.accuracyRate || 0}%` }}
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-600">
                  Tốc độ: <b>{report.listeningCompetency.reactionSpeed}</b>
                </p>
              </div>
            </div>
          </div>

          {/* Section: Actionable Insights for Parents */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-800" />
                <span>Gợi Ý Tin Nhắn Sổ Liên Lạc Gửi Phụ Huynh</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 rounded-xl bg-amber-700 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedNote ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedNote ? 'Đã sao chép!' : 'Sao chép tin nhắn'}</span>
              </button>
            </div>

            <div className="p-3 bg-white rounded-xl border border-amber-200/80 text-[11px] text-slate-700 font-medium whitespace-pre-line leading-relaxed">
              {parentNoteTemplate}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-600">
            Dữ liệu được cập nhật tự động từ lịch sử tương tác và buổi học của bé.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-700 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
};
