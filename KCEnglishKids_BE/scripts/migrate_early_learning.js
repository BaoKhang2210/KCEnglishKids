// Adds the observation store and indexes; no historical learning evidence is rewritten.
const fs=require('node:fs'),path=require('node:path'),mongoose=require('mongoose');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
async function main(){await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:10000});const Model=require('../src/models/LearningObservation');const exists=await mongoose.connection.db.listCollections({name:Model.collection.name}).toArray();const count=exists.length?await Model.countDocuments():0;
 const report={apply:process.argv.includes('--apply'),collection:Model.collection.name,existingObservations:count,action:'Create missing collection and indexes; preserve existing content'};
 if(report.apply){const folder=path.resolve(__dirname,'../../.local-backups/early-learning-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(folder,{recursive:true});const before=exists.length?await Model.collection.find({}).toArray():[];fs.writeFileSync(path.join(folder,'observations-before.ejson'),mongoose.mongo.BSON.EJSON.stringify({collection:Model.collection.name,documents:before},null,2,{relaxed:false}));await Model.createCollection();await Model.createIndexes();report.backup=folder;}
 console.log(JSON.stringify(report,null,2));}
if(require.main===module)main().catch(e=>{console.error('Early learning migration failed ('+e.name+').');process.exitCode=1;}).finally(()=>mongoose.disconnect());
