import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Volume2,
  Gamepad2
} from 'lucide-react';
import { adminApi } from '../../../services/api';

interface CurriculumTabProps {
  onNotify: (msg: string) => void;
}

export const CurriculumTab: React.FC<CurriculumTabProps> = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [curriculumTree, setCurriculumTree] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedBookNum, setSelectedBookNum] = useState<number>(1);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeepCurriculum();
  }, []);

  const fetchDeepCurriculum = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDeepCurriculum();
      if (res.success) {
        setCurriculumTree(res.data);
        setSummary(res.summary);
        // Expand first unit by default
        const book1 = res.data.find((b: any) => b.bookNumber === 1);
        if (book1 && book1.units && book1.units.length > 0) {
          setExpandedUnitId(book1.units[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load deep curriculum:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLesson = async (lessonId: string, _currentStatus: string) => {
    try {
      const res = await adminApi.toggleLessonStatus(lessonId);
      if (res.success) {
        onNotify(res.message);
        fetchDeepCurriculum();
      }
    } catch (err: any) {
      alert(err.message || 'Thay đổi trạng thái bài học thất bại');
    }
  };

  const currentBook = curriculumTree.find((b) => b.bookNumber === selectedBookNum);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Summary Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Kho Giáo Trình & Bài Học Chuẩn Cambridge</span>
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Tổng cộng: <b>3</b> Sách Giáo Trình • <b>{summary?.totalUnits ?? 27}</b> Units • <b>{summary?.totalLessons ?? 0}</b> Bài học tương tác • <b>{summary?.totalActivities ?? 0}</b> Trò chơi
          </p>
        </div>

        {/* Book Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          {[
            { num: 1, label: 'Sách 1 (3–4T Mầm)', color: 'text-amber-700 bg-white shadow-xs' },
            { num: 2, label: 'Sách 2 (4–5T Chồi)', color: 'text-emerald-700 bg-white shadow-xs' },
            { num: 3, label: 'Sách 3 (5–6T Lá)', color: 'text-sky-700 bg-white shadow-xs' }
          ].map((b) => (
            <button
              key={b.num}
              onClick={() => {
                setSelectedBookNum(b.num);
                const book = curriculumTree.find((item) => item.bookNumber === b.num);
                if (book && book.units && book.units.length > 0) {
                  setExpandedUnitId(book.units[0]._id);
                }
              }}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedBookNum === b.num ? b.color : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Đang tải toàn bộ cấu trúc giáo trình 3 cấp độ…
        </div>
      ) : !currentBook ? (
        <div className="py-16 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
          Chưa có dữ liệu cho Sách {selectedBookNum}.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Units Accordion */}
          {currentBook.units?.map((unit: any) => {
            const isExpanded = expandedUnitId === unit._id;
            const lessonCount = unit.lessons?.length || 0;

            return (
              <div
                key={unit._id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all"
              >
                {/* Unit Header Bar */}
                <div
                  onClick={() => setExpandedUnitId(isExpanded ? null : unit._id)}
                  className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors ${
                    isExpanded ? 'bg-indigo-50/50 border-b border-slate-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      U{unit.unitNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-700 uppercase">
                          Unit {unit.unitNumber} • {unit.storyTitle || 'Chủ đề tương tác'}
                        </span>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                          {lessonCount} bài học
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                        "{unit.bigQuestion}"
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                      {isExpanded ? 'Thu gọn' : 'Xem bài học'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Unit Expanded Body: Lessons and Activities */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50/50 space-y-4">
                    {/* Unit Educational Metadata Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {unit.concept && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-xl font-bold">
                          💡 Khái niệm: {unit.concept}
                        </span>
                      )}
                      {unit.values && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl font-bold">
                          🌱 Giá trị đạo đức: {unit.values}
                        </span>
                      )}
                      {unit.languagePatterns && unit.languagePatterns.length > 0 && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl font-bold">
                          💬 Mẫu câu: {unit.languagePatterns.slice(0, 2).join('; ')}
                        </span>
                      )}
                    </div>

                    {/* Lessons Grid */}
                    {unit.lessons && unit.lessons.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                        {unit.lessons.map((lesson: any, lIdx: number) => {
                          const isActive = lesson.status === 'ACTIVE';

                          return (
                            <div
                              key={lesson._id}
                              className={`p-4 rounded-2xl border transition-all ${
                                isActive
                                  ? 'bg-white border-slate-200 shadow-2xs hover:border-indigo-300'
                                  : 'bg-slate-100/70 border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                    Bài {lIdx + 1} • {lesson.topic?.title || 'Topic'}
                                  </span>
                                  <h4 className="font-black text-slate-900 text-sm">
                                    {lesson.title}
                                  </h4>
                                  {lesson.vietnameseTitle && (
                                    <p className="text-xs font-semibold text-slate-500">
                                      ({lesson.vietnameseTitle})
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleLesson(lesson._id, lesson.status)}
                                  className={`p-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                                    isActive
                                      ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                      : 'border-slate-300 text-slate-500 hover:bg-white'
                                  }`}
                                  title={isActive ? 'Bài học đang mở, bấm để ẩn' : 'Bài học đang ẩn, bấm để mở'}
                                >
                                  {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                                <span className="flex items-center gap-1 font-bold text-slate-700">
                                  <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                                  {lesson.vocabularyCount ?? 0} từ vựng
                                </span>
                                <span className="flex items-center gap-1 font-bold text-slate-700">
                                  <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
                                  {lesson.activityCount ?? 0} trò chơi
                                </span>
                                <span className="ml-auto text-[11px] font-mono text-slate-400">
                                  {lesson.estimatedDuration ?? 10} phút
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs font-bold bg-white rounded-xl border border-dashed border-slate-200">
                        Chưa có bài học nào được liên kết vào Unit {unit.unitNumber}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
