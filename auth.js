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

  try {
    const result = await Swal.fire({
      icon: "question",
      title: "Login Required",
      html: `
        <div style="text-align: left; padding: 10px 20px; overflow: hidden">
          <!-- Email -->
          <div style="margin-bottom: 18px;">
            <label 
              for="auth-email" 
              style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 15px; color: #333;">
              📧 Email Address:
            </label>
            <input 
              type="email" 
              id="auth-email" 
              class="swal2-input" 
              placeholder="Enter your email" 
              style="width: 100%; padding: 12px; border: 2px solid #ccc; border-radius: 10px; font-size: 15px; outline: none; transition: border 0.3s, box-shadow 0.3s;"
            >
          </div>

          <!-- Password -->
          <div style="margin-bottom: 18px;">
            <label 
              for="auth-password" 
              style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 15px; color: #333;">
              🔑 Password:
            </label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="auth-password" 
                class="swal2-input" 
                placeholder="Enter your password"
                style="width: 100%; padding: 12px; border: 2px solid #ccc; border-radius: 10px; font-size: 15px; padding-right: 45px; outline: none; transition: border 0.3s, box-shadow 0.3s;"
              >
              <button 
                type="button" 
                id="toggle-password" 
                style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 20px; color: #555;"
              >
                <span id="toggle-icon">👁️</span>
              </button>
            </div>
          </div>

          <!-- Forgot / Help -->
          <div style="margin-top: 15px; text-align: center;">
            <small style="color: #555; font-size: 14px;">
              💡 <a href="#" onclick="showCredentials()" style="color: #007bff; text-decoration: none;">Click here for help</a>
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
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        const emailInput = document.getElementById("auth-email");
        const passwordInput = document.getElementById("auth-password");
        const toggleBtn = document.getElementById("toggle-password");
        const toggleIcon = document.getElementById("toggle-icon");

        emailInput.focus();

        // ✅ Enter key support
        [emailInput, passwordInput].forEach((el) => {
          el.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
              Swal.clickConfirm();
            }
          });
        });

        // ✅ Toggle password visibility
        if (toggleBtn && passwordInput) {
          toggleBtn.addEventListener("click", () => {
            const isHidden = passwordInput.type === "password";
            passwordInput.type = isHidden ? "text" : "password";
            toggleIcon.textContent = isHidden ? "🙈" : "👁️"; // only updates the icon
          });
        }
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
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({ email: user.email })
        );

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
    console.log("User logged in:", user.email);
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
