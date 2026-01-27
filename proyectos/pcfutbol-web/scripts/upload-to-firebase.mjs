import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const firebaseConfig = {
  apiKey: "AIzaSyBIpJz1ZoZx_roIne3oc0yArVzeo4kDmvw",
  authDomain: "pcfutbol-web.firebaseapp.com",
  projectId: "pcfutbol-web",
  storageBucket: "pcfutbol-web.firebasestorage.app",
  messagingSenderId: "664376263748",
  appId: "1:664376263748:web:3ba1fd5d119d021cb5e811"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const dataDir = path.join(__dirname, '../public/data');

async function uploadFile(filename) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ No existe: ${filename}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const storageRef = ref(storage, `data/${filename}`);
  
  try {
    await uploadString(storageRef, content, 'raw', {
      contentType: 'application/json',
      cacheControl: 'public, max-age=86400' // Cache 24h
    });
    const url = await getDownloadURL(storageRef);
    console.log(`✅ ${filename} → ${url.substring(0, 60)}...`);
    return url;
  } catch (error) {
    console.error(`❌ Error subiendo ${filename}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('📤 Subiendo datos a Firebase Storage...\n');
  
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  const urls = {};
  
  for (const file of files) {
    const url = await uploadFile(file);
    if (url) urls[file.replace('.json', '')] = url;
  }
  
  // Guardar URLs para referencia
  fs.writeFileSync(
    path.join(__dirname, '../src/data/firebase-urls.json'),
    JSON.stringify(urls, null, 2)
  );
  
  console.log(`\n✅ Subidos ${Object.keys(urls).length} archivos`);
  console.log('📁 URLs guardadas en: src/data/firebase-urls.json');
}

main().catch(console.error);
