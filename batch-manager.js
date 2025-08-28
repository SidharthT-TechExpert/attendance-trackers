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
    Swal.fire({ icon: "warning", title: "Oops...", text: "Enter a batch suffix!" });
    return;
  }

  const batchName = `BC${batchSuffix}`;
  if (batches[batchName]) {
    Swal.fire({ icon: "error", title: "Batch Exists", text: `${batchName} already exists!` });
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
  Swal.fire({ icon: "success", title: "Batch Created", text: `${batchName} created successfully!` });
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
  const inputId = groupName === "Group_1" ? "newParticipant1" : "newParticipant2";
  const name = document.getElementById(inputId).value.trim();

  if (!name) {
    Swal.fire({ icon: "warning", title: "Oops...", text: "Enter a participant name!" });
    return;
  }

  // Prevent duplicates (ignore RP/C suffixes)
  const all = [
    ...batches[selectedBatch].groups.Group_1,
    ...(batches[selectedBatch].hasGroup2 ? batches[selectedBatch].groups.Group_2 ?? [] : []),
  ];
  if (all.some((p) => p.replace(/\(RP\)|\(C\)/g, "").trim().toLowerCase() === name.toLowerCase())) {
    Swal.fire({ icon: "error", title: "Duplicate Name", text: "This participant already exists!" });
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

      Swal.fire({ icon: "success", title: "Deleted!", text: "Batch deleted successfully." });
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
    item.className = `list-group-item batch-item ${selectedBatch === batchName ? "active" : ""}`;
    item.setAttribute("data-batch", batchName);
    item.onclick = () => selectBatch(batchName);

    const total =
      (batch.groups?.Group_1?.length ?? 0) +
      (batch.hasGroup2 ? (batch.groups?.Group_2?.length ?? 0) : 0);

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

  document.getElementById("selectedBatchTitle").textContent = `${selectedBatch} Details`;
  document.getElementById("hasGroup2").checked = !!batch.hasGroup2;
  document.getElementById("group2Section").style.display = batch.hasGroup2 ? "block" : "none";

  renderParticipantList("Group_1", batch.groups?.Group_1 ?? []);
  if (batch.hasGroup2) renderParticipantList("Group_2", batch.groups?.Group_2 ?? []);

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
      Swal.fire({ icon: "warning", title: "No Data", text: "No batches found to export." });
      return;
    }

    const data = snap.data();
    const backup = {
      batches: data,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `batches_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    Swal.fire({ icon: "success", title: "Exported!", text: "Backup downloaded successfully." });
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
        Swal.fire({ icon: "error", title: "Invalid File", text: "JSON does not contain batches." });
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
          Swal.fire({ icon: "success", title: "Imported!", text: "Data restored successfully." });
        }
      });
    } catch (err) {
      console.log("❌ Import error:", err);
      Swal.fire({ icon: "error", title: "Import Failed", text: "File format is invalid." });
    }
  };
  reader.readAsText(file);
}

// Expose functions for inline HTML onclick attributes
window.addNewBatch = addNewBatch;
window.addParticipant = addParticipant;
window.removeParticipant = removeParticipant;
window.deleteBatch = deleteBatch;
window.toggleGroup2 = toggleGroup2;
window.exportAllData = exportAllData;
window.importDataFile = importDataFile;


// ====================== INIT ======================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Batch Manager Ready");
  listenToBatches(); // auto-load from Firestore
});
