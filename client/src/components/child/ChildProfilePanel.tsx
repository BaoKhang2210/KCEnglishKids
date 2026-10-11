/**
 * ChildProfilePanel
 *
 * Opens when the user clicks the profile chip (avatar + name + book) in the
 * navbar. Renders as:
 *   • popover anchored below the chip on screens > 640 px
 *   • bottom-sheet with overlay on screens ≤ 640 px
 *
 * Two layers:
 *   1. CHILD LAYER  — always shown first; safe info only (avatar, nickname,
 *      book, stars, lessons, badges count). No DOB, email, phone.
 *   2. PARENT GATE  — math challenge (2-digit + 1-digit) before the adult
 *      section opens. Unlocked for PARENT_GATE_TTL_MS, then auto-locks.
 *   3. PARENT LAYER — shows masked sensitive fields; no edit (no update API).
 *
 * Accessibility:
 *   • role="dialog", aria-modal, aria-label
 *   • Focus trap inside panel
 *   • Closes on Esc / click-outside
 *   • Returns focus to trigger button on close
 *   • prefers-reduced-motion: animations disabled
 *
 * Privacy (Nghị định 13/2023/NĐ-CP):
 *   • Child layer: NEVER contains DOB, email, phone, full legal name, address
 *   • Sensitive fields in parent layer shown masked by default (👁 to reveal)
 *   • No data sent to URLs / logs / analytics from this component
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Lock,
  Shield,
  Star,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { childExportApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { sfx } from '../../utils/audio';
import { ALL_BADGES } from '../../data/badges';
import { stickerService } from '../../data/stickers';

// ─── Constants ────────────────────────────────────────────────────────────────

/** How long (ms) the parent gate stays unlocked before auto-locking. */
const PARENT_GATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildProfilePanelProps {
  /** Ref of the trigger button — used to anchor popover and return focus. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  /** Passed from ChildHeader so stats stay in sync with the navbar chip. */
  totalStars: number;
  completedCount: number;
  /** Book label and age label derived from ageGroupCode in the parent. */
  bookLabel?: string;
  ageLabel?: string;
}

type PanelView = 'child' | 'parent-gate' | 'parent';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Book / age-range lookup — same table as ChildHeader to stay consistent. */
const AGE_OPTIONS = [
  { code: '3-4', book: 'Book 1', ageLabel: '3–4 tuổi' },
  { code: '4-5', book: 'Book 2', ageLabel: '4–5 tuổi' },
  { code: '5-6', book: 'Book 3', ageLabel: '5–6 tuổi' },
];

/** Mask an email: "leo@example.com" → "l**@***.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = (local[0] ?? '*') + '**';
  const parts = domain.split('.');
  const ext = parts.pop() ?? '';
  return `${maskedLocal}@***.${ext}`;
}

/** Mask a phone: "0901234567" → "090***4567" */
function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 3) + '***' + phone.slice(-4);
}

/** Generate a math gate question: two-digit + one-digit. */
function makeMathQuestion(): { a: number; b: number; answer: number } {
  const a = 10 + Math.floor(Math.random() * 89); // 10–98
  const b = 1 + Math.floor(Math.random() * 9);   // 1–9
  return { a, b, answer: a + b };
}

// ─── Focus Trap ───────────────────────────────────────────────────────────────

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) { e.preventDefault(); return; }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    first?.focus();

    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [active, ref]);
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string; // tailwind bg class
}

const StatTile: React.FC<StatTileProps> = ({ icon, value, label, color }) => (
  <div className={`flex flex-col items-center justify-center gap-1 rounded-2xl ${color} py-3 px-2`}>
    <div className="text-2xl leading-none">{icon}</div>
    <span className="font-black text-xl leading-none text-slate-800">{value}</span>
    <span className="text-[11px] font-bold text-slate-500 text-center leading-tight">{label}</span>
  </div>
);

// ─── Parent Gate ─────────────────────────────────────────────────────────────

export interface ParentGateProps {
  onUnlock: () => void;
  onCancel: () => void;
}

export const ParentGate: React.FC<ParentGateProps> = ({ onUnlock, onCancel }) => {
  const [q] = useState(makeMathQuestion);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(input, 10) === q.answer) {
      sfx.playCorrect();
      onUnlock();
    } else {
      sfx.playGentleWrong();
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
        <Shield className="w-7 h-7 text-amber-600" />
      </div>

      <div className="text-center">
        <h3 className="font-black text-slate-800 text-base">Dành cho phụ huynh</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Giải phép tính để xem thông tin chi tiết
        </p>
      </div>

      {/* Math question */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-6 py-3 text-center">
        <p className="text-2xl font-black text-amber-900">
          {q.a} + {q.b} = ?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g, ''))}
          placeholder="Nhập đáp án..."
          aria-label="Đáp án phép tính"
          className={`w-full rounded-2xl border-[3px] text-center text-lg font-black py-3 outline-none transition-colors
            ${error
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-200'
            }`}
        />
        {error && (
          <p className="text-sm font-bold text-red-500 text-center -mt-1">
            Chưa đúng, thử lại nhé!
          </p>
        )}
        <button
          type="submit"
          disabled={!input}
          className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Xác nhận
        </button>
      </form>

      <button
        onClick={onCancel}
        className="text-sm font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
      >
        Quay lại
      </button>
    </div>
  );
};

// ─── Sensitive field (masked by default) ──────────────────────────────────────

interface SensitiveFieldProps {
  label: string;
  maskedValue: string;
  revealedValue: string;
}

const SensitiveField: React.FC<SensitiveFieldProps> = ({
  label,
  maskedValue,
  revealedValue,
}) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide w-20 flex-shrink-0">
        {label}
      </span>
      <span className="font-bold text-slate-700 text-sm flex-1 text-right mr-2 truncate">
        {revealed ? revealedValue : maskedValue}
      </span>
      <button
        onClick={() => setRevealed(r => !r)}
        aria-label={revealed ? 'Ẩn' : 'Hiện'}
        className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

// ─── Export buttons ───────────────────────────────────────────────────────────
// Placed in the parent layer so children cannot accidentally trigger a download.

interface ExportButtonsProps {
  childId: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ childId }) => {
  const [loadingFormat, setLoadingFormat] = useState<'json' | 'csv' | null>(null);
  const [exportError, setExportError]     = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'csv') => {
    setLoadingFormat(format);
    setExportError(null);
    try {
      const blob     = await childExportApi.exportData(childId, format);
      const mimeType = format === 'json' ? 'application/json' : 'text/csv';
      const url      = URL.createObjectURL(new Blob([blob], { type: mimeType }));
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = `kc_export_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError('Không thể xuất dữ liệu. Vui lòng thử lại.');
      console.error('[ExportButtons]', err);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-black text-slate-500 uppercase tracking-wide">
        Xuất dữ liệu học tập
      </p>
      <div className="flex gap-2">
        {/* JSON download */}
        <button
          onClick={() => handleExport('json')}
          disabled={!!loadingFormat}
          aria-label="Xuất dữ liệu định dạng JSON"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border-2 border-slate-200 text-slate-700 font-black text-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {loadingFormat === 'json' ? (
            <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          JSON
        </button>

        {/* CSV download */}
        <button
          onClick={() => handleExport('csv')}
          disabled={!!loadingFormat}
          aria-label="Xuất dữ liệu định dạng CSV (mở được bằng Excel)"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 border-2 border-slate-200 text-slate-700 font-black text-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {loadingFormat === 'csv' ? (
            <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          CSV (Excel)
        </button>
      </div>

      {exportError && (
        <p className="text-xs font-bold text-red-500" role="alert">{exportError}</p>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const ChildProfilePanel: React.FC<ChildProfilePanelProps> = ({
  triggerRef,
  isOpen,
  onClose,
  totalStars,
  completedCount,
  bookLabel,
  ageLabel,
}) => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const dialogId  = useId();

  const [view, setView]                     = useState<PanelView>('child');
  const [parentUnlockedAt, setParentUnlockedAt] = useState<number | null>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);

  // Detect mobile breakpoint (≤ 640 px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => { setIsMobile(mq.matches); isMobileRef.current = mq.matches; };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Reset to child view + lock parent when panel closes
  useEffect(() => {
    if (!isOpen) {
      setView('child');
      setParentUnlockedAt(null);
    }
  }, [isOpen]);

  // Auto-lock parent gate after TTL
  useEffect(() => {
    if (!parentUnlockedAt) return;
    const remaining = PARENT_GATE_TTL_MS - (Date.now() - parentUnlockedAt);
    if (remaining <= 0) { setView('child'); setParentUnlockedAt(null); return; }
    const t = setTimeout(() => { setView('child'); setParentUnlockedAt(null); }, remaining);
    return () => clearTimeout(t);
  }, [parentUnlockedAt]);

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, isMobile]);

  // Return focus to trigger on close
  const handleClose = useCallback(() => {
    onClose();
    // Small delay so the panel has unmounted before we shift focus
    setTimeout(() => triggerRef.current?.focus(), 50);
  }, [onClose, triggerRef]);

  // Click-outside
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current?.contains(e.target as Node)) {
      handleClose();
    }
  }, [handleClose]);

  useFocusTrap(panelRef, isOpen);

  if (!isOpen || !user) return null;

  // ── Derived data ────────────────────────────────────────────────────────────

  const childId = user._id || user.id || 'child_guest';
  const initial = (user.name || '?')[0].toUpperCase();

  const currentAgeOpt = AGE_OPTIONS.find(o => o.code === (user.ageGroupCode ?? '3-4')) ?? AGE_OPTIONS[0];
  const subtitle       = (bookLabel ?? currentAgeOpt.book) && (ageLabel ?? currentAgeOpt.ageLabel)
    ? `${bookLabel ?? currentAgeOpt.book} · ${ageLabel ?? currentAgeOpt.ageLabel}`
    : bookLabel ?? currentAgeOpt.book ?? '';

  // Badge count (unlocked) — same logic as ChildBadgesModal / ChildHomePage
  const unlockedBadgeCount = ALL_BADGES.filter(b => {
    if (b.reqType === 'star')   return totalStars      >= b.requirement;
    if (b.reqType === 'lesson') return completedCount  >= b.requirement;
    return false; // 'unit' — completedUnits not available here, skip
  }).length;

  // Sticker count
  const unlockedStickerCount = stickerService.getUnlockedStickers(childId).length;

  // Parent gate
  const handleParentUnlock = () => {
    setParentUnlockedAt(Date.now());
    setView('parent');
  };

  // ── Panel content ────────────────────────────────────────────────────────────

  const PanelContent = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Hồ sơ bé ${user.name}`}
      id={dialogId}
      // Stop propagation so backdrop click doesn't immediately close when
      // clicking inside the panel
      onClick={e => e.stopPropagation()}
      className={[
        // Shared styles
        'bg-white border-[3px] border-amber-200 shadow-2xl flex flex-col overflow-hidden',
        // Desktop: popover
        !isMobile && 'rounded-3xl w-[340px] max-h-[calc(100dvh-120px)]',
        // Mobile: full bottom-sheet
        isMobile  && 'rounded-t-3xl w-full max-h-[85dvh]',
        // Animation — respect prefers-reduced-motion
        'motion-safe:animate-pop-in',
      ].filter(Boolean).join(' ')}
      style={{ overflowY: 'auto' }}
    >
      {/* ── Close button ──────────────────────────────────────────────────── */}
      <button
        onClick={handleClose}
        aria-label="Đóng hồ sơ"
        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* ── Swipe handle (mobile only) ─────────────────────────────────── */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>
      )}

      <div className="flex flex-col gap-4 p-5 pt-4">

        {/* ════════════════════════════════════════════════════════════════
            CHILD LAYER
        ════════════════════════════════════════════════════════════════ */}
        {/* Always rendered at top — child-safe info only */}

        {/* Avatar + name row */}
        <div className="flex items-center gap-3 pr-8">
          {/* Avatar — large */}
          <div className="w-16 h-16 rounded-[18px] bg-amber-100 border-[3px] border-amber-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="font-black text-amber-800 text-2xl select-none"
                style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}>
                {initial}
              </span>
            )}
          </div>
          <div className="min-w-0">
            {/* Nickname only — NOT full legal name */}
            <h2
              className="font-black text-xl text-slate-800 truncate"
              style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
              title={user.name}
            >
              {user.name}
            </h2>
            {subtitle && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span className="text-[13px] font-bold text-amber-700 truncate">{subtitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats row: ⭐ sao · 📚 bài · 🏅 huy hiệu */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            icon={<Star className="w-5 h-5 text-amber-500 fill-amber-400" />}
            value={totalStars}
            label="Sao"
            color="bg-amber-50"
          />
          <StatTile
            icon="📚"
            value={completedCount}
            label="Bài học"
            color="bg-sky-50"
          />
          {unlockedBadgeCount > 0 && (
            <StatTile
              icon={<Award className="w-5 h-5 text-purple-500" />}
              value={unlockedBadgeCount + unlockedStickerCount}
              label="Phần thưởng"
              color="bg-purple-50"
            />
          )}
        </div>

        {/* CTA — go to Bộ sưu tập */}
        <button
          onClick={() => {
            sfx.playPop();
            handleClose();
            navigate('/?tab=badges');
          }}
          className="flex items-center justify-between w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black rounded-2xl px-4 py-3.5 cursor-pointer transition-all active:scale-95 shadow-sm"
          style={{ minHeight: '56px' }}
        >
          <span className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Bộ sưu tập phần thưởng
          </span>
          <ChevronRight className="w-5 h-5 stroke-[2.5] flex-shrink-0" />
        </button>

        {/* ════════════════════════════════════════════════════════════════
            PARENT GATE / PARENT LAYER
        ════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-slate-100 pt-3">
          {view === 'child' && (
            <button
              onClick={() => { sfx.playPop(); setView('parent-gate'); }}
              className="flex items-center gap-2 w-full text-slate-400 hover:text-slate-600 text-sm font-bold py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>🔒 Dành cho phụ huynh</span>
            </button>
          )}

          {view === 'parent-gate' && (
            <ParentGate
              onUnlock={handleParentUnlock}
              onCancel={() => setView('child')}
            />
          )}

          {view === 'parent' && (
            <div className="flex flex-col gap-3">
              {/* Unlocked indicator */}
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-bold">Đã mở khoá phụ huynh · tự khoá sau 5 phút</span>
              </div>

              {/* Sensitive info — masked by default */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 px-4 py-1">
                <SensitiveField
                  label="Tên"
                  maskedValue={user.name}
                  revealedValue={user.name}
                />
                {user.email && (
                  <SensitiveField
                    label="Email"
                    maskedValue={maskEmail(user.email)}
                    revealedValue={user.email}
                  />
                )}
                {user.parentContact && (
                  <SensitiveField
                    label="Liên hệ"
                    maskedValue={maskPhone(user.parentContact)}
                    revealedValue={user.parentContact}
                  />
                )}
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide w-20">Sách</span>
                  <span className="font-bold text-slate-700 text-sm text-right">
                    {subtitle || '—'}
                  </span>
                </div>
              </div>

              {/* Privacy note */}
              <div className="text-[11px] font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5 leading-relaxed">
                <p className="mb-1 font-black text-slate-500">Dữ liệu được lưu trữ:</p>
                <p>Tên hiển thị, cấp sách, tiến độ học (sao, bài đã hoàn thành, từ vựng). Dữ liệu chỉ dùng để cá nhân hoá trải nghiệm học và theo dõi tiến độ.</p>
              </div>

              {/* Export buttons */}
              <ExportButtons childId={childId} />

              {/* Re-lock */}
              <button
                onClick={() => { sfx.playPop(); setView('child'); setParentUnlockedAt(null); }}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-bold py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Khoá lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Layout wrapper ──────────────────────────────────────────────────────────

  // Desktop: popover anchored below trigger
  // Mobile: bottom-sheet with overlay
  return createPortal(
    isMobile ? (
      // ── Mobile: overlay + bottom-sheet ──────────────────────────────────
      <div
        className="fixed inset-0 z-[200] flex flex-col justify-end"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={handleBackdropClick}
        aria-hidden="false"
      >
        {PanelContent}
      </div>
    ) : (
      // ── Desktop: popover positioned below chip ───────────────────────────
      // We use a wrapper that covers the whole viewport as a transparent click
      // catcher, then position the panel absolutely near the trigger.
      <div
        className="fixed inset-0 z-[200]"
        onClick={handleBackdropClick}
        aria-hidden="false"
      >
        <PanelPopoverPositioner triggerRef={triggerRef}>
          {PanelContent}
        </PanelPopoverPositioner>
      </div>
    ),
    document.body
  );
};

// ─── Popover positioner (desktop only) ────────────────────────────────────────
// Reads trigger getBoundingClientRect on each render (isOpen=true) and
// positions the panel below-right of the chip, flipping left if it would
// overflow the right edge.

interface PopoverPositionerProps {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}

const PanelPopoverPositioner: React.FC<PopoverPositionerProps> = ({
  triggerRef,
  children,
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = 340;
    const gap = 8;
    const top  = rect.bottom + gap + window.scrollY;
    const rawLeft = rect.right - panelWidth + window.scrollX;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - panelWidth - 8));

    setPos({ top, left });
  }, [triggerRef]);

  if (!pos) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top:  pos.top,
        left: pos.left,
        width: 340,
        // Stop the transparent backdrop from getting clicks inside
        pointerEvents: 'auto',
      }}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  );
};
