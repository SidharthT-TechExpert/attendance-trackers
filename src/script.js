/* ====================== FIREBASE IMPORTS ====================== */
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  collection,
  getDocs,
  where,
  serverTimestamp,
  query,
  addDoc,
} from "firebase/firestore";

import { createBackup, cleanupOldBackups } from "./settings.js";

// Helper to get element by ID
const $ = (id) => document.getElementById(id);

/* ====================== BATCH DATA MANAGEMENT ====================== */
let batches;
// Load batch data from Firestore
export async function loadBatchDataFromFirestore() {
  try {
    const snap = await getDoc(doc(db, "batches", "allBatches"));
    if (snap.exists()) {
      batches = snap.data(); // object of batches
      console.log("📥 Loaded batches from Firestore");

      // Get <select> element
      const batchSelect = $("batchSelect");
      batchSelect.innerHTML = `<option value="">Select a batch...</option>`;

      // Extract & sort batch names (numeric-aware if possible)
      const batchNames = Object.keys(batches).sort((a, b) => {
        const numA = parseInt(a.match(/\d+/));
        const numB = parseInt(b.match(/\d+/));

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB; // numeric sort (Batch 1, Batch 2, Batch 10)
        }
        return a.localeCompare(b); // fallback string sort
      });

      // Add sorted options to <select>
      batchNames.forEach((batchName) => {
        const option = document.createElement("option");
        option.value = batchName;
        option.textContent = batchName;
        batchSelect.appendChild(option);
      });
      resetGroupData();
      return batches; // still return the raw batches object
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
  const batchSelect = $("batchSelect");
  const selectedBatch = batchSelect.value;
  $("outputView").textContent = "";

  if (!selectedBatch) {
    resetGroupData();
    return;
  }

  if (batches && batches[selectedBatch]) {
    currentBatchData = batches[selectedBatch];
    selectedBatchName = selectedBatch;
    updateGroupSwitches();

    // ✅ show batch name in separate span, not inside <select>
    const text = $("selectedBatchTitle");
    text.textContent = `Selected Batch: ${selectedBatch}`;
    text.style.color = "red";
    text.style.fontWeight = "bold";
    //renderList();
    resetGroupData();
    // ✅ update time button
    $("Time").innerHTML = currentBatchData?.Time ?? "⏰ Select Time";
  }
}

function updateGroupSwitches() {
  $("groups").style.display = "block";
  const group2Switch = $("group2");
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
  $("list").innerHTML = "";
  rawNames = [];
  displayNames = [];
  attendanceStatus = {};
  isRP = {};
  CoordinatorsA = {};
  Group = "";
}

/* ====================== POPULATE DROPDOWN ====================== */
async function populateBatchDropdown() {
  const batchSelect = $("batchSelect");

  while (batchSelect.children.length > 1) {
    batchSelect.removeChild(batchSelect.lastChild);
  }

  const fetchedBatches = await loadBatchDataFromFirestore();
  if (fetchedBatches && Object.keys(fetchedBatches).length > 0) {
    Object.keys(fetchedBatches).forEach((batchName) => {
      const option = document.createElement("option");
      option.value = batchName;
      option.textContent = batchName;
      batchSelect.appendChild(option);
    });
    console.log(
      `✅ Populated dropdown with ${Object.keys(fetchedBatches).length} batches`
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
      let groupData = [];

      document.getElementById("importData").style.display = "flex";

      if (this.value === "group1") {
        groupData = currentBatchData.groups.Group_1;
        Group = "Group 1";
      } else if (this.value === "group2") {
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
      $("outputtext").style.display = "block";
      checkboxes.forEach((other) => {
        if (other !== this) other.checked = false;
      });
    } else {
      $("importData").style.display = "none";
      resetGroupData();
      renderList();
    }
  });
});

/* ====================== RENDER PARTICIPANT LIST ====================== */
function renderList() {
  $("notifications").style.display = "block";
  const listDiv = $("list");
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
          <input style='display:inline-block;' name='alt' type="checkbox" class="custom-tooltip" data-tooltip="Attending alternative CS" onchange="mark('${name}','other',this);"> 🟨
          <input style='display:inline-block;' name='Absent' type="checkbox" class="custom-tooltip" data-tooltip="Absent" onchange="mark('${name}','absent',this);"> ❌
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

// ====================== REPORT GENERATION ======================
async function generateOutput() {
  // --- Static report headers ---
  const Mean = "🔒 COMMUNICATION SESSION REPORT";
  const Batch = selectedBatchName;

  const date = FormateDate(new Date());
  const GroupName = Group;
  const Time =
    currentBatchData?.Time !== getSelectedTime()
      ? getSelectedTime()
      : currentBatchData?.Time; // Get selected time from custom dropdown

  if (Batch === "")
    return Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Please Select A Batch !",
    });

  if (GroupName === "")
    return Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Please Select The Group !",
    });

  $("none").style.display = "flex";
  document.querySelector(".btn-group").style.display = "flex";

  // --- Get Coordinators per group ---
  let Coordinators = Object.keys(CoordinatorsA).filter(
    (n) => CoordinatorsA[n] !== ""
  );

  if (Coordinators.length === 0) {
    Coordinators = null; // If no coordinators found, set to null
  } else if (Coordinators.length === 1) {
    Coordinators = Coordinators[0];
  } else if (Coordinators.length === 2) {
    Coordinators = Coordinators[0] + ` & ` + Coordinators[1];
  } else if (Coordinators.length === 4) {
    let Names = Coordinators;
    Coordinators = "";
    Names.forEach((n, i) => {
      if (i === Names.length - 2) {
        Coordinators += " - Grp_1 \n👫 Coordinators : " + n + " & ";
      } else if (i === 0) {
        Coordinators += n + " & ";
      } else if (i === Names.length - 1) {
        Coordinators += n + " - Grp_2 ";
      } else {
        Coordinators += n;
      }
    });
  }

  const Trainer = currentBatchData.Trainer;

  let Duck = "";

  if (Group === "Combined") {
    Duck = "🔷".repeat(27);
  } else {
    try {
      Duck = "🔷".repeat(Coordinators.length / 2 + 6);
    } catch (error) {
      Duck = "🔷".repeat(27);
    }
  }

  // --- Collect extra details ---
  const tldv = $("tldv").value.trim();
  const meetList = $("meetlist").value.trim();
  const tldvLink = tldv ? `Tldv: ${tldv}` : "Tldv: Not provided";
  const meetListLink = meetList
    ? `Meet list: ${meetList}`
    : "Meet list: Not provided";
  const reportBy = document
    .getElementById("reportBy")
    .value.trim()
    .trimStart()
    .split(" ")
    .map((word) => `${word.charAt(0).toUpperCase() + word.slice(1)}`)
    .join(" ");
  const reportByText = $("over").value.trim();
  let OtherBatch = $("Batch").value.trim().split(",");

  // --- Details block ---
  const Detalis = `${Duck}\n${Mean} \n🎓 Batch : ${Batch} ${GroupName} \n📅 Date : ${date}\n⏰ Time : ${Time} \n👨🏻‍🏫 Trainer :${Trainer}\n👫 Coordinators : ${Coordinators}\n${Duck}\n\n`;

  // --- Session overview ---
  const Report = `♻ Session Overview:\n           ${reportByText}`;

  // --- Attendance builder helper ---
  let textMaker = (text, icon, status, textIcon, check = attendanceStatus) => {
    let Text;
    // If check is an array (OtherBatch), handle differently

    if (check === attendanceStatus) {
      Text =
        `\n\n${icon} ${text} (${counter(status, check)}) :\n\n` +
        Object.keys(check)
          .filter(
            (n) =>
              attendanceStatus[n] === status ||
              (attendanceStatus[n] === "C" && status === CoordinatorsA[n])
          )
          .sort((a, b) => a.localeCompare(b))
          .map((n) => `${textIcon} ${n} `)
          .join("\n");
    } else if (check === OtherBatch) {
      Text =
        `\n\n${icon} ${text} (${check.length}) :\n\n` +
        check
          .sort((a, b) => a.trim().localeCompare(b.trim()))
          .map((name) =>
            name
              .trimStart()
              .split(" ")
              .map((word) => `${word.charAt(0).toUpperCase() + word.slice(1)}`)
              .join(" ")
          )
          .map((name) => `${textIcon} ${name} `)
          .join("\n");
    }
    return Text;
  };

  // --- Attendance counters ---
  const counter = (state, check = attendanceStatus) => {
    return Object.keys(check).filter(
      (n) =>
        attendanceStatus[n] === state ||
        (attendanceStatus[n] === "C" && state === CoordinatorsA[n])
    ).length;
  };
  // --- Build sections ---
  let count = counter("present");
  let presentees = textMaker("Presentees", "🟩", "present", "✅") + "\n";
  presentees = count === 0 ? "" : presentees;

  count = counter("other");
  let alternative =
    textMaker("Alternative Session", "🟨", "other", "☑️") + "\n";
  alternative = count === 0 ? "" : alternative;

  count = OtherBatch.length;
  let OtherBatches =
    textMaker("Other Batches", "🤩", "", "✨", OtherBatch) + "\n";
  OtherBatches = OtherBatch[0] === "" ? "" : OtherBatches;

  count = counter("absent");
  let absentees = textMaker("Absentees", "❌", "absent", "🚫") + "\n";
  absentees = count === 0 ? "" : absentees;

  count = counter("RP");
  let RP = textMaker("Refresh Period", "🔃", "RP", "🔄") + "\n";
  RP = count === 0 ? "" : RP;

  // --- Links and footer ---
  const link = `\n\n🔗 Link: \n\n      ${tldvLink}\n      ${meetListLink}\n\n ✍ Report By : ${reportBy}`;

  // --- FINAL REPORT OUTPUT ---
  const finalText =
    Detalis +
    Report +
    presentees +
    OtherBatches +
    alternative +
    absentees +
    RP +
    link;

  // Update both view and edit modes
  $("outputView").textContent = finalText;
  $("outputEdit").value = finalText;

  // await Swal.fire({
  //   icon: "question",
  //   title: "Submission Request",
  //   html: `
  //     <div style="text-align:center; padding:15px; font-family: Arial, sans-serif;">
  //       <h2 style="margin-bottom:10px; font-weight:bold; font-size:24px; color:#222;">
  //         Do you want to submit this report?
  //       </h2>
  //       <p style="font-size:16px; color:#555; margin:0;">
  //         Once submitted, you may not be able to edit it later.
  //       </p>
  //     </div>
  //   `,
  //   showCancelButton: true,
  //   confirmButtonText: "🚀 Yes, Submit",
  //   cancelButtonText: "❌ No, Cancel",
  //   confirmButtonColor: "#28a745",   // success green
  //   cancelButtonColor: "#dc3545",    // danger red
  //   width: "450px",
  //   backdrop: `rgba(0,0,0,0.6)`,
  //   focusConfirm: false,
  //   allowOutsideClick: false,
  //   allowEscapeKey: true,
  //   customClass: {
  //     popup: "animated fadeInDown faster", // optional animate.css
  //   },
  // }).then((result) => {
  //   if (result.isConfirmed) {

  //     console.log("Report submitted!");
  //   saveReport(finalText, Batch, GroupName, Trainer, Coordinators);
  //   } else {
  //     console.log("Submission cancelled.");
  //   }
  // });
}

// ====================== SAVE MULTIPLE REPORTS ======================
async function saveReport(finalText, batchId, groupName, Trainer, Names) {
  try {
    const dateKey = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const reportsCol = collection(
      db,
      "reports",
      "allBatches",
      "batches",
      batchId,
      "groups",
      groupName,
      "reportsByDate",
      dateKey,
      "allReports"
    );

    // Expiry timestamp = now + 2 days
    const expireAt = Timestamp.fromDate(
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    );

    const counter = (state, check = attendanceStatus) => {
      return Object.keys(check).filter(
        (n) =>
          attendanceStatus[n] === state ||
          (attendanceStatus[n] === "C" && state === CoordinatorsA[n])
      ).length;
    };

    let attendees1 = counter("present") + counter("other");

    await addDoc(reportsCol, {
      report: finalText,
      createdAt: serverTimestamp(),
      expireAt: expireAt, // 🔥 Firestore TTL uses this field
      batch: batchId,
      group: groupName,
      date: dateKey,
      title: "Session Report",
      attendees: attendees1,
      trainer: Trainer,
      coordinators: Names,
    });

    console.log(
      `✅ Report saved with expiry for ${batchId} - ${groupName}` +
        getReports(batchId, groupName, dateKey)
    );
  } catch (error) {
    console.error("❌ Error saving report:", error);
  }
}
async function getReports(batchId, groupName, dateKey) {
  const reportsCol = collection(
    db,
    "reports",
    "allBatches",
    "batches",
    batchId,
    "groups",
    groupName,
    "reportsByDate",
    dateKey,
    "allReports"
  );

  const snapshot = await getDocs(reportsCol);
  const reports = snapshot.docs.map((doc) => ({
    id: doc.id, // autoId
    ...doc.data(),
  }));

  return reports;
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

function FormateDate(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" }); // "Aug"
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// Function to get the selected time from the custom dropdown
function getSelectedTime() {
  const btn = document.querySelector(".custom-dropdownH .dropdown-btnH");
  if (btn) {
    return btn.textContent.replace("⌄", "").replace("⏰", "").trim();
  }
  return "11:30 AM - 12:30 PM"; // fallback
}

// ====================== COPY TO CLIPBOARD ======================
function copyOutput() {
  const viewMode = $("outputView");
  const editMode = $("outputEdit");
  const copyBtn = document.querySelector(".copy-btn");

  // Pick content from active mode
  const textToCopy =
    editMode.style.display === "block" ? editMode.value : viewMode.textContent;

  // Copy to clipboard
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      copyBtn.innerText = "✅ Copied!";
      setTimeout(() => (copyBtn.innerText = "📋 Copy"), 2000);
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
    });
}

// ====================== DOWNLOAD REPORT ======================
function downloadReport() {
  const viewMode = $("outputView");
  const editMode = $("outputEdit");

  if (viewMode.textContent === "")
    return Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Please generate the report first!",
    });

  // Pick content from active mode
  const textToDownload =
    editMode.style.display === "block" ? editMode.value : viewMode.textContent;

  // Create download
  const dataBlob = new Blob([textToDownload], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);

  // Generate filename with current date and batch info
  const date = new Date().toISOString().split("T")[0];
  const batchInfo = selectedBatchName || "BCR71";
  link.download = `attendance_report_${batchInfo}_${date}.txt`;

  link.click();

  Swal.fire({
    icon: "success",
    title: "Download Complete",
    text: "Report has been downloaded as .txt file!",
  });
}

// ====================== TOGGLE EDIT MODE ======================

function toggleEdit() {
  const outputView = $("outputView");
  const outputEdit = $("outputEdit");
  const editBtn = $("editBtn");
  const toolbar = $("outputToolbar");

  // Place toolbar below header
  toolbar.style.top = "40px";

  // Remove leftover animations
  outputView.classList.remove("slide-in", "slide-out");
  outputEdit.classList.remove("slide-in", "slide-out");

  if (!editingMode) {
    // --- ENTER EDIT MODE ---
    editingMode = true;
    document.getElementById("list").style.display = "none";
    toolbar.classList.add("fullscreen");

    // Animate view out
    outputView.classList.add("slide-out");
    setTimeout(() => {
      outputView.style.display = "none";

      // Animate editor in
      outputEdit.style.display = "block";
      outputEdit.classList.add("edit-fullscreen", "slide-in");

      // Keep text synced
      outputEdit.value = outputView.textContent;

      editBtn.textContent = "💾 Save";
      outputEdit.focus();
    }, 400);
  } else {
    // --- EXIT EDIT MODE ---
    editingMode = false;

    // Save edits
    outputView.textContent = outputEdit.value;

    // Animate editor out
    outputEdit.classList.remove("slide-in");
    outputEdit.classList.add("slide-out");
    setTimeout(() => {
      outputEdit.style.display = "none";

      // Animate view in
      outputView.style.display = "block";
      outputView.classList.add("slide-in");

      toolbar.classList.remove("fullscreen");
      editBtn.textContent = "✏️ Edit";

      document.getElementById("list").style.display = "block";
    }, 400);
  }
}

window.mark = mark;
window.generateOutput = generateOutput;
window.populateBatchDropdown = populateBatchDropdown;
window.formatDate = formatDate;
window.loadBatch = loadBatch;
window.loadBatchDataFromFirestore = loadBatchDataFromFirestore;
window.copyOutput = copyOutput;
window.downloadReport = downloadReport;
window.toggleEdit = toggleEdit;

/* ====================== INIT ====================== */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("✅ DOM Ready");
  // await populateBatchDropdown();
  const currentDate = $("currentDate");
  if (currentDate) currentDate.textContent = formatDate(new Date());

  // Auto backup & cleanup
  await createBackup("auto");
  await cleanupOldBackups();

  // Load batches
  await loadBatchDataFromFirestore();
});

// ====================== CUSTOM DROPDOWN ======================
document.addEventListener("DOMContentLoaded", function () {
  const dropdown = document.querySelector(".custom-dropdownH");
  const btn = dropdown.querySelector(".dropdown-btnH");
  const menuItems = dropdown.querySelectorAll(".dropdown-menuH li");
  const hiddenInput = $("timeH"); // assumes you use jQuery's $()

  // Toggle dropdown
  btn.addEventListener("click", () => {
    dropdown.classList.toggle("active");

    // Check available space below
    const rect = dropdown.getBoundingClientRect();
    const menu = dropdown.querySelector(".dropdown-menuH");
    const spaceBelow = window.innerHeight - rect.bottom;

    if (menu && spaceBelow < menu.offsetHeight) {
      dropdown.classList.add("dropup");   // open upward
    } else {
      dropdown.classList.remove("dropup"); // open downward
    }
  });

  // Handle item click
  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      btn.innerHTML =
        "⏰ " + item.textContent + ' <span class="arrow">⌄</span>';
      hiddenInput.value = item.textContent;
      dropdown.classList.remove("active");
      dropdown.classList.remove("dropup");
    });
  });

  // Close if clicked outside
  window.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
      dropdown.classList.remove("dropup");
    }
  });

  // Set default time
  const defaultTime = "11:30 AM - 12:30 PM";
  btn.innerHTML = `⏰ ${defaultTime} <span class="arrow">⌄</span>`;
  hiddenInput.value = defaultTime;
});
