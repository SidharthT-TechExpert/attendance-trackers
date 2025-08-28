// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// 🔑 Your Firebase config (already valid for your project)
const firebaseConfig = {
  apiKey: "AIzaSyALe18sbBPthJIU-oIHj1ycalynbsZ5eUo",
  authDomain: "report-generactor.firebaseapp.com",
  projectId: "report-generactor",
  storageBucket: "report-generactor.firebasestorage.app",
  messagingSenderId: "880150163592",
  appId: "1:880150163592:web:478db7713e7415cab1af3d",
  measurementId: "G-B7X9PDJGJT",
};

// ✅ Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
getAnalytics(app); // optional; safe to keep

export const db = getFirestore(app);
