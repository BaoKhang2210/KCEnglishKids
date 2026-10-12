const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const { LANGUAGE_CONTENT_DATA } = require('../src/seeds/languageContentData');
const { UNITS_DATA } = require('../src/seeds/curriculumData');
const { VOCABULARY_DATA } = require('../src/seeds/vocabularyData');

async function checkCoverage() {
  console.log('=== 1. SEED DATA AUDIT ===');
  console.log('Total Language Contents in seed file:', LANGUAGE_CONTENT_DATA.length);
  console.log('Total Vocabularies in seed file:', VOCABULARY_DATA.length);
  console.log('Total Units in curriculumData:', UNITS_DATA.length);

  const unitsInLang = new Set(LANGUAGE_CONTENT_DATA.map(item => item.unit));
  console.log('Unique units covered by Language Contents:', unitsInLang.size);

  const missingUnits = UNITS_DATA.filter(u => !unitsInLang.has(u.key));
  if (missingUnits.length > 0) {
    console.log('WARNING: Missing sentence patterns for units:', missingUnits.map(u => u.key));
  } else {
    console.log('SUCCESS: All 27 curriculum units have sentence patterns in seed data!');
  }

  console.log('\n=== 2. DATABASE AUDIT ===');
  const uri = process.env.MONGODB_URI_LOCAL || 'mongodb://127.0.0.1:27017/kcenglishkids';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB:', uri);

    const collections = await mongoose.connection.db.listCollections().toArray();
    const colNames = collections.map(c => c.name);

    if (colNames.includes('languagecontents')) {
      const dbLangCount = await mongoose.connection.db.collection('languagecontents').countDocuments();
      console.log('Total Language contents count in DB:', dbLangCount);

      const dbByUnit = await mongoose.connection.db.collection('languagecontents').aggregate([
        { $group: { _id: '$sourceUnit', count: { $sum: 1 } } }
      ]).toArray();
      console.log('DB Language contents across distinct units (sourceUnit):', dbByUnit.length);

      const byType = await mongoose.connection.db.collection('languagecontents').aggregate([
        { $group: { _id: '$contentType', count: { $sum: 1 } } }
      ]).toArray();
      console.log('DB Language contents by contentType:', byType);
    } else {
      console.log('Collection languagecontents not found in DB!');
    }

    if (colNames.includes('lessons')) {
      const totalLessons = await mongoose.connection.db.collection('lessons').countDocuments();
      const lessonsWithLang = await mongoose.connection.db.collection('lessons').countDocuments({
        languageContents: { $exists: true, $not: { $size: 0 } }
      });
      console.log(`Lessons with linked languageContents: ${lessonsWithLang} / ${totalLessons}`);
    }

    if (colNames.includes('vocabularies')) {
      const dbVocabCount = await mongoose.connection.db.collection('vocabularies').countDocuments();
      console.log('Vocabularies count in DB:', dbVocabCount);
    }

    if (colNames.includes('units')) {
      const dbUnitCount = await mongoose.connection.db.collection('units').countDocuments();
      console.log('Units count in DB:', dbUnitCount);
    }

  } catch (err) {
    console.error('Database connection error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkCoverage();
