// ====================== BATCH DATA MANAGEMENT ======================

// Initialize default data structure
const defaultBatches = {
  "BCR71": {
    name: "BCR71",
    hasGroup2: true,
    groups: {
      "Group_1": [
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
        "Visal Vijayan (RP)"
      ],
      "Group_2": [
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
        "Sahla (RP)",
        "Shahitha (RP)",
        "Shahna (RP)"
      ]
    }
  }
};

// ====================== STATE VARIABLES ======================
let batches = {};
let selectedBatch = null;

// ====================== INITIALIZATION ======================
document.addEventListener('DOMContentLoaded', function() {
  loadBatches();
  displayCurrentDate();
  renderBatchList();
});

// ====================== DATA PERSISTENCE ======================
function saveBatches() {
  localStorage.setItem('attendanceBatches', JSON.stringify(batches));
}

function loadBatches() {
  const saved = localStorage.getItem('attendanceBatches');
  if (saved) {
    batches = JSON.parse(saved);
  } else {
    // Initialize with default data
    batches = defaultBatches;
    saveBatches();
  }
}

// ====================== BATCH MANAGEMENT ======================
function addNewBatch() {
  const batchSuffix = document.getElementById('newBatchName').value.trim();
  if (!batchSuffix) {
    Swal.fire({
      icon: 'warning',
      title: 'Oops...',
      text: 'Please enter a batch suffix!'
    });
    return;
  }

  const batchName = `BC${batchSuffix}`;
  
  if (batches[batchName]) {
    Swal.fire({
      icon: 'error',
      title: 'Batch Exists',
      text: `Batch ${batchName} already exists!`
    });
    return;
  }

  // Create new batch
  batches[batchName] = {
    name: batchName,
    hasGroup2: false,
    groups: {
      "Group_1": []
    }
  };

  saveBatches();
  renderBatchList();
  document.getElementById('newBatchName').value = '';
  
  Swal.fire({
    icon: 'success',
    title: 'Batch Created',
    text: `Batch ${batchName} has been created successfully!`
  });
}

function selectBatch(batchName) {
  selectedBatch = batchName;
  renderBatchDetails();
  updateBatchListSelection();
}

function updateBatchListSelection() {
  document.querySelectorAll('.batch-item').forEach(item => {
    item.classList.remove('active');
  });
  if (selectedBatch) {
    document.querySelector(`[data-batch="${selectedBatch}"]`).classList.add('active');
  }
}

function renderBatchList() {
  const batchList = document.getElementById('batchList');
  batchList.innerHTML = '';

  Object.keys(batches).forEach(batchName => {
    const batch = batches[batchName];
    const item = document.createElement('div');
    item.className = `list-group-item batch-item ${selectedBatch === batchName ? 'active' : ''}`;
    item.setAttribute('data-batch', batchName);
    item.onclick = () => selectBatch(batchName);
    
    const totalParticipants = batch.groups.Group_1.length + 
      (batch.hasGroup2 ? batch.groups.Group_2.length : 0);
    
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-1">${batchName}</h6>
          <small>${totalParticipants} participants</small>
        </div>
        <span class="badge bg-primary rounded-pill">${batch.hasGroup2 ? '2 Groups' : '1 Group'}</span>
      </div>
    `;
    
    batchList.appendChild(item);
  });
}

function renderBatchDetails() {
  if (!selectedBatch) return;

  const batch = batches[selectedBatch];
  document.getElementById('selectedBatchTitle').textContent = `${selectedBatch} Details`;
  document.getElementById('hasGroup2').checked = batch.hasGroup2;
  
  // Show/hide Group 2 section
  document.getElementById('group2Section').style.display = batch.hasGroup2 ? 'block' : 'none';
  
  // Render participants
  renderParticipantList('Group_1', batch.groups.Group_1);
  if (batch.hasGroup2) {
    renderParticipantList('Group_2', batch.groups.Group_2);
  }
  
  // Update coordinator counts
  updateCoordinatorCounts();
  
  document.getElementById('batchDetails').style.display = 'block';
}

function renderParticipantList(groupName, participants) {
  const listId = groupName === 'Group_1' ? 'group1List' : 'group2List';
  const list = document.getElementById(listId);
  list.innerHTML = '';

  const currentCoordinators = participants.filter(p => p.includes('(C)')).length;
  const canAddCoordinator = currentCoordinators < 2;

  participants.forEach((participant, index) => {
    const item = document.createElement('div');
    item.className = 'participant-item';
    
    const isRP = participant.includes('(RP)');
    const isC = participant.includes('(C)');
    const cleanName = participant.replace(/\(RP\)|\(C\)/g, '').trim();
    
    // Determine button state and text
    let buttonText, buttonClass, buttonDisabled;
    if (isRP) {
      buttonText = 'RP';
      buttonClass = canAddCoordinator ? 'btn-outline-primary' : 'btn-outline-secondary';
      buttonDisabled = !canAddCoordinator;
    } else if (isC) {
      buttonText = 'C';
      buttonClass = 'btn-outline-warning';
      buttonDisabled = false;
    } else {
      buttonText = 'Normal';
      buttonClass = canAddCoordinator ? 'btn-outline-primary' : 'btn-outline-secondary';
      buttonDisabled = !canAddCoordinator;
    }
    
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-1">
        <div class="d-flex align-items-center">
          <span class="me-2">${isRP ? '🔄' : isC ? '👑' : '👤'}</span>
          <span class="${isRP ? 'text-info' : isC ? 'text-warning' : ''}">${cleanName}</span>
          ${isRP ? '<span class="badge bg-info ms-2">RP</span>' : ''}
          ${isC ? '<span class="badge bg-warning ms-2">C</span>' : ''}
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn ${buttonClass} btn-sm" onclick="toggleParticipantType('${groupName}', ${index})" ${buttonDisabled ? 'disabled' : ''}>
            ${buttonText}
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="removeParticipant('${groupName}', ${index})">
            🗑️
          </button>
        </div>
      </div>
    `;
    
    list.appendChild(item);
  });
}

// ====================== PARTICIPANT MANAGEMENT ======================
function addParticipant(groupName) {
  if (!selectedBatch) return;

  const inputId = groupName === 'Group_1' ? 'newParticipant1' : 'newParticipant2';
  const name = document.getElementById(inputId).value.trim();
  
  if (!name) {
    Swal.fire({
      icon: 'warning',
      title: 'Oops...',
      text: 'Please enter a participant name!'
    });
    return;
  }

  // Check for duplicates
  const allParticipants = [
    ...batches[selectedBatch].groups.Group_1,
    ...(batches[selectedBatch].hasGroup2 ? batches[selectedBatch].groups.Group_2 : [])
  ];
  
  if (allParticipants.some(p => p.replace(/\(RP\)|\(C\)/g, '').trim() === name)) {
    Swal.fire({
      icon: 'error',
      title: 'Duplicate Name',
      text: 'This participant already exists!'
    });
    return;
  }

  batches[selectedBatch].groups[groupName].push(name);
  saveBatches();
  renderBatchDetails();
  updateCoordinatorCounts();
  document.getElementById(inputId).value = '';
}

function removeParticipant(groupName, index) {
  if (!selectedBatch) return;

  Swal.fire({
    title: 'Remove Participant',
    text: `Are you sure you want to remove this participant?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, remove',
    cancelButtonText: 'Cancel'
  }).then((result) => {
    if (result.isConfirmed) {
      batches[selectedBatch].groups[groupName].splice(index, 1);
      saveBatches();
      renderBatchDetails();
      updateCoordinatorCounts();
    }
  });
}

function toggleParticipantType(groupName, index) {
  if (!selectedBatch) return;

  const participant = batches[selectedBatch].groups[groupName][index];
  const cleanName = participant.replace(/\(RP\)|\(C\)/g, '').trim();
  
  let newParticipant;
  if (participant.includes('(RP)')) {
    // Check if we can add a coordinator (max 2 per group)
    const currentCoordinators = batches[selectedBatch].groups[groupName].filter(p => p.includes('(C)')).length;
    if (currentCoordinators >= 2) {
      Swal.fire({
        icon: 'error',
        title: 'Coordinator Limit Reached',
        text: 'Maximum 2 coordinators allowed per group. Please remove an existing coordinator first.'
      });
      return;
    }
    newParticipant = `${cleanName} (C)`;
  } else if (participant.includes('(C)')) {
    newParticipant = cleanName;
  } else {
    // Check if we can add a coordinator (max 2 per group)
    const currentCoordinators = batches[selectedBatch].groups[groupName].filter(p => p.includes('(C)')).length;
    if (currentCoordinators >= 2) {
      Swal.fire({
        icon: 'error',
        title: 'Coordinator Limit Reached',
        text: 'Maximum 2 coordinators allowed per group. Please remove an existing coordinator first.'
      });
      return;
    }
    newParticipant = `${cleanName} (RP)`;
  }
  
  batches[selectedBatch].groups[groupName][index] = newParticipant;
  saveBatches();
  renderBatchDetails();
  updateCoordinatorCounts();
}

// ====================== COORDINATOR COUNT MANAGEMENT ======================
function updateCoordinatorCounts() {
  if (!selectedBatch) return;
  
  const batch = batches[selectedBatch];
  
  // Count coordinators in Group 1
  const group1Coordinators = batch.groups.Group_1.filter(p => p.includes('(C)')).length;
  document.getElementById('group1CoordinatorCount').textContent = `${group1Coordinators}/2 Coordinators`;
  
  // Update badge color based on count
  const group1Badge = document.getElementById('group1CoordinatorCount');
  if (group1Coordinators >= 2) {
    group1Badge.className = 'badge bg-danger ms-2';
  } else if (group1Coordinators >= 1) {
    group1Badge.className = 'badge bg-warning ms-2';
  } else {
    group1Badge.className = 'badge bg-secondary ms-2';
  }
  
  // Count coordinators in Group 2 (if exists)
  if (batch.hasGroup2 && batch.groups.Group_2) {
    const group2Coordinators = batch.groups.Group_2.filter(p => p.includes('(C)')).length;
    document.getElementById('group2CoordinatorCount').textContent = `${group2Coordinators}/2 Coordinators`;
    
    // Update badge color based on count
    const group2Badge = document.getElementById('group2CoordinatorCount');
    if (group2Coordinators >= 2) {
      group2Badge.className = 'badge bg-danger ms-2';
    } else if (group2Coordinators >= 1) {
      group2Badge.className = 'badge bg-warning ms-2';
    } else {
      group2Badge.className = 'badge bg-secondary ms-2';
    }
  }
}

// ====================== GROUP MANAGEMENT ======================
function toggleGroup2() {
  if (!selectedBatch) return;

  const hasGroup2 = document.getElementById('hasGroup2').checked;
  batches[selectedBatch].hasGroup2 = hasGroup2;
  
  if (hasGroup2 && !batches[selectedBatch].groups.Group_2) {
    batches[selectedBatch].groups.Group_2 = [];
  }
  
  saveBatches();
  renderBatchDetails();
  updateCoordinatorCounts();
}

// ====================== BATCH OPERATIONS ======================
function saveBatchChanges() {
  if (!selectedBatch) return;
  
  saveBatches();
  Swal.fire({
    icon: 'success',
    title: 'Saved!',
    text: 'Batch changes have been saved successfully!'
  });
}

function deleteBatch() {
  if (!selectedBatch) return;

  Swal.fire({
    title: 'Delete Batch',
    text: `Are you sure you want to delete batch ${selectedBatch}? This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#d33'
  }).then((result) => {
    if (result.isConfirmed) {
      delete batches[selectedBatch];
      saveBatches();
      selectedBatch = null;
      document.getElementById('batchDetails').style.display = 'none';
      renderBatchList();
      
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Batch has been deleted successfully!'
      });
    }
  });
}

function exportBatch() {
  if (!selectedBatch) return;

  const batchData = batches[selectedBatch];
  const dataStr = JSON.stringify(batchData, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `${selectedBatch}_data.json`;
  link.click();
}

// ====================== DATA EXPORT/IMPORT ======================
function exportAllData() {
  const dataStr = JSON.stringify(batches, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `attendance_batches_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
}

function importData() {
  document.getElementById('importFile').click();
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      Swal.fire({
        title: 'Import Data',
        text: 'This will replace all existing batch data. Are you sure?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, import',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          batches = importedData;
          saveBatches();
          selectedBatch = null;
          document.getElementById('batchDetails').style.display = 'none';
          renderBatchList();
          
          Swal.fire({
            icon: 'success',
            title: 'Imported!',
            text: 'Data has been imported successfully!'
          });
        }
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Import Failed',
        text: 'Invalid file format. Please use a valid JSON file.'
      });
    }
  };
  reader.readAsText(file);
}

function backupData() {
  const backup = {
    batches: batches,
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
  
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `attendance_backup_${new Date().toISOString().split('T')[0]}_${new Date().getTime()}.json`;
  link.click();
}

function restoreData() {
  document.getElementById('importFile').click();
}

// ====================== UTILITIES ======================
function displayCurrentDate() {
  const currentDate = document.getElementById('currentDate');
  const date = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  currentDate.textContent = date.toLocaleDateString('en-US', options);
}
