import React, { useEffect, useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Edit,
  Trash2,
  Volume2,
  Check,
  X,
  AlertCircle,
  Layers
} from 'lucide-react';
import { adminApi } from '../../services/api';

export const AdminSentencesPage: React.FC = () => {
  const [curriculumTree, setCurriculumTree] = useState<any[]>([]);
  const [sentences, setSentences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBookNum, setSelectedBookNum] = useState<number>(1);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    english: '',
    vietnamese: '',
    pronunciation: '',
    contentType: 'PATTERN',
    ageGroupCode: '3-4',
    sourceUnit: '',
    lesson: '',
    difficulty: 1
  });

  useEffect(() => {
    loadDeepCurriculum();
  }, []);

  useEffect(() => {
    loadSentences();
  }, [selectedBookNum, selectedUnitId, selectedLessonId, filterType, search]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadDeepCurriculum = async () => {
    try {
      const res = await adminApi.getDeepCurriculum();
      if (res.success && res.data) {
        setCurriculumTree(res.data);
      }
    } catch (e) {
      console.warn('Could not load deep curriculum for sentence selector', e);
    }
  };

  const loadSentences = async () => {
    try {
      setLoading(true);
      const ageGroupCode = selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6';
      const res = await adminApi.getSentencePatterns({
        limit: 100,
        ageGroupCode,
        unitId: selectedUnitId !== 'ALL' ? selectedUnitId : undefined,
        lessonId: selectedLessonId !== 'ALL' ? selectedLessonId : undefined,
        contentType: filterType !== 'ALL' ? filterType : undefined,
        search: search.trim() || undefined
      });
      if (res.success) {
        setSentences(res.data);
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể tải danh sách mẫu câu.');
    } finally {
      setLoading(false);
    }
  };

  // Play TTS
  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85; // slower and clearer for kids
      window.speechSynthesis.speak(utterance);
    }
  };

  // Derived current book, units and lessons
  const currentBook = useMemo(() => {
    return curriculumTree.find((b) => b.bookNumber === selectedBookNum) || null;
  }, [curriculumTree, selectedBookNum]);

  const availableUnits = useMemo(() => {
    return currentBook?.units || [];
  }, [currentBook]);

  const availableLessons = useMemo(() => {
    if (selectedUnitId === 'ALL') {
      const all = availableUnits.flatMap((u: any) => u.lessons || []);
      const seen = new Set<string>();
      return all.filter((l: any) => {
        const id = String(l?._id || '');
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }
    const unit = availableUnits.find((u: any) => u._id === selectedUnitId);
    return unit?.lessons || [];
  }, [availableUnits, selectedUnitId]);

  // Group sentences by Unit -> Lesson hierarchy
  const hierarchyGroups = useMemo(() => {
    // Map of unitId -> { unit, lessons: { [lessonId]: { lesson, items: [] } } }
    const unitMap: {
      [unitId: string]: {
        unit: any;
        lessons: {
          [lessonId: string]: {
            lesson: any;
            items: any[];
          };
        };
      };
    } = {};

    sentences.forEach((item) => {
      const uId = item.sourceUnit?._id || 'UNASSIGNED';
      if (!unitMap[uId]) {
        unitMap[uId] = {
          unit: item.sourceUnit || {
            _id: 'UNASSIGNED',
            unitNumber: '?',
            bigQuestion: 'Mẫu câu chung (Toàn hệ thống)',
            bookNumber: selectedBookNum
          },
          lessons: {}
        };
      }

      const lId = item.lesson?._id || 'GENERAL';
      if (!unitMap[uId].lessons[lId]) {
        unitMap[uId].lessons[lId] = {
          lesson: item.lesson || {
            _id: 'GENERAL',
            title: 'Mẫu câu chủ đề chung của Unit'
          },
          items: []
        };
      }

      unitMap[uId].lessons[lId].items.push(item);
    });

    return Object.values(unitMap).sort((a, b) => {
      const numA = Number(a.unit.unitNumber) || 999;
      const numB = Number(b.unit.unitNumber) || 999;
      return numA - numB;
    });
  }, [sentences, selectedBookNum]);

  const handleOpenCreate = (prefillUnitId?: string, prefillLessonId?: string) => {
    const ageGroupCode = selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6';
    const unitId = prefillUnitId || (selectedUnitId !== 'ALL' ? selectedUnitId : availableUnits[0]?._id || '');
    const lessonId = prefillLessonId || (selectedLessonId !== 'ALL' ? selectedLessonId : '');

    setModalMode('create');
    setEditingId(null);
    setFormData({
      english: '',
      vietnamese: '',
      pronunciation: '',
      contentType: 'PATTERN',
      ageGroupCode,
      sourceUnit: unitId,
      lesson: lessonId,
      difficulty: 1
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setModalMode('edit');
    setEditingId(item._id);
    setFormData({
      english: item.english,
      vietnamese: item.vietnamese || '',
      pronunciation: item.pronunciation || '',
      contentType: item.contentType || 'PATTERN',
      ageGroupCode: item.ageGroupCode || '3-4',
      sourceUnit: item.sourceUnit?._id || item.sourceUnit || '',
      lesson: item.lesson?._id || item.lesson || '',
      difficulty: item.difficulty || 1
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.english.trim()) {
      showAlert('error', 'Vui lòng nhập câu tiếng Anh.');
      return;
    }

    try {
      if (modalMode === 'create') {
        const res = await adminApi.createSentencePattern(formData);
        if (res.success) {
          showAlert('success', 'Tạo mẫu câu mới thành công!');
          setModalOpen(false);
          loadSentences();
        }
      } else if (modalMode === 'edit' && editingId) {
        const res = await adminApi.updateSentencePattern(editingId, formData);
        if (res.success) {
          showAlert('success', 'Cập nhật mẫu câu thành công!');
          setModalOpen(false);
          loadSentences();
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Thao tác mẫu câu thất bại.');
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mẫu câu "${item.english}"?`)) return;
    try {
      const res = await adminApi.deleteSentencePattern(item._id);
      if (res.success) {
        showAlert('success', 'Đã xóa mẫu câu khỏi thư viện.');
        loadSentences();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa mẫu câu.');
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'QUESTION':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Hỏi (Question)</span>;
      case 'ANSWER':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">Đáp (Answer)</span>;
      case 'DIALOGUE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Hội thoại</span>;
      case 'ORACY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">Kỹ năng nói</span>;
      case 'PATTERN':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">Mẫu câu</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert toast notification */}
      {alert && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
          }`}
        >
          {alert.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <MessageSquare className="text-teal-400" size={26} />
            <span>Thư Viện Mẫu Câu Theo Sách & Giáo Trình</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sắp xếp phân cấp khoa học theo: Sách (Book 1, 2, 3) ➔ Unit ➔ Bài học (Lesson) ➔ Mẫu câu đàm thoại chuẩn.
          </p>
        </div>

        <button
          id="btn-create-sentence"
          onClick={() => handleOpenCreate()}
          className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Thêm Mẫu Câu Mới</span>
        </button>
      </div>

      {/* Book Tabs (Sách 1, 2, 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { num: 1, age: '3-4 Tuổi (Mầm)', desc: 'Câu đơn giản, từ ngữ giác quan & hành động hàng ngày' },
          { num: 2, age: '4-5 Tuổi (Chồi)', desc: 'Mẫu câu hỏi - đáp tương tác & tình huống trường lớp' },
          { num: 3, age: '5-6 Tuổi (Lá)', desc: 'Hội thoại phản xạ, tự tin giao tiếp & tiền tiểu học' }
        ].map((book) => {
          const isSelected = selectedBookNum === book.num;
          return (
            <button
              key={book.num}
              onClick={() => {
                setSelectedBookNum(book.num);
                setSelectedUnitId('ALL');
                setSelectedLessonId('ALL');
              }}
              className={`p-4 rounded-3xl border text-left transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 border-teal-400 text-white shadow-xl shadow-teal-600/20 ring-1 ring-white/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-teal-200' : 'text-teal-400'}`}>
                  Book {book.num}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {book.age}
                </span>
              </div>
              <p className={`text-xs ${isSelected ? 'text-teal-100' : 'text-slate-400'} font-medium`}>{book.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Hierarchical Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm câu tiếng Anh hoặc tiếng Việt..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Unit Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Unit:</span>
              <select
                value={selectedUnitId}
                onChange={(e) => {
                  setSelectedUnitId(e.target.value);
                  setSelectedLessonId('ALL');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500 max-w-[200px] truncate"
              >
                <option value="ALL">-- Tất cả Unit trong Sách {selectedBookNum} --</option>
                {availableUnits.map((u: any) => (
                  <option key={u._id} value={u._id}>
                    Unit {u.unitNumber}: {u.bigQuestion}
                  </option>
                ))}
              </select>
            </div>

            {/* Lesson Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Bài học:</span>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500 max-w-[200px] truncate"
              >
                <option value="ALL">-- Tất cả bài học --</option>
                {availableLessons.map((l: any) => (
                  <option key={l._id} value={l._id}>
                    {l.title} {l.vietnameseTitle ? `(${l.vietnameseTitle})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Content Type Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Loại:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Tất cả loại câu</option>
                <option value="PATTERN">Mẫu câu (Pattern)</option>
                <option value="QUESTION">Câu hỏi (Question)</option>
                <option value="ANSWER">Câu trả lời (Answer)</option>
                <option value="DIALOGUE">Hội thoại (Dialogue)</option>
                <option value="ORACY">Kỹ năng nói (Oracy)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 px-1">
          <span>
            Đang hiển thị mẫu câu của: <strong className="text-white">Book {selectedBookNum}</strong>
            {selectedUnitId !== 'ALL' && (
              <> • <strong className="text-teal-400">Unit {availableUnits.find((u: any) => u._id === selectedUnitId)?.unitNumber}</strong></>
            )}
          </span>
          <span className="font-black text-teal-400">{sentences.length} mẫu câu tìm thấy</span>
        </div>
      </div>

      {/* Hierarchical Sentences Tree View */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      ) : hierarchyGroups.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
          <MessageSquare size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">Không tìm thấy mẫu câu nào trong phạm vi chọn</p>
          <p className="text-xs text-slate-500 mt-1">Hãy thay đổi bộ lọc hoặc tạo mẫu câu mới cho Unit này.</p>
          <button
            onClick={() => handleOpenCreate()}
            className="mt-3.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md"
          >
            Thêm Mẫu Câu Mới
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {hierarchyGroups.map(({ unit, lessons }) => {
            const lessonEntries = Object.values(lessons);
            const totalUnitSentences = lessonEntries.reduce((acc, curr) => acc + curr.items.length, 0);

            return (
              <div
                key={unit._id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl"
              >
                {/* Unit Section Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950/30 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-black text-base flex items-center justify-center shrink-0 shadow-sm">
                      {unit.unitNumber !== '?' ? `U${unit.unitNumber}` : '🌟'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-teal-400">
                          {unit.unitNumber !== '?' ? `Unit ${unit.unitNumber} • Book ${unit.bookNumber || selectedBookNum}` : 'Mẫu câu chung'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                          {totalUnitSentences} câu
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                        "{unit.bigQuestion}"
                      </h2>
                    </div>
                  </div>

                  {unit._id !== 'UNASSIGNED' && (
                    <button
                      onClick={() => handleOpenCreate(unit._id)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-sm"
                    >
                      <Plus size={13} />
                      <span>Thêm Vào Unit {unit.unitNumber}</span>
                    </button>
                  )}
                </div>

                {/* Lessons inside Unit */}
                <div className="p-5 sm:p-6 space-y-6">
                  {lessonEntries.map(({ lesson, items }) => (
                    <div key={lesson._id} className="space-y-3">
                      {/* Lesson Subheader */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-indigo-400" />
                          <h3 className="text-xs sm:text-sm font-bold text-slate-200">
                            {lesson.title} {lesson.vietnameseTitle ? <span className="text-slate-400 font-normal">({lesson.vietnameseTitle})</span> : ''}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {items.length} câu
                          </span>
                        </div>

                        {lesson._id !== 'GENERAL' && (
                          <button
                            onClick={() => handleOpenCreate(unit._id, lesson._id)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
                          >
                            <Plus size={13} />
                            <span>Thêm câu vào bài này</span>
                          </button>
                        )}
                      </div>

                      {/* Sentences Grid in this Lesson */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((item) => (
                          <div
                            key={item._id}
                            className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-teal-500/30 transition-all flex flex-col justify-between shadow-sm group"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  {getTypeBadge(item.contentType)}
                                  {item.difficulty && (
                                    <span className="text-[10px] text-amber-400 font-bold">
                                      {'⭐'.repeat(Math.min(3, item.difficulty))}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEdit(item)}
                                    className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors"
                                    title="Sửa mẫu câu"
                                  >
                                    <Edit size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item)}
                                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                                    title="Xóa mẫu câu"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => playAudio(item.english)}
                                  className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                                  title="Nghe phát âm chuẩn TTS"
                                >
                                  <Volume2 size={16} />
                                </button>
                                <div>
                                  <p className="text-sm font-black text-white leading-snug">{item.english}</p>
                                  {item.vietnamese && (
                                    <p className="text-xs text-slate-400 mt-0.5">{item.vietnamese}</p>
                                  )}
                                  {item.pronunciation && (
                                    <p className="text-[11px] text-teal-300/80 font-mono mt-0.5">{item.pronunciation}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT SENTENCE PATTERN ────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <MessageSquare className="text-teal-400" size={20} />
                <span>{modalMode === 'create' ? 'Thêm Mẫu Câu Mới' : 'Chỉnh Sửa Mẫu Câu'}</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nội dung tiếng Anh *
                </label>
                <input
                  type="text"
                  required
                  value={formData.english}
                  onChange={(e) => setFormData({ ...formData, english: e.target.value })}
                  placeholder='Ví dụ: "What is your name?", "My name is Tom."'
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nghĩa tiếng Việt
                </label>
                <input
                  type="text"
                  value={formData.vietnamese}
                  onChange={(e) => setFormData({ ...formData, vietnamese: e.target.value })}
                  placeholder="Ví dụ: Bạn tên là gì? Mình tên là Tom."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phiên âm ngữ điệu (Intonation / IPA)
                </label>
                <input
                  type="text"
                  value={formData.pronunciation}
                  onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                  placeholder="Ví dụ: /wɒt ɪz jɔːr neɪm/ ↘"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Thể loại câu *
                  </label>
                  <select
                    value={formData.contentType}
                    onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="PATTERN">PATTERN (Mẫu câu)</option>
                    <option value="QUESTION">QUESTION (Câu hỏi)</option>
                    <option value="ANSWER">ANSWER (Câu trả lời)</option>
                    <option value="DIALOGUE">DIALOGUE (Hội thoại)</option>
                    <option value="ORACY">ORACY (Kỹ năng nói)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Độ khó (1 - 3)
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value={1}>⭐ Cơ bản (1)</option>
                    <option value={2}>⭐⭐ Trung bình (2)</option>
                    <option value={3}>⭐⭐⭐ Nâng cao (3)</option>
                  </select>
                </div>
              </div>

              {/* Hierarchy linking: Unit and Lesson */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Gắn với Unit *
                  </label>
                  <select
                    value={formData.sourceUnit}
                    onChange={(e) => setFormData({ ...formData, sourceUnit: e.target.value, lesson: '' })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">-- Mẫu chung toàn sách --</option>
                    {availableUnits.map((u: any) => (
                      <option key={u._id} value={u._id}>
                        Unit {u.unitNumber}: {u.bigQuestion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Gắn với Bài học (Lesson)
                  </label>
                  <select
                    value={formData.lesson}
                    onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">-- Mẫu chung của Unit --</option>
                    {(availableUnits.find((u: any) => u._id === formData.sourceUnit)?.lessons || availableLessons).map((l: any, idx: number) => (
                      <option key={`${l._id}-${idx}`} value={l._id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30"
                >
                  {modalMode === 'create' ? 'Tạo Mẫu Câu' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
