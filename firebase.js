// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
//   measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
// };

 const firebaseConfig = {
    apiKey: "AIzaSyAFe3jkeenflwT1boIfiYYJzseImeoB8gg",
    authDomain: "report-e8db1.firebaseapp.com",
    projectId: "report-e8db1",
    storageBucket: "report-e8db1.firebasestorage.app",
    messagingSenderId: "484990595847",
    appId: "1:484990595847:web:f0c319c020f1636ea14ba2",
    measurementId: "G-SHW5K7DDK4"
  };


// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
