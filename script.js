/* ====================== GROUP DATA ====================== */
const Group_1 = [
  "Achyuth J",
  "Adarsh Babu",
  "Aifa Sana Uk (RP)",
  "Akhil Joy (Aj)",
  "Aswathy K (RP)",
  "Arun Narayan Nair (C)",
  "Chitra Arun (RP)",
  "Christin Johny",
  "Fasalu Rahman",
  "Govind S Kumar",
  "Jagan (C)",
  "Jasima (RP)",
  "Kadeejatu Zaiba",
  "Karthik B",
  "Krishna (RP)",
  "Midhun Manoj (RP)",
  "Neethu George",
  "Praveena E S",
  "Riyas Kv (RP)",
  "Sidharth T",
  "Thaskeem J",
  "Visal Vijayan (RP)",
];

const Group_2 = [
  "Ahammed Junaid",
  "Ajnas Muhammed (C)",
  "Akhil",
  "Arshad Chappangan",
  "Arun M",
  "Bijo P A",
  "Gowry N",
  "Mohamed Nabeel",
  "Muhammed Shibili K (C)",
  "Reuben Varghese",
  "Sarath A",
  "Juvek Swamiji (RP)",
  "Solaman KJ",
  "Swagath TV",
  "Tijo Thomas (RP)",
  "Eid Bilal",
  "Minto Thomas",
  "Muzammil Muhammed",
  "Anuja Joy (RP)",
  "Anusha (RP)",
  "Aswathi KV (RP)",
  "Fairose (RP)",
  "Minto (RP)",
  "Mubasir (RP)",
  "Muhammed Shamshad",
  "Najila (RP)",
  "Nazneen (RP)",
  "Sahla",
  "Shahitha (RP)",
  "Shahna (RP)",
];

// Combine both groups
const Combined = [...Group_1, ...Group_2];

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
      // --- Pick rawNames based on selected checkbox ---
      rawNames =
        this.value === "group1"
          ? Group_1
          : this.value === "group2"
          ? Group_2
          : Combined;

      // --- Store Group label (Group 1 / Group 2 / Combined) ---
      Group =
        this.value === "group1"
          ? "Group 1"
          : this.value === "group2"
          ? "Group 2"
          : "Combined";

      // Reset state
      displayNames = [];
      attendanceStatus = {};
      isRP = {};
      CoordinatorsA = {};

      // --- Clean and categorize names ---
      displayNames = rawNames
        .filter((n) => {
          if (n.includes("(RP)")) {
            // If RP → mark as RP (but don’t show in list)
            const cleanName = n.replace(" (RP)", "");
            attendanceStatus[cleanName] = "RP";
            isRP[cleanName] = true; // ✅ use RP flag for row highlight
            return false;
          }
          if (n.includes("(C)")) {
            // If Coordinator → mark as C and show
            CoordinatorsA[n.replace("(C)", "")] = "present"; // Store coordinator status

            const cleanName = n.replace("(C)", "");
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
  const cbs = document.querySelectorAll(`.person input[onchange*="'${name}'"]`);
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
  const Mean = "📘 COMMUNICATION SESSION REPORT";
  const Batch = " BCR71";
  const date = formatDate(new Date());
  const GroupName = Group;
  const Time = getSelectedTime(); // Get selected time from custom dropdown

  if (GroupName === "")
    return Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Please Select The Group first!",
    });
  // --- Get Coordinators per group ---
  let Coordinators = Object.keys(attendanceStatus).filter(
    (n) => attendanceStatus[n] === "C"
  );
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
        Coordinators += " - Grp_1 \n👫 Coordinators : " + n + "& ";
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

  if(Group === 'Combined'){
      Duck = "⭐".repeat(27)
  }else{
    Duck = "⭐".repeat(Coordinators.length /2 + 6)
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
  const Detalis = `${Duck}\n${Mean} \n🎓 Batch :${Batch} ${GroupName} \n📅 Date :${date}\n⏰ Time :${Time} \n👨🏻‍🏫 Trainer :${Trainer}\n👫 Coordinators : ${Coordinators}\n${Duck}\n\n`;

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
    alternative +
    OtherBatches +
    absentees +
    RP +
    link;

  // Update both view and edit modes
  document.getElementById("outputView").textContent = finalText;
  document.getElementById("outputEdit").value = finalText;
}

// ====================== UTILITIES ======================
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
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
  // Enable Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Display current date
  const currentDate = document.getElementById("currentDate");
  currentDate.textContent = formatDate(new Date());
});

// ====================== CUSTOM DROPDOWN ======================
document.querySelectorAll(".custom-dropdown").forEach((drop) => {
  const btn = drop.querySelector(".dropdown-btn");
  btn.addEventListener("click", () => {
    drop.classList.toggle("active");
  });
  drop.querySelectorAll(".dropdown-menu li").forEach((item) => {
    item.addEventListener("click", () => {
      btn.innerHTML =
        "⏰ " + item.textContent + ' <span class="arrow">⌄</span>';
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

// Function to get the selected time from the custom dropdown function
function getSelectedTime() {
  const btn = document.querySelector(".custom-dropdown .dropdown-btn");
  return btn.textContent
    .replace("⌄", "")
    .replace("⏰", "")
    .replace("⏰ 🕒", ""); // returns the selected label (like "⏰ 11:30 AM - 12:30 PM")
}

// When page loads, set default value
window.addEventListener("DOMContentLoaded", () => {
  const defaultTime = "11:30 AM - 12:30 PM"; // <-- your default value

  const btn = document.querySelector(".custom-dropdown .dropdown-btn");
  const hiddenInput = document.getElementById("time"); // hidden input for form submission

  if (btn) {
    // Set button text with arrow
    btn.innerHTML = `⏰ ${defaultTime} <span class="arrow">⌄</span>`;
  }

  if (hiddenInput) {
    // Set hidden input value
    hiddenInput.value = defaultTime;
  }
});
