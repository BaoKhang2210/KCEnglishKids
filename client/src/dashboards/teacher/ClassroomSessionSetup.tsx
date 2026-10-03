import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, Clock, Play, CheckSquare, Square, ArrowLeft } from 'lucide-react';
import { teacherApi, classroomSessionApi } from '../../services/api';

const Loader = () => (
  <div className="flex h-60 items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    <span className="ml-3 text-slate-600">Loading…</span>
  </div>
);

export const ClassroomSessionSetup: React.FC = () => {
  const { classId = '' } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [classroom, setClassroom] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [lessonActivities, setLessonActivities] = useState<any[]>([]);
  const [duration, setDuration] = useState(45);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classId) return;
    Promise.all([
      teacherApi.getClassDetail(classId),
      teacherApi.getContent()
    ])
      .then(([cls, cnt]) => {
        setClassroom(cls.data);
        setContent(cnt.data);
      })
      .catch((e) => setError(e.message));
  }, [classId]);

  // When a lesson is chosen, fetch its activities safely without wiping user adjustments
  useEffect(() => {
    if (!selectedLessonId || !content) return;
    const lesson = content.lessons.find((l: any) => l._id === selectedLessonId);
    setSelectedLesson(lesson || null);
    if (!title) setTitle(lesson ? lesson.title : '');
    const acts = content.activities.filter(
      (a: any) => String(a.lesson) === selectedLessonId
    );
    setLessonActivities(acts);
    if (selectedActivityIds.length === 0) {
      setSelectedActivityIds(acts.map((a: any) => a._id));
    }
  }, [selectedLessonId, content]);

  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!classId) return;
    setCreating(true);
    setError('');
    try {
      const res = await classroomSessionApi.createSession({
        classroomId: classId,
        lessonId: selectedLessonId || undefined,
        title: title || 'Classroom Session',
        activityIds: selectedActivityIds,
        plannedDuration: duration
      });
      const sessionId = res.data._id;
      // Start session immediately
      await classroomSessionApi.startSession(sessionId);
      navigate(`/teacher/classroom-sessions/${sessionId}/live`);
    } catch (e: any) {
      setError(e.message || 'Failed to create session');
      setCreating(false);
    }
  };

  if (!classroom || !content) return <Loader />;

  const ageLabel: Record<string, string> = {
    '3-4': 'Mầm (3–4 tuổi)',
    '4-5': 'Chồi (4–5 tuổi)',
    '5-6': 'Lá (5–6 tuổi)'
  };

  const filteredLessons = content.lessons.filter(
    (l: any) =>
      !classroom.ageGroupCode || l.ageGroupCode === classroom.ageGroupCode
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <button
        onClick={() => navigate(`/teacher/classes/${classId}`)}
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft size={16} /> Back to {classroom.name}
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Start a Session</h1>
        <p className="mt-1 text-slate-500">
          {classroom.name} · {ageLabel[classroom.ageGroupCode] || classroom.ageGroupCode} · {classroom.students?.length || 0} students
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-0">
        {(['1', '2', '3'] as const).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                step >= Number(s)
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {s}
            </div>
            {i < 2 && (
              <div
                className={`h-1 flex-1 transition-colors ${step > Number(s) ? 'bg-teal-600' : 'bg-slate-200'}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      {/* ── Step 1: Choose Lesson ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100">
              <BookOpen size={20} className="text-teal-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Step 1 — Choose a Lesson</h2>
              <p className="text-sm text-slate-500">Select the lesson to teach today</p>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {filteredLessons.length === 0 && (
              <p className="text-slate-500 text-sm">No lessons available for this age group.</p>
            )}
            {filteredLessons.map((l: any) => (
              <button
                key={l._id}
                onClick={() => setSelectedLessonId(l._id)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selectedLessonId === l._id
                    ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-400'
                    : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/50'
                }`}
              >
                <p className="font-semibold text-slate-900">{l.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {l.vocabularyItems?.length || 0} words ·{' '}
                  {(content.activities.filter((a: any) => String(a.lesson) === l._id)).length} activities ·{' '}
                  ~{l.estimatedDuration || 15} min
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              disabled={!selectedLessonId}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 font-semibold text-white disabled:opacity-40 hover:bg-teal-700"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Choose Activities ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100">
              <CheckSquare size={20} className="text-violet-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Step 2 — Choose Activities</h2>
              <p className="text-sm text-slate-500">Select activities for this session</p>
            </div>
          </div>

          {lessonActivities.length === 0 ? (
            <p className="text-slate-500 text-sm">No activities for this lesson. The session will proceed without specific activities.</p>
          ) : (
            <div className="space-y-2">
              {lessonActivities.map((a: any) => {
                const checked = selectedActivityIds.includes(a._id);
                return (
                  <button
                    key={a._id}
                    onClick={() => toggleActivity(a._id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                      checked
                        ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400'
                        : 'border-slate-200 hover:border-violet-200'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare size={20} className="text-violet-600 flex-shrink-0" />
                    ) : (
                      <Square size={20} className="text-slate-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-500">
                        {a.activityType?.replace(/_/g, ' ')} · {a.questionCount || '?'} questions
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Planned duration (minutes)
            </label>
            <div className="flex gap-3">
              {[20, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold border transition-colors ${
                    duration === d
                      ? 'border-teal-500 bg-teal-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 font-semibold text-white hover:bg-teal-700"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm & Start ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100">
              <Play size={20} className="text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Step 3 — Ready to Start!</h2>
              <p className="text-sm text-slate-500">Review and launch the session</p>
            </div>
          </div>

          {/* Session title edit */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Session title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Session title…"
            />
          </div>

          {/* Summary */}
          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <Row label="Class" value={classroom.name} />
            <Row label="Lesson" value={selectedLesson?.title || '(No lesson selected)'} />
            <Row label="Activities" value={`${selectedActivityIds.length} selected`} />
            <Row label="Students" value={`${classroom.students?.length || 0}`} />
            <Row
              label="Duration"
              value={`~${duration} minutes`}
              icon={<Clock size={14} className="text-slate-400" />}
            />
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-lg font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Starting…
                </>
              ) : (
                <>
                  <Play size={20} /> Start Session 🎯
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="flex items-center gap-1 font-semibold text-slate-900">
      {icon} {value}
    </span>
  </div>
);

export default ClassroomSessionSetup;
