const {
  VideoSeries,
  VideoEpisode,
  VideoProgress,
  VideoFavorite,
  VideoReport
} = require('../models');
const {
  CONFIG,
  accessibleAgeGroups,
  isAgeAllowedForChild,
  levelsForAgeTab,
  accessibleLevelsFor,
  isLevelAllowedForChild,
  ageGroupsForLevel,
  seriesProgress,
  serializeProgress,
  mergeProgressEvent,
  effectiveClipEnd
} = require('../services/videoProgress');
const { ensureVideoSeed, CATALOGUE_TOTALS } = require('../services/videoSeed');
const { fetchSourceCues, fetchYouTubeCues } = require('../services/videoCues');
const { assertChildAccess, fail } = require('../services/childAccess');

const AGE_GROUPS = CONFIG.ageOrder;
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function viewerChildId(req, { required = false } = {}) {
  if (!req.user) {
    if (required) fail('Authorization required.', 401);
    return null;
  }
  if (req.user.role === 'CHILD') return req.user._id;
  if (!req.query.childId && !req.body?.childId) {
    if (required) fail('Missing childId.', 400);
    return null;
  }
  const childId = req.query.childId || req.body?.childId;
  await assertChildAccess(req, childId);
  return childId;
}

function parseBool(value) {
  return value === true || value === '1' || value === 'true' || value === 'yes';
}

function parseCsv(value, allowed) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => allowed.includes(item));
}

function rawProgress(doc) {
  if (!doc) return {};
  return {
    listen: { watchedPercent: doc.listen?.watchedPercent || 0 },
    read: { readIdx: doc.read?.readIdx || [] },
    speak: { markedIdx: doc.speak?.markedIdx || [] },
    quiz: { answers: doc.quiz?.answers || [] },
    dub: { done: Boolean(doc.dub?.done) },
    lastPositionSec: doc.lastPositionSec || 0
  };
}

function progressMapOf(docs) {
  const map = {};
  docs.forEach((doc) => {
    map[String(doc.episode)] = doc;
  });
  return map;
}

function episodeView(episode, series, progressDoc, { includeCues = false } = {}) {
  const progress = serializeProgress(episode, series, rawProgress(progressDoc));
  const cues = Array.isArray(episode.subtitles) ? episode.subtitles : [];
  const view = {
    _id: String(episode._id),
    number: episode.number,
    slug: episode.slug,
    lessonCode: episode.lessonCode || '',
    title: episode.title,
    subtitle: episode.subtitle || '',
    source: episode.source,
    videoUrl: episode.videoUrl || '',
    youtubeId: episode.youtubeId || '',
    duration: episode.duration,
    videoStartMs: episode.videoStartMs || 0,
    videoEndMs: episode.videoEndMs || 0,
    clipStart: episode.clipStart || 0,
    clipEnd: episode.clipEnd || 0,
    dialogueStartSec: episode.dialogueStartSec || 0,
    thumbnail: episode.thumbnail || '',
    captionCueCount: episode.captionCueCount || 0,
    canReading: Boolean(episode.canReading),
    canDubbing: Boolean(episode.canDubbing),
    dubbingVideoUrl: episode.dubbingVideoUrl || '',
    audioUrl: episode.audioUrl || '',
    cueUrl: episode.cueUrl || '',
    cueProxyAvailable: Boolean(episode.cueUrl),
    sourceChannelName: episode.sourceChannelName || '',
    learningMode: episode.learningMode || '',
    contentFormat: episode.contentFormat || '',
    difficultyLabel: episode.difficultyLabel || '',
    vocabulary: episode.vocabulary || [],
    cueCount: cues.length || episode.captionCueCount || 0,
    availableSkills: progress.availableSkills,
    progress
  };
  if (includeCues) view.cues = cues;
  return view;
}

function continueTarget(series, episodes, progressDocs) {
  const byEpisode = progressMapOf(progressDocs);
  const candidates = episodes
    .filter((episode) => episode.isPublished !== false)
    .map((episode) => {
      const doc = byEpisode[String(episode._id)];
      const progress = serializeProgress(episode, series, rawProgress(doc));
      return { episode, doc, progress };
    });
  const hasAnyProgress = candidates.some(
    (item) => Boolean(item.doc) || item.progress.watchedPercent > 0 || item.progress.percent > 0 || item.progress.completed
  );
  if (!hasAnyProgress) return null;

  const inProgress = candidates
    .filter((item) => !item.progress.completed && item.progress.lastPositionSec > 0)
    .sort((a, b) => new Date(b.doc?.updatedAt || 0) - new Date(a.doc?.updatedAt || 0));
  const chosen = inProgress[0] || candidates.find((item) => !item.progress.completed) || null;
  if (!chosen) return null;
  return {
    episodeId: String(chosen.episode._id),
    number: chosen.episode.number,
    slug: chosen.episode.slug,
    title: chosen.episode.title,
    thumbnail: chosen.episode.thumbnail || series.thumbnail || '',
    lastPositionSec: chosen.progress.lastPositionSec,
    watchedPercent: chosen.progress.watchedPercent,
    percent: chosen.progress.percent
  };
}

function levelMetaOf(series) {
  const meta = CONFIG.levelMeta?.[series.level] || {};
  const ages = ageGroupsForLevel(series.level);
  const ageMin = Number.isFinite(Number(series.ageMin)) ? Number(series.ageMin) : meta.ageMin;
  const ageMax = Number.isFinite(Number(series.ageMax)) ? Number(series.ageMax) : meta.ageMax;
  return {
    levelLabel: meta.label || series.level,
    ageLabel: meta.ageLabel || (ageMin && ageMax ? `${ageMin}–${ageMax} tuổi` : ''),
    ageMin: Number.isFinite(ageMin) ? ageMin : null,
    ageMax: Number.isFinite(ageMax) ? ageMax : null,
    ageGroups: ages
  };
}

function seriesView(series, episodes, progressDocs, { favorite = false, childId = null } = {}) {
  const published = episodes.filter((episode) => episode.isPublished !== false);
  const summary = seriesProgress(series, published, progressMapOf(progressDocs));
  const availableSkills = [...new Set(
    published.flatMap((episode) => serializeProgress(episode, series, {}).availableSkills)
  )];
  const meta = levelMetaOf(series);
  const declaredEpisodes = Math.max(Number(series.episodeCount) || 0, summary.episodeCount);
  return {
    _id: String(series._id),
    slug: series.slug,
    title: series.title,
    titleEn: series.titleEn || '',
    subtitle: series.subtitle || '',
    description: series.description || '',
    thumbnail: series.thumbnail || '',
    level: series.level,
    levelLabel: meta.levelLabel,
    levelTitle: series.levelTitle || '',
    targetAge: series.targetAge || '',
    ageMin: meta.ageMin,
    ageMax: meta.ageMax,
    ageLabel: meta.ageLabel,
    ageGroups: meta.ageGroups,
    topicCode: series.topicCode || '',
    difficultyLabel: series.difficultyLabel || '',
    source: series.source,
    sourceLabel: CONFIG.sourceMeta?.[series.source]?.label || series.source,
    hasDubbing: Boolean(series.hasDubbing),
    dubbingCount: Number(series.dubbingCount) || 0,
    order: series.order || 0,
    episodeCount: declaredEpisodes,
    availableEpisodeCount: summary.episodeCount,
    completedEpisodes: summary.completedEpisodes,
    isFavorite: Boolean(favorite),
    availableSkills,
    firstEpisode: published[0]
      ? {
          episodeId: String(published[0]._id),
          number: published[0].number,
          slug: published[0].slug,
          title: published[0].title
        }
      : null,
    progress: {
      percent: summary.percent,
      completed: summary.completed,
      continue: childId ? continueTarget(series, published, progressDocs) : null
    }
  };
}

function buildFacets(seriesList, episodesBySeries) {
  const byAgeGroup = Object.fromEntries(CONFIG.ageOrder.map((age) => [age, 0]));
  const byLevel = Object.fromEntries(CONFIG.levels.map((level) => [level, 0]));
  const bySource = Object.fromEntries(CONFIG.sources.map((source) => [source, 0]));
  const dubbing = { yes: 0, no: 0 };
  let totalEpisodes = 0;
  let availableEpisodes = 0;

  seriesList.forEach((series) => {
    ageGroupsForLevel(series.level).forEach((age) => {
      if (byAgeGroup[age] !== undefined) byAgeGroup[age] += 1;
    });
    byLevel[series.level] = (byLevel[series.level] || 0) + 1;
    bySource[series.source] = (bySource[series.source] || 0) + 1;
    dubbing[series.hasDubbing ? 'yes' : 'no'] += 1;
    const available = episodesBySeries.get(String(series._id))?.length || 0;
    totalEpisodes += Math.max(Number(series.episodeCount) || 0, available);
    availableEpisodes += available;
  });

  return {
    total: seriesList.length,
    totalEpisodes,
    availableEpisodes,
    byAgeGroup,
    byLevel,
    bySource,
    dubbing
  };
}

// GET /api/videos/series
const listSeries = async (req, res, next) => {
  try {
    await ensureVideoSeed();
    const childId = await viewerChildId(req);
    const childAge = req.user?.role === 'CHILD' ? req.user.ageGroupCode : null;

    const allowedLevels = CONFIG.levels;
    const requestedLevels = parseCsv(req.query.level, CONFIG.levels);

    const query = { isPublished: true, catalogVersion: CONFIG.version };
    if (requestedLevels.length) {
      query.level = { $in: requestedLevels };
    }

    const sources = parseCsv(req.query.source, CONFIG.sources);
    if (sources.length) query.source = { $in: sources };
    if (req.query.hasDubbing !== undefined) query.hasDubbing = parseBool(req.query.hasDubbing);
    if (req.query.search) {
      const term = escapeRegex(String(req.query.search).trim().slice(0, 80));
      if (term) {
        query.$or = [
          { title: { $regex: term, $options: 'i' } },
          { titleEn: { $regex: term, $options: 'i' } },
          { subtitle: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } }
        ];
      }
    }

    let favorites = [];
    if (childId) {
      favorites = await VideoFavorite.find({ child: childId }).select('series').lean();
    }
    const favoriteIds = new Set(favorites.map((item) => String(item.series)));
    if (parseBool(req.query.favorite)) {
      if (!childId) return res.status(401).json({ success: false, message: 'Sign in as a child to use favorites.' });
      query._id = { $in: [...favoriteIds] };
    }

    const seriesList = await VideoSeries.find(query).sort({ order: 1, createdAt: 1 }).lean();
    const seriesIds = seriesList.map((series) => series._id);
    const episodes = await VideoEpisode.find({ series: { $in: seriesIds }, isPublished: true })
      .sort({ number: 1 })
      .lean();
    const episodeIds = episodes.map((episode) => episode._id);
    const progressDocs = childId
      ? await VideoProgress.find({ child: childId, episode: { $in: episodeIds } }).lean()
      : [];
    const progressByEpisode = progressMapOf(progressDocs);
    const episodesBySeries = new Map();
    episodes.forEach((episode) => {
      const key = String(episode.series);
      if (!episodesBySeries.has(key)) episodesBySeries.set(key, []);
      episodesBySeries.get(key).push(episode);
    });

    const data = seriesList.map((series) =>
      seriesView(series, episodesBySeries.get(String(series._id)) || [], progressDocs, {
        favorite: favoriteIds.has(String(series._id)),
        childId
      })
    );

    const facets = buildFacets(seriesList, episodesBySeries);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
      meta: {
        ageGroup: null,
        childAge,
        accessibleAgeGroups: AGE_GROUPS,
        levels: requestedLevels.length ? requestedLevels : CONFIG.levels,
        accessibleLevels: allowedLevels,
        levelOrder: CONFIG.levels,
        levelMeta: CONFIG.levelMeta,
        levelAgeGroups: CONFIG.levelAgeGroups,
        sourceMeta: CONFIG.sourceMeta,
        ageOrder: AGE_GROUPS,
        // Exact source-catalogue totals across all 5 levels.
        catalogue: {
          total: CATALOGUE_TOTALS.series,
          totalEpisodes: CATALOGUE_TOTALS.lessons,
          byLevel: CATALOGUE_TOTALS.byLevel,
          bySource: {
            youtube: CATALOGUE_TOTALS.youtubeSeries,
            stored: CATALOGUE_TOTALS.storedSeries
          }
        },
        facets
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/videos/series/:idOrSlug
const getSeries = async (req, res, next) => {
  try {
    await ensureVideoSeed();
    const { idOrSlug } = req.params;
    const childId = await viewerChildId(req);
    const query = /^[0-9a-fA-F]{24}$/.test(idOrSlug)
      ? { _id: idOrSlug, isPublished: true }
      : { slug: String(idOrSlug).toLowerCase(), isPublished: true };
    const series = await VideoSeries.findOne(query).lean();
    if (!series) return res.status(404).json({ success: false, message: 'Video series not found.' });

    const episodes = await VideoEpisode.find({ series: series._id, isPublished: true }).sort({ number: 1 }).lean();
    const progressDocs = childId
      ? await VideoProgress.find({ child: childId, series: series._id }).lean()
      : [];
    const favorite = childId
      ? Boolean(await VideoFavorite.exists({ child: childId, series: series._id }))
      : false;
    const progressByEpisode = progressMapOf(progressDocs);

    const data = seriesView(series, episodes, progressDocs, { favorite, childId });
    data.attribution = series.attribution || '';
    // Series summaries stay light: real series have up to 126 lessons. Cue text
    // is loaded per episode (when licensed cues exist) through getEpisode.
    data.episodes = episodes.map((episode) =>
      episodeView(episode, series, progressByEpisode[String(episode._id)])
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/videos/episodes/:episodeId
const getEpisode = async (req, res, next) => {
  try {
    const episode = await VideoEpisode.findOne({ _id: req.params.episodeId, isPublished: true }).lean();
    if (!episode) return res.status(404).json({ success: false, message: 'Video episode not found.' });
    const series = await VideoSeries.findOne({ _id: episode.series, isPublished: true }).lean();
    if (!series) return res.status(404).json({ success: false, message: 'Video series not found.' });
    const childId = await viewerChildId(req);
    const progressDoc = childId
      ? await VideoProgress.findOne({ child: childId, episode: episode._id }).lean()
      : null;
    const episodeFields = episodeView(episode, series, progressDoc, { includeCues: true });
    const meta = levelMetaOf(series);
    res.status(200).json({
      success: true,
      data: {
        episode: episodeFields,
        series: {
          _id: String(series._id),
          slug: series.slug,
          title: series.title,
          titleEn: series.titleEn || '',
          subtitle: series.subtitle || '',
          thumbnail: series.thumbnail || '',
          level: series.level,
          levelLabel: meta.levelLabel,
          levelTitle: series.levelTitle || '',
          targetAge: series.targetAge || '',
          ageLabel: meta.ageLabel,
          ageMin: meta.ageMin,
          ageMax: meta.ageMax,
          ageGroups: meta.ageGroups,
          topicCode: series.topicCode || '',
          difficultyLabel: series.difficultyLabel || '',
          source: series.source,
          sourceLabel: CONFIG.sourceMeta?.[series.source]?.label || series.source,
          episodeCount: Number(series.episodeCount) || 0,
          hasDubbing: Boolean(series.hasDubbing),
          dubbingCount: Number(series.dubbingCount) || 0,
          attribution: series.attribution || ''
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/videos/episodes/:episodeId/cues
const getEpisodeCues = async (req, res, next) => {
  try {
    const episode = await VideoEpisode.findOne({ _id: req.params.episodeId, isPublished: true }).lean();
    if (!episode) return res.status(404).json({ success: false, message: 'Video episode not found.' });
    const series = await VideoSeries.findOne({ _id: episode.series, isPublished: true }).select('level').lean();
    if (!series) return res.status(404).json({ success: false, message: 'Video series not found.' });
    const stored = Array.isArray(episode.subtitles) ? episode.subtitles : [];
    if (stored.length > 0) {
      return res.status(200).json({
        success: true,
        data: { cues: stored, count: stored.length, source: 'stored', unavailable: false }
      });
    }
    if (!episode.cueUrl) {
      if (episode.source === 'youtube' && episode.youtubeId) {
        try {
          const ytCues = await fetchYouTubeCues(episode.youtubeId);
          return res.status(200).json({
            success: true,
            data: { cues: ytCues, count: ytCues.length, source: 'youtube', unavailable: ytCues.length === 0 }
          });
        } catch {
          // Captions are a runtime enhancement; numbered markers still work.
          return res.status(200).json({
            success: true,
            data: { cues: [], count: 0, source: 'youtube', unavailable: true }
          });
        }
      }
      return res.status(200).json({
        success: true,
        data: { cues: [], count: 0, source: 'none', unavailable: false }
      });
    }
    try {
      const cues = await fetchSourceCues(episode.cueUrl);
      return res.status(200).json({
        success: true,
        data: { cues, count: cues.length, source: 'source', unavailable: cues.length === 0 }
      });
    } catch {
      // A missing third-party cue file must not block watching the lesson.
      return res.status(200).json({
        success: true,
        data: { cues: [], count: 0, source: 'source', unavailable: true }
      });
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/videos/continue
const continueWatching = async (req, res, next) => {
  try {
    const childId = await viewerChildId(req, { required: true });
    const docs = await VideoProgress.find({ child: childId, completed: false, lastPositionSec: { $gt: 0 } })
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();
    if (!docs.length) return res.status(200).json({ success: true, data: [] });

    const episodes = await VideoEpisode.find({ _id: { $in: docs.map((doc) => doc.episode) }, isPublished: true }).lean();
    const episodeMap = new Map(episodes.map((episode) => [String(episode._id), episode]));
    const seriesList = await VideoSeries.find({
      _id: { $in: episodes.map((episode) => episode.series) },
      isPublished: true
    }).lean();
    const seriesMap = new Map(seriesList.map((series) => [String(series._id), series]));

    const data = [];
    for (const doc of docs) {
      const episode = episodeMap.get(String(doc.episode));
      const series = episode ? seriesMap.get(String(episode.series)) : null;
      if (!episode || !series) continue;
      const progress = serializeProgress(episode, series, rawProgress(doc));
      const meta = levelMetaOf(series);
      data.push({
        episodeId: String(episode._id),
        episodeNumber: episode.number,
        episodeTitle: episode.title,
        seriesId: String(series._id),
        seriesSlug: series.slug,
        seriesTitle: series.title,
        thumbnail: episode.thumbnail || series.thumbnail || '',
        level: series.level,
        levelLabel: meta.levelLabel,
        ageLabel: meta.ageLabel,
        source: series.source,
        lastPositionSec: progress.lastPositionSec,
        watchedPercent: progress.watchedPercent,
        percent: progress.percent,
        availableSkills: progress.availableSkills,
        updatedAt: doc.updatedAt
      });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// PUT /api/videos/progress/:episodeId
const saveProgress = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'CHILD') {
      return res.status(403).json({ success: false, message: 'Only the child may submit learning evidence.' });
    }
    await assertChildAccess(req, req.user._id, true);
    const episode = await VideoEpisode.findOne({ _id: req.params.episodeId, isPublished: true }).lean();
    if (!episode) return res.status(404).json({ success: false, message: 'Video episode not found.' });
    const series = await VideoSeries.findOne({ _id: episode.series, isPublished: true }).lean();
    if (!series) return res.status(404).json({ success: false, message: 'Video series not found.' });

    const event = req.body?.event || req.body;
    const existing = await VideoProgress.findOne({ child: req.user._id, episode: episode._id }).lean();
    let merged;
    try {
      merged = mergeProgressEvent(existing, event, episode, series);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }

    const doc = await VideoProgress.findOneAndUpdate(
      { child: req.user._id, episode: episode._id },
      { $set: { ...merged, series: series._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(200).json({
      success: true,
      data: {
        ...serializeProgress(episode, series, rawProgress(doc)),
        updatedAt: doc.updatedAt,
        clipEnd: effectiveClipEnd(episode)
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/videos/series/:seriesId/favorite
const toggleFavorite = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'CHILD') {
      return res.status(403).json({ success: false, message: 'Only the child may manage favorites.' });
    }
    const series = await VideoSeries.findOne({ _id: req.params.seriesId, isPublished: true }).lean();
    if (!series) return res.status(404).json({ success: false, message: 'Video series not found.' });
    const existing = await VideoFavorite.findOne({ child: req.user._id, series: series._id });
    let favorite;
    if (req.body?.favorite === undefined) {
      favorite = !existing;
    } else {
      favorite = parseBool(req.body.favorite);
    }
    if (favorite && !existing) {
      await VideoFavorite.create({ child: req.user._id, series: series._id });
    } else if (!favorite && existing) {
      await VideoFavorite.deleteOne({ _id: existing._id });
    }
    res.status(200).json({ success: true, data: { favorite: Boolean(favorite) } });
  } catch (error) {
    next(error);
  }
};

// POST /api/videos/reports
const createReport = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'CHILD') {
      return res.status(403).json({ success: false, message: 'Only the child may send a report.' });
    }
    const content = String(req.body?.content || '').trim();
    if (!content || content.length > 1000) {
      return res.status(400).json({ success: false, message: 'Report content must be 1-1000 characters.' });
    }
    const episode = await VideoEpisode.findOne({ _id: req.body?.episodeId, isPublished: true }).lean();
    if (!episode) return res.status(404).json({ success: false, message: 'Video episode not found.' });
    const report = await VideoReport.create({
      child: req.user._id,
      episode: episode._id,
      cueIdx: Number.isInteger(Number(req.body?.cueIdx)) ? Number(req.body.cueIdx) : null,
      content
    });
    res.status(201).json({
      success: true,
      data: { _id: String(report._id), status: report.status, createdAt: report.createdAt }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSeries,
  getSeries,
  getEpisode,
  getEpisodeCues,
  continueWatching,
  saveProgress,
  toggleFavorite,
  createReport
};
