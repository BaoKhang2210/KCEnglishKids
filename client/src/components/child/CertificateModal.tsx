import React from 'react';
import { Trophy, Star, Printer, X } from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';
import { recognitionDate } from '../../services/recognitionApi';
import type { ChildRecognition } from '../../services/recognitionApi';

interface CertificateModalProps {
  recognition: ChildRecognition;
  userAvatar?: string;
  userAvatarUrl?: string;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  recognition,
  userAvatar,
  userAvatarUrl,
  onClose,
}) => {
  const awardTitle = recognition.reward?.title || recognition.awardTitle || 'Ngôi Sao Tỏa Sáng';
  const awardSymbol = recognition.reward?.symbol || recognition.awardSymbol || '⭐';
  const awardDate = recognition.publishedAt
    ? new Date(recognition.publishedAt).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');
  const periodText = `${recognition.kind === 'WEEK' ? 'Tuần' : 'Tháng'} (${recognitionDate(recognition.periodStart)} – ${recognitionDate(new Date(new Date(recognition.periodEnd).getTime() - 1).toISOString())})`;

  const handlePrint = () => {
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
  <title>Giay-Khen-${encodeURIComponent(recognition.name || 'Hoc-Sinh')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body {
      margin: 0; padding: 0; width: 297mm; height: 210mm; max-width: 297mm; max-height: 210mm;
      overflow: hidden; background: #FAF7F0; font-family: 'Plus Jakarta Sans', sans-serif; color: #1E293B;
    }
    .cert-sheet {
      width: 297mm; height: 210mm; padding: 10mm 14mm; position: relative;
      background: radial-gradient(circle at center, #FFFDF8 0%, #FAF6EE 100%);
      display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
    }
    .gold-outer-border { position: absolute; inset: 8mm 10mm; border: 3.5px solid #C5A059; pointer-events: none; }
    .gold-inner-border { position: absolute; inset: 10.5mm 12.5mm; border: 1px solid rgba(197, 160, 89, 0.45); pointer-events: none; }
    .corner-tl { position: absolute; top: 12.5mm; left: 14.5mm; width: 14mm; height: 14mm; border-top: 2.5px solid #C5A059; border-left: 2.5px solid #C5A059; pointer-events: none; }
    .corner-tr { position: absolute; top: 12.5mm; right: 14.5mm; width: 14mm; height: 14mm; border-top: 2.5px solid #C5A059; border-right: 2.5px solid #C5A059; pointer-events: none; }
    .corner-bl { position: absolute; bottom: 12.5mm; left: 14.5mm; width: 14mm; height: 14mm; border-bottom: 2.5px solid #C5A059; border-left: 2.5px solid #C5A059; pointer-events: none; }
    .corner-br { position: absolute; bottom: 12.5mm; right: 14.5mm; width: 14mm; height: 14mm; border-bottom: 2.5px solid #C5A059; border-right: 2.5px solid #C5A059; pointer-events: none; }
    .header { text-align: center; margin-top: 2mm; }
    .system-title { font-family: 'Cinzel', serif; font-size: 8.5pt; font-weight: 800; color: #8C6D23; letter-spacing: 0.28em; text-transform: uppercase; margin: 0; }
    .crest-container { display: flex; align-items: center; justify-content: center; gap: 4mm; margin-top: 2.5mm; }
    .gold-line { height: 1px; width: 22mm; background: linear-gradient(90deg, transparent, #C5A059); }
    .gold-line.reverse { background: linear-gradient(270deg, transparent, #C5A059); }
    .crest-icon { width: 10mm; height: 10mm; border-radius: 50%; border: 1.5px solid #C5A059; display: flex; align-items: center; justify-content: center; font-size: 14pt; background: #FFF9E6; }
    .main-title { font-family: 'Cinzel', serif; font-size: 27pt; font-weight: 900; color: #1E293B; letter-spacing: 0.08em; text-transform: uppercase; margin: 1.5mm 0 0 0; line-height: 1.1; }
    .sub-title { font-size: 8pt; font-weight: 700; color: #8C6D23; letter-spacing: 0.22em; text-transform: uppercase; margin: 1mm 0 0 0; }
    .body { text-align: center; margin: 2mm 0; }
    .present-to { font-size: 9pt; font-weight: 600; color: #64748B; margin: 0; }
    .student-name { font-family: 'Playfair Display', serif; font-size: 28pt; font-weight: 900; color: #0F172A; margin: 2mm 0 1.5mm 0; }
    .student-class { font-size: 10.5pt; font-weight: 800; color: #8C6D23; margin: 0; }
    .achievement-card { max-width: 175mm; margin: 3mm auto 0 auto; padding: 3mm 8mm; background: #FFFFFF; border: 1px solid rgba(197, 160, 89, 0.45); border-radius: 4mm; text-align: center; }
    .award-heading { font-size: 11pt; font-weight: 900; color: #8C6D23; margin: 0; }
    .award-desc { font-size: 8.5pt; font-weight: 600; color: #334155; margin: 1mm 0 0 0; line-height: 1.45; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; padding: 0 14mm 2mm 14mm; }
    .footer-left { text-align: left; }
    .footer-right { text-align: right; }
    .footer-title { font-size: 7.5pt; font-weight: 600; color: #64748B; margin: 0; }
    .footer-val { font-size: 9.5pt; font-weight: 800; color: #0F172A; margin: 1.5mm 0 0 0; }
    .footer-sub { font-size: 7pt; font-weight: 700; color: #059669; margin: 1mm 0 0 0; }
    .seal-circle { width: 18mm; height: 18mm; border-radius: 50%; border: 1.5px dashed #C5A059; padding: 2.5px; display: flex; align-items: center; justify-content: center; }
    .seal-inner { width: 100%; height: 100%; border-radius: 50%; background: rgba(197, 160, 89, 0.12); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 5pt; font-weight: 900; color: #8C6D23; text-align: center; }
  </style>
</head>
<body>
  <div class="cert-sheet">
    <div class="gold-outer-border"></div>
    <div class="gold-inner-border"></div>
    <div class="corner-tl"></div>
    <div class="corner-tr"></div>
    <div class="corner-bl"></div>
    <div class="corner-br"></div>
    <div class="header">
      <p class="system-title">Hệ Thống Giáo Dục Anh Ngữ Trẻ Em KC English Kids</p>
      <div class="crest-container">
        <div class="gold-line"></div>
        <div class="crest-icon">🏆</div>
        <div class="gold-line reverse"></div>
      </div>
      <h1 class="main-title">Giấy Khen Danh Dự</h1>
      <p class="sub-title">Certificate of Excellence</p>
    </div>
    <div class="body">
      <p class="present-to">Trân trọng biểu dương và khen tặng học sinh:</p>
      <h2 class="student-name">${recognition.name || 'Học Sinh Xuất Sắc'}</h2>
      <p class="student-class">Lớp: ${recognition.className || 'Toàn trường'} · Kỳ: ${periodText}</p>
      <div class="achievement-card">
        <p class="award-heading">Đạt danh hiệu: ${awardTitle} ${awardSymbol}</p>
        <p class="award-desc">
          Thành tích xuất sắc đạt <b>${recognition.stars} ⭐ ngôi sao trong kỳ thi đua</b>. Chúc mừng bé luôn chăm ngoan, tích cực và tự tin khám phá tiếng Anh!
        </p>
      </div>
    </div>
    <div class="footer">
      <div class="footer-left">
        <p class="footer-title">Ngày trao tặng</p>
        <p class="footer-val">${awardDate}</p>
        <p class="footer-sub">KC English Kids Center</p>
      </div>
      <div class="seal-circle">
        <div class="seal-inner">
          <span>KC KIDS</span>
          <span style="font-size: 7pt;">★</span>
          <span>EXCELLENCE</span>
        </div>
      </div>
      <div class="footer-right">
        <p class="footer-title">Ban Giám Hiệu &amp; Giáo Viên</p>
        <p class="footer-val">KC English Kids</p>
        <p class="footer-sub">Xác nhận vinh danh</p>
      </div>
    </div>
  </div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-3xl border border-slate-200 shadow-2xl relative my-auto animate-scale-up">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* ── BẢN GIẤY KHEN TRÊN MÀN HÌNH ──────────────────── */}
        <div className="relative p-6 sm:p-10 rounded-2xl bg-[#FCFBF7] border-[3px] border-[#D4AF37] shadow-inner text-center select-none overflow-hidden">
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
          <div className="py-4 space-y-2 relative z-10">
            <p className="text-xs sm:text-sm font-semibold text-slate-600">
              Trân trọng biểu dương và khen tặng học sinh:
            </p>
            <div className="flex justify-center py-1">
              <StudentAvatar
                student={{ name: recognition.name, avatar: userAvatar, avatarUrl: userAvatarUrl }}
                size="lg"
                className="ring-4 ring-[#D4AF37]/50 shadow-md"
              />
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-indigo-950 tracking-wide font-serif pt-1">
              {recognition.name || 'Bé Ngoan Xuất Sắc'}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-[#9A7B2C]">
              Lớp học: {recognition.className || 'Toàn trường'} · {periodText}
            </p>
          </div>

          {/* Achievement Summary Card */}
          <div className="max-w-xl mx-auto p-4 rounded-xl bg-white/90 border border-[#D4AF37]/40 text-slate-800 space-y-1 shadow-2xs relative z-10">
            <p className="font-black text-amber-900 text-sm sm:text-base">
              Đạt danh hiệu: {awardTitle} {awardSymbol}
            </p>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              Thành tích xuất sắc đạt <b>{recognition.stars} ⭐ ngôi sao trong kỳ thi đua</b>. Chúc mừng bé luôn nỗ lực học tập và đạt kết quả tuyệt vời!
            </p>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-6 sm:pt-8 flex justify-between items-end text-xs font-bold text-slate-700 px-4 sm:px-10 relative z-10">
            <div className="text-left space-y-1">
              <p className="text-slate-500 font-semibold">Ngày trao tặng</p>
              <p className="text-slate-900 font-black text-sm">{awardDate}</p>
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
              <p className="text-indigo-950 font-black text-sm">KC English Kids</p>
              <p className="text-[10px] text-emerald-700 font-bold">Xác nhận vinh danh</p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <Printer size={16} />
            <span>In Giấy Khen</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
