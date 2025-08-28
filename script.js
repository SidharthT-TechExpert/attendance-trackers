/* ====================== FIREBASE IMPORTS ====================== */
import { db } from "./firebase.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* ====================== BATCH DATA MANAGEMENT ====================== */

// Load batch data from Firestore
async function loadBatchDataFromFirestore() {
  try {
    const snap = await getDoc(doc(db, "batches", "allBatches"));
    if (snap.exists()) {
      console.log("📥 Loaded batches from Firestore:", snap.data());
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

// Save batch data to Firestore (if you need to write from this page)
async function saveBatchData(batches) {
  try {
    await setDoc(doc(db, "batches", "allBatches"), batches);
    console.log("✅ Saved batches to Firestore");
  } catch (err) {
    console.error("❌ Error saving batches:", err);
  }
}

/* ====================== STATE VARIABLES ====================== */
let currentBatchData = null;
let selectedBatchName = "";
let rawNames;
let displayNames = [];
let attendanceStatus = {};
let isRP = {};
let CoordinatorsA = {};
let Group = "";

/* ====================== BATCH SELECTION ====================== */
async function loadBatch() {
  const batchSelect = document.getElementById("batchSelect");
  const selectedBatch = batchSelect.value;
  document.getElementById("outputView").textContent = "";

  if (!selectedBatch) {
    currentBatchData = null;
    selectedBatchName = "";
    resetGroupData();
    return;
  }

  const batches = await loadBatchDataFromFirestore();
  if (batches && batches[selectedBatch]) {
    currentBatchData = batches[selectedBatch];
    selectedBatchName = selectedBatch;
    updateGroupSwitches();
  }
}

function updateGroupSwitches() {
  const group2Switch = document.getElementById("group2");
  const group2Label = group2Switch.nextElementSibling;

  if (currentBatchData && currentBatchData.hasGroup2) {
    group2Switch.disabled = false;
    group2Label.style.opacity = "1";
  } else {
    group2Switch.disabled = true;
    group2Switch.checked = false;
    group2Label.style.opacity = "0.5";
  }
}

function resetGroupData() {
  document.querySelectorAll('input[name="group"]').forEach((cb) => (cb.checked = false));
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
  if (batches) {
    Object.keys(batches).forEach((batchName) => {
      const option = document.createElement("option");
      option.value = batchName;
      option.textContent = batchName;
      batchSelect.appendChild(option);
    });
    console.log(`Populated dropdown with ${Object.keys(batches).length} batches`);
  } else {
    console.log("No batches found in Firestore");
  }
}

/* ====================== INIT ====================== */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM Content Loaded - initializing.");
  populateBatchDropdown();

  const currentDate = document.getElementById("currentDate");
  if (currentDate) {
    currentDate.textContent = formatDate(new Date());
  }
});

/* ====================== (Keep your existing attendance UI/helpers below) ====================== */
// … your existing mark(), updateNameColors(), generateOutput(), copyOutput(), downloadReport(), etc.
