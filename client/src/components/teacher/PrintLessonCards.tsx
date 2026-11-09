import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import './printLessonCards.css';

export function PrintLessonCards({ lesson }: { lesson: any }) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const rawList = lesson?.vocabularyItems || lesson?.vocabulary || [];
  const words = rawList.filter(
    (word: any) => (word?.english || word?.word) && (word.imageUrl || word.image) && !['INACTIVE', 'HIDDEN', 'DRAFT'].includes(word.status)
  );

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const finish = () => setPrinting(false);
    window.addEventListener('afterprint', finish);
    const images = [...document.querySelectorAll<HTMLImageElement>('#lesson-print-sheet img')];
    Promise.all(images.map(image => image.decode())).then(() => {
      if (!cancelled) window.print();
    }).catch(() => {
      if (!cancelled) {
        setError('Chưa tải đủ tranh để in. Kiểm tra kết nối và thử lại.');
        setPrinting(false);
      }
    });
    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', finish);
    };
  }, [printing]);

  return (
    <>
      <button
        type="button"
        className="teacher-button"
        disabled={!words.length || printing}
        onClick={() => {
          setError('');
          setPrinting(true);
        }}
        title="In các trang tranh đen trắng kèm chữ rỗng để trẻ mầm non tô màu"
      >
        <Printer size={16} />
        {printing ? 'Đang chuẩn bị tranh tô màu…' : 'In tranh tô màu từ vựng'}
      </button>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {printing &&
        createPortal(
          <section id="lesson-print-sheet">
            <header>
              <strong>Tranh Tô Màu Từ Vựng Tiếng Anh — {lesson.title}</strong>
              <p>
                {lesson.vietnameseTitle ? `${lesson.vietnameseTitle} · ` : ''}
                KCEnglishKids (Bé tập tô màu và luyện phát âm cùng cô & bố mẹ)
              </p>
            </header>
            <div className="lesson-print-grid">
              {words.map((word: any) => {
                const text = word.english || word.word || '';
                const img = word.imageUrl || word.image || '';
                return (
                  <article key={word._id} className="coloring-card">
                    <div className="coloring-img-wrapper">
                      <img src={img} alt={text} className="coloring-image" />
                    </div>
                    <div className="coloring-text-wrapper">
                      <strong className="coloring-word">{text}</strong>
                      {word.pronunciation && (
                        <span className="coloring-phonetic">/{word.pronunciation}/</span>
                      )}
                      <span className="coloring-vietnamese">{word.vietnamese}</span>
                    </div>
                    <div className="coloring-footer">
                      <span className="coloring-instruction">✏️ Bé hãy tô màu bức tranh và tập đọc nhé!</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>,
          document.body
        )}
    </>
  );
}
