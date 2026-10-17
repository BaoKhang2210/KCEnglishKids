import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RewardProvider } from './context/RewardContext';
import { StudentLoginPage } from './pages/child/StudentLoginPage';
import { ChildHomePage } from './pages/child/ChildHomePage';
import { TopicDetailPage } from './pages/child/TopicDetailPage';
import { LessonDetailPage } from './pages/child/LessonDetailPage';
import { ActivityPlayPage } from './pages/child/ActivityPlayPage';
import { TeacherLoginPage } from './dashboards/teacher/TeacherLoginPage';
import { TeacherLayout, TeacherDashboard, TeacherClasses, TeacherClassDetail, TeacherContent, TeacherAssignments, TeacherAssignmentDetail, TeacherStudents, TeacherStudentDetail, TeacherAnalytics } from './dashboards/teacher/TeacherWorkspace';
import { ClassroomSessionSetup } from './dashboards/teacher/ClassroomSessionSetup';
import { LiveSessionPage } from './dashboards/teacher/LiveSessionPage';
import { SessionSummaryPage } from './dashboards/teacher/SessionSummaryPage';
import { ClassroomSessionsList } from './dashboards/teacher/ClassroomSessionsList';
import { SentenceTeachingPage } from './dashboards/teacher/SentenceTeachingPage';
import { TeacherTeachingSchedule } from './dashboards/teacher/TeacherTeachingSchedule';
import { ChangePinPage } from './pages/child/ChangePinPage';
import { ErrorBoundary } from './components/ErrorBoundary';

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
  if (!user || user.role !== 'CHILD') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const ProtectedTeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-50" />;
  if (!user || user.role !== 'TEACHER') return <Navigate to="/teacher/login" replace />;
  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <RewardProvider>
        <Router>
          {/* §2.3.1 — catch any render error instead of a white screen */}
          <ErrorBoundary>
          <Routes>
          {/* Child Routes */}
          <Route path="/login" element={<StudentLoginPage />} />
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
            path="/child/change-pin"
            element={
              <ProtectedChildRoute>
                <ChangePinPage />
              </ProtectedChildRoute>
            }
          />

          {/* Teacher Routes (Classroom Teaching & Management) */}
          <Route path="/teacher/login" element={<TeacherLoginPage />} />
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
            <Route path="classroom-sessions" element={<ClassroomSessionsList />} />
            <Route path="sentences" element={<SentenceTeachingPage />} />
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
        </Router>
      </RewardProvider>
    </AuthProvider>
  );
}

export default App;
