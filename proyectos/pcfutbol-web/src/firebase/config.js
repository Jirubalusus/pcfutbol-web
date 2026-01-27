import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCXohQV4AfImbLitInrumH5mTk_6HseyPE",
  authDomain: "pcfutbol-c136e.firebaseapp.com",
  projectId: "pcfutbol-c136e",
  storageBucket: "pcfutbol-c136e.firebasestorage.app",
  messagingSenderId: "159298941337",
  appId: "1:159298941337:web:0ae9526db19ded288fa308",
  measurementId: "G-RW5FGDZTK4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
