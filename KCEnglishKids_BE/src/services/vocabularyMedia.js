const {Media}=require('../models');
// Allocate a new media record instead of mutating a possibly shared illustration.
module.exports=async function vocabularyMedia(vocab,before={}){
 for(const [field,ref,type] of [['imageUrl','primaryMedia','IMAGE'],['audioUrl','audioMedia','AUDIO']]){
  if(vocab[field]===before[field])continue;
  if(!vocab[field]){vocab[ref]=undefined;continue;}
  const media=await Media.create({type,url:vocab[field],altText:vocab.english,transcript:type==='AUDIO'?vocab.english:undefined,metadata:{source:vocab.mediaSource||'Admin supplied URL',license:vocab.mediaLicense||'Unspecified'},status:'ACTIVE'});
  vocab[ref]=media._id;
 }
};
