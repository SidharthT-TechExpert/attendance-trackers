/* ====================== FIREBASE IMPORTS ====================== */
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* ====================== DEFAULT SETTINGS ====================== */
let settings = {
  autoBackup: true,
  backupFrequency: "daily", // daily | weekly | monthly
  confirmDeletions: true,
  autoSave: true,
  showNotifications: false,
};

/* ====================== STATE ====================== */
let backupTimer = null;

/* ====================== SETTINGS LOAD/SAVE ====================== */
async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "general"));
    if (snap.exists()) settings = { ...settings, ...snap.data() };
    renderSettings();
    if (settings.autoBackup) scheduleNextBackup();
  } catch (err) {
    console.error("❌ Error loading settings:", err);
  }
}

async function saveSettings() {
  try {
    await setDoc(doc(db, "settings", "general"), settings);
    console.log("✅ Settings saved");
  } catch (err) {
    console.error("❌ Error saving settings:", err);
  }
}

function renderSettings() {
  document.getElementById("autoBackup").checked = settings.autoBackup;
  document.getElementById("backupFrequency").value = settings.backupFrequency;
  document.getElementById("confirmDeletions").checked =
    settings.confirmDeletions;
  document.getElementById("autoSave").checked = settings.autoSave;
  document.getElementById("showNotifications").checked =
    settings.showNotifications;
}

/* ====================== SETTINGS TOGGLES ====================== */
window.toggleAutoBackup = async function () {
  settings.autoBackup = document.getElementById("autoBackup").checked;
  await saveSettings();
  if (settings.autoBackup) scheduleNextBackup();
  else clearTimeout(backupTimer);
};

window.updateBackupFrequency = async function () {
  settings.backupFrequency = document.getElementById("backupFrequency").value;
  await saveSettings();
  if (settings.autoBackup) scheduleNextBackup();
};

window.resetToDefaults = async function () {
  settings = {
    autoBackup: false,
    backupFrequency: "weekly",
    confirmDeletions: true,
    autoSave: true,
    showNotifications: false,
  };
  await saveSettings();
  renderSettings();
  Swal.fire("✅ Reset", "Settings reset to defaults.", "success");
};

window.clearAllData = async function () {
  Swal.fire({
    title: "Clear All Data?",
    text: "This will delete all settings and batch data.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, clear",
  }).then(async (res) => {
    if (res.isConfirmed) {
      await setDoc(doc(db, "settings", "general"), {}); // wipe
      await setDoc(doc(db, "batches", "allBatches"), {}); // wipe
      Swal.fire("Cleared", "All data removed.", "success");
      updateStatistics();
    }
  });
};

/* ====================== AUTO BACKUP ====================== */
function scheduleNextBackup() {
  clearTimeout(backupTimer);

  let interval = 24 * 60 * 60 * 1000; // daily
  if (settings.backupFrequency === "weekly") interval = 7 * interval;
  if (settings.backupFrequency === "monthly") interval = 30 * interval;

  backupTimer = setTimeout(async () => {
    await createBackup("auto");
    scheduleNextBackup();
  }, interval);

  console.log(`⏳ Next ${settings.backupFrequency} backup scheduled.`);
}

async function createBackup(type = "manual") {
  try {
    const snap = await getDoc(doc(db, "batches", "allBatches"));
    if (!snap.exists()) {
      console.warn("⚠️ No batches found to back up.");
      return;
    }

    const backupData = {
      data: snap.data(),
      type,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "backups"), backupData);
    console.log(`💾 Backup (${type}) created successfully!`);
    await cleanupOldBackups(); // 🗑️ auto-delete old backups
    loadBackupHistory();
  } catch (err) {
    console.error("❌ Backup failed:", err);
  }
}

window.createBackup = () => createBackup("manual");

/* ====================== CLEANUP OLD BACKUPS ====================== */
async function cleanupOldBackups() {
  try {
    const snaps = await getDocs(collection(db, "backups"));
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    snaps.forEach(async (docSnap) => {
      const backup = docSnap.data();
      if (!backup.createdAt) return;

      const createdAt = backup.createdAt.toDate().getTime();
      if (now - createdAt > THIRTY_DAYS) {
        await deleteDoc(doc(db, "backups", docSnap.id));
        console.log(`🗑️ Deleted old backup: ${docSnap.id}`);
      }
    });
  } catch (err) {
    console.error("❌ Error cleaning old backups:", err);
  }
}

/* ====================== BACKUP HISTORY ====================== */
async function loadBackupHistory() {
  const historyTable = document.getElementById("backupHistoryBody");
  historyTable.innerHTML = "";

  const snaps = await getDocs(collection(db, "backups"));
  snaps.forEach((docSnap) => {
    const backup = docSnap.data();
    const date = backup.createdAt?.toDate().toLocaleString() || "Pending...";
    const type = backup.type || "manual";
    const size = JSON.stringify(backup.data).length;

    const row = `
      <tr>
        <td>${date}</td>
        <td>${type}</td>
        <td>${(size / 1024).toFixed(2)} KB</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="restoreBackup('${
            docSnap.id
          }')">Restore</button>
        </td>
      </tr>`;
    historyTable.insertAdjacentHTML("beforeend", row);
  });
}

/* ====================== RESTORE ====================== */
window.restoreBackup = async function (id) {
  try {
    const snap = await getDoc(doc(db, "backups", id));
    if (!snap.exists()) {
      Swal.fire("⚠️ Error", "Backup not found.", "error");
      return;
    }

    await setDoc(doc(db, "batches", "allBatches"), snap.data().data);
    Swal.fire("✅ Restored", "Backup data restored successfully.", "success");
    updateStatistics();
  } catch (err) {
    console.error("❌ Restore failed:", err);
  }
};

/* ====================== STATISTICS ====================== */
async function updateStatistics() {
  const batchStatsBody = document.getElementById("batchStatsBody");
  batchStatsBody.innerHTML = "";

  try {
    const snap = await getDoc(doc(db, "batches", "allBatches"));
    if (!snap.exists()) return;

    const batches = snap.data();
    let totalParticipants = 0,
      totalCoordinators = 0,
      totalRP = 0;

    Object.keys(batches).forEach((batchName) => {
      const batch = batches[batchName];
      const g1 = batch.groups?.Group_1 || [];
      const g2 = batch.hasGroup2 ? batch.groups?.Group_2 || [] : [];
      const all = [...g1, ...g2];

      const batchC = all.filter((p) => p.includes("(C)")).length;
      const batchRP = all.filter((p) => p.includes("(RP)")).length;
      const rpPercent = all.length
        ? ((batchRP / all.length) * 100).toFixed(1) + "%"
        : "0%";

      totalParticipants += all.length;
      totalCoordinators += batchC;
      totalRP += batchRP;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${batchName}</td>
        <td>${all.length}</td>
        <td>${batchC}</td>
        <td>${batchRP}</td>
        <td>${rpPercent}</td>
      `;
      batchStatsBody.appendChild(row);
    });

    document.getElementById("totalBatches").textContent =
      Object.keys(batches).length;
    document.getElementById("totalParticipants").textContent =
      totalParticipants;
    document.getElementById("totalCoordinators").textContent =
      totalCoordinators;
    document.getElementById("totalRP").textContent = totalRP;
  } catch (err) {
    console.error("❌ Stats error:", err);
  }
}

/* ====================== EXPORT ====================== */
window.exportAllData = async function () {
  const snap = await getDoc(doc(db, "batches", "allBatches"));
  if (!snap.exists()) {
    Swal.fire("⚠️ No data", "No batches found.", "warning");
    return;
  }

  const format = document.getElementById("exportFormat").value;
  const data = {
    batches: snap.data(),
    settings,
    exportDate: new Date().toISOString(),
  };

  let blob, filename;
  if (format === "json") {
    blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    filename = `export_${Date.now()}.json`;
  } else if (format === "csv") {
    let csv = "Batch,Group,Name,Type\n";
    Object.keys(data.batches).forEach((batchName) => {
      const b = data.batches[batchName];
      const g1 = b.groups?.Group_1 || [];
      const g2 = b.hasGroup2 ? b.groups?.Group_2 || [] : [];
      [...g1, ...g2].forEach((name) => {
        const type = name.includes("(RP)")
          ? "RP"
          : name.includes("(C)")
          ? "Coordinator"
          : "Regular";
        csv += `${batchName},${
          g1.includes(name) ? "Group 1" : "Group 2"
        },${name},${type}\n`;
      });
    });
    blob = new Blob([csv], { type: "text/csv" });
    filename = `export_${Date.now()}.csv`;
  } else {
    let text = "ATTENDANCE DATA EXPORT\n\n";
    Object.keys(data.batches).forEach((batchName) => {
      const b = data.batches[batchName];
      text += `BATCH: ${batchName}\nGroup 1:\n${b.groups?.Group_1.join(
        "\n"
      )}\n`;
      if (b.hasGroup2) text += `Group 2:\n${b.groups?.Group_2.join("\n")}\n`;
      text += "\n";
    });
    blob = new Blob([text], { type: "text/plain" });
    filename = `export_${Date.now()}.txt`;
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

/* ====================== EXPORT BATCHES ONLY ====================== */
window.exportBatchesOnly = async function () {
  const snap = await getDoc(doc(db, "batches", "allBatches"));
  if (!snap.exists()) {
    Swal.fire("⚠️ No data", "No batches found.", "warning");
    return;
  }
  const blob = new Blob([JSON.stringify(snap.data(), null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `batches_${Date.now()}.json`;
  link.click();
};

window.checkForUpdates = async function () {
  try {
    Swal.fire({
      title: "🔄 Checking for Updates...",
      text: "Fetching latest data from Firestore",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });

    // Reload settings
    await loadSettings();

    // Reload batch statistics
    await updateStatistics();

    // Reload backup history
    await loadBackupHistory();

    Swal.fire({
      icon: "success",
      title: "✅ Updated",
      text: "Latest data loaded from Firestore.",
    });
  } catch (err) {
    console.error("❌ Update failed:", err);
    Swal.fire({
      icon: "error",
      title: "Update Failed",
      text: err.message,
    });
  }
};

window.resetToDefaults = async function () {
  settings = {
    autoBackup: false,
    backupFrequency: "weekly",
    confirmDeletions: true,
    autoSave: true,
    showNotifications: false,
  };
  await saveSettings();
  renderSettings();
  Swal.fire("✅ Reset", "Settings reset to defaults.", "success");
};

// Real-time notifications listener
function initNotifications() {
  const notifList = document.getElementById("notificationList");
  const notifCount = document.getElementById("notifCount");

  const q = query(
    collection(db, "notifications"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    notifList.innerHTML = "";
    let unreadCount = 0;

    if (snapshot.empty) {
      notifList.innerHTML = `<li class="list-group-item text-muted">No notifications</li>`;
      notifCount.style.display = "none";
      return;
    }

    snapshot.forEach((docSnap) => {
      const notif = docSnap.data();
      const id = docSnap.id;

      // Count only unread ones
      if (!notif.read) unreadCount++;

      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <div>
          <strong>${notif.title || "Notification"}</strong><br>
          <small class="text-muted">${notif.message || ""}</small>
        </div>
        <button class="btn btn-sm btn-outline-success">✓</button>
      `;

      // Mark as read & delete when clicked
      li.querySelector("button").addEventListener("click", async () => {
        await deleteDoc(doc(db, "notifications", id));
        console.log("🗑️ Notification cleared:", id);
      });

      notifList.appendChild(li);
    });

    // Update badge
    if (unreadCount > 0) {
      notifCount.textContent = unreadCount;
      notifCount.style.display = "inline-block";
    } else {
      notifCount.style.display = "none";
    }
  });
}

// Init listener when page loads
document.addEventListener("DOMContentLoaded", () => {
  initNotifications();
});

/* ====================== INIT ====================== */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("⚙️ Settings page ready");
  document.getElementById("currentDate").textContent =
    new Date().toDateString();
  await loadSettings();
  await updateStatistics();
  await loadBackupHistory();
  await cleanupOldBackups();
});
