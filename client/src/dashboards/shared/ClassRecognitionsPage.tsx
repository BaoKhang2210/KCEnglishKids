import { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Crown,
  Star,
  Sparkles,
  Send,
  CheckCircle2,
  RefreshCw,
  Calendar,
  School,
  Search,
  Printer,
  X,
  FileCheck2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { recognitionApi, recognitionDate } from '../../services/recognitionApi';
import type { RecognitionKind, RecognitionPreview, RecognitionRow } from '../../services/recognitionApi';
import { useAuth } from '../../context/AuthContext';
import { StudentAvatar } from '../../components/common/StudentAvatar';

function currentPeriodDate(_kind?: RecognitionKind) {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function previousPeriodDate(kind: RecognitionKind) {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  if (kind === 'WEEK') now.setUTCDate(now.getUTCDate() - 7);
  else { now.setUTCDate(1); now.setUTCMonth(now.getUTCMonth() - 1); }
  return now.toISOString().slice(0, 10);
}

export function ClassRecognitionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [classes, setClasses] = useState<{ _id: string; name: string; status: string }[]>([]);
  const [scope, setScope] = useState<'SCHOOL' | string>(isAdmin ? 'SCHOOL' : '');
  const isSchool = scope === 'SCHOOL';
  const [kind, setKind] = useState<RecognitionKind>('WEEK');
  const [date, setDate] = useState(() => currentPeriodDate('WEEK'));
  const [data, setData] = useState<RecognitionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  // Search filter for ranking table
  const [searchQuery, setSearchQuery] = useState('');

  // Certificate modal
  const [selectedCertificateStudent, setSelectedCertificateStudent] = useState<RecognitionRow | null>(null);

  useEffect(() => {
    let active = true;
    setClassesLoading(true);
    recognitionApi.classes().then(response => {
      if (!active) return;
      setClasses(response.data);
      if (!isAdmin) {
        setScope(current => (current && current !== 'SCHOOL' ? current : response.data[0]?._id || ''));
      }
    }).catch(err => { if (active) setError(err.message || 'Không tải được danh sách lớp.'); })
      .finally(() => { if (active) setClassesLoading(false); });
    return () => { active = false; };
  }, [reload, isAdmin]);

  useEffect(() => {
    let active = true;
    setData(null);
    if (!scope || (!isSchool && !scope) || !date) { setLoading(false); return; }
    setLoading(true);
    setError('');
    (isSchool ? recognitionApi.schoolPreview(kind, date) : recognitionApi.preview(scope, kind, date)).then(response => {
      if (active) setData(response.data);
    }).catch(err => { if (active) setError(err.message || 'Không tải được kết quả.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scope, isSchool, kind, date, reload]);

  const publish = async () => {
    if (!data?.canPublish || publishing) return;
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      const response = await (isSchool ? recognitionApi.schoolPublish(kind, date) : recognitionApi.publish(scope, kind, date));
      setData(current => current ? {
        ...current, ranking: response.data.ranking, reward: response.data.reward,
        canPublish: false, published: { _id: response.data._id, publishedAt: response.data.publishedAt }
      } : current);
      setNotice('Đã công bố thành công. Danh hiệu và lời khen đã được gửi đến tài khoản của các bé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa công bố được. Vui lòng thử lại.');
    } finally { setPublishing(false); }
  };

  const winners = useMemo(() => data?.ranking.filter(row => row.winner) || [], [data]);

  // Top 3 students for podium
  const top1 = winners;
  const top2 = useMemo(() => {
    if (!data?.ranking) return [];
    const minWinnerStars = top1[0]?.stars || 0;
    const candidates = data.ranking.filter(r => !r.winner && r.stars > 0 && r.stars < minWinnerStars);
    if (!candidates.length) return [];
    const max2 = candidates[0].stars;
    return candidates.filter(r => r.stars === max2);
  }, [data, top1]);

  const top3 = useMemo(() => {
    if (!data?.ranking || !top2.length) return [];
    const min2Stars = top2[0].stars;
    const candidates = data.ranking.filter(r => !r.winner && r.stars > 0 && r.stars < min2Stars);
    if (!candidates.length) return [];
    const max3 = candidates[0].stars;
    return candidates.filter(r => r.stars === max3);
  }, [data, top2]);

  // Filtered ranking for table
  const filteredRanking = useMemo(() => {
    if (!data?.ranking) return [];
    if (!searchQuery.trim()) return data.ranking;
    const q = searchQuery.toLowerCase().trim();
    return data.ranking.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.className && r.className.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  const handlePrintCertificate = () => {
    if (!selectedCertificateStudent || !data) return;

    const student = selectedCertificateStudent;
    const studentClass = isSchool
      ? (student.className ? `Lớp ${student.className}` : 'Học sinh toàn trường')
      : `Lớp ${data.className}`;
    const awardTitle = data.reward.title;
    const awardSymbol = data.reward.symbol;
    const totalStars = student.stars;
    const classStars = student.classStars ?? student.stars;
    const homeStars = student.homeStars ?? 0;
    const awardDate = new Date().toLocaleDateString('vi-VN');

    // Create an isolated, clean iframe for exactly 1-page pristine print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '297mm';
    iframe.style.height = '210mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Giay-Khen-${encodeURIComponent(student.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 297mm;
      height: 210mm;
      max-width: 297mm;
      max-height: 210mm;
      overflow: hidden;
      background: #FAF7F0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
    }
    .cert-sheet {
      width: 297mm;
      height: 210mm;
      max-width: 297mm;
      max-height: 210mm;
      padding: 10mm 14mm;
      position: relative;
      background: radial-gradient(circle at center, #FFFDF8 0%, #FAF6EE 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .gold-outer-border {
      position: absolute;
      inset: 8mm 10mm;
      border: 3.5px solid #C5A059;
      border-radius: 8px;
      pointer-events: none;
    }
    .gold-inner-border {
      position: absolute;
      inset: 10.5mm 12.5mm;
      border: 1.5px solid #E5C158;
      border-radius: 6px;
      pointer-events: none;
    }
    .corner-ornament {
      position: absolute;
      width: 26px;
      height: 26px;
      pointer-events: none;
    }
    .corner-tl { top: 12mm; left: 14mm; border-top: 3px solid #9A7B2C; border-left: 3px solid #9A7B2C; }
    .corner-tr { top: 12mm; right: 14mm; border-top: 3px solid #9A7B2C; border-right: 3px solid #9A7B2C; }
    .corner-bl { bottom: 12mm; left: 14mm; border-bottom: 3px solid #9A7B2C; border-left: 3px solid #9A7B2C; }
    .corner-br { bottom: 12mm; right: 14mm; border-bottom: 3px solid #9A7B2C; border-right: 3px solid #9A7B2C; }

    .header-section {
      text-align: center;
      margin-top: 2mm;
    }
    .org-title {
      font-family: 'Cinzel', 'Playfair Display', serif;
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #8C6D23;
      margin: 0;
    }
    .divider-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-top: 2.5mm;
    }
    .gold-line {
      width: 55px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #C5A059);
    }
    .gold-line.reverse {
      background: linear-gradient(270deg, transparent, #C5A059);
    }
    .gold-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #F3E5AB, #C5A059);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .main-title {
      font-family: 'Cinzel', 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #0F172A;
      text-transform: uppercase;
      margin: 1.5mm 0 0 0;
      line-height: 1.1;
    }
    .sub-title {
      font-family: 'Playfair Display', serif;
      font-size: 12px;
      font-style: italic;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #64748B;
      margin: 1mm 0 0 0;
    }

    .body-section {
      text-align: center;
      margin: 2mm 0;
    }
    .salutation {
      font-size: 13.5px;
      color: #475569;
      font-weight: 600;
      margin: 0;
    }
    .student-name {
      font-family: 'Playfair Display', 'Cinzel', serif;
      font-size: 36px;
      font-weight: 900;
      color: #1E1B4B;
      letter-spacing: 0.02em;
      margin: 2mm 0 1.5mm 0;
      line-height: 1.15;
    }
    .student-class {
      font-size: 14.5px;
      font-weight: 700;
      color: #9A7B2C;
      margin: 0;
    }

    .award-card {
      margin: 3mm auto 0 auto;
      max-width: 215mm;
      padding: 3mm 8mm;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid #E2D1A6;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(197, 160, 89, 0.1);
    }
    .award-heading {
      font-size: 15px;
      font-weight: 800;
      color: #78350F;
      margin: 0;
    }
    .award-detail {
      font-size: 12.5px;
      color: #334155;
      margin: 1mm 0 0 0;
      line-height: 1.45;
    }

    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 14mm 2mm 14mm;
    }
    .footer-col {
      text-align: center;
      min-width: 52mm;
    }
    .footer-label {
      font-size: 11.5px;
      color: #64748B;
      font-weight: 600;
      margin: 0;
    }
    .footer-date {
      font-size: 13.5px;
      color: #0F172A;
      font-weight: 800;
      margin: 1.5mm 0 0 0;
    }
    .footer-sub {
      font-size: 10.5px;
      color: #94A3B8;
      margin: 1mm 0 0 0;
    }

    .seal-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .seal-circle {
      width: 58px;
      height: 58px;
      border: 2px dashed #C5A059;
      border-radius: 50%;
      padding: 2.5px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .seal-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, #F9E7B3 0%, #D4AF37 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #5B4310;
      font-weight: 900;
      font-size: 6.5px;
      letter-spacing: 0.1em;
      text-align: center;
      line-height: 1.15;
    }
  </style>
</head>
<body>
  <div class="cert-sheet">
    <div class="gold-outer-border"></div>
    <div class="gold-inner-border"></div>
    <div class="corner-ornament corner-tl"></div>
    <div class="corner-ornament corner-tr"></div>
    <div class="corner-ornament corner-bl"></div>
    <div class="corner-ornament corner-br"></div>

    <div class="header-section">
      <p class="org-title">Hệ Thống Giáo Dục Anh Ngữ Trẻ Em KC English Kids</p>
      <div class="divider-row">
        <div class="gold-line"></div>
        <div class="gold-icon">${awardSymbol || '🏆'}</div>
        <div class="gold-line reverse"></div>
      </div>
      <h1 class="main-title">Giấy Khen Danh Dự</h1>
      <p class="sub-title">Certificate of Excellence</p>
    </div>

    <div class="body-section">
      <p class="salutation">Trân trọng biểu dương và khen tặng học sinh:</p>
      <h2 class="student-name">${student.name}</h2>
      <p class="student-class">${studentClass}</p>

      <div class="award-card">
        <p class="award-heading">Đạt danh hiệu: ${awardTitle} ${awardSymbol || ''}</p>
        <p class="award-detail">
          Thành tích xuất sắc đạt <b>${totalStars} ngôi sao trong kỳ</b>. Trong đó đạt <b>${classStars} sao</b> trên lớp và <b>${homeStars} sao</b> tự học ở nhà.
        </p>
      </div>
    </div>

    <div class="footer-section">
      <div class="footer-col">
        <p class="footer-label">Ngày trao tặng</p>
        <p class="footer-date">${awardDate}</p>
        <p class="footer-sub">KC English Kids Center</p>
      </div>

      <div class="seal-wrap">
        <div class="seal-circle">
          <div class="seal-inner">
            <span>KC KIDS</span>
            <span style="font-size: 8px;">★ ★ ★</span>
            <span>EXCELLENCE</span>
          </div>
        </div>
      </div>

      <div class="footer-col">
        <p class="footer-label">Ban Giám Hiệu &amp; Giáo Viên</p>
        <p class="footer-date">KC English Kids</p>
        <p class="footer-sub" style="color: #047857; font-weight: 700;">Xác nhận vinh danh</p>
      </div>
    </div>
  </div>
</body>
</html>`);
    doc.close();

    const triggerPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    };

    if (doc.fonts && typeof doc.fonts.ready?.then === 'function') {
      doc.fonts.ready.then(() => {
        setTimeout(triggerPrint, 250);
      }).catch(() => {
        setTimeout(triggerPrint, 400);
      });
    } else {
      setTimeout(triggerPrint, 400);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-800">

      {/* ── HEADER CARD (Synchronized with Admin/Teacher Dashboard style) ──────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Trophy size={24} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
              {isAdmin && isSchool ? 'Bảng vàng vinh danh toàn trường' : 'Vinh danh & Khen thưởng lớp học'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Tôn vinh nỗ lực rèn luyện, ghi nhận thành tích sao trên lớp và tự học ở nhà của học sinh
            </p>
          </div>
        </div>

        {data && (
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {data.period.kind === 'WEEK' ? 'Kỳ tuần' : 'Kỳ tháng'}
              </p>
              <p className="text-xs font-black text-slate-800">
                {recognitionDate(data.period.start)} – {new Date(data.period.lastDate + 'T12:00:00+07:00').toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div>
              {data.published ? (
                <span className="px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Đã công bố
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-600" /> {data.canPublish ? 'Sẵn sàng công bố' : 'Đang diễn ra'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BỘ LỌC ĐIỀU HƯỚNG KỲ (Clean, professional, zero AI clunkiness) ─────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        {/* Quick Period Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1 uppercase tracking-wider">Thời gian:</span>
            
            <button
              type="button"
              onClick={() => { setKind('WEEK'); setDate(currentPeriodDate('WEEK')); setNotice(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                kind === 'WEEK' && date === currentPeriodDate('WEEK')
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Calendar size={14} />
              <span>Tuần này</span>
            </button>

            <button
              type="button"
              onClick={() => { setKind('WEEK'); setDate(previousPeriodDate('WEEK')); setNotice(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                kind === 'WEEK' && date === previousPeriodDate('WEEK')
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Tuần trước</span>
            </button>

            <button
              type="button"
              onClick={() => { setKind('MONTH'); setDate(currentPeriodDate('MONTH')); setNotice(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                kind === 'MONTH' && date === currentPeriodDate('MONTH')
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Award size={14} />
              <span>Tháng này</span>
            </button>

            <button
              type="button"
              onClick={() => { setKind('MONTH'); setDate(previousPeriodDate('MONTH')); setNotice(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                kind === 'MONTH' && date === previousPeriodDate('MONTH')
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Tháng trước</span>
            </button>
          </div>

          <button
            type="button"
            disabled={publishing || loading || classesLoading}
            onClick={() => { setError(''); setReload(c => c + 1); }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200/80 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Làm mới kết quả tổng hợp"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới số liệu</span>
          </button>
        </div>

        {/* Detailed Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <School size={14} className="text-indigo-600" />
              <span>{isAdmin ? 'Phạm vi vinh danh' : 'Lớp học phụ trách'}</span>
            </label>
            <select
              value={scope}
              disabled={classesLoading || publishing}
              onChange={e => { setScope(e.target.value); setNotice(''); }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
            >
              {isAdmin && <option value="SCHOOL">Toàn trường</option>}
              {!classes.length && !isAdmin && (
                <option value="">{classesLoading ? 'Đang tải danh sách lớp…' : 'Chưa có lớp được phân công'}</option>
              )}
              {classes.map(c => (
                <option key={c._id} value={c._id}>
                  Lớp: {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Award size={14} className="text-indigo-600" />
              <span>Loại kỳ khen thưởng</span>
            </label>
            <select
              value={kind}
              disabled={publishing}
              onChange={e => {
                const next = e.target.value as RecognitionKind;
                setKind(next);
                setDate(currentPeriodDate(next));
                setNotice('');
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="WEEK">Theo tuần</option>
              <option value="MONTH">Theo tháng</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" />
              <span>Ngày trong kỳ</span>
            </label>
            <input
              type="date"
              value={date}
              disabled={publishing}
              onChange={e => { setDate(e.target.value); setNotice(''); }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-sm font-bold flex items-center gap-2.5 shadow-2xs">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-sm font-bold flex items-center gap-2.5 shadow-2xs animate-fade-in">
          <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Loading state */}
      {(loading || classesLoading) && (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center shadow-2xs">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600">Đang tổng hợp dữ liệu sao và bảng xếp hạng vinh danh…</p>
        </div>
      )}

      {!isSchool && !classesLoading && !classes.length && !error && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-2xs">
          <School size={48} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-black text-slate-800">Chưa có lớp học được phân công</h3>
          <p className="text-xs text-slate-500 mt-1">Giáo viên cần được quản trị viên gán phụ trách ít nhất một lớp học để thực hiện vinh danh.</p>
        </div>
      )}

      {/* ── NỘI DUNG VINH DANH CHÍNH ────────────────────────────────────────── */}
      {data && !loading && (
        <div className="space-y-6">
          {/* 1. Phần Thưởng Danh Dự & Podium Top 3 */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">{data.reward.symbol}</span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {data.reward.title}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  {data.reward.description} • {data.className}
                </p>
              </div>

              {/* Gợi ý hoạt động cho giáo viên */}
              {data.reward.suggestion && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 sm:max-w-md">
                  <p className="text-xs font-semibold text-amber-950 flex items-start gap-1.5 leading-relaxed">
                    <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span><b>Gợi ý khen thưởng:</b> {data.reward.suggestion}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Bục Vinh Danh Podium */}
            {winners.length > 0 ? (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Crown size={15} className="text-amber-500" />
                  <span>Học sinh được biểu dương xuất sắc nhất kỳ</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Quán Quân */}
                  {winners.map((winner, idx) => (
                    <div
                      key={winner.child || idx}
                      className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-yellow-50/30 border border-amber-300/80 shadow-2xs flex flex-col justify-between"
                    >
                      <div className="absolute top-3 right-3">
                        <span className="h-8 w-8 rounded-full bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center shadow-2xs">
                          🥇
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <StudentAvatar student={winner} size="lg" className="ring-4 ring-amber-200/70 shadow-xs" />
                          <div className="min-w-0 pr-6">
                            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                              Quán Quân Xuất Sắc
                            </span>
                            <h3 className="text-base font-black text-slate-900 truncate mt-0.5">{winner.name}</h3>
                            {isSchool && winner.className && (
                              <p className="text-xs font-semibold text-indigo-700 truncate">Lớp: {winner.className}</p>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white/90 border border-amber-200/80 grid grid-cols-3 gap-1 text-center">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Tổng kỳ</p>
                            <p className="text-sm font-black text-amber-700 flex items-center justify-center gap-0.5 mt-0.5">
                              <Star size={13} className="fill-amber-400 text-amber-500" />
                              <span>{winner.stars}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Trên lớp</p>
                            <p className="text-xs font-bold text-indigo-900 mt-0.5">
                              {winner.classStars ?? winner.stars} ⭐
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Ở nhà</p>
                            <p className="text-xs font-bold text-emerald-800 mt-0.5">
                              {winner.homeStars ?? 0} 🏠
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCertificateStudent(winner)}
                        className="mt-4 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <FileCheck2 size={15} />
                        <span>Xem Giấy Khen Điện Tử</span>
                      </button>
                    </div>
                  ))}

                  {/* Á Quân */}
                  {top2.slice(0, 1).map((runnerUp, idx) => (
                    <div
                      key={runnerUp.child || idx}
                      className="relative overflow-hidden rounded-3xl p-5 bg-slate-50 border border-slate-200 flex flex-col justify-between"
                    >
                      <div className="absolute top-3 right-3">
                        <span className="h-8 w-8 rounded-full bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center">
                          🥈
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <StudentAvatar student={runnerUp} size="lg" className="ring-4 ring-slate-200 shadow-xs" />
                          <div className="min-w-0 pr-6">
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                              Á Quân
                            </span>
                            <h3 className="text-base font-black text-slate-900 truncate mt-0.5">{runnerUp.name}</h3>
                            {isSchool && runnerUp.className && (
                              <p className="text-xs font-semibold text-slate-600 truncate">Lớp: {runnerUp.className}</p>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white border border-slate-200 grid grid-cols-3 gap-1 text-center">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Tổng kỳ</p>
                            <p className="text-sm font-black text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                              <Star size={13} className="fill-amber-400 text-amber-500" />
                              <span>{runnerUp.stars}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Trên lớp</p>
                            <p className="text-xs font-bold text-indigo-900 mt-0.5">
                              {runnerUp.classStars ?? runnerUp.stars} ⭐
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Ở nhà</p>
                            <p className="text-xs font-bold text-emerald-800 mt-0.5">
                              {runnerUp.homeStars ?? 0} 🏠
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCertificateStudent(runnerUp)}
                        className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck2 size={15} />
                        <span>Xem Giấy Khen Điện Tử</span>
                      </button>
                    </div>
                  ))}

                  {/* Hạng Ba */}
                  {top3.slice(0, 1).map((third, idx) => (
                    <div
                      key={third.child || idx}
                      className="relative overflow-hidden rounded-3xl p-5 bg-orange-50/40 border border-orange-200/80 flex flex-col justify-between"
                    >
                      <div className="absolute top-3 right-3">
                        <span className="h-8 w-8 rounded-full bg-orange-200 text-orange-900 font-black text-sm flex items-center justify-center">
                          🥉
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <StudentAvatar student={third} size="lg" className="ring-4 ring-orange-200 shadow-xs" />
                          <div className="min-w-0 pr-6">
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 text-[10px] font-black uppercase tracking-wider">
                              Hạng Ba
                            </span>
                            <h3 className="text-base font-black text-slate-900 truncate mt-0.5">{third.name}</h3>
                            {isSchool && third.className && (
                              <p className="text-xs font-semibold text-slate-600 truncate">Lớp: {third.className}</p>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white border border-orange-200 grid grid-cols-3 gap-1 text-center">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Tổng kỳ</p>
                            <p className="text-sm font-black text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                              <Star size={13} className="fill-amber-400 text-amber-500" />
                              <span>{third.stars}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Trên lớp</p>
                            <p className="text-xs font-bold text-indigo-900 mt-0.5">
                              {third.classStars ?? third.stars} ⭐
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Ở nhà</p>
                            <p className="text-xs font-bold text-emerald-800 mt-0.5">
                              {third.homeStars ?? 0} 🏠
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCertificateStudent(third)}
                        className="mt-4 w-full py-2.5 px-4 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck2 size={15} />
                        <span>Xem Giấy Khen Điện Tử</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center">
                <Trophy size={40} className="mx-auto text-slate-300 mb-2" />
                <h4 className="text-base font-black text-slate-700">Chưa ghi nhận số sao hợp lệ trong kỳ này</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Kỳ này chưa có buổi học nào ghi nhận số sao lớn hơn 0 để trao thưởng. Hãy kiểm tra lại lịch học và nhật ký giảng dạy.
                </p>
              </div>
            )}

            {/* Publication Hub Banner */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {data.published ? (
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Đã chính thức công bố vào ngày {recognitionDate(data.published.publishedAt)}. Các bé đã nhận được huy hiệu trong tài khoản học sinh.</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-medium">
                    {data.canPublish
                      ? 'Kỳ học đã kết thúc và sẵn sàng để gửi bảng vàng vinh danh đến các học sinh.'
                      : 'Kỳ học đang diễn ra. Bảng điểm sẽ liên tục cập nhật theo thời gian thực và có thể công bố khi kỳ kết thúc.'}
                  </p>
                )}
              </div>

              {!data.published && (
                <button
                  type="button"
                  disabled={!data.canPublish || publishing}
                  onClick={publish}
                  className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Send size={15} />
                  <span>{publishing ? 'Đang gửi vinh danh…' : 'Công bố & Gửi vinh danh'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Bảng Bảng Vàng Chi Tiết (Tự co giãn 100% chiều ngang, không bị thanh cuộn kéo ngang) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Award size={20} className="text-indigo-600" />
                  <span>Bảng điểm thi đua chi tiết</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Xếp hạng theo tổng số sao đạt được trong kỳ; hỗ trợ theo dõi chuyên cần và điểm tích lũy toàn khóa.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên học sinh..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Compact Full-Fit Table (No Horizontal Dragging Needed) */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">Hạng</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Học sinh</th>
                    <th className="py-2.5 px-2 text-center w-24">Trên lớp</th>
                    <th className="py-2.5 px-2 text-center w-24">Ở nhà</th>
                    <th className="py-2.5 px-2.5 text-center w-28">Tổng kỳ</th>
                    <th className="py-2.5 px-3 text-center w-32">Tham gia</th>
                    <th className="py-2.5 px-2 text-center w-24">Tích lũy</th>
                    <th className="py-2.5 px-3 text-center w-28">Danh hiệu</th>
                    <th className="py-2.5 px-2.5 text-center w-24">Giấy khen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {filteredRanking.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 text-xs font-bold">
                        Không tìm thấy học sinh nào phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredRanking.map((row, idx) => {
                      const isGold = row.winner;
                      const isSilver = row.awardTier === 'SILVER';
                      const isBronze = row.awardTier === 'BRONZE';

                      return (
                        <tr
                          key={row.child || idx}
                          className={`transition-colors ${
                            isGold
                              ? 'bg-amber-50/40 hover:bg-amber-50/70 font-bold'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* 1. Hạng */}
                          <td className="py-2.5 px-3 text-center">
                            {isGold ? (
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-2xs">
                                🥇
                              </span>
                            ) : isSilver ? (
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-200 text-slate-800 font-black text-xs">
                                🥈
                              </span>
                            ) : isBronze ? (
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-orange-200 text-orange-900 font-black text-xs">
                                🥉
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-slate-100 text-slate-600 font-bold text-xs">
                                {row.rank ?? idx + 1}
                              </span>
                            )}
                          </td>

                          {/* 2. Học sinh (Gộp tên lớp xuống dòng dưới nếu là Toàn trường để tiết kiệm diện tích) */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <StudentAvatar student={row} size="sm" />
                              <div className="min-w-0">
                                <p className="text-slate-900 font-black truncate">{row.name}</p>
                                {isSchool && row.className && (
                                  <p className="text-[11px] font-semibold text-slate-500 truncate">{row.className}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Sao Trên Lớp */}
                          <td className="py-2.5 px-2 text-center text-indigo-950 font-bold text-xs">
                            {row.classStars ?? row.stars} ⭐
                          </td>

                          {/* 4. Sao Ở Nhà */}
                          <td className="py-2.5 px-2 text-center text-emerald-800 font-bold text-xs">
                            {row.homeStars ?? 0} 🏠
                          </td>

                          {/* 5. Tổng Trong Kỳ */}
                          <td className="py-2.5 px-2.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-black text-xs">
                              <Star size={12} className="fill-amber-400 text-amber-500" />
                              <span>{row.stars} sao</span>
                            </span>
                          </td>

                          {/* 6. Tham gia & Chuyên cần (Gộp gọn gàng không chiếm cột) */}
                          <td className="py-2.5 px-3 text-center">
                            <p className="text-slate-700 text-xs font-bold">{row.sessions} buổi</p>
                            {row.isPerfectAttendance ? (
                              <span className="text-[10px] text-emerald-700 font-black">Chuyên cần 100%</span>
                            ) : row.sessions > 0 ? (
                              <span className="text-[10px] text-slate-400 font-medium">Đầy đủ</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Vắng</span>
                            )}
                          </td>

                          {/* 7. Tổng Tích Lũy */}
                          <td className="py-2.5 px-2 text-center font-bold text-slate-700 text-xs">
                            {row.totalStars ?? row.stars} ⭐
                          </td>

                          {/* 8. Danh Hiệu */}
                          <td className="py-2.5 px-3 text-center">
                            {isGold ? (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-amber-950 font-black text-[11px] shadow-2xs inline-flex items-center gap-1">
                                <Sparkles size={11} />
                                <span>Quán Quân</span>
                              </span>
                            ) : isSilver ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold text-[11px]">
                                Á Quân
                              </span>
                            ) : isBronze ? (
                              <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 font-bold text-[11px]">
                                Hạng Ba
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>

                          {/* 9. Nút Giấy Khen Nhanh */}
                          <td className="py-2.5 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedCertificateStudent(row)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              title={`Xem giấy khen của ${row.name}`}
                            >
                              <FileCheck2 size={13} className="text-amber-600" />
                              <span>Giấy khen</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GIẤY KHEN ĐIỆN TỬ ĐẲNG CẤP HOÀNG GIA (CERTIFICATE OF EXCELLENCE) ── */}
      {selectedCertificateStudent && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          {/* Modal Container */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-3xl border border-slate-200 shadow-2xl relative my-auto animate-scale-up">
            {/* Close Button on Screen (Hidden on Print) */}
            <button
              type="button"
              onClick={() => setSelectedCertificateStudent(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer print-hidden"
            >
              <X size={20} />
            </button>

            {/* ── BẢN GIẤY KHEN IN ĐẲNG CẤP (Print Target) ──────────────────── */}
            <div
              id="certificate-print-root"
              className="relative p-8 sm:p-10 rounded-2xl bg-[#FCFBF7] border-[3px] border-[#D4AF37] shadow-inner text-center select-none"
            >
              {/* Inner Fine Gold Border */}
              <div className="absolute inset-2.5 rounded-xl border border-[#D4AF37]/50 pointer-events-none" />

              {/* 4 Ornate Gold Corner Ornaments */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#D4AF37] pointer-events-none" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#D4AF37] pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#D4AF37] pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#D4AF37] pointer-events-none" />

              {/* Header Branding */}
              <div className="space-y-1 relative z-10">
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-[#9A7B2C]">
                  Hệ Thống Giáo Dục Anh Ngữ Trẻ Em KC English Kids
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#F3E5AB] to-[#C5A059] p-[2px] shadow-md flex items-center justify-center">
                    <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                      <Trophy size={20} className="text-[#C5A059]" />
                    </div>
                  </div>
                  <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase pt-1">
                  Giấy Khen Danh Dự
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">
                  Certificate of Excellence
                </p>
              </div>

              {/* Certificate Body */}
              <div className="py-5 space-y-2 relative z-10">
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  Trân trọng biểu dương và khen tặng học sinh:
                </p>
                <div className="flex justify-center py-1">
                  <StudentAvatar student={selectedCertificateStudent} size="lg" className="ring-4 ring-[#D4AF37]/50 shadow-md" />
                </div>
                <h3 className="text-2xl sm:text-4xl font-black text-indigo-950 tracking-wide font-serif pt-1">
                  {selectedCertificateStudent.name}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-[#9A7B2C]">
                  {isSchool ? `Lớp học: ${selectedCertificateStudent.className || 'Toàn trường'}` : data.className}
                </p>
              </div>

              {/* Achievement Summary Card */}
              <div className="max-w-xl mx-auto p-4 rounded-xl bg-white/90 border border-[#D4AF37]/40 text-slate-800 space-y-1 shadow-2xs relative z-10">
                <p className="font-black text-amber-900 text-sm sm:text-base">
                  Đạt danh hiệu: {data.reward.title} {data.reward.symbol}
                </p>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  Thành tích xuất sắc đạt <b>{selectedCertificateStudent.stars} ⭐ ngôi sao trong kỳ</b>. Trong đó đạt <b>{selectedCertificateStudent.classStars ?? selectedCertificateStudent.stars} ⭐</b> trên lớp và <b>{selectedCertificateStudent.homeStars ?? 0} ⭐</b> tự học ở nhà.
                </p>
              </div>

              {/* Signatures & Seal */}
              <div className="pt-6 sm:pt-8 flex justify-between items-end text-xs font-bold text-slate-700 px-6 sm:px-12 relative z-10">
                <div className="text-left space-y-1">
                  <p className="text-slate-500 font-semibold">Ngày trao tặng</p>
                  <p className="text-slate-900 font-black text-sm">
                    {new Date().toLocaleDateString('vi-VN')}
                  </p>
                  <p className="text-[10px] text-slate-400">KC English Kids Center</p>
                </div>

                {/* Royal Stamp Medallion */}
                <div className="hidden sm:flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#D4AF37] p-1 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#D4AF37]/10 flex flex-col items-center justify-center text-[8px] font-black uppercase text-[#9A7B2C] leading-tight">
                      <span>KC KIDS</span>
                      <Star size={10} className="fill-[#D4AF37] text-[#D4AF37] my-0.5" />
                      <span>EXCELLENCE</span>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-slate-500 font-semibold">Ban Giám Hiệu &amp; Giáo Viên</p>
                  <p className="text-indigo-950 font-black text-sm">
                    KC English Kids
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold">Xác nhận vinh danh</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions (Hidden when printing or exporting to PDF) */}
            <div className="pt-5 flex items-center justify-end gap-3 print-hidden">
              <button
                type="button"
                onClick={handlePrintCertificate}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Printer size={15} />
                <span>In giấy khen</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCertificateStudent(null)}
                className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
