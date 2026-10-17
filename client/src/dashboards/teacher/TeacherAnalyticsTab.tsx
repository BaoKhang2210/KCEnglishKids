import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Award,
  Star,
  Users,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Send,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { teacherApi, parentNotificationApi } from '../../services/api';

export const TeacherAnalyticsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentForNote, setSelectedStudentForNote] = useState<any | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [bonusStars, setBonusStars] = useState(3);
  const [sendingNote, setSendingNote] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [classRes, studentRes] = await Promise.all([
        teacherApi.getClasses(),
        teacherApi.getStudents()
      ]);

      if (classRes.data) {
        setClasses(classRes.data);
      }
      if (studentRes.data) {
        setStudents(studentRes.data);
      }
    } catch (err) {
      console.error('Failed to load teacher analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSendQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForNote || !quickNoteText.trim()) return;

    setSendingNote(true);
    try {
      await parentNotificationApi.sendNotification({
        childId: selectedStudentForNote.student?._id || selectedStudentForNote._id,
        subject: 'Động viên tiến độ học tập từ cô giáo',
        teacherNote: quickNoteText.trim(),
        stars: bonusStars,
        score: selectedStudentForNote.stats?.averageScore || 0,
        templateType: 'PROGRESS_UPDATE'
      });
      showToast(`Đã gửi lời khen và tặng ⭐ ${bonusStars} sao cho bé ${selectedStudentForNote.student?.name || selectedStudentForNote.name}!`);
      setSelectedStudentForNote(null);
      setQuickNoteText('');
      setBonusStars(3);
      loadAnalyticsData();
    } catch (err: any) {
      alert(err.message || 'Gửi nhận xét thất bại');
    } finally {
      setSendingNote(false);
    }
  };

  // Filter students by selected class
  const filteredStudents = students.filter((item) => {
    if (selectedClassId === 'ALL') return true;
    const cid = item.student?.assignedClass?._id || item.student?.assignedClass || item.classroom?._id || item.classroomId;
    return String(cid) === String(selectedClassId);
  });

  // Calculate high performers (Top 5 Leaderboard)
  const sortedByStars = [...filteredStudents].sort((a, b) => {
    const starsA = a.stats?.totalStars ?? 0;
    const starsB = b.stats?.totalStars ?? 0;
    return starsB - starsA;
  });

  const topStudents = sortedByStars.slice(0, 5);

  // Identify students needing attention (Score < 70 or 0 completed lessons)
  const needingAttention = filteredStudents.filter((item) => {
    const score = item.stats?.averageScore ?? 0;
    const completed = item.stats?.completedLessons ?? 0;
    return score < 70 || completed === 0;
  });

  // Overall class averages
  const totalStarsAccumulated = filteredStudents.reduce((sum, item) => sum + (item.stats?.totalStars ?? 0), 0);
  const avgClassScore = filteredStudents.length > 0
    ? Math.round(filteredStudents.reduce((sum, item) => sum + (item.stats?.averageScore ?? 0), 0) / filteredStudents.length)
    : 0;

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Đang tổng hợp báo cáo tiến độ học sinh…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs animate-pop-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner & Class Selector */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
            Trung Tâm Phân Tích Sư Phạm • KCEnglishKids
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-teal-600" />
            <span>Tiến Độ Học Tập & Bảng Xếp Hạng Lớp</span>
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Theo dõi chỉ số chuyên cần, điểm trung bình %, chuỗi ngày học (streak) và phát hiện bé cần hỗ trợ
          </p>
        </div>

        {/* Class Filter Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 pl-2 whitespace-nowrap">Lớp học:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs font-black text-teal-800 bg-transparent outline-none cursor-pointer pr-3"
          >
            <option value="ALL">Tất cả các lớp phụ trách</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.ageGroupCode} tuổi - Sách {c.ageGroupCode === '3-4' ? '1' : c.ageGroupCode === '4-5' ? '2' : '3'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Sĩ số lớp</span>
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Users size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{filteredStudents.length}</div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Học sinh trong danh sách</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Điểm TB toàn lớp</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600">{avgClassScore}%</div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Mức độ tiếp thu bài học</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng sao tích lũy</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <Star size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-500">{totalStarsAccumulated} ⭐</div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Gồm sao học và sao thưởng</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Cần rèn luyện thêm</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600">{needingAttention.length}</div>
          <p className="text-[11px] font-semibold text-rose-600 mt-1">Bé cần cô động viên</p>
        </div>
      </section>

      {/* Main Content Grid: Leaderboard & At-Risk List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Leaderboard (Inspired by Duolingo for Schools) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Bảng Vinh Danh Tuần Này</span>
            </h3>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Top 5 Sao
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {topStudents.length > 0 ? (
              topStudents.map((item, idx) => {
                const st = item.student || item;
                const stats = item.stats || {};
                const streak = st.streak || 1;

                return (
                  <div
                    key={st._id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm w-5 text-center">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </span>
                      <span className="text-2xl">
                        {st.avatar === 'lion' ? '🦁' : st.avatar === 'panda' ? '🐼' : st.avatar === 'rabbit' ? '🐰' : '🦁'}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{st.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{stats.averageScore ?? 0}% TB</span>
                          <span>•</span>
                          <span className="flex items-center text-amber-600 font-bold">
                            <Flame className="w-3 h-3 fill-amber-500" /> {streak} ngày
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-amber-500 text-xs block">
                        {stats.totalStars ?? 0} ⭐
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForNote(item)}
                        className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Khen ngợi
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-bold">
                Chưa có dữ liệu học tập tuần này.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Class Student Progress Table */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <span>Tiến Độ & Năng Lực Của Từng Bé</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {filteredStudents.length} học sinh
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black">
                <tr>
                  <th className="py-3 px-3.5">Học sinh</th>
                  <th className="py-3 px-3.5 text-center">Chuỗi Streak</th>
                  <th className="py-3 px-3.5 text-center">Điểm TB</th>
                  <th className="py-3 px-3.5 text-center">Sao Đạt</th>
                  <th className="py-3 px-3.5 text-center">Đánh giá sư phạm</th>
                  <th className="py-3 px-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredStudents.map((item) => {
                  const st = item.student || item;
                  const stats = item.stats || {};
                  const avg = stats.averageScore ?? 0;
                  const streak = st.streak || 1;

                  return (
                    <tr key={st._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 flex items-center gap-2.5 font-bold text-slate-900">
                        <span className="text-xl">
                          {st.avatar === 'lion' ? '🦁' : st.avatar === 'panda' ? '🐼' : st.avatar === 'rabbit' ? '🐰' : '🦁'}
                        </span>
                        <div>
                          <span>{st.name}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {st.assignedClass?.name || 'Lớp mầm non'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-center font-bold">
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                          <Flame className="w-3 h-3 fill-amber-500" /> {streak} ngày
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center font-black">
                        <span className={avg >= 80 ? 'text-emerald-600' : avg >= 65 ? 'text-amber-600' : 'text-rose-600'}>
                          {avg}%
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center font-black text-amber-500">
                        {stats.totalStars ?? 0} ⭐
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        {avg >= 85 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                            🌟 Xuất sắc
                          </span>
                        ) : avg >= 70 ? (
                          <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                            👍 Tiến bộ tốt
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                            📖 Cần rèn thêm
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForNote(item)}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Nhận xét & Sao
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Parent Notification Modal */}
      {selectedStudentForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-pop-in">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">Gửi Nhận Xét & Thưởng Sao</h3>
                <p className="text-xs text-teal-100">
                  Gửi về Sổ liên lạc của bé <b>{selectedStudentForNote.student?.name || selectedStudentForNote.name}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForNote(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendQuickNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-2">
                  Tặng sao khen thưởng cho bé:
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setBonusStars(s)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        bonusStars === s
                          ? 'bg-amber-400 text-amber-950 font-black shadow-xs ring-2 ring-amber-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ⭐ {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Nội dung nhận xét sư phạm gửi phụ huynh:
                </label>
                <textarea
                  required
                  rows={3}
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="Nhập lời khen ngợi và dặn dò phụ huynh…"
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 outline-none"
                />

                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">Gợi ý câu mẫu nhanh:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Bé phát âm rất to rõ và đạt điểm cao tuần này! 🌟',
                      'Bé rất chăm chỉ học từ vựng mới, cô khen bé nhé! 👏',
                      'Bé phản xạ nghe tranh rất nhạy, tiếp tục phát huy nhé! 🎯',
                      'Gia đình cho bé ôn thêm từ vựng bài trước 10 phút nhé! 📖'
                    ].map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setQuickNoteText(tpl)}
                        className="text-[10px] font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-800 px-2 py-0.5 rounded-md text-slate-600 transition-colors cursor-pointer"
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForNote(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={sendingNote}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingNote ? 'Đang gửi…' : 'Gửi tới Sổ liên lạc'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
