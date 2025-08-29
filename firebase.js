import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";


export const firebaseConfig = {
  apiKey: "AIzaSyAFe3jkeenflwT1boIfiYYJzseImeoB8gg",
  authDomain: "report-e8db1.firebaseapp.com",
  projectId: "report-e8db1",
  storageBucket: "report-e8db1.firebasestorage.app",
  messagingSenderId: "484990595847",
  appId: "1:484990595847:web:f0c319c020f1636ea14ba2",
  measurementId: "G-SHW5K7DDK4",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
