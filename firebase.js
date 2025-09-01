import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics }   from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
if (firebaseConfig.measurementId) getAnalytics(app); // optional
export const db = getFirestore(app);
export const auth = getAuth(app);
