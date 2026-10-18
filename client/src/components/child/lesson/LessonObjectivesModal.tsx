import React from 'react';
import { X, Target, CheckCircle2 } from 'lucide-react';

interface LessonObjectivesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  objectives: string[];
}

export const LessonObjectivesModal: React.FC<LessonObjectivesModalProps> = ({
  isOpen,
  onClose,
  title = 'Mục tiêu bài học',
  objectives = []
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-4xl border-4 border-amber-300 p-6 sm:p-8 max-w-lg w-full text-left shadow-2xl relative animate-pop-in">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg cursor-pointer transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl flex-shrink-0">
            <Target className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">{title}</h3>
            <p className="text-xs font-bold text-slate-400">Kiến thức & Kỹ năng bé sẽ đạt được</p>
          </div>
        </div>

        <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-1">
          {objectives.length > 0 ? (
            objectives.map((obj, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-200/70">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-700 leading-snug">
                  {obj}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs font-bold text-slate-500 text-center py-4">
              Bài học này tập trung rèn luyện phản xạ ngôn ngữ tự nhiên và từ vựng cùng Koko!
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="btn-3d-amber w-full py-3 px-6 rounded-2xl font-black text-amber-950 text-sm flex items-center justify-center cursor-pointer shadow-md"
        >
          Đã hiểu, cùng học nào! 🚀
        </button>
      </div>
    </div>
  );
};
