import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Mail,
  Star,
  CheckCircle2,
  MessageCircle,
  Heart,
  Loader2,
  ClipboardList,
  Calendar,
  Play,
  Sparkles,
  Clock,
  MapPin,
  UserCheck,
  BookOpen
} from 'lucide-react';
import { parentNotificationApi } from '../../services/api';
import { type Stage2PracticeSession } from '../../services/vocabStatsService';
import { sfx } from '../../utils/audio';

interface ReplyItem {
  senderRole: 'TEACHER' | 'PARENT';
  senderName: string;
  message: string;
  createdAt: string;
}

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
  replies?: ReplyItem[];
}

interface WeeklySlot {
  _id?: string;
  dayOfWeek: number; // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
  startTime: string;
  endTime: string;
  subjectNote?: string;
  room?: string;
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

const DAY_BADGES: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  2: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  3: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  4: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  5: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  6: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  0: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
};

export const ParentNotebookModal: React.FC<ParentNotebookModalProps> = ({
  childId,
  childName,
  onClose
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'ASSIGNMENTS' | 'SCHEDULE' | 'PRACTICE'>('NOTIFICATIONS');
  const [items, setItems] = useState<ParentNotificationItem[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

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

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await parentNotificationApi.getChildAssignments(childId);
      setAssignments(res.data || []);
    } catch (e) {
      console.error('Failed to load child assignments:', e);
    } finally {
      setLoadingAssignments(false);
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
    void loadAssignments();
    void loadSchedule();
  }, [childId]);

  const handleStartAssignment = (assignment: any) => {
    sfx.playPop();
    onClose();
    if (assignment.activity?._id) {
      navigate(`/activities/${assignment.activity._id}`);
    } else if (assignment.lesson?._id) {
      navigate(`/lessons/${assignment.lesson._id}`);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border-4 border-amber-300 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 border-b-2 border-amber-300 text-amber-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center text-amber-600">
                <Mail size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black leading-tight flex items-center gap-1.5">
                  Sổ Liên Lạc Điện Tử <Heart size={16} className="text-rose-500 fill-rose-500 inline" />
                </h2>
                <p className="text-xs font-bold text-amber-800">
                  Trao đổi & Theo dõi việc học của bé <span className="underline">{childName}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sfx.playPop();
                onClose();
              }}
              className="rounded-xl p-2 text-amber-900 hover:bg-white/40 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs (4 tabs: Lời nhắn, Bài tập, Luyện tập, Thời khóa biểu) */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveTab('NOTIFICATIONS');
              }}
              className={`py-2 px-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-white text-amber-900 shadow-md scale-102 font-black'
                  : 'bg-amber-500/40 text-amber-950 hover:bg-amber-500/60'
              }`}
            >
              <MessageCircle size={15} />
              <span className="truncate">Lời nhắn ({items.length})</span>
            </button>

            <button
              onClick={() => {
                sfx.playPop();
                setActiveTab('ASSIGNMENTS');
              }}
              className={`py-2 px-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ASSIGNMENTS'
                  ? 'bg-white text-teal-900 shadow-md scale-102 font-black'
                  : 'bg-amber-500/40 text-amber-950 hover:bg-amber-500/60'
              }`}
            >
              <ClipboardList size={15} />
              <span className="truncate">Bài tập ({assignments.length})</span>
            </button>

            <button
              onClick={() => {
                sfx.playPop();
                setActiveTab('PRACTICE');
              }}
              className={`py-2 px-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'PRACTICE'
                  ? 'bg-white text-rose-900 shadow-md scale-102 font-black'
                  : 'bg-amber-500/40 text-amber-950 hover:bg-amber-500/60'
              }`}
            >
              <BookOpen size={15} />
              <span className="truncate">Luyện tập</span>
            </button>

            <button
              onClick={() => {
                sfx.playPop();
                setActiveTab('SCHEDULE');
              }}
              className={`py-2 px-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'SCHEDULE'
                  ? 'bg-white text-indigo-900 shadow-md scale-102 font-black'
                  : 'bg-amber-500/40 text-amber-950 hover:bg-amber-500/60'
              }`}
            >
              <Calendar size={15} />
              <span className="truncate">Thời khóa biểu</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {/* TAB 1: NOTIFICATIONS & 2-WAY REPLIES */}
          {activeTab === 'NOTIFICATIONS' && (
            loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                Đang tải sổ liên lạc…
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl">
                  💌
                </div>
                <p className="text-base font-black text-slate-700">Chưa có nhận xét mới từ cô giáo</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Khi cô giáo gửi nhận xét về kết quả học hoặc dặn dò cho bé, phụ huynh có thể đọc và nhắn tin trao đổi lại ngay tại đây!
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item._id}
                  className="rounded-2xl border-2 border-amber-200/80 bg-white shadow-xs overflow-hidden"
                >
                  <div className="bg-amber-50/70 px-4 py-3 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">
                        {item.subject || 'Nhận xét học tập'}
                      </span>
                      <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                        Cô {item.teacher?.name || 'giáo viên'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {(item.stars !== undefined || item.score !== undefined) && (
                      <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 p-2.5 rounded-xl border border-amber-200/60 text-xs">
                        {item.stars !== undefined && item.stars > 0 && (
                          <div className="flex items-center gap-1 font-bold text-amber-700">
                            <Star size={16} className="fill-amber-400 text-amber-400" />
                            <span>Đánh giá: {item.stars} sao</span>
                          </div>
                        )}
                        {item.score !== undefined && item.score > 0 && (
                          <div className="flex items-center gap-1 font-bold text-emerald-700 ml-auto">
                            <CheckCircle2 size={15} />
                            <span>Điểm: {item.score}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed font-medium border border-slate-100">
                      {item.teacherNote || item.content || 'Cô giáo gửi lời nhắn tới bé và gia đình.'}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 size={13} /> Phiếu thông báo chính thức từ cô giáo
                      </span>
                      <span className="text-slate-400 font-medium">
                        Đã lưu vào Sổ liên lạc điện tử của bé
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB 2: CHILD ASSIGNMENTS (BÀI CÔ GIAO) */}
          {activeTab === 'ASSIGNMENTS' && (
            loadingAssignments ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                Đang tải bài tập được giao…
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl">
                  📚
                </div>
                <p className="text-base font-black text-slate-700">Chưa có bài tập nào cần hoàn thành</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Hiện tại cô giáo chưa giao thêm bài tập mới cho bé. Bé hãy ôn luyện các chủ đề yêu thích nhé!
                </p>
              </div>
            ) : (
              assignments.map((item) => {
                const title = item.activity?.title || item.lesson?.title;
                const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !item.isCompleted;
                const teacherFeedback = item.result?.teacherFeedback;

                return (
                  <div
                    key={item._id}
                    className="rounded-2xl border-2 border-teal-200/80 bg-white shadow-xs overflow-hidden"
                  >
                    {/* Header */}
                    <div className="bg-teal-50 px-4 py-3 border-b border-teal-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {title}
                        </span>
                        <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                          {item.activity?.activityType || 'Bài học'}
                        </span>
                      </div>

                      {item.dueDate ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                        }`}>
                          <Calendar size={13} />
                          Hạn chót: {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                          {isOverdue && ' (Đã quá hạn)'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Không giới hạn thời gian</span>
                      )}
                    </div>

                    {/* Content Body */}
                    <div className="p-4 space-y-3">
                      {/* Teacher instructions */}
                      {item.instructions && (
                        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
                          <b>👩‍🏫 Lời cô dặn:</b> {item.instructions}
                        </div>
                      )}

                      {/* Status / Results */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div>
                          {item.isCompleted ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={14} /> Bé đã hoàn thành
                              </span>
                              <span className="font-bold text-xs text-slate-700">
                                Đạt {item.result?.score || 0}% · <Star size={14} className="fill-amber-400 text-amber-400 inline" /> {item.result?.stars || 0}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                              <Clock size={14} /> Chưa làm bài
                            </span>
                          )}
                        </div>

                        {/* Action: Replay or Start */}
                        <button
                          onClick={() => handleStartAssignment(item)}
                          className={`rounded-xl px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                            item.isCompleted
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white scale-102'
                          }`}
                        >
                          <Play size={14} />
                          <span>{item.isCompleted ? 'Chơi lại ôn tập' : 'Bé làm bài ngay 🚀'}</span>
                        </button>
                      </div>

                      {/* Teacher's Review on Assignment */}
                      {teacherFeedback && teacherFeedback.comment && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                              <Sparkles size={14} className="text-amber-500" />
                              Cô giáo nhận xét bài làm:
                            </span>
                            {teacherFeedback.bonusStars > 0 && (
                              <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Star size={12} className="fill-amber-400" />
                                Cô thưởng +{teacherFeedback.bonusStars} sao
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-950 font-medium leading-relaxed italic">
                            "{teacherFeedback.comment}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* TAB 3: CLASS SCHEDULE (THỜI KHÓA BIỂU TRÊN LỚP) */}
          {activeTab === 'SCHEDULE' && (
            loadingSchedule ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                Đang tải thời khóa biểu lớp học…
              </div>
            ) : !scheduleData?.classroom ? (
              <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl">
                  🏫
                </div>
                <p className="text-base font-black text-slate-700">Bé chưa được phân công vào lớp học</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Khi bé được giáo viên hoặc ban giám hiệu xếp vào lớp học, thời khóa biểu trên trường sẽ tự động hiển thị tại đây!
                </p>
              </div>
            ) : sortedSlots.length === 0 ? (
              <div className="space-y-4">
                {/* Classroom info banner */}
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 text-white shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner">
                      🏫
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold tracking-wider text-indigo-100">Lớp học của bé</span>
                      <h3 className="text-lg font-black leading-tight">{scheduleData.classroom.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-100 mt-1">
                        {scheduleData.classroom.teacher && (
                          <span className="flex items-center gap-1 font-semibold">
                            <UserCheck size={13} /> GVCN: {scheduleData.classroom.teacher.name}
                          </span>
                        )}
                        {scheduleData.classroom.room && (
                          <span className="flex items-center gap-1 font-semibold">
                            <MapPin size={13} /> {scheduleData.classroom.room}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6">
                  <p className="text-sm font-black text-slate-700">Lớp đang cập nhật thời khóa biểu</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Cô giáo và nhà trường đang hoàn thiện lịch học cho lớp {scheduleData.classroom.name}. Vui lòng quay lại sau!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Classroom Summary Card */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-4 text-white shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner shrink-0">
                        🏫
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                            {scheduleData.schedule?.academicYear || scheduleData.classroom.academicYear || '2026-2027'}
                          </span>
                          <span className="text-[11px] text-indigo-100 font-bold">Lịch học hàng tuần</span>
                        </div>
                        <h3 className="text-lg font-black leading-tight mt-0.5">{scheduleData.classroom.name}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs bg-black/15 backdrop-blur-xs px-3 py-2 rounded-xl self-start sm:self-auto">
                      <UserCheck size={14} className="text-amber-300" />
                      <div>
                        <span className="text-[10px] text-indigo-200 block">Giáo viên phụ trách</span>
                        <span className="font-bold text-white">
                          {scheduleData.schedule?.teacher?.name || scheduleData.classroom.teacher?.name || 'Cô giáo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Day-by-Day Slots List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-600" />
                      Chi Tiết Các Buổi Học Trong Tuần ({sortedSlots.length} buổi):
                    </span>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      Hôm nay là: {DAY_NAMES[todayDayOfWeek] || 'Hôm nay'}
                    </span>
                  </div>

                  <div className="grid gap-2.5">
                    {sortedSlots.map((slot, idx) => {
                      const isToday = slot.dayOfWeek === todayDayOfWeek;
                      const dayName = DAY_NAMES[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`;
                      const badgeStyle = DAY_BADGES[slot.dayOfWeek] || DAY_BADGES[1];

                      return (
                        <div
                          key={slot._id || idx}
                          className={`rounded-2xl border-2 bg-white p-3.5 transition-all shadow-xs ${
                            isToday
                              ? 'border-indigo-400 ring-2 ring-indigo-300 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            {/* Left: Day Badge + Time */}
                            <div className="flex items-center gap-2.5">
                              <span className={`px-3 py-1 rounded-xl text-xs font-black border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} shrink-0`}>
                                {dayName}
                              </span>

                              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                                <Clock size={14} className="text-indigo-500" />
                                <span>{slot.startTime} – {slot.endTime}</span>
                              </div>

                              {isToday && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                                  <Sparkles size={10} /> Tiết học hôm nay!
                                </span>
                              )}
                            </div>

                            {/* Right: Room Location */}
                            <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                              <MapPin size={12} className="text-rose-500" />
                              <span>{slot.room || scheduleData.classroom?.room || 'Phòng học chính'}</span>
                            </div>
                          </div>

                          {/* Content / Subject Note */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="text-base">🇬🇧</span>
                              {slot.subjectNote || 'Tiết học Tiếng Anh Mầm Non tương tác'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {scheduleData.schedule?.teacher?.name ? `Cô ${scheduleData.schedule.teacher.name}` : 'Trên lớp'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Helpful note for parents */}
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-base shrink-0">💡</span>
                  <p className="leading-relaxed font-medium">
                    <b>Dặn dò từ nhà trường:</b> Ba mẹ lưu ý cho bé đến lớp trước 10 phút để chuẩn bị tinh thần và đồ dùng học tập tốt nhất cho buổi học nhé!
                  </p>
                </div>
              </div>
            )
          )}

          {/* TAB 4: PRACTICE SESSION HISTORY */}
          {activeTab === 'PRACTICE' && (
            (() => {
              // Gather all session keys from localStorage for this child
              const prefix = `kc_stage2_sessions_${childId}_`;
              const allSessions: Stage2PracticeSession[] = [];
              try {
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith(prefix)) {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                      const list = JSON.parse(raw);
                      if (Array.isArray(list)) allSessions.push(...list);
                    }
                  }
                }
              } catch {}

              // Sort by newest completedAt
              allSessions.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

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

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>KCEnglishKids · Đồng hành cùng bé yêu</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
