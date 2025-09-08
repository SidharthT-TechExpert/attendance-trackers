/* ====================== FIREBASE IMPORTS ====================== */
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

// Helper to get element by ID
const $ = (id) => document.getElementById(id);


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

    if (settings.autoBackup) {
      // Run a backup immediately if due, then schedule the next
      await createBackup("auto");
      scheduleNextBackup();
    } else {
      clearTimeout(backupTimer);
    }
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

function setIfExists(id, setter) {
  const el = $(id);
  if (el) setter(el);
}

function renderSettings() {
  setIfExists("autoBackup", (el) => (el.checked = settings.autoBackup));
  setIfExists("backupFrequency", (el) => (el.value = settings.backupFrequency));
  setIfExists(
    "confirmDeletions",
    (el) => (el.checked = settings.confirmDeletions)
  );
  setIfExists("autoSave", (el) => (el.checked = settings.autoSave));
  setIfExists(
    "showNotifications",
    (el) => (el.checked = settings.showNotifications)
  );
}

/* ====================== SETTINGS TOGGLES ====================== */
window.toggleAutoBackup = async function () {
  const el = $("autoBackup");
  settings.autoBackup = !!(el && el.checked);
  await saveSettings();
  if (settings.autoBackup) {
    await createBackup("auto");
    scheduleNextBackup();
  } else {
    clearTimeout(backupTimer);
  }
};

window.updateBackupFrequency = async function () {
  const el = $("backupFrequency");
  if (el) settings.backupFrequency = el.value;
  await saveSettings();
  if (settings.autoBackup) {
    // Optionally try one right away (will skip if not due)
    await createBackup("auto");
    scheduleNextBackup();
  }
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

  let interval = 24 * 60 * 60 * 1000; // daily = 24h
  if (settings.backupFrequency === "weekly") interval = 7 * interval;
  if (settings.backupFrequency === "monthly") interval = 30 * interval;

  backupTimer = setTimeout(async () => {
    await createBackup("auto");
    scheduleNextBackup();
  }, interval);

  console.log(
    `⏳ Next ${settings.backupFrequency} backup scheduled in ${
      interval / (1000 * 60 * 60)
    } hours.`
  );
}

/* ====================== CREATE BACKUP ====================== */
export async function createBackup(type = "manual") {
  try {
    const snap = await getDoc(doc(db, "batches", "allBatches"));
    if (!snap.exists()) {
      console.warn("⚠️ No batches found to back up.");
      return;
    }

    if (type === "auto") {
      // Use a plain JS timestamp for reliable immediate comparisons
      const lastBackupSnap = await getDoc(doc(db, "settings", "lastBackup"));
      const lastBackup = lastBackupSnap.exists()
        ? lastBackupSnap.data().timestamp || 0
        : 0;

      const now = Date.now();
      let minInterval = 24 * 60 * 60 * 1000; // daily
      if (settings.backupFrequency === "weekly") minInterval = 7 * minInterval;
      if (settings.backupFrequency === "monthly")
        minInterval = 30 * minInterval;

      if (now - lastBackup < minInterval) {
        console.log("⏳ Skipping backup: not due yet");
        return;
      }

      // Save last backup time (both server & local timestamps)
      await setDoc(doc(db, "settings", "lastBackup"), {
        serverTime: serverTimestamp(),
        timestamp: now,
      });
    }

    const backupData = {
      data: snap.data(),
      type,
      createdAt: serverTimestamp(),
      createdAtReadable: new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "2-digit",
        hour12: true,
      }),
    };

    await addDoc(collection(db, "backups"), backupData);
    console.log(`💾 Backup (${type}) created successfully!`);

    // Housekeeping
    await cleanupOldBackups();
    await loadBackupHistory(); // safe if history table missing
  } catch (err) {
    console.error("❌ Backup failed:", err);
  }
}

// Expose a clean manual trigger for buttons
window.createBackupNow = () => createBackup("manual");

/* ====================== CLEANUP OLD BACKUPS ====================== */
export async function cleanupOldBackups() {
  try {
    const snaps = await getDocs(collection(db, "backups"));
    const now = Date.now();
    const Ten_DAYS = 10 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const docSnap of snaps.docs) {
      const backup = docSnap.data();
      if (!backup.createdAt) continue;

      const createdAt = backup.createdAt.toDate().getTime();
      if (now - createdAt > Ten_DAYS) {
        await deleteDoc(doc(db, "backups", docSnap.id));
        deletedCount++;
      }
    }
  } catch (err) {
    console.error("❌ Error cleaning old backups:", err);
    addNotification(`⚠️ Cleanup failed: ${err.message}`, "warning");
  }
}

/* ====================== BACKUP HISTORY ====================== */
async function loadBackupHistory() {
  try {
    const historyTable = $("backupHistoryBody");
    if (!historyTable) return; // page doesn't have the table
    historyTable.innerHTML = "";

    const qBackups = query(
      collection(db, "backups"),
      orderBy("createdAt", "desc")
    );
    const snaps = await getDocs(qBackups);
    let count = 0;
    snaps.forEach((docSnap) => {
      count++;
      const backup = docSnap.data();

      const date =
        backup.createdAtReadable ||
        backup.createdAt?.toDate().toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "2-digit",
          hour12: true,
        }) ||
        "Pending...";

      const type = backup?.type || "manual";
      const size = JSON.stringify(backup.data).length;

      const row = `
        <tr>
          <td>${count}</td>
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
  } catch (err) {
    console.error("❌ Error loading backup history:", err);
  }
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
  const batchStatsBody = $("batchStatsBody");
  if (!batchStatsBody) return; // page doesn't have the stats table
  batchStatsBody.innerHTML = "";

  try {
    const snap = await getDoc(doc(db, "batches", "allBatches"));
    if (!snap.exists()) return;

    const batches = Object.fromEntries(
      Object.entries(snap.data()).sort(([a], [b]) => a.localeCompare(b))
    );

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

    setIfExists(
      "totalBatches",
      (el) => (el.textContent = Object.keys(batches).length)
    );
    setIfExists(
      "totalParticipants",
      (el) => (el.textContent = totalParticipants)
    );
    setIfExists(
      "totalCoordinators",
      (el) => (el.textContent = totalCoordinators)
    );
    setIfExists("totalRP", (el) => (el.textContent = totalRP));
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

  const fmtEl = $("exportFormat");
  const format = fmtEl ? fmtEl.value : "json";

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
      text += `BATCH: ${batchName}\nGroup 1:\n${(b.groups?.Group_1 || []).join(
        "\n"
      )}\n`;
      if (b.hasGroup2)
        text += `Group 2:\n${(b.groups?.Group_2 || []).join("\n")}\n`;
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

    await loadSettings();
    await updateStatistics();
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
    autoBackup: true,
    backupFrequency: "daily",
    confirmDeletions: true,
    autoSave: true,
    showNotifications: true,
  };
  await saveSettings();
  renderSettings();
  Swal.fire("✅ Reset", "Settings reset to defaults.", "success");
};

/* ====================== NOTIFICATIONS ====================== */
export async function sendNotification(message, role = "admin") {
  try {
    await addDoc(collection(db, "notifications"), {
      message,
      role,
      createdAt: serverTimestamp(),
    });
    console.log("📢 Notification sent:", message);
  } catch (err) {
    console.error("❌ Error sending notification:", err);
  }
}

async function loadNotifications() {
  const notifList = $("notificationList");
  const notifCount = $("notifCount");
  const notifDropdown = $("notifDropdown");

  // If page doesn't have notification UI, skip setting up listener
  if (!notifList || !notifCount) return;

  const qNotifs = query(
    collection(db, "notifications"),
    orderBy("createdAt", "desc")
  );
  onSnapshot(qNotifs, (snapshot) => {
    // Guard again in case user navigated
    if (!notifList || !notifCount) return;

    notifList.innerHTML = "";
    let count = 0;

    snapshot.forEach((docSnap) => {
      const notif = docSnap.data();
      const id = docSnap.id;
      const date = notif.createdAt?.toDate().toLocaleString() || "Just now";

      count++;
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <div>
          <div><strong>${notif.message}</strong></div>
          <small class="text-muted">${date}</small>
        </div>
        <button class="btn btn-sm btn-danger" onclick="deleteNotification('${id}')">×</button>
      `;
      notifList.appendChild(li);
    });

    if (count > 0) {
      notifCount.textContent = String(count);
      notifCount.style.display = "inline-block";
    } else {
      notifCount.style.display = "none";
    }
  });

  const bell = $("notifBell");
  if (bell && notifDropdown) {
    bell.addEventListener("click", () => {
      notifDropdown.style.display =
        notifDropdown.style.display === "none" ? "block" : "none";
    });
  }
}

// Helper: Add notification (pushes to UI list)
function addNotification(message, type = "info") {
  const container = $("notificationsList");
  if (!container) {
    console.warn("⚠️ Notification container not found!");
    return;
  }

  const li = document.createElement("li");
  li.className = `list-group-item d-flex justify-content-between align-items-center`;
  li.innerHTML = `
    <span>${message}</span>
    <span class="badge bg-${type}">NEW</span>
  `;

  container.prepend(li); // newest on top
}

window.deleteNotification = async function (id) {
  try {
    await deleteDoc(doc(db, "notifications", id));
    console.log("🗑️ Notification deleted:", id);
  } catch (err) {
    console.error("❌ Error deleting notification:", err);
  }
};

/* ====================== INIT ====================== */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("⚙️ Settings page ready");

  setIfExists(
    "currentDate",
    (el) => (el.textContent = new Date().toDateString())
  );

  await loadSettings();
  await updateStatistics();
  await loadBackupHistory();
  await cleanupOldBackups();
});
