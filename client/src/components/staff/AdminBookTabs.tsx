import { BookOpen, Check } from 'lucide-react';
const books = [
  { number: 1, age: '3–4 tuổi', title: 'Khởi đầu khám phá', description: 'Từ vựng gần gũi, giác quan và phản xạ tự nhiên.' },
  { number: 2, age: '4–5 tuổi', title: 'Mở rộng giao tiếp', description: 'Câu đơn, hỏi đáp và tương tác trong lớp.' },
  { number: 3, age: '5–6 tuổi', title: 'Tự tin thể hiện', description: 'Hội thoại, kể chuyện và chuẩn bị vào lớp Một.' }
];
export function AdminBookTabs({ selected, onSelect }: { selected: number; onSelect: (book: number) => void }) {
  return <div className="admin-book-tabs" role="group" aria-label="Chọn sách giáo trình">
    {books.map(book => <button type="button" key={book.number} aria-pressed={selected === book.number} className="admin-book-tab" onClick={() => onSelect(book.number)}>
      <span className="admin-book-tab-top"><span className="admin-book-icon"><BookOpen size={22} /></span><span className="admin-book-age">{book.age}</span>{selected === book.number && <Check className="admin-book-check" size={18} />}</span>
      <span className="admin-book-title">Book {book.number} · {book.title}</span>
      <span className="admin-book-description">{book.description}</span>
    </button>)}
  </div>;
}
