// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// 🔑 Your Firebase config (project specific)
const firebaseConfig = {
  apiKey: "AIzaSyAFe3jkeenflwT1boIfiYYJzseImeoB8gg",
  authDomain: "report-e8db1.firebaseapp.com",
  projectId: "report-e8db1",
  storageBucket: "report-e8db1.firebasestorage.app",
  messagingSenderId: "484990595847",
  appId: "1:484990595847:web:f0c319c020f1636ea14ba2",
  measurementId: "G-SHW5K7DDK4",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app); // optional; you can keep it

// ✅ Export Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
