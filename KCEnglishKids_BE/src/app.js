const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const topicRoutes = require('./routes/topicRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const activityRoutes = require('./routes/activityRoutes');
const vocabularyRoutes = require('./routes/vocabularyRoutes');
const learningRoutes = require('./routes/learningRoutes');
const progressRoutes = require('./routes/progressRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
// Phase 2/3 — new routes
const classroomSessionRoutes = require('./routes/classroomSessionRoutes');
const vocabMasteryRoutes = require('./routes/vocabMasteryRoutes');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'KCEnglishKids Backend API is running smoothly!',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/children', progressRoutes);
app.use('/api/children', vocabMasteryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/teacher/classroom-sessions', classroomSessionRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;

