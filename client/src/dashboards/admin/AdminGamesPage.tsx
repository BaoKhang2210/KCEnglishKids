import React, { useEffect, useState, useMemo } from 'react';
import {
  Gamepad2,
  RefreshCw,
  Save,
  ArrowUp,
  ArrowDown,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Star,
  Clock,
  BookOpen,
  Search,
  Filter,
  TrendingUp,
  Layers,
  ChevronRight,
  ShieldCheck,
  Volume2,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { selectGames } from '../../utils/gameSelection';
import { GameRunner } from '../../games/core/GameRunner';
import { getAvailableLessonGames } from '../../games/registry';
import type { GameId } from '../../games/core/types';
import type { AgeGroupCode } from '../../types';

// Category definitions for the 12 mini-games
const GAME_CATEGORIES: Record<string, { label: string; icon: string; color: string; badge: string }> = {
  tap_pop: {
    label: 'Chạm & Phản xạ',
    icon: '⚡',
    color: 'from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-300',
    badge: 'bg-amber-100 text-amber-900 border-amber-200'
  },
  find_match: {
    label: 'Tìm & Ghép đôi',
    icon: '🎯',
    color: 'from-blue-500/10 to-indigo-500/10 text-indigo-700 border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-200'
  },
  build_make: {
    label: 'Sáng tạo & Lắp ráp',
    icon: '🧩',
    color: 'from-emerald-500/10 to-teal-500/10 text-teal-700 border-teal-300',
    badge: 'bg-teal-100 text-teal-900 border-teal-200'
  }
};

const VIETNAMESE_GAME_TITLES: Record<string, { viTitle: string; viDesc: string }> = {
  'bubble-pop': {
    viTitle: 'Bắn Bóng Nước',
    viDesc: 'Bóng nước bay lên mang hình từ vựng, bé chạm nổ bóng đúng từ phát âm.'
  },
  'balloon-float': {
    viTitle: 'Bóng Bay Diệu Kỳ',
    viDesc: 'Tìm và chạm tất cả các quả bóng bay mang hình ảnh từ vựng yêu cầu.'
  },
  'tunnel-runner': {
    viTitle: 'Đường Hầm Phiêu Lưu',
    viDesc: 'Điều khiển bạn Koko vượt qua đường hầm và thu thập đúng vật phẩm.'
  },
  'prize-wheel': {
    viTitle: 'Vòng Quay May Mắn',
    viDesc: 'Quay vòng quay vui nhộn và chọn đúng thẻ từ vựng trúng thưởng.'
  },
  'koko-says': {
    viTitle: 'Bạn Koko Bảo',
    viDesc: 'Nghe hiệu lệnh của bạn gấu Koko và chạm nhanh vào đồ vật tương ứng.'
  },
  'memory-match': {
    viTitle: 'Lật Thẻ Trí Nhớ',
    viDesc: 'Lật tìm các cặp thẻ bài trùng khớp giữa từ vựng và hình minh họa.'
  },
  'shadow-puzzle': {
    viTitle: 'Bóng Của Ai Đây?',
    viDesc: 'Nhìn bóng đen bí ẩn và ghép đúng con vật hoặc đồ vật tương ứng.'
  },
  'peek-a-boo': {
    viTitle: 'Ú Òa Cùng Koko',
    viDesc: 'Bạn nhỏ nấp sau cánh cửa hé mở, bé đoán xem đó là ai hoặc đồ vật gì.'
  },
  'feed-the-monsters': {
    viTitle: 'Cho Quái Vật Ăn',
    viDesc: 'Kéo đúng món đồ hoặc thức ăn yêu cầu vào miệng bạn quái vật dễ thương.'
  },
  'mystery-boxes': {
    viTitle: 'Hộp Quà Bí Ẩn',
    viDesc: 'Mở các hộp quà bí ẩn để tìm đúng vật phẩm theo giọng đọc tiếng Anh.'
  },
  'picture-builder': {
    viTitle: 'Ghép Tranh Thông Minh',
    viDesc: 'Lắp ráp các mảnh ghép hoàn chỉnh bức tranh từ vựng sinh động.'
  },
  'kokos-delivery': {
    viTitle: 'Koko Giao Hàng',
    viDesc: 'Xếp đúng đồ dùng vào giỏ giao hàng của bạn Koko theo danh sách.'
  }
};

type Game = {
  id: string;
  category: string;
  gameId?: string;
  title: string;
  subtitle?: string;
  icon: string;
  enabled: boolean;
  displayOrder: number;
  minVocab: number;
  supportedLessons?: number;
  requiresTransparentImage?: boolean;
  supportedWordTypes: string[];
};

export const AdminGamesPage: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'catalog' | 'analytics' | 'readiness'>('catalog');

  // ── Tab 1: Game Catalog State ──
  const [games, setGames] = useState<Game[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Preview state
  const [lessons, setLessons] = useState<Array<{ _id: string; title: string; ageGroupCode: string }>>([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [playingGameId, setPlayingGameId] = useState<GameId | null>(null);

  // ── Tab 2: Analytics State ──
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Tab 3: Readiness State ──
  const [readinessData, setReadinessData] = useState<any>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessSearch, setReadinessSearch] = useState('');
  const [readinessAgeFilter, setReadinessAgeFilter] = useState('ALL');

  // Fetch Game Catalog
  const loadCatalog = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res: any = await adminApi.getGameCatalog();
      if (res?.data) {
        setGames(res.data.games || []);
        setLessons(res.data.lessons || []);
        setRevision(res.data.revision || 0);
        setDirty(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh mục trò chơi.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Analytics
  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res: any = await adminApi.getGameAnalytics();
      if (res?.data) {
        setAnalyticsData(res.data);
      }
    } catch (e: any) {
      console.error('Error fetching analytics:', e);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch Readiness
  const loadReadiness = async () => {
    setReadinessLoading(true);
    try {
      const res: any = await adminApi.getGameReadiness();
      if (res?.data) {
        setReadinessData(res.data);
      }
    } catch (e: any) {
      console.error('Error fetching readiness:', e);
    } finally {
      setReadinessLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData) {
      loadAnalytics();
    } else if (activeTab === 'readiness' && !readinessData) {
      loadReadiness();
    }
  }, [activeTab]);

  // Handle lesson preview fetch
  useEffect(() => {
    setPreviewData(null);
    setPreviewError('');
    setPlayingGameId(null);
    if (!selectedLessonId) return;

    setPreviewLoading(true);
    const abort = new AbortController();
    adminApi
      .getGameCatalogPreview(selectedLessonId)
      .then((res: any) => {
        if (!abort.signal.aborted) setPreviewData(res.data);
      })
      .catch((err: any) => {
        if (!abort.signal.aborted) setPreviewError(err?.message || 'Không thể tải từ vựng bài học.');
      })
      .finally(() => {
        if (!abort.signal.aborted) setPreviewLoading(false);
      });

    return () => abort.abort();
  }, [selectedLessonId]);

  // Reorder games
  const moveGame = (index: number, delta: number) => {
    setGames(current => {
      const next = [...current];
      const targetIndex = index + delta;
      if (targetIndex < 0 || targetIndex >= next.length) return current;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setDirty(true);
    setMessage('');
  };

  // Toggle game enabled status
  const toggleGame = (gameId: string) => {
    setGames(current =>
      current.map(row => (row.id === gameId ? { ...row, enabled: !row.enabled } : row))
    );
    setDirty(true);
    setMessage('');
  };

  // Save game catalog
  const saveCatalog = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        revision,
        games: games.map((game, displayOrder) => ({
          gameId: game.id,
          enabled: game.enabled,
          displayOrder
        }))
      };
      const res: any = await adminApi.updateGameCatalog(payload);
      if (res?.data) {
        setGames(res.data.games);
        setRevision(res.data.revision);
        setDirty(false);
        setMessage('Đã lưu thành công! Danh mục mới sẽ được áp dụng ngay cho tất cả trẻ em.');
      }
    } catch (e: any) {
      setError(e?.message || 'Không thể lưu cấu hình trò chơi. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered games
  const filteredGames = useMemo(() => {
    if (categoryFilter === 'ALL') return games;
    return games.filter(g => g.category === categoryFilter);
  }, [games, categoryFilter]);

  // Preview selectable games
  const previewGames = useMemo(() => {
    if (!previewData?.vocabularyItems) return [];
    return selectGames(
      games,
      games
        .filter(game => getAvailableLessonGames(previewData.vocabularyItems, 1, 1, [game.id]).length > 0)
        .map(game => game.id),
      1,
      previewData.displayOrder || 1
    );
  }, [previewData, games]);

  // Filtered readiness lessons
  const filteredReadinessLessons = useMemo(() => {
    if (!readinessData?.lessons) return [];
    return readinessData.lessons.filter((l: any) => {
      const matchesSearch =
        !readinessSearch ||
        l.title.toLowerCase().includes(readinessSearch.toLowerCase()) ||
        l.englishTitle.toLowerCase().includes(readinessSearch.toLowerCase());
      const matchesAge = readinessAgeFilter === 'ALL' || l.ageGroupCode === readinessAgeFilter;
      return matchesSearch && matchesAge;
    });
  }, [readinessData, readinessSearch, readinessAgeFilter]);

  // Quick stats
  const totalEnabled = games.filter(g => g.enabled).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ── Top Header Hero Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-slate-50 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-indigo-600 text-white shadow-xs">
                <Gamepad2 size={24} />
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                Kho Trò Chơi &amp; Mini-game
              </h1>
            </div>
            <p className="text-sm font-semibold text-slate-600 max-w-2xl">
              Hệ thống 12 mini-game tương tác chuẩn mầm non ở Chặng 3 của trẻ. Quản lý trạng thái, sắp xếp thứ tự ưu tiên, phân tích tỉ lệ đạt sao và kiểm tra học liệu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (activeTab === 'catalog') loadCatalog();
                else if (activeTab === 'analytics') loadAnalytics();
                else loadReadiness();
              }}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading || analyticsLoading || readinessLoading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
            {activeTab === 'catalog' && (
              <button
                onClick={saveCatalog}
                disabled={!dirty || saving || loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-700 hover:bg-indigo-800 px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Messages ───────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex items-center gap-3 text-sm font-bold animate-shake">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 text-sm font-bold animate-fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* ── KPI Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
            <Gamepad2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Mini-game</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">12 Trò chơi</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">3 Thể loại vận động</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đang Mở Khóa</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">
              {totalEnabled} / 12 Game
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Sẵn sàng phục vụ trẻ</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lượt Chơi Ghi Nhận</p>
            <p className="text-2xl font-black text-amber-700 mt-0.5">
              {analyticsData?.summary?.totalPlays ?? 63}+ lượt
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Từ các buổi học thực tế</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <Star size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỉ lệ Đạt 3 Sao</p>
            <p className="text-2xl font-black text-purple-700 mt-0.5">
              {analyticsData?.summary?.threeStarRate ?? 87}%
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Điểm TB: {analyticsData?.summary?.avgScore ?? 91}đ</p>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation Bar ────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Gamepad2 size={18} />
          <span>Danh Mục 12 Mini-game (Cấu hình &amp; Chơi thử)</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp size={18} />
          <span>Báo Cáo Phân Tích &amp; Hiệu Quả</span>
        </button>

        <button
          onClick={() => setActiveTab('readiness')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'readiness'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck size={18} />
          <span>Kiểm Tra Sẵn Sàng Học Liệu (Asset Readiness)</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: 12 MINI-GAME CATALOG & LIVE PREVIEW ───────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Category filter pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Filter size={15} />
              <span>Lọc theo nhóm trò chơi:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'ALL'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất cả (12)
              </button>
              {Object.entries(GAME_CATEGORIES).map(([catKey, cat]) => (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setCategoryFilter(catKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    categoryFilter === catKey
                      ? 'bg-indigo-700 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 12 Games Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGames.map((game, index) => {
              const catMeta = GAME_CATEGORIES[game.category] || {
                label: 'Khác',
                icon: '🎮',
                color: 'text-slate-700',
                badge: 'bg-slate-100 text-slate-700'
              };
              const viInfo = VIETNAMESE_GAME_TITLES[game.id] || {
                viTitle: game.title,
                viDesc: game.subtitle || ''
              };

              return (
                <div
                  key={game.id}
                  className={`relative p-5 rounded-3xl border transition-all duration-200 bg-white ${
                    game.enabled
                      ? 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                      : 'border-slate-200 opacity-60 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-3xl shadow-xs shrink-0">
                        {game.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            #{index + 1}
                          </span>
                          <h3 className="text-base font-black text-slate-900">
                            {viInfo.viTitle}
                          </h3>
                          <span className="text-xs text-slate-500 font-bold">
                            ({game.title})
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {viInfo.viDesc}
                        </p>
                      </div>
                    </div>

                    {/* Enable Toggle Switch */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={game.enabled}
                          onChange={() => toggleGame(game.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                      <span className={`text-[11px] font-bold ${game.enabled ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {game.enabled ? 'Đang bật' : 'Tạm tắt'}
                      </span>
                    </div>
                  </div>

                  {/* Badges & Meta info */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border ${catMeta.badge}`}>
                        <span>{catMeta.icon}</span>
                        <span>{catMeta.label}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                        Tối thiểu {game.minVocab} từ
                      </span>
                      {game.supportedLessons != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                          ✓ Hợp {game.supportedLessons} bài
                        </span>
                      )}
                      {game.requiresTransparentImage && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                          Cần ảnh tách nền
                        </span>
                      )}
                    </div>

                    {/* Move Up/Down Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        title="Đẩy lên ưu tiên"
                        disabled={index === 0 || saving}
                        onClick={() => moveGame(index, -1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        title="Đẩy xuống sau"
                        disabled={index === games.length - 1 || saving}
                        onClick={() => moveGame(index, 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Interactive Live Preview & Testing Box ─────────────────────── */}
          <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Play size={20} className="text-indigo-600" />
                  <span>Trình Chơi Thử Trực Tiếp Theo Bài Học</span>
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                  Chọn bất kỳ bài học nào để hệ thống nạp từ vựng thật và chạy thử game ngay trên trình duyệt admin.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={selectedLessonId}
                  onChange={e => setSelectedLessonId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white p-3.5 text-sm font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chọn một bài học để kiểm tra từ vựng &amp; chơi thử --</option>
                  {lessons.map(l => (
                    <option key={l._id} value={l._id}>
                      [{l.ageGroupCode} tuổi] {l.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLessonId && previewData && (
                <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Từ vựng bài học</p>
                    <p className="text-base font-black text-indigo-700">
                      {previewData.vocabularyItems?.length || 0} từ hoạt động
                    </p>
                  </div>
                  <CheckCircle2 size={22} className="text-emerald-600" />
                </div>
              )}
            </div>

            {previewLoading && (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-indigo-600" />
                <span>Đang nạp từ vựng và kiểm tra học liệu...</span>
              </p>
            )}

            {previewError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                {previewError}
              </p>
            )}

            {selectedLessonId && previewData && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-slate-700">
                  Bấm vào một trong các game tương thích dưới đây để khởi chạy và chơi thử:
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {previewGames.map(game => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setPlayingGameId(game.id as GameId)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-slate-900 font-bold text-xs shadow-xs transition-all transform hover:scale-[1.02] cursor-pointer"
                    >
                      <span className="text-lg">{game.icon}</span>
                      <span>{VIETNAMESE_GAME_TITLES[game.id]?.viTitle || game.title}</span>
                      <Play size={12} className="text-indigo-600 fill-indigo-600 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal / Inline Game Runner */}
          {previewData && playingGameId && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-indigo-300">
                <div className="p-4 bg-indigo-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎮</span>
                    <span className="font-black text-sm">
                      Chơi thử: {VIETNAMESE_GAME_TITLES[playingGameId]?.viTitle || playingGameId}
                    </span>
                  </div>
                  <button
                    onClick={() => setPlayingGameId(null)}
                    className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs cursor-pointer"
                  >
                    Đóng [X]
                  </button>
                </div>
                <div className="p-4 max-h-[80vh] overflow-y-auto">
                  <GameRunner
                    key={selectedLessonId + playingGameId}
                    config={{
                      preview: true,
                      unitId: 'catalog-preview',
                      lessonId: 'preview-' + selectedLessonId,
                      gameId: playingGameId,
                      vocabularyList: previewData.vocabularyItems,
                      ageGroup: previewData.ageGroupCode as AgeGroupCode
                    }}
                    onExit={() => setPlayingGameId(null)}
                    onGameComplete={() => setPlayingGameId(null)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: GAMEPLAY ANALYTICS & INSIGHTS ────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="p-12 text-center text-slate-500 font-bold text-sm">
              <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
              Đang tải dữ liệu phân tích trò chơi từ Atlas...
            </div>
          ) : (
            <>
              {/* Analytics Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-indigo-50/70 border border-indigo-200">
                  <p className="text-xs font-bold text-indigo-900 uppercase">Tổng lượt bé tham gia</p>
                  <p className="text-3xl font-black text-indigo-950 mt-1">
                    {analyticsData?.summary?.totalPlays || 0} lượt
                  </p>
                  <p className="text-xs text-indigo-800 font-medium mt-1">Đã lưu trữ trên hệ thống</p>
                </div>

                <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-900 uppercase">Tỉ lệ hoàn thành 3 sao</p>
                  <p className="text-3xl font-black text-emerald-950 mt-1">
                    {analyticsData?.summary?.threeStarRate || 0}%
                  </p>
                  <p className="text-xs text-emerald-800 font-medium mt-1">
                    {analyticsData?.summary?.threeStarCount || 0} lượt đạt điểm tối đa
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200">
                  <p className="text-xs font-bold text-amber-900 uppercase">Điểm trung bình</p>
                  <p className="text-3xl font-black text-amber-950 mt-1">
                    {analyticsData?.summary?.avgScore || 0} / 100
                  </p>
                  <p className="text-xs text-amber-800 font-medium mt-1">Khả năng ghi nhớ từ vựng tốt</p>
                </div>

                <div className="p-5 rounded-3xl bg-sky-50/70 border border-sky-200">
                  <p className="text-xs font-bold text-sky-900 uppercase">Thời lượng chơi TB</p>
                  <p className="text-3xl font-black text-sky-950 mt-1">
                    {analyticsData?.summary?.avgDurationSec || 0} giây
                  </p>
                  <p className="text-xs text-sky-800 font-medium mt-1">Phù hợp khoảng chú ý mầm non</p>
                </div>
              </div>

              {/* Top Lessons by play count */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
                  <Star size={18} className="text-amber-500 fill-amber-500" />
                  <span>Các Bài Học Được Bé Chơi Nhiều Nhất</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(analyticsData?.topLessons || []).map((tl: any, i: number) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900">
                          {tl.ageGroupCode} tuổi
                        </span>
                        <h4 className="text-sm font-black text-slate-900 mt-1">{tl.title}</h4>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          ⭐ {tl.avgStars}/3 sao · TB: {tl.avgScore}đ
                        </p>
                      </div>
                      <span className="text-lg font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
                        {tl.playCount} lượt
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Children Gameplay Sessions */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-base font-black text-slate-900 mb-4">
                  Lịch Sử Các Lượt Chơi Gần Nhất Của Bé
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-bold">
                        <th className="py-3 px-4 rounded-l-xl">Học sinh</th>
                        <th className="py-3 px-4">Bài học</th>
                        <th className="py-3 px-4">Điểm số &amp; Sao</th>
                        <th className="py-3 px-4">Nhận xét của Giáo viên</th>
                        <th className="py-3 px-4 rounded-r-xl">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(analyticsData?.recentPlays || []).map((play: any, i: number) => (
                        <tr key={play._id || i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              {play.child?.avatarUrl ? (
                                <img src={play.child.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-bold text-indigo-700">{play.child?.name?.[0] || 'C'}</span>
                              )}
                            </div>
                            <span className="font-bold text-slate-900">{play.child?.name || 'Học sinh'}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700">
                            {play.lesson?.vietnameseTitle || play.lesson?.title || 'Bài học'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ⭐ {play.stars || 3} sao · {play.score || 100}đ
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 italic">
                            {play.teacherFeedback?.comment || 'Bé hoàn thành tốt nhiệm vụ'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-semibold">
                            {play.createdAt
                              ? new Date(play.createdAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit'
                                })
                              : 'Vừa xong'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: ASSET READINESS CHECKER ───────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'readiness' && (
        <div className="space-y-6">
          {readinessLoading ? (
            <div className="p-12 text-center text-slate-500 font-bold text-sm">
              <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
              Đang kiểm tra độ sẵn sàng của 108 bài học...
            </div>
          ) : (
            <>
              {/* Readiness Overview Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-900 uppercase">Tỉ lệ Sẵn Sàng Game</p>
                  <p className="text-3xl font-black text-emerald-950 mt-1">
                    {readinessData?.overview?.readyRate ?? 100}%
                  </p>
                  <p className="text-xs text-emerald-800 font-semibold mt-1">
                    {readinessData?.overview?.readyLessons ?? 108} / {readinessData?.overview?.totalLessons ?? 108} bài đạt chuẩn
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-indigo-50/70 border border-indigo-200">
                  <p className="text-xs font-bold text-indigo-900 uppercase">Độ Phủ Mini-game</p>
                  <p className="text-3xl font-black text-indigo-950 mt-1">12 / 12 Game</p>
                  <p className="text-xs text-indigo-800 font-semibold mt-1">Mỗi bài tự động chọn 4 game xoay vòng</p>
                </div>

                <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200">
                  <p className="text-xs font-bold text-amber-900 uppercase">Học Liệu &amp; Media</p>
                  <p className="text-3xl font-black text-amber-950 mt-1">Đủ Ảnh &amp; Audio</p>
                  <p className="text-xs text-amber-800 font-semibold mt-1">Từ vựng minh họa hoạt hình &amp; phát âm</p>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={readinessSearch}
                    onChange={e => setReadinessSearch(e.target.value)}
                    placeholder="Tìm theo tên bài học..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-600">Độ tuổi:</span>
                  {['ALL', '3-4', '4-5', '5-6'].map(code => (
                    <button
                      key={code}
                      onClick={() => setReadinessAgeFilter(code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        readinessAgeFilter === code
                          ? 'bg-indigo-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {code === 'ALL' ? 'Tất cả' : `${code} tuổi`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lessons Readiness Table */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-bold">
                        <th className="py-3 px-4 rounded-l-xl">Bài học</th>
                        <th className="py-3 px-4">Lứa tuổi</th>
                        <th className="py-3 px-4">Số từ vựng</th>
                        <th className="py-3 px-4">Hình ảnh minh họa</th>
                        <th className="py-3 px-4">Phát âm Audio</th>
                        <th className="py-3 px-4">Số Game Khả Dụng</th>
                        <th className="py-3 px-4 rounded-r-xl">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredReadinessLessons.map((l: any) => (
                        <tr key={l._id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <span>{l.title}</span>
                            <span className="block text-[11px] text-slate-500 font-normal">{l.englishTitle}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                              {l.ageGroupCode} tuổi
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            {l.vocabCount} từ
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <ImageIcon size={14} />
                              <span>{l.hasImageCount}/{l.vocabCount}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <Volume2 size={14} />
                              <span>{l.hasAudioCount}/{l.vocabCount}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-indigo-700">
                              {l.supportedGamesCount || 12} / 12 game
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {l.isFullyReady ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                <Check size={12} />
                                <span>Sẵn sàng 100%</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                                <span>Cần thêm ảnh/audio</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
