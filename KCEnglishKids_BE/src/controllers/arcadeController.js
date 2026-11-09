const M = require('../models');
const { loadCatalog } = require('../services/gameCatalog');
const { usable } = require('../services/gameRules');

exports.library = async (req, res, next) => {
  try {
    const child = await M.User.findOne({ _id: req.params.childId, role: 'CHILD', status: 'ACTIVE' }).select('ageGroupCode');
    if (!child) return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh đang hoạt động.' });
    const [records, progresses, catalog] = await Promise.all([
      M.VocabularyMastery.find({ student: child._id, attemptCount: { $gt: 0 } }).select('vocabulary masteryLevel').lean(),
      M.Progress.find({ child: child._id, $or: [{ stage1Completed: true }, { completed: true }] }).select('lesson').lean(),
      loadCatalog()
    ]);
    const activeTopics = await M.Topic.find({ status: 'ACTIVE' }).distinct('_id');
    const activeUnits = await M.CurriculumUnit.find({ status: 'ACTIVE', ageGroupCode: child.ageGroupCode }).distinct('_id');
    const lessons = await M.Lesson.find({ status: 'ACTIVE', ageGroupCode: child.ageGroupCode, topic: { $in: activeTopics }, curriculumUnits: { $in: activeUnits } })
      .select('title vietnameseTitle vocabularyItems curriculumUnits displayOrder').populate('vocabularyItems')
      .populate('curriculumUnits', 'unitNumber title vietnameseTitle').sort({ displayOrder: 1 }).lean();
    const practiced = new Map(records.map(row => [String(row.vocabulary), row.masteryLevel]));
    const explored = new Set(progresses.map(row => String(row.lesson)));
    const words = new Map();
    const groups = [];
    for (const lesson of lessons) {
      const learned = (lesson.vocabularyItems || []).filter(word => word && word.status === 'ACTIVE' && word.imageUrl && (explored.has(String(lesson._id)) || practiced.has(String(word._id))));
      for (const word of learned) words.set(String(word._id), { ...word, masteryLevel: practiced.get(String(word._id)) ?? 0 });
      if (learned.length) groups.push({ _id: lesson._id, title: lesson.vietnameseTitle || lesson.title, unitNumber: lesson.curriculumUnits?.[0]?.unitNumber, wordIds: learned.map(word => String(word._id)) });
    }
    const vocabulary = [...words.values()];
    const games = catalog.games.filter(game => game.enabled && usable(game, vocabulary).length >= game.minVocab).map(game => game.id);
    res.json({ success: true, data: { ageGroupCode: child.ageGroupCode, vocabulary, lessons: groups, gameIds: games, catalogRevision: catalog.revision } });
  } catch (error) { next(error); }
};
