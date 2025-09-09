import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

// ====================== Helper ======================
const $ = (id) => document.getElementById(id);

// ====================== HASH FUNCTION (SHA-256) ======================
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ====================== LOGIN FUNCTION ======================
export async function authenticateAndRedirect() {
  if (sessionStorage.getItem("currentUser")) {
    window.location.href = "batch-manager.html";
    return;
  }

  const eyeSVG = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
            stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="#000" stroke-width="2"/>
    </svg>`;
  const eyeOffSVG = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.94 17.94C16.16 19.23 14.17 20 12 20 5.5 20 2 12.99 2 12s3.5-8 10-8c2.17 0 4.16.77 5.94 2.06"
            stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M1 1l22 22" stroke="#000" stroke-width="2" stroke-linecap="round"/>
      <path d="M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88" stroke="#000" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  try {
    const result = await Swal.fire({
      icon: "question",
      title: "Login Required",
      html: `
        <div class="container py-3">
          <div class="row justify-content-center">
            <div class="col-md-6">
              <!-- Email -->
              <div class="mb-3">
                <label for="auth-email" class="form-label fw-semibold">📧 Email Address:</label>
                <input type="email" id="auth-email" class="form-control" placeholder="Enter your email" autocomplete="email">
              </div>
              <!-- Password -->
              <div class="mb-3">
                <label for="auth-password" class="form-label fw-semibold">🔑 Password:</label>
                <div class="input-group">
                  <input type="password" id="auth-password" class="form-control" placeholder="Enter your password" autocomplete="current-password">
                  <button class="btn btn-outline-secondary" type="button" id="toggle-password" aria-label="Show password">
                    <span id="toggle-icon"></span>
                  </button>
                </div>
              </div>
              <!-- Help -->
              <div class="text-center mt-3">
                <small class="text-muted">
                  💡 <a href="#" onclick="showCredentials()" class="text-decoration-none">Click here for help</a>
                </small>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "🚀 Access Batch Manager",
      cancelButtonText: "❌ Cancel",
      confirmButtonColor: "#004d61",
      cancelButtonColor: "#6c757d",
      width: "50%",
      focusConfirm: false,
      allowOutsideClick: true,
      allowEscapeKey: true,

      didOpen: () => {
        const html = Swal.getHtmlContainer();
        const emailInput = html.querySelector("#auth-email");
        const passwordInput = html.querySelector("#auth-password");
        const toggleIcon = html.querySelector("#toggle-icon");

        toggleIcon.innerHTML = eyeSVG;
        emailInput?.focus();

        [emailInput, passwordInput].forEach((el) => {
          el?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") Swal.clickConfirm();
          });
        });

        html.addEventListener("click", (e) => {
          const btn = e.target.closest("#toggle-password");
          if (!btn) return;

          e.preventDefault();
          const hidden = passwordInput.type === "password";
          passwordInput.type = hidden ? "text" : "password";
          btn.setAttribute(
            "aria-label",
            hidden ? "Hide password" : "Show password"
          );
          toggleIcon.innerHTML = hidden ? eyeOffSVG : eyeSVG;

          passwordInput.focus({ preventScroll: true });
          const v = passwordInput.value;
          passwordInput.value = "";
          passwordInput.value = v;
        });
      },

      preConfirm: () => {
        const email = $("auth-email").value.trim();
        const password = $("auth-password").value.trim();
        if (!email || !password) {
          Swal.showValidationMessage("❌ Please enter both email and password");
          return false;
        }
        return { email, password };
      },
    });

    if (result.isConfirmed && result.value) {
      const { email, password } = result.value;

      // 🔎 Query admins collection by email
      const q = query(collection(db, "admins"), where("email", "==", email));
      const snap = await getDocs(q);

      if (snap.empty) {
        Swal.fire("❌ Login Failed", "User not found in admins", "error");
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data();

      // 🔐 Validate password
      const hashedInput = await hashPassword(password);
      if (data.password !== hashedInput) {
        Swal.fire("❌ Login Failed", "Invalid password", "error");
        return;
      }

      // ✅ Save session
      const currentUser = {
        id: docSnap.id,
        email: data.email,
        name: data.name,
        role: data.role,
        id: docSnap.id, // Firestore doc ID
        sessionVersion: data.sessionVersion || 1,
      };
      window.currentUser = currentUser;
      sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

      await Swal.fire({
        icon: "success",
        title: "✅ Authentication Successful!",
        text: `Welcome ${data.name}! Redirecting...`,
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });

      window.location.href = "batch-manager.html";
    }
  } catch (err) {
    console.error("Authentication error:", err);
    Swal.fire("❌ Login Error", err.message, "error");
  }
}

// ====================== LOGOUT ======================
export function logoutUser() {
  sessionStorage.removeItem("currentUser");
  Swal.fire("✅ Logged Out", "You have been logged out.", "success").then(
    () => (window.location.href = "index.html")
  );
}
window.logoutUser = logoutUser;

// ====================== Show Test Credentials ======================
function showCredentials() {
  Swal.fire({
    title: "🔑 Valid Test Credentials",
    html: `
      <div style="text-align:left;padding:0 20px;">
        <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:10px 0;">
          <h6 style="color:#004d61;margin-bottom:8px;">🤝 Admin Access:</h6>
          <p><strong>Email:</strong> test@gmail.com</p>
          <p><strong>Password:</strong> test123</p>
        </div>
        <div style="text-align:center;margin-top:15px;">
          <small style="color:#666;font-style:italic;">
            ℹ️ These are demo credentials for testing purposes
          </small>
        </div>
      </div>
    `,
    icon: "info",
    confirmButtonText: "Got it! 👍",
    confirmButtonColor: "#004d61",
    width: "500px",
  });
}
window.showCredentials = showCredentials;

// ====================== VALIDATE SESSION ======================
async function validateSession() {
  const userJson = sessionStorage.getItem("currentUser");
  if (!userJson) return; // not logged in

  const currentUser = JSON.parse(userJson);

  try {
    const ref = doc(db, "admins", currentUser.id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      sessionStorage.removeItem("currentUser");
      window.location.href = "index.html";
      return;
    }

    const data = snap.data();
    if ((data.sessionVersion || 1) !== (currentUser.sessionVersion || 1)) {
      sessionStorage.removeItem("currentUser");
      await Swal.fire({
        icon: "info",
        title: "Session Expired",
        text: "Please log in again",
        confirmButtonColor: "#004d61",
      });
      window.location.href = "index.html";
    }
  } catch (err) {
    console.error("Session validation error:", err);
  }
}
window.addEventListener("DOMContentLoaded", validateSession);

// ====================== REALTIME SESSION WATCH ======================
window.addEventListener("DOMContentLoaded", () => {
  const userJson = sessionStorage.getItem("currentUser");
  if (!userJson) return;
  const currentUser = JSON.parse(userJson);

  const ref = doc(db, "admins", currentUser.id);
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();

    if ((data.sessionVersion || 1) !== (currentUser.sessionVersion || 1)) {
      sessionStorage.removeItem("currentUser");
      Swal.fire({
        icon: "info",
        title: "Session Expired",
        text: "Please log in again",
      }).then(() => (window.location.href = "index.html"));
    }
  });
});
