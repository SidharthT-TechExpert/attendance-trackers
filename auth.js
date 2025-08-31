import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// ====================== LOGIN FUNCTION ======================
export async function authenticateAndRedirect() {
  // ✅ First check if user already logged in
  if (auth.currentUser) {
    // Direct redirect without popup
    window.location.href = "batch-manager.html";
    return;
  }

  try {
    const result = await Swal.fire({
      title: "🔒 Login Required",
      html: `
        <div style="text-align: left; padding: 10px 20px; overflow: hidden">
          <!-- Email -->
          <div style="margin-bottom: 18px;">
            <label 
              for="auth-email" 
              style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 15px; color: #333;"
            >
              📧 Email Address:
            </label>
            <input 
              type="email" 
              id="auth-email" 
              class="swal2-input" 
              placeholder="Enter your email" 
              style="width: 100%; padding: 12px; border: 2px solid #ccc; border-radius: 10px; font-size: 15px; outline: none; transition: border 0.3s, box-shadow 0.3s;"
              onfocus="this.style.border='2px solid #007bff'; this.style.boxShadow='0 0 6px rgba(0,123,255,0.3)'" 
              onblur="this.style.border='2px solid #ccc'; this.style.boxShadow='none'"
            >
          </div>

          <!-- Password -->
          <div style="margin-bottom: 18px;">
            <label 
              for="auth-password" 
              style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 15px; color: #333;"
            >
              🔑 Password:
            </label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="auth-password" 
                class="swal2-input" 
                placeholder="Enter your password"
                style="width: 100%; padding: 12px; border: 2px solid #ccc; border-radius: 10px; font-size: 15px; padding-right: 45px; outline: none; transition: border 0.3s, box-shadow 0.3s;"
                onfocus="this.style.border='2px solid #007bff'; this.style.boxShadow='0 0 6px rgba(0,123,255,0.3)'" 
                onblur="this.style.border='2px solid #ccc'; this.style.boxShadow='none'"
              >
              <button 
                type="button" 
                id="toggle-password" 
                onclick="togglePassword()" 
                style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 18px; cursor: pointer; color: #555;"
              >
                👁️
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
      icon: "question",
      showCancelButton: true,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "🚀 Access Batch Manager",
      cancelButtonText: "❌ Cancel",
      confirmButtonColor: "#004d61",
      cancelButtonColor: "#6c757d",
      width: "50%",
      focusConfirm: false,
      allowOutsideClick: false,
      didOpen: () => {
        // Add password toggle functionality
        const toggleBtn = document.getElementById("toggle-password");
        const passwordInput = document.getElementById("auth-password");

        if (toggleBtn && passwordInput) {
          toggleBtn.addEventListener("click", () => {
            if (passwordInput.type === "password") {
              passwordInput.type = "text";
              toggleBtn.textContent = "🙈";
            } else {
              passwordInput.type = "password";
              toggleBtn.textContent = "👁️";
            }
          });
        }

        // Focus on email input
        document.getElementById("auth-email").focus();
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
        // ✅ Verify user with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            email: user.email,
            role: user.role, // ⚠️ user.role may not exist in Firebase by default
          })
        );

        // Show success message
        await Swal.fire({
          icon: "success",
          title: "✅ Authentication Successful!",
          text: `Welcome ${user.email}! Redirecting to Batch Manager...`,
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
        });

        // 🔥 Redirect to batch-manager.html
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


window.logoutUser = logoutUser ;
