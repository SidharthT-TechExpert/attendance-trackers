/* ====================== BATCH DATA MANAGEMENT ====================== */

// ✅ Clear attendance-related data on every page load
window.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("attendanceBatches");
  console.log("✅ Cleared attendanceBatches from localStorage on page load");
});

// Load batch data from localStorage
function loadBatchDataFromStorage() {
  const saved = localStorage.getItem("attendanceBatches");
  if (saved) {
    return JSON.parse(saved);
  } else {
    // If no saved data, initialize with default batches
    localStorage.setItem("attendanceBatches", JSON.stringify(defaultBatches));
    return defaultBatches;
  }
}

// Get current batch data
let currentBatchData = null;
let selectedBatchName = "";

// ====================== BATCH SELECTION ======================
function loadBatch() {
  const batchSelect = document.getElementById("batchSelect");
  const selectedBatch = batchSelect.value;
  // Update view modes
  document.getElementById("outputView").textContent = "";

  if (!selectedBatch) {
    currentBatchData = null;
    selectedBatchName = "";
    resetGroupData();
    return;
  }

  const batches = loadBatchDataFromStorage();
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
  // Reset all group checkboxes
  document.querySelectorAll('input[name="group"]').forEach((cb) => {
    cb.checked = false;
  });

  // Clear the participant list
  document.getElementById("list").innerHTML = "";

  // Reset state variables
  rawNames = [];
  displayNames = [];
  attendanceStatus = {};
  isRP = {};
  CoordinatorsA = {};
  Group = "";
}

// Populate batch dropdown
function populateBatchDropdown() {
  const batchSelect = document.getElementById("batchSelect");

  // Clear existing options except the first one
  while (batchSelect.children.length > 1) {
    batchSelect.removeChild(batchSelect.lastChild);
  }

  const batches = loadBatchDataFromStorage();

  if (batches) {
    Object.keys(batches).forEach((batchName) => {
      const option = document.createElement("option");
      option.value = batchName;
      option.textContent = batchName;
      batchSelect.appendChild(option);
    });

    console.log(
      `Populated dropdown with ${Object.keys(batches).length} batches`
    );
  } else {
    console.log("No batches found in storage");
  }
}

// Checkbox selector for group selection
const checkboxes = document.querySelectorAll('input[name="group"]');

// ====================== STATE VARIABLES ======================
let rawNames; // raw list selected from Group_1 / Group_2 / Combined
let displayNames = []; // cleaned names without RP / C tags
let attendanceStatus = {}; // stores status of each name (present, RP, absent, etc.)
let isRP = {}; // RP-specific flag for highlighting rows
let CoordinatorsA = {}; // stores coordinators per group
let Group = ""; // holds selected group label

// ====================== GROUP SELECTION ======================
checkboxes.forEach((cb) => {
  cb.addEventListener("change", function () {
    if (this.checked) {
      // Check if batch is selected
      if (!currentBatchData) {
        Swal.fire({
          icon: "warning",
          title: "No Batch Selected",
          text: "Please select a batch first!",
        });
        this.checked = false;
        return;
      }

      // --- Pick rawNames based on selected checkbox and current batch ---
      let groupData;
      if (this.value === "group1") {
        groupData = currentBatchData.groups.Group_1;
        Group = "Group 1";
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
        if (currentBatchData.hasGroup2) {
          groupData = [...groupData, ...currentBatchData.groups.Group_2];
        }
        Group = "Combined";
      }

      rawNames = groupData;

      // Reset state
      displayNames = [];
      attendanceStatus = {};
      isRP = {};
      CoordinatorsA = {};

      // --- Clean and categorize names ---
      displayNames = rawNames
        .filter((n) => {
          if (n.includes("(RP)")) {
            // If RP → mark as RP (but don't show in list)
            const cleanName = n.replace(" (RP)", "");
            attendanceStatus[cleanName] = "RP";
            isRP[cleanName] = true; // ✅ use RP flag for row highlight
            return false;
          }
          if (n.includes("(C)")) {
            // If Coordinator → mark as C and show
            CoordinatorsA[n.replace(" (C)", "")] = "present"; // Store coordinator status

            const cleanName = n.replace(" (C)", "");
            attendanceStatus[cleanName] = "C";
            return true;
          }
          return true; // normal names → show
        })
        .map((n) => {
          if (n.includes("(C)")) {
            return n.replace(" (C)", ""); // remove (C) in display
          }
          attendanceStatus[n] = "present"; // default status
          return n;
        });

      // Render updated list
      console.log(attendanceStatus)
      renderList();

      // --- Ensure only one group checkbox stays checked ---
      checkboxes.forEach((other) => {
        if (other !== this) other.checked = false;
      });
    } else {
      // --- If unchecked → reset everything ---
      displayNames = [];
      attendanceStatus = {};
      isRP = {};
      rawNames = [];
      renderList();
    }
  });
});

// ====================== RENDER PARTICIPANT LIST ======================
function renderList() {
  const listDiv = document.getElementById("list");
  listDiv.innerHTML = ""; // Clear previous

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

// ====================== MARK ATTENDANCE ======================
function mark(name, state, checkbox) {
  // --- Ensure only one checkbox can be active at a time ---
  const cbs = document.querySelectorAll(`.person input[onchange*="${name}"]`);
  cbs.forEach((cb) => {
    if (cb !== checkbox) cb.checked = false;
  });

  // --- Update attendance state ---
  attendanceStatus[name] = checkbox.checked ? state : "present";
  CoordinatorsA[name] = checkbox.checked ? state : "present";

  // --- Update color coding ---
  updateNameColors();
}

// ====================== COLOR CODING ======================
function updateNameColors() {
  document.querySelectorAll(".person").forEach((row) => {
    const altChecked = row.querySelector('input[name="alt"]').checked;
    const absentChecked = row.querySelector('input[name="Absent"]').checked;
    const nameSpan = row.querySelector(".name");

    if (nameSpan) {
      // Reset default style
      nameSpan.style.color = "";
      nameSpan.style.fontWeight = "bold";
      nameSpan.style.textShadow = "";

      // Apply state styles
      if (altChecked) {
        nameSpan.style.color = "var(--bs-warning)"; // yellow
        nameSpan.style.textShadow = "1px 1px 2px red";
      } else if (absentChecked) {
        nameSpan.style.color = "var(--bs-danger)"; // red
        nameSpan.style.textShadow = "1px 1px 2px darkred";
      }
    }
  });
}

// ====================== REPORT GENERATION ======================
function generateOutput() {
  // --- Static report headers ---

  const Mean = "🔒 COMMUNICATION SESSION REPORT";
  const Batch = selectedBatchName || "BCR71"; // Use selected batch or default

  const date = FormateDate(new Date());
  const GroupName = Group;
  const Time = getSelectedTime(); // Get selected time from custom dropdown

  if (GroupName === "")
    return Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Please Select The Group first!",
    });
  // --- Get Coordinators per group ---
  let Coordinators = Object.keys(CoordinatorsA).filter((n) => CoordinatorsA[n]!=='')
  if (Coordinators.length === 0) {
    Coordinators = null; // If no coordinators found, set to null
  } else if (Coordinators.length === 1) {
    Coordinators = Coordinators[0];
  } else if (Coordinators.length === 2) {
    Coordinators = Coordinators[0] + ` & ` + Coordinators[1];
  } else if (Coordinators.length === 4) {
    Names = Coordinators;
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

  const Trainer = " Sarang TP";

  let Duck = "";

  if (Group === "Combined") {
    Duck = "🔷".repeat(27);
  } else {
    Duck = "🔷".repeat(Coordinators.length / 2 + 6);
  }

  // --- Collect extra details ---
  const tldv = document.getElementById("tldv").value.trim();
  const meetList = document.getElementById("meetlist").value.trim();
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
  const reportByText = document.getElementById("over").value.trim();
  let OtherBatch = document.getElementById("Batch").value.trim().split(",");

  // --- Details block ---
  const Detalis = `${Duck}\n${Mean} \n🎓 Batch : ${Batch} ${GroupName} \n📅 Date : ${date}\n⏰ Time : ${Time} \n👨🏻‍🏫 Trainer :${Trainer}\n👫 Coordinators : ${Coordinators}\n${Duck}\n\n`;

  // --- Session overview ---
  const Report = `♻ Session Overview:\n           ${reportByText}`;

  // --- Attendance builder helper ---
  //("Presentees", "🟩", "present", "✅");
    console.log(attendanceStatus)

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
  let presentees = textMaker("Presentees", "🟩", "present", "✅");
  presentees = count === 0 ? "" : presentees;

  count = counter("other");
  let alternative = textMaker("Alternative Session", "🟨", "other", "☑️");
  alternative = count === 0 ? "" : alternative;

  count = OtherBatch.length;
  let OtherBatches = textMaker("Other Batches", "🤩", "", "✨", OtherBatch);
  OtherBatches = OtherBatch[0] === "" ? "" : OtherBatches;

  count = counter("absent");
  let absentees = textMaker("Absentees", "❌", "absent", "🚫");
  absentees = count === 0 ? "" : absentees;

  count = counter("RP");
  let RP = textMaker("Refresh Period", "🔃", "RP", "🔄");
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
  document.getElementById("outputView").textContent = finalText;
  document.getElementById("outputEdit").value = finalText;
}

// ====================== UTILITIES ======================
function formatDate(date) {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

function FormateDate(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" }); // "Aug"
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// ====================== COPY TO CLIPBOARD ======================
function copyOutput() {
  const viewMode = document.getElementById("outputView");
  const editMode = document.getElementById("outputEdit");
  const copyBtn = document.querySelector(".copy-btn");

  if (viewMode.textContent === "")
    return Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Please generate the report first!",
    });

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
  const viewMode = document.getElementById("outputView");
  const editMode = document.getElementById("outputEdit");

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
let editingMode = false;

function toggleEdit() {
  const outputView = document.getElementById("outputView");
  const outputEdit = document.getElementById("outputEdit");
  const editBtn = document.getElementById("editBtn");
  const toolbar = document.getElementById("outputToolbar");
  const header = document.querySelector("header");

  if (outputView.textContent === "")
    return Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Please generate the report first!",
    });

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

// ====================== INIT BOOTSTRAP TOOLTIP & DATE ======================
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded - initializing...");

  // Enable Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Display current date
  const currentDate = document.getElementById("currentDate");
  if (currentDate) {
    currentDate.textContent = formatDate(new Date());
  }

  // Populate batch dropdown - This is the key fix
  populateBatchDropdown();

  // Set up group checkboxes event listeners (they're defined globally above)
  // Make sure checkboxes are available
  setTimeout(() => {
    const groupCheckboxes = document.querySelectorAll('input[name="group"]');
    console.log(`Found ${groupCheckboxes.length} group checkboxes`);
  }, 100);
});

// ====================== CUSTOM DROPDOWN ======================
document.addEventListener("DOMContentLoaded", function () {
  // Custom dropdown functionality
  document.querySelectorAll(".custom-dropdown").forEach((drop) => {
    const btn = drop.querySelector(".dropdown-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        drop.classList.toggle("active");
      });
    }

    drop.querySelectorAll(".dropdown-menu li").forEach((item) => {
      item.addEventListener("click", () => {
        if (btn) {
          btn.innerHTML =
            "⏰ " + item.textContent + ' <span class="arrow">⌄</span>';
        }
        drop.classList.remove("active");
      });
    });
  });

  // Close if clicked outside
  window.addEventListener("click", (e) => {
    document.querySelectorAll(".custom-dropdown").forEach((drop) => {
      if (!drop.contains(e.target)) drop.classList.remove("active");
    });
  });

  // Set default time
  const defaultTime = "11:30 AM - 12:30 PM";
  const btn = document.querySelector(".custom-dropdown .dropdown-btn");
  const hiddenInput = document.getElementById("time");

  if (btn) {
    btn.innerHTML = `⏰ ${defaultTime} <span class="arrow">⌄</span>`;
  }

  if (hiddenInput) {
    hiddenInput.value = defaultTime;
  }
});

// Function to get the selected time from the custom dropdown
function getSelectedTime() {
  const btn = document.querySelector(".custom-dropdown .dropdown-btn");
  if (btn) {
    return btn.textContent.replace("⌄", "").replace("⏰", "").trim();
  }
  return "11:30 AM - 12:30 PM"; // fallback
}
