// src/services/chat.js
import { getAuth } from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, query, limit, serverTimestamp, orderBy
} from "firebase/firestore";
import { auth, db } from '../../firebaseConfig'

function requireUser() {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function getActiveConvoId() {
  const user = requireUser();
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data()?.activeConvoId || null : null;
}

export async function setActiveConvoId(convoId) {
  const user = requireUser();
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, { activeConvoId: convoId }, { merge: true });
}

export async function createConversation(title = "New chat") {
  const user = requireUser();
  const convosRef = collection(db, "users", user.uid, "conversations");
  const ref = await addDoc(convosRef, {
    title,
    startedAt: serverTimestamp(),
    archivedAt: null,
  });
  await setActiveConvoId(ref.id);
  return ref.id;
}

export async function ensureActiveConvo() {
  const existing = await getActiveConvoId();
  if (existing) return existing;
  return createConversation("New chat");
}

export async function hasAnyMessage(convoId) {
  const user = requireUser();
  const msgsRef = collection(db, "users", user.uid, "conversations", convoId, "messages");
  const snap = await getDocs(query(msgsRef, limit(1)));
  return !snap.empty;
}



export async function finalizeConversation(convoId, title) {
  const user = requireUser();
  const convoRef = doc(db, 'users', user.uid, 'conversations', convoId);

  if (!title) {
    const msgsRef = collection(convoRef, 'messages');
    // fetch a few earliest messages; single-field orderBy needs no composite index
    const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(20));
    let derived = '';

    try {
      const snap = await getDocs(q);
      const firstUserMsg = snap.docs
        .map(d => d.data())
        .find(m => m?.role === 'user');

      if (firstUserMsg?.content) {
        const content = String(firstUserMsg.content).trim().replace(/\s+/g, ' ');
        const length = Array.from(content).length;
        derived = Array.from(content).slice(0, 20).join('');
        if (length > 20){
          derived+="...";
        }
      }
    } catch (e) {
      console.log('Title derive failed:', e);
    }

    if (!derived) {
      const ts = new Date();
      const stamp = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`;
      title = `Chat — ${stamp}`;
    } else {
      title = derived;
    }
  }

  await updateDoc(convoRef, { archivedAt: serverTimestamp(), title });
}


export async function saveChatMessage(message, convoId) {
  const user = requireUser();
  const msgsRef = collection(db, "users", user.uid, "conversations", convoId, "messages");
  await addDoc(msgsRef, { ...message, createdAt: serverTimestamp() });
}

export async function fetchMessages(convoId) {
  const user = requireUser();
  const q = query(
    collection(db, "users", user.uid, "conversations", convoId, "messages"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** New chat UX: archive current if it has messages, else keep it; then ensure a fresh one */
export async function startNewChatIfNeeded() {
  const active = await ensureActiveConvo();
  const hasMsgs = await hasAnyMessage(active);
  if (!hasMsgs) return active; // stay in the empty one
  await finalizeConversation(active);
  return createConversation("New chat");
}

export async function markBackgrounded() {
  const uid = auth.currentUser?.uid;
  if (!uid) { console.log('markBackgrounded: no user'); return; }

  try {
    await setDoc(
      doc(db, 'users', uid),
      { wasBackgrounded: true, lastBackgroundAt: serverTimestamp() },
      { merge: true }                 // ← does not overwrite other fields
    );
    console.log('markBackgrounded: written');
  } catch (e) {
    console.error('markBackgrounded error:', e);
  }
}

export async function clearBackgrounded() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      wasBackgrounded: false,
      lastForegroundAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('clearBackgrounded error:', e);
  }
}

// Read the flag
export async function getBackgroundedFlag() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data().wasBackgrounded === true : null;
}
