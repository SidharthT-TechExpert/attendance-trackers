import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// ====================== LOGIN FUNCTION ======================
export async function authenticateAndRedirect() {
  if (auth.currentUser) {
    window.location.href = "batch-manager.html";
    return;
  }

  const eyeSVG = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
            stroke="#000000ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="#000000ff" stroke-width="2"/>
    </svg>`;
  const eyeOffSVG = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.94 17.94C16.16 19.23 14.17 20 12 20 5.5 20 2 12.99 2 12s3.5-8 10-8c2.17 0 4.16.77 5.94 2.06"
            stroke="#ff0000ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M1 1l22 22" stroke="#000000ff" stroke-width="2" stroke-linecap="round"/>
      <path d="M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88" stroke="#000000ff" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  try {
    const result = await Swal.fire({
      icon: "question",
      title: "Login Required",
      html: `
        <div style="text-align:left;padding:10px 20px;overflow:hidden">
          <!-- Email -->
          <div style="margin-bottom:18px;">
            <label for="auth-email"
              style="display:block;margin-bottom:6px;font-weight:600;font-size:15px;color:#333;">
              📧 Email Address:
            </label>
            <input
              type="email"
              id="auth-email"
              class="swal2-input"
              placeholder="Enter your email"
              style="width:100%;padding:12px;border:2px solid #ccc;border-radius:10px;font-size:15px;outline:none;transition:border .3s, box-shadow .3s;"
              autocomplete="email"
            >
          </div>

          <!-- Password -->
          <div style="margin-bottom:18px;">
            <label for="auth-password"
              style="display:block;margin-bottom:6px;font-weight:600;font-size:15px;color:#333;">
              🔑 Password:
            </label>
            <div style="position:relative;">
              <input
                type="password"
                id="auth-password"
                class="swal2-input"
                placeholder="Enter your password"
                style="width:100%;padding:12px;border:2px solid #ccc;border-radius:10px;font-size:15px;padding-right:46px;outline:none;transition:border .3s, box-shadow .3s;"
                autocomplete="current-password"
              >
              <button
                type="button"
                id="toggle-password"
                aria-label="Show password"
                style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:6px;line-height:0;"
              >
                <span id="toggle-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div style="margin-top:15px;text-align:center;">
            <small style="color:#555;font-size:14px;">
              💡 <a href="#" onclick="showCredentials?.()" style="color:#007bff;text-decoration:none;">Click here for help</a>
            </small>
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
        const emailInput    = html.querySelector("#auth-email");
        const passwordInput = html.querySelector("#auth-password");
        const toggleIcon    = html.querySelector("#toggle-icon");

        // set initial eye icon
        toggleIcon.innerHTML = eyeSVG;

        // focus email
        emailInput?.focus();

        // Enter submits
        [emailInput, passwordInput].forEach((el) => {
          el?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") Swal.clickConfirm();
          });
        });

        // 🔒 Event delegation: works even if DOM rerenders
        html.addEventListener("click", (e) => {
          const btn = e.target.closest("#toggle-password");
          if (!btn) return;

          e.preventDefault();
          const hidden = passwordInput.type === "password";
          passwordInput.type = hidden ? "text" : "password";
          btn.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
          toggleIcon.innerHTML = hidden ? eyeOffSVG : eyeSVG;

          // keep focus + caret at end
          passwordInput.focus({ preventScroll: true });
          const v = passwordInput.value;
          passwordInput.value = "";
          passwordInput.value = v;
        });
      },

      preConfirm: () => {
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value.trim();
        if (!email || !password) {
          Swal.showValidationMessage("❌ Please enter both email and password");
          return false;
        }
        return { email, password };
      },
    });

    if (result.isConfirmed && result.value) {
      const { email, password } = result.value;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        sessionStorage.setItem("currentUser", JSON.stringify({ email: user.email }));

        await Swal.fire({
          icon: "success",
          title: "✅ Authentication Successful!",
          text: `Welcome ${user.email}! Redirecting to Batch Manager...`,
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
        });

        window.location.href = "batch-manager.html";
      } catch (err) {
        Swal.fire("❌ Login Failed", err.message, "error");
      }
    }
  } catch (err) {
    console.error("Authentication error:", err);
  }
}



// ====================== LOGOUT ======================
export async function logoutUser() {
  try {
    await signOut(auth);
    sessionStorage.removeItem("currentUser");

    Swal.fire("✅ Logged Out", "You have been logged out.", "success");
    window.location.href = "index.html";
  } catch (err) {
    Swal.fire("❌ Logout Failed", err.message, "error");
  }
}

// ====================== LISTEN FOR LOGIN STATE ======================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User logged");
  } else {
    console.log("No user logged in");
  }
});

// Function to show valid credentials (helper function)
function showCredentials() {
  Swal.fire({
    title: "🔑 Valid Test Credentials",
    html: `
            <div style="text-align: left; padding: 0 20px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h6 style="color: #004d61; margin-bottom: 8px;">👑 Admin Access:</h6>
                    <p style="margin: 5px 0;"><strong>Email:</strong> admin@gmail.com</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> admin123</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h6 style="color: #004d61; margin-bottom: 8px;">🏢 Manager Access:</h6>
                    <p style="margin: 5px 0;"><strong>Email:</strong> manager@attendance.com</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> manager123</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h6 style="color: #004d61; margin-bottom: 8px;">🤝 Coordinator Access:</h6>
                    <p style="margin: 5px 0;"><strong>Email:</strong> coordinator@attendance.com</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> coord123</p>
                </div>
                
                <div style="text-align: center; margin-top: 15px;">
                    <small style="color: #666; font-style: italic;">
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

window.logoutUser = logoutUser;
window.showCredentials = showCredentials;
