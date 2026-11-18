import { BookOpen, Check } from 'lucide-react';

const books = [
  {
    number: 1,
    age: '3–4 tuổi (Mầm)',
    title: 'Khởi đầu khám phá',
    description: 'Từ vựng gần gũi, giác quan và phản xạ tự nhiên.',
    activeTheme: 'from-teal-600 to-emerald-600 text-white shadow-md border-teal-500 ring-2 ring-teal-300',
    inactiveTheme: 'bg-white border-slate-200 text-slate-800 hover:border-teal-300 hover:bg-teal-50/30',
    iconActive: 'bg-white/20 text-white',
    iconInactive: 'bg-teal-50 text-teal-700',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-teal-100 text-teal-900'
  },
  {
    number: 2,
    age: '4–5 tuổi (Chồi)',
    title: 'Mở rộng giao tiếp',
    description: 'Câu đơn, hỏi đáp và tương tác trong lớp.',
    activeTheme: 'from-indigo-600 to-blue-600 text-white shadow-md border-indigo-500 ring-2 ring-indigo-300',
    inactiveTheme: 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/30',
    iconActive: 'bg-white/20 text-white',
    iconInactive: 'bg-indigo-50 text-indigo-700',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-indigo-100 text-indigo-900'
  },
  {
    number: 3,
    age: '5–6 tuổi (Lá)',
    title: 'Tự tin thể hiện',
    description: 'Hội thoại, kể chuyện và chuẩn bị vào lớp Một.',
    activeTheme: 'from-purple-600 to-pink-600 text-white shadow-md border-purple-500 ring-2 ring-purple-300',
    inactiveTheme: 'bg-white border-slate-200 text-slate-800 hover:border-purple-300 hover:bg-purple-50/30',
    iconActive: 'bg-white/20 text-white',
    iconInactive: 'bg-purple-50 text-purple-700',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-purple-100 text-purple-900'
  }
];

export function AdminBookTabs({ selected, onSelect }: { selected: number; onSelect: (book: number) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4" role="group" aria-label="Chọn sách giáo trình">
      {books.map((book) => {
        const isSelected = selected === book.number;
        return (
          <button
            type="button"
            key={book.number}
            aria-pressed={isSelected}
            onClick={() => onSelect(book.number)}
            className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
              isSelected ? `bg-gradient-to-br ${book.activeTheme}` : book.inactiveTheme
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? book.iconActive : book.iconInactive
                  }`}
                >
                  <BookOpen size={18} />
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isSelected ? book.badgeActive : book.badgeInactive
                  }`}
                >
                  {book.age}
                </span>
              </div>

              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-white text-teal-800 flex items-center justify-center shrink-0 shadow-xs">
                  <Check size={14} className="stroke-[3]" />
                </div>
              )}
            </div>

            <div>
              <strong className={`block text-base font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                Book {book.number} · {book.title}
              </strong>
              <p className={`text-xs mt-0.5 line-clamp-1 font-medium ${isSelected ? 'text-white/85' : 'text-slate-600'}`}>
                {book.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
