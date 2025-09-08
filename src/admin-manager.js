import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const $ = (id) => document.getElementById(id);
const adminsGrid = $("adminsGrid");
const addAdminBtn = $("addAdminBtn");
const adminSearch = $("adminSearch");
const roleFilter = $("roleFilter");

let ADMINS = [];

/* -------- Password hashing -------- */
async function hashPassword(plain) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(plain)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* -------- Load & Render -------- */
async function loadAdmins() {
  try {
    const q = query(collection(db, "admins"), orderBy("name"));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn("⚠️ No admins found in Firestore");
      adminsGrid.innerHTML =
        `<div class="col-12 text-muted text-center py-3">No admins found.</div>`;
      return;
    }

    ADMINS = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log("✅ Loaded admins:", ADMINS);
    renderAdmins();
  } catch (err) {
    console.error("❌ Error loading admins:", err);
    adminsGrid.innerHTML =
      `<div class="col-12 text-danger">Error loading admins: ${err.message}</div>`;
  }
}

function renderAdmins() {
  const term = adminSearch?.value.trim().toLowerCase() || "";
  const roleSel = roleFilter?.value.toLowerCase() || "";

  const list = ADMINS.filter((a) => {
    const textMatch =
      !term ||
      a.name?.toLowerCase().includes(term) ||
      a.email?.toLowerCase().includes(term);

    const roleMatch =
      !roleSel ||
      (roleSel === "admin" &&
        ["admin", "admins"].includes(a.role?.toLowerCase())) ||
      a.role?.toLowerCase() === roleSel;

    return textMatch && roleMatch;
  });

  adminsGrid.innerHTML = list
    .map(
      (a) => `
    <div class="col-md-4 col-sm-6 mb-3">
      <div class="admin-card h-100 p-3 shadow-sm rounded border">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold">${escapeHTML(a.name || "")}</div>
            <div class="text-muted small">${escapeHTML(a.email || "")}</div>
          </div>
          ${roleBadge(a.role)}
        </div>
        <div class="card-actions mt-3">
          <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${a.id}">✏️ Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${a.id}">🗑️ Delete</button>
        </div>
      </div>
    </div>`
    )
    .join("");
}

/* -------- Role badge -------- */
function roleBadge(role) {
  const r = (role || "coordinator").toLowerCase();

  switch (r) {
    case "admins":
      return `<span class="badge rounded-pill" style="background:#b71c1c;color:#fff;">👑 ADMINS</span>`;
    case "admin":
      return `<span class="badge rounded-pill" style="background:#f57c00;color:#fff;">🛡️ ADMIN</span>`;
    case "manager":
      return `<span class="badge rounded-pill" style="background:#1976d2;color:#fff;">📋 MANAGER</span>`;
    case "coordinator":
    default:
      return `<span class="badge rounded-pill" style="background:#0288d1;color:#fff;">👨‍💼 COORDINATOR</span>`;
  }
}

/* -------- Add/Edit -------- */
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
          stroke="#f00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M1 1l22 22" stroke="#000" stroke-width="2" stroke-linecap="round"/>
    <path d="M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88" stroke="#000" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

async function openAdminDialog(item = null) {
  const isEdit = !!item;

  const { value: data } = await Swal.fire({
    title: isEdit ? "Edit Admin" : "Add Admin",
    html: `
      <input id="ad-name" class="form-control mb-2" placeholder="Name" value="${item ? escapeHTML(item.name) : ""}">
      <input id="ad-email" class="form-control mb-2" type="email" placeholder="Email" value="${item ? escapeHTML(item.email) : ""}">
      <div class="input-group mb-2">
        <input id="ad-password" class="form-control" type="password" placeholder="${isEdit ? "Leave blank to keep current password" : "Password"}">
        <span id="togglePass" class="input-group-text" style="cursor:pointer">${eyeSVG}</span>
      </div>
      <select id="ad-role" class="form-select">
        <option value="admins" ${item?.role === "admins" ? "selected" : ""}>Admins</option>
        <option value="admin" ${item?.role === "admin" ? "selected" : ""}>Admin</option>
        <option value="manager" ${item?.role === "manager" ? "selected" : ""}>Manager</option>
        <option value="coordinator" ${item?.role === "coordinator" ? "selected" : ""}>Coordinator</option>
      </select>
    `,
    focusConfirm: false,
    showCancelButton: true,
    didOpen: () => {
      const passInput = Swal.getPopup().querySelector("#ad-password");
      const toggleBtn = Swal.getPopup().querySelector("#togglePass");
      let visible = false;

      toggleBtn.addEventListener("click", () => {
        visible = !visible;
        passInput.type = visible ? "text" : "password";
        toggleBtn.innerHTML = visible ? eyeOffSVG : eyeSVG;
      });

     
    },
    preConfirm: async () => {
      const name = Swal.getPopup().querySelector("#ad-name").value.trim();
      const email = Swal.getPopup().querySelector("#ad-email").value.trim().toLowerCase();
      const pass = Swal.getPopup().querySelector("#ad-password").value.trim();
      const role = Swal.getPopup().querySelector("#ad-role").value;

      if (!name || !email) return Swal.showValidationMessage("Name and Email are required");

      const exists = ADMINS.some(a => a.email.toLowerCase() === email && a.id !== item?.id);
      if (exists) return Swal.showValidationMessage("⚠️ Admin with this email already exists!");

      return { name, email, pass, role };
    },
  });

  if (!data) return;

  try {
    if (isEdit) {
      const upd = { name: data.name, email: data.email, role: data.role };
      if (data.pass) upd.password = await hashPassword(data.pass);
      await updateDoc(doc(db, "admins", item.id), upd);
      Swal.fire("✅ Updated", "Admin updated successfully", "success");
    } else {
      await addDoc(collection(db, "admins"), {
        name: data.name,
        email: data.email,
        role: data.role,
        password: await hashPassword(data.pass),
      });
      Swal.fire("✅ Added", "Admin added successfully", "success");
    }
    await loadAdmins();
  } catch (err) {
    Swal.fire("❌ Error", err.message, "error");
  }
}

/* -------- Delete -------- */
async function deleteAdmin(admin) {
  const r = await Swal.fire({
    title: "Delete Admin?",
    text: `Are you sure you want to delete ${admin.email}?`,
    icon: "warning",
    showCancelButton: true,
  });
  if (!r.isConfirmed) return;
  await deleteDoc(doc(db, "admins", admin.id));
  Swal.fire("🗑️ Deleted", "Admin removed", "success");
  loadAdmins();
}

/* -------- Events -------- */
adminSearch?.addEventListener("input", renderAdmins);
roleFilter?.addEventListener("change", renderAdmins);
addAdminBtn?.addEventListener("click", () => openAdminDialog());

adminsGrid?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const admin = ADMINS.find((a) => a.id === id);
  if (!admin) return;

  if (btn.dataset.action === "edit") openAdminDialog(admin);
  if (btn.dataset.action === "delete") deleteAdmin(admin);
});

/* -------- Utils -------- */
function escapeHTML(s = "") {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* -------- Init -------- */
window.addEventListener("DOMContentLoaded", loadAdmins);
