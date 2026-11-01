import { useState } from 'react';
import type { Vocabulary } from '../types';
export function LearningAssetKit({words}:{words:Vocabulary[]}) {
 const [progress,setProgress]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const download=async()=>{setBusy(true);setError('');setProgress('Đang chuẩn bị học liệu…');try{
   if(!('serviceWorker' in navigator)||!isSecureContext)throw Error('Thiết bị này chưa hỗ trợ giữ học liệu. Bạn vẫn có thể học khi có kết nối hoặc dùng thẻ tranh in.');
   const urls=[...new Set([...words.flatMap(word=>[word.imageUrl,word.audioUrl]),...['adventure','classroom','family','rest','celebration','studio'].map(name=>`/images/storybook/${name}-v1.webp`)].filter((value):value is string=>Boolean(value)&&/^\/(images|audio)\//.test(value!)))];
   if(!urls.length)throw Error('Chưa có học liệu cục bộ để tải.');
   const registration=await navigator.serviceWorker.register('/learning-assets-sw.js');
   const worker=registration.active||registration.installing||registration.waiting;if(!worker)throw Error('Chưa khởi động được bộ giữ học liệu.');
   if(worker.state!=='activated')await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Chưa sẵn sàng tải học liệu. Hãy thử lại.')),12000);worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}});});
   await new Promise<void>((resolve,reject)=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();reject(Error('Kết nối chậm. Hãy thử tải tiếp khi mạng ổn định.'));},120000);channel.port1.onmessage=event=>{if(event.data.error){clearTimeout(timer);channel.port1.close();reject(Error(event.data.error));}else if(event.data.complete){clearTimeout(timer);channel.port1.close();resolve();}else setProgress(`Đã giữ ${event.data.done}/${event.data.total} tệp…`);};worker.postMessage({type:'CACHE_LEARNING_ASSETS',urls},[channel.port2]);});
   setProgress('Đã giữ tranh và âm thanh cục bộ. Các trang đang mở sẽ nhẹ hơn khi mạng yếu.');
 }catch(e){setProgress('');setError(e instanceof Error?e.message:'Chưa giữ được học liệu.');}finally{setBusy(false);}};
 return <section className="rounded-2xl bg-sky-50 border border-sky-100 p-4 no-print"><h3 className="font-bold">Chuẩn bị khi mạng yếu</h3><p className="text-sm mt-2 mb-3">Giữ tranh và âm thanh sẵn có trên thiết bị. Chỉ mục học và đăng nhập vẫn cần kết nối; có thể in thẻ tranh để chơi không dùng màn hình.</p><button className="teacher-button" disabled={busy||!words.length} onClick={()=>void download()}>{busy?'Đang tải…':'Tải trước tranh & âm thanh'}</button>{progress&&<p role="status" className="mt-2 text-sm text-teal-800">{progress}</p>}{error&&<p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>}</section>;
}
