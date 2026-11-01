import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Save, Volume2 } from 'lucide-react';
import type { Activity, ClassroomSession, User } from '../../types';
import { playWordAudio, stopWordAudio } from '../../utils/audio';
import { playAnimalSound, stopAnimalSound } from '../../utils/animalAudio';

type Answers = Record<string, 'CORRECT' | 'INCORRECT' | 'NOT_ANSWERED'>;
export function ClassroomActivities({ session, onSave }: {
  session: ClassroomSession;
  onSave: (activityId: string, index: number, prompt: string, answers: Answers) => Promise<void>;
}) {
  const [answers, onAnswers] = useState<Answers>({});
  const [activityIndex, setActivityIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const activity = session.activities[activityIndex] as Activity | undefined;
  const question = activity?.questions?.[questionIndex];
  useEffect(() => {
    setRevealed(false); setError('');
    const saved = session.questionResults?.find(result => String(result.activityId) === activity?._id && result.questionIndex === questionIndex);
    const restored: Answers = {};
    for (const answer of saved?.studentAnswers || []) restored[String(typeof answer.student === 'object' ? answer.student._id : answer.student)] = answer.result;
    onAnswers(restored);
    return () => { stopAnimalSound(); stopWordAudio(); };
  }, [activity?._id, questionIndex]);
  if (!activity) return <div className="rounded-2xl bg-white p-6 text-slate-700"><h2 className="text-xl font-bold">Chưa chọn trò chơi cho buổi học</h2><p className="mt-2">Buổi này tập trung vào từ vựng, mẫu câu và ghi nhận học sinh.</p></div>;
  const roster = session.studentScores.filter(row => !['ABSENT', 'EXCUSED'].includes(row.attendance || ''));
  const listen = async () => {
    if (!question) return;
    setError('');
    try {
      if (activity.activityType === 'ANIMAL_SOUND') await playAnimalSound(String(question.metadata?.animal || question.options.find(option => option.isCorrect)?.text || question.correctAnswer || ''));
      else { stopAnimalSound(); await playWordAudio(question.promptText, question.promptAudioUrl); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Không phát được âm thanh.'); }
  };
  return <section className="rounded-3xl border border-indigo-300 bg-slate-50 p-5 sm:p-6 text-slate-900 mb-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-indigo-700">Trò chơi đã chọn ở bước chuẩn bị</p><h2 className="text-xl font-black">Hoạt động {activityIndex + 1}/{session.activities.length}</h2></div><select aria-label="Hoạt động trong buổi dạy" value={activityIndex} onChange={e => { setActivityIndex(Number(e.target.value)); setQuestionIndex(0); }} className="max-w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-bold">{session.activities.map((item, index) => <option key={item._id} value={index}>{index + 1}. {item.title}</option>)}</select></div>
    {question ? <><div className="my-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Câu hỏi {questionIndex + 1}/{activity.questions.length} · {question.promptText}</h3><button className="teacher-button" onClick={() => void listen()}><Volume2 size={18} />{activity.activityType === 'ANIMAL_SOUND' ? 'Nghe tiếng kêu' : 'Nghe câu hỏi'}</button></div>
      {question.promptImageUrl && <img alt="Hình câu hỏi" src={question.promptImageUrl} className="mx-auto mb-4 h-40 object-contain" />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{question.options.map(option => <div key={option.id} className={`rounded-2xl border-2 bg-white p-4 text-center ${revealed && option.isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>{option.imageUrl && <img className="mx-auto mb-3 h-24 object-contain" src={option.imageUrl} alt={option.text || 'Lựa chọn'} />}<strong>{option.text}</strong>{revealed && option.isCorrect && <p className="mt-2 text-sm font-bold text-emerald-800">✓ Đáp án</p>}</div>)}</div>
      <button className="teacher-button mt-4" onClick={() => setRevealed(value => !value)}>{revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}</button>
      <div className="mt-5 border-t pt-4"><h3 className="font-bold mb-3">Ghi nhận câu trả lời của từng bé</h3><div className="grid gap-3 sm:grid-cols-2">{roster.map(row => {
        const student = row.student as User; const id = String(typeof row.student === 'string' ? row.student : student._id || student.id || '');
        return <label key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border p-3"><span className="text-sm font-bold">{student.name || 'Học sinh'}</span><select className="rounded-lg border px-2 py-1 text-sm" value={answers[id] || 'NOT_ANSWERED'} onChange={e => onAnswers({ ...answers, [id]: e.target.value as Answers[string] })}><option value="NOT_ANSWERED">Chưa trả lời</option><option value="CORRECT">Đúng</option><option value="INCORRECT">Chưa đúng</option></select></label>;
      })}</div></div>
      {error && <p role="alert" className="mt-3 text-rose-800">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-between gap-3"><button className="teacher-button" disabled={questionIndex === 0} onClick={() => setQuestionIndex(i => i - 1)}><ChevronLeft size={16} /> Câu trước</button><button className="teacher-button primary" onClick={() => void onSave(activity._id, questionIndex, question.promptText, answers)}><Save size={16} /> Lưu câu trả lời</button><button className="teacher-button" disabled={questionIndex >= activity.questions.length - 1} onClick={() => setQuestionIndex(i => i + 1)}>Câu sau <ChevronRight size={16} /></button></div>
    </> : <p className="mt-4">Hoạt động chưa có câu hỏi để trình chiếu. Hãy kiểm tra nội dung trong kho trò chơi.</p>}
  </section>;
}
