const form = document.getElementById('session-form');
const studentListEl = document.getElementById('student-list');
const statusEl = document.getElementById('form-status');
const resultCard = document.getElementById('result-card');
const reportLink = document.getElementById('report-link');
const viewReportBtn = document.getElementById('view-report');
const createNewBtn = document.getElementById('create-new');
const submitBtn = document.getElementById('submit-btn');

const dateInput = document.querySelector('input[name="date"]');
const timeInputs = document.querySelectorAll('input[type="time"]');
const clickableFields = document.querySelectorAll('.field-clickable');

let studentsCache = [];

const toggleLoading = (isLoading) => {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'Generating…' : 'Create report';
};

const showStatus = (message, isError = false) => {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
};

const renderStudents = () => {
  if (!studentListEl) return;

  if (!studentsCache.length) {
    studentListEl.innerHTML =
      '<p class="hint">No students available. Ask an admin to add some first.</p>';
    return;
  }

  studentListEl.innerHTML = studentsCache
    .map(
      (student) => `
      <label>
        <span>${student.fullName}</span>
        <input type="checkbox" name="attendance" value="${student._id}" />
      </label>`
    )
    .join('');
};

const fetchStudents = async () => {
  try {
    const response = await fetch('/api/students');
    if (!response.ok) {
      throw new Error('Unable to load students');
    }
    studentsCache = await response.json();
    renderStudents();
  } catch (error) {
    showStatus(error.message, true);
  }
};

// Prefill current date and wire up clickable date/time fields
const initDateAndTimeFields = () => {
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  clickableFields.forEach((labelEl) => {
    const inputEl = labelEl.querySelector('input');
    if (!inputEl) return;

    const openPicker = () => {
      inputEl.focus();
      if (typeof inputEl.showPicker === 'function') {
        inputEl.showPicker();
      }
    };

    // Clicking anywhere in the label (including text area) opens picker
    labelEl.addEventListener('click', () => {
      openPicker();
    });

    // Clicking directly on the input also forces the picker
    inputEl.addEventListener('click', () => {
      openPicker();
    });
  });
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  toggleLoading(true);
  showStatus('');

  const data = new FormData(form);
  const presentIds = new Set(data.getAll('attendance'));

  if (!studentsCache.length) {
    showStatus('Add students in the admin area before creating a report.', true);
    toggleLoading(false);
    return;
  }

  const batch = data.get('batch');
  const tldvLink = data.get('tldvLink');
  const trainerName = data.get('trainerName');

  // Build multipart form data so we can send the CSV file as well
  const attendancePayload = studentsCache.map((student) => ({
    studentId: student._id,
    status: presentIds.has(student._id) ? 'present' : 'absent',
  }));

  // Overwrite / set the fields we want to control
  data.set('title', batch ? `Session - ${batch}` : 'Session');
  data.set('trainerName', trainerName || '');
  data.set('overview', data.get('overview') || tldvLink || '');
  data.set('attendance', JSON.stringify(attendancePayload));

  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      throw new Error('Unable to create report. Check your inputs.');
    }

    const result = await response.json();
    const reportUrl = result.reportUrl || `/sessions/${result.id}`;
    if (reportLink) {
      reportLink.href = reportUrl;
      reportLink.textContent = `${window.location.origin}${reportUrl}`;
    }
    if (viewReportBtn) {
      viewReportBtn.href = reportUrl;
    }
    if (resultCard) {
      resultCard.hidden = false;
    }
    showStatus('Session captured successfully.');
    form.reset();
    renderStudents();
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    toggleLoading(false);
  }
});

createNewBtn?.addEventListener('click', () => {
  if (resultCard) resultCard.hidden = true;
  showStatus('');
});

initDateAndTimeFields();
fetchStudents();

