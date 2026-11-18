import React, { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Star,
  CheckCircle2,
  MessageCircle,
  Heart,
  Loader2,
  Calendar,
  Sparkles,
  Clock,
  MapPin,
  UserCheck,
  Send,
  Info,
  Award
} from 'lucide-react';
import { parentNotificationApi } from '../../services/api';
import { vocabStatsService, type Stage2PracticeSession } from '../../services/vocabStatsService';
import { sfx } from '../../utils/audio';

interface ParentNotificationItem {
  _id: string;
  subject: string;
  content: string;
  teacherNote?: string;
  stars?: number;
  score?: number;
  sentAt?: string;
  createdAt?: string;
  className?: string;
  teacher?: {
    _id: string;
    name: string;
    email?: string;
  };
  parentFeedback?: {
    message: string;
    senderName?: string;
    createdAt?: string;
  };
  replies?: Array<{
    _id?: string;
    senderRole: string;
    senderName: string;
    message: string;
    createdAt?: string;
  }>;
}

interface WeeklySlot {
  _id?: string;
  dayOfWeek: number; // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
  startTime: string;
  endTime: string;
  subjectNote?: string;
  room?: string;
}

interface CancelledSessionItem {
  _id: string;
  startedAt?: string;
  createdAt?: string;
  dateString?: string;
  dayOfWeek?: number | null;
  cancellationReason?: string;
  cancellationNote?: string;
}

interface ScheduleData {
  classroom: {
    _id: string;
    name: string;
    room?: string;
    academicYear?: string;
    ageGroup?: string;
    teacher?: {
      _id: string;
      name: string;
      email?: string;
      avatar?: string;
    };
  } | null;
  schedule: {
    _id: string;
    academicYear?: string;
    colorTag?: string;
    weeklySlots: WeeklySlot[];
    teacher?: {
      _id: string;
      name: string;
      email?: string;
      avatar?: string;
    };
  } | null;
  cancelledSessions?: CancelledSessionItem[];
}

interface ParentNotebookModalProps {
  childId: string;
  childName: string;
  onClose: () => void;
}

const DAY_NAMES: Record<number, string> = {
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
  0: 'Chủ Nhật'
};

const DAY_BADGES: Record<number, { bg: string; text: string; border: string; pill: string }> = {
  1: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', pill: 'bg-blue-600' },
  2: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', pill: 'bg-emerald-600' },
  3: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', pill: 'bg-amber-600' },
  4: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', pill: 'bg-purple-600' },
  5: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', pill: 'bg-rose-600' },
  6: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', pill: 'bg-teal-600' },
  0: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', pill: 'bg-orange-600' }
};

export const ParentNotebookModal: React.FC<ParentNotebookModalProps> = ({
  childId,
  childName,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'SCHEDULE'>('NOTIFICATIONS');
  const [items, setItems] = useState<ParentNotificationItem[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [practiceSessions, setPracticeSessions] = useState<Stage2PracticeSession[]>(() =>
    vocabStatsService.getAllStage2Sessions(childId)
  );
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<Record<string, boolean>>({});
  const [feedbackSuccess, setFeedbackSuccess] = useState<Record<string, boolean>>({});

  const handleSendFeedback = async (notifId: string) => {
    const text = feedbackText[notifId]?.trim();
    if (!text) return;

    setSubmittingFeedback(prev => ({ ...prev, [notifId]: true }));
    try {
      const res = await parentNotificationApi.sendParentFeedback(childId, notifId, {
        message: text,
        senderName: 'Phụ huynh bé ' + childName
      });
      sfx.playCorrect();
      setFeedbackSuccess(prev => ({ ...prev, [notifId]: true }));
      setFeedbackText(prev => ({ ...prev, [notifId]: '' }));

      setItems(prev => prev.map(it => {
        if (it._id !== notifId) return it;
        const newReplies = [...(it.replies || []), res.data.feedback || {
          senderRole: 'PARENT',
          senderName: 'Phụ huynh bé ' + childName,
          message: text,
          createdAt: new Date().toISOString()
        }];
        return { ...it, replies: newReplies, parentFeedback: res.data.feedback };
      }));

      setTimeout(() => {
        setFeedbackSuccess(prev => ({ ...prev, [notifId]: false }));
      }, 4000);
    } catch (e) {
      console.error('Failed to send parent feedback:', e);
    } finally {
      setSubmittingFeedback(prev => ({ ...prev, [notifId]: false }));
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await parentNotificationApi.getChildNotificationsForParent(childId);
      setItems(res.data || []);
      (res.data || []).forEach((item: ParentNotificationItem) => {
        void parentNotificationApi.markAsReadByParent(childId, item._id);
      });
    } catch (e) {
      console.error('Failed to load parent notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const res = await parentNotificationApi.getChildSchedule(childId);
      setScheduleData(res.data || null);
    } catch (e) {
      console.error('Failed to load child schedule:', e);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
    void loadSchedule();
    void vocabStatsService.syncFromServer(childId).then(() => {
      setPracticeSessions(vocabStatsService.getAllStage2Sessions(childId));
    });
    const onSaved = () => setPracticeSessions(vocabStatsService.getAllStage2Sessions(childId));
    window.addEventListener('kc_stage2_session_saved', onSaved);
    return () => window.removeEventListener('kc_stage2_session_saved', onSaved);
  }, [childId]);

  // Determine today's day of week: 0=CN, 1=T2, ... 6=T7
  const todayDayOfWeek = new Date().getDay();

  // Sort weekly slots logically: 1 (Mon) -> 6 (Sat) -> 0 (Sun)
  const sortedSlots = [...(scheduleData?.schedule?.weeklySlots || [])].sort((a, b) => {
    const dayOrderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const dayOrderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5 lg:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl lg:max-w-5xl h-[92vh] max-h-[880px] flex flex-col rounded-[28px] sm:rounded-[36px] bg-white shadow-2xl border-4 border-amber-300 overflow-hidden">
        
        {/* ===================== MODAL HEADER ===================== */}
        <div className="px-5 sm:px-8 pt-5 pb-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 border-b-2 border-amber-300 text-amber-950 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[20px] bg-white/90 shadow-md flex items-center justify-center text-amber-600 text-2xl sm:text-3xl shrink-0 border-2 border-amber-200">
                📒
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight flex items-center gap-1.5 text-amber-950">
                    Sổ Bé Ngoan & Thời Khóa Biểu
                    <Heart size={20} className="text-rose-500 fill-rose-500 inline shrink-0" />
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-black bg-white/80 text-amber-900 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                    <Sparkles size={13} className="text-amber-500" /> Năm học 2026-2027
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-amber-900/90 mt-0.5 flex items-center gap-1.5">
                  Nhật ký liên lạc gia đình & lịch học trên lớp của bé:
                  <span className="inline-block bg-amber-900 text-amber-100 font-black px-2.5 py-0.5 rounded-lg text-xs shadow-2xs">
                    {childName}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sfx.playPop();
                onClose();
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/70 hover:bg-white text-amber-950 flex items-center justify-center shadow-xs hover:shadow transition-all cursor-pointer shrink-0 border border-amber-200/80 active:scale-95"
              title="Đóng sổ liên lạc"
            >
              <X size={22} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Navigation Tabs (2 Large Playful Tabs) */}
          <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:gap-4">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveTab('NOTIFICATIONS');
              }}
              className={`py-2.5 sm:py-3 px-3 sm:px-5 rounded-2xl text-xs sm:text-base font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-white text-amber-950 shadow-md scale-[1.01] ring-2 ring-amber-400'
                  : 'bg-amber-500/30 text-amber-950 hover:bg-amber-500/50'
              }`}
            >
              <MessageCircle size={18} className="text-amber-600" />
              <span>Lời Nhắn & Đánh Giá</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-black/10 text-amber-950'
              }`}>
                {items.length}
              </span>
            </button>

            <button
              onClick={() => {
                sfx.playPop();
                setActiveTab('SCHEDULE');
              }}
              className={`py-2.5 sm:py-3 px-3 sm:px-5 rounded-2xl text-xs sm:text-base font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'SCHEDULE'
                  ? 'bg-white text-indigo-950 shadow-md scale-[1.01] ring-2 ring-indigo-400'
                  : 'bg-amber-500/30 text-amber-950 hover:bg-amber-500/50'
              }`}
            >
              <Calendar size={18} className="text-indigo-600" />
              <span>Thời Khóa Biểu & Báo Nghỉ</span>
              {scheduleData?.cancelledSessions && scheduleData.cancelledSessions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white animate-pulse">
                  {scheduleData.cancelledSessions.length} nghỉ
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ===================== MODAL BODY ===================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/70">
          
          {/* TAB 1: NOTIFICATIONS & TEACHER EVALUATION CARDS */}
          {activeTab === 'NOTIFICATIONS' && (
            loading ? (
              <div className="py-28 flex flex-col items-center justify-center text-slate-400 text-sm font-bold">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" />
                <span className="text-base text-slate-600 font-extrabold">Đang tải phiếu thông báo của bé...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border-2 border-dashed border-amber-200 p-8 sm:p-12 shadow-xs">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center text-4xl shadow-inner border border-amber-200">
                  💌
                </div>
                <h3 className="text-xl font-black text-slate-800">Chưa có phiếu nhận xét mới từ cô giáo</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                  Khi cô giáo gửi đánh giá học tập, phiếu bé ngoan hoặc dặn dò cho bé, gia đình sẽ nhận được thông báo chi tiết ngay tại đây!
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider">
                      Danh sách phiếu nhận xét ({items.length} phiếu)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    Sắp xếp theo thời gian mới nhất
                  </span>
                </div>

                {items.map((item) => {
                  const itemDate = item.createdAt ? new Date(item.createdAt) : (item.sentAt ? new Date(item.sentAt) : null);
                  const formattedDate = itemDate
                    ? itemDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + itemDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'Thông báo gần đây';

                  return (
                    <div
                      key={item._id}
                      className="rounded-3xl border-2 border-amber-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                    >
                      {/* Card Header Bar */}
                      <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 px-5 sm:px-6 py-3.5 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 font-black text-xs flex items-center justify-center shadow-2xs border border-amber-300">
                            👩‍🏫
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                                {item.subject || 'Phiếu Nhận Xét Học Tập'}
                              </h4>
                              <span className="text-xs bg-amber-200/80 text-amber-950 font-black px-2.5 py-0.5 rounded-full border border-amber-300">
                                Cô {item.teacher?.name || 'giáo viên phụ trách'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-400 block mt-0.5">
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={13} /> Đã gửi phụ huynh
                          </span>
                        </div>
                      </div>

                      {/* Card Main Content */}
                      <div className="p-5 sm:p-6 space-y-4">
                        {/* Rating & Performance Metrics Banner */}
                        {(item.stars !== undefined || item.score !== undefined) && (
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-3.5 sm:p-4 rounded-2xl border-2 border-amber-200 text-sm">
                            <div className="flex items-center gap-2 font-black text-amber-900">
                              <Award size={18} className="text-amber-600" />
                              <span>Kết quả học tập của bé:</span>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              {item.stars !== undefined && item.stars > 0 && (
                                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs font-black text-amber-800 text-xs sm:text-sm">
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        size={16}
                                        className={
                                          i < (item.stars || 0)
                                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                                            : 'text-slate-200'
                                        }
                                      />
                                    ))}
                                  </div>
                                  <span className="ml-1">{item.stars}/5 Sao</span>
                                </div>
                              )}

                              {item.score !== undefined && item.score > 0 && (
                                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 font-black text-emerald-800 text-xs sm:text-sm shadow-2xs">
                                  <CheckCircle2 size={16} className="text-emerald-600" />
                                  <span>Điểm hoàn thành: {item.score}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Teacher's Message Quote */}
                        <div className="p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/90 text-sm sm:text-base text-slate-800 leading-relaxed font-medium relative">
                          <span className="text-xs font-black text-amber-800 uppercase tracking-wider block mb-1.5">
                            📝 Lời dặn từ cô giáo:
                          </span>
                          <p className="whitespace-pre-wrap">
                            {item.content || item.teacherNote || 'Cô giáo gửi lời nhắn yêu thương tới bé và gia đình.'}
                          </p>
                        </div>

                        {/* Replies Thread (2-way Communication) */}
                        {item.replies && item.replies.length > 0 && (
                          <div className="space-y-2.5 pt-2 border-t border-slate-100">
                            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                              <MessageCircle size={14} className="text-amber-600" />
                              Lời nhắn & phản hồi của gia đình ({item.replies.length}):
                            </span>
                            <div className="space-y-2">
                              {item.replies.map((rep, rIdx) => (
                                <div
                                  key={rep._id || rIdx}
                                  className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs sm:text-sm text-slate-800"
                                >
                                  <div className="flex items-center justify-between text-xs font-black text-amber-950 mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                      <span>💬</span>
                                      <span>{rep.senderName}</span>
                                    </span>
                                    <span className="text-slate-400 font-medium text-[11px]">
                                      {rep.createdAt
                                        ? new Date(rep.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(rep.createdAt).toLocaleDateString('vi-VN')
                                        : ''}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap leading-relaxed text-slate-900 font-semibold">
                                    {rep.message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reply Input Box for Parents */}
                        <div className="pt-3 border-t border-slate-100 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                              <Mail size={15} className="text-teal-700" />
                              <span>Gửi phản hồi / dặn dò cô giáo cho buổi học tiếp theo:</span>
                            </label>
                            {feedbackSuccess[item._id] && (
                              <span className="text-emerald-700 font-black flex items-center gap-1 text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300 animate-in fade-in">
                                <CheckCircle2 size={14} /> Đã gửi phản hồi cho cô giáo!
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
                            <textarea
                              rows={2}
                              value={feedbackText[item._id] || ''}
                              onChange={(e) => setFeedbackText(prev => ({ ...prev, [item._id]: e.target.value }))}
                              placeholder="Ví dụ: Dạ em cảm ơn cô. Hôm nay bé ở nhà có ôn bài từ vựng, nhờ cô để ý cho bé uống nước giúp gia đình nhé ạ..."
                              className="flex-1 p-3.5 rounded-2xl border-2 border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 bg-white resize-none shadow-2xs font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => void handleSendFeedback(item._id)}
                              disabled={submittingFeedback[item._id] || !(feedbackText[item._id] || '').trim()}
                              className="px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg active:scale-95 shrink-0"
                              title="Gửi phản hồi cho cô giáo"
                            >
                              {submittingFeedback[item._id] ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Send size={16} />
                              )}
                              <span>Gửi Cô Giáo</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: CLASS SCHEDULE & CANCELLED NOTIFICATIONS */}
          {activeTab === 'SCHEDULE' && (
            loadingSchedule ? (
              <div className="py-28 flex flex-col items-center justify-center text-slate-400 text-sm font-bold">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
                <span className="text-base text-slate-600 font-extrabold">Đang tải thời khóa biểu lớp học…</span>
              </div>
            ) : !scheduleData?.classroom ? (
              <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border-2 border-dashed border-indigo-200 p-8 sm:p-12 shadow-xs">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-4xl shadow-inner border border-indigo-200">
                  🏫
                </div>
                <h3 className="text-xl font-black text-slate-800">Bé chưa được xếp vào lớp học chính thức</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                  Khi ban giám hiệu hoặc giáo viên xếp bé vào lớp học mầm non, toàn bộ thời khóa biểu hàng tuần và thông báo lịch học sẽ tự động hiển thị tại đây!
                </p>
              </div>
            ) : sortedSlots.length === 0 ? (
              <div className="space-y-6">
                {/* Classroom Summary Hero Card */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 text-white shadow-lg border-2 border-indigo-400/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl shadow-inner shrink-0 border border-white/30">
                        🏫
                      </div>
                      <div>
                        <span className="text-xs uppercase font-black tracking-widest text-indigo-200">Lớp học của bé</span>
                        <h3 className="text-2xl font-black leading-tight text-white">{scheduleData.classroom.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-indigo-100 mt-1">
                          {scheduleData.classroom.teacher && (
                            <span className="flex items-center gap-1.5 font-bold">
                              <UserCheck size={14} className="text-amber-300" /> Cô: {scheduleData.classroom.teacher.name}
                            </span>
                          )}
                          {scheduleData.classroom.room && (
                            <span className="flex items-center gap-1.5 font-bold">
                              <MapPin size={14} className="text-pink-300" /> {scheduleData.classroom.room}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 shadow-xs">
                  <p className="text-base font-black text-slate-700">Lớp đang cập nhật thời khóa biểu hàng tuần</p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
                    Nhà trường và giáo viên phụ trách đang sắp xếp khung giờ học cho lớp {scheduleData.classroom.name}. Ba mẹ vui lòng quay lại sau ít phút nhé!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Classroom Hero Overview Banner */}
                <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-3xl p-6 text-white shadow-lg border-2 border-indigo-400/30 relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-[22px] bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner shrink-0 border border-white/30">
                        🏫
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] uppercase font-black tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full border border-white/30">
                            Niên khóa {scheduleData.schedule?.academicYear || scheduleData.classroom.academicYear || '2026-2027'}
                          </span>
                          <span className="text-xs text-indigo-100 font-bold flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-300" /> {sortedSlots.length} buổi học / tuần
                          </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black leading-tight text-white tracking-tight">
                          {scheduleData.classroom.name}
                        </h3>
                        {scheduleData.classroom.ageGroup && (
                          <span className="text-xs text-indigo-200 font-bold block mt-0.5">
                            Độ tuổi: {scheduleData.classroom.ageGroup}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 bg-black/20 backdrop-blur-md p-3.5 sm:px-5 sm:py-3 rounded-2xl border border-white/20 self-start sm:self-auto">
                      <div className="flex items-center gap-2 text-xs text-indigo-200 font-bold">
                        <UserCheck size={16} className="text-amber-300" />
                        <span>Giáo viên phụ trách lớp</span>
                      </div>
                      <span className="text-base sm:text-lg font-black text-white">
                        {scheduleData.schedule?.teacher?.name || scheduleData.classroom.teacher?.name || 'Cô giáo'}
                      </span>
                      {scheduleData.classroom.room && (
                        <span className="text-xs text-pink-200 font-bold flex items-center gap-1">
                          <MapPin size={12} /> {scheduleData.classroom.room}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PROMINENT CANCELLED SESSIONS ALERT BANNER */}
                {scheduleData.cancelledSessions && scheduleData.cancelledSessions.length > 0 && (
                  <div className="p-5 sm:p-6 rounded-3xl bg-amber-50 border-3 border-amber-300 text-amber-950 space-y-3 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-200 border-2 border-amber-400 flex items-center justify-center text-xl shrink-0">
                          📢
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-black text-amber-950 leading-tight">
                            Thông Báo Lịch Báo Nghỉ Học Của Lớp ({scheduleData.cancelledSessions.length} buổi)
                          </h4>
                          <span className="text-xs text-amber-800 font-bold">
                            Thông báo cập nhật mới nhất từ giáo viên phụ trách
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black bg-amber-200 text-amber-950 px-3 py-1.5 rounded-full border border-amber-300 self-start sm:self-auto shrink-0 shadow-2xs flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-700" /> Bảo lưu bài học sang buổi sau
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {scheduleData.cancelledSessions.slice(0, 6).map((cs) => {
                        const dStr = cs.dateString || (cs.startedAt ? new Date(cs.startedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : '');
                        const formattedDate = dStr
                          ? new Date(`${dStr}T12:00:00+07:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                          : 'Buổi học gần đây';

                        return (
                          <div
                            key={cs._id}
                            className="p-3.5 rounded-2xl bg-white border-2 border-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-base leading-none mt-0.5">🚫</span>
                              <div>
                                <span className="font-black text-amber-950 text-sm">{formattedDate}:</span>{' '}
                                <span className="font-extrabold text-amber-900">
                                  {cs.cancellationReason || 'Nghỉ theo kế hoạch đột xuất của lớp'}
                                </span>
                                {cs.cancellationNote && (
                                  <span className="text-amber-800 italic ml-1 block sm:inline font-medium">
                                    — Dặn dò: &ldquo;{cs.cancellationNote}&rdquo;
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 self-start sm:self-auto shrink-0">
                              Tạm hoãn buổi này
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-amber-100/70 rounded-2xl border border-amber-300/80 text-xs text-amber-900 font-bold flex items-center gap-2">
                      <Info size={16} className="text-amber-700 shrink-0" />
                      <span>
                        <b>Ba mẹ yên tâm:</b> Hệ thống sẽ tự động dời bài học sang buổi tiếp theo, bé sẽ không bị mất bất kỳ bài học hoặc điểm thi đua nào!
                      </span>
                    </div>
                  </div>
                )}

                {/* WEEKLY TIMETABLE SLOTS GRID */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <span className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
                      <Calendar size={18} className="text-indigo-600" />
                      Chi Tiết Các Buổi Học Trong Tuần ({sortedSlots.length} buổi):
                    </span>
                    <span className="text-xs sm:text-sm font-black text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200 shadow-2xs">
                      Hôm nay là: {DAY_NAMES[todayDayOfWeek] || 'Hôm nay'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedSlots.map((slot, idx) => {
                      const isToday = slot.dayOfWeek === todayDayOfWeek;
                      const dayName = DAY_NAMES[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`;
                      const badgeStyle = DAY_BADGES[slot.dayOfWeek] || DAY_BADGES[1];

                      const matchedCancelledList = (scheduleData.cancelledSessions || []).filter((cs) => {
                        if (cs.dayOfWeek !== undefined && cs.dayOfWeek !== null) {
                          return cs.dayOfWeek === slot.dayOfWeek;
                        }
                        const dStr = cs.dateString || (cs.startedAt ? new Date(cs.startedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : '');
                        if (!dStr) return false;
                        return new Date(`${dStr}T12:00:00+07:00`).getDay() === slot.dayOfWeek;
                      });
                      const latestCancelledForDay = matchedCancelledList[0] || null;

                      return (
                        <div
                          key={slot._id || idx}
                          className={`rounded-3xl border-2 p-5 transition-all shadow-xs flex flex-col justify-between ${
                            latestCancelledForDay
                              ? 'border-amber-300 bg-amber-50/50'
                              : isToday
                              ? 'border-indigo-400 ring-4 ring-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 shadow-md scale-[1.01]'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div>
                            {/* Card Top: Day Pill & Status Badge */}
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-black border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} shadow-2xs`}>
                                  {dayName}
                                </span>

                                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-2xl">
                                  <Clock size={15} className="text-indigo-600" />
                                  <span>{slot.startTime} – {slot.endTime}</span>
                                </div>
                              </div>

                              {latestCancelledForDay ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-amber-200 text-amber-950 border border-amber-300 px-3 py-1 rounded-full shadow-2xs">
                                  🚫 Báo nghỉ
                                </span>
                              ) : isToday ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-amber-400 text-amber-950 px-3 py-1 rounded-full shadow-xs animate-pulse">
                                  <Sparkles size={12} /> Tiết học hôm nay!
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                  Định kỳ
                                </span>
                              )}
                            </div>

                            {/* Subject & Activity Info */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100/90 mb-3">
                              <div className="flex items-center gap-2 text-sm sm:text-base font-black text-slate-800">
                                <span className="text-xl">🇬🇧</span>
                                <span>{slot.subjectNote || 'Tiết học Tiếng Anh Mầm Non tương tác'}</span>
                              </div>
                              <span className="text-xs text-slate-500 font-bold block mt-1 ml-7">
                                Chương trình tương tác phát triển kỹ năng chuẩn CEFR Pre-A1
                              </span>
                            </div>

                            {/* Cancellation Detail Box (if cancelled) */}
                            {latestCancelledForDay && (
                              <div className="p-3 rounded-2xl bg-amber-100/90 border-2 border-amber-300 text-amber-950 text-xs font-bold space-y-1 mb-3">
                                <div className="flex items-center gap-1.5 font-black text-amber-950">
                                  <span>📢</span>
                                  <span>Đã báo nghỉ ({latestCancelledForDay.dateString ? latestCancelledForDay.dateString.split('-').reverse().join('/') : dayName}):</span>
                                </div>
                                <p className="text-amber-900 font-semibold pl-5">
                                  {latestCancelledForDay.cancellationReason || 'Nghỉ theo kế hoạch của lớp'}
                                  {latestCancelledForDay.cancellationNote ? ` (${latestCancelledForDay.cancellationNote})` : ''}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Card Footer: Room & Teacher */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                            <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                              <MapPin size={13} className="text-rose-500" />
                              <span>{slot.room || scheduleData.classroom?.room || 'Phòng học chính'}</span>
                            </span>

                            <span className="text-slate-600">
                              {scheduleData.schedule?.teacher?.name ? `Cô ${scheduleData.schedule.teacher.name}` : 'Trên lớp'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Helpful note for parents */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl border-2 border-amber-200 text-xs sm:text-sm text-amber-950 flex items-start gap-3 shadow-2xs">
                  <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center text-xl shrink-0 border border-amber-300">
                    💡
                  </div>
                  <div className="leading-relaxed">
                    <h5 className="font-black text-amber-950 mb-0.5">Dặn dò từ ban giám hiệu & giáo viên:</h5>
                    <p className="text-amber-900 font-medium">
                      Ba mẹ lưu ý đưa bé đến trường trước giờ học 10–15 phút để bé kịp chuẩn bị tâm lý và đồ dùng học tập trước khi vào tiết học Tiếng Anh nhé!
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
          {/* TAB 4: PRACTICE SESSION HISTORY */}
          {(activeTab as any) === 'PRACTICE' && (
            (() => {
              const allSessions = practiceSessions;

              if (allSessions.length === 0) {
                return (
                  <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl">
                      📖
                    </div>
                    <p className="text-base font-black text-slate-700">Chưa có buổi luyện tập nào</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Khi bé hoàn thành các buổi học Chặng 2 Luyện tập, danh sách chi tiết các buổi và kết quả từng từ sẽ được ghi nhận tại đây!
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-slate-600 uppercase tracking-wide">
                      Tổng số: {allSessions.length} buổi luyện tập
                    </span>
                    <span className="text-xs text-slate-400 font-bold">Mới nhất trước</span>
                  </div>

                  {allSessions.map((sess, idx) => {
                    const dt = new Date(sess.completedAt || sess.startedAt);
                    const timeStr = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    const dateStr = dt.toLocaleDateString('vi-VN');
                    return (
                      <div
                        key={sess.sessionId || idx}
                        className="rounded-2xl border-2 border-slate-200 bg-white shadow-xs p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🎯</span>
                            <span className="font-black text-sm text-slate-800">
                              Buổi {allSessions.length - idx}: {timeStr} · {dateStr}
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                            Đúng ngay: {sess.firstTryCorrectTotal} / {sess.words.length} từ
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <p>
                            Số từ đã luyện: <b className="text-slate-800">{sess.words.length} từ</b>
                          </p>
                          <p>
                            Lượt thử lại: <b className="text-amber-700">{sess.totalWrongAttempts} lần</b>
                          </p>
                        </div>

                        {/* Words breakdown */}
                        <div className="pt-1 border-t border-slate-100">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">
                            Chi tiết từng từ trong buổi:
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {sess.words.map((w) => (
                              <div
                                key={w.wordId}
                                className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-xs ${
                                  w.wrongCount > 0
                                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                }`}
                              >
                                <span className="text-base shrink-0">{w.emoji || '🌟'}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-black truncate">{w.english}</p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {w.wrongCount > 0 ? `Ôn ${w.wrongCount} lần` : 'Đúng ngay'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>

        {/* ===================== MODAL FOOTER ===================== */}
        <div className="px-6 sm:px-8 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm text-slate-500 shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <span className="text-base">🎈</span>
            <span>KCEnglishKids · Đồng hành cùng bé từng bước trưởng thành</span>
          </div>
          <button
            onClick={() => {
              sfx.playPop();
              onClose();
            }}
            className="px-5 py-2 rounded-2xl bg-slate-200 hover:bg-slate-300 font-black text-slate-800 transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            Đóng sổ liên lạc
          </button>
        </div>

      </div>
    </div>
  );
};
