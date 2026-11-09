import { useEffect, useRef, useState } from 'react';
import { api, teacherApi } from '../../services/api';
import { StoryBanner } from '../StoryScene';
import { useAuth } from '../../context/AuthContext';

type Observation = {
  _id: string;
  skill: string;
  level: string;
  evidence: string;
  nextStep?: string;
  observedAt: string;
  lesson?: { _id: string; title: string; vietnameseTitle?: string };
  teacher?: { _id: string; name: string };
  unitLabel?: string;
};

const skills: Record<string, string> = {
  LISTEN_POINT: 'Nghe và chỉ/chọn',
  EXPRESS: 'Diễn đạt bằng lời hoặc cử chỉ',
  PARTICIPATE: 'Tham gia và chờ lượt'
};

const levels: Record<string, string> = {
  INDEPENDENT: 'Tự làm được',
  SUPPORTED: 'Làm được khi có gợi ý',
  EMERGING: 'Cần thêm cơ hội luyện'
};

export function ObservationPortfolio({
  studentId,
  readOnly = false,
  initialLessonId = '',
  sessionId,
  unitId,
  ageGroup
}: {
  studentId: string;
  readOnly?: boolean;
  initialLessonId?: string;
  sessionId?: string;
  unitId?: string;
  ageGroup?: string;
}) {
  const { user } = useAuth();
  const [removing, setRemoving] = useState('');
  const [confirmRemoval, setConfirmRemoval] = useState('');
  const [items, setItems] = useState<Observation[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [skill, setSkill] = useState('LISTEN_POINT');
  const [level, setLevel] = useState('SUPPORTED');
  const [evidence, setEvidence] = useState('');
  const [nextStep, setNextStep] = useState('');
  const operation = useRef('');
  const base = readOnly ? `/children/${studentId}/observations` : `/teacher/students/${studentId}/observations`;

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setError('');
    const abort = new AbortController();
    api.get(base, abort.signal)
      .then(r => setItems(r.data.items))
      .catch(e => { if (!abort.signal.aborted) setError(e.message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });

    if (!readOnly) {
      teacherApi.getContent()
        .then(r => setLessons((r.data.lessons || []).filter((lesson: any) =>
          (!ageGroup || lesson.ageGroupCode === ageGroup) &&
          (!unitId || lesson.curriculumUnits?.some((unit: any) => String(unit?._id || unit) === unitId))
        )))
        .catch(() => {});
    }
    return () => abort.abort();
  }, [base, readOnly, unitId, ageGroup]);

  const remove = async (id: string) => {
    setRemoving(id);
    setError('');
    setNotice('');
    try {
      await api.delete(`/teacher/observations/${id}`);
      setItems(current => current.filter(item => item._id !== id));
      setConfirmRemoval('');
      setNotice('Đã gỡ ghi nhận. Bảng quan sát Unit và hồ sơ gia đình sẽ dùng các ghi nhận còn lại.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa gỡ được ghi nhận.');
    } finally {
      setRemoving('');
    }
  };

  const save = async () => {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      operation.current ||= globalThis.crypto?.randomUUID?.() || 'observation-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      await api.post(base, {
        lessonId,
        unitId,
        skill,
        level,
        evidence,
        nextStep,
        sessionId: lessonId === initialLessonId ? sessionId : undefined,
        operationId: operation.current,
        familyConsent: true
      });
      setItems((await api.get(base)).data.items);
      setEvidence('');
      setNextStep('');
      operation.current = '';
      setNotice('Đã lưu ghi nhận quan sát học tập của bé thành công!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="portfolio-card my-5">
      <StoryBanner scene="family" compact title="Những bước tiến của bé" eyebrow="QUAN SÁT · TIẾN BỘ · ĐỒNG HÀNH">
        <p>Ghi lại những điều bé thực sự đã làm tốt và mức độ cần cô hỗ trợ. Mỗi bé có nhịp học riêng.</p>
      </StoryBanner>

      {!readOnly && (
        <details open={Boolean(initialLessonId)} className="mb-6">
          <summary className="teacher-button cursor-pointer">Ghi quan sát mới</summary>
          <form
            onSubmit={e => { e.preventDefault(); void save(); }}
            onChange={() => { operation.current = ''; }}
            className="grid gap-4 mb-7"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Bài học
                <select required value={lessonId} onChange={e => setLessonId(e.target.value)}>
                  <option value="">Chọn bài vừa quan sát</option>
                  {lessons.map(lesson => (
                    <option key={lesson._id} value={lesson._id}>
                      {lesson.vietnameseTitle || lesson.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mục tiêu
                <select value={skill} onChange={e => setSkill(e.target.value)}>
                  {Object.entries(skills).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset>
              <legend className="font-bold mb-2">Mức hỗ trợ đã quan sát</legend>
              <div className="observation-levels">
                {Object.entries(levels).map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="radio"
                      name={`observation-level-${studentId}`}
                      checked={level === key}
                      onChange={() => setLevel(key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              Bé đã làm gì?
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={evidence}
                onChange={e => setEvidence(e.target.value)}
                placeholder="Ví dụ: Bé tự chỉ đúng tranh cat và dog sau khi nghe; cần cô nhắc lại ở từ duck."
                rows={3}
              />
            </label>

            <label>
              Bước hỗ trợ tiếp theo
              <textarea
                maxLength={500}
                value={nextStep}
                onChange={e => setNextStep(e.target.value)}
                placeholder="Ví dụ: Tiếp tục trò nghe–chỉ với 2 tranh, đổi vị trí tranh."
                rows={2}
              />
            </label>

            <button
              className="teacher-button primary justify-center"
              disabled={saving || !lessonId || evidence.trim().length < 5}
            >
              {saving ? 'Đang lưu…' : 'Lưu quan sát'}
            </button>
          </form>
        </details>
      )}

      {error && <p role="alert" className="text-rose-800 mb-3">{error}</p>}
      {notice && <p role="status" className="text-teal-800 mb-3">{notice}</p>}

      {loading ? (
        <p role="status">Đang tải hồ sơ quan sát…</p>
      ) : (
        <div className="portfolio-timeline">
          {!items.length && <p>Chưa có ghi nhận quan sát. Giáo viên sẽ ghi nhận khi có cơ hội phù hợp.</p>}
          {items.map(item => (
            <article key={item._id}>
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{levels[item.level]} · {skills[item.skill]}</strong>
                <time className="text-sm">
                  {new Date(item.observedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                </time>
              </div>
              <p className="text-sm mt-2 text-teal-800">
                {item.unitLabel ? 'Cuối ' + item.unitLabel + ' · ' : ''}
                {item.lesson?.vietnameseTitle || item.lesson?.title} · {item.teacher?.name}
              </p>
              <p className="mt-3 whitespace-pre-wrap">{item.evidence}</p>
              {item.nextStep && <p className="mt-2"><b>Cùng hỗ trợ:</b> {item.nextStep}</p>}

              {!readOnly && (user?.role === 'ADMIN' || item.teacher?._id === (user?.id || user?._id)) && (
                <div className="mt-4">
                  {confirmRemoval === item._id ? (
                    <div className="rounded-xl border border-rose-200 bg-white p-3">
                      <p className="text-sm mb-2">Gỡ ghi nhận này khỏi hồ sơ và bảng quan sát?</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="teacher-button"
                          disabled={Boolean(removing)}
                          onClick={() => void remove(item._id)}
                        >
                          {removing === item._id ? 'Đang gỡ…' : 'Xác nhận gỡ'}
                        </button>
                        <button
                          className="teacher-button"
                          disabled={Boolean(removing)}
                          onClick={() => setConfirmRemoval('')}
                        >
                          Giữ lại
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="teacher-button" onClick={() => setConfirmRemoval(item._id)}>
                      Gỡ ghi nhận nhầm
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
