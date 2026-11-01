import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { StoryBanner } from '../StoryScene';
export type TeachingGuide = { ageGroup: string; label: string; adultRole: string; reviewWords:number; materials?:string; profileRevision?:number; source?:string; focus: {id:string;english:string;vietnamese:string;imageUrl:string;audioUrl?:string}[]; goals: {key:string;label:string}[]; phases: {key:string;title:string;action:string}[]; homeActivity: {title:string;minutes:number;steps:string[]} };
export function TeachingGuidePanel({ lessonId, compact = false }: { lessonId: string; compact?: boolean }) {
  const [guide,setGuide]=useState<TeachingGuide>();const [error,setError]=useState('');
  useEffect(()=>{setGuide(undefined);setError('');if(!lessonId)return;const controller=new AbortController();api.get(`/teacher/pedagogy/lessons/${lessonId}/guide`,controller.signal).then(r=>setGuide(r.data)).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[lessonId]);
  if(error)return <p role="alert">{error}</p>;
  if(!guide)return null;
  return <section className="portfolio-card my-5"><StoryBanner scene="classroom" compact title={guide.label} eyebrow={`ĐỒNG HÀNH LỨA TUỔI ${guide.ageGroup}`}><p>{guide.adultRole}</p></StoryBanner><h3 className="text-lg font-bold mb-3">Mục tiêu quan sát trong buổi</h3><ul className="learning-goals">{guide.goals.map(goal=><li key={goal.key}><span aria-hidden="true">🌱</span><span>{goal.label}</span></li>)}</ul>{!compact&&<div className="mt-5 grid gap-3 sm:grid-cols-2">{guide.phases.map((phase,index)=><div className="rounded-2xl bg-amber-50 p-4" key={phase.key}><h4 className="font-bold">{index+1}. {phase.title}</h4><p className="mt-2 text-sm">{phase.action}</p></div>)}</div>}<Link className="teacher-button mt-4" to={`/teacher/learning-studio?lessonId=${lessonId}`}>Xem trước trò chơi & in thẻ tranh</Link></section>;
}
