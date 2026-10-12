const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

async function exportLocalDb() {
  const sourceUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/kcenglishkids';
  const exportDir = path.join(__dirname, '..', 'data_backup');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const client = new MongoClient(sourceUri);
  try {
    await client.connect();
    const db = client.db();
    console.log(`Dang export database: ${db.databaseName}...`);

    const collections = await db.listCollections().toArray();
    for (const colInfo of collections) {
      if (colInfo.name.startsWith('system.')) continue;
      const col = db.collection(colInfo.name);
      const docs = await col.find({}).toArray();
      const filePath = path.join(exportDir, `${colInfo.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      console.log(`- Da xuat collection ${colInfo.name}: ${docs.length} ban ghi -> ${filePath}`);
    }
    console.log(`\n[Thanh cong] Toan bo du lieu da duoc sao luu tai: ${exportDir}`);
  } catch (err) {
    console.error('Loi export:', err);
  } finally {
    await client.close();
  }
}

exportLocalDb();
