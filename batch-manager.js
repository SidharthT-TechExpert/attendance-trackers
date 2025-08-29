// ====================== FIRESTORE IMPORTS ======================
import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteField,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ====================== STATE ======================
let batches = {};
let selectedBatch = null;

// ====================== CREATE ======================
export async function addNewBatch() {
  const batchSuffix = document.getElementById("newBatchName").value.trim();
  if (!batchSuffix) {
    Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Enter a batch suffix!",
    });
    return;
  }

  const batchName = `BC${batchSuffix}`;
  if (batches[batchName]) {
    Swal.fire({
      icon: "error",
      title: "Batch Exists",
      text: `${batchName} already exists!`,
    });
    return;
  }

  const newBatch = {
    name: batchName,
    hasGroup2: false,
    groups: { Group_1: [] },
  };

  batches[batchName] = newBatch;
  await saveBatches();
  document.getElementById("newBatchName").value = "";
  Swal.fire({
    icon: "success",
    title: "Batch Created",
    text: `${batchName} created successfully!`,
  });
}

// ====================== READ (Realtime) ======================
export function listenToBatches() {
  const batchesRef = doc(db, "batches", "allBatches");
  onSnapshot(
    batchesRef,
    (snap) => {
      if (snap.exists()) {
        batches = snap.data();
        console.log("📡 Live update:", batches);
        if (typeof renderBatchList === "function") renderBatchList();
      } else {
        batches = {};
        if (typeof renderBatchList === "function") renderBatchList();
      }
    },
    (err) => console.log("❌ Realtime error:", err)
  );
}

// ====================== UPDATE (Save all) ======================
export async function saveBatches() {
  try {
    // Save entire dictionary; top-level doc holds all batches keyed by name
    await setDoc(doc(db, "batches", "allBatches"), { ...batches });
    console.log("✅ Saved to Firestore");
  } catch (err) {
    console.log("❌ Error saving:", err);
  }
}

export async function addParticipant(groupName) {
  if (!selectedBatch) return;
  const inputId =
    groupName === "Group_1" ? "newParticipant1" : "newParticipant2";
  const name = document.getElementById(inputId).value.trim();

  if (!name) {
    Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Enter a participant name!",
    });
    return;
  }

  // Prevent duplicates (ignore RP/C suffixes)
  const all = [
    ...batches[selectedBatch].groups.Group_1,
    ...(batches[selectedBatch].hasGroup2
      ? batches[selectedBatch].groups.Group_2 ?? []
      : []),
  ];
  if (
    all.some(
      (p) =>
        p
          .replace(/\(RP\)|\(C\)/g, "")
          .trim()
          .toLowerCase() === name.toLowerCase()
    )
  ) {
    Swal.fire({
      icon: "error",
      title: "Duplicate Name",
      text: "This participant already exists!",
    });
    return;
  }

  if (!batches[selectedBatch].groups[groupName]) {
    batches[selectedBatch].groups[groupName] = [];
  }
  batches[selectedBatch].groups[groupName].push(name);
  await saveBatches();
  renderBatchDetails();
  document.getElementById(inputId).value = "";
}

export async function toggleGroup2() {
  if (!selectedBatch) return;
  const hasGroup2 = document.getElementById("hasGroup2").checked;
  batches[selectedBatch].hasGroup2 = hasGroup2;
  if (hasGroup2 && !batches[selectedBatch].groups.Group_2) {
    batches[selectedBatch].groups.Group_2 = [];
  }
  await saveBatches();
  renderBatchDetails();
}

// ====================== DELETE ======================
export async function deleteBatch() {
  if (!selectedBatch) return;
  const batchName = selectedBatch;
  // Check if user is admin before allowing delete
  const userIsAdmin = window.currentUser?.isAdmin;
  console.log(userIsAdmin);
  if (!userIsAdmin) {
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "Only admins can delete batches.",
    });
    return;
  }
  Swal.fire({
    title: "Delete Batch",
    text: `Are you sure you want to delete ${batchName}?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonColor: "#d33",
  }).then(async (result) => {
    if (result.isConfirmed) {
      // Remove locally
      delete batches[batchName];
      // Remove from Firestore (delete that field in the document)
      await updateDoc(doc(db, "batches", "allBatches"), {
        [batchName]: deleteField(),
      });

      selectedBatch = null;
      document.getElementById("batchDetails").style.display = "none";
      renderBatchList();

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Batch deleted successfully.",
      });
    }
  });
}

export async function removeParticipant(groupName, index) {
  if (!selectedBatch) return;
  Swal.fire({
    title: "Remove Participant",
    text: "Are you sure you want to remove this participant?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, remove",
  }).then(async (result) => {
    if (result.isConfirmed) {
      batches[selectedBatch].groups[groupName].splice(index, 1);
      await saveBatches();
      renderBatchDetails();
    }
  });
}

// ====================== UI HELPERS ======================
function renderBatchList() {
  const batchList = document.getElementById("batchList");
  if (!batchList) return;
  batchList.innerHTML = "";

  Object.keys(batches).forEach((batchName) => {
    const batch = batches[batchName];
    const item = document.createElement("div");
    item.className = `list-group-item batch-item ${
      selectedBatch === batchName ? "active" : ""
    }`;
    item.setAttribute("data-batch", batchName);
    item.onclick = () => selectBatch(batchName);

    const total =
      (batch.groups?.Group_1?.length ?? 0) +
      (batch.hasGroup2 ? batch.groups?.Group_2?.length ?? 0 : 0);

    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-1">${batchName}</h6>
          <small>${total} participants</small>
        </div>
        <span class="badge bg-primary rounded-pill">${
          batch.hasGroup2 ? "2 Groups" : "1 Group"
        }</span>
      </div>
    `;
    batchList.appendChild(item);
  });
}

function renderBatchDetails() {
  if (!selectedBatch) return;
  const batch = batches[selectedBatch];

  document.getElementById(
    "selectedBatchTitle"
  ).textContent = `${selectedBatch} Details`;
  document.getElementById("hasGroup2").checked = !!batch.hasGroup2;
  document.getElementById("group2Section").style.display = batch.hasGroup2
    ? "block"
    : "none";

  renderParticipantList("Group_1", batch.groups?.Group_1 ?? []);
  if (batch.hasGroup2)
    renderParticipantList("Group_2", batch.groups?.Group_2 ?? []);

  document.getElementById("batchDetails").style.display = "block";
}

function renderParticipantList(groupName, participants) {
  const listId = groupName === "Group_1" ? "group1List" : "group2List";
  const list = document.getElementById(listId);
  list.innerHTML = "";

  participants.forEach((participant, index) => {
    const cleanName = participant.replace(/\(RP\)|\(C\)/g, "").trim();
    list.innerHTML += `
      <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-1">
        <div><span>👤 ${cleanName}</span></div>
        <button class="btn btn-outline-danger btn-sm" onclick="removeParticipant('${groupName}', ${index})">🗑️</button>
      </div>
    `;
  });
}

function selectBatch(batchName) {
  selectedBatch = batchName;
  renderBatchDetails();
}

// ====================== BACKUP / RESTORE ======================

// Export (download) JSON from Firestore
export async function exportAllData() {
  try {
    const snap = await getDoc(doc(db, "batches", "allBatches"));
    if (!snap.exists()) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "No batches found to export.",
      });
      return;
    }

    const data = snap.data();
    const backup = {
      batches: data,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `batches_backup_${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    Swal.fire({
      icon: "success",
      title: "Exported!",
      text: "Backup downloaded successfully.",
    });
  } catch (err) {
    console.log("❌ Export error:", err);
    Swal.fire({ icon: "error", title: "Export Failed", text: err.message });
  }
}

// Import JSON into Firestore (replaces all batches)
export async function importDataFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);

      if (!imported.batches) {
        Swal.fire({
          icon: "error",
          title: "Invalid File",
          text: "JSON does not contain batches.",
        });
        return;
      }

      Swal.fire({
        title: "Confirm Import",
        text: "This will replace ALL existing batch data in Firestore. Continue?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Import",
        cancelButtonColor: "#d33",
      }).then(async (res) => {
        if (res.isConfirmed) {
          await setDoc(doc(db, "batches", "allBatches"), imported.batches);
          Swal.fire({
            icon: "success",
            title: "Imported!",
            text: "Data restored successfully.",
          });
        }
      });
    } catch (err) {
      console.log("❌ Import error:", err);
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text: "File format is invalid.",
      });
    }
  };
  reader.readAsText(file);
}


// ====================== IMPORT VIA TEXTAREA ======================
export function importData() {
  Swal.fire({
    title: "📥 Import Batches JSON",
    html: `
      <style>
        /* ========== JSON EDITOR WITH LINE NUMBERS ========== */
        .editor-container {
          display: flex;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
          height: 300px;
          font-family: monospace;
          background: #fff;
        }
        .line-numbers {
          background: #f4f4f4;
          color: #999;
          text-align: right;
          padding: 10px;
          user-select: none;
          font-size: 13px;
          line-height: 1.5em;
          overflow: hidden;
        }
        .editor {
          flex: 1;
          padding: 10px;
          border: none;
          outline: none;
          resize: none;
          font-size: 13px;
          line-height: 1.5em;
          overflow: auto;
        }

        /* ========== ERROR TOAST ========== */
        .error-popup {
          display: none;
          position: fixed;
          top: 20px;
          right: -400px; /* hidden off screen */
          max-width: 350px;
          background: linear-gradient(135deg, #e53935, #ef5350);
          color: #fff;
          padding: 12px 18px;
          border-radius: 10px;
          font-weight: bold;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          z-index: 5000;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: slideIn 0.5s forwards;
        }
        .error-popup .icon {
          font-size: 18px;
        }
        @keyframes slideIn {
          from { right: -400px; opacity: 0; }
          to { right: 20px; opacity: 1; }
        }
      </style>

      <div class="editor-container">
        <div class="line-numbers" id="lineNumbers">1</div>
        <textarea id="settingsInput" class="editor" spellcheck="false"></textarea>
      </div>

      <small class="text-muted d-block mt-2">
        Example format:<br>
        <pre style="text-align:left; background:#f8f9fa; padding:6px; border-radius:6px;">
{
  "BC2024": {
    "name": "BC2024",
    "hasGroup2": true,
    "groups": {
      "Group_1": ["Alice", "Bob (C)"],
      "Group_2": ["Charlie", "Diana (RP)"]
    }
  }
}
        </pre>
      </small>

      <!-- 🔴 Error Toast -->
      <div id="errorPopup" class="error-popup">
        <span class="icon">⚠</span>
        <span id="errorMessage"></span>
      </div>
    `,
    width: "650px",
    showCancelButton: true,
    confirmButtonText: "✅ Save",
    cancelButtonText: "❌ Cancel",
    focusConfirm: false,
    didOpen: () => {
      // Setup line numbers
      const textarea = document.getElementById("settingsInput");
      const lineNumbers = document.getElementById("lineNumbers");

      function updateLineNumbers() {
        const lines = textarea.value.split("\n").length;
        lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join("<br>");
      }

      textarea.addEventListener("input", updateLineNumbers);
      textarea.addEventListener("scroll", () => {
        lineNumbers.scrollTop = textarea.scrollTop;
      });
      updateLineNumbers();
    },
    preConfirm: () => {
      const input = document.getElementById("settingsInput").value.trim();
      if (!input) {
        showError("⚠ Please paste JSON data!");
        return false;
      }
      try {
        const parsed = JSON.parse(input);

        // ✅ Validate structure: Must be object of batches
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Invalid structure, must be an object of batches.");
        }

        for (const key in parsed) {
          const batch = parsed[key];
          if (!batch.name || !batch.groups) {
            throw new Error(
              `Batch "${key}" is missing 'name' or 'groups' property.`
            );
          }
        }

        hideError();
        return parsed;
      } catch (err) {
        showError("❌ Invalid JSON: " + err.message);
        return false;
      }
    },
  }).then(async (result) => {
    if (result.isConfirmed && result.value) {
      try {
        // Save to Firestore
        await setDoc(doc(db, "batches", "allBatches"), result.value, {
          merge: true,
        });
        Swal.fire(
          "✅ Imported",
          "Batch data has been saved successfully!",
          "success"
        );
      } catch (err) {
        Swal.fire("❌ Import Failed", err.message, "error");
      }
    }
  });

  // ========== ERROR TOAST FUNCTIONS ==========
  function showError(message) {
    const popup = document.getElementById("errorPopup");
    const msg = document.getElementById("errorMessage");
    msg.textContent = message;
    popup.style.display = "flex";

    // Restart animation
    popup.style.animation = "none";
    popup.offsetHeight; // reflow
    popup.style.animation = "slideIn 0.5s forwards";
  }

  function hideError() {
    const popup = document.getElementById("errorPopup");
    popup.style.display = "none";
  }
}


// Expose functions for inline HTML onclick attributes
window.addNewBatch = addNewBatch;
window.addParticipant = addParticipant;
window.removeParticipant = removeParticipant;
window.deleteBatch = deleteBatch;
window.toggleGroup2 = toggleGroup2;
window.exportAllData = exportAllData;
window.importDataFile = importDataFile;
window.importData = importData;

// ====================== INIT ======================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Batch Manager Ready");
  listenToBatches(); // auto-load from Firestore
});
