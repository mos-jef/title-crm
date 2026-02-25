import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDoSIBeW7ZYDF68_xihX6K9e45ShhzBnEQ",
  authDomain: "title-crm-ef709.firebaseapp.com",
  projectId: "title-crm-ef709",
  storageBucket: "title-crm-ef709.firebasestorage.app",
  messagingSenderId: "357710106238",
  appId: "1:357710106238:web:f4dc17637daec37956122f",
  measurementId: "G-BSSHEYBNPB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);