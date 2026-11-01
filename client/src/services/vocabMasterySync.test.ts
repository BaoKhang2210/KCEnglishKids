import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {vocabMasteryService} from './vocabMasteryService';
import {vocabMasteryApi} from './api';
import {learningOutbox} from './learningOutbox';
import {vocabStatsService} from './vocabStatsService';
const word={_id:'012345678901234567890123',english:'cat',vietnamese:'mèo'};
beforeEach(()=>{
 const values=new Map<string,string>();
 vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value)});
 vi.stubGlobal('window',{dispatchEvent:vi.fn()});
 vi.spyOn(learningOutbox,'enqueueMastery').mockResolvedValue(undefined);
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('encountering a word never automatically marks it mastered',()=>{
 vocabMasteryService.registerJourneyWords('child-a',[word]);
 expect(vocabMasteryService.getAllLearnedWords('child-a')).toHaveLength(1);
 expect(vocabMasteryService.getMasteredWords('child-a')).toHaveLength(0);
});
it('a newer server record replaces a stale local label and removes stale mastered IDs',async()=>{
 vocabMasteryService.markMastered('child-a',word);
 vi.spyOn(vocabMasteryApi,'getChildMastery').mockResolvedValue({data:[{vocabulary:word,correctCount:1,wrongCount:2,attemptCount:3,masteryLevel:2,lastReviewedAt:new Date().toISOString()}]});
 await vocabMasteryService.syncWithBackend('child-a');
 expect(vocabMasteryService.getMasteredWords('child-a')).toHaveLength(0);
 expect(vocabMasteryService.getAllLearnedWords('child-a')[0].rememberCount).toBe(1);
});
it('synchronizes the observed answer and excludes helper requeues from mastery',()=>{
 const record=vi.spyOn(vocabMasteryService,'recordGameResult');
 vocabStatsService.recordAttempt('child-a',word._id,{type:'LT',ok:false,isFirstTry:false,vocab:word});
 expect(record).toHaveBeenCalledWith('child-a',word._id,false);
 record.mockClear();
 vocabStatsService.recordAttempt('child-a',word._id,{type:'LT',ok:true,isFirstTry:true,affectsMastery:false,vocab:word});
 expect(record).not.toHaveBeenCalled();
});
