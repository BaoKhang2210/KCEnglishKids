import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Layers,
  Sparkles,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Volume2,
  CornerDownRight,
  HelpCircle
} from 'lucide-react';
import { adminApi } from '../../services/api';

export const AdminCurriculumPage: React.FC = () => {
  const [curriculumTree, setCurriculumTree] = useState<any[]>([]);
  const [selectedBookNum, setSelectedBookNum] = useState<number>(1);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [unitModal, setUnitModal] = useState<{ mode: 'create' | 'edit'; data: any } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ mode: 'create' | 'edit'; unitId: string; data: any } | null>(null);
  const [vocabModal, setVocabModal] = useState<{ mode: 'create' | 'edit'; lessonId: string; data: any } | null>(null);
  const [sentenceModal, setSentenceModal] = useState<{ mode: 'create' | 'edit'; lessonId: string; unitId: string; data: any } | null>(null);

  // Alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [unitForm, setUnitForm] = useState({
    unitNumber: 1,
    bigQuestion: '',
    storyTitle: '',
    concept: '',
    oracy: ''
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    vietnameseTitle: '',
    description: '',
    displayOrder: 1
  });

  const [vocabForm, setVocabForm] = useState({
    english: '',
    vietnamese: '',
    pronunciation: '',
    category: 'General'
  });

  const [sentenceForm, setSentenceForm] = useState<{
    entryMode: 'pair' | 'single';
    english: string;
    vietnamese: string;
    pronunciation: string;
    contentType: string;
    difficulty: number;
    relatedQuestion: string;
    questionEnglish: string;
    questionVietnamese: string;
    questionPronunciation: string;
    answers: Array<{ english: string; vietnamese: string; pronunciation: string }>;
  }>({
    entryMode: 'pair',
    english: '',
    vietnamese: '',
    pronunciation: '',
    contentType: 'PATTERN',
    difficulty: 1,
    relatedQuestion: '',
    questionEnglish: '',
    questionVietnamese: '',
    questionPronunciation: '',
    answers: [{ english: '', vietnamese: '', pronunciation: '' }]
  });

  useEffect(() => {
    loadCurriculum();
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadCurriculum = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDeepCurriculum();
      if (res.success && res.data) {
        setCurriculumTree(res.data);
        const book1 = res.data.find((b: any) => b.bookNumber === selectedBookNum) || res.data[0];
        if (book1?.units?.[0]) {
          setSelectedUnitId(book1.units[0]._id);
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể tải cây giáo trình.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const book = curriculumTree.find((b) => b.bookNumber === selectedBookNum);
    if (book?.units?.length > 0) {
      setSelectedUnitId(book.units[0]._id);
    } else {
      setSelectedUnitId(null);
    }
  }, [selectedBookNum, curriculumTree]);

  const currentBook = curriculumTree.find((b) => b.bookNumber === selectedBookNum) || curriculumTree[0];
  const currentUnits = currentBook?.units || [];
  const activeUnit = currentUnits.find((u: any) => u._id === selectedUnitId) || currentUnits[0] || null;

  // ── UNIT HANDLERS ─────────────────────────────────────────────────────────
  const handleOpenCreateUnit = () => {
    const nextNum = (currentUnits.length || 0) + 1;
    setUnitForm({
      unitNumber: nextNum,
      bigQuestion: '',
      storyTitle: '',
      concept: '',
      oracy: ''
    });
    setUnitModal({ mode: 'create', data: null });
  };

  const handleOpenEditUnit = (unit: any) => {
    setUnitForm({
      unitNumber: unit.unitNumber,
      bigQuestion: unit.bigQuestion || '',
      storyTitle: unit.storyTitle || '',
      concept: unit.concept || '',
      oracy: unit.oracy || ''
    });
    setUnitModal({ mode: 'edit', data: unit });
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.bigQuestion.trim()) {
      showAlert('error', 'Vui lòng nhập Big Question (Câu hỏi định hướng).');
      return;
    }

    try {
      if (unitModal?.mode === 'create') {
        const ageGroupCode = selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6';
        const res = await adminApi.createUnit({
          bookNumber: selectedBookNum,
          unitNumber: Number(unitForm.unitNumber),
          bigQuestion: unitForm.bigQuestion,
          storyTitle: unitForm.storyTitle,
          concept: unitForm.concept,
          oracy: unitForm.oracy,
          ageGroupCode
        });
        if (res.success) {
          showAlert('success', res.message || 'Tạo Unit mới thành công!');
          setUnitModal(null);
          loadCurriculum();
        }
      } else if (unitModal?.mode === 'edit' && unitModal.data) {
        const res = await adminApi.updateUnit(unitModal.data._id, {
          bigQuestion: unitForm.bigQuestion,
          storyTitle: unitForm.storyTitle,
          concept: unitForm.concept,
          oracy: unitForm.oracy
        });
        if (res.success) {
          showAlert('success', res.message || 'Cập nhật Unit thành công!');
          setUnitModal(null);
          loadCurriculum();
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Thao tác Unit thất bại.');
    }
  };

  const handleDeleteUnit = async (unit: any) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Unit ${unit.unitNumber}: "${unit.bigQuestion}"?`)) return;
    try {
      const res = await adminApi.deleteUnit(unit._id);
      if (res.success) {
        showAlert('success', res.message || 'Đã xóa Unit thành công.');
        loadCurriculum();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa Unit.');
    }
  };

  // ── LESSON HANDLERS ───────────────────────────────────────────────────────
  const handleOpenCreateLesson = (unitId: string) => {
    const parentUnit = currentUnits.find((u: any) => u._id === unitId);
    const existingLessons = parentUnit?.lessons || [];
    setLessonForm({
      title: '',
      vietnameseTitle: '',
      description: '',
      displayOrder: existingLessons.length + 1
    });
    setLessonModal({ mode: 'create', unitId, data: null });
  };

  const handleOpenEditLesson = (lesson: any, unitId: string) => {
    setLessonForm({
      title: lesson.title,
      vietnameseTitle: lesson.vietnameseTitle || '',
      description: lesson.description || '',
      displayOrder: lesson.displayOrder || 1
    });
    setLessonModal({ mode: 'edit', unitId, data: lesson });
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      showAlert('error', 'Vui lòng nhập tiêu đề bài học.');
      return;
    }

    try {
      if (lessonModal?.mode === 'create') {
        const ageGroupCode = selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6';
        const res = await adminApi.createLesson({
          title: lessonForm.title,
          vietnameseTitle: lessonForm.vietnameseTitle,
          description: lessonForm.description,
          displayOrder: Number(lessonForm.displayOrder),
          unitId: lessonModal.unitId,
          ageGroupCode
        });
        if (res.success) {
          showAlert('success', res.message || 'Tạo bài học thành công!');
          setLessonModal(null);
          loadCurriculum();
        }
      } else if (lessonModal?.mode === 'edit' && lessonModal.data) {
        const res = await adminApi.updateLesson(lessonModal.data._id, {
          title: lessonForm.title,
          vietnameseTitle: lessonForm.vietnameseTitle,
          description: lessonForm.description,
          displayOrder: Number(lessonForm.displayOrder)
        });
        if (res.success) {
          showAlert('success', res.message || 'Cập nhật bài học thành công!');
          setLessonModal(null);
          loadCurriculum();
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Thao tác bài học thất bại.');
    }
  };

  const handleDeleteLesson = async (lesson: any) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài học "${lesson.title}"?`)) return;
    try {
      const res = await adminApi.deleteLesson(lesson._id);
      if (res.success) {
        showAlert('success', res.message || 'Đã xóa bài học.');
        loadCurriculum();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa bài học.');
    }
  };

  // ── VOCABULARY HANDLERS ───────────────────────────────────────────────────
  const handleOpenCreateVocab = (lessonId: string) => {
    setVocabForm({
      english: '',
      vietnamese: '',
      pronunciation: '',
      category: 'General'
    });
    setVocabModal({ mode: 'create', lessonId, data: null });
  };

  const handleOpenEditVocab = (vocab: any, lessonId: string) => {
    setVocabForm({
      english: vocab.word || vocab.english || '',
      vietnamese: vocab.vietnamese || '',
      pronunciation: vocab.pronunciation || '',
      category: vocab.category || 'General'
    });
    setVocabModal({ mode: 'edit', lessonId, data: vocab });
  };

  const handleVocabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabForm.english.trim() || !vocabForm.vietnamese.trim()) {
      showAlert('error', 'Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt.');
      return;
    }

    try {
      if (vocabModal?.mode === 'create') {
        const ageGroupCode = selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6';
        const res = await adminApi.createVocabulary({
          english: vocabForm.english,
          vietnamese: vocabForm.vietnamese,
          pronunciation: vocabForm.pronunciation,
          category: vocabForm.category,
          lessonId: vocabModal.lessonId,
          ageGroupCodes: [ageGroupCode]
        });
        if (res.success) {
          showAlert('success', res.message || 'Tạo từ vựng thành công!');
          setVocabModal(null);
          loadCurriculum();
        }
      } else if (vocabModal?.mode === 'edit' && vocabModal.data) {
        const res = await adminApi.updateVocabulary(vocabModal.data._id, {
          english: vocabForm.english,
          vietnamese: vocabForm.vietnamese,
          pronunciation: vocabForm.pronunciation,
          category: vocabForm.category
        });
        if (res.success) {
          showAlert('success', res.message || 'Cập nhật từ vựng thành công!');
          setVocabModal(null);
          loadCurriculum();
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Thao tác từ vựng thất bại.');
    }
  };

  const handleDeleteVocab = async (vocab: any) => {
    if (!window.confirm(`Bạn có chắc muốn xóa từ vựng "${vocab.word || vocab.english}"?`)) return;
    try {
      const res = await adminApi.deleteVocabulary(vocab._id);
      if (res.success) {
        showAlert('success', res.message || 'Đã xóa từ vựng.');
        loadCurriculum();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa từ vựng.');
    }
  };

  // ── SENTENCE HANDLERS ─────────────────────────────────────────────────────
  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  const handleOpenCreateSentence = (lessonId: string, unitId: string) => {
    setSentenceForm({
      entryMode: 'pair',
      english: '',
      vietnamese: '',
      pronunciation: '',
      contentType: 'PATTERN',
      difficulty: 1,
      relatedQuestion: '',
      questionEnglish: '',
      questionVietnamese: '',
      questionPronunciation: '',
      answers: [{ english: '', vietnamese: '', pronunciation: '' }]
    });
    setSentenceModal({ mode: 'create', lessonId, unitId, data: null });
  };

  const handleOpenEditSentence = (item: any, lessonId: string, unitId: string) => {
    setSentenceForm({
      entryMode: 'single',
      english: item.english || '',
      vietnamese: item.vietnamese || '',
      pronunciation: item.pronunciation || '',
      contentType: item.contentType || 'PATTERN',
      difficulty: item.difficulty || 1,
      relatedQuestion: item.relatedQuestion || '',
      questionEnglish: '',
      questionVietnamese: '',
      questionPronunciation: '',
      answers: []
    });
    setSentenceModal({ mode: 'edit', lessonId, unitId, data: item });
  };

  const handleSentenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ageGroupCode = selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6';

    try {
      if (sentenceModal?.mode === 'create') {
        if (sentenceForm.entryMode === 'pair') {
          if (!sentenceForm.questionEnglish.trim()) {
            showAlert('error', 'Vui lòng nhập câu hỏi tiếng Anh.');
            return;
          }
          const validAnswers = sentenceForm.answers.filter((a) => a.english.trim());
          if (validAnswers.length === 0) {
            showAlert('error', 'Vui lòng nhập ít nhất 1 câu trả lời đi kèm.');
            return;
          }

          const res = await adminApi.createSentencePattern({
            isPair: true,
            english: sentenceForm.questionEnglish.trim(),
            vietnamese: sentenceForm.questionVietnamese.trim(),
            pronunciation: sentenceForm.questionPronunciation.trim(),
            contentType: 'QUESTION',
            difficulty: Number(sentenceForm.difficulty) || 1,
            ageGroupCode,
            sourceUnit: sentenceModal.unitId,
            lesson: sentenceModal.lessonId,
            answers: validAnswers
          });

          if (res.success) {
            showAlert('success', 'Thêm cặp câu Hỏi & Đáp thành công!');
            setSentenceModal(null);
            loadCurriculum();
          }
        } else {
          // Single sentence mode
          if (!sentenceForm.english.trim()) {
            showAlert('error', 'Vui lòng nhập mẫu câu tiếng Anh.');
            return;
          }

          const res = await adminApi.createSentencePattern({
            english: sentenceForm.english.trim(),
            vietnamese: sentenceForm.vietnamese.trim(),
            pronunciation: sentenceForm.pronunciation.trim(),
            contentType: sentenceForm.contentType,
            difficulty: Number(sentenceForm.difficulty) || 1,
            relatedQuestion:
              sentenceForm.contentType === 'ANSWER' && sentenceForm.relatedQuestion
                ? sentenceForm.relatedQuestion
                : undefined,
            ageGroupCode,
            sourceUnit: sentenceModal.unitId,
            lesson: sentenceModal.lessonId
          });

          if (res.success) {
            showAlert('success', 'Thêm mẫu câu vào bài học thành công!');
            setSentenceModal(null);
            loadCurriculum();
          }
        }
      } else if (sentenceModal?.mode === 'edit' && sentenceModal.data) {
        if (!sentenceForm.english.trim()) {
          showAlert('error', 'Vui lòng nhập mẫu câu tiếng Anh.');
          return;
        }

        const res = await adminApi.updateSentencePattern(sentenceModal.data._id, {
          english: sentenceForm.english.trim(),
          vietnamese: sentenceForm.vietnamese.trim(),
          pronunciation: sentenceForm.pronunciation.trim(),
          contentType: sentenceForm.contentType,
          difficulty: Number(sentenceForm.difficulty) || 1,
          relatedQuestion:
            sentenceForm.contentType === 'ANSWER' && sentenceForm.relatedQuestion
              ? sentenceForm.relatedQuestion
              : undefined
        });

        if (res.success) {
          showAlert('success', 'Cập nhật mẫu câu thành công!');
          setSentenceModal(null);
          loadCurriculum();
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Thao tác mẫu câu thất bại.');
    }
  };

  // Helper to group sentences into paired Question & Answer blocks + standalone patterns
  const groupSentencesForDisplay = (sentences: any[] = []) => {
    if (!sentences || sentences.length === 0) return [];

    const result: Array<{
      id: string;
      isPair: boolean;
      question?: any;
      answers: any[];
      standalone?: any;
    }> = [];

    const absorbedAnswerIds = new Set<string>();

    // Pass 1: Explicitly linked via relatedQuestion or pairId
    const questionToAnswers = new Map<string, any[]>();
    const pairIdToAnswers = new Map<string, any[]>();

    sentences.forEach((s: any) => {
      if (s.contentType === 'ANSWER') {
        if (s.relatedQuestion) {
          const qId = String(s.relatedQuestion);
          if (!questionToAnswers.has(qId)) questionToAnswers.set(qId, []);
          questionToAnswers.get(qId)!.push(s);
          absorbedAnswerIds.add(String(s._id));
        } else if (s.pairId) {
          if (!pairIdToAnswers.has(s.pairId)) pairIdToAnswers.set(s.pairId, []);
          pairIdToAnswers.get(s.pairId)!.push(s);
          absorbedAnswerIds.add(String(s._id));
        }
      }
    });

    // Pass 2: Sequential grouping
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      const sId = String(s._id);

      if (absorbedAnswerIds.has(sId)) continue;

      if (s.contentType === 'QUESTION') {
        let answers: any[] = [];

        if (questionToAnswers.has(sId)) {
          answers.push(...questionToAnswers.get(sId)!);
        } else if (s.pairId && pairIdToAnswers.has(s.pairId)) {
          answers.push(...pairIdToAnswers.get(s.pairId)!);
        } else {
          // Heuristic for sequential answers right after question
          let j = i + 1;
          while (
            j < sentences.length &&
            sentences[j].contentType === 'ANSWER' &&
            !sentences[j].relatedQuestion &&
            !absorbedAnswerIds.has(String(sentences[j]._id))
          ) {
            const ans = sentences[j];
            answers.push(ans);
            absorbedAnswerIds.add(String(ans._id));
            j++;
          }
        }

        result.push({
          id: sId,
          isPair: answers.length > 0,
          question: s,
          answers
        });
      } else {
        result.push({
          id: sId,
          isPair: false,
          standalone: s,
          answers: []
        });
      }
    }

    return result;
  };

  const handleDeleteSentence = async (sentence: any) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mẫu câu "${sentence.english}"?`)) return;
    try {
      const res = await adminApi.deleteSentencePattern(sentence._id);
      if (res.success) {
        showAlert('success', 'Đã xóa mẫu câu khỏi bài học.');
        loadCurriculum();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa mẫu câu.');
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
            <BookOpen className="text-amber-400" size={26} />
            <span>Quản Lý Giáo Trình & Bài Học</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Toàn quyền Thêm - Sửa - Xóa 3 Bộ sách, 27 Units, câu hỏi định hướng, bài học và từ vựng chuẩn hóa.
          </p>
        </div>

        <button
          id="btn-create-unit"
          onClick={handleOpenCreateUnit}
          className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Thêm Unit Mới Vào Sách {selectedBookNum}</span>
        </button>
      </div>

      {/* Book Tabs (Sách 1, 2, 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { num: 1, age: '3-4 Tuổi (Mầm)', desc: 'Xây dựng phản xạ tự nhiên & từ vựng giác quan' },
          { num: 2, age: '4-5 Tuổi (Chồi)', desc: 'Mở rộng câu đơn & tương tác hoạt cảnh' },
          { num: 3, age: '5-6 Tuổi (Lá)', desc: 'Hội thoại tự tin & chuẩn bị tiền tiểu học' }
        ].map((book) => {
          const isSelected = selectedBookNum === book.num;
          return (
            <button
              key={book.num}
              onClick={() => setSelectedBookNum(book.num)}
              className={`p-4 rounded-3xl border text-left transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 border-amber-400 text-white shadow-xl shadow-amber-600/20 ring-1 ring-white/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-amber-200' : 'text-amber-400'}`}>
                  Book {book.num}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {book.age}
                </span>
              </div>
              <p className={`text-xs ${isSelected ? 'text-amber-100' : 'text-slate-400'} font-medium`}>{book.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Units List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : currentUnits.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
          <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">Chưa có Unit nào trong Sách {selectedBookNum}</p>
          <button
            onClick={handleOpenCreateUnit}
            className="mt-3 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
          >
            Tạo Unit Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT PANEL: LIST OF UNITS IN BOOK (lg:col-span-4) ─── */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Danh sách Unit ({currentUnits.length})
              </span>
              <button
                onClick={handleOpenCreateUnit}
                className="px-2.5 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1 transition-all shadow-sm"
                title="Tạo Unit mới vào sách này"
              >
                <Plus size={13} />
                <span>Thêm Unit</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {currentUnits.map((unit: any) => {
                const isSelected = activeUnit?._id === unit._id;
                const lessonCount = unit.lessons?.length || 0;

                return (
                  <div
                    key={unit._id}
                    onClick={() => setSelectedUnitId(unit._id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-400 text-white shadow-xl shadow-amber-950/40 ring-1 ring-amber-400/40'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                              : 'bg-slate-800/80 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          U{unit.unitNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                              Unit {unit.unitNumber}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400">
                              {lessonCount} bài
                            </span>
                          </div>
                          <h3 className="text-xs sm:text-sm font-black text-white mt-0.5 line-clamp-1">
                            "{unit.bigQuestion}"
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditUnit(unit)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                          title="Sửa Unit"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all"
                          title="Xóa Unit"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {unit.storyTitle && (
                      <p className="text-[11px] text-slate-400 mt-2 truncate">
                        Story: <span className="text-slate-300 font-medium">{unit.storyTitle}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT PANEL: SELECTED UNIT DETAIL & LESSONS (lg:col-span-8) ─── */}
          <div className="lg:col-span-8 space-y-5">
            {activeUnit ? (
              <>
                {/* Active Unit Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Book {activeUnit.bookNumber} • Unit {activeUnit.unitNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {activeUnit.lessons?.length || 0} bài học
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-white mt-1.5">
                        "{activeUnit.bigQuestion}"
                      </h2>
                      {activeUnit.storyTitle && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Story: <span className="text-amber-200 font-bold">{activeUnit.storyTitle}</span>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenCreateLesson(activeUnit._id)}
                      className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={15} />
                      <span>Thêm Bài Học Mới</span>
                    </button>
                  </div>

                  {/* Concept & Oracy summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-4">
                    <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                      <span className="font-bold text-amber-400 block mb-0.5">Khái niệm & Giá trị (Concept):</span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {activeUnit.concept || 'Chưa cập nhật'}
                      </p>
                    </div>
                    <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                      <span className="font-bold text-indigo-400 block mb-0.5">Mục tiêu đàm thoại (Oracy Goal):</span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {activeUnit.oracy || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lessons of this Unit */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Layers size={16} className="text-amber-400" />
                      <span>Các Bài Học Trong Unit {activeUnit.unitNumber}</span>
                    </h3>
                  </div>

                  {!activeUnit.lessons || activeUnit.lessons.length === 0 ? (
                    <div className="py-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800 p-6">
                      <Layers size={36} className="mx-auto text-slate-600 mb-2.5" />
                      <p className="text-sm font-bold text-slate-300">
                        Chưa có bài học nào trong Unit {activeUnit.unitNumber}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Bấm nút bên dưới để tạo bài học đầu tiên cho Unit này.
                      </p>
                      <button
                        onClick={() => handleOpenCreateLesson(activeUnit._id)}
                        className="mt-3.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                      >
                        Thêm Bài Học Đầu Tiên
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeUnit.lessons.map((lesson: any, lIndex: number) => (
                        <div
                          key={lesson._id}
                          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl transition-all space-y-4"
                        >
                          {/* Lesson Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                            <div className="flex items-start gap-3">
                              <span className="h-7 w-7 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-black text-xs flex items-center justify-center shrink-0">
                                {lIndex + 1}
                              </span>
                              <div>
                                <h4 className="text-sm font-black text-white flex items-center gap-2">
                                  <span>{lesson.title}</span>
                                  {lesson.vietnameseTitle && (
                                    <span className="text-slate-400 font-normal text-xs">({lesson.vietnameseTitle})</span>
                                  )}
                                </h4>
                                {lesson.description && (
                                  <p className="text-xs text-slate-400 mt-0.5">{lesson.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                              <button
                                onClick={() => handleOpenCreateVocab(lesson._id)}
                                className="px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/20 transition-all flex items-center gap-1 shadow-sm"
                                title="Thêm từ vựng vào bài học này"
                              >
                                <Plus size={13} />
                                <span>Thêm Từ Vựng</span>
                              </button>
                              <button
                                onClick={() => handleOpenCreateSentence(lesson._id, activeUnit._id)}
                                className="px-2.5 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 font-bold text-xs border border-pink-500/20 transition-all flex items-center gap-1 shadow-sm"
                                title="Thêm mẫu câu hoặc hội thoại vào bài học này"
                              >
                                <Plus size={13} />
                                <span>Thêm Mẫu Câu</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditLesson(lesson, activeUnit._id)}
                                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-all ml-1"
                                title="Sửa bài học"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson)}
                                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 transition-all"
                                title="Xóa bài học"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Vocabulary Section of Lesson */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                                <Sparkles size={12} />
                                <span>Từ vựng ({lesson.vocabulary?.length || 0})</span>
                              </span>
                            </div>

                            {lesson.vocabulary && lesson.vocabulary.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {lesson.vocabulary.map((v: any) => (
                                  <div
                                    key={v._id}
                                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center gap-2 group hover:border-teal-500/40 transition-all shadow-sm"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => playAudio(v.word || v.english)}
                                      className="text-slate-500 hover:text-teal-400 transition-colors"
                                      title="Nghe phát âm"
                                    >
                                      <Volume2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditVocab(v, lesson._id)}
                                      className="font-bold text-teal-300 hover:underline text-left"
                                      title="Sửa từ vựng"
                                    >
                                      {v.word || v.english}
                                    </button>
                                    <span className="text-slate-600">→</span>
                                    <span className="text-slate-400">{v.vietnamese}</span>
                                    <button
                                      onClick={() => handleDeleteVocab(v)}
                                      className="text-slate-600 hover:text-rose-400 ml-1 transition-colors"
                                      title="Xóa từ vựng"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-500 italic">Chưa có từ vựng nào trong bài học này.</p>
                            )}
                          </div>

                          {/* Sentence Patterns Section of Lesson */}
                          <div className="pt-2 border-t border-slate-800/60">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                                  <MessageSquare size={12} />
                                  <span>Mẫu câu & Hội thoại ({lesson.sentences?.length || 0})</span>
                                </span>
                                <span className="hidden sm:inline-block text-[10px] text-slate-500 font-medium">
                                  (Phân biệt rõ Cặp Hỏi ❓ & Đáp 💬)
                                </span>
                              </div>
                            </div>

                            {lesson.sentences && lesson.sentences.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {groupSentencesForDisplay(lesson.sentences).map((group: any) => {
                                  if (group.isPair) {
                                    return (
                                      <div
                                        key={group.id}
                                        className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-pink-500/40 transition-all space-y-2.5 shadow-sm"
                                      >
                                        {/* Question Row */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-2">
                                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 mt-0.5 flex items-center gap-1">
                                              <span>❓ Hỏi</span>
                                            </span>
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <p className="font-extrabold text-white text-xs leading-snug">
                                                  {group.question.english}
                                                </p>
                                                <button
                                                  type="button"
                                                  onClick={() => playAudio(group.question.english)}
                                                  className="text-slate-500 hover:text-pink-400 transition-colors"
                                                  title="Nghe phát âm câu hỏi"
                                                >
                                                  <Volume2 size={13} />
                                                </button>
                                              </div>
                                              {group.question.vietnamese && (
                                                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                                  {group.question.vietnamese}
                                                </p>
                                              )}
                                              {group.question.pronunciation && (
                                                <p className="text-[10px] text-pink-300/80 font-mono mt-0.5">
                                                  {group.question.pronunciation}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleOpenEditSentence(group.question, lesson._id, activeUnit._id)
                                              }
                                              className="p-1 text-slate-500 hover:text-white transition-colors"
                                              title="Sửa câu hỏi"
                                            >
                                              <Edit size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteSentence(group.question)}
                                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                              title="Xóa câu hỏi"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Answers Connected Sub-block */}
                                        {group.answers && group.answers.length > 0 && (
                                          <div className="ml-2 pl-3 border-l-2 border-emerald-500/30 space-y-2 pt-0.5">
                                            {group.answers.map((ans: any) => (
                                              <div
                                                key={ans._id}
                                                className="flex items-start justify-between gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80"
                                              >
                                                <div className="flex items-start gap-2">
                                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 mt-0.5 flex items-center gap-1">
                                                    <CornerDownRight size={10} />
                                                    <span>Đáp</span>
                                                  </span>
                                                  <div>
                                                    <div className="flex items-center gap-1.5">
                                                      <p className="font-bold text-emerald-200 text-xs">
                                                        {ans.english}
                                                      </p>
                                                      <button
                                                        type="button"
                                                        onClick={() => playAudio(ans.english)}
                                                        className="text-slate-500 hover:text-emerald-400 transition-colors"
                                                        title="Nghe phát âm câu trả lời"
                                                      >
                                                        <Volume2 size={12} />
                                                      </button>
                                                    </div>
                                                    {ans.vietnamese && (
                                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {ans.vietnamese}
                                                      </p>
                                                    )}
                                                    {ans.pronunciation && (
                                                      <p className="text-[10px] text-emerald-300/80 font-mono mt-0.5">
                                                        {ans.pronunciation}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleOpenEditSentence(ans, lesson._id, activeUnit._id)
                                                    }
                                                    className="p-1 text-slate-500 hover:text-white transition-colors"
                                                    title="Sửa câu trả lời"
                                                  >
                                                    <Edit size={11} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteSentence(ans)}
                                                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                                    title="Xóa câu trả lời"
                                                  >
                                                    <Trash2 size={11} />
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    // Standalone item (e.g. pattern, statement, or dialogue)
                                    const s = group.question || group.standalone;
                                    const isQuestion = s.contentType === 'QUESTION';
                                    const isAnswer = s.contentType === 'ANSWER';
                                    return (
                                      <div
                                        key={group.id}
                                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-pink-500/40 text-xs flex items-start justify-between gap-2 group transition-all shadow-xs"
                                      >
                                        <div className="flex items-start gap-2">
                                          <button
                                            type="button"
                                            onClick={() => playAudio(s.english)}
                                            className="text-slate-500 hover:text-pink-400 transition-colors mt-0.5 shrink-0"
                                            title="Nghe phát âm"
                                          >
                                            <Volume2 size={14} />
                                          </button>
                                          <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                              <span
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                  isQuestion
                                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                    : isAnswer
                                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                    : 'bg-pink-500/10 text-pink-300 border border-pink-500/20'
                                                }`}
                                              >
                                                {isQuestion ? '❓ Câu hỏi' : isAnswer ? '💬 Trả lời' : 'Mẫu câu'}
                                              </span>
                                            </div>
                                            <p className="font-bold text-white text-xs leading-snug">{s.english}</p>
                                            {s.vietnamese && (
                                              <p className="text-[11px] text-slate-400 mt-0.5">{s.vietnamese}</p>
                                            )}
                                            {s.pronunciation && (
                                              <p className="text-[10px] text-pink-300/80 font-mono mt-0.5">
                                                {s.pronunciation}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditSentence(s, lesson._id, activeUnit._id)}
                                            className="p-1 text-slate-500 hover:text-white transition-colors"
                                            title="Sửa mẫu câu"
                                          >
                                            <Edit size={12} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteSentence(s)}
                                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                            title="Xóa mẫu câu"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-500 italic">Chưa có mẫu câu nào trong bài học này.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center bg-slate-900/50 rounded-3xl border border-slate-800 p-6">
                <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-300">Vui lòng chọn một Unit bên trái</p>
                <p className="text-xs text-slate-500 mt-1">Các bài học của Unit được chọn sẽ hiển thị tại đây.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT UNIT ───────────────────────────────────────── */}
      {unitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="text-amber-400" size={20} />
                <span>{unitModal.mode === 'create' ? `Tạo Unit Mới (Book ${selectedBookNum})` : `Chỉnh Sửa Unit ${unitForm.unitNumber}`}</span>
              </h2>
              <button onClick={() => setUnitModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUnitSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Số thứ tự Unit *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={unitForm.unitNumber}
                  onChange={(e) => setUnitForm({ ...unitForm, unitNumber: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Big Question (Câu hỏi định hướng tiếng Anh) *
                </label>
                <input
                  type="text"
                  required
                  value={unitForm.bigQuestion}
                  onChange={(e) => setUnitForm({ ...unitForm, bigQuestion: e.target.value })}
                  placeholder='Ví dụ: "Who is in our classroom?"'
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tên câu chuyện chủ đề (Story Title)
                </label>
                <input
                  type="text"
                  value={unitForm.storyTitle}
                  onChange={(e) => setUnitForm({ ...unitForm, storyTitle: e.target.value })}
                  placeholder="Ví dụ: The Welcome Song"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Khái niệm & Giá trị (Concept & Values)
                </label>
                <input
                  type="text"
                  value={unitForm.concept}
                  onChange={(e) => setUnitForm({ ...unitForm, concept: e.target.value })}
                  placeholder="Ví dụ: Friendship, sharing, kindness"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mục tiêu đàm thoại (Oracy Goal)
                </label>
                <input
                  type="text"
                  value={unitForm.oracy}
                  onChange={(e) => setUnitForm({ ...unitForm, oracy: e.target.value })}
                  placeholder="Ví dụ: Greeting teachers, saying please & thank you"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setUnitModal(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30"
                >
                  {unitModal.mode === 'create' ? 'Tạo Unit' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT LESSON ─────────────────────────────────────── */}
      {lessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="text-indigo-400" size={20} />
                <span>{lessonModal.mode === 'create' ? 'Thêm Bài Học Mới' : 'Chỉnh Sửa Bài Học'}</span>
              </h2>
              <button onClick={() => setLessonModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLessonSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tiêu đề bài học (tiếng Anh) *
                </label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Ví dụ: Hello & Welcome Song"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tiêu đề tiếng Việt
                </label>
                <input
                  type="text"
                  value={lessonForm.vietnameseTitle}
                  onChange={(e) => setLessonForm({ ...lessonForm, vietnameseTitle: e.target.value })}
                  placeholder="Ví dụ: Bài hát Chào mừng và Giới thiệu"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mô tả bài học
                </label>
                <textarea
                  rows={2}
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  placeholder="Mô tả mục tiêu và hoạt động trong bài học..."
                  className="w-full px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Thứ tự hiển thị
                </label>
                <input
                  type="number"
                  min="1"
                  value={lessonForm.displayOrder}
                  onChange={(e) => setLessonForm({ ...lessonForm, displayOrder: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setLessonModal(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  {lessonModal.mode === 'create' ? 'Tạo Bài Học' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT VOCABULARY ──────────────────────────────────── */}
      {vocabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="text-teal-400" size={20} />
                <span>{vocabModal.mode === 'create' ? 'Thêm Từ Vựng Mới' : 'Sửa Từ Vựng'}</span>
              </h2>
              <button onClick={() => setVocabModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleVocabSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Từ tiếng Anh *
                </label>
                <input
                  type="text"
                  required
                  value={vocabForm.english}
                  onChange={(e) => setVocabForm({ ...vocabForm, english: e.target.value })}
                  placeholder="Ví dụ: Apple, Hello, Teacher"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  value={vocabForm.vietnamese}
                  onChange={(e) => setVocabForm({ ...vocabForm, vietnamese: e.target.value })}
                  placeholder="Ví dụ: Quả táo, Xin chào, Giáo viên"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phiên âm IPA
                </label>
                <input
                  type="text"
                  value={vocabForm.pronunciation}
                  onChange={(e) => setVocabForm({ ...vocabForm, pronunciation: e.target.value })}
                  placeholder="Ví dụ: /ˈæp.əl/"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Chủ đề / Danh mục
                </label>
                <input
                  type="text"
                  value={vocabForm.category}
                  onChange={(e) => setVocabForm({ ...vocabForm, category: e.target.value })}
                  placeholder="Ví dụ: Greetings, Nature, Animals"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setVocabModal(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30"
                >
                  {vocabModal.mode === 'create' ? 'Thêm Từ' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT SENTENCE PATTERN ──────────────────────────── */}
      {sentenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-xl shadow-2xl animate-scale-up my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 shrink-0">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <MessageSquare className="text-pink-400" size={20} />
                <span>
                  {sentenceModal.mode === 'create'
                    ? sentenceForm.entryMode === 'pair'
                      ? 'Thêm Cặp Câu Hỏi & Trả Lời'
                      : 'Thêm Mẫu Câu Vào Bài Học'
                    : 'Chỉnh Sửa Mẫu Câu'}
                </span>
              </h2>
              <button onClick={() => setSentenceModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Mode Selector for creation mode */}
            {sentenceModal.mode === 'create' && (
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 mb-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setSentenceForm({ ...sentenceForm, entryMode: 'pair' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    sentenceForm.entryMode === 'pair'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Cặp Hỏi & Đáp (Khuyên dùng)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSentenceForm({ ...sentenceForm, entryMode: 'single' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    sentenceForm.entryMode === 'single'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare size={14} />
                  <span>Câu đơn lẻ / Mẫu câu</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSentenceSubmit} className="space-y-4 overflow-y-auto pr-1">
              {sentenceModal.mode === 'create' && sentenceForm.entryMode === 'pair' ? (
                <>
                  {/* Question Section */}
                  <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                        <HelpCircle size={12} />
                        <span>1. Câu Hỏi (Question)</span>
                      </span>
                      <span className="text-[11px] text-purple-300/80 font-medium">Bắt buộc</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Câu hỏi tiếng Anh *
                      </label>
                      <input
                        type="text"
                        required
                        value={sentenceForm.questionEnglish}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, questionEnglish: e.target.value })}
                        placeholder="Ví dụ: What is it? / What's your name? / Is it a book?"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500 focus:outline-none placeholder:text-slate-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Dịch nghĩa tiếng Việt
                        </label>
                        <input
                          type="text"
                          value={sentenceForm.questionVietnamese}
                          onChange={(e) =>
                            setSentenceForm({ ...sentenceForm, questionVietnamese: e.target.value })
                          }
                          placeholder="Ví dụ: Đây là cái gì? / Đó có phải là sách không?"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-purple-500 focus:outline-none placeholder:text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Phiên âm ngữ điệu (tùy chọn)
                        </label>
                        <input
                          type="text"
                          value={sentenceForm.questionPronunciation}
                          onChange={(e) =>
                            setSentenceForm({ ...sentenceForm, questionPronunciation: e.target.value })
                          }
                          placeholder="Ví dụ: /wɒt ɪz ɪt/ ↗"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-purple-500 focus:outline-none font-mono placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Answers Section */}
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <CornerDownRight size={12} />
                        <span>2. Câu Trả Lời Đi Kèm (Answer)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSentenceForm({
                            ...sentenceForm,
                            answers: [
                              ...sentenceForm.answers,
                              { english: '', vietnamese: '', pronunciation: '' }
                            ]
                          })
                        }
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                      >
                        <Plus size={13} />
                        <span>Thêm đáp án phụ (Yes / No...)</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {sentenceForm.answers.map((ans, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 relative"
                        >
                          {sentenceForm.answers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = sentenceForm.answers.filter((_, i) => i !== idx);
                                setSentenceForm({ ...sentenceForm, answers: next });
                              }}
                              className="absolute top-2.5 right-2.5 text-slate-500 hover:text-rose-400"
                              title="Xóa câu trả lời này"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <div>
                            <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                              Câu trả lời {sentenceForm.answers.length > 1 ? `#${idx + 1}` : ''} tiếng Anh *
                            </label>
                            <input
                              type="text"
                              required
                              value={ans.english}
                              onChange={(e) => {
                                const next = [...sentenceForm.answers];
                                next[idx].english = e.target.value;
                                setSentenceForm({ ...sentenceForm, answers: next });
                              }}
                              placeholder="Ví dụ: It's a book. / Yes, it is. / My name is Leo."
                              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none placeholder:text-slate-600"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">
                                Dịch nghĩa tiếng Việt
                              </label>
                              <input
                                type="text"
                                value={ans.vietnamese}
                                onChange={(e) => {
                                  const next = [...sentenceForm.answers];
                                  next[idx].vietnamese = e.target.value;
                                  setSentenceForm({ ...sentenceForm, answers: next });
                                }}
                                placeholder="Ví dụ: Đó là quyển sách. / Vâng, đúng rồi."
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none placeholder:text-slate-600"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">
                                Phiên âm (tùy chọn)
                              </label>
                              <input
                                type="text"
                                value={ans.pronunciation}
                                onChange={(e) => {
                                  const next = [...sentenceForm.answers];
                                  next[idx].pronunciation = e.target.value;
                                  setSentenceForm({ ...sentenceForm, answers: next });
                                }}
                                placeholder="Ví dụ: /ɪts ə bʊk/ ↘"
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none font-mono placeholder:text-slate-600"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Single sentence mode (or editing mode) */
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Loại câu *
                      </label>
                      <select
                        value={sentenceForm.contentType}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, contentType: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-pink-500 focus:outline-none"
                      >
                        <option value="PATTERN">Mẫu câu (Pattern)</option>
                        <option value="QUESTION">❓ Câu hỏi (Question)</option>
                        <option value="ANSWER">💬 Câu trả lời (Answer)</option>
                        <option value="ORACY">🗣️ Đàm thoại (Oracy)</option>
                        <option value="DIALOGUE">👥 Hội thoại (Dialogue)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Độ khó (1 - 3)
                      </label>
                      <select
                        value={sentenceForm.difficulty}
                        onChange={(e) =>
                          setSentenceForm({ ...sentenceForm, difficulty: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-pink-500 focus:outline-none"
                      >
                        <option value={1}>⭐ Cơ bản (1)</option>
                        <option value={2}>⭐⭐ Trung bình (2)</option>
                        <option value={3}>⭐⭐⭐ Nâng cao (3)</option>
                      </select>
                    </div>
                  </div>

                  {/* If Answer, let user choose which question it pairs with in this lesson */}
                  {sentenceForm.contentType === 'ANSWER' && (
                    <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30">
                      <label className="block text-xs font-bold text-purple-300 mb-1 flex items-center gap-1.5">
                        <HelpCircle size={13} />
                        <span>🔗 Đi chung với câu hỏi nào trong bài này?</span>
                      </label>
                      <select
                        value={sentenceForm.relatedQuestion}
                        onChange={(e) =>
                          setSentenceForm({ ...sentenceForm, relatedQuestion: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-purple-500 focus:outline-none"
                      >
                        <option value="">-- Không ghép cặp (Câu trả lời độc lập) --</option>
                        {(
                          activeUnit?.lessons?.find((l: any) => l._id === sentenceModal.lessonId)?.sentences || []
                        )
                          .filter((q: any) => q.contentType === 'QUESTION')
                          .map((q: any) => (
                            <option key={q._id} value={q._id}>
                              ❓ {q.english} {q.vietnamese ? `(${q.vietnamese})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Mẫu câu tiếng Anh *
                    </label>
                    <input
                      type="text"
                      required
                      value={sentenceForm.english}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, english: e.target.value })}
                      placeholder="Ví dụ: How are you? / I am fine, thank you."
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Dịch nghĩa tiếng Việt
                    </label>
                    <input
                      type="text"
                      value={sentenceForm.vietnamese}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, vietnamese: e.target.value })}
                      placeholder="Ví dụ: Bạn có khỏe không? / Mình khỏe, cảm ơn bạn."
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Phiên âm ngữ điệu (Intonation / Pronunciation)
                    </label>
                    <input
                      type="text"
                      value={sentenceForm.pronunciation}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, pronunciation: e.target.value })}
                      placeholder="Ví dụ: /haʊ ɑːr juː/ ↗"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-pink-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setSentenceModal(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 transition-all flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>
                    {sentenceModal.mode === 'create'
                      ? sentenceForm.entryMode === 'pair'
                        ? 'Lưu Cặp Hỏi & Đáp'
                        : 'Thêm Mẫu Câu'
                      : 'Lưu Thay Đổi'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
