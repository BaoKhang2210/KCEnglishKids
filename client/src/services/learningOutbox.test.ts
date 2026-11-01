import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {learningOutbox} from './learningOutbox';
let values:Map<string,string>;
const token=(id:string)=>'header.'+btoa(JSON.stringify({id}))+'.signature';
beforeEach(()=>{
 values=new Map([['kc_token',token('child-a')]]);
 vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});
 vi.stubGlobal('window',{dispatchEvent:vi.fn()});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('durable learning synchronization',()=>{
 it('keeps the same submission across a network failure and later retry',async()=>{
  const fetcher=vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(new Response(JSON.stringify({success:true}),{status:200}));vi.stubGlobal('fetch',fetcher);
  await learningOutbox.enqueue('child-a','lesson-a',{stage:1});
  expect(learningOutbox.pending('child-a')).toHaveLength(1);
  const submissionId=learningOutbox.pending('child-a')[0].payload.submissionId;
  await learningOutbox.flush('child-a');
  expect(learningOutbox.pending('child-a')).toHaveLength(0);
  expect(JSON.parse(fetcher.mock.calls[1][1].body).submissionId).toBe(submissionId);
 });
 it('never sends one child evidence with a different logged-in account',async()=>{
  vi.stubGlobal('fetch',vi.fn());values.set('kc_token',token('child-b'));
  await learningOutbox.enqueue('child-a','lesson-a',{stage:1});
  expect(fetch).not.toHaveBeenCalled();expect(learningOutbox.pending('child-a')).toHaveLength(1);
 });
 it('preserves a second queued result while the first request is still pending',async()=>{
  let release!:()=>void;const blocked=new Promise<void>(resolve=>{release=resolve;});
  const fetcher=vi.fn().mockImplementationOnce(async()=>{await blocked;return new Response('{"success":true}');}).mockImplementation(async()=>new Response('{"success":true}'));vi.stubGlobal('fetch',fetcher);
  const first=learningOutbox.enqueue('child-a','lesson-a',{stage:1});
  const second=learningOutbox.enqueue('child-a','lesson-a',{stage:2});
  release();await Promise.all([first,second]);
  expect(fetcher).toHaveBeenCalledTimes(2);expect(learningOutbox.pending('child-a')).toHaveLength(0);
 });
 it('reports storage failure instead of claiming a durable save',async()=>{
  vi.stubGlobal('fetch',vi.fn());vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw Error('quota');}});
  await expect(learningOutbox.enqueue('child-a','lesson-a',{stage:1})).rejects.toThrow('quota');expect(fetch).not.toHaveBeenCalled();
 });
 it('keeps a rejected lesson visible and still synchronizes unrelated vocabulary',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url:string)=>url.includes('/stage')?new Response('{"message":"Lesson hidden"}',{status:409}):new Response('{"success":true}')));
  await expect(learningOutbox.enqueue('child-a','lesson-a',{stage:1})).rejects.toThrow('Lesson hidden');
  await learningOutbox.enqueueMastery('child-a','word-a',true);
  expect(learningOutbox.pending('child-a')).toHaveLength(1);
  expect(learningOutbox.pending('child-a')[0].error).toBe('Lesson hidden');
 });
});
