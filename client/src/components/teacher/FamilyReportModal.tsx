import { useEffect, useState } from 'react';
import { Send, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/api';
import type { ClassroomSession } from '../../types';

interface DraftRow {
  childId: string;
  childName: string;
  attended: boolean;
  lessonTitle?: string;
  unitTitle?: string;
  basisToken?: string;
  sentContent?: string | null;
  observations: any[];
  assignment?: any;
  plan?: any;
}

const getDefaultNote = (childName: string, attended: boolean, lessonName?: string, unitName?: string) => {
  if (attended) {
    return `Dạ kính gửi Phụ huynh bé ${childName}, hôm nay bé tham gia buổi học rất tích cực và hào hứng. Bé đã ghi nhớ tốt các từ vựng bài học và tham gia sôi nổi các trò chơi trên lớp. Ba mẹ ở nhà hãy khen ngợi và cùng bé mở thẻ bài để ôn lại nhé! ❤️`;
  }
  const lessonDesc = lessonName
    ? (unitName ? `Bài "${lessonName}" (thuộc Unit: ${unitName})` : `Bài "${lessonName}"`)
    : 'buổi học hôm nay';
  return `Dạ kính gửi Phụ huynh bé ${childName}, hôm nay bé vắng mặt ở buổi học trên lớp: ${lessonDesc}. Ba mẹ mở phần luyện tập 5 phút hoặc mở ứng dụng ở nhà cho bé ôn bài này giúp bé nắm vững kiến thức và theo kịp bài học cùng các bạn nhé! ❤️`;
};

const TEMPLATES = [
  {
    id: 'praise',
    label: '🌟 Khen ngợi tích cực',
    getText: (name: string) =>
      `Dạ kính gửi Phụ huynh bé ${name}, hôm nay bé học rất chăm chỉ, phát âm to rõ và tham gia trò chơi rất sôi nổi. Bố mẹ khen ngợi bé giúp cô nhé! ⭐`
  },
  {
    id: 'practice',
    label: '💡 Cần luyện thêm',
    getText: (name: string) =>
      `Dạ kính gửi Phụ huynh bé ${name}, bé đã làm quen tốt với các từ mới. Ở nhà bố mẹ cùng bé nghe lại phát âm trên ứng dụng và động viên bé nói nhiều hơn nhé! 💪`
  },
  {
    id: 'encourage',
    label: '❤️ Động viên nỗ lực',
    getText: (name: string) =>
      `Dạ kính gửi Phụ huynh bé ${name}, hôm nay bé rất cố gắng hoàn thành bài học và đạt được nhiều sao thưởng. Cô gửi lời khen ngợi đến bé! 🎉`
  }
];

export function FamilyReportModal({
  session,
  onClose,
  onSuccess
}: {
  session: ClassroomSession;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadDraft = () => {
    setLoading(true);
    setError('');
    api
      .get(`/teacher/classroom-sessions/${session._id}/family-report-draft`)
      .then((res) => {
        const items: DraftRow[] = res.data?.rows || [];
        setRows(items);

        const initialNotes: Record<string, string> = {};
        const initialSent: Record<string, boolean> = {};
        const toSelect: string[] = [];

        items.forEach((item) => {
          const lTitle = item.lessonTitle || (session.lesson as any)?.vietnameseTitle || (session.lesson as any)?.title || session.title;
          const uTitle = item.unitTitle || (session.lesson as any)?.topic?.vietnameseTitle || (session.lesson as any)?.topic?.name || (session.lesson as any)?.topic?.title;
          initialNotes[item.childId] = item.sentContent || getDefaultNote(item.childName, item.attended, lTitle, uTitle);
          if (item.sentContent) {
            initialSent[item.childId] = true;
          } else {
            toSelect.push(item.childId);
          }
        });

        setNotes(initialNotes);
        setSentMap(initialSent);
        // Default select all who haven't received it yet, or select all if all already sent
        setSelected(toSelect.length > 0 ? toSelect : items.map((i) => i.childId));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Không tải được danh sách học sinh.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDraft();
  }, [session._id]);

  const handleSend = async () => {
    if (selected.length === 0) {
      setError('Vui lòng chọn ít nhất một bé để gửi nhận xét.');
      return;
    }

    setSending(true);
    setError('');
    setSuccessMessage('');

    try {
      const childReports = rows
        .filter((r) => selected.includes(r.childId))
        .map((r) => {
          const lTitle = r.lessonTitle || (session.lesson as any)?.vietnameseTitle || (session.lesson as any)?.title || session.title;
          const uTitle = r.unitTitle || (session.lesson as any)?.topic?.vietnameseTitle || (session.lesson as any)?.topic?.name || (session.lesson as any)?.topic?.title;
          return {
            childId: r.childId,
            teacherNote: notes[r.childId] || getDefaultNote(r.childName, r.attended, lTitle, uTitle),
            basisToken: r.basisToken,
            observationIds: (r.observations || []).map((o: any) => o._id),
            includeAssignment: Boolean(r.assignment),
            includePlan: Boolean(r.plan)
          };
        });

      await api.post('/teacher/parent-notifications/bulk', {
        sessionId: session._id,
        templateType: 'SESSION_REPORT',
        childReports
      });

      const updatedSent = { ...sentMap };
      selected.forEach((id) => {
        updatedSent[id] = true;
      });
      setSentMap(updatedSent);
      const msg = `Đã gửi nhận xét thành công đến Sổ liên lạc của ${selected.length} bé! 🎉`;
      setSuccessMessage(msg);
      if (onSuccess) {
        onSuccess(msg);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa gửi được nhận xét. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (childId: string, childName: string, templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setNotes((prev) => ({
      ...prev,
      [childId]: tpl.getText(childName)
    }));
  };

  const toggleSelectAll = () => {
    if (selected.length === rows.length) {
      setSelected([]);
    } else {
      setSelected(rows.map((r) => r.childId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-report-title"
        className="bg-white text-slate-800 rounded-4xl w-full max-w-4xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500 text-white flex items-center justify-center text-xl shadow-md">
              💌
            </div>
            <div>
              <h2 id="family-report-title" className="text-xl font-black text-slate-900">
                Gửi Nhận Xét Buổi Học Cho Bé
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Buổi dạy: <strong>{session.title || 'Buổi học'}</strong> &bull; Nhận xét sẽ hiển thị ngay trong Sổ liên lạc trên máy bé!
              </p>
            </div>
          </div>
          <button
            disabled={sending}
            className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        {/* Status Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
            <button
              onClick={loadDraft}
              className="ml-auto underline flex items-center gap-1 hover:text-rose-900 cursor-pointer"
            >
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Body: Student comment list */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center">
              <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="font-bold text-sm">Đang tải danh sách học sinh và lời nhận xét gắn sẵn…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-bold">
              Không có học sinh trong buổi dạy này.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 font-bold px-1">
                <span>Danh sách {rows.length} bé trong buổi dạy:</span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-teal-700 hover:text-teal-800 underline cursor-pointer"
                >
                  {selected.length === rows.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả các bé'}
                </button>
              </div>

              {rows.map((row) => {
                const isSelected = selected.includes(row.childId);
                const isSent = Boolean(sentMap[row.childId]);

                return (
                  <article
                    key={row.childId}
                    className={`rounded-3xl border-2 p-5 transition-all ${
                      isSelected
                        ? 'border-teal-400 bg-teal-50/20 shadow-md'
                        : 'border-slate-200 bg-white opacity-60'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelected((current) =>
                              current.includes(row.childId)
                                ? current.filter((id) => id !== row.childId)
                                : [...current, row.childId]
                            );
                          }}
                          className="w-5 h-5 rounded-lg text-teal-600 accent-teal-600 cursor-pointer"
                        />
                        <span className="font-black text-slate-900 text-base">{row.childName}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            row.attended
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.attended ? '✓ Có mặt' : 'Vắng mặt'}
                        </span>
                      </label>

                      {isSent && (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-800 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Đã gửi vào Sổ liên lạc
                        </span>
                      )}
                    </div>

                    {/* Quick Template Buttons */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-slate-500">Mẫu nhanh:</span>
                      {TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(row.childId, row.childName, tpl.id)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors active:scale-95"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>

                    {/* Editable Note Textarea (Đoạn text gắn sẵn) */}
                    <div>
                      <textarea
                        rows={3}
                        value={notes[row.childId] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNotes((prev) => ({ ...prev, [row.childId]: val }));
                        }}
                        placeholder="Nhập lời nhận xét gửi phụ huynh…"
                        className="w-full rounded-2xl border border-slate-300 p-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 leading-relaxed font-medium bg-white"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Cô có thể gửi trực tiếp lời nhận xét gắn sẵn này hoặc chỉnh sửa theo ý muốn.
                      </p>
                    </div>
                  </article>
                );
              })}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 sm:p-5 bg-slate-50">
          <div className="text-xs text-slate-500 font-bold">
            Đã chọn: <strong className="text-slate-900">{selected.length}</strong> / {rows.length} bé
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={sending}
              className="px-5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
              onClick={onClose}
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={sending || selected.length === 0 || loading}
              onClick={() => void handleSend()}
              className="px-7 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-black text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/25 active:scale-95 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang gửi nhận xét…</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Gửi nhận xét ({selected.length} bé)</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
