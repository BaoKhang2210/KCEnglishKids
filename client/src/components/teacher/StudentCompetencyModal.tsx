import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  BookOpen,
  Volume2,
  Ear,
  Sparkles,
  CheckCircle2,
  Check,
  TrendingUp,
  Brain,
  Clock,
  Send,
  Loader2
} from 'lucide-react';
import type { StudentCompetencyReport } from '../../types';
import { studyTimeLabel } from '../../utils/learningMetrics';
import { api } from '../../services/api';
import { StudentAvatar } from '../common/StudentAvatar';

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
  const [editableNote, setEditableNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const totalStars = stats?.totalStars ?? student?.stars ?? 0;
  const completedLessons = stats?.completedLessons ?? 0;
  const learningTimeText = studyTimeLabel(stats?.learningTime, stats?.hasLearningTime);

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

  const parentNoteTemplate = `Dạ kính gửi Phụ huynh bé ${student?.name || 'bé'},
Giáo viên xin gửi thông tin học tập tiếng Anh đã ghi nhận của bé:
🌟 Cấp độ thám hiểm: Level ${report.explorerLevel.level} - ${report.explorerLevel.title} (${totalStars} ⭐)
📚 Vốn từ vựng: Bé đã làm chủ ${report.vocabularyCompetency.masteredCount} từ vựng mới.
🗣️ Phát âm & Phản xạ: Điểm phát âm đạt ${report.pronunciationCompetency.averageScore == null ? 'chưa có dữ liệu' : report.pronunciationCompetency.averageScore + '%'}, nghe hiểu ${report.listeningCompetency.accuracyRate == null ? 'chưa có dữ liệu' : report.listeningCompetency.accuracyRate + '%'}.
💡 Gợi ý đồng hành tại nhà: ${report.recommendedAction}
Chúc bé luôn hào hứng và yêu thích tiếng Anh! ❤️`;

  useEffect(() => {
    if (student) {
      setEditableNote(parentNoteTemplate);
      setSentSuccess(false);
      setSendFeedback(null);
    }
  }, [student?._id, student?.id, isOpen]);

  if (!isOpen || !student) return null;

  const vocabTotal = report.vocabularyCompetency.totalEncountered || 0;
  const vocabMastered = report.vocabularyCompetency.masteredCount || 0;
  const vocabPercent = Math.min(100, Math.round((vocabMastered / (vocabTotal || 1)) * 100));

  const handleSendNoteToParent = async () => {
    const studentId = student?._id || student?.id;
    if (!studentId) {
      setSendFeedback({ type: 'error', text: 'Không xác định được mã học sinh.' });
      return;
    }

    setSendingNote(true);
    setSendFeedback(null);

    try {
      await api.post('/teacher/parent-notifications', {
        childId: studentId,
        teacherNote: editableNote.trim() || parentNoteTemplate,
        subject: 'Đánh giá năng lực 3 trụ cột',
        templateType: 'PROGRESS_UPDATE'
      });

      setSentSuccess(true);
      setSendFeedback({
        type: 'success',
        text: `Đã gửi nhận xét thành công đến Sổ liên lạc của bé ${student.name}! 🎉`
      });
    } catch (err: any) {
      setSendFeedback({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Không thể gửi nhận xét. Vui lòng thử lại.'
      });
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="competency-dialog bg-white rounded-3xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 animate-pop-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-teal-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <StudentAvatar student={student} size="lg" />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/10 text-[10px] font-black uppercase tracking-wider">
                <Brain size={12} />
                <span>Hồ sơ năng lực</span>
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
          <p className="rounded-xl bg-slate-50 p-3">
            Tự luyện: {studyTimeLabel(stats?.practiceLearningTime, (stats?.practiceLearningTime || 0) > 0)} · Trên lớp: {studyTimeLabel(stats?.classroomLearningTime, (stats?.classroomLearningTime || 0) > 0)}. {stats?.hasUnmeasuredLearning ? 'Một số lượt học cũ chưa ghi thời lượng nên chưa được cộng; không ước lượng bằng thời lượng giáo án.' : 'Chỉ cộng thời lượng đã ghi nhận.'}
          </p>
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
              <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 font-black flex items-center gap-1.5">
                <Star size={14} className="fill-amber-400 text-amber-800" />
                <span>{totalStars} Sao</span>
                <span className="text-[10px] font-bold text-slate-500">
                  (Lớp: {stats?.classroomStars ?? stats?.classStars ?? 0} · Nhà: {stats?.homeStars ?? ((stats?.earnedStars || 0) + (stats?.bonusStars || 0) + (stats?.homePracticeStars || 0))})
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-800" />
                <span>{completedLessons} bài hoàn thành</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center gap-1">
                <Clock size={13} className="text-indigo-800" />
                <span>{learningTimeText}</span>
              </div>
            </div>
          </div>

          {/* 3 Pillars: Equal, Unified Rows */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-teal-800" />
              <span>3 trụ cột năng lực</span>
            </h3>

            {/* Trụ cột 1: Độ Thành Thạo Từ Vựng */}
            <div className="competency-pillar p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors">
              <div className="flex items-center gap-3 min-w-[210px]">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Trụ Cột 1</span>
                  <h4 className="text-sm font-black text-slate-900">Thành Thạo Từ Vựng</h4>
                </div>
              </div>
              <div className="flex-1 max-w-sm w-full">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-indigo-800 font-bold">{report.vocabularyCompetency.masteredCount} / {vocabTotal} từ đã thuộc</span>
                  <span className="text-slate-600">{vocabPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${vocabPercent}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {report.vocabularyCompetency.masteredCount} đã thuộc
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  {report.vocabularyCompetency.practicingCount} đang luyện
                </span>
              </div>
            </div>

            {/* Trụ cột 2: Phát Âm & Bật Âm */}
            <div className="competency-pillar p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 transition-colors">
              <div className="flex items-center gap-3 min-w-[210px]">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                  <Volume2 size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Trụ Cột 2</span>
                  <h4 className="text-sm font-black text-slate-900">Phát Âm & Bật Âm</h4>
                </div>
              </div>
              <div className="flex-1 max-w-sm w-full">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-purple-800 font-bold">{report.pronunciationCompetency.confidence || 'Đang rèn luyện'}</span>
                  <span className="text-slate-600">{report.pronunciationCompetency.averageScore == null ? 'Chưa đánh giá' : `${report.pronunciationCompetency.averageScore}%`}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${report.pronunciationCompetency.averageScore ?? 0}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  Koko AI Coach
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {report.pronunciationCompetency.averageScore == null ? '0 sao' : `${report.pronunciationCompetency.starsEarned || 0} ⭐`}
                </span>
              </div>
            </div>

            {/* Trụ cột 3: Nghe Hiểu & Phản Xạ */}
            <div className="competency-pillar p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 transition-colors">
              <div className="flex items-center gap-3 min-w-[210px]">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                  <Ear size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Trụ Cột 3</span>
                  <h4 className="text-sm font-black text-slate-900">Nghe Hiểu & Phản Xạ</h4>
                </div>
              </div>
              <div className="flex-1 max-w-sm w-full">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-teal-800 font-bold">{report.listeningCompetency.reactionSpeed || 'Tốc độ phản xạ tốt'}</span>
                  <span className="text-slate-600">{report.listeningCompetency.accuracyRate == null ? 'Chưa đánh giá' : `${report.listeningCompetency.accuracyRate}%`}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full rounded-full transition-all" style={{ width: `${report.listeningCompetency.accuracyRate || 0}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  Độ chính xác
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {report.listeningCompetency.totalResponses || 0} phản xạ
                </span>
              </div>
            </div>
          </div>

          {/* Section: Actionable Insights & Direct Send to Parent */}
          <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-800" />
                <span>Gửi Nhận Xét Về Sổ Liên Lạc Của Bé</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={sendingNote || sentSuccess}
                  onClick={handleSendNoteToParent}
                  className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {sendingNote ? <Loader2 size={13} className="animate-spin" /> : sentSuccess ? <Check size={13} /> : <Send size={13} />}
                  <span>{sendingNote ? 'Đang gửi…' : sentSuccess ? 'Đã gửi' : 'Gửi nhận xét'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={editableNote}
              disabled={sendingNote || sentSuccess}
              onChange={(e) => setEditableNote(e.target.value)}
              className="w-full p-3 bg-white rounded-xl border border-amber-200/90 text-xs text-slate-700 font-medium leading-relaxed focus:outline-teal-600"
              placeholder="Nhập lời nhận xét gửi phụ huynh..."
            />

            {sendFeedback && (
              <p role="status" className={`text-xs font-bold ${sendFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {sendFeedback.text}
              </p>
            )}
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
