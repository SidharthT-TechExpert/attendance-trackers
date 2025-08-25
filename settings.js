// ====================== SETTINGS MANAGEMENT ======================

// Settings object
let settings = {
  autoBackup: true,
  backupFrequency: "weekly",
  confirmDeletions: true,
  autoSave: true,
  showNotifications: false,
};

// ====================== INITIALIZATION ======================
document.addEventListener("DOMContentLoaded", function () {
  loadSettings();
  displayCurrentDate();
  updateStatistics();
  loadBackupHistory();
  renderSettings();
});

// ====================== SETTINGS PERSISTENCE ======================
function saveSettings() {
  localStorage.setItem("attendanceSettings", JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem("attendanceSettings");
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) };
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

// ====================== SETTINGS TOGGLES ======================
function toggleAutoBackup() {
  settings.autoBackup = document.getElementById("autoBackup").checked;
  saveSettings();

  if (settings.autoBackup) {
    Swal.fire({
      icon: "success",
      title: "Auto Backup Enabled",
      text: "Your data will be automatically backed up based on the selected frequency.",
    });
  }
}

function updateBackupFrequency() {
  settings.backupFrequency = document.getElementById("backupFrequency").value;
  saveSettings();
}

// ====================== BACKUP & RESTORE ======================
function createBackup() {
  const batches = loadBatchDataFromStorage();
  if (!batches || Object.keys(batches).length === 0) {
    Swal.fire({
      icon: "warning",
      title: "No Data",
      text: "No batch data found to backup.",
    });
    return;
  }

  const backup = {
    batches: batches,
    settings: settings,
    timestamp: new Date().toISOString(),
    version: "1.0",
    type: "manual",
  };

  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);
  link.download = `attendance_backup_${
    new Date().toISOString().split("T")[0]
  }_${new Date().getTime()}.json`;
  link.click();

  // Add to backup history
  addToBackupHistory(backup);

  Swal.fire({
    icon: "success",
    title: "Backup Created",
    text: "Your data has been backed up successfully!",
  });
}

function restoreFromBackup() {
  document.getElementById("restoreFile").click();
}

function handleRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const backup = JSON.parse(e.target.result);

      Swal.fire({
        title: "Restore Data",
        text: "This will replace all existing data. Are you sure?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, restore",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          // Restore batches
          if (backup.batches) {
            localStorage.setItem(
              "attendanceBatches",
              JSON.stringify(backup.batches)
            );
          }

          // Restore settings if available
          if (backup.settings) {
            settings = { ...settings, ...backup.settings };
            saveSettings();
            renderSettings();
          }

          updateStatistics();

          Swal.fire({
            icon: "success",
            title: "Restored!",
            text: "Data has been restored successfully!",
          });
        }
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Restore Failed",
        text: "Invalid backup file format.",
      });
    }
  };
  reader.readAsText(file);
}

// ====================== DATA EXPORT ======================
function exportAllData() {
  const format = document.getElementById("exportFormat").value;
  const batches = loadBatchDataFromStorage();

  if (!batches || Object.keys(batches).length === 0) {
    Swal.fire({
      icon: "warning",
      title: "No Data",
      text: "No data found to export.",
    });
    return;
  }

  let dataStr, filename, mimeType;

  if (format === "json") {
    const exportData = {
      batches: batches,
      settings: settings,
      exportDate: new Date().toISOString(),
    };
    dataStr = JSON.stringify(exportData, null, 2);
    filename = `attendance_export_${
      new Date().toISOString().split("T")[0]
    }.json`;
    mimeType = "application/json";
  } else if (format === "csv") {
    dataStr = convertToCSV(batches);
    filename = `attendance_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    mimeType = "text/csv";
  } else if (format === "txt") {
    dataStr = convertToText(batches);
    filename = `attendance_export_${
      new Date().toISOString().split("T")[0]
    }.txt`;
    mimeType = "text/plain";
  }

  const dataBlob = new Blob([dataStr], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename;
  link.click();

  Swal.fire({
    icon: "success",
    title: "Export Complete",
    text: `Data exported as ${format.toUpperCase()} successfully!`,
  });
}

function exportBatchesOnly() {
  const batches = loadBatchDataFromStorage();

  if (!batches || Object.keys(batches).length === 0) {
    Swal.fire({
      icon: "warning",
      title: "No Data",
      text: "No batch data found to export.",
    });
    return;
  }

  const dataStr = JSON.stringify(batches, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);
  link.download = `batches_only_${new Date().toISOString().split("T")[0]}.json`;
  link.click();

  Swal.fire({
    icon: "success",
    title: "Export Complete",
    text: "Batch data exported successfully!",
  });
}

// ====================== DATA CONVERSION ======================
function convertToCSV(batches) {
  let csv = "Batch,Group,Name,Type\n";

  Object.keys(batches).forEach((batchName) => {
    const batch = batches[batchName];

    // Group 1
    batch.groups.Group_1.forEach((participant) => {
      const cleanName = participant.replace(/\(RP\)|\(C\)/g, "").trim();
      const type = participant.includes("(RP)")
        ? "RP"
        : participant.includes("(C)")
        ? "Coordinator"
        : "Regular";
      csv += `${batchName},Group 1,${cleanName},${type}\n`;
    });

    // Group 2
    if (batch.hasGroup2 && batch.groups.Group_2) {
      batch.groups.Group_2.forEach((participant) => {
        const cleanName = participant.replace(/\(RP\)|\(C\)/g, "").trim();
        const type = participant.includes("(RP)")
          ? "RP"
          : participant.includes("(C)")
          ? "Coordinator"
          : "Regular";
        csv += `${batchName},Group 2,${cleanName},${type}\n`;
      });
    }
  });

  return csv;
}

function convertToText(batches) {
  let text = "ATTENDANCE TRACKER - BATCH DATA EXPORT\n";
  text += "==========================================\n\n";

  Object.keys(batches).forEach((batchName) => {
    const batch = batches[batchName];
    text += `BATCH: ${batchName}\n`;
    text += `Groups: ${batch.hasGroup2 ? "2" : "1"}\n\n`;

    text += "GROUP 1:\n";
    batch.groups.Group_1.forEach((participant) => {
      text += `  - ${participant}\n`;
    });

    if (batch.hasGroup2 && batch.groups.Group_2) {
      text += "\nGROUP 2:\n";
      batch.groups.Group_2.forEach((participant) => {
        text += `  - ${participant}\n`;
      });
    }

    text += "\n" + "=".repeat(40) + "\n\n";
  });

  return text;
}

// ====================== STATISTICS ======================
function updateStatistics() {
  const batches = loadBatchDataFromStorage();

  if (!batches) {
    document.getElementById("totalBatches").textContent = "0";
    document.getElementById("totalParticipants").textContent = "0";
    document.getElementById("totalCoordinators").textContent = "0";
    document.getElementById("totalRP").textContent = "0";
    return;
  }

  let totalParticipants = 0;
  let totalCoordinators = 0;
  let totalRP = 0;

  Object.keys(batches).forEach((batchName) => {
    const batch = batches[batchName];

    // Count Group 1
    batch.groups.Group_1.forEach((participant) => {
      totalParticipants++;
      if (participant.includes("(C)")) totalCoordinators++;
      if (participant.includes("(RP)")) totalRP++;
    });

    // Count Group 2
    if (batch.hasGroup2 && batch.groups.Group_2) {
      batch.groups.Group_2.forEach((participant) => {
        totalParticipants++;
        if (participant.includes("(C)")) totalCoordinators++;
        if (participant.includes("(RP)")) totalRP++;
      });
    }
  });

  document.getElementById("totalBatches").textContent =
    Object.keys(batches).length;
  document.getElementById("totalParticipants").textContent = totalParticipants;
  document.getElementById("totalCoordinators").textContent = totalCoordinators;
  document.getElementById("totalRP").textContent = totalRP;
}

// ====================== BACKUP HISTORY ======================
function addToBackupHistory(backup) {
  const history = getBackupHistory();
  history.unshift({
    date: new Date().toISOString(),
    type: backup.type,
    size: JSON.stringify(backup).length,
    filename: `attendance_backup_${
      new Date().toISOString().split("T")[0]
    }_${new Date().getTime()}.json`,
  });

  // Keep only last 10 backups
  if (history.length > 10) {
    history.splice(10);
  }

  localStorage.setItem("backupHistory", JSON.stringify(history));
  loadBackupHistory();
}

function getBackupHistory() {
  const saved = localStorage.getItem("backupHistory");
  return saved ? JSON.parse(saved) : [];
}

function loadBackupHistory() {
  const history = getBackupHistory();
  const tbody = document.getElementById("backupHistoryBody");
  tbody.innerHTML = "";

  if (history.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-muted">No backups found</td></tr>';
    return;
  }

  history.forEach((backup, index) => {
    const row = document.createElement("tr");
    const date = new Date(backup.date);

    row.innerHTML = `
      <td>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
      <td><span class="badge bg-primary">${backup.type}</span></td>
      <td>${formatFileSize(backup.size)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="downloadBackup(${index})">📥</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteBackup(${index})">🗑️</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function downloadBackup(index) {
  const history = getBackupHistory();
  if (index >= history.length) return;

  // This would need the actual backup data to download
  Swal.fire({
    icon: "info",
    title: "Download Backup",
    text: "Backup download functionality would be implemented here.",
  });
}

function deleteBackup(index) {
  const history = getBackupHistory();
  if (index >= history.length) return;

  Swal.fire({
    title: "Delete Backup",
    text: "Are you sure you want to delete this backup?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel",
  }).then((result) => {
    if (result.isConfirmed) {
      history.splice(index, 1);
      localStorage.setItem("backupHistory", JSON.stringify(history));
      loadBackupHistory();
    }
  });
}

// ====================== DATA MANAGEMENT ======================
function clearAllData() {
  Swal.fire({
    title: "Clear All Data",
    text: "This will permanently delete all batches and settings. This action cannot be undone!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, clear all",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#d33",
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("attendanceBatches");
      localStorage.removeItem("attendanceSettings");
      localStorage.removeItem("backupHistory");

      updateStatistics();
      loadBackupHistory();

      Swal.fire({
        icon: "success",
        title: "Data Cleared",
        text: "All data has been cleared successfully!",
      });
    }
  });
}

function resetToDefaults() {
  Swal.fire({
    title: "Reset to Defaults",
    text: "This will reset all settings to default values. Continue?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, reset",
    cancelButtonText: "Cancel",
  }).then((result) => {
    if (result.isConfirmed) {
      settings = {
        autoBackup: false,
        backupFrequency: "weekly",
        confirmDeletions: true,
        autoSave: true,
        showNotifications: false,
      };

      saveSettings();
      renderSettings();

      Swal.fire({
        icon: "success",
        title: "Reset Complete",
        text: "Settings have been reset to defaults!",
      });
    }
  });
}

function checkForUpdates() {
  Swal.fire({
    icon: "info",
    title: "Check for Updates",
    text: "You are using the latest version of the Attendance Tracker!",
  });
}

// ====================== UTILITIES ======================
function loadBatchDataFromStorage() {
  const saved = localStorage.getItem("attendanceBatches");
  if (saved) {
    return JSON.parse(saved);
  }
  return null;
}

function displayCurrentDate() {
  const currentDate = document.getElementById("currentDate");
  const date = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  currentDate.textContent = date.toLocaleDateString("en-US", options);
}

function loadStatistics() {
  const saved = localStorage.getItem("attendanceBatches");
  if (!saved) return;

  const batches = JSON.parse(saved);

  let totalBatches = Object.keys(batches).length;
  let totalParticipants = 0, totalCoordinators = 0, totalRP = 0;

  const tbody = document.getElementById("batchStatsBody");
  if (tbody) tbody.innerHTML = ""; // Clear old rows

  // Find newest batch (last added key)
  const batchKeys = Object.keys(batches);
  const newestBatch = batchKeys[batchKeys.length - 1];

  Object.values(batches).forEach(batch => {
    const group1 = batch.groups.Group_1 || [];
    const group2 = batch.hasGroup2 ? batch.groups.Group_2 || [] : [];
    const all = [...group1, ...group2];

    const batchParticipants = all.length;
    const batchCoordinators = all.filter(n => n.includes("(C)")).length;
    const batchRP = all.filter(n => n.includes("(RP)")).length;

    totalParticipants += batchParticipants;
    totalCoordinators += batchCoordinators;
    totalRP += batchRP;

    // Percentages
    const rpPercent = batchParticipants ? ((batchRP / batchParticipants) * 100).toFixed(1) + "%" : "0%";

    // Add row
    if (tbody) {
      const row = document.createElement("tr");

      // Highlight newest batch row
      if (batch.name === newestBatch) {
        row.classList.add("table-success"); // Bootstrap highlight
      }

      row.innerHTML = `
        <td><strong>${batch.name}</strong></td>
        <td>${batchParticipants}</td>
        <td>${batchCoordinators}</td>
        <td>${batchRP}</td>
        <td>${rpPercent}</td>
      `;
      tbody.appendChild(row);
    }
  });

  // Update top cards
  document.getElementById("totalBatches").textContent = totalBatches;
  document.getElementById("totalParticipants").textContent = totalParticipants;
  document.getElementById("totalCoordinators").textContent = totalCoordinators;
  document.getElementById("totalRP").textContent = totalRP;
}

// Reload stats when page loads
document.addEventListener("DOMContentLoaded", loadStatistics);
