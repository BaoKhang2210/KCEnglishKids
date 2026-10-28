import { api } from './api';

export type RecognitionKind = 'WEEK' | 'MONTH';
export interface RecognitionReward { title: string; symbol: string; description: string; suggestion: string }
export interface RecognitionRow { child: string; name: string; avatarUrl: string; stars: number; sessions: number; winner: boolean }
export interface RecognitionPreview {
  className: string;
  period: { kind: RecognitionKind; date: string; start: string; end: string; lastDate: string };
  ranking: RecognitionRow[];
  reward: RecognitionReward;
  published: { _id: string; publishedAt: string } | null;
  canPublish: boolean;
}
export interface ChildRecognition {
  _id: string; className: string; kind: RecognitionKind; periodStart: string; periodEnd: string;
  publishedAt: string; reward: RecognitionReward; name: string; stars: number; readAt: string | null;
}
export const recognitionApi = {
  classes: (): Promise<{ data: { _id: string; name: string; status: string }[] }> => api.get('/recognitions/classes'),
  preview: (classId: string, kind: RecognitionKind, date: string): Promise<{ data: RecognitionPreview }> =>
    api.get('/recognitions/classes/' + classId + '?kind=' + kind + '&date=' + encodeURIComponent(date)),
  publish: (classId: string, kind: RecognitionKind, date: string) =>
    api.post('/recognitions/classes/' + classId + '/publish', { kind, date }),
  mine: (): Promise<{ data: ChildRecognition[] }> => api.get('/recognitions/mine'),
  read: (id: string) => api.patch('/recognitions/mine/' + id + '/read')
};
export const recognitionDate = (value: string) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
