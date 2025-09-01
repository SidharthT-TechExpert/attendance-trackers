
// ====================== FIRESTORE IMPORTS ======================
import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteField,
  onSnapshot,
} from "firebase/firestore";

// Utility function for escaping HTML special characters
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ====================== STATE ======================

let batches = {};
let selectedBatch = null;

// ====================== CREATE ======================
export async function addNewBatch() {
  let batchName = document
    .getElementById("newBatchName")
    ?.value.trim()
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!batchName) {
    Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Enter a batch name!",
    });
    return;
  }

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
  const input = document.getElementById("newBatchName");
  if (input) input.value = "";
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
      batches = snap.exists() ? snap.data() : {};
      if (typeof renderBatchList === "function") renderBatchList();
      if (selectedBatch && batches[selectedBatch]) renderBatchDetails();
    },
    (err) => console.log("❌ Realtime error:", err)
  );
}

// ====================== UPDATE (Save all) ======================
export async function saveBatches() {
  try {
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
  const inputEl = document.getElementById(inputId);
  const name = inputEl?.value.trim();
  if (!name) {
    Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Enter a participant name!",
    });
    return;
  }

  // Prevent duplicates across both groups (by clean name)
  const all = [
    ...(batches[selectedBatch].groups?.Group_1 ?? []),
    ...(batches[selectedBatch].hasGroup2
      ? batches[selectedBatch].groups?.Group_2 ?? []
      : []),
  ];
  const exists = all.some(
    (p) =>
      p
        .replace(/\(RP\)|\(C\)/g, "")
        .trim()
        .toLowerCase() === name.toLowerCase()
  );
  if (exists) {
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
  if (inputEl) inputEl.value = "";
}

export async function addTrainer() {
  let Trainer = document.getElementById("TrainerName")?.value.trim();
  if (!Trainer) {
    Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: "Enter a Trainer name !",
    });
    return;
  }

  let Batch = document
    .getElementById("selectedBatchTitle")
    .textContent.replace("Details", "")
    .trim();

  if (Trainer !== batches[Batch]?.Trainer) {
    batches[Batch].Trainer = Trainer;
    await saveBatches();
    return
  }

  Swal.fire({
      icon: "warning",
      title: "Oops...",
      text: `"${batches[Batch]?.Trainer}" is already saved as the trainer name!`,
    });
    
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
  const userIsAdmin = ["admin"].includes(window.currentUser?.role);
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
      delete batches[batchName];
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

// ====================== REMOVE / TOGGLE (robust for filtered lists) ======================
export async function removeParticipant(groupName, _index, cleanName) {
  if (!selectedBatch) return;
  Swal.fire({
    title: "Remove Participant",
    text: `Are you sure you want to remove "${cleanName}" from the participants ?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, remove",
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    const arr = batches[selectedBatch].groups[groupName] ?? [];
    const realIndex = arr.findIndex(
      (p) =>
        p
          .replace(/\(RP\)|\(C\)/g, "")
          .trim()
          .toLowerCase() === cleanName.toLowerCase()
    );
    if (realIndex >= 0) {
      arr.splice(realIndex, 1);
      await saveBatches();
      renderBatchDetails();
    }
  });
}

export async function toggleParticipantType(groupName, _index, cleanName) {
  if (!selectedBatch) return;

  let participants = batches[selectedBatch].groups[groupName];
  if (!participants) return;

  // Find the real index by clean name (works for filtered/sorted views)
  const idx = participants.findIndex(
    (p) =>
      p
        .replace(/\(RP\)|\(C\)/g, "")
        .trim()
        .toLowerCase() === cleanName.toLowerCase()
  );
  if (idx < 0) return;

  let participant = participants[idx];
  const isRP = participant.includes("(RP)");
  const isC = participant.includes("(C)");

  const currentCoordinators = participants.filter((p) =>
    p.includes("(C)")
  ).length;

  if (isC) {
    participant = participant.replace("(C)", "").trim();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: `${cleanName} => Coordinator → Normal`,
      showConfirmButton: false,
      timer: 5000,
    });
  } else if (isRP) {
    participant = participant.replace("(RP)", "").trim();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: `${cleanName} => RP → Normal`,
      showConfirmButton: false,
      timer: 5000,
    });
  } else {
    if (currentCoordinators < 2) {
      participant = participant + " (C)";
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${cleanName} => Normal → Coordinator 👑`,
        showConfirmButton: false,
        timer: 5000,
      });
    } else {
      participant = participant + " (RP)";
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${cleanName} => Normal → RP 🔄`,
        showConfirmButton: false,
        timer: 5000,
      });
    }
  }

  participants[idx] = participant;
  await saveBatches();
  renderBatchDetails();
}

// ====================== UI HELPERS ======================
function renderBatchList() {
  const batchList = document.getElementById("batchList");
  if (!batchList) return;

  const searchQuery =
    document.getElementById("batchSearch")?.value.toLowerCase() || "";
  batchList.innerHTML = "";

  Object.keys(batches)
    .filter((batchName) => batchName.toLowerCase().includes(searchQuery))
    .sort()
    .forEach((batchName) => {
      const batch = batches[batchName];

      const total =
        (batch.groups?.Group_1?.length ?? 0) +
        (batch.hasGroup2 ? batch.groups?.Group_2?.length ?? 0 : 0);

      const groupCount = batch.hasGroup2 ? 2 : 1;

      const card = document.createElement("div");
      card.className = `card mb-2 shadow-sm batch-card ${
        selectedBatch === batchName ? "active" : ""
      }`;
      card.style.cursor = "pointer";

      const body = document.createElement("div");
      body.className =
        "card-body d-flex justify-content-between align-items-center p-2";

      const title = document.createElement("div");
      title.innerHTML = `<strong>${batchName}</strong><br><small>${total} participants</small>`;

      const badge = document.createElement("span");
      badge.className = "badge bg-primary group-badge";
      badge.textContent = `${groupCount} Group${groupCount > 1 ? "s" : ""}`;

      body.appendChild(title);
      body.appendChild(badge);
      card.appendChild(body);

      card.addEventListener("click", () => {
        selectedBatch = batchName;
        renderBatchList(); // re-render with highlight
        renderBatchDetails();
      });

      batchList.appendChild(card);
    });
}

function renderBatchDetails() {
  if (!selectedBatch || !batches[selectedBatch]) return;
  const batch = batches[selectedBatch];

  document.getElementById(
    "selectedBatchTitle"
  ).textContent = `${selectedBatch} Details`;
  document.getElementById("hasGroup2").checked = !!batch.hasGroup2;
  document.getElementById("group2Section").style.display = batch.hasGroup2
    ? "block"
    : "none";
  document.getElementById("TrainerName").value = batch?.Trainer || "";
  document.getElementById("TimeB").innerHTML = batch?.Time || "⏰ Select Time";

  document.getElementById("newParticipant1").value = null;
  document.getElementById("newParticipant2").value = null;

 document.getElementById("Trainer").innerHTML = batch?.Trainer ? "Reset !" : "Set !";

  renderParticipantList("Group_1", batch.groups?.Group_1 ?? []);

  if (batch.hasGroup2)
    renderParticipantList("Group_2", batch.groups?.Group_2 ?? []);

  document.getElementById("batchDetails").style.display = "block";
}

function renderParticipantList(groupName, participants) {
  const listId = groupName === "Group_1" ? "group1List" : "group2List";
  const list = document.getElementById(listId);
  list.innerHTML = "";

  // Counters are based on the full group (not the filtered view)
  const fullGroup = batches[selectedBatch]?.groups?.[groupName] ?? [];
  const currentCoordinators = fullGroup.filter((p) => p.includes("(C)")).length;

  const counterCoordinactor = document.createElement("div");
  counterCoordinactor.className = "badge mb-2";
  counterCoordinactor.style.background =
    currentCoordinators === 2 ? "yellow" : "red";
  counterCoordinactor.style.color =
    currentCoordinators === 2 ? "red" : "yellow";
  counterCoordinactor.style.marginLeft = "10px";
  counterCoordinactor.textContent = `${currentCoordinators}/2 Coordinators`;

  const counterTotal = document.createElement("div");
  counterTotal.className = "badge mb-2";
  counterTotal.style.background = "red";
  counterTotal.style.marginLeft = "10px";
  counterTotal.textContent = `* Total Members : ${fullGroup.length}`;

  const counterActive = document.createElement("div");
  counterActive.className = "badge mb-2 bg-info";
  counterActive.style.marginLeft = "10px";
  counterActive.textContent = `* Active Members : ${
    fullGroup.length - fullGroup.filter((name) => name.includes("(RP)")).length
  } `;

  list.appendChild(counterCoordinactor);
  list.appendChild(counterTotal);
  list.appendChild(counterActive);

  // render given (possibly filtered) list, sorted
  [...participants]
    .sort((a, b) => a.localeCompare(b))
    .forEach((participant) => {
      const item = document.createElement("div");
      item.className = "participant-item";

      const isRP = participant.includes("(RP)");
      const isC = participant.includes("(C)");
      const cleanName = participant.replace(/\(RP\)|\(C\)/g, "").trim();

      let buttonText, buttonClass;
      if (isRP) {
        buttonText = "RP";
        buttonClass = "btn-info";
      } else if (isC) {
        buttonText = "C";
        buttonClass = "btn-warning";
      } else {
        buttonText = "Normal";
        buttonClass = "btn-secondary";
      }

      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-1">
          <div class="d-flex align-items-center">
            <span class="me-2">${isRP ? "🔄" : isC ? "👑" : "👤"}</span>
            <span class="${
              isRP ? "text-info" : isC ? "text-warning" : ""
            }">${cleanName}</span>
            ${isRP ? '<span class="badge bg-info ms-2">RP</span>' : ""}
            ${isC ? '<span class="badge bg-warning ms-2">C</span>' : ""}
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn ${buttonClass} btn-sm"
                    onclick="toggleParticipantType('${groupName}', -1, '${cleanName}')">
              ${buttonText}
            </button>
            ${
              ["admin", "manager"].includes(window.currentUser?.role)
                ? `<button class="btn btn-outline-danger btn-sm" onclick="removeParticipant('${groupName}', -1, '${cleanName}')">🗑️</button>`
                : ""
            }
          </div>
        </div>
      `;
      list.appendChild(item);
    });
}

// Live filter (does not mutate data)
function filterParticipants(groupName, searchText) {
  if (!selectedBatch) return;
  const allParticipants = batches[selectedBatch]?.groups?.[groupName] || [];
  const filtered = allParticipants.filter((name) =>
    name
      .replace(/\(RP\)|\(C\)/g, "")
      .trim()
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );
  renderParticipantList(groupName, filtered);
}

function selectBatch(batchName) {
  selectedBatch = batchName;
  renderBatchDetails();

  document.querySelectorAll("#batchList .list-group-item").forEach((el) => {
    el.classList.remove("active-batch");
  });
  const activeEl = document.getElementById(`batch-${batchName}`);
  if (activeEl) activeEl.classList.add("active-batch");
}

// ====================== IMPORT VIA TEXTAREA ======================
export async function importData() {
  function getJSONErrorDetails(input, err) {
    let line = 1,
      col = 1;
    let friendlyMessage = err.message;

    const positionMatch = /position (\d+)/i.exec(err.message);
    if (positionMatch) {
      const pos = parseInt(positionMatch[1], 10);
      const lines = input.substring(0, pos).split("\n");
      line = lines.length;
      col = lines[lines.length - 1].length + 1;
    } else {
      let errorPos = 0;
      for (let i = 1; i <= input.length; i++) {
        try {
          JSON.parse(input.substring(0, i));
        } catch (parseError) {
          if (parseError.message === err.message) {
            errorPos = i - 1;
            break;
          }
        }
      }
      if (errorPos > 0) {
        const lines = input.substring(0, errorPos).split("\n");
        line = lines.length;
        col = lines[lines.length - 1].length + 1;
      }
    }

    if (err.message.includes("Unexpected token")) {
      const tokenMatch = /Unexpected token (\S+)/.exec(err.message);
      if (tokenMatch) {
        const token = tokenMatch[1];
        friendlyMessage = `Unexpected '${token}' - check for:`;
        if (token === "'" || token === '"')
          friendlyMessage += " unclosed quotes or missing comma";
        else if (token === ",")
          friendlyMessage += " extra comma or missing value";
        else if (token === ":" || token === "}")
          friendlyMessage += " missing property name or value";
        else if (token === "{")
          friendlyMessage += " missing property name after comma";
        else friendlyMessage += " missing comma, colon, or quotes";
      }
    } else if (err.message.includes("Unexpected end of JSON")) {
      friendlyMessage =
        "Incomplete JSON - missing closing brackets, braces, or quotes";
    } else if (err.message.includes("Expected")) {
      friendlyMessage =
        "Syntax error - expected a different character (check commas, colons, brackets)";
    } else if (input.trim() === "") {
      friendlyMessage = "Empty JSON - please enter valid JSON data";
      line = 1;
      col = 1;
    }

    return { line, col, friendlyMessage };
  }

  function showError(message, line, col) {
    const popup = document.getElementById("errorPopup");
    const msg = document.getElementById("errorMessage");
    msg.textContent = message;
    popup.style.display = "flex";
    popup.style.animation = "none";
    popup.offsetHeight;
    popup.style.animation = "slideIn 0.5s forwards";

    const textarea = document.getElementById("settingsInput");
    const lines = textarea.value.split("\n");

    if (line > 0 && line <= lines.length) {
      let charPos = 0;
      for (let i = 0; i < line - 1; i++) charPos += lines[i].length + 1;
      charPos += col - 1;
      textarea.focus();
      textarea.setSelectionRange(charPos, charPos + 1);
      textarea.scrollTop = textarea.scrollHeight;
    }

    setTimeout(hideError, 8000);
  }
  function hideError() {
    document.getElementById("errorPopup").style.display = "none";
  }

  Swal.fire({
    title: "📥 Import Batches JSON",
    html: `
      <style>
        .editor-container { display: flex; border:1px solid #ddd; border-radius:8px; overflow:hidden; width:100%; height:300px; position:relative; }
        .line-numbers { background:#f4f4f4; color:#999; text-align:right; padding:10px; user-select:none; font-size:13px; line-height:1.5em; overflow:hidden; }
        .editor { flex:1; padding:10px; border:none; outline:none; resize:none; font-size:13px; line-height:1.5em; overflow:auto; font-family: monospace; }
        #shortcutHeroBtn { position:absolute; top:8px; right:8px; background:linear-gradient(135deg,#4facfe,#00f2fe); color:white; border:none; border-radius:8px; padding:6px 12px; font-weight:bold; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:10; transition:all 0.2s ease; }
        #shortcutHeroBtn:hover { transform:scale(1.05); }
        .error-popup { display:none; position:fixed; top:20px; right:-400px; max-width:400px; background:linear-gradient(135deg,#e53935,#ef5350); color:#fff; padding:12px 18px; border-radius:10px; font-weight:bold; box-shadow:0 6px 20px rgba(0,0,0,0.25); z-index:5000; display:flex; align-items:center; gap:10px; animation:slideIn 0.5s forwards; }
        .error-popup .icon { font-size:18px; }
        @keyframes slideIn { from { right:-400px; opacity:0; } to { right:20px; opacity:1; } }
        .error-line { background: rgba(255, 0, 0, 0.1) !important; }
      </style>

      <button id="shortcutHeroBtn">💡 Shortcut Hero</button>

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
    "Trainer" : "Afzal Nazar",
    "Time" : "11:30 AM - 12:30 PM",
    "groups": {
      "Group_1": ["Alice", "Bob (C)"],
      "Group_2": ["Charlie", "Diana (RP)"]
    }
  }
}
        </pre>
      </small>

      <div id="errorPopup" class="error-popup">
        <span class="icon">⚠</span>
        <span id="errorMessage"></span>
        <button onclick="(${hideError.toString()})()" style="background:none; border:none; color:white; cursor:pointer; margin-left:10px;">✕</button>
      </div>
    `,
    width: "650px",
    showCancelButton: true,
    confirmButtonText: "✅ Save",
    cancelButtonText: "❌ Cancel",
    focusConfirm: false,
    didOpen: () => {
      const textarea = document.getElementById("settingsInput");
      const lineNumbers = document.getElementById("lineNumbers");
      const shortcutBtn = document.getElementById("shortcutHeroBtn");
      let fontSize = 13;

      function updateLineNumbers() {
        const lines = textarea.value.split("\n").length;
        lineNumbers.innerHTML = Array.from(
          { length: Math.max(lines, 1) },
          (_, i) => i + 1
        ).join("<br>");
        lineNumbers.style.fontSize = fontSize + "px";
        lineNumbers.style.lineHeight = "1.5em";
      }

      textarea.addEventListener("input", updateLineNumbers);
      textarea.addEventListener(
        "scroll",
        () => (lineNumbers.scrollTop = textarea.scrollTop)
      );
      updateLineNumbers();

      shortcutBtn.addEventListener("click", () => {
        Swal.fire({
          title: "💡 Keyboard Shortcuts",
          html: `
            <ul style="text-align:left; line-height:1.6em; padding-left:20px;">
              <li><strong>Shift + N</strong> → Wrap selected text as "name"</li>
              <li><strong>Shift + U</strong> → Wrap selected text in uppercase quotes</li>
              <li><strong>Ctrl/Cmd + S</strong> → Save JSON</li>
              <li><strong>Ctrl/Cmd + E</strong> → Clear textarea</li>
              <li><strong>Ctrl/Cmd + I</strong> → Focus editor</li>
              <li><strong>Ctrl/Cmd + =</strong> → Increase font size</li>
              <li><strong>Ctrl/Cmd + -</strong> → Decrease font size</li>
            </ul>
          `,
          icon: "info",
          confirmButtonText: "Got it!",
        }).then(() => textarea.focus());
      });

      textarea.addEventListener("keydown", (e) => {
        const { selectionStart, selectionEnd, value } = textarea;
        const selectedText = value.substring(selectionStart, selectionEnd);

        if (e.key === "Enter") {
          const before = value.substring(0, selectionStart);
          const after = value.substring(selectionEnd);
          const prevLine = before.split("\n").pop();
          const indent = prevLine.match(/^\s*/)[0];
          if (before.endsWith("{") || before.endsWith("[")) {
            e.preventDefault();
            textarea.value = before + "\n" + indent + "  \n" + indent + after;
            textarea.selectionStart = textarea.selectionEnd =
              before.length + 1 + indent.length + 2;
          }
        }

        if (["{", "[", '"'].includes(e.key)) {
          e.preventDefault();
          const pair = e.key === "{" ? "{}" : e.key === "[" ? "[]" : '""';
          textarea.setRangeText(pair, selectionStart, selectionEnd, "end");
          textarea.selectionStart -= 1;
          textarea.selectionEnd = textarea.selectionStart;
        }

        if (e.ctrlKey || e.metaKey) {
          if (e.key === "s") {
            e.preventDefault();
            Swal.clickConfirm();
          }
          if (e.key === "e") {
            e.preventDefault();
            textarea.value = "";
            updateLineNumbers();
          }
          if (e.key === "i") {
            e.preventDefault();
            textarea.focus();
          }
          if (e.key === "=") {
            e.preventDefault();
            fontSize += 1;
            textarea.style.fontSize = fontSize + "px";
            updateLineNumbers();
          }
          if (e.key === "-") {
            e.preventDefault();
            fontSize = Math.max(8, fontSize - 1);
            textarea.style.fontSize = fontSize + "px";
            updateLineNumbers();
          }
        }

        if (e.shiftKey) {
          if (e.key.toLowerCase() === "n") {
            e.preventDefault();
            textarea.setRangeText(
              `"name"`,
              selectionStart,
              selectionEnd,
              "end"
            );
            textarea.selectionStart = textarea.selectionEnd =
              selectionStart + 6;
            updateLineNumbers();
          }
          if (e.key.toLowerCase() === "u" && selectedText) {
            e.preventDefault();
            textarea.setRangeText(
              `"${selectedText.toUpperCase()}"`,
              selectionStart,
              selectionEnd,
              "end"
            );
            textarea.selectionStart = textarea.selectionEnd =
              selectionStart + selectedText.length + 2;
            updateLineNumbers();
          }
        }
      });
    },
    preConfirm: async () => {
      const textarea = document.getElementById("settingsInput");
      const input = textarea.value.trim();
      if (!input) {
        showError("⚠ Please paste JSON data!", 1, 1);
        return false;
      }

      try {
        const parsed = JSON.parse(input);
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error(
            "JSON must be an object containing batches, not an array"
          );
        }
        if (Object.keys(parsed).length === 0) {
          throw new Error("JSON object is empty - please add batch data");
        }

        for (const batchId in parsed) {
          const batch = parsed[batchId];
          if (!batch.name)
            throw new Error(
              `Batch "${batchId}" is missing the 'name' property`
            );
          const cleanBatchId = batchId.trim().replace(/\s+/g, "").toUpperCase();
          const cleanName = batch.name.trim().replace(/\s+/g, "").toUpperCase();
          if (cleanBatchId !== cleanName) {
            throw new Error(
              `Batch "${batchId}" has name "${batch.name}" which does not match its ID`
            );
          }
          if (!batch.groups || typeof batch.groups !== "object") {
            throw new Error(`Batch "${batchId}" has invalid 'groups' property`);
          }
          for (const groupName in batch.groups) {
            if (!Array.isArray(batch.groups[groupName])) {
              throw new Error(
                `Group "${groupName}" in batch "${batchId}" must be an array`
              );
            }
            if (batch.groups[groupName].length === 0) {
              throw new Error(
                `Group "${groupName}" in batch "${batchId}" is empty`
              );
            }
          }
        }
        return parsed;
      } catch (err) {
        const { line, col } = getJSONErrorDetails(input, err);
        showError(
          `❌ Error: ${err.message} (Line ${line}, Column ${col})`,
          line,
          col
        );
        return false;
      }
    },
  }).then(async (result) => {
    if (!(result.isConfirmed && result.value)) return;
    try {
      const existingBatchesSnap = await getDoc(
        doc(db, "batches", "allBatches")
      );
      const existingBatches = existingBatchesSnap.exists()
        ? existingBatchesSnap.data()
        : {};

      const duplicateBatches = [];
      for (const batchId in result.value) {
        const cleanId = batchId.trim().replace(/\s+/g, "").toUpperCase();
        if (existingBatches.hasOwnProperty(cleanId))
          duplicateBatches.push(cleanId);
      }
      if (duplicateBatches.length > 0) {
        Swal.fire(
          "❌ Import Failed",
          `Batch already exist: ${duplicateBatches.join(
            ", "
          )}. Please use unique batch IDs.`,
          "error"
        );
        return;
      }

      const cleanedBatches = {};
      for (const batchId in result.value) {
        const cleanId = batchId.trim().replace(/\s+/g, "").toUpperCase();
        cleanedBatches[cleanId] = result.value[batchId];
      }

      const updatedBatches = { ...existingBatches, ...cleanedBatches };
      await setDoc(doc(db, "batches", "allBatches"), updatedBatches, {
        merge: true,
      });

      Swal.fire("✅ Imported", "Batch data saved successfully!", "success");
    } catch (err) {
      Swal.fire("❌ Import Failed", err.message, "error");
    }
  });
}

// ====================== EXPOSE ======================
window.addNewBatch = addNewBatch;
window.addParticipant = addParticipant;
window.removeParticipant = removeParticipant;
window.deleteBatch = deleteBatch;
window.toggleGroup2 = toggleGroup2;
window.toggleParticipantType = toggleParticipantType;
window.importData = importData;
window.addTrainer = addTrainer;

// ====================== INIT ======================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Batch Manager Ready");
  listenToBatches();

  const searchInput = document.getElementById("batchSearch");
  if (searchInput) searchInput.addEventListener("input", renderBatchList);

  const newParticipant1 = document.getElementById("newParticipant1");
  const newParticipant2 = document.getElementById("newParticipant2");

  if (newParticipant1) {
    newParticipant1.addEventListener("input", function () {
      filterParticipants("Group_1", this.value);
    });
  }
  if (newParticipant2) {
    newParticipant2.addEventListener("input", function () {
      filterParticipants("Group_2", this.value);
    });
  }
});

// ====================== CUSTOM DROPDOWN (Time) ======================
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".custom-dropdown").forEach((drop) => {
    const btn = drop.querySelector(".dropdown-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        drop.classList.toggle("active");
      });
    }

    drop.querySelectorAll(".dropdown-menu li").forEach((item) => {
      item.addEventListener("click", async () => {
        if (btn) {
          btn.innerHTML =
            "⏰ " + escapeHTML(item.textContent) + ' <span class="arrow">⌄</span>';
        }
        if (selectedBatch) {
          batches[selectedBatch].Time = item.textContent;
          await saveBatches();
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

  // Set default time only if current batch has none
  const btn = document.querySelector(".custom-dropdown .dropdown-btn");
  if (btn) {
    const current = selectedBatch && batches[selectedBatch]?.Time;
    const defaultTime = current || "11:00 AM - 12:00 PM";
    btn.innerHTML = `⏰ ${escapeHTML(defaultTime)} <span class="arrow">⌄</span>`;
    const hiddenInput = document.getElementById("time");
    if (hiddenInput && !hiddenInput.value) hiddenInput.value = defaultTime;
  }
});
