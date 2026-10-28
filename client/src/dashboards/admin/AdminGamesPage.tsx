import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Gamepad2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Check,
  X,
  Play,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  BookOpen,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { adminApi } from '../../services/api';

// ─── GAME METADATA DEFINITIONS ───────────────────────────────────────────────

export interface GameTypeMeta {
  code: string;
  label: string;
  icon: string;
  category: 'listening' | 'memory' | 'action' | 'logic';
  color: string;
  badgeBg: string;
  description: string;
}

export const GAME_TYPES: Record<string, GameTypeMeta> = {
  LISTEN_CHOOSE: {
    code: 'LISTEN_CHOOSE',
    label: 'Nghe & Chọn hình',
    icon: '🎯',
    category: 'listening',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/15 text-cyan-800 border-cyan-500/30',
    description: 'Bé nghe phát âm từ vựng và chạm vào hình ảnh tương ứng.'
  },
  BUBBLE_POP: {
    code: 'BUBBLE_POP',
    label: 'Bắn bóng nước',
    icon: '🫧',
    category: 'action',
    color: '#38bdf8',
    badgeBg: 'bg-sky-500/15 text-sky-800 border-sky-500/30',
    description: 'Bóng nước bay lên mang từ vựng, bé chạm nổ bóng đúng yêu cầu.'
  },
  MEMORY_CARD: {
    code: 'MEMORY_CARD',
    label: 'Lật thẻ trí nhớ',
    icon: '🃏',
    category: 'memory',
    color: '#a855f7',
    badgeBg: 'bg-purple-500/15 text-purple-800 border-purple-500/30',
    description: 'Lật tìm các cặp thẻ bài trùng khớp giữa từ vựng và hình minh họa.'
  },
  MEMORY: {
    code: 'MEMORY',
    label: 'Ghi nhớ lật thẻ',
    icon: '🎴',
    category: 'memory',
    color: '#c084fc',
    badgeBg: 'bg-fuchsia-500/15 text-fuchsia-800 border-fuchsia-500/30',
    description: 'Trò chơi rèn luyện trí nhớ thị giác và từ vựng.'
  },
  STAR_CATCHER: {
    code: 'STAR_CATCHER',
    label: 'Hứng ngôi sao',
    icon: '⭐',
    category: 'action',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
    description: 'Ngôi sao mang từ vựng rơi xuống, bé di chuyển giỏ để đón sao đúng.'
  },
  ANIMAL_SOUND: {
    code: 'ANIMAL_SOUND',
    label: 'Âm thanh con vật',
    icon: '🐾',
    category: 'listening',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
    description: 'Nghe tiếng kêu đặc trưng của các con vật và đoán tên tiếng Anh.'
  },
  FEED_ANIMAL: {
    code: 'FEED_ANIMAL',
    label: 'Cho thú cưng ăn',
    icon: '🍎',
    category: 'action',
    color: '#f43f5e',
    badgeBg: 'bg-rose-500/15 text-rose-800 border-rose-500/30',
    description: 'Kéo đúng món thức ăn hoặc đồ vật tương ứng vào miệng bạn thú ngộ nghĩnh.'
  },
  IMAGE_WORD_MATCH: {
    code: 'IMAGE_WORD_MATCH',
    label: 'Ghép hình & từ',
    icon: '🖼️',
    category: 'logic',
    color: '#6366f1',
    badgeBg: 'bg-indigo-500/15 text-indigo-800 border-indigo-500/30',
    description: 'Nối từ tiếng Anh viết hoa với tranh minh họa đúng.'
  },
  MATCHING: {
    code: 'MATCHING',
    label: 'Nối cặp tương ứng',
    icon: '🔗',
    category: 'logic',
    color: '#818cf8',
    badgeBg: 'bg-indigo-500/15 text-indigo-800 border-indigo-500/30',
    description: 'Kéo đường nối giữa 2 cột nội dung có liên quan mật thiết.'
  },
  COUNT_OBJECTS: {
    code: 'COUNT_OBJECTS',
    label: 'Đếm số lượng',
    icon: '🔢',
    category: 'logic',
    color: '#ec4899',
    badgeBg: 'bg-pink-500/15 text-pink-800 border-pink-500/30',
    description: 'Đếm số lượng đồ vật trên màn hình và chọn số đếm tiếng Anh.'
  },
  FIND_OBJECT: {
    code: 'FIND_OBJECT',
    label: 'Tìm đồ vật giấu',
    icon: '🔍',
    category: 'logic',
    color: '#14b8a6',
    badgeBg: 'bg-teal-500/15 text-teal-800 border-teal-500/30',
    description: 'Khám phá bức tranh lớn và chạm vào đồ vật được yêu cầu.'
  },
  MISSING_OBJECT: {
    code: 'MISSING_OBJECT',
    label: 'Tìm vật biến mất',
    icon: '❓',
    category: 'memory',
    color: '#eab308',
    badgeBg: 'bg-yellow-500/15 text-yellow-800 border-yellow-500/30',
    description: 'Quan sát các vật thể và phát hiện món đồ vừa bị giấu đi.'
  },
  COLOR_RECOGNITION: {
    code: 'COLOR_RECOGNITION',
    label: 'Nhận biết màu sắc',
    icon: '🎨',
    category: 'listening',
    color: '#8b5cf6',
    badgeBg: 'bg-violet-500/15 text-violet-800 border-violet-500/30',
    description: 'Nhận diện và phân biệt các mảng màu qua lời đọc tiếng Anh.'
  },
  TRUE_FALSE: {
    code: 'TRUE_FALSE',
    label: 'Đúng hay Sai (Yes/No)',
    icon: '⚖️',
    category: 'logic',
    color: '#0ea5e9',
    badgeBg: 'bg-sky-500/15 text-sky-800 border-sky-500/30',
    description: 'Nhìn tranh và trả lời câu hỏi Yes hoặc No tương ứng.'
  },
  DRAG_DROP: {
    code: 'DRAG_DROP',
    label: 'Kéo thả vào ô',
    icon: '🧩',
    category: 'action',
    color: '#f97316',
    badgeBg: 'bg-orange-500/15 text-orange-800 border-orange-500/30',
    description: 'Kéo thả các chi tiết vào đúng vị trí mục tiêu trên bảng.'
  },
  CLASSIFICATION: {
    code: 'CLASSIFICATION',
    label: 'Phân loại đồ vật',
    icon: '📦',
    category: 'logic',
    color: '#64748b',
    badgeBg: 'bg-slate-500/15 text-slate-700 border-slate-500/30',
    description: 'Phân loại đồ dùng vào 2 giỏ theo chủ đề hoặc tính chất.'
  },
  LISTEN_REPEAT: {
    code: 'LISTEN_REPEAT',
    label: 'Nghe & Nói theo Koko',
    icon: '🗣️',
    category: 'listening',
    color: '#059669',
    badgeBg: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
    description: 'Luyện phát âm từ vựng theo hướng dẫn của bạn Koko.'
  },
  TAP_PICTURE: {
    code: 'TAP_PICTURE',
    label: 'Chạm nhanh vào hình',
    icon: '👆',
    category: 'action',
    color: '#0284c7',
    badgeBg: 'bg-sky-500/15 text-sky-800 border-sky-500/30',
    description: 'Chạm phản xạ nhanh khi hình ảnh mục tiêu xuất hiện.'
  }
};

export const AdminGamesPage: React.FC = () => {
  // Data States
  const requestVersion = useRef(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [curriculumTree, setCurriculumTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalActivities: number;
    activeCount: number;
    inactiveCount: number;
    byType: Record<string, number>;
    byAgeGroup: Record<string, number>;
  }>({
    totalActivities: 0,
    activeCount: 0,
    inactiveCount: 0,
    byType: {},
    byAgeGroup: {}
  });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(12);

  // Expanded Questions Preview state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'questions'>('basic');
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Notification Toast
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    vietnameseTitle: '',
    activityType: 'LISTEN_CHOOSE',
    lessonId: '',
    ageGroupCode: '3-4',
    instructions: 'Listen and choose the correct picture!',
    instructionAudioUrl: '',
    difficulty: 1,
    timeLimit: 0,
    pointsPerQuestion: 10,
    starConfig: {
      threeStarsMin: 90,
      twoStarsMin: 70,
      oneStarMin: 50
    },
    status: 'ACTIVE',
    questions: [
      {
        promptText: '',
        promptAudioUrl: '',
        promptImageUrl: '',
        correctAnswer: '',
        explanation: '',
        options: [
          { id: 'opt_0', text: '', vietnameseText: '', imageUrl: '', isCorrect: true },
          { id: 'opt_1', text: '', vietnameseText: '', imageUrl: '', isCorrect: false },
          { id: 'opt_2', text: '', vietnameseText: '', imageUrl: '', isCorrect: false }
        ]
      }
    ]
  });

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Load Curriculum Tree once for dropdowns
  useEffect(() => {
    adminApi.getDeepCurriculum()
      .then((res: any) => {
        const tree = res?.data || res?.curriculumTree || [];
        if (Array.isArray(tree)) {
          setCurriculumTree(tree);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Activities on filter change
  const loadActivities = async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const res: any = await adminApi.getActivities({
        search,
        activityType: selectedType,
        ageGroupCode: selectedAgeGroup,
        lessonId: selectedLessonId,
        status: selectedStatus,
        page,
        limit
      });
      if (version === requestVersion.current && res?.success) {
        setActivities(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: any) {
      if (version === requestVersion.current) showAlert('error', err?.message || 'Không thể tải danh sách trò chơi.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [search, selectedType, selectedAgeGroup, selectedStatus, selectedLessonId, page]);

  // Flattened Lessons for selection in filters and modal
  const allLessons = useMemo(() => {
    const list: Array<{ _id: string; title: string; unitTitle: string; bookNumber: number; ageGroupCode: string }> = [];
    curriculumTree.forEach((book) => {
      (book.units || []).forEach((unit: any) => {
        (unit.lessons || []).forEach((lesson: any) => {
          list.push({
            _id: lesson._id,
            title: lesson.title,
            unitTitle: `Unit ${unit.unitNumber}: ${unit.bigQuestion || 'Chủ đề'}`,
            bookNumber: book.bookNumber,
            ageGroupCode: lesson.ageGroupCode || book.ageGroupCode || '3-4'
          });
        });
      });
    });
    return list;
  }, [curriculumTree]);

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async (activity: any) => {
    try {
      const res: any = await adminApi.toggleActivityStatus(activity._id);
      if (res?.success) {
        showAlert('success', res.message || 'Cập nhật trạng thái thành công!');
        setActivities((prev) =>
          prev.map((item) =>
            item._id === activity._id
              ? { ...item, status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
              : item
          )
        );
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Lỗi khi đổi trạng thái.');
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setActiveTab('basic');
    setFormData({
      title: '',
      vietnameseTitle: '',
      activityType: 'LISTEN_CHOOSE',
      lessonId: allLessons[0]?._id || '',
      ageGroupCode: allLessons[0]?.ageGroupCode || '3-4',
      instructions: 'Listen and choose the correct picture!',
      instructionAudioUrl: '',
      difficulty: 1,
      timeLimit: 0,
      pointsPerQuestion: 10,
      starConfig: {
        threeStarsMin: 90,
        twoStarsMin: 70,
        oneStarMin: 50
      },
      status: 'ACTIVE',
      questions: [
        {
          promptText: '',
          promptAudioUrl: '',
          promptImageUrl: '',
          correctAnswer: '',
          explanation: '',
          options: [
            { id: 'opt_0', text: '', vietnameseText: '', imageUrl: '', isCorrect: true },
            { id: 'opt_1', text: '', vietnameseText: '', imageUrl: '', isCorrect: false },
            { id: 'opt_2', text: '', vietnameseText: '', imageUrl: '', isCorrect: false }
          ]
        }
      ]
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (activity: any) => {
    setModalMode('edit');
    setEditingId(activity._id);
    setActiveTab('basic');
    setFormData({
      title: activity.title || '',
      vietnameseTitle: activity.vietnameseTitle || '',
      activityType: activity.activityType || 'LISTEN_CHOOSE',
      lessonId: activity.lesson?._id || activity.lesson || '',
      ageGroupCode: activity.ageGroupCode || '3-4',
      instructions: activity.instructions || 'Listen and choose the correct picture!',
      instructionAudioUrl: activity.instructionAudioUrl || '',
      difficulty: activity.difficulty || 1,
      timeLimit: activity.timeLimit || 0,
      pointsPerQuestion: activity.pointsPerQuestion || 10,
      starConfig: activity.starConfig || {
        threeStarsMin: 90,
        twoStarsMin: 70,
        oneStarMin: 50
      },
      status: activity.status || 'ACTIVE',
      questions: (activity.questions && activity.questions.length > 0)
        ? activity.questions.map((q: any) => ({
            ...q,
            vocabulary: q.vocabulary?._id || q.vocabulary,
            promptText: q.promptText || '',
            promptAudioUrl: q.promptAudioUrl || '',
            promptImageUrl: q.promptImageUrl || '',
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            options: (q.options || []).map((o: any, idx: number) => ({
              ...o,
              id: o.id || `opt_${idx}`,
              text: o.text || '',
              vietnameseText: o.vietnameseText || '',
              imageUrl: o.imageUrl || '',
              isCorrect: Boolean(o.isCorrect)
            }))
          }))
        : [
            {
              promptText: '',
              promptAudioUrl: '',
              promptImageUrl: '',
              correctAnswer: '',
              explanation: '',
              options: [
                { id: 'opt_0', text: '', vietnameseText: '', imageUrl: '', isCorrect: true },
                { id: 'opt_1', text: '', vietnameseText: '', imageUrl: '', isCorrect: false }
              ]
            }
          ]
    });
    setModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showAlert('error', 'Vui lòng nhập tên trò chơi!');
      return;
    }
    if (!formData.lessonId) {
      showAlert('error', 'Vui lòng chọn bài học liên kết!');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        const res: any = await adminApi.createActivity(formData);
        if (res?.success) {
          showAlert('success', 'Tạo trò chơi mới thành công!');
          setModalOpen(false);
          loadActivities();
        }
      } else if (editingId) {
        const res: any = await adminApi.updateActivity(editingId, formData);
        if (res?.success) {
          showAlert('success', 'Cập nhật trò chơi thành công!');
          setModalOpen(false);
          loadActivities();
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Có lỗi khi lưu thông tin trò chơi.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete
  const confirmDelete = async () => {
    if (!deletingActivity) return;
    setDeleting(true);
    try {
      const res: any = await adminApi.deleteActivity(deletingActivity._id);
      if (res?.success) {
        showAlert('success', res.message || 'Xóa trò chơi thành công!');
        setDeleteModalOpen(false);
        setDeletingActivity(null);
        loadActivities();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa trò chơi này.');
    } finally {
      setDeleting(false);
    }
  };

  // Question editing helpers
  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          promptText: '',
          promptAudioUrl: '',
          promptImageUrl: '',
          correctAnswer: '',
          explanation: '',
          options: [
            { id: `opt_${Date.now()}_0`, text: '', vietnameseText: '', imageUrl: '', isCorrect: true },
            { id: `opt_${Date.now()}_1`, text: '', vietnameseText: '', imageUrl: '', isCorrect: false },
            { id: `opt_${Date.now()}_2`, text: '', vietnameseText: '', imageUrl: '', isCorrect: false }
          ]
        }
      ]
    }));
  };

  const removeQuestion = (qIndex: number) => {
    if (formData.questions.length <= 1) {
      showAlert('error', 'Trò chơi cần ít nhất một câu hỏi hoặc thử thách!');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== qIndex)
    }));
  };

  const updateQuestion = (qIndex: number, field: string, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      (updated[qIndex] as any)[field] = val;
      return { ...prev, questions: updated };
    });
  };

  const addOption = (qIndex: number) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      const opts = updated[qIndex].options || [];
      updated[qIndex].options = [
        ...opts,
        { id: `opt_${Date.now()}`, text: '', vietnameseText: '', imageUrl: '', isCorrect: false }
      ];
      return { ...prev, questions: updated };
    });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      if (updated[qIndex].options.length <= 2) {
        showAlert('error', 'Mỗi câu hỏi cần tối thiểu 2 lựa chọn!');
        return prev;
      }
      updated[qIndex].options = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
      return { ...prev, questions: updated };
    });
  };

  const setCorrectOption = (qIndex: number, optIndex: number) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      const optText = updated[qIndex].options[optIndex].text;
      updated[qIndex].options = updated[qIndex].options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === optIndex
      }));
      updated[qIndex].correctAnswer = optText || '';
      return { ...prev, questions: updated };
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Alert Toast ─────────────────────────────────────────────────── */}
      {alert && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border text-sm font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-500/40'
              : 'bg-rose-50 text-rose-800 border-rose-500/40'
          }`}
        >
          {alert.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-800" /> : <AlertCircle size={18} className="text-rose-800" />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* ── Banner Header ───────────────────────────────────────────────────── */}
      <header className="staff-page-header">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-800 text-xs font-bold uppercase tracking-wider">
              <Gamepad2 size={14} />
              <span>Trung tâm Tương tác Giáo dục</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Kho Trò Chơi & Hoạt Động Tương Tác
            </h1>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Toàn quyền quản trị, tinh chỉnh câu đố, điểm thưởng và kiểm tra 18 thể loại trò chơi mầm non từ Book 1 đến Book 3.
            </p>
          </div>

          <div className="staff-page-header-actions">
            <button
              onClick={() => loadActivities()}
              className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-inherit transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
              aria-label="Làm mới danh sách trò chơi"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-bold text-sm  transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} />
              <span>Thêm Trò Chơi Mới</span>
            </button>
          </div>
      </header>

      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-800">
            <Gamepad2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tổng Trò Chơi</p>
            <p className="text-2xl font-black text-inherit mt-0.5">{stats.totalActivities}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-800">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Đang Mở Khóa</p>
            <p className="text-2xl font-black text-emerald-800 mt-0.5">{stats.activeCount}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-800">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tạm Ẩn / Bảo trì</p>
            <p className="text-2xl font-black text-amber-800 mt-0.5">{stats.inactiveCount}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-800">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thể Loại Trò Chơi</p>
            <p className="text-2xl font-black text-purple-800 mt-0.5">
              {Object.keys(stats.byType || {}).length || 14} Loại
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Filter by Game Type (Pills bar) ────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span className="flex items-center gap-2">
            <Filter size={14} />
            <span>Phân loại theo thể loại game ({Object.keys(GAME_TYPES).length}):</span>
          </span>
          {selectedType !== 'ALL' && (
            <button
              onClick={() => setSelectedType('ALL')}
              className="text-indigo-800 hover:text-indigo-800 cursor-pointer"
            >
              Đặt lại (Tất cả)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedType === 'ALL'
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            Tất cả ({stats.totalActivities})
          </button>

          {Object.values(GAME_TYPES).map((meta) => {
            const count = stats.byType?.[meta.code] || 0;
            const isSelected = selectedType === meta.code;
            return (
              <button
                key={meta.code}
                onClick={() => setSelectedType(meta.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-700 text-white border-indigo-400'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-70 px-1 py-0.2 rounded-md bg-black/20">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search and Filter Toolbar ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên game tiếng Anh, tiếng Việt, hướng dẫn..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Age Group Filter */}
        <select
          value={selectedAgeGroup}
          onChange={(e) => {
            setSelectedAgeGroup(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="ALL">Tất cả Độ tuổi</option>
          <option value="3-4">3–4 Tuổi (Mầm - Book 1)</option>
          <option value="4-5">4–5 Tuổi (Chồi - Book 2)</option>
          <option value="5-6">5–6 Tuổi (Lá - Book 3)</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="ALL">Tất cả Trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Tạm ẩn</option>
        </select>

        {/* Lesson Filter */}
        <select
          value={selectedLessonId}
          onChange={(e) => {
            setSelectedLessonId(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[200px] truncate"
        >
          <option value="ALL">Tất cả Bài học</option>
          {allLessons.map((l) => (
            <option key={l._id} value={l._id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      {/* ── Main Activity Grid ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-600">
          <RefreshCw size={28} className="animate-spin text-indigo-800" />
          <p className="text-sm font-bold">Đang tải kho trò chơi mầm non...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="py-20 text-center rounded-3xl border border-slate-200 bg-white p-8 space-y-3">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-800">
            <Gamepad2 size={32} />
          </div>
          <p className="text-base font-bold text-inherit">Không tìm thấy trò chơi phù hợp</p>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm nút "Thêm Trò Chơi Mới" để tạo trò chơi tương tác đầu tiên cho bài học.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {activities.map((act) => {
            const meta = GAME_TYPES[act.activityType] || {
              label: act.activityType,
              icon: '🎮',
              badgeBg: 'bg-slate-100 text-slate-700 border-slate-200'
            };
            const isExpanded = expandedId === act._id;
            const qCount = act.questions?.length || act.questionCount || 0;

            return (
              <div
                key={act._id}
                className="rounded-2xl border border-slate-200 bg-white hover:border-slate-200 hover:bg-white transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Header & Badges */}
                <div className="p-5 pb-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border ${meta.badgeBg}`}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black">
                        {act.ageGroupCode || '3-4'} Tuổi
                      </span>
                      <button
                        onClick={() => handleToggleStatus(act)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black border transition-colors cursor-pointer ${
                          act.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-500/40 hover:bg-emerald-50'
                            : 'bg-rose-50 text-rose-800 border-rose-500/40 hover:bg-rose-50'
                        }`}
                        title="Bấm để bật/tắt trò chơi"
                      >
                        {act.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ẩn'}
                      </button>
                    </div>
                  </div>

                  {/* Title & Vietnamese Translation */}
                  <div>
                    <h3 className="text-base font-black text-inherit group-hover:text-indigo-800 transition-colors line-clamp-1">
                      {act.title}
                    </h3>
                    {act.vietnameseTitle && (
                      <p className="text-xs font-semibold text-slate-600 line-clamp-1 mt-0.5">
                        {act.vietnameseTitle}
                      </p>
                    )}
                  </div>

                  {/* Lesson and Unit Link */}
                  {act.lesson && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 font-medium">
                      <BookOpen size={12} className="text-indigo-800 shrink-0" />
                      <span className="truncate">
                        Bài: <strong className="text-slate-700">{act.lesson.title || 'Bài học'}</strong>
                      </span>
                    </div>
                  )}

                  {/* Quick specs pill row */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-white border border-slate-200">
                      <p className="text-[10px] text-slate-600 font-bold uppercase">Câu hỏi</p>
                      <p className="text-xs font-black text-slate-700 mt-0.5">{qCount} câu</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200">
                      <p className="text-[10px] text-slate-600 font-bold uppercase">Độ khó</p>
                      <p className="text-xs font-black text-amber-800 mt-0.5">
                        {'★'.repeat(act.difficulty || 1)}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200">
                      <p className="text-[10px] text-slate-600 font-bold uppercase">Thời gian</p>
                      <p className="text-xs font-black text-slate-700 mt-0.5">
                        {act.timeLimit ? `${act.timeLimit}s` : 'Vô hạn'}
                      </p>
                    </div>
                  </div>

                  {/* Questions Preview Accordion */}
                  {qCount > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : act._id)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-[11px] font-bold text-slate-600 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <HelpCircle size={12} />
                          <span>Chi tiết {qCount} câu đố / đáp án</span>
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && act.questions && (
                        <div className="mt-2 space-y-2 p-2.5 rounded-xl bg-white border border-slate-200 max-h-48 overflow-y-auto">
                          {act.questions.map((q: any, qIdx: number) => (
                            <div
                              key={qIdx}
                              className="text-xs p-2 rounded-lg bg-white border border-slate-200 space-y-1"
                            >
                              <div className="flex items-center justify-between font-bold text-slate-700">
                                <span>Câu {qIdx + 1}: {q.promptText || 'Lựa chọn hình đúng'}</span>
                                {q.vocabulary && (
                                  <span className="text-[10px] text-indigo-800 font-black">
                                    {q.vocabulary.english}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(q.options || []).map((opt: any, optIdx: number) => (
                                  <span
                                    key={optIdx}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      opt.isCorrect || opt.text === q.correctAnswer
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500/50 font-black'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {opt.text || `Lựa chọn ${optIdx + 1}`} {opt.isCorrect ? '✓' : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
                  {/* Chơi thử / Preview Game in student mode */}
                  <a
                    href={`/activities/${act._id}?preview=1}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-800 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer"
                    title="Mở màn hình chơi thử của trẻ em"
                  >
                    <Play size={13} />
                    <span>Chơi thử</span>
                    <ExternalLink size={10} className="opacity-70" />
                  </a>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(act)}
                      className="p-2 rounded-xl text-slate-600 hover:text-inherit hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Chỉnh sửa trò chơi"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingActivity(act);
                        setDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-600 hover:text-rose-800 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Xóa trò chơi"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination Controls ─────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-600">
          <div>
            Trang <strong className="text-inherit">{page}</strong> trên <strong className="text-inherit">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-inherit cursor-pointer"
            >
              Trang trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-inherit cursor-pointer"
            >
              Trang kế
            </button>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl bg-white border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-800">
                  <Gamepad2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-inherit">
                    {modalMode === 'create' ? 'Tạo Trò Chơi Mới' : 'Chỉnh Sửa Trò Chơi'}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Cấu hình thể loại, điểm thưởng và câu hỏi tương tác cho trẻ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-600 hover:text-inherit hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'basic'
                    ? 'border-indigo-500 text-indigo-800'
                    : 'border-transparent text-slate-600 hover:text-slate-700'
                }`}
              >
                1. Thông tin trò chơi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTab === 'questions'
                    ? 'border-indigo-500 text-indigo-800'
                    : 'border-transparent text-slate-600 hover:text-slate-700'
                }`}
              >
                <span>2. Bộ câu hỏi & Đáp án</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-800 text-[10px]">
                  {formData.questions.length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  {/* Select Lesson */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Thuộc bài học (Lesson) <span className="text-rose-800">*</span>
                    </label>
                    <select
                      value={formData.lessonId}
                      onChange={(e) => {
                        const target = allLessons.find((l) => l._id === e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          lessonId: e.target.value,
                          ageGroupCode: target?.ageGroupCode || prev.ageGroupCode
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                      required
                    >
                      <option value="">-- Chọn bài học --</option>
                      {allLessons.map((l) => (
                        <option key={l._id} value={l._id}>
                          Book {l.bookNumber} | {l.unitTitle} &gt; {l.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Game Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Thể loại trò chơi <span className="text-rose-800">*</span>
                    </label>
                    <select
                      value={formData.activityType}
                      onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                      required
                    >
                      {Object.values(GAME_TYPES).map((meta) => (
                        <option key={meta.code} value={meta.code}>
                          {meta.icon} {meta.label} ({meta.code})
                        </option>
                      ))}
                    </select>
                    {GAME_TYPES[formData.activityType] && (
                      <p className="text-[11px] text-slate-600 mt-1 italic">
                        {GAME_TYPES[formData.activityType].description}
                      </p>
                    )}
                  </div>

                  {/* Title & Vietnamese Title */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tên trò chơi (English) <span className="text-rose-800">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="VD: Listen & Choose: School Objects"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tên tiếng Việt
                      </label>
                      <input
                        type="text"
                        value={formData.vietnameseTitle}
                        onChange={(e) => setFormData({ ...formData, vietnameseTitle: e.target.value })}
                        placeholder="VD: Nghe và Chọn: Đồ dùng học tập"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Lời dẫn / Hướng dẫn bé chơi
                    </label>
                    <input
                      type="text"
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="VD: Listen and tap the correct picture!"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Age Group & Difficulty */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Độ tuổi mục tiêu
                      </label>
                      <select
                        value={formData.ageGroupCode}
                        onChange={(e) => setFormData({ ...formData, ageGroupCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="3-4">3–4 Tuổi (Mầm)</option>
                        <option value="4-5">4–5 Tuổi (Chồi)</option>
                        <option value="5-6">5–6 Tuổi (Lá)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Độ khó (1 - 3 sao)
                      </label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value={1}>★ Cấp độ 1 (Dễ)</option>
                        <option value={2}>★★ Cấp độ 2 (Vừa)</option>
                        <option value={3}>★★★ Cấp độ 3 (Thử thách)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Trạng thái hiển thị
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ACTIVE">Hoạt động (Active)</option>
                        <option value="INACTIVE">Tạm ẩn (Inactive)</option>
                      </select>
                    </div>
                  </div>

                  {/* Points & Time limit */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Điểm mỗi câu đúng
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.pointsPerQuestion}
                        onChange={(e) => setFormData({ ...formData, pointsPerQuestion: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Thời gian giới hạn (0 = không giới hạn giây)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={formData.timeLimit}
                        onChange={(e) => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-inherit text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'questions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600">
                      Danh sách các câu đố / thử thách trong trò chơi này:
                    </p>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Thêm câu hỏi</span>
                    </button>
                  </div>

                  {formData.questions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-indigo-800 uppercase tracking-wider">
                          Câu {qIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="p-1 rounded-lg text-slate-600 hover:text-rose-800 transition-colors cursor-pointer"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Prompt Question */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Tiêu đề câu hỏi / Lời yêu cầu (Prompt)
                          </label>
                          <input
                            type="text"
                            value={q.promptText}
                            onChange={(e) => updateQuestion(qIdx, 'promptText', e.target.value)}
                            placeholder="VD: Where is the book?"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Link hình ảnh minh họa (tùy chọn)
                          </label>
                          <input
                            type="text"
                            value={q.promptImageUrl}
                            onChange={(e) => updateQuestion(qIdx, 'promptImageUrl', e.target.value)}
                            placeholder="https://... hoặc /assets/..."
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Các lựa chọn trả lời (Tích chọn đáp án đúng):</span>
                          <button
                            type="button"
                            onClick={() => addOption(qIdx)}
                            className="text-indigo-800 hover:text-indigo-800 font-bold cursor-pointer"
                          >
                            + Thêm lựa chọn
                          </button>
                        </div>

                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                                opt.isCorrect
                                  ? 'bg-emerald-50 border-emerald-500/40'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setCorrectOption(qIdx, optIdx)}
                                className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                                  opt.isCorrect
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                }`}
                                title="Đánh dấu đây là đáp án đúng"
                              >
                                {opt.isCorrect ? <Check size={14} /> : `${optIdx + 1}`}
                              </button>

                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const updatedOpts = [...q.options];
                                  updatedOpts[optIdx].text = e.target.value;
                                  updateQuestion(qIdx, 'options', updatedOpts);
                                  if (opt.isCorrect) {
                                    updateQuestion(qIdx, 'correctAnswer', e.target.value);
                                  }
                                }}
                                placeholder="Tiếng Anh (VD: Book)"
                                className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                              />

                              <input
                                type="text"
                                value={opt.vietnameseText || ''}
                                onChange={(e) => {
                                  const updatedOpts = [...q.options];
                                  updatedOpts[optIdx].vietnameseText = e.target.value;
                                  updateQuestion(qIdx, 'options', updatedOpts);
                                }}
                                placeholder="Tiếng Việt (VD: Quyển sách)"
                                className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                              />

                              <input
                                type="text"
                                value={opt.imageUrl || ''}
                                onChange={(e) => {
                                  const updatedOpts = [...q.options];
                                  updatedOpts[optIdx].imageUrl = e.target.value;
                                  updateQuestion(qIdx, 'options', updatedOpts);
                                }}
                                placeholder="Link ảnh URL"
                                className="w-36 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-inherit text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                              />

                              <button
                                type="button"
                                onClick={() => removeOption(qIdx, optIdx)}
                                className="p-1 rounded text-slate-600 hover:text-rose-800 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs  transition-all cursor-pointer"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{modalMode === 'create' ? 'Lưu Trò Chơi Mới' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────────── */}
      {deleteModalOpen && deletingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-3 text-rose-800">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-base font-black text-inherit">Xác nhận xóa trò chơi</h3>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Bạn có chắc chắn muốn xóa trò chơi <strong className="text-rose-800">"{deletingActivity.title}"</strong> không? Hành động này sẽ gỡ bỏ hoạt động tương tác này khỏi tiến trình học của các bé.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold  transition-all cursor-pointer"
              >
                {deleting && <RefreshCw size={14} className="animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGamesPage;
