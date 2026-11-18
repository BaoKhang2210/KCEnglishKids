import { AdminBookTabs } from '../../components/staff/AdminBookTabs';
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
  HelpCircle,
  Image as ImageIcon,
  ShieldCheck,
  Wand2
} from 'lucide-react';
import { adminApi } from '../../services/api';

export const AdminCurriculumPage: React.FC = () => {
  const [curriculumTree, setCurriculumTree] = useState<any[]>([]);
  const [selectedBookNum, setSelectedBookNum] = useState<number>(1);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [unitModal, setUnitModal] = useState<{ mode: 'create' | 'edit'; data: any } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ mode: 'create' | 'edit'; unitId: string; data: any } | null>(null);
  const [vocabModal, setVocabModal] = useState<{ mode: 'create' | 'edit'; lessonId: string; data: any } | null>(null);
  const [sentenceModal, setSentenceModal] = useState<{ mode: 'create' | 'edit'; lessonId: string; unitId: string; data: any } | null>(null);

  // AI Curriculum Creator Modal (AI Full Unit & Single Lesson Creator)
  const [aiCreatorModal, setAiCreatorModal] = useState<{
    mode: 'unit' | 'lesson';
    unitId?: string;
    unitData?: any;
    lessonId?: string;
  } | null>(null);
  const [aiTopic, setAiTopic] = useState('Các phương tiện giao thông (Vehicles)');
  const [aiAgeGroup, setAiAgeGroup] = useState<'3-4' | '4-5' | '5-6'>('3-4');
  const [aiDraft, setAiDraft] = useState<any | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiApplying, setAiApplying] = useState(false);
  const [selectedAiLessonIdx, setSelectedAiLessonIdx] = useState<number>(0);

  // Age-Appropriateness & Publish Readiness Audit Modal (Feature B)
  const [auditModal, setAuditModal] = useState<{ lesson: any; report: any } | null>(null);
  const [auditLoadingId, setAuditLoadingId] = useState<string | null>(null);

  // Alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [unitForm, setUnitForm] = useState({
    unitNumber: 1,
    bigQuestion: ''
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    vietnameseTitle: '',
    description: '',
    displayOrder: 1,
    unitId: ''
  });

  const [vocabForm, setVocabForm] = useState({
    english: '',
    vietnamese: '',
    pronunciation: '',
    imageUrl: '',
    audioUrl: '',
    mediaSource: '',
    mediaLicense: '',
    wordType: 'noun',
    status: 'ACTIVE',
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
          setSelectedUnitId(current =>
            book1.units.some((unit: any) => unit._id === current) ? current : book1.units[0]._id
          );
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
      setSelectedUnitId(current =>
        book.units.some((unit: any) => unit._id === current) ? current : book.units[0]._id
      );
    } else {
      setSelectedUnitId(null);
    }
  }, [selectedBookNum, curriculumTree]);

  const currentBook = curriculumTree.find((b) => b.bookNumber === selectedBookNum) || curriculumTree[0];
  const currentUnits = currentBook?.units || [];
  const activeUnit = currentUnits.find((u: any) => u._id === selectedUnitId) || currentUnits[0] || null;

  useEffect(() => {
    setSelectedLessonId(null);
  }, [selectedUnitId, selectedBookNum]);

  const activeLesson = activeUnit?.lessons?.find((l: any) => l._id === selectedLessonId) || null;

  // ── UNIT HANDLERS ─────────────────────────────────────────────────────────
  const handleOpenCreateUnit = () => {
    const maxUnitNumber = currentUnits.reduce(
      (max: number, unit: any) => Math.max(max, Number(unit.unitNumber) || 0),
      0
    );
    const nextNum = maxUnitNumber + 1;
    setUnitForm({
      unitNumber: nextNum,
      bigQuestion: ''
    });
    setUnitModal({ mode: 'create', data: null });
  };

  const handleOpenEditUnit = (unit: any) => {
    setUnitForm({
      unitNumber: unit.unitNumber,
      bigQuestion: unit.bigQuestion || ''
    });
    setUnitModal({ mode: 'edit', data: unit });
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.bigQuestion.trim()) {
      showAlert('error', 'Vui lòng nhập câu hỏi chủ đề (Big Question).');
      return;
    }

    try {
      if (unitModal?.mode === 'create') {
        const ageGroupCode = selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6';
        const res = await adminApi.createUnit({
          bookNumber: selectedBookNum,
          unitNumber: Number(unitForm.unitNumber),
          bigQuestion: unitForm.bigQuestion.trim(),
          ageGroupCode
        });
        if (res.success) {
          showAlert('success', res.message || 'Tạo Unit mới thành công!');
          setUnitModal(null);
          loadCurriculum();
        }
      } else if (unitModal?.mode === 'edit' && unitModal.data) {
        const res = await adminApi.updateUnit(unitModal.data._id, {
          bigQuestion: unitForm.bigQuestion.trim()
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
      unitId,
      displayOrder: existingLessons.length + 1
    });
    setLessonModal({ mode: 'create', unitId, data: null });
  };

  const handleOpenEditLesson = (lesson: any, unitId: string) => {
    setLessonForm({
      title: lesson.title,
      vietnameseTitle: lesson.vietnameseTitle || '',
      description: lesson.description || '',
      unitId,
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
          unitId: lessonForm.unitId || lessonModal.unitId,
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
          displayOrder: Number(lessonForm.displayOrder),
          unitId: lessonForm.unitId
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
      imageUrl: '',
      audioUrl: '',
      mediaSource: '',
      mediaLicense: '',
      wordType: 'noun',
      status: 'ACTIVE',
      category: 'General'
    });
    setVocabModal({ mode: 'create', lessonId, data: null });
  };

  const handleOpenEditVocab = (vocab: any, lessonId: string) => {
    setVocabForm({
      english: vocab.word || vocab.english || '',
      vietnamese: vocab.vietnamese || '',
      pronunciation: vocab.pronunciation || '',
      mediaSource: vocab.mediaSource || '',
      mediaLicense: vocab.mediaLicense || '',
      imageUrl: vocab.imageUrl || '',
      audioUrl: vocab.audioUrl || '',
      wordType: vocab.wordType || 'noun',
      status: vocab.status || 'ACTIVE',
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
          ...vocabForm,
          english: vocabForm.english.trim(),
          vietnamese: vocabForm.vietnamese.trim(),
          pronunciation: vocabForm.pronunciation.trim(),
          category: vocabForm.category.trim() || 'General',
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
          ...vocabForm,
          english: vocabForm.english.trim(),
          vietnamese: vocabForm.vietnamese.trim(),
          pronunciation: vocabForm.pronunciation.trim(),
          category: vocabForm.category.trim() || 'General'
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
    if (!text?.trim()) return;
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

  const handleOpenEditSentence = (item: any, lessonId: string, unitId: string, pairedAnswers: any[] = []) => {
    const isPairMode = (item.contentType === 'QUESTION' && pairedAnswers.length > 0) || (Array.isArray(item.answers) && item.answers.length > 0);
    const answersToLoad = pairedAnswers.length > 0 ? pairedAnswers : (item.answers || []);

    const relQuestionId = item.relatedQuestion?._id
      ? String(item.relatedQuestion._id)
      : (item.relatedQuestion ? String(item.relatedQuestion) : '');

    setSentenceForm({
      entryMode: isPairMode ? 'pair' : 'single',
      english: item.english || '',
      vietnamese: item.vietnamese || '',
      pronunciation: item.pronunciation || '',
      contentType: item.contentType || 'PATTERN',
      difficulty: item.difficulty || 1,
      relatedQuestion: relQuestionId,
      questionEnglish: item.english || '',
      questionVietnamese: item.vietnamese || '',
      questionPronunciation: item.pronunciation || '',
      answers: answersToLoad.length > 0
        ? answersToLoad.map((a: any) => ({
            _id: a._id,
            english: a.english || '',
            vietnamese: a.vietnamese || '',
            pronunciation: a.pronunciation || ''
          }))
        : [{ english: '', vietnamese: '', pronunciation: '' }]
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

          const res = await adminApi.updateSentencePattern(sentenceModal.data._id, {
            english: sentenceForm.questionEnglish.trim(),
            vietnamese: sentenceForm.questionVietnamese.trim(),
            pronunciation: sentenceForm.questionPronunciation.trim(),
            contentType: 'QUESTION',
            difficulty: Number(sentenceForm.difficulty) || 1,
            answers: validAnswers
          });

          if (res.success) {
            showAlert('success', 'Cập nhật cặp câu Hỏi & Đáp thành công!');
            setSentenceModal(null);
            loadCurriculum();
          }
        } else {
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

    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      const sId = String(s._id);

      if (absorbedAnswerIds.has(sId)) continue;

      if (s.contentType === 'QUESTION') {
        const answers: any[] = [];

        if (questionToAnswers.has(sId)) {
          answers.push(...questionToAnswers.get(sId)!);
        } else if (s.pairId && pairIdToAnswers.has(s.pairId)) {
          answers.push(...pairIdToAnswers.get(s.pairId)!);
        } else {
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

  // ── A. AI CURRICULUM CREATOR HANDLERS (Tạo trọn gói Unit Mới & Tạo Bài học vào Unit) ──
  const handleOpenAiCreator = () => {
    const defaultAge: '3-4' | '4-5' | '5-6' =
      selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6';
    setAiAgeGroup(defaultAge);
    setAiTopic('Các phương tiện giao thông (Vehicles)');
    setAiCreatorModal({ mode: 'unit' });
    setAiDraft(null);
    setSelectedAiLessonIdx(0);
  };

  const handleOpenAiLessonCreator = (unit?: any) => {
    const targetUnit = unit || activeUnit || currentUnits[0];
    if (!targetUnit) {
      showAlert('error', 'Vui lòng chọn Unit trước khi tạo bài học.');
      return;
    }
    const defaultAge = (targetUnit.ageGroupCode as '3-4' | '4-5' | '5-6') || (selectedBookNum === 1 ? '3-4' : selectedBookNum === 2 ? '4-5' : '5-6');
    setAiAgeGroup(defaultAge);
    setAiTopic(targetUnit.bigQuestion ? `Mở rộng: ${targetUnit.bigQuestion}` : 'Từ vựng và mẫu câu mới');
    setAiCreatorModal({
      mode: 'lesson',
      unitId: targetUnit._id,
      unitData: targetUnit
    });
    setAiDraft(null);
    setSelectedAiLessonIdx(0);
  };

  const handleGenerateAiDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiTopic.trim()) {
      showAlert('error', 'Vui lòng nhập chủ đề cần tạo.');
      return;
    }
    try {
      setAiGenerating(true);
      const isLessonMode = aiCreatorModal?.mode === 'lesson';
      const existingLessonCount = isLessonMode
        ? (aiCreatorModal?.unitData?.lessons?.length ?? 0)
        : undefined;
      const res = await adminApi.generateAiCurriculum({
        topic: aiTopic.trim(),
        ageGroup: aiAgeGroup,
        mode: isLessonMode ? 'lesson' : 'unit',
        unitId: isLessonMode ? aiCreatorModal?.unitId : undefined,
        existingLessonCount
      });
      if (res.success && res.data) {
        setAiDraft(res.data);
        setSelectedAiLessonIdx(0);
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể tạo gợi ý từ AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiDraft = async () => {
    if (!aiDraft || !aiCreatorModal) return;
    try {
      setAiApplying(true);
      const isLessonMode = aiCreatorModal.mode === 'lesson';

      if (isLessonMode && aiCreatorModal.unitId) {
        // Mode: Apply single AI Lesson directly into the selected Unit
        const res = await adminApi.applyAiCurriculum({
          createNewUnit: false,
          unitId: aiCreatorModal.unitId,
          existingLessonCount: aiCreatorModal.unitData?.lessons?.length ?? 0,
          ageGroupCode: aiAgeGroup,
          suggestedLessonTitle: aiDraft.suggestedLessonTitle,
          suggestedVietnameseTitle: aiDraft.suggestedVietnameseTitle,
          description: aiDraft.description,
          category: aiDraft.category,
          vocabularies: aiDraft.vocabularies || [],
          sentencePairs: aiDraft.sentencePairs || []
        });
        if (res.success) {
          showAlert('success', res.message || 'Đã tạo thành công bài học mới vào Unit!');
          const createdLessonId = res.data?.lessonId;
          const targetUnitId = aiCreatorModal.unitId;
          setAiCreatorModal(null);
          setAiDraft(null);
          await loadCurriculum();
          if (targetUnitId) setSelectedUnitId(String(targetUnitId));
          if (createdLessonId) setSelectedLessonId(String(createdLessonId));
        }
      } else {
        // Mode: Full Unit Creator (Unit + 4 Lessons)
        const targetBookNumber = aiAgeGroup === '3-4' ? 1 : aiAgeGroup === '4-5' ? 2 : 3;
        const res = await adminApi.applyAiCurriculum({
          createNewUnit: true,
          bookNumber: targetBookNumber,
          ageGroupCode: aiAgeGroup,
          bigQuestion: aiDraft.bigQuestion,
          storyTitle: aiDraft.storyTitle,
          values: aiDraft.values,
          unitLessons: aiDraft.unitLessons || [],
          suggestedLessonTitle: aiDraft.suggestedLessonTitle,
          suggestedVietnameseTitle: aiDraft.suggestedVietnameseTitle,
          category: aiDraft.category,
          vocabularies: aiDraft.vocabularies || [],
          sentencePairs: aiDraft.sentencePairs || []
        });
        if (res.success) {
          showAlert('success', res.message || 'Đã tạo thành công Unit mới kèm 4 bài học với từ vựng & mẫu câu riêng biệt!');
          const savedUnitId = res.data?.unitId;
          const savedLessonId = res.data?.lessonId;
          if (res.data?.bookNumber) setSelectedBookNum(Number(res.data.bookNumber));
          setAiCreatorModal(null);
          setAiDraft(null);
          await loadCurriculum();
          if (savedUnitId) setSelectedUnitId(String(savedUnitId));
          if (savedLessonId) setSelectedLessonId(String(savedLessonId));
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể lưu nội dung AI.');
    } finally {
      setAiApplying(false);
    }
  };

  // ── B. AGE-APPROPRIATENESS & PUBLISH AUDIT HANDLERS ──────────────────────
  const handleCheckPublishReadiness = async (lesson: any) => {
    try {
      setAuditLoadingId(lesson._id);
      const report = await adminApi.getLessonReadiness(lesson._id);
      if (report?.data) {
        setAuditModal({ lesson, report: report.data });
      }
    } catch (error: any) {
      showAlert('error', error?.message || 'Không thể kiểm tra xuất bản.');
    } finally {
      setAuditLoadingId(null);
    }
  };

  const handleApplyShortenedSentence = async (sentenceId: string, shorterEnglish: string) => {
    if (!sentenceId || !shorterEnglish || !auditModal) return;
    try {
      const res = await adminApi.updateSentencePattern(sentenceId, {
        english: shorterEnglish.trim()
      });
      if (res.success) {
        showAlert('success', `Đã rút gọn mẫu câu thành: "${shorterEnglish}"`);
        await loadCurriculum();
        const refreshed = await adminApi.getLessonReadiness(auditModal.lesson._id);
        if (refreshed?.data) {
          setAuditModal({ lesson: auditModal.lesson, report: refreshed.data });
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể cập nhật mẫu câu.');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Alert toast notification */}
      {alert && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-500/40'
              : 'bg-rose-50 text-rose-800 border-rose-500/40'
          }`}
        >
          {alert.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-inherit flex items-center gap-2.5">
          <BookOpen className="text-indigo-800" size={26} />
          <span>Giáo Trình</span>
        </h1>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            id="btn-ai-create-unit-top"
            onClick={handleOpenAiCreator}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Wand2 size={18} />
            <span>AI Tạo Unit Mới (4 Bài)</span>
          </button>
          <button
            id="btn-create-unit"
            onClick={handleOpenCreateUnit}
            className="px-4 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Thêm Unit (Book {selectedBookNum})</span>
          </button>
        </div>
      </div>

      <AdminBookTabs selected={selectedBookNum} onSelect={book => setSelectedBookNum(book)} />

      {/* Units & Lessons Workspace */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : currentUnits.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
          <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-700">Chưa có Unit nào trong Book {selectedBookNum}</p>
          <button
            onClick={handleOpenCreateUnit}
            className="mt-3 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs cursor-pointer"
          >
            Tạo Unit Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="admin-curriculum-grid">
          {/* ── LEFT PANEL: LIST OF UNITS IN BOOK ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Danh sách Unit ({currentUnits.length})
              </span>
              <button
                onClick={handleOpenCreateUnit}
                className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-500/30 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                title="Tạo Unit mới vào sách này"
              >
                <Plus size={13} />
                <span>Thêm Unit</span>
              </button>
            </div>

            <div className="admin-unit-list">
              {currentUnits.map((unit: any) => {
                const isSelected = activeUnit?._id === unit._id;
                const lessonCount = unit.lessons?.length || 0;

                return (
                  <div
                    key={unit._id}
                    data-selected={isSelected}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedUnitId(unit._id);
                      }
                    }}
                    onClick={() => setSelectedUnitId(unit._id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-500 text-inherit ring-1 ring-indigo-500/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'bg-indigo-700 text-white border-indigo-700'
                              : 'bg-slate-100 text-indigo-800 border-indigo-500/20'
                          }`}
                        >
                          U{unit.unitNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-indigo-800 uppercase">
                              Unit {unit.unitNumber}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              {lessonCount} bài
                            </span>
                          </div>
                          <h3 className="text-xs sm:text-sm font-black text-inherit mt-0.5 line-clamp-1">
                            {unit.bigQuestion}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditUnit(unit)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-inherit transition-all cursor-pointer"
                          title="Sửa Unit"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-800 transition-all cursor-pointer"
                          title="Xóa Unit"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT PANEL: SELECTED UNIT & SMART LESSON GRID ─── */}
          <div className="space-y-4">
            {activeUnit ? (
              <>
                {/* Clean Active Unit Header Banner (Removed Story, Concept, Oracy) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
                        Book {activeUnit.bookNumber} • Unit {activeUnit.unitNumber}
                      </span>
                      <span className="text-xs text-slate-600 font-bold">
                        {activeUnit.lessons?.length || 0} bài học
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                      {activeUnit.bigQuestion}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      id="btn-ai-create-lesson-banner"
                      onClick={() => handleOpenAiLessonCreator(activeUnit)}
                      className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-800 hover:to-indigo-800 text-white font-black text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      title="Dùng AI sinh bài học mới kèm từ vựng và mẫu câu vào Unit này"
                    >
                      <Wand2 size={15} />
                      <span>AI Tạo Bài Học</span>
                    </button>
                    <button
                      id="btn-create-lesson"
                      onClick={() => handleOpenCreateLesson(activeUnit._id)}
                      className="px-4 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Thêm Bài Học</span>
                    </button>
                  </div>
                </div>

                {/* Smart Responsive Lesson Grid (No horizontal scrolling) */}
                <div className="space-y-4">
                  {!activeUnit.lessons || activeUnit.lessons.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 p-6">
                      <Layers size={36} className="mx-auto text-slate-500 mb-2.5" />
                      <p className="text-sm font-bold text-slate-700">
                        Chưa có bài học nào trong Unit {activeUnit.unitNumber}
                      </p>
                      <div className="flex items-center justify-center gap-2.5 mt-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenAiLessonCreator(activeUnit)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-800 hover:to-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Wand2 size={14} />
                          <span>AI Tạo Bài Học Mới</span>
                        </button>
                        <button
                          onClick={() => handleOpenCreateLesson(activeUnit._id)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer border border-slate-300"
                        >
                          Thêm Thủ Công
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeUnit.lessons.map((lesson: any, lIndex: number) => {
                          const isCurrent = activeLesson?._id === lesson._id;
                          const vocabCount = lesson.vocabulary?.length || 0;
                          const sentCount = lesson.sentences?.length || 0;
                          return (
                            <button
                              key={lesson._id}
                              type="button"
                              onClick={() => setSelectedLessonId(isCurrent ? null : lesson._id)}
                              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer group ${
                                isCurrent
                                  ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/25 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-indigo-300'
                              }`}
                            >
                              <span
                                className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl font-black text-xs shrink-0 border whitespace-nowrap transition-all mt-0.5 ${
                                  isCurrent
                                    ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 group-hover:bg-indigo-100'
                                }`}
                              >
                                Bài {lIndex + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                                    {lesson.title}
                                  </p>
                                  {lesson.status !== 'ACTIVE' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 shrink-0">
                                      Đã ngừng
                                    </span>
                                  )}
                                </div>
                                {lesson.vietnameseTitle && (
                                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                                    {lesson.vietnameseTitle}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 flex-nowrap overflow-hidden">
                                  <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold whitespace-nowrap">
                                    {vocabCount} từ vựng
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-pink-50 text-pink-800 border border-pink-200 text-[11px] font-bold whitespace-nowrap">
                                    {sentCount} mẫu câu
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Lesson Focused Card */}
                      {activeLesson ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 animate-fade-in">
                          {/* Lesson Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-800 border border-indigo-200 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                #{activeLesson.displayOrder || 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                                    {activeLesson.title}
                                  </h4>
                                  <span
                                    className={
                                      activeLesson.status === 'ACTIVE'
                                        ? 'rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 shrink-0'
                                        : 'rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 shrink-0'
                                    }
                                  >
                                    {activeLesson.status === 'ACTIVE' ? 'Đang dùng' : 'Đã ngừng'}
                                  </span>
                                </div>
                                {activeLesson.vietnameseTitle && (
                                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5">
                                    {activeLesson.vietnameseTitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={auditLoadingId === activeLesson._id}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-800 border border-indigo-200 hover:bg-indigo-50 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                onClick={() => handleCheckPublishReadiness(activeLesson)}
                              >
                                <ShieldCheck size={14} />
                                <span>{auditLoadingId === activeLesson._id ? 'Đang kiểm định...' : 'Kiểm tra xuất bản'}</span>
                              </button>
                              <button
                                type="button"
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
                                onClick={async () => {
                                  try {
                                    await adminApi.toggleLessonStatus(activeLesson._id);
                                    await loadCurriculum();
                                  } catch (error: any) {
                                    showAlert('error', error.message);
                                  }
                                }}
                              >
                                {activeLesson.status === 'ACTIVE' ? 'Tạm ngừng' : 'Khôi phục'}
                              </button>
                              <button
                                onClick={() => handleOpenEditLesson(activeLesson, activeUnit._id)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Sửa bài học"
                              >
                                <Edit size={14} />
                                <span>Sửa bài</span>
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(activeLesson)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-800 transition-all cursor-pointer"
                                title="Xóa bài học"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Vocabulary Section of Active Lesson */}
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                                <Sparkles size={16} />
                                <span>Từ vựng bài học ({activeLesson.vocabulary?.length || 0})</span>
                              </span>
                              <button
                                onClick={() => handleOpenCreateVocab(activeLesson._id)}
                                className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Plus size={15} />
                                <span>Thêm Từ Vựng</span>
                              </button>
                            </div>

                            {activeLesson.vocabulary && activeLesson.vocabulary.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                {activeLesson.vocabulary.map((v: any) => (
                                  <div
                                    key={v._id}
                                    className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200 flex items-center justify-between gap-2 hover:border-teal-400 transition-all"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {v.imageUrl && (
                                        <img
                                          src={v.imageUrl}
                                          alt={v.word || v.english}
                                          className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                                        />
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditVocab(v, activeLesson._id)}
                                            className="font-black text-teal-900 hover:underline text-sm truncate cursor-pointer"
                                            title="Bấm để sửa từ vựng"
                                          >
                                            {v.word || v.english}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => playAudio(v.word || v.english)}
                                            className="text-teal-700 hover:text-teal-900 transition-colors cursor-pointer shrink-0"
                                            title="Nghe phát âm"
                                          >
                                            <Volume2 size={15} />
                                          </button>
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium truncate">
                                          {v.vietnamese}
                                          {v.pronunciation ? ` • ${v.pronunciation}` : ''}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditVocab(v, activeLesson._id)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                                        title="Sửa từ vựng"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteVocab(v)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                                        title="Xóa từ vựng"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic py-2">
                                Chưa có từ vựng nào trong bài học này.
                              </p>
                            )}
                          </div>

                          {/* Sentence Patterns Section of Active Lesson */}
                          <div className="pt-4 border-t border-slate-200 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-pink-800 flex items-center gap-1.5">
                                <MessageSquare size={16} />
                                <span>Mẫu câu &amp; Hội thoại ({activeLesson.sentences?.length || 0})</span>
                              </span>
                              <button
                                onClick={() => handleOpenCreateSentence(activeLesson._id, activeUnit._id)}
                                className="px-3.5 py-2 rounded-xl bg-pink-700 hover:bg-pink-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Plus size={15} />
                                <span>Thêm Mẫu Câu</span>
                              </button>
                            </div>

                            {activeLesson.sentences && activeLesson.sentences.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {groupSentencesForDisplay(activeLesson.sentences).map((group: any) => {
                                  if (group.isPair) {
                                    return (
                                      <div
                                        key={group.id}
                                        className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-pink-300 transition-all space-y-2.5"
                                      >
                                        {/* Question Row */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-2">
                                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-200 shrink-0 mt-0.5">
                                              ❓ Hỏi
                                            </span>
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <p className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug">
                                                  {group.question.english}
                                                </p>
                                                <button
                                                  type="button"
                                                  onClick={() => playAudio(group.question.english)}
                                                  className="text-slate-500 hover:text-pink-700 transition-colors cursor-pointer"
                                                  title="Nghe phát âm câu hỏi"
                                                >
                                                  <Volume2 size={14} />
                                                </button>
                                              </div>
                                              {group.question.vietnamese && (
                                                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                                                  {group.question.vietnamese}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleOpenEditSentence(group.question, activeLesson._id, activeUnit._id, group.answers)
                                              }
                                              className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                              title="Sửa câu hỏi"
                                            >
                                              <Edit size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteSentence(group.question)}
                                              className="p-1 text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
                                              title="Xóa câu hỏi"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Answers Connected Sub-block */}
                                        {group.answers && group.answers.length > 0 && (
                                          <div className="ml-2 pl-3 border-l-2 border-emerald-300 space-y-2 pt-0.5">
                                            {group.answers.map((ans: any) => (
                                              <div
                                                key={ans._id}
                                                className="flex items-start justify-between gap-2 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100"
                                              >
                                                <div className="flex items-start gap-2">
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 mt-0.5 flex items-center gap-1">
                                                    <CornerDownRight size={10} />
                                                    <span>Đáp</span>
                                                  </span>
                                                  <div>
                                                    <div className="flex items-center gap-1.5">
                                                      <p className="font-bold text-emerald-950 text-xs sm:text-sm">
                                                        {ans.english}
                                                      </p>
                                                      <button
                                                        type="button"
                                                        onClick={() => playAudio(ans.english)}
                                                        className="text-slate-500 hover:text-emerald-800 transition-colors cursor-pointer"
                                                        title="Nghe phát âm câu trả lời"
                                                      >
                                                        <Volume2 size={13} />
                                                      </button>
                                                    </div>
                                                    {ans.vietnamese && (
                                                      <p className="text-xs text-slate-600 mt-0.5">
                                                        {ans.vietnamese}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleOpenEditSentence(ans, activeLesson._id, activeUnit._id)
                                                    }
                                                    className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                                    title="Sửa câu trả lời"
                                                  >
                                                    <Edit size={13} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteSentence(ans)}
                                                    className="p-1 text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
                                                    title="Xóa câu trả lời"
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    const s = group.standalone;
                                    const isQuestion = s.contentType === 'QUESTION';
                                    const isAnswer = s.contentType === 'ANSWER';
                                    return (
                                      <div
                                        key={s._id}
                                        className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start justify-between gap-2"
                                      >
                                        <div className="flex items-start gap-2.5">
                                          <button
                                            type="button"
                                            onClick={() => playAudio(s.english)}
                                            className="text-slate-500 hover:text-pink-700 transition-colors mt-0.5 cursor-pointer"
                                            title="Nghe phát âm"
                                          >
                                            <Volume2 size={15} />
                                          </button>
                                          <div>
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                              <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                  isQuestion
                                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                                    : isAnswer
                                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                    : 'bg-pink-50 text-pink-800 border border-pink-200'
                                                }`}
                                              >
                                                {isQuestion ? '❓ Câu hỏi' : isAnswer ? '💬 Trả lời' : 'Mẫu câu'}
                                              </span>
                                            </div>
                                            <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                                              {s.english}
                                            </p>
                                            {s.vietnamese && (
                                              <p className="text-xs text-slate-600 mt-0.5">{s.vietnamese}</p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditSentence(s, activeLesson._id, activeUnit._id)}
                                            className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                            title="Sửa mẫu câu"
                                          >
                                            <Edit size={14} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteSentence(s)}
                                            className="p-1 text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
                                            title="Xóa mẫu câu"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic py-2">
                                Chưa có mẫu câu nào trong bài học này.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="py-10 text-center bg-slate-50/80 rounded-3xl border border-dashed border-slate-300 p-6">
                          <Layers size={32} className="mx-auto text-indigo-400 mb-2" />
                          <p className="text-sm font-bold text-slate-700">
                            Chọn một bài học ở trên để quản lý từ vựng và mẫu câu
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-6">
                <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-700">Vui lòng chọn một Unit bên trái</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT UNIT (Removed Story, Concept, Oracy) ────────── */}
      {unitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-3xl shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <BookOpen className="text-indigo-800" size={22} />
                <span>
                  {unitModal.mode === 'create'
                    ? `Tạo Unit Mới (Book ${selectedBookNum})`
                    : `Chỉnh Sửa Unit ${unitForm.unitNumber}`}
                </span>
              </h2>
              <button onClick={() => setUnitModal(null)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleUnitSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Số thứ tự Unit (Tự động xếp ở cuối sách) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={unitForm.unitNumber}
                  disabled={unitModal.mode === 'edit'}
                  onChange={(e) => setUnitForm({ ...unitForm, unitNumber: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
                />
                {unitModal.mode === 'create' && (
                  <p className="text-xs font-semibold text-indigo-700 mt-1.5">
                    ✨ Khi tạo Unit {unitForm.unitNumber}, hệ thống tự động khởi tạo kèm 4 bài học chuẩn sư phạm (Vocabulary &amp; Phonics, Sentence Patterns, Story &amp; Values, Review Games).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Chủ đề / Câu hỏi định hướng (Big Question) *
                </label>
                <input
                  type="text"
                  required
                  value={unitForm.bigQuestion}
                  onChange={(e) => setUnitForm({ ...unitForm, bigQuestion: e.target.value })}
                  placeholder='Ví dụ: "Who is in our classroom?"'
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUnitModal(null)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-4xl shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <Layers className="text-indigo-800" size={22} />
                <span>{lessonModal.mode === 'create' ? 'Thêm Bài Học Mới' : 'Chỉnh Sửa Bài Học'}</span>
              </h2>
              <button onClick={() => setLessonModal(null)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleLessonSubmit} className="space-y-4">
              {lessonModal.mode === 'create' && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Wand2 size={18} className="text-violet-700 shrink-0" />
                    <span className="text-xs font-bold text-violet-950">
                      Gợi ý: Bạn có thể để AI tự động tạo tiêu đề, từ vựng và mẫu câu giao tiếp cho Unit này chỉ trong vài giây.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const u = currentUnits.find((unit: any) => unit._id === (lessonForm.unitId || lessonModal.unitId)) || activeUnit;
                      setLessonModal(null);
                      handleOpenAiLessonCreator(u);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-black text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
                  >
                    <Sparkles size={14} />
                    <span>AI Tạo Tự Động</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Thuộc Unit
                  </label>
                  <select
                    value={lessonForm.unitId}
                    onChange={event => setLessonForm({ ...lessonForm, unitId: event.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-indigo-600 focus:outline-none"
                  >
                    {currentUnits.map((unit: any) => (
                      <option key={unit._id} value={unit._id}>
                        Unit {unit.unitNumber} · {unit.bigQuestion}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Thứ tự bài học
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lessonForm.displayOrder}
                    onChange={(e) => setLessonForm({ ...lessonForm, displayOrder: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Tiêu đề bài học (Tiếng Anh) *
                </label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Ví dụ: Hello & Welcome Song"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Tiêu đề tiếng Việt
                </label>
                <input
                  type="text"
                  value={lessonForm.vietnameseTitle}
                  onChange={(e) => setLessonForm({ ...lessonForm, vietnameseTitle: e.target.value })}
                  placeholder="Ví dụ: Bài hát Chào mừng và Giới thiệu"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={2}
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  placeholder="Mô tả mục tiêu và hoạt động chính trong bài học..."
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setLessonModal(null)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm cursor-pointer"
                >
                  {lessonModal.mode === 'create' ? 'Tạo Bài Học' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT VOCABULARY (LARGE, EASY TO USE) ─────────────── */}
      {vocabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-5xl shadow-2xl animate-scale-up my-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {vocabModal.mode === 'create' ? 'Thêm Từ Vựng Mới Vào Bài Học' : 'Chỉnh Sửa Từ Vựng'}
                  </h2>
                  {activeLesson && (
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Bài học: <strong className="text-slate-800">{activeLesson.title}</strong>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setVocabModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleVocabSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Cols: Core Vocabulary Inputs */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="block text-sm font-black text-slate-800 mb-2">
                      1. Từ tiếng Anh (English Word) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={vocabForm.english}
                        onChange={(e) => setVocabForm({ ...vocabForm, english: e.target.value })}
                        placeholder="Ví dụ: Apple, Hello, Teacher..."
                        className="flex-1 px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-300 text-slate-900 font-bold text-base focus:border-teal-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => playAudio(vocabForm.english)}
                        className="px-4 py-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                        title="Nghe thử phát âm"
                      >
                        <Volume2 size={18} />
                        <span>Nghe thử</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-800 mb-2">
                      2. Nghĩa tiếng Việt *
                    </label>
                    <input
                      type="text"
                      required
                      value={vocabForm.vietnamese}
                      onChange={(e) => setVocabForm({ ...vocabForm, vietnamese: e.target.value })}
                      placeholder="Ví dụ: Quả táo, Xin chào, Cô giáo..."
                      className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-300 text-slate-900 font-bold text-base focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Phiên âm IPA (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={vocabForm.pronunciation}
                        onChange={(e) => setVocabForm({ ...vocabForm, pronunciation: e.target.value })}
                        placeholder="Ví dụ: /ˈæp.əl/"
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-mono text-base focus:border-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Loại từ (Word Type)
                      </label>
                      <select
                        value={vocabForm.wordType}
                        onChange={(e) => setVocabForm({ ...vocabForm, wordType: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-semibold text-base focus:border-teal-600 focus:outline-none"
                      >
                        <option value="noun">Danh từ (Noun)</option>
                        <option value="verb">Động từ (Verb)</option>
                        <option value="number">Số đếm (Number)</option>
                        <option value="color">Màu sắc (Color)</option>
                        <option value="adjective">Tính từ (Adjective)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Chủ đề / Nhóm từ
                      </label>
                      <input
                        type="text"
                        value={vocabForm.category}
                        onChange={(e) => setVocabForm({ ...vocabForm, category: e.target.value })}
                        placeholder="Ví dụ: Animals, School, Food..."
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Trạng thái hiển thị
                      </label>
                      <select
                        value={vocabForm.status}
                        onChange={(e) => setVocabForm({ ...vocabForm, status: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-semibold text-base focus:border-teal-600 focus:outline-none"
                      >
                        <option value="ACTIVE">Đang hoạt động (Hiển thị ngay)</option>
                        <option value="HIDDEN">Bản nháp / Tạm ẩn</option>
                        <option value="INACTIVE">Ngừng sử dụng</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right 5 Cols: Visual Preview & Media Links */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-300 rounded-2xl p-4 min-h-[160px]">
                    {vocabForm.imageUrl ? (
                      <img
                        src={vocabForm.imageUrl}
                        alt={vocabForm.english || 'Preview'}
                        className="h-32 w-32 object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-500 space-y-1.5">
                        <ImageIcon size={36} className="mx-auto text-slate-400" />
                        <p className="text-xs font-bold">Xem trước hình minh họa</p>
                        <p className="text-[11px]">Nhập đường dẫn ảnh bên dưới để hiển thị</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Đường dẫn ảnh minh họa (HTTPS hoặc /images/vocabulary/...)
                      </label>
                      <input
                        type="text"
                        value={vocabForm.imageUrl}
                        onChange={(e) => setVocabForm({ ...vocabForm, imageUrl: e.target.value })}
                        placeholder="Ví dụ: /images/vocabulary/apple-v1.svg"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Đường dẫn file âm thanh (để trống sẽ tự dùng giọng đọc chuẩn)
                      </label>
                      <input
                        type="text"
                        value={vocabForm.audioUrl}
                        onChange={(e) => setVocabForm({ ...vocabForm, audioUrl: e.target.value })}
                        placeholder="Tùy chọn: https://... hoặc /audio/..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-600 focus:outline-none"
                      />
                      {vocabForm.audioUrl && (
                        <audio controls src={vocabForm.audioUrl} className="mt-2 w-full h-9" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVocabModal(null)}
                  className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Check size={18} />
                  <span>{vocabModal.mode === 'create' ? 'Lưu & Thêm Từ Vựng' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT SENTENCE PATTERN (LARGE, EASY TO USE) ──────── */}
      {sentenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-5xl shadow-2xl animate-scale-up my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-pink-50 border border-pink-200 text-pink-800 flex items-center justify-center">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {sentenceModal.mode === 'create'
                      ? sentenceForm.entryMode === 'pair'
                        ? 'Thêm Cặp Câu Hỏi & Trả Lời'
                        : 'Thêm Mẫu Câu Đơn Lẻ'
                      : sentenceForm.entryMode === 'pair'
                      ? 'Chỉnh Sửa Cặp Câu Hỏi & Trả Lời'
                      : 'Chỉnh Sửa Mẫu Câu'}
                  </h2>
                  {activeLesson && (
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Bài học: <strong className="text-slate-800">{activeLesson.title}</strong>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSentenceModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Mode Selector for creation mode */}
            {sentenceModal.mode === 'create' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 mb-5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSentenceForm({ ...sentenceForm, entryMode: 'pair' })}
                  className={`py-3 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    sentenceForm.entryMode === 'pair'
                      ? 'bg-indigo-700 text-white'
                      : 'text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <Sparkles size={16} />
                  <span>Cặp Hỏi ❓ &amp; Đáp 💬 (Khuyên dùng)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSentenceForm({ ...sentenceForm, entryMode: 'single' })}
                  className={`py-3 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    sentenceForm.entryMode === 'single'
                      ? 'bg-indigo-700 text-white'
                      : 'text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <MessageSquare size={16} />
                  <span>Mẫu Câu Đơn Lẻ</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSentenceSubmit} className="space-y-5 overflow-y-auto pr-1 flex-1">
              {sentenceForm.entryMode === 'pair' ? (
                <div className="space-y-5">
                  {/* 1. Question Section */}
                  <div className="p-5 rounded-3xl bg-purple-50/70 border border-purple-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5">
                        <HelpCircle size={14} />
                        <span>Phần 1: Câu Hỏi (Question) *</span>
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-1.5">
                        Câu hỏi tiếng Anh *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={sentenceForm.questionEnglish}
                          onChange={(e) => setSentenceForm({ ...sentenceForm, questionEnglish: e.target.value })}
                          placeholder="Ví dụ: What is it? / What's your name? / Is it a book?"
                          className="flex-1 px-4 py-3.5 rounded-2xl bg-white border-2 border-purple-300 text-slate-900 font-bold text-base focus:border-purple-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => playAudio(sentenceForm.questionEnglish)}
                          className="px-4 py-3.5 rounded-2xl bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Volume2 size={18} />
                          <span>Nghe thử</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          Dịch nghĩa tiếng Việt
                        </label>
                        <input
                          type="text"
                          value={sentenceForm.questionVietnamese}
                          onChange={(e) =>
                            setSentenceForm({ ...sentenceForm, questionVietnamese: e.target.value })
                          }
                          placeholder="Ví dụ: Đây là cái gì?"
                          className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-purple-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          Phiên âm / Ngữ điệu (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          value={sentenceForm.questionPronunciation}
                          onChange={(e) =>
                            setSentenceForm({ ...sentenceForm, questionPronunciation: e.target.value })
                          }
                          placeholder="Ví dụ: /wɒt ɪz ɪt/ ↗"
                          className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base font-mono focus:border-purple-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Answers Section */}
                  <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                        <CornerDownRight size={14} />
                        <span>Phần 2: Câu Trả Lời Đi Kèm (Answer) *</span>
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
                        className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus size={15} />
                        <span>Thêm câu trả lời phụ</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {sentenceForm.answers.map((ans, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-white border border-emerald-200 space-y-3 relative"
                        >
                          {sentenceForm.answers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = sentenceForm.answers.filter((_, i) => i !== idx);
                                setSentenceForm({ ...sentenceForm, answers: next });
                              }}
                              className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                              title="Xóa câu trả lời này"
                            >
                              <X size={16} />
                            </button>
                          )}
                          <div>
                            <label className="block text-sm font-black text-emerald-900 mb-1.5">
                              Câu trả lời {sentenceForm.answers.length > 1 ? `#${idx + 1}` : ''} (Tiếng Anh) *
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                required
                                value={ans.english}
                                onChange={(e) => {
                                  const next = [...sentenceForm.answers];
                                  next[idx].english = e.target.value;
                                  setSentenceForm({ ...sentenceForm, answers: next });
                                }}
                                placeholder="Ví dụ: It's a book. / Yes, it is."
                                className="flex-1 px-4 py-3 rounded-2xl bg-white border-2 border-emerald-300 text-slate-900 font-bold text-base focus:border-emerald-600 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => playAudio(ans.english)}
                                className="px-3.5 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <Volume2 size={16} />
                                <span>Nghe</span>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
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
                                placeholder="Ví dụ: Đó là quyển sách."
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Phiên âm (Tùy chọn)
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
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-mono focus:border-emerald-600 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Single sentence mode (or editing mode) */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Loại mẫu câu *
                      </label>
                      <select
                        value={sentenceForm.contentType}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, contentType: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-semibold text-base focus:border-pink-600 focus:outline-none"
                      >
                        <option value="PATTERN">Mẫu câu (Pattern)</option>
                        <option value="QUESTION">❓ Câu hỏi (Question)</option>
                        <option value="ANSWER">💬 Câu trả lời (Answer)</option>
                        <option value="DIALOGUE">👥 Hội thoại (Dialogue)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Mức độ (1 - 3)
                      </label>
                      <select
                        value={sentenceForm.difficulty}
                        onChange={(e) =>
                          setSentenceForm({ ...sentenceForm, difficulty: Number(e.target.value) })
                        }
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-semibold text-base focus:border-pink-600 focus:outline-none"
                      >
                        <option value={1}>⭐ Cơ bản (1)</option>
                        <option value={2}>⭐⭐ Trung bình (2)</option>
                        <option value={3}>⭐⭐⭐ Nâng cao (3)</option>
                      </select>
                    </div>
                  </div>

                  {sentenceForm.contentType === 'ANSWER' && (
                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                      <label className="block text-sm font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                        <HelpCircle size={15} />
                        <span>Ghép với câu hỏi nào trong bài học này?</span>
                      </label>
                      <select
                        value={sentenceForm.relatedQuestion}
                        onChange={(e) =>
                          setSentenceForm({ ...sentenceForm, relatedQuestion: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-purple-600 focus:outline-none"
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
                    <label className="block text-sm font-black text-slate-800 mb-1.5">
                      Mẫu câu tiếng Anh *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={sentenceForm.english}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, english: e.target.value })}
                        placeholder="Ví dụ: How are you? / I am fine, thank you."
                        className="flex-1 px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-300 text-slate-900 font-bold text-base focus:border-pink-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => playAudio(sentenceForm.english)}
                        className="px-4 py-3.5 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 font-bold text-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Volume2 size={18} />
                        <span>Nghe thử</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Dịch nghĩa tiếng Việt
                      </label>
                      <input
                        type="text"
                        value={sentenceForm.vietnamese}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, vietnamese: e.target.value })}
                        placeholder="Ví dụ: Bạn có khỏe không?"
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base focus:border-pink-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Phiên âm / Ngữ điệu (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={sentenceForm.pronunciation}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, pronunciation: e.target.value })}
                        placeholder="Ví dụ: /haʊ ɑːr juː/ ↗"
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-base font-mono focus:border-pink-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setSentenceModal(null)}
                  className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-2xl bg-pink-700 hover:bg-pink-800 text-white font-black text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Check size={18} />
                  <span>
                    {sentenceModal.mode === 'create'
                      ? sentenceForm.entryMode === 'pair'
                        ? 'Lưu Cặp Hỏi & Đáp'
                        : 'Lưu & Thêm Mẫu Câu'
                      : sentenceForm.entryMode === 'pair'
                      ? 'Lưu Cặp Hỏi & Đáp'
                      : 'Lưu Thay Đổi'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: AI CURRICULUM CREATOR (A. Tự động sinh Giáo trình & Mẫu câu) ── */}
      {aiCreatorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setAiCreatorModal(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-5 sm:p-7 space-y-5 shadow-2xl my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Wand2 size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {aiCreatorModal.mode === 'lesson'
                      ? `AI Tạo Bài Học Mới Vào Unit ${aiCreatorModal.unitData?.unitNumber || ''}`
                      : 'Tạo Trọn Gói Unit Mới Bằng AI (4 Bài Học Riêng Biệt)'}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600">
                    {aiCreatorModal.mode === 'lesson'
                      ? `Tạo bài học mới kèm từ vựng & mẫu câu chuẩn mầm non vào Unit: "${aiCreatorModal.unitData?.bigQuestion || ''}" (Book ${aiCreatorModal.unitData?.bookNumber || selectedBookNum})`
                      : 'Nhập chủ đề & chọn độ tuổi để AI sinh 1 Unit mới ở cuối sách gồm 4 Bài học với từ vựng & mẫu câu riêng biệt khác nhau hoàn toàn'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiCreatorModal(null)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 overflow-y-auto pr-1 flex-1">
              {/* Topic & Age Input Form */}
              <form
                onSubmit={handleGenerateAiDraft}
                className="p-4 sm:p-5 rounded-2xl bg-violet-50/60 border border-violet-200 space-y-4"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-end">
                  <div className="lg:col-span-6">
                    <label className="block text-xs font-black uppercase tracking-wider text-violet-950 mb-1.5">
                      Chủ đề bài học (Tiếng Việt / Tiếng Anh) *
                    </label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="VD: Các phương tiện giao thông (Vehicles)"
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-violet-300 text-slate-900 text-sm sm:text-base font-bold focus:border-violet-600 focus:outline-none"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label className="block text-xs font-black uppercase tracking-wider text-violet-950 mb-1.5">
                      Độ tuổi mục tiêu *
                    </label>
                    <select
                      value={aiAgeGroup}
                      onChange={(e) => setAiAgeGroup(e.target.value as '3-4' | '4-5' | '5-6')}
                      className="w-full px-3.5 py-3 rounded-2xl bg-white border border-violet-300 text-slate-900 text-sm sm:text-base font-bold focus:border-violet-600 focus:outline-none"
                    >
                      <option value="3-4">3–4 tuổi (Book 1 - Mầm)</option>
                      <option value="4-5">4–5 tuổi (Book 2 - Chồi)</option>
                      <option value="5-6">5–6 tuổi (Book 3 - Lá)</option>
                    </select>
                  </div>

                  <div className="lg:col-span-3">
                    <button
                      type="submit"
                      disabled={aiGenerating}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-800 hover:to-indigo-800 text-white font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={17} />
                      <span>{aiGenerating ? 'Đang sinh nội dung...' : 'Đề xuất bằng AI'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Topic Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-600 mr-1">Chủ đề mẫu:</span>
                  {(aiCreatorModal.mode === 'lesson'
                    ? [
                        `Mở rộng: ${aiCreatorModal.unitData?.bigQuestion || 'Chủ đề Unit'}`,
                        'Từ vựng cốt lõi & Phát âm',
                        'Mẫu câu giao tiếp & Hỏi đáp',
                        'Đồ dùng & Hành động trong lớp',
                        'Trò chơi tương tác & Vận động TPR',
                        'Các con vật vui nhộn (Animals)',
                        'Màu sắc & Hình khối (Colors & Shapes)'
                      ]
                    : [
                        'Các phương tiện giao thông (Vehicles)',
                        'Những con vật đáng yêu (Animals)',
                        'Trái cây thơm ngon (Fruits)',
                        'Đồ chơi của bé (Toys)',
                        'Gia đình hạnh phúc (Family)',
                        'Sắc màu rực rỡ (Colors)',
                        'Cơ thể của bé (Body Parts)'
                      ]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAiTopic(preset)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        aiTopic === preset
                          ? 'bg-violet-700 text-white border-violet-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-violet-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Target Mode Info Note */}
                <div className="flex items-center gap-2 pt-2 border-t border-violet-200/70 text-xs font-black text-violet-900">
                  <Sparkles size={15} className="text-violet-600 shrink-0" />
                  <span>
                    {aiCreatorModal.mode === 'lesson'
                      ? `Mục tiêu: Tạo 1 Bài Học Mới vào Unit ${aiCreatorModal.unitData?.unitNumber || ''} (Bài #${(aiCreatorModal.unitData?.lessons?.length || 0) + 1}) với 3–4 từ vựng và 1–2 cặp câu Hỏi–Đáp`
                      : `Mục tiêu: Tạo Trọn Gói Unit Mới ở cuối Book ${selectedBookNum} (Unit #${currentUnits.reduce((m: number, u: any) => Math.max(m, Number(u.unitNumber) || 0), 0) + 1} kèm 4 Bài Học với từ vựng & mẫu câu riêng biệt cho từng bài)`}
                  </span>
                </div>
              </form>

              {/* AI Generated Result Preview & Editor */}
              {aiDraft && (
                <div className="space-y-5 animate-fade-in">
                  {aiCreatorModal.mode === 'lesson' ? (
                    /* ── A. SINGLE LESSON MODE PREVIEW & EDITOR ── */
                    <div className="space-y-4">
                      {/* Lesson Header Fields */}
                      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-indigo-700 text-white text-[11px] font-black uppercase">
                                {aiDraft.ageRule?.title || `Chuẩn ${aiDraft.ageGroupCode} tuổi`}
                              </span>
                              <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                                Unit {aiCreatorModal.unitData?.unitNumber} · Bài #{(aiCreatorModal.unitData?.lessons?.length || 0) + 1}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-indigo-950 mt-1">
                              {aiDraft.ageRule?.ruleSummary}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-indigo-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-indigo-950 mb-1">
                              Tiêu đề bài học tiếng Anh *
                            </label>
                            <input
                              type="text"
                              value={aiDraft.suggestedLessonTitle || ''}
                              onChange={(e) => setAiDraft({ ...aiDraft, suggestedLessonTitle: e.target.value })}
                              placeholder="VD: Unit 1 - Lesson 3: School Playground"
                              className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs sm:text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-indigo-950 mb-1">
                              Tiêu đề bài học tiếng Việt *
                            </label>
                            <input
                              type="text"
                              value={aiDraft.suggestedVietnameseTitle || ''}
                              onChange={(e) => setAiDraft({ ...aiDraft, suggestedVietnameseTitle: e.target.value })}
                              placeholder="VD: Bài 3: Vui chơi ở sân trường"
                              className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-indigo-950 mb-1">
                            Mô tả mục tiêu sư phạm của bài học
                          </label>
                          <input
                            type="text"
                            value={aiDraft.description || ''}
                            onChange={(e) => setAiDraft({ ...aiDraft, description: e.target.value })}
                            placeholder="Mô tả tóm tắt nội dung bài học..."
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Vocabularies of this Lesson */}
                      <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span>📚 Từ Vựng Cốt Lõi Của Bài ({aiDraft.vocabularies?.length || 0} từ)</span>
                          </h4>
                          <span className="text-[11px] font-bold text-slate-500">
                            Có thể chỉnh sửa trực tiếp từ vựng &amp; phiên âm
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(aiDraft.vocabularies || []).map((v: any, vIdx: number) => (
                            <div key={vIdx} className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2 hover:border-violet-300 transition-all">
                              <div className="flex items-start gap-3">
                                <img
                                  src={v.imageUrl || '/images/vocabulary/book-v1.svg'}
                                  alt={v.english}
                                  className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1 shrink-0"
                                />
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={v.english}
                                      onChange={(e) => {
                                        const nextVocabs = [...aiDraft.vocabularies];
                                        nextVocabs[vIdx] = { ...nextVocabs[vIdx], english: e.target.value };
                                        setAiDraft({ ...aiDraft, vocabularies: nextVocabs });
                                      }}
                                      placeholder="Từ tiếng Anh"
                                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-black text-slate-900"
                                    />
                                    <input
                                      type="text"
                                      value={v.pronunciation || ''}
                                      onChange={(e) => {
                                        const nextVocabs = [...aiDraft.vocabularies];
                                        nextVocabs[vIdx] = { ...nextVocabs[vIdx], pronunciation: e.target.value };
                                        setAiDraft({ ...aiDraft, vocabularies: nextVocabs });
                                      }}
                                      placeholder="/IPA/"
                                      className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono text-slate-600"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={v.vietnamese}
                                      onChange={(e) => {
                                        const nextVocabs = [...aiDraft.vocabularies];
                                        nextVocabs[vIdx] = { ...nextVocabs[vIdx], vietnamese: e.target.value };
                                        setAiDraft({ ...aiDraft, vocabularies: nextVocabs });
                                      }}
                                      placeholder="Nghĩa tiếng Việt"
                                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                                    />
                                    <select
                                      value={v.wordType || 'noun'}
                                      onChange={(e) => {
                                        const nextVocabs = [...aiDraft.vocabularies];
                                        nextVocabs[vIdx] = { ...nextVocabs[vIdx], wordType: e.target.value };
                                        setAiDraft({ ...aiDraft, vocabularies: nextVocabs });
                                      }}
                                      className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 bg-white"
                                    >
                                      <option value="noun">Danh từ</option>
                                      <option value="verb">Động từ</option>
                                      <option value="adjective">Tính từ</option>
                                      <option value="color">Màu sắc</option>
                                      <option value="number">Số đếm</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sentence Pairs of this Lesson */}
                      <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span>💬 Mẫu Câu Giao Tiếp Hỏi &amp; Đáp ({aiDraft.sentencePairs?.length || 0} cặp câu)</span>
                          </h4>
                          <span className="text-[11px] font-bold text-slate-500">
                            Chuẩn lứa tuổi mầm non ({aiDraft.ageGroupCode} tuổi)
                          </span>
                        </div>

                        <div className="space-y-3">
                          {(aiDraft.sentencePairs || []).map((pair: any, pIdx: number) => (
                            <div key={pIdx} className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2.5 hover:border-violet-300 transition-all">
                              <div className="flex items-center gap-2 text-xs font-black text-indigo-900">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px]">Cặp câu {pIdx + 1}</span>
                              </div>
                              {/* Question */}
                              <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
                                  <span>Hỏi (Question):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={pair.questionEnglish}
                                    onChange={(e) => {
                                      const nextPairs = [...aiDraft.sentencePairs];
                                      nextPairs[pIdx] = { ...nextPairs[pIdx], questionEnglish: e.target.value };
                                      setAiDraft({ ...aiDraft, sentencePairs: nextPairs });
                                    }}
                                    placeholder="Câu hỏi tiếng Anh"
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                                  />
                                  <input
                                    type="text"
                                    value={pair.questionVietnamese || ''}
                                    onChange={(e) => {
                                      const nextPairs = [...aiDraft.sentencePairs];
                                      nextPairs[pIdx] = { ...nextPairs[pIdx], questionVietnamese: e.target.value };
                                      setAiDraft({ ...aiDraft, sentencePairs: nextPairs });
                                    }}
                                    placeholder="Dịch nghĩa tiếng Việt"
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700"
                                  />
                                </div>
                              </div>
                              {/* Answer */}
                              <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                                  <span>Đáp (Answer):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={pair.answerEnglish}
                                    onChange={(e) => {
                                      const nextPairs = [...aiDraft.sentencePairs];
                                      nextPairs[pIdx] = { ...nextPairs[pIdx], answerEnglish: e.target.value };
                                      setAiDraft({ ...aiDraft, sentencePairs: nextPairs });
                                    }}
                                    placeholder="Câu trả lời tiếng Anh"
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                                  />
                                  <input
                                    type="text"
                                    value={pair.answerVietnamese || ''}
                                    onChange={(e) => {
                                      const nextPairs = [...aiDraft.sentencePairs];
                                      nextPairs[pIdx] = { ...nextPairs[pIdx], answerVietnamese: e.target.value };
                                      setAiDraft({ ...aiDraft, sentencePairs: nextPairs });
                                    }}
                                    placeholder="Dịch nghĩa tiếng Việt"
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── B. FULL UNIT MODE PREVIEW & EDITOR (4 Lessons) ── */
                    <div className="space-y-5">
                      {/* Age Guideline & Unit Title Bar */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-indigo-700 text-white text-[11px] font-black uppercase">
                          {aiDraft.ageRule?.title || `Chuẩn ${aiDraft.ageGroupCode} tuổi`}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-indigo-950 mt-1">
                          {aiDraft.ageRule?.ruleSummary}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <input
                          type="text"
                          value={aiDraft.suggestedLessonTitle || ''}
                          onChange={(e) => setAiDraft({ ...aiDraft, suggestedLessonTitle: e.target.value })}
                          placeholder="Chủ đề tiếng Anh"
                          className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-black text-slate-900"
                        />
                        <input
                          type="text"
                          value={aiDraft.suggestedVietnameseTitle || ''}
                          onChange={(e) => setAiDraft({ ...aiDraft, suggestedVietnameseTitle: e.target.value })}
                          placeholder="Chủ đề tiếng Việt"
                          className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-200/80 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-xs font-black text-indigo-900 shrink-0">Big Question (Câu hỏi lớn của Unit):</span>
                        <input
                          type="text"
                          value={aiDraft.bigQuestion || ''}
                          onChange={(e) => setAiDraft({ ...aiDraft, bigQuestion: e.target.value })}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4 Lessons Breakdown Tabs */}
                  {Array.isArray(aiDraft.unitLessons) && aiDraft.unitLessons.length === 4 ? (
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-black text-indigo-950 flex items-center gap-2">
                          <Layers size={18} className="text-indigo-600" />
                          <span>4 Bài Học Riêng Biệt Trong Unit (Từ vựng &amp; Mẫu câu riêng từng bài):</span>
                        </h4>
                        <span className="text-xs font-bold text-slate-500">
                          Bấm vào từng bài để xem và chỉnh sửa
                        </span>
                      </div>

                      {/* 4 Tabs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {aiDraft.unitLessons.map((ul: any, uIdx: number) => {
                          const isSel = selectedAiLessonIdx === uIdx;
                          return (
                            <button
                              key={uIdx}
                              type="button"
                              onClick={() => setSelectedAiLessonIdx(uIdx)}
                              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-violet-700 text-white border-violet-700 shadow-md ring-2 ring-violet-300'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-black mb-1">
                                <span>Bài {ul.lessonOrder || uIdx + 1}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isSel ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                  {ul.vocabularies?.length || 0} từ · {ul.sentencePairs?.length || 0} câu
                                </span>
                              </div>
                              <p className="text-xs font-black truncate">{ul.title}</p>
                              <p className={`text-[11px] truncate font-medium ${isSel ? 'text-violet-200' : 'text-slate-500'}`}>
                                {ul.vietnameseTitle}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Lesson Content Details */}
                      {(() => {
                        const activeAiLesson = aiDraft.unitLessons[selectedAiLessonIdx] || aiDraft.unitLessons[0];
                        const lessonVocabs = activeAiLesson?.vocabularies || [];
                        const lessonSentences = activeAiLesson?.sentencePairs || [];

                        return (
                          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border-2 border-indigo-200/80 space-y-5 animate-fade-in">
                            {/* Lesson Header Fields */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-violet-700 text-white text-xs font-black">
                                    Chi tiết Bài {activeAiLesson.lessonOrder || selectedAiLessonIdx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                                    Định hướng: {activeAiLesson.focus || 'BÀI HỌC'}
                                  </span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                  <input
                                    type="text"
                                    value={activeAiLesson.title || ''}
                                    onChange={(e) => {
                                      const nextLessons = [...aiDraft.unitLessons];
                                      nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], title: e.target.value };
                                      setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                    }}
                                    placeholder="Tiêu đề tiếng Anh"
                                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-black text-slate-900 flex-1"
                                  />
                                  <input
                                    type="text"
                                    value={activeAiLesson.vietnameseTitle || ''}
                                    onChange={(e) => {
                                      const nextLessons = [...aiDraft.unitLessons];
                                      nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], vietnameseTitle: e.target.value };
                                      setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                    }}
                                    placeholder="Tiêu đề tiếng Việt"
                                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 flex-1"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 italic max-w-xs">{activeAiLesson.description}</p>
                            </div>

                            {/* Lesson Vocabularies */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs sm:text-sm font-black text-teal-900 flex items-center gap-1.5">
                                  <Sparkles size={15} className="text-teal-600" />
                                  <span>Từ Vựng Riêng Của Bài {activeAiLesson.lessonOrder || selectedAiLessonIdx + 1} ({lessonVocabs.length} từ vựng):</span>
                                </h5>
                                <span className="text-[11px] font-bold text-slate-400">Không trùng lặp với các bài học khác trong Unit</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {lessonVocabs.map((v: any, vIdx: number) => (
                                  <div key={vIdx} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                                    <div className="flex items-start gap-2.5">
                                      <img
                                        src={v.imageUrl || '/images/vocabulary/book-v1.svg'}
                                        alt={v.english}
                                        className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                                      />
                                      <div className="grid grid-cols-3 gap-1.5 flex-1">
                                        <div>
                                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Tiếng Anh</label>
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="text"
                                              value={v.english}
                                              onChange={(e) => {
                                                const nextLessons = [...aiDraft.unitLessons];
                                                const nextVocabs = [...nextLessons[selectedAiLessonIdx].vocabularies];
                                                nextVocabs[vIdx] = { ...nextVocabs[vIdx], english: e.target.value };
                                                nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], vocabularies: nextVocabs };
                                                setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                              }}
                                              className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-teal-950"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => playAudio(v.english)}
                                              className="p-1 rounded bg-teal-50 text-teal-800 hover:bg-teal-100 cursor-pointer shrink-0"
                                              title="Nghe"
                                            >
                                              <Volume2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">IPA</label>
                                          <input
                                            type="text"
                                            value={v.pronunciation}
                                            onChange={(e) => {
                                              const nextLessons = [...aiDraft.unitLessons];
                                              const nextVocabs = [...nextLessons[selectedAiLessonIdx].vocabularies];
                                              nextVocabs[vIdx] = { ...nextVocabs[vIdx], pronunciation: e.target.value };
                                              nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], vocabularies: nextVocabs };
                                              setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                            }}
                                            className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono text-slate-800"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Tiếng Việt</label>
                                          <input
                                            type="text"
                                            value={v.vietnamese}
                                            onChange={(e) => {
                                              const nextLessons = [...aiDraft.unitLessons];
                                              const nextVocabs = [...nextLessons[selectedAiLessonIdx].vocabularies];
                                              nextVocabs[vIdx] = { ...nextVocabs[vIdx], vietnamese: e.target.value };
                                              nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], vocabularies: nextVocabs };
                                              setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                            }}
                                            className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Lesson Sentence Pairs */}
                            <div className="space-y-3 pt-3 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs sm:text-sm font-black text-pink-900 flex items-center gap-1.5">
                                  <MessageSquare size={15} className="text-pink-600" />
                                  <span>Mẫu Câu Riêng Của Bài {activeAiLesson.lessonOrder || selectedAiLessonIdx + 1} ({lessonSentences.length} cặp câu):</span>
                                </h5>
                                <span className="text-[11px] font-bold text-slate-400">Chuẩn lứa tuổi {aiDraft.ageGroupCode}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {lessonSentences.map((pair: any, pIdx: number) => (
                                  <div key={pIdx} className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-200 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-black text-pink-900">Mẫu câu #{pIdx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => playAudio(`${pair.questionEnglish} ${pair.answerEnglish}`)}
                                        className="px-2 py-0.5 rounded bg-white border border-pink-200 text-pink-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Volume2 size={12} />
                                        <span>Nghe</span>
                                      </button>
                                    </div>

                                    {/* Question */}
                                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                                      <label className="block text-[10px] font-black uppercase text-amber-800">Câu Hỏi</label>
                                      <input
                                        type="text"
                                        value={pair.questionEnglish}
                                        onChange={(e) => {
                                          const nextLessons = [...aiDraft.unitLessons];
                                          const nextPairs = [...nextLessons[selectedAiLessonIdx].sentencePairs];
                                          nextPairs[pIdx] = { ...nextPairs[pIdx], questionEnglish: e.target.value };
                                          nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], sentencePairs: nextPairs };
                                          setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                        }}
                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-black text-slate-900"
                                      />
                                      <input
                                        type="text"
                                        value={pair.questionVietnamese || ''}
                                        onChange={(e) => {
                                          const nextLessons = [...aiDraft.unitLessons];
                                          const nextPairs = [...nextLessons[selectedAiLessonIdx].sentencePairs];
                                          nextPairs[pIdx] = { ...nextPairs[pIdx], questionVietnamese: e.target.value };
                                          nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], sentencePairs: nextPairs };
                                          setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                        }}
                                        placeholder="Nghĩa tiếng Việt"
                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-600"
                                      />
                                    </div>

                                    {/* Answer */}
                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 space-y-1">
                                      <label className="block text-[10px] font-black uppercase text-emerald-800">Câu Trả Lời</label>
                                      <input
                                        type="text"
                                        value={pair.answerEnglish}
                                        onChange={(e) => {
                                          const nextLessons = [...aiDraft.unitLessons];
                                          const nextPairs = [...nextLessons[selectedAiLessonIdx].sentencePairs];
                                          nextPairs[pIdx] = { ...nextPairs[pIdx], answerEnglish: e.target.value };
                                          nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], sentencePairs: nextPairs };
                                          setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                        }}
                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-black text-emerald-950"
                                      />
                                      <input
                                        type="text"
                                        value={pair.answerVietnamese || ''}
                                        onChange={(e) => {
                                          const nextLessons = [...aiDraft.unitLessons];
                                          const nextPairs = [...nextLessons[selectedAiLessonIdx].sentencePairs];
                                          nextPairs[pIdx] = { ...nextPairs[pIdx], answerVietnamese: e.target.value };
                                          nextLessons[selectedAiLessonIdx] = { ...nextLessons[selectedAiLessonIdx], sentencePairs: nextPairs };
                                          setAiDraft({ ...aiDraft, unitLessons: nextLessons });
                                        }}
                                        placeholder="Nghĩa tiếng Việt"
                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-600"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* Fallback: Flat Vocabulary & Sentences */
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {(aiDraft.vocabularies || []).map((v: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                            <div className="flex items-start gap-2.5">
                              <img src={v.imageUrl || '/images/vocabulary/book-v1.svg'} alt={v.english} className="w-12 h-12 object-contain" />
                              <div className="flex-1">
                                <p className="font-black text-xs text-slate-900">{v.english} <span className="font-normal font-mono text-slate-500">{v.pronunciation}</span></p>
                                <p className="text-xs text-slate-600 font-semibold">{v.vietnamese}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 shrink-0">
              <span className="text-xs font-semibold text-slate-500">
                {aiDraft
                  ? aiCreatorModal.mode === 'lesson'
                    ? `Sẵn sàng tạo bài học mới vào Unit ${aiCreatorModal.unitData?.unitNumber || ''} với ${aiDraft.vocabularies?.length || 0} từ vựng và ${aiDraft.sentencePairs?.length || 0} cặp câu`
                    : 'Sẵn sàng tạo Unit mới gồm 4 bài học với từ vựng & mẫu câu riêng biệt'
                  : 'Bấm "Đề xuất bằng AI" để khởi tạo nội dung mẫu'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAiCreatorModal(null)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  Đóng
                </button>
                {aiDraft && (
                  <button
                    type="button"
                    disabled={aiApplying}
                    onClick={handleApplyAiDraft}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Check size={18} />
                    <span>
                      {aiApplying
                        ? 'Đang lưu vào Giáo trình...'
                        : aiCreatorModal.mode === 'lesson'
                        ? `Tạo & Thêm Bài Học Vào Unit ${aiCreatorModal.unitData?.unitNumber || ''}`
                        : `Tạo Trọn Gói Unit #${currentUnits.reduce((m: number, u: any) => Math.max(m, Number(u.unitNumber) || 0), 0) + 1} (4 Bài Học Riêng Biệt)`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: AGE-APPROPRIATENESS & PUBLISH AUDIT (B. Kiểm định an toàn & độ khó lứa tuổi) ── */}
      {auditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setAuditModal(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full p-5 sm:p-7 space-y-5 shadow-2xl my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    auditModal.report?.ready && auditModal.report?.ageAudit?.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Kiểm Định Xuất Bản &amp; Độ Phù Hợp Lứa Tuổi (AI Audit)
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600">
                    Bài học: <span className="font-black text-slate-900">{auditModal.lesson?.title}</span> • Độ tuổi:{' '}
                    <span className="font-black text-indigo-800">
                      {auditModal.report?.ageAudit?.ageGroupCode || auditModal.lesson?.ageGroupCode || '3-4'} tuổi
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditModal(null)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 overflow-y-auto pr-1 flex-1">
              {/* Summary Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div
                  className={`p-4 rounded-2xl border ${
                    auditModal.report?.ready
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50/70 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">
                      1. Điều kiện kỹ thuật xuất bản
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                        auditModal.report?.ready
                          ? 'bg-emerald-700 text-white'
                          : 'bg-rose-700 text-white'
                      }`}
                    >
                      {auditModal.report?.ready ? 'ĐẠT CHUẨN' : 'CẦN BỔ SUNG'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold mt-2">
                    {auditModal.report?.ready
                      ? `Đầy đủ ${auditModal.report?.wordCount || 0} từ vựng có hình ảnh hợp lệ và ${
                          auditModal.report?.games?.length || 0
                        } trò chơi tương tác.`
                      : (auditModal.report?.issues || []).join(' ')}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    auditModal.report?.ageAudit?.passed
                      ? 'bg-teal-50/70 border-teal-300 text-teal-950'
                      : 'bg-amber-50/80 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">
                      2. Kiểm định độ khó &amp; an toàn lứa tuổi
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                        auditModal.report?.ageAudit?.passed
                          ? 'bg-teal-700 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {auditModal.report?.ageAudit?.passed
                        ? `PHÙ HỢP (${auditModal.report?.ageAudit?.score || 100}/100)`
                        : `${auditModal.report?.ageAudit?.warningCount || 0} CẢNH BÁO`}
                    </span>
                  </div>
                  <p className="text-xs font-semibold mt-2">
                    {auditModal.report?.ageAudit?.ageRuleSummary ||
                      'Trẻ 3–4 tuổi chỉ nên nói cụm 2–4 từ; 5–6 tuổi mới dùng câu ghép.'}
                  </p>
                </div>
              </div>

              {/* Sentence Length & Complexity Audit Table */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Rà soát độ dài mẫu câu theo lứa tuổi ({auditModal.report?.ageAudit?.sentenceAudits?.length || 0} câu)
                  </h4>
                  <span className="text-xs font-bold text-slate-600">
                    Khuyến nghị câu trả lời: ≤ {auditModal.report?.ageAudit?.maxAnswerWords || 4} từ
                  </span>
                </div>

                {auditModal.report?.ageAudit?.sentenceAudits?.length > 0 ? (
                  <div className="space-y-2.5">
                    {auditModal.report.ageAudit.sentenceAudits.map((s: any, idx: number) => (
                      <div
                        key={s.id || idx}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          s.status === 'PASS'
                            ? 'bg-slate-50/70 border-slate-200'
                            : s.status === 'UNSAFE'
                            ? 'bg-rose-50 border-rose-300'
                            : 'bg-amber-50/70 border-amber-300'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-700">
                              {s.contentType === 'QUESTION' ? 'Câu hỏi' : s.contentType === 'ANSWER' ? 'Câu trả lời' : 'Mẫu câu'}
                            </span>
                            <span className="text-sm font-black text-slate-900">{s.english}</span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                                s.status === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-200 text-amber-950'
                              }`}
                            >
                              {s.wordCount} từ (Chuẩn ≤ {s.maxRecommendedWords} từ)
                            </span>
                          </div>
                          {s.vietnamese && (
                            <p className="text-xs text-slate-600 font-medium">{s.vietnamese}</p>
                          )}
                          {s.issue && (
                            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mt-1">
                              <AlertCircle size={14} className="shrink-0 text-amber-700" />
                              <span>{s.issue}</span>
                            </p>
                          )}
                        </div>

                        {s.suggestedRewrite && s.id && (
                          <button
                            type="button"
                            onClick={() => handleApplyShortenedSentence(s.id, s.suggestedRewrite)}
                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 cursor-pointer transition-all"
                          >
                            Rút gọn: &ldquo;{s.suggestedRewrite}&rdquo;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">
                    Bài học này chưa có mẫu câu nào để kiểm định độ dài.
                  </p>
                )}
              </div>

              {/* Vocabulary Pronunciation & Safety Audit */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Rà soát từ vựng &amp; số âm tiết ({auditModal.report?.ageAudit?.vocabularyAudits?.length || 0} từ)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(auditModal.report?.ageAudit?.vocabularyAudits || []).map((v: any, idx: number) => (
                    <div
                      key={v.id || idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                        v.status === 'PASS'
                          ? 'bg-slate-50/70 border-slate-200'
                          : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {v.english}{' '}
                          <span className="text-xs font-mono font-normal text-slate-500">
                            {v.pronunciation}
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 truncate">{v.vietnamese}</p>
                        {v.issue && (
                          <p className="text-[11px] font-bold text-amber-800 mt-0.5">{v.issue}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                          v.status === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {v.syllables} âm tiết
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setAuditModal(null)}
                className="px-6 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-sm cursor-pointer"
              >
                Đã hiểu &amp; Đóng báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
