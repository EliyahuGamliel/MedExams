import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_KEY, //
  authDomain: import.meta.env.VITE_AUTODOMAIN, //
  databaseURL: import.meta.env.VITE_DATABASEURL, //
  projectId: import.meta.env.VITE_PROJECTID, //
  storageBucket: import.meta.env.VITE_STORAGEBUCKET, //
  messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID, //
  appId: import.meta.env.VITE_APPID, //
  measurementId: import.meta.env.VITE_MEASUREMENTID //
};

console.log(firebaseConfig);
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);