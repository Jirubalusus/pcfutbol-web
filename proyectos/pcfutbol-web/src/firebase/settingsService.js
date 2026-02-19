import { db } from './config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const COLLECTION = 'user_settings';

export async function loadUserSettings(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('Error loading user settings:', err);
    return null;
  }
}

export async function saveUserSettings(uid, settings) {
  if (!uid) return;
  try {
    await setDoc(doc(db, COLLECTION, uid), settings, { merge: true });
  } catch (err) {
    console.error('Error saving user settings:', err);
  }
}
