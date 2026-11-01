import React, { lazy, Suspense } from 'react';
import { LearningSync } from './components/LearningSync';
import { StaffSurface } from './components/staff/StaffSurface';
const ClassRecognitionsPage = lazy(() => import('./dashboards/shared/ClassRecognitionsPage').then(module => ({default:module.ClassRecognitionsPage})));
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { RewardProvider } from './context/RewardContext';
const StudentLoginPage = lazy(() => import('./pages/child/StudentLoginPage').then(module => ({default:module.StudentLoginPage})));
const ChildHomePage = lazy(() => import('./pages/child/ChildHomePage').then(module => ({default:module.ChildHomePage})));
const TopicDetailPage = lazy(() => import('./pages/child/TopicDetailPage').then(module => ({default:module.TopicDetailPage})));
const LessonDetailPage = lazy(() => import('./pages/child/LessonDetailPage').then(module => ({default:module.LessonDetailPage})));
const ActivityPlayPage = lazy(() => import('./pages/child/ActivityPlayPage').then(module => ({default:module.ActivityPlayPage})));
const TeacherLoginPage = lazy(() => import('./dashboards/teacher/TeacherLoginPage').then(module => ({default:module.TeacherLoginPage})));
const TeacherLayout = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherLayout})));
const TeacherDashboard = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherDashboard})));
const TeacherClasses = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherClasses})));
const TeacherClassDetail = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherClassDetail})));
const TeacherContent = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherContent})));
const TeacherAssignments = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherAssignments})));
const TeacherAssignmentDetail = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherAssignmentDetail})));
const TeacherStudents = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherStudents})));
const TeacherStudentDetail = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherStudentDetail})));
const TeacherAnalytics = lazy(() => import('./dashboards/teacher/TeacherWorkspace').then(module => ({default:module.TeacherAnalytics})));
const TeacherInbox = lazy(() => import('./dashboards/teacher/TeacherInbox').then(module => ({default:module.TeacherInbox})));
import './styles/teacher.css';
const ClassroomSessionSetup = lazy(() => import('./dashboards/teacher/ClassroomSessionSetup').then(module => ({default:module.ClassroomSessionSetup})));
const LiveSessionPage = lazy(() => import('./dashboards/teacher/LiveSessionPage').then(module => ({default:module.LiveSessionPage})));
const SessionSummaryPage = lazy(() => import('./dashboards/teacher/SessionSummaryPage').then(module => ({default:module.SessionSummaryPage})));
const ClassroomSessionsList = lazy(() => import('./dashboards/teacher/ClassroomSessionsList').then(module => ({default:module.ClassroomSessionsList})));
const SentenceTeachingPage = lazy(() => import('./dashboards/teacher/SentenceTeachingPage').then(module => ({default:module.SentenceTeachingPage})));
const TeacherTeachingSchedule = lazy(() => import('./dashboards/teacher/TeacherTeachingSchedule').then(module => ({default:module.TeacherTeachingSchedule})));
const TeacherLessonPlanner = lazy(() => import('./dashboards/teacher/TeacherLessonPlanner').then(module => ({default:module.TeacherLessonPlanner})));
const LearningStudioPage = lazy(() => import('./dashboards/teacher/LearningStudioPage').then(module=>({default:module.LearningStudioPage})));
const HomePracticePage = lazy(() => import('./dashboards/teacher/HomePracticePage').then(module=>({default:module.HomePracticePage})));
const UnitReviewPage = lazy(() => import('./dashboards/teacher/UnitReviewPage').then(module=>({default:module.UnitReviewPage})));
const ChangePinPage = lazy(() => import('./pages/child/ChangePinPage').then(module => ({default:module.ChangePinPage})));
const RecoverAccountPage = lazy(() => import('./pages/child/RecoverAccountPage').then(module => ({default:module.RecoverAccountPage})));
import { ErrorBoundary } from './components/ErrorBoundary';

// Admin Portal Pages
const AdminLoginPage = lazy(() => import('./dashboards/admin/AdminLoginPage').then(module => ({default:module.AdminLoginPage})));
const AdminLayout = lazy(() => import('./dashboards/admin/AdminLayout').then(module => ({default:module.AdminLayout})));
const AdminDashboardPage = lazy(() => import('./dashboards/admin/AdminDashboardPage').then(module => ({default:module.AdminDashboardPage})));
const AdminClassroomsPage = lazy(() => import('./dashboards/admin/AdminClassroomsPage').then(module => ({default:module.AdminClassroomsPage})));
const AdminCurriculumPage = lazy(() => import('./dashboards/admin/AdminCurriculumPage').then(module => ({default:module.AdminCurriculumPage})));
const AdminSentencesPage = lazy(() => import('./dashboards/admin/AdminSentencesPage').then(module => ({default:module.AdminSentencesPage})));
const AdminUsersPage = lazy(() => import('./dashboards/admin/AdminUsersPage').then(module => ({default:module.AdminUsersPage})));
const AdminLogsPage = lazy(() => import('./dashboards/admin/AdminLogsPage').then(module => ({default:module.AdminLogsPage})));
const AdminAnalyticsPage = lazy(() => import('./dashboards/admin/AdminAnalyticsPage').then(module => ({default:module.AdminAnalyticsPage})));
const AdminSchedulePage = lazy(() => import('./dashboards/admin/AdminSchedulePage').then(module => ({default:module.AdminSchedulePage})));
const AdminGamesPage = lazy(() => import('./dashboards/admin/AdminGamesPage').then(module => ({default:module.AdminGamesPage})));

const MyLearningPage = lazy(() => import('./pages/child/MyLearningPage').then(module=>({default:module.MyLearningPage})));

// Protected Route wrapper for Child
const ProtectedChildRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user || (user.role !== 'CHILD' && user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const ProtectedTeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-50" />;
  if (!user || user.role !== 'TEACHER') return <Navigate to="/teacher/login" replace />;
  return <StaffSurface className="teacher-surface">{children}</StaffSurface>;
};

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-900" />;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/admin/login" replace />;
  return <StaffSurface>{children}</StaffSurface>;
};

export function App() {
  return (
    <AuthProvider>
      <LearningSync/>
      <ThemeProvider>
        <RewardProvider>
          <Router>
          {/* §2.3.1 — catch any render error instead of a white screen */}
          <ErrorBoundary>
          <Suspense fallback={<div role="status" className="grid min-h-screen place-items-center bg-amber-50 text-slate-800">Đang mở trang…</div>}><Routes>
          {/* Child Routes */}
          <Route path="/my-learning" element={<ProtectedChildRoute><MyLearningPage/></ProtectedChildRoute>}/>
          <Route path="/login" element={<StudentLoginPage />} />
          <Route path="/recover" element={<RecoverAccountPage />} />
          <Route
            path="/"
            element={
              <ProtectedChildRoute>
                <ChildHomePage />
              </ProtectedChildRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedChildRoute>
                <ChildHomePage />
              </ProtectedChildRoute>
            }
          />
          <Route
            path="/topics/:slug"
            element={
              <ProtectedChildRoute>
                <TopicDetailPage />
              </ProtectedChildRoute>
            }
          />
          <Route
            path="/lessons/:id"
            element={
              <ProtectedChildRoute>
                <LessonDetailPage />
              </ProtectedChildRoute>
            }
          />
          <Route
            path="/activities/:id"
            element={
              <ProtectedChildRoute>
                <ActivityPlayPage />
              </ProtectedChildRoute>
            }
          />
          <Route
            path="/activity/:id"
            element={
              <ProtectedChildRoute>
                <ActivityPlayPage />
              </ProtectedChildRoute>
            }
          />
          <Route
            path="/child/change-pin"
            element={
              <ProtectedChildRoute>
                <ChangePinPage />
              </ProtectedChildRoute>
            }
          />

          {/* Teacher Routes (Classroom Teaching & Management) */}
          <Route path="/teacher/login" element={<StaffSurface><TeacherLoginPage /></StaffSurface>} />
          <Route path="/teacher" element={<ProtectedTeacherRoute><TeacherLayout /></ProtectedTeacherRoute>}>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="schedule" element={<TeacherTeachingSchedule />} />
            <Route path="classes" element={<TeacherClasses />} />
            <Route path="classes/:classId" element={<TeacherClassDetail />} />
            <Route path="content" element={<TeacherContent />} />
            <Route path="assignments" element={<TeacherAssignments />} />
            <Route path="assignments/:assignmentId" element={<TeacherAssignmentDetail />} />
            <Route path="students" element={<TeacherStudents />} />
            <Route path="students/:studentId" element={<TeacherStudentDetail />} />
            <Route path="analytics" element={<TeacherAnalytics />} />
            <Route path="notifications" element={<TeacherInbox />} />
            <Route path="recognitions" element={<ClassRecognitionsPage />} />
            <Route path="classroom-sessions" element={<ClassroomSessionsList />} />
            <Route path="sentences" element={<SentenceTeachingPage />} />
            <Route path="lesson-planner" element={<TeacherLessonPlanner />} />
            <Route path="learning-studio" element={<LearningStudioPage />} />
            <Route path="home-practice" element={<HomePracticePage />} />
            <Route path="unit-review" element={<UnitReviewPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Teacher Session Routes — full screen, outside TeacherLayout */}
          <Route
            path="/teacher/classroom-sessions/new"
            element={<ProtectedTeacherRoute><ClassroomSessionSetup /></ProtectedTeacherRoute>}
          />
          <Route
            path="/teacher/classes/:classId/sessions/new"
            element={<ProtectedTeacherRoute><ClassroomSessionSetup /></ProtectedTeacherRoute>}
          />
          <Route
            path="/teacher/classroom-sessions/:sessionId/live"
            element={<ProtectedTeacherRoute><LiveSessionPage /></ProtectedTeacherRoute>}
          />
          <Route
            path="/teacher/classroom-sessions/:sessionId/summary"
            element={<ProtectedTeacherRoute><SessionSummaryPage /></ProtectedTeacherRoute>}
          />

          {/* Admin Routes (Curriculum, Sentence Library, Classrooms, Teachers, Users) */}
          <Route path="/admin/login" element={<StaffSurface><AdminLoginPage /></StaffSurface>} />
          <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="classrooms" element={<AdminClassroomsPage />} />
            <Route path="schedule" element={<AdminSchedulePage />} />
            <Route path="curriculum" element={<AdminCurriculumPage />} />
            <Route path="sentences" element={<AdminSentencesPage />} />
            <Route path="games" element={<AdminGamesPage />} />
            <Route path="learning-studio" element={<LearningStudioPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="recognitions" element={<ClassRecognitionsPage />} />
            <Route path="audit-logs" element={<AdminLogsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></Suspense>
          </ErrorBoundary>
        </Router>
      </RewardProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
