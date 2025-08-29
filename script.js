/* ====================== FIREBASE IMPORTS ====================== */
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* ====================== BATCH DATA MANAGEMENT ====================== */

// Load batch data from Firestore
async function loadBatchDataFromFirestore() {
  try {
    const snap = await getDoc(doc(db, "batches", "allBatches"));
    if (snap.exists()) {
      console.log("📥 Loaded batches from Firestore:");
      return snap.data();
    } else {
      console.log("⚠️ No batches found in Firestore, starting empty.");
      return {};
    }
  } catch (err) {
    console.error("❌ Error loading batches:", err);
    return {};
  }
}

// Save batch data to Firestore
async function saveBatchData(batches) {
  try {
    await setDoc(doc(db, "batches", "allBatches"), batches, { merge: true });
    console.log("✅ Saved batches to Firestore");
  } catch (err) {
    console.error("❌ Error saving batches:", err);
  }
}

/* ====================== STATE VARIABLES ====================== */
let currentBatchData = null;
let selectedBatchName = "";
let rawNames = [];
let displayNames = [];
let attendanceStatus = {};
let isRP = {};
let CoordinatorsA = {};
let Group = "";
let editingMode = false;

/* ====================== BATCH SELECTION ====================== */
async function loadBatch() {
  const batchSelect = document.getElementById("batchSelect");
  const selectedBatch = batchSelect.value;
  document.getElementById("outputView").textContent = "";

  if (!selectedBatch) {
    resetGroupData();
    return;
  }

  const batches = await loadBatchDataFromFirestore();
  console.log(batches);
  if (batches && batches[selectedBatch]) {
    currentBatchData = batches[selectedBatch];
    selectedBatchName = selectedBatch;
    updateGroupSwitches();
  }
}

function updateGroupSwitches() {
  const group2Switch = document.getElementById("group2");
  const group2Label = group2Switch?.nextElementSibling;

  if (currentBatchData && currentBatchData.hasGroup2) {
    group2Switch.disabled = false;
    if (group2Label) group2Label.style.opacity = "1";
  } else {
    group2Switch.disabled = true;
    group2Switch.checked = false;
    if (group2Label) group2Label.style.opacity = "0.5";
  }
}

function resetGroupData() {
  document
    .querySelectorAll('input[name="group"]')
    .forEach((cb) => (cb.checked = false));
  document.getElementById("list").innerHTML = "";
  rawNames = [];
  displayNames = [];
  attendanceStatus = {};
  isRP = {};
  CoordinatorsA = {};
  Group = "";
}

// Populate batch dropdown
async function populateBatchDropdown() {
  const batchSelect = document.getElementById("batchSelect");

  while (batchSelect.children.length > 1) {
    batchSelect.removeChild(batchSelect.lastChild);
  }

  const batches = await loadBatchDataFromFirestore();
  if (batches && Object.keys(batches).length > 0) {
    Object.keys(batches).forEach((batchName) => {
      const option = document.createElement("option");
      option.value = batchName;
      option.textContent = batchName;
      batchSelect.appendChild(option);
    });
    console.log(
      `✅ Populated dropdown with ${Object.keys(batches).length} batches`
    );
  } else {
    console.log("⚠️ No batches found in Firestore");
  }
}

/* ====================== GROUP SELECTION ====================== */
const checkboxes = document.querySelectorAll('input[name="group"]');

checkboxes.forEach((cb) => {
  cb.addEventListener("change", function () {
    if (this.checked) {
      if (!currentBatchData) {
        Swal.fire({
          icon: "warning",
          title: "No Batch Selected",
          text: "Please select a batch first!",
        });
        this.checked = false;
        return;
      }

      let groupData = [];
      if (this.value === "group1") {
        groupData = currentBatchData.groups.Group_1;
        Group = "Group 1";
        console.log(groupData);
      } else if (this.value === "group2") {
        if (!currentBatchData.hasGroup2) {
          Swal.fire({
            icon: "warning",
            title: "Group 2 Not Available",
            text: "This batch doesn't have Group 2 enabled!",
          });
          this.checked = false;
          return;
        }
        groupData = currentBatchData.groups.Group_2;
        Group = "Group 2";
      } else if (this.value === "combined") {
        groupData = [...currentBatchData.groups.Group_1];
        if (currentBatchData.hasGroup2)
          groupData.push(...currentBatchData.groups.Group_2);
        Group = "Combined";
      }

      rawNames = groupData;
      displayNames = [];
      attendanceStatus = {};
      isRP = {};
      CoordinatorsA = {};

      displayNames = rawNames
        .filter((n) => {
          if (n.includes("(RP)")) {
            const clean = n.replace(" (RP)", "");
            attendanceStatus[clean] = "RP";
            isRP[clean] = true;
            return false;
          }
          if (n.includes("(C)")) {
            const clean = n.replace(" (C)", "");
            CoordinatorsA[clean] = "present";
            attendanceStatus[clean] = "C";
            return true;
          }
          return true;
        })
        .map((n) => n.replace(" (C)", ""));

      displayNames.forEach((n) => {
        if (!attendanceStatus[n]) attendanceStatus[n] = "present";
      });

      renderList();
      checkboxes.forEach((other) => {
        if (other !== this) other.checked = false;
      });
    } else {
      resetGroupData();
      renderList();
    }
  });
});

/* ====================== RENDER PARTICIPANT LIST ====================== */
function renderList() {
  const listDiv = document.getElementById("list");
  listDiv.innerHTML = "";

  displayNames
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      const div = document.createElement("div");
      // Add rp-row class if RP
      div.className = "person col-md-4" + (isRP[name] ? " rp-row" : "");
      div.style.display = "inline-block";
      div.innerHTML = `
      <div class="name col-md-6" style='display:inline-block;'>${name}</div>
      <div class="col-md-5" style='display:inline-block;' >
          <input style='display:inline-block;' name='alt' type="checkbox" class="custom-tooltip" data-tooltip="Attending alternative CS" onchange="mark('${name}','other',this)"> 🟨
          <input style='display:inline-block;' name='Absent' type="checkbox" class="custom-tooltip" data-tooltip="Absent" onchange="mark('${name}','absent',this)"> ❌
     </div>
    `;
      listDiv.appendChild(div);
    });
}

/* ====================== ATTENDANCE ====================== */
function mark(name, state, checkbox) {
  const cbs = document.querySelectorAll(`.person input[onchange*="${name}"]`);
  cbs.forEach((cb) => {
    if (cb !== checkbox) cb.checked = false;
  });
  attendanceStatus[name] = checkbox.checked ? state : "present";
  if (CoordinatorsA[name])
    CoordinatorsA[name] = checkbox.checked ? state : "present";
  updateNameColors();
}

function updateNameColors() {
  document.querySelectorAll(".person").forEach((row) => {
    const alt = row.querySelector('input[name="alt"]').checked;
    const absent = row.querySelector('input[name="Absent"]').checked;
    const nameSpan = row.querySelector(".name");
    if (!nameSpan) return;

    nameSpan.style.color = "";
    nameSpan.style.fontWeight = "bold";

    if (alt) nameSpan.style.color = "orange";
    else if (absent) nameSpan.style.color = "red";
  });
}

/* ====================== DATE HELPERS ====================== */
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function formatShortDate(date) {
  const d = new Date(date);
  return `${d.getDate()} ${d.toLocaleString("en-US", {
    month: "short",
  })} ${d.getFullYear()}`;
}

/* ====================== INIT ====================== */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("✅ DOM Ready");
  await populateBatchDropdown();
  const currentDate = document.getElementById("currentDate");
  if (currentDate) currentDate.textContent = formatDate(new Date());

  // Attach listeners here
  const batchSelect = document.getElementById("batchSelect");
  if (batchSelect) {
    batchSelect.addEventListener("change", loadBatch);
    batchSelect.addEventListener("click", loadBatchDataFromFirestore);
  }
});
