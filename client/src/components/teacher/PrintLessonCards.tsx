import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import './printLessonCards.css';

export function PrintLessonCards({ lesson }: { lesson: any }) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const words = (lesson.vocabularyItems || []).filter((word: any) => word?.english && word.imageUrl && !['INACTIVE', 'HIDDEN', 'DRAFT'].includes(word.status));
  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const finish = () => setPrinting(false);
    window.addEventListener('afterprint', finish);
    const images = [...document.querySelectorAll<HTMLImageElement>('#lesson-print-sheet img')];
    Promise.all(images.map(image => image.decode())).then(() => {
      if (!cancelled) window.print();
    }).catch(() => {
      if (!cancelled) { setError('Chưa tải đủ tranh để in. Kiểm tra kết nối và thử lại.'); setPrinting(false); }
    });
    return () => { cancelled = true; window.removeEventListener('afterprint', finish); };
  }, [printing]);
  return <>
    <button type="button" className="teacher-button" disabled={!words.length || printing} onClick={() => { setError(''); setPrinting(true); }}>
      <Printer size={16} />{printing ? 'Đang chuẩn bị bản in…' : 'In tranh bài này'}
    </button>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {printing && createPortal(<section id="lesson-print-sheet">
      <header><strong>{lesson.title}</strong><p>{lesson.vietnameseTitle} · KCEnglishKids</p></header>
      <div className="lesson-print-grid">{words.map((word: any) => <article key={word._id}>
        <img src={word.imageUrl} alt={word.english} /><strong>{word.english}</strong><span>{word.vietnamese}</span>
      </article>)}</div>
    </section>, document.body)}
  </>;
}
