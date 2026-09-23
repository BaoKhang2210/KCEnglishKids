import React, { useEffect, useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Star,
  LogOut,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  PlusCircle,
  FileText,
  Trash2,
  ChevronRight,
  Sparkles,
  Award,
  AlertCircle,
  X,
  Tv,
  Volume2,
  Play,
  Presentation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { teacherApi, lessonsApi } from '../../services/api';
import { playWordAudio, sfx } from '../../utils/audio';

type TabType = 'TEACHING' | 'ROSTER' | 'ASSIGNMENTS' | 'NOTES';

const NOTE_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  INTEREST: { label: 'Hứng thú cao', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' },
  VOCABULARY: { label: 'Ghi nhớ từ vựng tốt', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' },
  PARTICIPATION: { label: 'Tương tác tích cực', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' },
  REINFORCEMENT: { label: 'Cần củng cố thêm', color: 'text-rose-700', bg: 'bg-rose-100 border-rose-300' },
  GENERAL: { label: 'Ghi chú chung', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-300' }
};

export const TeacherDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab navigation (Default to TEACHING)
  const [activeTab, setActiveTab] = useState<TabType>('TEACHING');

  // Teaching State
  const [teachingLessonId, setTeachingLessonId] = useState<string>('');
  const [teachingLesson, setTeachingLesson] = useState<any>(null);
  const [loadingTeachingLesson, setLoadingTeachingLesson] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // Classes & Students
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Student Drilldown Modal
  const [drilldownStudentId, setDrilldownStudentId] = useState<string | null>(null);
  const [studentOverview, setStudentOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Assignments State
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentFilterStatus, setAssignmentFilterStatus] = useState<string>('');
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [curriculumTree, setCurriculumTree] = useState<any[]>([]);

  // Form: Create Assignment
  const [assignClassId, setAssignClassId] = useState('');
  const [assignType, setAssignType] = useState<'CLASS' | 'STUDENT'>('CLASS');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignUnitId, setAssignUnitId] = useState('');
  const [assignLessonId, setAssignLessonId] = useState('');
  const [assignActivityId, setAssignActivityId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  // Form: Create Note
  const [noteStudentId, setNoteStudentId] = useState('');
  const [noteType, setNoteType] = useState('GENERAL');
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Unique IDs for form controls
  const classFilterSelectId = useId();
  const teachingLessonSelectId = useId();
  const assignClassSelectId = useId();
  const assignTargetSelectId = useId();
  const assignStudentSelectId = useId();
  const assignUnitSelectId = useId();
  const assignLessonSelectId = useId();
  const assignActivitySelectId = useId();
  const assignDueDateInputId = useId();
  const assignInstructionsTextareaId = useId();
  const noteStudentSelectId = useId();
  const noteTypeSelectId = useId();
  const noteContentTextareaId = useId();

  const loadTeachingLesson = async (lessonId: string) => {
    if (!lessonId) return;
    try {
      setLoadingTeachingLesson(true);
      const res = await lessonsApi.getLessonById(lessonId);
      if (res.success && res.data) {
        setTeachingLesson(res.data);
      }
    } catch (err) {
      console.error('Failed to load teaching lesson:', err);
    } finally {
      setLoadingTeachingLesson(false);
    }
  };

  const handlePlayWord = async (word: string, audioUrl?: string) => {
    if (playingWord) return;
    setPlayingWord(word);
    sfx.playPop();
    try {
      await playWordAudio(word, audioUrl);
    } catch (e) {
      console.warn('Audio play error', e);
    } finally {
      setPlayingWord(null);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      navigate('/teacher/login');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const res = await teacherApi.getClasses();
        if (res.success && res.data) {
          setClasses(res.data);
          if (res.data.length > 0) {
            const firstId = res.data[0]._id;
            setSelectedClassId(firstId);
            setAssignClassId(firstId);
            const detailRes = await teacherApi.getClassDetail(firstId);
            if (detailRes.success) setSelectedClass(detailRes.data);
          }
        }

        // Fetch curriculum tree for assignment selector & classroom teaching
        const curRes = await teacherApi.getCurriculumOptions();
        if (curRes.success && curRes.data && curRes.data.length > 0) {
          setCurriculumTree(curRes.data);
          // Find active teaching lesson
          let targetLessonId = '';
          for (const u of curRes.data) {
            const petL = u.lessons?.find((l: any) =>
              l.title?.toLowerCase().includes('pet') || l.title?.toLowerCase().includes('animal')
            );
            if (petL) {
              targetLessonId = petL._id;
              break;
            }
          }
          if (!targetLessonId && curRes.data[0]?.lessons?.[0]) {
            targetLessonId = curRes.data[0].lessons[0]._id;
          }
          if (targetLessonId) {
            setTeachingLessonId(targetLessonId);
            loadTeachingLesson(targetLessonId);
          }
        }

        // Fetch assignments
        loadAssignments();
      } catch (err) {
        console.error('Failed to initialize teacher dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  // Load assignments
  const loadAssignments = async (status?: string) => {
    try {
      const res = await teacherApi.getAssignments(undefined, status || undefined);
      if (res.success) setAssignments(res.data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    }
  };

  // Switch class
  const handleSelectClass = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const detailRes = await teacherApi.getClassDetail(classId);
      if (detailRes.success) setSelectedClass(detailRes.data);
    } catch (err) {
      console.error('Failed to switch class:', err);
    }
  };

  // Open student drilldown
  const handleOpenStudentDetail = async (studentId: string) => {
    setDrilldownStudentId(studentId);
    setLoadingOverview(true);
    try {
      const res = await teacherApi.getStudentOverview(studentId);
      if (res.success) setStudentOverview(res.data);
    } catch (err) {
      console.error('Failed to load student overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Create Assignment submit
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignClassId || !assignLessonId) {
      alert('Vui lòng chọn lớp học và bài học.');
      return;
    }

    try {
      setSubmittingAssignment(true);
      const res = await teacherApi.createAssignment({
        classRoomId: assignClassId,
        assignedToType: assignType,
        studentId: assignType === 'STUDENT' ? assignStudentId : undefined,
        lessonId: assignLessonId,
        activityId: assignActivityId || undefined,
        dueDate: assignDueDate || undefined,
        instructions: assignInstructions
      });

      if (res.success) {
        setShowCreateAssignmentModal(false);
        setAssignInstructions('');
        setAssignDueDate('');
        setAssignLessonId('');
        setAssignActivityId('');
        loadAssignments();
        alert('Đã giao bài tập thành công!');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi giao bài tập');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // Update assignment status
  const handleUpdateAssignmentStatus = async (id: string, newStatus: string) => {
    try {
      await teacherApi.updateAssignmentStatus(id, newStatus);
      loadAssignments(assignmentFilterStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete assignment
  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xoá bài tập này?')) return;
    try {
      await teacherApi.deleteAssignment(id);
      loadAssignments(assignmentFilterStatus);
    } catch (err) {
      console.error('Failed to delete assignment:', err);
    }
  };

  // Create Pedagogical Note submit
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteStudentId || !noteContent.trim()) {
      alert('Vui lòng chọn học sinh và nhập nội dung ghi chú.');
      return;
    }

    try {
      setSubmittingNote(true);
      const res = await teacherApi.createTeacherNote({
        studentId: noteStudentId,
        noteType,
        content: noteContent.trim()
      });

      if (res.success) {
        setNoteContent('');
        alert('Đã lưu ghi chú sư phạm thành công!');
        // Refresh drilldown if viewing this student
        if (drilldownStudentId === noteStudentId) {
          handleOpenStudentDetail(noteStudentId);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu ghi chú');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/teacher/login');
  };

  // Find lessons for selected unit in assignment modal
  const selectedUnitLessons = curriculumTree.find(u => u._id === assignUnitId)?.lessons || [];
  const selectedLessonActivities = selectedUnitLessons.find((l: any) => l._id === assignLessonId)?.activities || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black text-xl shadow-md">
            T
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              KCEnglishKids • Cổng Giáo Viên
            </h1>
            <p className="text-xs font-bold text-slate-400">
              Quản lý lớp học, giao bài & theo dõi phát triển học sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-xl transition-colors hidden sm:inline-block"
          >
            Chuyển sang Cổng Trẻ Em 🦁
          </Link>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="text-right hidden sm:block">
              <span className="text-sm font-black text-slate-800 block">{user?.name}</span>
              <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Giáo viên</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-6 flex-1 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab('TEACHING')}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'TEACHING'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Nội dung bài dạy hôm nay 📺</span>
          </button>

          <button
            onClick={() => setActiveTab('ROSTER')}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ROSTER'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Lớp học & Học sinh</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ASSIGNMENTS');
              loadAssignments();
            }}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ASSIGNMENTS'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Giao bài tập</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
              {assignments.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('NOTES');
              if (selectedClass?.students?.[0]?._id) {
                setNoteStudentId(selectedClass.students[0]._id);
              }
            }}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'NOTES'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Ghi chú sư phạm</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {/* ================= TAB 0: TEACHING (CLASSROOM PRESENTATION) ================= */}
            {activeTab === 'TEACHING' && (
              <div className="space-y-6">
                {/* Classroom Control & Lesson Selector Header */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                        <Presentation className="w-3.5 h-3.5" />
                        Chế độ Trình Chiếu Giảng Dạy Lớp Học
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                      Nội dung bài dạy trên lớp
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Trình chiếu thẻ từ vựng chuẩn, âm thanh phát âm và trò chơi tương tác trực quan cho cả lớp
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                    <label htmlFor={teachingLessonSelectId} className="text-xs font-bold text-slate-600 whitespace-nowrap">
                      Chọn bài dạy:
                    </label>
                    <select
                      id={teachingLessonSelectId}
                      value={teachingLessonId}
                      onChange={(e) => {
                        setTeachingLessonId(e.target.value);
                        loadTeachingLesson(e.target.value);
                      }}
                      className="w-full sm:w-auto max-w-md bg-slate-50 hover:bg-slate-100 font-bold text-sm text-slate-800 px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs transition-colors"
                    >
                      {curriculumTree.map((unit: any) => (
                        <optgroup key={unit._id} label={`Unit ${unit.unitNumber}: ${unit.title}`}>
                          {unit.lessons?.map((les: any) => (
                            <option key={les._id} value={les._id}>
                              Lesson {les.lessonNumber}: {les.title}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingTeachingLesson ? (
                  <div className="flex justify-center py-20 bg-white rounded-3xl border border-slate-200">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !teachingLesson ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-600">Chưa tải được nội dung bài học.</p>
                    <p className="text-xs text-slate-400 mt-1">Vui lòng chọn một bài học từ danh sách phía trên.</p>
                  </div>
                ) : (
                  <>
                    {/* Hero Banner: Lesson Details */}
                    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-black bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full uppercase tracking-wider">
                            Unit {teachingLesson.curriculumUnits?.[0]?.unitNumber || 1} • {teachingLesson.topic?.englishName || 'Curriculum'}
                          </span>
                          {teachingLesson.topic?.vietnameseName && (
                            <span className="text-xs font-bold bg-black/20 px-3 py-1 rounded-full">
                              {teachingLesson.topic.vietnameseName}
                            </span>
                          )}
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                          Lesson {teachingLesson.lessonNumber}: {teachingLesson.title}
                        </h1>
                        {teachingLesson.vietnameseTitle && (
                          <p className="text-amber-100 text-lg font-bold mt-1">
                            "{teachingLesson.vietnameseTitle}"
                          </p>
                        )}

                        {teachingLesson.curriculumUnits?.[0]?.bigQuestion && (
                          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/30">
                            <span className="text-lg">❓</span>
                            <span className="text-sm font-bold text-white">
                              Câu hỏi bài học: {teachingLesson.curriculumUnits[0].bigQuestion}
                            </span>
                          </div>
                        )}

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            onClick={() => {
                              setActiveTab('ASSIGNMENTS');
                              setAssignLessonId(teachingLesson._id);
                              setShowCreateAssignmentModal(true);
                            }}
                            className="bg-white text-slate-900 hover:bg-amber-50 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4 text-amber-600" />
                            <span>Giao bài này về nhà cho các bé 🚀</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Flashcards Trình Chiếu Trực Quan */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900">
                              Thẻ từ vựng trình chiếu lớp học (Classroom Flashcards)
                            </h3>
                            <p className="text-xs font-semibold text-slate-500">
                              Bấm vào loa để phát âm mẫu chuẩn cho học sinh nghe và nhắc lại theo lớp
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                          {teachingLesson.vocabularyItems?.length || 0} từ vựng
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teachingLesson.vocabularyItems?.map((v: any, index: number) => (
                          <div
                            key={v._id || index}
                            className="bg-white rounded-3xl p-5 border-2 border-slate-100 hover:border-amber-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group relative overflow-hidden"
                          >
                            <div className="w-full h-44 rounded-2xl bg-amber-50/40 flex items-center justify-center p-3 relative overflow-hidden group-hover:bg-amber-50 transition-colors">
                              {v.imageUrl ? (
                                <img
                                  src={v.imageUrl}
                                  alt={v.english}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <span className="text-5xl">🎨</span>
                              )}
                            </div>

                            <div className="mt-4 w-full flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="text-3xl font-black text-slate-900 tracking-wide">
                                  {v.english}
                                </h4>
                                {v.pronunciation && (
                                  <span className="inline-block mt-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-mono border border-amber-200">
                                    {v.pronunciation}
                                  </span>
                                )}
                                <p className="text-base font-bold text-slate-600 mt-1">
                                  {v.vietnamese}
                                </p>

                                {v.exampleSentence && (
                                  <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-left">
                                    <p className="text-xs font-bold text-slate-700">
                                      "{v.exampleSentence}"
                                    </p>
                                    {v.exampleSentenceVietnamese && (
                                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                        {v.exampleSentenceVietnamese}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => handlePlayWord(v.english, v.audioUrl)}
                                disabled={playingWord === v.english}
                                className={`mt-5 w-full py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs ${
                                  playingWord === v.english
                                    ? 'bg-amber-500 text-white scale-98 shadow-md ring-4 ring-amber-200'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                }`}
                              >
                                <Volume2 className={`w-5 h-5 ${playingWord === v.english ? 'animate-bounce' : ''}`} />
                                <span>{playingWord === v.english ? 'Đang phát âm...' : 'Nghe phát âm chuẩn (Audio)'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Trò Chơi Tương Tác Cùng Lớp */}
                    {teachingLesson.activities && teachingLesson.activities.length > 0 && (
                      <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                            <Play className="w-4 h-4 fill-emerald-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900">
                              Trò chơi tương tác lớp học (Classroom Mini-Games)
                            </h3>
                            <p className="text-xs font-semibold text-slate-500">
                              Mở trò chơi để cả lớp cùng tương tác, trả lời và ghi nhớ kiến thức
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {teachingLesson.activities.map((act: any) => (
                            <div
                              key={act._id}
                              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {act.activityType || 'MINI-GAME'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-400">
                                    {act.questionCount || 5} câu hỏi
                                  </span>
                                </div>
                                <h4 className="text-lg font-black text-slate-900">
                                  {act.title}
                                </h4>
                                {act.vietnameseTitle && (
                                  <p className="text-xs font-bold text-slate-500 mt-0.5">
                                    {act.vietnameseTitle}
                                  </p>
                                )}
                              </div>

                              <a
                                href={`/activities/${act._id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Mở trò chơi trên lớp ↗</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* If not TEACHING, check classes */}
            {activeTab !== 'TEACHING' && classes.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-black text-slate-800">Chưa có phân công lớp</h3>
                <p className="font-semibold text-slate-500 text-sm mt-1">
                  Bạn chưa được phân công phụ trách lớp học nào. Vui lòng liên hệ Quản trị viên (Admin).
                </p>
              </div>
            ) : (
              <>
            {/* ================= TAB 1: ROSTER & STUDENTS ================= */}
            {activeTab === 'ROSTER' && (
              <div className="space-y-6">
                {/* Classroom Selector Banner */}
                <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                        Lớp phụ trách
                      </span>
                      {classes.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <label htmlFor={classFilterSelectId} className="text-xs font-semibold text-teal-100">Chọn:</label>
                          <select
                            id={classFilterSelectId}
                            value={selectedClassId}
                            onChange={e => handleSelectClass(e.target.value)}
                            className="bg-white/20 text-white font-bold text-xs rounded-xl px-2.5 py-1 border border-white/30 focus:outline-none cursor-pointer"
                          >
                            {classes.map(c => (
                              <option key={c._id} value={c._id} className="text-slate-800">
                                {c.name} ({c.ageGroupCode})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">
                      {selectedClass?.name || 'My Class'}
                    </h2>
                    <p className="text-teal-100 text-sm font-bold mt-1">
                      Năm học {selectedClass?.academicYear || '2026-2027'} • Nhóm tuổi {selectedClass?.ageGroupCode || '3-4'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-teal-200" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-teal-200 block">Sĩ số lớp</span>
                      <span className="font-black text-2xl">
                        {selectedClass?.students?.length || 0} Học sinh
                      </span>
                    </div>
                  </div>
                </div>

                {/* Students Cards Grid */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-600" />
                      <span>Danh sách học sinh trong lớp</span>
                    </h3>
                    <button
                      onClick={() => {
                        setActiveTab('NOTES');
                        if (selectedClass?.students?.[0]?._id) {
                          setNoteStudentId(selectedClass.students[0]._id);
                        }
                      }}
                      className="text-xs font-black text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Viết ghi chú</span>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedClass?.students?.map((student: any) => (
                      <div
                        key={student._id}
                        className="border-2 border-slate-100 bg-slate-50/50 hover:bg-white hover:border-teal-400 rounded-3xl p-5 flex items-center justify-between transition-all group shadow-xs hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 p-1 flex items-center justify-center shadow-xs">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt={student.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-3xl">🦁</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-black text-lg text-slate-900 group-hover:text-teal-700 transition-colors">
                              {student.name}
                            </h4>
                            <p className="text-xs font-semibold text-slate-400">
                              Mã PIN: **** • Tuổi: {student.ageGroupCode || '3-4'}
                            </p>
                            {student.contact && (
                              <p className="text-xs font-bold text-slate-500 mt-0.5">
                                Phụ huynh: {student.contact}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1 font-black text-amber-500 text-lg bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                            <Star className="w-4 h-4 fill-amber-400" />
                            <span>{student.stats?.totalStars || 0}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">
                            {student.stats?.completedLessons || 0} bài xong
                          </span>
                          <button
                            onClick={() => handleOpenStudentDetail(student._id)}
                            className="mt-1 text-xs font-black text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Chi tiết</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: ASSIGNMENTS ================= */}
            {activeTab === 'ASSIGNMENTS' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Quản lý bài tập</h2>
                    <p className="text-xs font-semibold text-slate-500">
                      Giao bài học/hoạt động cho cả lớp hoặc từng học sinh cần rèn luyện thêm
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Filter */}
                    <select
                      value={assignmentFilterStatus}
                      onChange={e => {
                        setAssignmentFilterStatus(e.target.value);
                        loadAssignments(e.target.value);
                      }}
                      className="bg-slate-100 font-bold text-xs text-slate-700 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="ASSIGNED">Đã giao (ASSIGNED)</option>
                      <option value="IN_PROGRESS">Đang học (IN_PROGRESS)</option>
                      <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
                    </select>

                    <button
                      onClick={() => setShowCreateAssignmentModal(true)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Giao bài tập mới</span>
                    </button>
                  </div>
                </div>

                {assignments.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-600">Chưa có bài tập nào được giao.</p>
                    <p className="text-xs text-slate-400 mt-1">Bấm "+ Giao bài tập mới" để bắt đầu giao bài cho học sinh.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {assignments.map(item => (
                      <div
                        key={item._id}
                        className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-md border border-teal-200">
                              Lớp: {item.classRoom?.name || 'N/A'}
                            </span>
                            {item.assignedToType === 'CLASS' ? (
                              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
                                Cả lớp
                              </span>
                            ) : (
                              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md border border-purple-200">
                                Cá nhân: {item.student?.name || 'Học sinh'}
                              </span>
                            )}
                            <span
                              className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                                item.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <h4 className="text-lg font-black text-slate-900">
                            {item.lesson?.title || 'Bài học'}
                          </h4>

                          {item.activity && (
                            <p className="text-xs font-bold text-slate-500">
                              Hoạt động cụ thể: <span className="text-teal-700">{item.activity.title}</span> ({item.activity.activityType})
                            </p>
                          )}

                          {item.instructions && (
                            <p className="text-xs font-medium text-slate-600 italic">
                              "{item.instructions}"
                            </p>
                          )}

                          {item.dueDate && (
                            <div className="flex items-center gap-1 text-xs font-bold text-rose-600 pt-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Hạn chót: {new Date(item.dueDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={item.status}
                            onChange={e => handleUpdateAssignmentStatus(item._id, e.target.value)}
                            className="bg-slate-100 font-bold text-xs text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
                          >
                            <option value="ASSIGNED">Đã giao</option>
                            <option value="IN_PROGRESS">Đang làm</option>
                            <option value="COMPLETED">Đã hoàn thành</option>
                          </select>

                          <button
                            onClick={() => handleDeleteAssignment(item._id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Xoá bài tập"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: PEDAGOGICAL NOTES ================= */}
            {activeTab === 'NOTES' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Ghi chú sư phạm định tính</h3>
                      <p className="text-xs font-semibold text-slate-500">
                        Ghi nhận sự tiến bộ, mức độ hứng thú, khả năng tiếp thu từ vựng và những phần cần củng cố của trẻ
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateNote} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={noteStudentSelectId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                          Học sinh *
                        </label>
                        <select
                          id={noteStudentSelectId}
                          value={noteStudentId}
                          onChange={e => setNoteStudentId(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                        >
                          <option value="">-- Chọn học sinh --</option>
                          {selectedClass?.students?.map((s: any) => (
                            <option key={s._id} value={s._id}>
                              {s.name} ({s.ageGroupCode || '3-4'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={noteTypeSelectId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                          Loại ghi chú *
                        </label>
                        <select
                          id={noteTypeSelectId}
                          value={noteType}
                          onChange={e => setNoteType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                        >
                          <option value="INTEREST">Hứng thú cao (Interest)</option>
                          <option value="VOCABULARY">Ghi nhớ từ vựng tốt (Vocabulary Mastery)</option>
                          <option value="PARTICIPATION">Tương tác tích cực (Participation)</option>
                          <option value="REINFORCEMENT">Cần củng cố thêm (Needs Reinforcement)</option>
                          <option value="GENERAL">Ghi chú chung (General)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor={noteContentTextareaId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Nội dung nhận xét *
                      </label>
                      <textarea
                        id={noteContentTextareaId}
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        placeholder="Ví dụ: Bé phát âm rất rõ các từ chủ đề Animals, chủ động nhắc lại theo âm thanh và rất hào hứng khi đạt 3 sao..."
                        rows={3}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-medium text-sm focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingNote}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-black text-sm px-6 py-2.5 rounded-2xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                      >
                        {submittingNote ? 'Đang lưu...' : 'Lưu ghi chú sư phạm'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ================= MODAL: STUDENT DRILLDOWN ================= */}
      {drilldownStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl my-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setDrilldownStudentId(null);
                setStudentOverview(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingOverview ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : studentOverview ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 p-1 flex items-center justify-center shadow-xs">
                    {studentOverview.student?.avatarUrl ? (
                      <img
                        src={studentOverview.student.avatarUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl">🦁</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">
                      {studentOverview.student?.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">
                      Mã học sinh: {studentOverview.student?._id} • Tuổi: {studentOverview.student?.ageGroupCode || '3-4'}
                    </p>
                    {studentOverview.student?.contact && (
                      <p className="text-xs font-bold text-slate-500">
                        Liên hệ phụ huynh: {studentOverview.student.contact}
                      </p>
                    )}
                  </div>
                </div>

                {/* Performance Stats KPI */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-400 mx-auto mb-1" />
                    <span className="text-xl font-black text-amber-600 block">
                      {studentOverview.stats?.totalStars || 0}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">Ngôi sao tích luỹ</span>
                  </div>

                  <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <span className="text-xl font-black text-emerald-600 block">
                      {studentOverview.stats?.completedLessons || 0}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">Bài học hoàn thành</span>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-3 border border-blue-200">
                    <Award className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <span className="text-xl font-black text-blue-600 block">
                      {studentOverview.stats?.totalActivitiesPlayed || 0}
                    </span>
                    <span className="text-[11px] font-bold text-blue-700">Lượt hoạt động</span>
                  </div>
                </div>

                {/* Pedagogical Notes on this student */}
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Ghi chú sư phạm đã lưu ({studentOverview.notes?.length || 0})</span>
                  </h4>

                  {studentOverview.notes?.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center">
                      Chưa có ghi chú sư phạm nào cho học sinh này.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {studentOverview.notes?.map((n: any) => {
                        const meta = NOTE_TYPE_LABELS[n.noteType] || NOTE_TYPE_LABELS.GENERAL;
                        return (
                          <div key={n._id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border ${meta.bg} ${meta.color}`}>
                                {meta.label}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-700">{n.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent Activities */}
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>Lịch sử chơi hoạt động gần đây</span>
                  </h4>

                  {studentOverview.recentActivities?.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center">
                      Bé chưa tham gia hoạt động nào.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {studentOverview.recentActivities?.map((act: any) => (
                        <div
                          key={act._id}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-black text-slate-800 block">
                              {act.activity?.title || 'Hoạt động'}
                            </span>
                            <span className="font-semibold text-slate-400">
                              Bài: {act.lesson?.title || 'N/A'} • Loại: {act.activity?.activityType || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-black text-amber-500">
                            <Star className="w-4 h-4 fill-amber-400" />
                            <span>{act.starsAwarded || 0} sao</span>
                            <span className="text-slate-400 font-bold ml-2">({act.score}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE ASSIGNMENT ================= */}
      {showCreateAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl my-8 relative">
            <button
              onClick={() => setShowCreateAssignmentModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-teal-600" />
              <span>Giao bài tập mới</span>
            </h3>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label htmlFor={assignClassSelectId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Lớp học *
                </label>
                <select
                  id={assignClassSelectId}
                  value={assignClassId}
                  onChange={e => setAssignClassId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.ageGroupCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={assignTargetSelectId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Đối tượng giao *
                  </label>
                  <select
                    id={assignTargetSelectId}
                    value={assignType}
                    onChange={e => setAssignType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="CLASS">Cả lớp</option>
                    <option value="STUDENT">Từng học sinh</option>
                  </select>
                </div>

                {assignType === 'STUDENT' && (
                  <div>
                    <label htmlFor={assignStudentSelectId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                      Chọn học sinh *
                    </label>
                    <select
                      id={assignStudentSelectId}
                      value={assignStudentId}
                      onChange={e => setAssignStudentId(e.target.value)}
                      required={assignType === 'STUDENT'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="">-- Chọn bé --</option>
                      {selectedClass?.students?.map((s: any) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Curriculum Selector */}
              <div>
                <label htmlFor={assignUnitSelectId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                  1. Chọn Unit giáo trình *
                </label>
                <select
                  id={assignUnitSelectId}
                  value={assignUnitId}
                  onChange={e => {
                    setAssignUnitId(e.target.value);
                    setAssignLessonId('');
                    setAssignActivityId('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="">-- Chọn Unit --</option>
                  {curriculumTree.map(u => (
                    <option key={u._id} value={u._id}>
                      Unit {u.unitNumber}: {u.title} ({u.ageGroupCode})
                    </option>
                  ))}
                </select>
              </div>

              {assignUnitId && (
                <div>
                  <label htmlFor={assignLessonSelectId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                    2. Chọn Bài học (Lesson) *
                  </label>
                  <select
                    id={assignLessonSelectId}
                    value={assignLessonId}
                    onChange={e => {
                      setAssignLessonId(e.target.value);
                      setAssignActivityId('');
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="">-- Chọn Bài học --</option>
                    {selectedUnitLessons.map((l: any) => (
                      <option key={l._id} value={l._id}>
                        Bài {l.lessonNumber}: {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {assignLessonId && selectedLessonActivities.length > 0 && (
                <div>
                  <label htmlFor={assignActivitySelectId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                    3. Hoạt động cụ thể (Tuỳ chọn)
                  </label>
                  <select
                    id={assignActivitySelectId}
                    value={assignActivityId}
                    onChange={e => setAssignActivityId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="">-- Cả bài học (Tất cả hoạt động) --</option>
                    {selectedLessonActivities.map((act: any) => (
                      <option key={act._id} value={act._id}>
                        {act.title} ({act.activityType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={assignDueDateInputId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Hạn nộp (Tuỳ chọn)
                  </label>
                  <input
                    id={assignDueDateInputId}
                    type="date"
                    value={assignDueDate}
                    onChange={e => setAssignDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor={assignInstructionsTextareaId} className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Dặn dò học sinh / Phụ huynh
                  </label>
                  <input
                    id={assignInstructionsTextareaId}
                    type="text"
                    value={assignInstructions}
                    onChange={e => setAssignInstructions(e.target.value)}
                    placeholder="Ví dụ: Bé hãy cố gắng đạt 3 sao nhé!"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-medium text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateAssignmentModal(false)}
                  className="px-5 py-2.5 rounded-2xl font-black text-sm text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submittingAssignment}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-black text-sm px-6 py-2.5 rounded-2xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  {submittingAssignment ? 'Đang tạo...' : 'Xác nhận giao bài'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
