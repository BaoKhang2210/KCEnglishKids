import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, Star } from 'lucide-react';
import { aiApi } from '../../services/api';
import type { ParentNoteRequest, ParentNoteOption, ParentNoteSuggestions as Suggestions } from '../../types';

interface Props extends ParentNoteRequest {
  onSelect: (option: ParentNoteOption) => void;
  disabled?: boolean;
}

// A keyed inner panel cannot carry suggestions between recipients or submissions.
export function ParentNoteSuggestions(props: Props) {
  return <SuggestionPanel key={`${props.childId}:${props.assignmentId || ''}:${props.resultId || ''}`} {...props} />;
}

function SuggestionPanel({ childId, assignmentId, resultId, onSelect, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const generate = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await aiApi.generateParentNote({ childId, assignmentId, resultId }, controller.signal);
      if (controller.signal.aborted) return;
      setSuggestions(response.data);
      setSelected('');
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.name !== 'AbortError'
        ? cause.message : 'Chưa lấy được gợi ý. Cô có thể tiếp tục viết hoặc thử lại.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const colors = {
    praise: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
    encouragement: 'border-teal-200 bg-teal-50 hover:bg-teal-100',
    practice_hint: 'border-violet-200 bg-violet-50 hover:bg-violet-100'
  };

  return (
    <section className="my-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-800" aria-label="Parent note assistant">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={generate} disabled={loading || disabled || !childId}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
          {loading ? <Loader2 size={16} className="motion-safe:animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Đang soạn gợi ý…' : 'Gợi ý nhận xét'}
        </button>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold">{suggestions ? suggestions.generative ? 'Gemini AI' : suggestions.fallback ? 'AI chưa phản hồi · dùng mẫu' : 'Mẫu theo dữ liệu học tập' : 'Cô duyệt nội dung trước khi gửi'}</span>
      </div>
      <p className="text-xs text-slate-600">Dựa trên kết quả đã ghi nhận. Cô chọn một bản, chỉnh sửa rồi chủ động gửi cho gia đình.</p>
      {error && <p role="alert" className="text-xs text-rose-800">{error}</p>}
      <div aria-live="polite" aria-busy={loading}>
        {suggestions && <>
          <p className="mb-2 text-[11px] text-slate-600">
            {suggestions.metrics.scope === 'assignment' ? 'Độ đúng của lượt đang xem; tổng bài và sao toàn hành trình.' : 'Số liệu toàn bộ quá trình học, không phải riêng tuần này.'}
            {suggestions.metrics.averageAccuracy != null && ` Độ đúng trên câu đã ghi nhận: ${suggestions.metrics.averageAccuracy}%.`}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {suggestions.options.map(option => (
              <button key={option.id} type="button" disabled={disabled || loading} aria-pressed={selected === option.id}
                onClick={() => { setSelected(option.id); onSelect(option); }}
                className={`rounded-xl border p-3 text-left transition-colors cursor-pointer disabled:opacity-50 ${colors[option.type]} ${selected === option.id ? 'ring-2 ring-indigo-500' : ''}`}>
                <span className="block text-[10px] font-bold uppercase tracking-wide">{option.badge}</span>
                <span className="my-1 block text-sm font-bold">{option.title}</span>
                <span className="block text-xs leading-relaxed">{option.content}</span>
                <span className="mt-2 flex items-center gap-1 text-[11px] font-semibold"><Star size={12} /> Gợi ý: {option.suggestedStars} sao</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-600">Chọn gợi ý chỉ điền vào bản nháp, chưa gửi tin hay cộng sao.</p>
        </>}
      </div>
    </section>
  );
}
