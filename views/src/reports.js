// ====================== FIRESTORE IMPORTS ======================
import { db } from "./firebase.js";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

//Helper to get element by ID
const $ = (id) => document.getElementById(id);

// ====================== STATE ======================
let batches = [];
let reports = []; // all fetched reports
let filtered = []; // filtered reports shown on screen
let selectedBatch = null; // batch id or null -> all
let lastRenderedReports = []; // set this inside renderReports(...)

// ====================== Utility ======================

function formatDisplayDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

// ====================== Firestore Data ======================
export async function loadBatches() {
  try {
    const allBatchesRef = doc(db, "batches", "allBatches");
    const snap = await getDoc(allBatchesRef);

    if (snap.exists()) {
      const data = snap.data();
      batches = Object.entries(data).map(([id, batch]) => ({
        id,
        name: batch.name || id,
        ...batch,
      }));
    } else {
      batches = [];
    }
  } catch (err) {
    console.error("Error loading batches:", err);
    batches = [];
  }
}

async function loadReportsByDate(batchId, groupName, date) {
  try {
    if (!date || !batchId || !groupName) return [];
    const reportsRef = collection(
      db,
      "reports",
      "allBatches",
      "batches",
      batchId,
      "groups",
      groupName,
      "reportsByDate",
      date,
      "allReports"
    );
    const snap = await getDocs(reportsRef);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (err) {
    console.error("Error loading reports:", err);
    return [];
  }
}

// ====================== Renderers ======================
function renderBatches(filterText = "") {
  const list = $("batchesList");
  list.innerHTML = "";

  const filteredBatches = batches.filter((b) =>
    (b.name || "").toLowerCase().includes((filterText || "").toLowerCase())
  );

  $("totalBatches").textContent = `${filteredBatches.length} batches`;

  filteredBatches.forEach(async (b) => {
    const today = new Date().toISOString().split("T")[0];

    let reports1 = await loadReportsByDate(b.name, "Group 1", today);
    let reports2 = await loadReportsByDate(b.name, "Group 2", today);
    let reports3 = await loadReportsByDate(b.name, "Combined", today);

    const div = document.createElement("div");
    div.className = `batch-item p-3 mb-2 ${
      selectedBatch === b.id ? "active" : ""
    }`;
    div.tabIndex = 0;
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold">${b.name}</div>
          <div class="batch-meta">${
            reports1.length + reports2.length + reports3.length
          } reports</div>
        </div>
        <div class="text-muted">▶</div>
      </div>
    `;
    div.addEventListener("click", () => {
      selectedBatch = selectedBatch === b.id ? null : b.id;
      $("selectedBatchTag").textContent = selectedBatch
        ? b.name
        : "All batches";
      renderBatches($("batchSearch").value);
      renderReports();
    });
    list.appendChild(div);
  });
}

async function renderReports() {
  const container = $("reportsList");
  const group = $("groupFilter") ? $("groupFilter").value : "all";
  const today = new Date().toISOString().split("T")[0];

  if (!selectedBatch) {
    container.innerHTML =
      '<div class="col-12"><div class="text-center p-4 bg-light rounded text-muted">Select a batch to view reports</div></div>';
    $("reportsCount").textContent = `0 reports`;
    return;
  }

  // Load reports from all groups
  let reports1 = await loadReportsByDate(selectedBatch, "Group 1", today);
  let reports2 = await loadReportsByDate(selectedBatch, "Group 2", today);
  let reports3 = await loadReportsByDate(selectedBatch, "Combined", today);

  const mergedByGroup = {
    group1: reports1,
    group2: reports2,
    combined: reports3,
  };

  if (group === "group1") filtered = mergedByGroup.group1;
  else if (group === "group2") filtered = mergedByGroup.group2;
  else if (group === "combined") filtered = mergedByGroup.combined;
  else {
    filtered = [
      ...mergedByGroup.group1,
      ...mergedByGroup.group2,
      ...mergedByGroup.combined,
    ];
  }

  lastRenderedReports = filtered; // ✅ keep state

  $("reportsCount").textContent = `${filtered.length} report${
    filtered.length !== 1 ? "s" : ""
  }`;
  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="col-12"><div class="text-center p-4 bg-light rounded text-muted">No reports found for current group</div></div>';
    return;
  }
  // Sort reports before displaying
  filtered.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return b.createdAt.toMillis() - a.createdAt.toMillis();
  });

  console.log(filtered);

  filtered.forEach((r) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";

    let groupBadge = "";
    switch (r.group) {
      case "Group 1":
        groupBadge = `<span class="badge bg-primary">Group 1</span>`;
        break;
      case "Group 2":
        groupBadge = `<span class="badge bg-success">Group 2</span>`;
        break;
      case "Combined":
        groupBadge = `<span class="badge bg-warning text-dark">Combined</span>`;
        break;
      default:
        groupBadge = `<span class="badge bg-secondary">Unknown</span>`;
    }

    col.innerHTML = `
    <div class="report-card p-3 h-100">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div class="flex-grow-1">
          <h6 class="report-title">${r.title || "(No Title)"}</h6>
          <div class="report-meta">
            ${formatDisplayDate(r.date)} • ${r.attendees || 0} attendees
          </div>
        </div>
        <div>${groupBadge}</div>
      </div>
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-outline-secondary btn-sm" onclick="previewReport('${
          r.id
        }')">Preview</button>
        <button class="btn btn-primary btn-sm" onclick="downloadReport('${
          r.id
        }')">Download</button>
      </div>
    </div>
  `;
    container.appendChild(col);
  });
}

// ====================== Interactions ======================
window.previewReport = function (id) {
  // find from the last list we rendered on screen
  const r = (lastRenderedReports || []).find((x) => x.id === id);
  if (!r) {
    alert("Report not found");
    return;
  }
  console.log(lastRenderedReports);
  // Title + chips
  $("previewModalLabel").textContent = r.title || "Session Report";
  $("pmBatch").textContent = `Batch: ${r.batch || r.batchId || "-"}`;
  $("pmDate").textContent = formatDisplayDate(r.date || "");
  $("pmAttendees").textContent = `${r.attendees || 0} attendees`;
  $("pmId").textContent = r.id ? `ID: ${r.id}` : "";
  $("Trainer").textContent = r.trainer ? `Trainer : ${r.trainer}` : "";
  $("coordinator").textContent = r.coordinators
    ? `Coordinators : ${r.coordinators}`
    : "";
  console.log(r.coordinators);
  // Group pill (color-coded)
  const pmGroup = $("pmGroup");
  const g = (r.group || "").toLowerCase();
  pmGroup.textContent = `Group: ${r.group || "-"}`;
  pmGroup.className = "badge rounded-pill"; // reset
  if (g === "combined") pmGroup.classList.add("badge-group");
  else if (g === "group 1" || g === "group1") pmGroup.classList.add("badge-g1");
  else if (g === "group 2" || g === "group2") pmGroup.classList.add("badge-g2");
  else pmGroup.classList.add("text-bg-secondary");

  // Report text (high-contrast, scrollable)
  $("pmReportText").textContent = r.report || "(No report text)";

  // Hook footer buttons
  const copyBtn = $("pmCopyBtn");
  const dlBtn = $("pmDownloadBtn");

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(r.report || "").then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    });
  };

  dlBtn.onclick = () => {
    const name = `${r.batch || r.batchId || "Batch"}_${r.group || "Group"}_${
      r.date || "date"
    }.txt`.replace(/\s+/g, "_");
    const blob = new Blob([r.report || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show modal
  new bootstrap.Modal($("previewModal")).show();
};

window.downloadReport = function (id) {
  const r = filtered.find((x) => x.id === id);
  if (!r) return alert("Report not found");

  const rows = [
    ["Report ID", "Title", "Batch", "Date", "Attendees", "Report"],
    [r.id, r.title, r.batch, r.date, r.attendees, '"' + (r.report || "") + '"'],
  ];
  const csv = rows
    .map((row) =>
      row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${r.batch}_${r.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Print report
$("pmPrintBtn").addEventListener("click", () => {
  const content = $("pmReportText").innerText;
  const printWindow = window.open("", "_blank");
  printWindow.document.write("<pre>" + content + "</pre>");
  printWindow.document.close();
  printWindow.print();
});

// ====================== Init ======================
document.addEventListener("DOMContentLoaded", async () => {
  const today = new Date().toISOString().split("T")[0];
  console.log("Loading reports for today:", today);

  await loadBatches();
  renderBatches();
  renderReports();

  $("batchSearch").addEventListener("input", (e) =>
    renderBatches(e.target.value)
  );

  if ($("groupFilter")) {
    $("groupFilter").addEventListener("change", renderReports);
  }

  $("btnRefresh").addEventListener("click", async () => {
    await loadBatches();
    renderBatches($("batchSearch").value);
    renderReports();
  });
});
