import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAgROHsy4VmOoC_Ajb_eLgUVXQ_TWWgyHs",
  authDomain: "officedrop-b64da.firebaseapp.com",
  projectId: "officedrop-b64da",
  storageBucket: "officedrop-b64da.firebasestorage.app",
  messagingSenderId: "1040285392582",
  appId: "1:1040285392582:web:9f84171ef1fccde3d581c7"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
