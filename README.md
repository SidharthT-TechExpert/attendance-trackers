# 🎯 Attendance Tracker

A modern, web-based Attendance Tracker built using **JavaScript**, **Firebase**, and **Vite** — designed to simplify attendance tracking for classrooms, meetings, or events.

---

## 🚀 Features

- Add, edit, and remove attendees  
- Mark attendance for each session  
- Export attendance reports (CSV/PDF)  
- Authentication system for admin users  
- Public report generation (no login required)  
- Simple and fast with Firebase integration  

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | HTML, CSS, JavaScript |
| **Backend** | Firebase (Firestore + Authentication) |
| **Build Tool** | Vite |
| **Hosting** | Vercel |

---

## ⚙️ Project Structure

```

attendance-trackers/
├── views/
│ ├── src/
│ ├── styles/
| └── .env /*IMP*/
├── package.json
├── vite.config.js
├── vercel.json
└── README.md

````

---

## 🧠 Firebase Setup

Before running the app, you’ll need to connect your own Firebase project.

1. Go to [Firebase Console](https://console.firebase.google.com/).  
2. Create a new project and enable:
   - **Authentication** (Email/Password)
   - **Cloud Firestore**
3. Copy your Firebase config and paste it into your `.env` file (already included in your repo):

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=attendance-tracker-XXXX.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=attendance-tracker-XXXX
VITE_FIREBASE_STORAGE_BUCKET=attendance-tracker-XXXX.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
````

---

## 🧰 Local Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/attendance-tracker.git
   cd attendance-tracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run locally**

   ```bash
   npm run dev
   ```

   The app will start on:
   👉 `http://localhost:5173`
---

## 💡 Contributing

Pull requests are welcome!
If you’d like to contribute:

1. Fork this repository
2. Create a new branch (`feature/your-feature`)
3. Commit your changes and open a PR

---

## 📄 License

This project is licensed under the **MIT License**.
Feel free to use and modify it for your own projects.

---

## 🔗 Live Hosted

👉 [View Hosted App on Vercel](https://attendance-trackers.vercel.app/)

```
