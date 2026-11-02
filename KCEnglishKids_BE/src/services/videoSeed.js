const { VideoSeries, VideoEpisode } = require('../models');
const { CATALOG, SERIES, CATALOG_VERSION } = require('../seeds/videoSeedData');

/**
 * Non-destructive exact-catalogue seed.
 *
 * - Retires seeded catalogues from versions 1 and 2 (never admin-created series).
 * - Upserts by slug and episode number so existing `_id`s, progress and
 *   favourites survive a catalogue refresh.
 * - Writes the exact playback URLs and capability flags from the extraction.
 */
async function seedVideoLibrary({ log = false } = {}) {
  let seriesCreated = 0;
  let seriesUpdated = 0;
  let episodesCreated = 0;
  let episodesUpdated = 0;

  await VideoSeries.updateMany(
    { catalogVersion: { $in: [1, 2] }, isPublished: true },
    { $set: { isPublished: false } }
  );

  for (const entry of SERIES) {
    const { episodes, ...seriesFields } = entry;
    const existing = await VideoSeries.findOne({ slug: entry.slug }).select('_id').lean();

    let seriesId;
    if (!existing) {
      const created = await VideoSeries.create({
        slug: entry.slug,
        ...seriesFields,
        catalogVersion: CATALOG_VERSION,
        isPublished: true
      });
      seriesId = created._id;
      seriesCreated += 1;
    } else {
      seriesId = existing._id;
      await VideoSeries.updateOne(
        { _id: seriesId },
        { $set: { ...seriesFields, catalogVersion: CATALOG_VERSION, isPublished: true } }
      );
      seriesUpdated += 1;
    }

    if (episodes.length > 0) {
      const operations = episodes.map((episode) => ({
        updateOne: {
          filter: { series: seriesId, number: episode.number },
          update: { $set: { ...episode, series: seriesId, isPublished: true } },
          upsert: true
        }
      }));
      const result = await VideoEpisode.bulkWrite(operations, { ordered: false });
      episodesCreated += result.upsertedCount || 0;
      episodesUpdated += result.modifiedCount || 0;
    }

    // A previous seed may have stored a shorter sample list for this slug.
    await VideoEpisode.updateMany(
      { series: seriesId, number: { $gt: episodes.length } },
      { $set: { isPublished: false } }
    );
  }

  if (log) {
    console.log(
      `[VideoSeed] v${CATALOG_VERSION}: series added ${seriesCreated}, updated ${seriesUpdated}; ` +
        `episodes added ${episodesCreated}, updated ${episodesUpdated}`
    );
  }
  return { seriesCreated, seriesUpdated, episodesCreated, episodesUpdated };
}

let seedPromise = null;

async function inspectCatalogue() {
  const seriesIds = await VideoSeries.find({ catalogVersion: CATALOG_VERSION }).distinct('_id');
  if (seriesIds.length < SERIES.length) return false;
  const episodeCount = await VideoEpisode.countDocuments({
    series: { $in: seriesIds },
    isPublished: true
  });
  return episodeCount >= expectedEpisodes;
}

const expectedEpisodes = SERIES.reduce((sum, entry) => sum + entry.episodes.length, 0);

/** Seeds once per process and caches the result; safe to call from any request. */
async function ensureVideoSeed() {
  if (!seedPromise) {
    seedPromise = (async () => {
      if (await inspectCatalogue()) {
        return { seeded: false, seriesCreated: 0, seriesUpdated: 0, episodesCreated: 0, episodesUpdated: 0 };
      }
      const result = await seedVideoLibrary({ log: true });
      return { seeded: true, ...result };
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

const CATALOGUE_TOTALS = CATALOG.totals;

module.exports = {
  seedVideoLibrary,
  ensureVideoSeed,
  CATALOG_VERSION,
  CATALOGUE_TOTALS,
  expectedEpisodes
};
