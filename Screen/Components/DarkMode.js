import { useEffect, useState } from 'react';
import { auth, db } from '../../firebaseConfig';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function useDarkMode() {
  const [uid, setUid] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track auth state so we know the uid
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return unsub;
  }, []);

  // Subscribe to the user's doc for darkMode changes
  useEffect(() => {
    if (!uid) {
      setDarkMode(false);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        setDarkMode(!!snap.data()?.darkMode); // coerce to boolean
        setLoading(false);
      },
      (e) => {
        console.error('darkMode watch error:', e);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  // Updater that also persists to Firestore
  const updateDarkMode = async (value) => {
    setDarkMode(!!value);
    if (!uid) return;
    try {
      await setDoc(doc(db, 'users', uid), { darkMode: !!value }, { merge: true });
    } catch (e) {
      console.error('darkMode save error:', e);
    }
  };

  return { darkMode, setDarkMode: updateDarkMode, loading, uid };
}


