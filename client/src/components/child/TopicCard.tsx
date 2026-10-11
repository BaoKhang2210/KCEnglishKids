import React from 'react';
import { Play } from 'lucide-react';
import type { Topic } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TopicCardProps {
  topic: Topic;
  index: number;
  ageCode: string;
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Colour palettes (6 rotates)
// ---------------------------------------------------------------------------
const PALETTES = [
  {
    card: 'from-amber-50 to-orange-50/80',
    border: '#f59e0b', borderHover: '#d97706',
    chip: { bg: '#fef3c7', text: '#78350f', border: '#fcd34d' },
    iconBg: '#fef3c7',
    play: { bg: '#fbbf24', text: '#451a03', border: '#f59e0b' },
  },
  {
    card: 'from-emerald-50 to-teal-50/80',
    border: '#10b981', borderHover: '#059669',
    chip: { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7' },
    iconBg: '#d1fae5',
    play: { bg: '#34d399', text: '#022c22', border: '#10b981' },
  },
  {
    card: 'from-sky-50 to-blue-50/80',
    border: '#0ea5e9', borderHover: '#0284c7',
    chip: { bg: '#e0f2fe', text: '#0c4a6e', border: '#7dd3fc' },
    iconBg: '#e0f2fe',
    play: { bg: '#38bdf8', text: '#082f49', border: '#0ea5e9' },
  },
  {
    card: 'from-purple-50 to-pink-50/80',
    border: '#a855f7', borderHover: '#9333ea',
    chip: { bg: '#f3e8ff', text: '#4a044e', border: '#d8b4fe' },
    iconBg: '#f3e8ff',
    play: { bg: '#c084fc', text: '#2e1065', border: '#a855f7' },
  },
  {
    card: 'from-rose-50 to-orange-50/80',
    border: '#f43f5e', borderHover: '#e11d48',
    chip: { bg: '#ffe4e6', text: '#4c0519', border: '#fda4af' },
    iconBg: '#ffe4e6',
    play: { bg: '#fb7185', text: '#4c0519', border: '#f43f5e' },
  },
  {
    card: 'from-teal-50 to-cyan-50/80',
    border: '#14b8a6', borderHover: '#0d9488',
    chip: { bg: '#ccfbf1', text: '#042f2e', border: '#5eead4' },
    iconBg: '#ccfbf1',
    play: { bg: '#2dd4bf', text: '#042f2e', border: '#14b8a6' },
  },
] as const;

// ---------------------------------------------------------------------------
// TopicCard
// ---------------------------------------------------------------------------
/**
 * Bố cục 3 hàng (CSS grid):
 *
 *  ┌─────────────────────────────────────────┐
 *  │ ROW 1 (auto): [📚 N bài]  [tên VN]      │  flex justify-between
 *  ├─────────────────────────────────────────┤
 *  │ ROW 2 (1fr):  icon căn giữa             │  minmax(0,1fr)
 *  ├─────────────────────────────────────────┤
 *  │ ROW 3 (auto): [ ] [tên chủ đề] [▶]     │  grid 3 cols: 44px 1fr 44px
 *  └─────────────────────────────────────────┘
 *
 * Nguyên tắc chống cắt chữ:
 * - KHÔNG height/max-height cứng trên vùng chứa chữ
 * - overflow:clip + overflowClipMargin:'0.2em' bảo vệ descender (g,y,p,j)
 * - Nút ▶ trong luồng lưới, KHÔNG position:absolute
 * - overflow:hidden CHỈ ở lớp vỏ ngoài để bo góc
 */
export const TopicCard: React.FC<TopicCardProps> = ({ topic, index, onClick }) => {
  const pal = PALETTES[index % PALETTES.length];
  const lessonCount = (topic as any).lessonCount ?? 0;
  const isAvailable = lessonCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mở chủ đề ${topic.englishName}${isAvailable ? `. ${lessonCount} bài học` : '. Sắp ra mắt'}`}
      title={`${topic.englishName}${topic.vietnameseName ? ` · ${topic.vietnameseName}` : ''}`}
      style={{
        /* ── Layout 3 hàng ── */
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        rowGap: 'clamp(8px, 2cqh, 16px)',

        /* ── Kích thước ── */
        minHeight: 'clamp(240px, 32dvh, 320px)',
        padding: 'clamp(12px, 4cqw, 20px)',
        width: '100%',
        minWidth: 0,

        /* ── Giao diện ── */
        borderRadius: '28px',
        border: `4px solid ${pal.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        overflow: 'hidden',      /* CHỈ vỏ ngoài, để bo góc */
        textAlign: 'left',
        position: 'relative',
        opacity: isAvailable ? 1 : 0.82,
        transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
        /* Container query cho cqh / cqw */
        containerType: 'size',
      } as React.CSSProperties}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.18)';
        el.style.transform = 'translateY(-4px)';
        el.style.borderColor = pal.borderHover;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        el.style.transform = 'translateY(0)';
        el.style.borderColor = pal.border;
      }}
      className={`bg-gradient-to-b ${pal.card} group select-none`}
    >
      {/* ══ HÀNG 1: Chip số bài + Tên tiếng Việt ══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        {/* Chip số bài — KHÔNG ngắt dòng, chữ ≥14px */}
        <span
          style={{
            fontSize: 'clamp(14px, 1.6cqw, 15px)',
            fontWeight: 900,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            padding: '3px 10px',
            borderRadius: '999px',
            border: `1.5px solid ${pal.chip.border}`,
            background: pal.chip.bg,
            color: pal.chip.text,
            lineHeight: 1.4,
          }}
        >
          {isAvailable ? `📚 ${lessonCount} bài` : '🔒 Sắp có'}
        </span>

        {/* Tên tiếng Việt — 1 dòng, ellipsis, chữ ≥14px */}
        {topic.vietnameseName && (
          <span
            style={{
              fontSize: 'clamp(14px, 1.5cqw, 15px)',
              fontWeight: 700,
              color: '#64748b',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}
          >
            {topic.vietnameseName}
          </span>
        )}
      </div>

      {/* ══ HÀNG 2: Icon căn giữa (1fr — co giãn) ══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,   /* Cần thiết trong grid row 1fr */
          width: '100%',
        }}
      >
        {/*
          Cạnh icon = min(100% của ô, 40cqh).
          Không đặt width/height cứng — tự scale theo thẻ.
          Đảm bảo icon ≥ 40% chiều cao thẻ ở mọi kích thước.
        */}
        <div
          style={{
            width: 'min(100%, 40cqh)',
            height: 'min(100%, 40cqh)',
            aspectRatio: '1',
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: '24px',
            background: pal.iconBg,
            border: '2.5px solid rgba(255,255,255,0.9)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'min(10cqh, 52px)',
            flexShrink: 0,
            transition: 'transform 0.25s',
          }}
          className="group-hover:scale-110"
        >
          <span style={{ lineHeight: 1, userSelect: 'none' }}>
            {topic.icon || '🌟'}
          </span>
        </div>
      </div>

      {/* ══ HÀNG 3: [ô trống | Tên chủ đề | Nút ▶] ══ */}
      {/*
        3 cột: 44px | 1fr | 44px
        Cột 1 (ô trống) đối xứng cột 3 để tên nằm đúng giữa.
        Nút ▶ trong luồng lưới — KHÔNG position:absolute.
      */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr 44px',
          columnGap: '8px',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {/* Cột 1: ô trống */}
        <div aria-hidden="true" />

        {/* Cột 2: Tên chủ đề
            Quy tắc chống cắt:
            - overflow:clip + overflowClipMargin:'0.2em' cho phép descender hiển thị
            - paddingBlock:'0.15em' tạo khoảng thở cho g, y, p
            - KHÔNG height/max-height cứng, KHÔNG overflow:hidden riêng
            - WebkitLineClamp:2 giới hạn 2 dòng, vùng chứa tự cao
        */}
        <h3
          style={{
            fontSize: 'clamp(22px, 9cqw, 30px)',
            fontWeight: 900,
            lineHeight: 1.3,
            paddingBlock: '0.15em',
            margin: 0,
            color: '#1e293b',
            textAlign: 'center',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'clip',
            overflowClipMargin: '0.2em',
            transition: 'color 0.2s',
          }}
          className="group-hover:text-amber-700"
        >
          {topic.englishName}
        </h3>

        {/* Cột 3: Nút ▶ — trong luồng, KHÔNG absolute */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: pal.play.bg,
            border: `2px solid ${pal.play.border}`,
            color: pal.play.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            flexShrink: 0,
            transition: 'transform 0.2s',
          }}
          className="group-hover:scale-110 group-active:scale-95"
          aria-hidden="true"
        >
          <Play
            style={{
              width: '18px',
              height: '18px',
              fill: 'currentColor',
              transform: 'translateX(1px)',
            }}
          />
        </div>
      </div>
    </button>
  );
};

export default TopicCard;
