import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCkVU_fmIUWO_gG0As7wUr_DNh63FMv1B0',
  authDomain: 'morspeak-a5e46.firebaseapp.com',
  databaseURL: 'https://morspeak-a5e46-default-rtdb.firebaseio.com',
  projectId: 'morspeak-a5e46',
  storageBucket: 'morspeak-a5e46.firebasestorage.app',
  messagingSenderId: '241499291144',
  appId: '1:241499291144:web:7c1a1d91fee3907e6c9bbd',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
