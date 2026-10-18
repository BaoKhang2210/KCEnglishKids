import React from 'react';
import {
  Stage2PracticeFlow,
  type Stage2PracticeFlowProps,
} from './lesson/Stage2PracticeFlow';

export const InteractivePracticeStudio: React.FC<Stage2PracticeFlowProps> = (props) => {
  return <Stage2PracticeFlow {...props} />;
};

export default InteractivePracticeStudio;
