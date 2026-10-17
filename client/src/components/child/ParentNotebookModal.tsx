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
  Clock
} from 'lucide-react';
import { parentNotificationApi } from '../../services/api';
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

interface ParentNotebookModalProps {
  childId: string;
  childName: string;
  onClose: () => void;
}

export const ParentNotebookModal: React.FC<ParentNotebookModalProps> = ({
  childId,
  childName,
  onClose
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'ASSIGNMENTS'>('NOTIFICATIONS');
  const [items, setItems] = useState<ParentNotificationItem[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

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

  useEffect(() => {
    void loadNotifications();
    void loadAssignments();
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

          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                sfx.playPop();
                setActiveTab('NOTIFICATIONS');
              }}
              className={`flex-1 py-2 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-white text-amber-900 shadow-md scale-102'
                  : 'bg-amber-500/40 text-amber-950 hover:bg-amber-500/60'
              }`}
            >
              <MessageCircle size={16} />
              <span>Lời nhắn từ cô ({items.length})</span>
            </button>

            <button
              onClick={() => {
                sfx.playPop();
                setActiveTab('ASSIGNMENTS');
              }}
              className={`flex-1 py-2 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ASSIGNMENTS'
                  ? 'bg-white text-teal-900 shadow-md scale-102'
                  : 'bg-amber-500/40 text-amber-950 hover:bg-amber-500/60'
              }`}
            >
              <ClipboardList size={16} />
              <span>Bài tập được giao ({assignments.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
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
