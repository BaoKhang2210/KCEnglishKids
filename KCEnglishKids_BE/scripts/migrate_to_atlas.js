const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const dotenv = require('dotenv');
const dns = require('dns');

// Fix lỗi Node.js querySrv ECONNREFUSED trên Windows khi kết nối Mongo Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore
}

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function promptInput(questionText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(questionText, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function normalizeTargetUri(uri, defaultDbName = 'kcenglishkids') {
  let cleaned = uri.trim();
  // Remove wrapping quotes if pasted with quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  try {
    const url = new URL(cleaned);
    let pathname = url.pathname.replace(/^\//, '');
    if (!pathname || pathname === 'test') {
      url.pathname = '/' + defaultDbName;
      cleaned = url.toString();
    }
  } catch {
    // If standard URL parsing fails (e.g. mongodb+srv with custom chars), fallback regex
    if (cleaned.includes('.mongodb.net/?') || cleaned.includes('.mongodb.net/test?')) {
      cleaned = cleaned.replace('.mongodb.net/?', `.mongodb.net/${defaultDbName}?`)
                       .replace('.mongodb.net/test?', `.mongodb.net/${defaultDbName}?`);
    } else if (cleaned.endsWith('.mongodb.net') || cleaned.endsWith('.mongodb.net/')) {
      cleaned = cleaned.replace(/\/?$/, `/${defaultDbName}?retryWrites=true&w=majority`);
    }
  }
  return cleaned;
}

async function migrate() {
  console.log('====================================================');
  console.log('   KCEnglishKids - Tool Migration Database sang Atlas');
  console.log('====================================================\n');

  // 1. Source URI
  let sourceUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/kcenglishkids';
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('localhost') || process.env.MONGODB_URI?.includes('127.0.0.1')) {
    sourceUri = process.env.MONGODB_URI;
  }

  // 2. Target URI (Atlas)
  const nonFlagArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
  let argUri = nonFlagArgs[0];
  if (argUri && (argUri.includes('abcde') || argUri.includes('<') || argUri.includes('admin:'))) {
    console.log('[Canh bao] Tham so truyen vao la vi du mau. Dang su dung ATLAS_MONGODB_URI that tu .env...');
    argUri = null;
  }
  let targetUri = argUri || process.env.ATLAS_MONGODB_URI || process.env.TARGET_MONGODB_URI;

  if (!targetUri) {
    console.log('Chua tim thay Atlas Connection String.');
    console.log('Format vi du: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/kcenglishkids?retryWrites=true&w=majority\n');
    targetUri = await promptInput('Nhap Mongo Atlas Connection String cua ban: ');
  }

  if (!targetUri) {
    console.error('Ban chua nhap Connection String! Tien trinh da bi huy.');
    process.exit(1);
  }

  targetUri = normalizeTargetUri(targetUri, 'kcenglishkids');

  console.log(`\n[Source Local]: ${sourceUri}`);
  // Hide password in logs
  const maskedTarget = targetUri.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Target Atlas]: ${maskedTarget}\n`);

  let sourceClient;
  let targetClient;

  try {
    console.log('Dang ket noi den Local MongoDB...');
    sourceClient = new MongoClient(sourceUri);
    await sourceClient.connect();
    console.log('Ket noi Local MongoDB thanh cong!');

    console.log('Dang ket noi den MongoDB Atlas...');
    try {
      targetClient = new MongoClient(targetUri, {
        serverSelectionTimeoutMS: 12000
      });
      await targetClient.connect();
      console.log('Ket noi MongoDB Atlas thanh cong!\n');
    } catch (atlasErr) {
      if (atlasErr.message.includes('querySrv') || atlasErr.message.includes('ETIMEDOUT') || atlasErr.message.includes('ECONNREFUSED')) {
        console.log('SRV DNS lookup bi cham hoac tu choi, dang thu phuong an ket noi truc tiep (Direct Shard URI)...');
        const directUri = 'mongodb://baokhang8a1_db_user:baokhang2210@ac-nrzyhhf-shard-00-00.c6kcrc6.mongodb.net:27017,ac-nrzyhhf-shard-00-01.c6kcrc6.mongodb.net:27017,ac-nrzyhhf-shard-00-02.c6kcrc6.mongodb.net:27017/kcenglishkids?ssl=true&authSource=admin&retryWrites=true&w=majority';
        targetClient = new MongoClient(directUri, {
          serverSelectionTimeoutMS: 12000
        });
        await targetClient.connect();
        console.log('Ket noi MongoDB Atlas truc tiep thanh cong!\n');
      } else {
        throw atlasErr;
      }
    }

    const sourceDb = sourceClient.db();
    const targetDb = targetClient.db();

    console.log(`Dang sao chep database: "${sourceDb.databaseName}" -> "${targetDb.databaseName}"...\n`);

    const collections = await sourceDb.listCollections().toArray();
    const nonSystemCols = collections.filter(c => !c.name.startsWith('system.'));

    if (nonSystemCols.length === 0) {
      console.warn('Khong tim thay collection nao o database goc!');
      return;
    }

    const report = [];

    for (const colInfo of nonSystemCols) {
      const colName = colInfo.name;
      const sCol = sourceDb.collection(colName);
      const tCol = targetDb.collection(colName);

      const srcCount = await sCol.countDocuments();

      if (srcCount === 0) {
        report.push({ collection: colName, source: 0, target: 0, status: 'SKIP (0 doc)' });
        continue;
      }

      process.stdout.write(`- Dang day collection "${colName}" (${srcCount} ban ghi)... `);

      // Xoa du lieu cu tren Atlas neu co de tranh trung lap _id
      await tCol.deleteMany({});

      // Doc va ghi theo batch de tiet kiem RAM va on dinh
      const batchSize = 500;
      let inserted = 0;
      const cursor = sCol.find({});

      let batch = [];
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);
        if (batch.length === batchSize) {
          await tCol.insertMany(batch, { ordered: false });
          inserted += batch.length;
          batch = [];
        }
      }
      if (batch.length > 0) {
        await tCol.insertMany(batch, { ordered: false });
        inserted += batch.length;
      }

      // Sao chep index
      try {
        const indexes = await sCol.indexes();
        for (const idx of indexes) {
          if (idx.name === '_id_') continue;
          const options = { name: idx.name };
          if (idx.unique) options.unique = true;
          if (idx.sparse) options.sparse = true;
          if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
          await tCol.createIndex(idx.key, options);
        }
      } catch (idxErr) {
        // Bo qua loi index neu co
      }

      const tgtCount = await tCol.countDocuments();
      const status = (tgtCount === srcCount) ? 'OK' : `LECH (${tgtCount}/${srcCount})`;
      report.push({ collection: colName, source: srcCount, target: tgtCount, status });
      console.log(`Xong (${tgtCount}/${srcCount})`);
    }

    console.log('\n================== KET QUA MIGRATION ==================');
    console.table(report);

    // Kiem tra cap nhat file .env
    const shouldUpdateEnv = process.argv.includes('--update-env');
    let doUpdate = shouldUpdateEnv;

    if (!shouldUpdateEnv) {
      const ans = await promptInput('\nBan co muon tu dong cap nhat MONGODB_URI trong file .env sang Atlas khong? (y/n): ');
      doUpdate = ans.toLowerCase() === 'y' || ans.toLowerCase() === 'yes';
    }

    if (doUpdate && fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      // Backup .env
      fs.writeFileSync(path.join(__dirname, '..', '.env.local.backup'), envContent);

      if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.*/, `MONGODB_URI=${targetUri}`);
      } else {
        envContent += `\nMONGODB_URI=${targetUri}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('[Thanh cong] Da cap nhat MONGODB_URI trong .env!');
      console.log('   (File cu da duoc luu du phong tai: .env.local.backup)');
    } else {
      console.log('\n[Luu y] De Backend su dung database tren Atlas, hay cap nhat file .env:');
      console.log(`MONGODB_URI=${targetUri}\n`);
    }

    console.log('Chuc mung! Qua trinh day du lieu len MongoDB Atlas da hoan tat.');

  } catch (error) {
    console.error('\n[Loi migration]:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('-> Hay kiem tra lai username va password trong connection string cua Atlas.');
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND') || error.message.includes('serverSelectionTimeoutMS')) {
      console.error('-> Hay kiem tra Network Access tren Mongo Atlas (can phai mo IP Access 0.0.0.0/0 hoac IP hien tai cua ban).');
    }
    process.exit(1);
  } finally {
    if (sourceClient) await sourceClient.close();
    if (targetClient) await targetClient.close();
  }
}

migrate();
