import React from 'react';
import { Navigate } from 'react-router-dom';

export const TeacherLessonPlanner: React.FC = () => {
  return <Navigate to="/teacher/content" replace />;
};
