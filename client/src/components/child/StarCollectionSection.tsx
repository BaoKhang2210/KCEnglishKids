import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, ChevronDown, ChevronRight, LockKeyhole, Play, Star } from 'lucide-react';
import type { StarLedger } from '../../types';
import { KokoMascot } from './KokoMascot';

interface Props {
  ledger?: StarLedger;
  totalStars?: number;
  homePracticeStars?: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const StarCollectionSection: React.FC<Props> = ({ ledger, totalStars, homePracticeStars = 0, loading, error, onRetry }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [parentMode, setParentMode] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const total = totalStars ?? ((ledger?.totalStars ?? 0) + homePracticeStars);
  const max = ledger?.maxStars ?? 0;
  const progress = max ? Math.min(100, total / max * 100) : 0;

  const retry = () => { void onRetry(); };
  if (!ledger && loading) return <section className="space-y-4" aria-label="Đang tải sổ sao"><div className="h-28 animate-pulse rounded-3xl bg-amber-100"/><div className="h-24 animate-pulse rounded-3xl bg-white"/><div className="h-24 animate-pulse rounded-3xl bg-white"/></section>;
  if (!ledger && error) return <section className="rounded-3xl border-2 border-amber-200 bg-white p-6 text-center"><p role="alert" className="font-black text-slate-800">{error}</p><button onClick={retry} className="mt-3 min-h-12 rounded-2xl bg-amber-400 px-5 font-black text-amber-950">Thử tải lại</button></section>;
  if (!ledger) return <section className="rounded-3xl bg-white p-6 text-center"><button onClick={retry} className="min-h-12 rounded-2xl bg-amber-400 px-5 font-black text-amber-950">Tải tiến độ sao</button></section>;

  return (
    <section className="space-y-4" aria-label="Sổ sao theo Unit và Lesson">
      <header className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 p-4 text-amber-950 shadow-md sm:p-6">
        <div className="flex items-center gap-3">
          <KokoMascot state="celebrating" size="sm" interactive={false}/>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black sm:text-2xl">Sổ sao của bé</h3>
            <p className="text-3xl font-black sm:text-4xl" aria-label={`Bé đã nhận ${total} ngôi sao`}>
              {total}<span className="ml-2 text-xl">⭐ đã nhận</span>
            </p>
            <p className="mt-1 text-xs sm:text-sm font-bold text-amber-950">
              {homePracticeStars > 0
                ? `Gồm ${ledger?.totalStars ?? 0} sao hành trình bài học + ${homePracticeStars} sao ôn tập ở nhà ⚡`
                : `Tối đa ${max} sao trong hành trình học`}
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full border border-white/70 bg-white/50" role="progressbar" aria-label="Tiến độ thu thập sao trong hành trình" aria-valuemin={0} aria-valuemax={max} aria-valuenow={total}>
              <div className="h-full rounded-full bg-white transition-[width] duration-500 motion-reduce:transition-none" style={{width:`${progress}%`}}/>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 px-1 text-xs font-black" aria-label="Chú giải trạng thái bài học">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-emerald-900"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600"/>Đã hoàn thành</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-amber-950"><span className="h-2.5 w-2.5 rounded-full bg-amber-500"/>Đang học</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-sky-900"><span className="h-2.5 w-2.5 rounded-full bg-sky-500"/>Có thể bắt đầu</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-slate-500"/>Đang khóa</span>
      </div>

      {!ledger.units.length ? <div className="rounded-3xl border-2 border-dashed border-amber-300 bg-white p-6 text-center"><BookOpen className="mx-auto text-amber-600"/><p className="mt-2 font-black text-slate-800">Bé hãy bắt đầu bài học đầu tiên để sưu tầm sao nhé!</p></div> : <div className="space-y-3">
        {ledger.units.map(unit => {
          const isOpen = expanded === unit.id;
          // Completed progress must never be presented as locked, even when a
          // legacy record's separate unlock flag is stale.
          const isUnitUnlocked = unit.unlocked || unit.completed;
          const unitTone = !isUnitUnlocked ? 'border-slate-300 bg-slate-100 opacity-75' : unit.completed ? 'border-emerald-300 bg-emerald-50' : unit.stars > 0 ? 'border-amber-300 bg-amber-50' : 'border-sky-200 bg-sky-50';
          return <article key={unit.id} className={`overflow-hidden rounded-3xl border-2 shadow-sm ${unitTone}`}>
            <button type="button" aria-expanded={isOpen} aria-label={`Unit ${unit.unitNumber}: ${unit.title}, ${unit.stars} sao đã nhận${isUnitUnlocked ? '' : ', đang khóa'}`} onClick={() => setExpanded(isOpen ? null : unit.id)} className="flex min-h-20 w-full items-center gap-3 p-3 text-left sm:p-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 ${!isUnitUnlocked ? 'border-slate-300 bg-slate-100 text-slate-500' : unit.completed ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : unit.stars > 0 ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-sky-300 bg-sky-100 text-sky-800'}`}>{isUnitUnlocked ? <BookOpen aria-hidden/> : <LockKeyhole aria-hidden/>}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-base font-black text-slate-900">Unit {unit.unitNumber}: {unit.title}</span><span className="mt-1 block text-sm font-bold text-slate-700">{unit.stars} sao đã nhận</span><span className="mt-1 block text-xs font-bold text-slate-600">{unit.completed ? unit.bonusReceived ? 'Unit đã hoàn thành · Đã nhận thưởng 5 sao' : 'Unit đã hoàn thành' : `${unit.completedLessons} trên ${unit.totalLessons} bài học hoàn thành · Hoàn tất Unit để nhận thêm 5 sao`}</span></span>
              <span className="flex shrink-0 items-center gap-2" aria-label={unit.bonusReceived ? 'Đã nhận thưởng 5 sao Unit' : 'Chưa nhận thưởng 5 sao Unit'}><span className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full border-2 ${unit.bonusReceived ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-slate-300 bg-slate-100 text-slate-400'}`}><Star className={`h-6 w-6 ${unit.bonusReceived ? 'fill-amber-400' : ''}`}/></span>{unit.completed && <Check className="text-emerald-700" aria-label="Unit đã hoàn thành"/>}{isOpen ? <ChevronDown/> : <ChevronRight/>}</span>
            </button>
            <div className="mx-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Tiến độ sao Unit ${unit.unitNumber}`} aria-valuemin={0} aria-valuemax={unit.maxStars} aria-valuenow={unit.stars}><div className="h-full rounded-full bg-amber-400" style={{width:`${unit.maxStars ? unit.stars / unit.maxStars * 100 : 0}%`}}/></div>
            {isOpen && <div className="space-y-2 p-3 sm:p-4">{unit.lessons.map(lesson => {
              const lessonLabel = `Lesson ${lesson.lessonNumber}: ${lesson.title}`;
              const isLessonUnlocked = isUnitUnlocked && (lesson.unlocked || lesson.completed);
              const hasStageProgress = lesson.stages.stage1.completed || lesson.stages.stage2.completed || lesson.stages.stage3.completed || lesson.stars > 0;
              const lessonTone = !isLessonUnlocked ? 'border-slate-300 bg-slate-100 opacity-75' : lesson.completed ? 'border-emerald-300 bg-emerald-50' : hasStageProgress ? 'border-amber-300 bg-amber-50' : 'border-sky-200 bg-sky-50';
              return <div key={lesson.id} className={`rounded-2xl border p-3 ${lessonTone}`}>
              <div className="flex flex-wrap items-center gap-2"><div className="min-w-32 flex-1"><h4 className="font-black text-slate-900">{isLessonUnlocked ? lessonLabel : <><LockKeyhole className="mr-1 inline h-4 w-4"/>{lessonLabel}</>}</h4><p className="text-sm font-bold text-slate-600">{lesson.stars}/3 sao{lesson.completed ? ' · Đã hoàn thành' : ''}</p></div><div className="flex gap-1" aria-label={`${lessonLabel}: ${lesson.stars} trên 3 sao`}>{[0,1,2].map(index => <Star key={index} className={`h-7 w-7 ${index < lesson.stars ? 'fill-amber-400 text-amber-600' : 'fill-slate-100 text-slate-400'}`} aria-hidden/>)}</div>{isLessonUnlocked && lesson.stars < 3 && <button type="button" onClick={() => navigate(`/lessons/${lesson.id}`)} aria-label={`Vào ${lessonLabel}`} className="min-h-12 rounded-xl bg-emerald-700 px-3 font-black text-white"><Play className="mr-1 inline h-4 w-4"/>Vào bài</button>}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black sm:max-w-xl">{[
                {label:'Chặng 1',complete:lesson.stages.stage1.completed,locked:!lesson.stages.stage1.unlocked},
                {label:'Chặng 2',complete:lesson.stages.stage2.completed,locked:!lesson.stages.stage2.unlocked},
                {label:'Chặng 3',complete:lesson.stages.stage3.completed,locked:!lesson.stages.stage3.unlocked,count:`${lesson.stages.stage3.completedGames}/${lesson.stages.stage3.requiredGames} minigame`}
              ].map(stage => {
                const tone = stage.locked ? 'border-slate-300 bg-slate-100 text-slate-500' : stage.complete ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : 'border-amber-300 bg-amber-100 text-amber-950';
                return <span key={stage.label} className={`rounded-xl border p-2 ${tone}`}>{stage.label}<span className="mt-1 block">{stage.locked ? <LockKeyhole className="mx-auto h-4 w-4"/> : stage.complete ? '✓ +1 ⭐' : stage.count || 'Chưa xong'}</span></span>;
              })}</div>
            </div>})}</div>}
          </article>;
        })}
      </div>}

      <div className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-700">Mỗi Chặng hoàn thành nhận 1 sao: Chặng 1 lật hết thẻ từ, Chặng 2 hoàn thành phần luyện tập, Chặng 3 hoàn thành 2 minigame. Sao Chặng 2 không phụ thuộc số câu đúng. Hoàn tất Unit nhận thêm 5 sao một lần.</div>
      <div className="flex justify-end"><button type="button" onPointerDown={() => { window.clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setParentMode(true), 1400); }} onPointerUp={() => window.clearTimeout(holdTimer.current)} onPointerLeave={() => window.clearTimeout(holdTimer.current)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') holdTimer.current = window.setTimeout(() => setParentMode(true), 1400); }} onKeyUp={() => window.clearTimeout(holdTimer.current)} className="min-h-12 rounded-xl px-4 font-bold text-slate-700 underline">Giữ để xem chi tiết cho phụ huynh</button></div>

      {parentMode && <div role="dialog" aria-modal="true" aria-labelledby="parent-stars-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3"><section className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6"><div className="flex items-center justify-between gap-3"><h3 id="parent-stars-title" className="text-xl font-black text-slate-900">Đối chiếu sao theo bài</h3><button type="button" onClick={() => setParentMode(false)} className="min-h-12 rounded-xl bg-slate-100 px-4 font-bold">Đóng</button></div><p className="my-3 font-black text-slate-800">Bé đã nhận {ledger.totalStars} sao trong hành trình.</p><p className="mb-4 text-sm font-bold text-slate-600">Mỗi Lesson có tối đa 3 sao: hoàn thành Chặng 1 (lật hết thẻ), Chặng 2 (hoàn thành luyện tập) và Chặng 3 (2 minigame) nhận mỗi Chặng 1 sao, không dựa vào số câu đúng. Hoàn tất Unit nhận thêm 5 sao một lần.</p>{ledger.units.map(unit => <div key={unit.id} className="mb-3 rounded-2xl border p-3"><p className="font-black">Unit {unit.unitNumber}: {unit.title} · {unit.stars} sao đã nhận</p><p className="text-sm font-bold text-slate-600">Sao từ bài học: {unit.lessonStars} · Thưởng Unit: {unit.bonusReceived ? 'đã nhận 5 sao' : unit.completed ? 'đã hoàn thành' : 'nhận 5 sao khi hoàn tất'}</p>{unit.lessons.map(lesson => <div key={lesson.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t py-2 text-sm"><span>Lesson {lesson.lessonNumber}: {lesson.title} · Chặng 1 {lesson.stages.stage1.completed ? '✓ +1⭐' : '—'} · Chặng 2 {lesson.stages.stage2.completed ? '✓ +1⭐' : '—'} · Chặng 3 {lesson.stages.stage3.completed ? '✓ +1⭐' : `${lesson.stages.stage3.completedGames}/${lesson.stages.stage3.requiredGames} minigame`}</span><span className="font-black">{lesson.stars}/3</span>{lesson.stars < 3 && (unit.unlocked || unit.completed) && (lesson.unlocked || lesson.completed) && <button onClick={() => navigate(`/lessons/${lesson.id}`)} aria-label={`Vào Lesson ${lesson.lessonNumber}: ${lesson.title}`} className="min-h-12 rounded-xl bg-emerald-700 px-3 font-black text-white">Vào bài</button>}</div>)}</div>)}</section></div>}
    </section>
  );
};
