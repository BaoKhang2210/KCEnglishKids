const { Topic, Lesson, Progress } = require('../models');

// @desc    Get all topics (filtered by ageGroup)
// @route   GET /api/topics
// @access  Public / Child
const getTopics = async (req, res, next) => {
  try {
    const { ageGroup } = req.query;

    const query = { status: 'ACTIVE' };
    if (ageGroup) {
      query.ageGroupCodes = ageGroup;
    }

    const topics = await Topic.find(query)
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    // Enhance topics with lesson count
    const enrichedTopics = await Promise.all(
      topics.map(async topic => {
        const lessonQuery = { topic: topic._id, status: 'ACTIVE' };
        if (ageGroup) {
          lessonQuery.ageGroupCode = ageGroup;
        }
        const lessonCount = await Lesson.countDocuments(lessonQuery);

        return {
          ...topic,
          lessonCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedTopics.length,
      data: enrichedTopics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single topic by ID or Slug
// @route   GET /api/topics/:id
// @access  Public
const getTopicById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let topic;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      topic = await Topic.findById(id).populate('relatedUnits');
    } else {
      topic = await Topic.findOne({ slug: id.toLowerCase(), status: 'ACTIVE' }).populate('relatedUnits');
    }

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }

    res.status(200).json({
      success: true,
      data: topic
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lessons under a topic
// @route   GET /api/topics/:id/lessons
// @access  Public / Child
const getLessonsByTopic = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ageGroup, childId } = req.query;

    let topic;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      topic = await Topic.findById(id);
    } else {
      topic = await Topic.findOne({ slug: id.toLowerCase() });
    }

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }

    const lessonQuery = { topic: topic._id, status: 'ACTIVE' };
    if (ageGroup) {
      lessonQuery.ageGroupCode = ageGroup;
    }

    const lessons = await Lesson.find(lessonQuery)
      .populate('vocabularyItems', 'english vietnamese pronunciation imageUrl audioUrl')
      .sort({ displayOrder: 1 })
      .lean();

    // Attach child progress if childId is provided
    let enrichedLessons = lessons;
    if (childId) {
      const progressList = await Progress.find({ child: childId, topic: topic._id });
      const progressMap = {};
      progressList.forEach(p => {
        progressMap[p.lesson.toString()] = p;
      });

      enrichedLessons = lessons.map(lesson => ({
        ...lesson,
        progress: progressMap[lesson._id.toString()] || null
      }));
    }

    res.status(200).json({
      success: true,
      topic: {
        id: topic._id,
        englishName: topic.englishName,
        vietnameseName: topic.vietnameseName,
        colorCode: topic.colorCode,
        icon: topic.icon
      },
      count: enrichedLessons.length,
      data: enrichedLessons
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTopics,
  getTopicById,
  getLessonsByTopic
};
