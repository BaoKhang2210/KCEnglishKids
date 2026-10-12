import React, { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Send,
  Star,
  CheckCircle2,
  MessageCircle,
  Heart,
  Loader2
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
  const [items, setItems] = useState<ParentNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [parentNameMap, setParentNameMap] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      const res = await parentNotificationApi.getChildNotificationsForParent(childId);
      setItems(res.data || []);
      // Mark as read
      (res.data || []).forEach((item: ParentNotificationItem) => {
        void parentNotificationApi.markAsReadByParent(childId, item._id);
      });
    } catch (e) {
      console.error('Failed to load parent notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [childId]);

  const handleSendReply = async (notifId: string) => {
    const text = (replyTextMap[notifId] || '').trim();
    if (!text) return;

    setSendingReplyId(notifId);
    sfx.playPop();

    try {
      const parentName = (parentNameMap[notifId] || '').trim() || `Phụ huynh bé ${childName}`;
      await parentNotificationApi.replyAsParent(childId, notifId, text, parentName);
      setReplyTextMap((prev) => ({ ...prev, [notifId]: '' }));
      await loadNotifications();
    } catch (e) {
      console.error('Failed to send reply:', e);
    } finally {
      setSendingReplyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border-4 border-amber-300 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 border-b-2 border-amber-300 text-amber-950">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center text-amber-600">
              <Mail size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black leading-tight flex items-center gap-1.5">
                Sổ Liên Lạc Điện Tử <Heart size={16} className="text-rose-500 fill-rose-500 inline" />
              </h2>
              <p className="text-xs font-bold text-amber-800">
                Trao đổi 2 chiều giữa Cô giáo & Phụ huynh bé <span className="underline">{childName}</span>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          {loading ? (
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
                {/* Notification Top Banner */}
                <div className="bg-amber-50/70 px-4 py-3 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center">
                      Cô
                    </span>
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        {item.teacher?.name || 'Giáo viên phụ trách'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {item.className ? `Lớp: ${item.className} · ` : ''}
                        {item.sentAt || item.createdAt
                          ? new Date(item.sentAt || item.createdAt!).toLocaleDateString('vi-VN', {
                              day: 'numeric',
                              month: 'numeric',
                              year: 'numeric'
                            })
                          : 'Hôm nay'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.stars ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-xs border border-amber-300">
                        <Star size={13} className="text-amber-500 fill-amber-400" />
                        {item.stars} sao
                      </span>
                    ) : null}
                    {item.score ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                        <CheckCircle2 size={13} />
                        {item.score}%
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Content / Teacher Note */}
                <div className="p-4 sm:p-5">
                  <h3 className="text-sm font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <MessageCircle size={15} className="text-teal-600" />
                    {item.subject || 'Nhận xét từ cô giáo'}
                  </h3>

                  <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {item.teacherNote || item.content || 'Bé học tập rất chăm chỉ và hăng hái phát biểu!'}
                  </p>

                  {/* Discussion Thread / Replies */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1">
                      <span>Phản hồi & Trao đổi ({item.replies?.length || 0})</span>
                    </p>

                    {item.replies && item.replies.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {item.replies.map((r, rIdx) => {
                          const isTeacher = r.senderRole === 'TEACHER';
                          return (
                            <div
                              key={rIdx}
                              className={`rounded-xl p-3 text-xs ${
                                isTeacher
                                  ? 'bg-teal-50 border border-teal-200 text-teal-950 ml-0 mr-4'
                                  : 'bg-amber-50/80 border border-amber-200 text-amber-950 ml-4 mr-0'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-black flex items-center gap-1">
                                  {isTeacher ? '👩‍🏫 ' : '👨‍👩‍👧 '}
                                  {r.senderName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {r.createdAt
                                    ? new Date(r.createdAt).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : ''}
                                </span>
                              </div>
                              <p className="font-medium whitespace-pre-wrap">{r.message}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reply Form for Parent */}
                    <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={parentNameMap[item._id] ?? ''}
                          onChange={(e) =>
                            setParentNameMap((prev) => ({ ...prev, [item._id]: e.target.value }))
                          }
                          placeholder={`Tên PH (VD: Mẹ bé ${childName})`}
                          className="w-44 text-xs font-bold rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={replyTextMap[item._id] ?? ''}
                          onChange={(e) =>
                            setReplyTextMap((prev) => ({ ...prev, [item._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleSendReply(item._id);
                            }
                          }}
                          placeholder="Phụ huynh gửi lời nhắn / chia sẻ lại với cô giáo…"
                          className="flex-1 text-xs font-medium rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={() => handleSendReply(item._id)}
                          disabled={
                            sendingReplyId === item._id ||
                            !(replyTextMap[item._id] || '').trim()
                          }
                          className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white px-3.5 py-2 text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <Send size={13} />
                          <span>Gửi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>KCEnglishKids · Đồng hành cùng bé yêu</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
