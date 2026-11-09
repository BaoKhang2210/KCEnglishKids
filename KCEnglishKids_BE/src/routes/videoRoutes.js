const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middlewares/authMiddleware');
const {
  listSeries,
  getSeries,
  getEpisode,
  getEpisodeCues,
  continueWatching,
  saveProgress,
  toggleFavorite,
  createReport
} = require('../controllers/videoController');

router.get('/series', optionalProtect, listSeries);
router.get('/series/:idOrSlug', optionalProtect, getSeries);
router.get('/episodes/:episodeId', optionalProtect, getEpisode);
router.get('/episodes/:episodeId/cues', optionalProtect, getEpisodeCues);
router.get('/continue', protect, continueWatching);
router.put('/progress/:episodeId', protect, saveProgress);
router.post('/series/:seriesId/favorite', protect, toggleFavorite);
router.post('/reports', protect, createReport);

module.exports = router;
