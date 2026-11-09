import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '../context/AuthContext';
import { learningOutbox } from '../services/learningOutbox';
export function LearningSync() {
  const {user}=useAuth();
  const childId=user?.role==='CHILD' ? user._id || user.id : '';
  const count=useSyncExternalStore(listener=>{window.addEventListener('kc_learning_sync',listener);return()=>window.removeEventListener('kc_learning_sync',listener);},()=>childId?learningOutbox.pending(childId).length:0,()=>0);
  const retry=()=>{void learningOutbox.retryRejected(childId).catch(error=>{if(import.meta.env.DEV)console.warn('[LearningSync] Manual sync failed.',error);});};
  useEffect(()=>{
    if(!childId)return;
    const flush=async()=>{
      try {
        const hadPending=learningOutbox.pending(childId).length>0;
        await learningOutbox.flush(childId);
        if(hadPending&&!learningOutbox.pending(childId).length){const {vocabMasteryService}=await import('../services/vocabMasteryService');await vocabMasteryService.syncWithBackend(childId);}
      } catch (error) {
        // This runs on mount and on the browser's `online` event; never let a
        // background sync rejection become an uncaught promise in the app.
        if (import.meta.env.DEV) console.warn('[LearningSync] Background sync deferred.', error);
      }
    };
    void flush();window.addEventListener('online',flush);
    return()=>{window.removeEventListener('online',flush);};
  },[childId]);
  return count>0 ? <div role="status" className="fixed bottom-1 right-1 z-[190] rounded-xl bg-amber-100 px-3 py-2 text-xs text-slate-900 shadow">{count} kết quả đang chờ lưu. <button className="font-bold underline" onClick={retry}>Thử đồng bộ</button></div> : null;
}
