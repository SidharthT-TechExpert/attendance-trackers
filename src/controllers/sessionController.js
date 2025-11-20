const Session = require('../models/Session');
const { cloudinary, isConfigured } = require('../config/cloudinary');

const renderSessionReport = (sessionDoc) => {
  const attendanceRows = sessionDoc.attendance
    .map(
      (entry) => `<tr>
    <td>${entry.student?.fullName || 'Unknown'}</td>
    <td>${entry.status === 'present' ? 'Present' : 'Absent'}</td>
    <td>${entry.notes || '-'}</td>
  </tr>`
    )
    .join('');

  const presentCount = sessionDoc.attendance.filter((entry) => entry.status === 'present').length;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${sessionDoc.title} - Session Report</title>
    <link rel="stylesheet" href="/styles.css" />
    <style>
      @media print {
        .no-print { display: none; }
        body { background: #fff; }
      }
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
      th, td { border: 1px solid #dfe3e8; padding: 0.5rem; text-align: left; }
      th { background: #f3f4f6; }
    </style>
  </head>
  <body>
    <main>
      <div class="no-print" style="margin-bottom:1rem;">
        <a href="/" class="secondary">&larr; New report</a>
        <button onclick="window.print()">Print / PDF</button>
      </div>
      <section class="card">
        <h1>${sessionDoc.title}</h1>
        <p><strong>Trainer:</strong> ${sessionDoc.trainerName || '—'}</p>
        <p><strong>Date:</strong> ${sessionDoc.date.toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${sessionDoc.startTime || '--'} - ${sessionDoc.endTime || '--'}</p>
        <p><strong>Overview:</strong> ${sessionDoc.overview || 'No overview provided.'}</p>
        <p><strong>Attendance:</strong> ${presentCount} / ${sessionDoc.attendance.length} present</p>
      </section>
      <section class="card">
        <h2>Detailed attendance</h2>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceRows || '<tr><td colspan="3">No attendees recorded.</td></tr>'}
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>`;
};

const createSession = async (req, res, next) => {
  try {
    const { title, trainerName, date, startTime, endTime, overview } = req.body;
    const attendance = Array.isArray(req.body.attendance)
      ? req.body.attendance
      : JSON.parse(req.body.attendance || '[]');

    if (!title || !date || !Array.isArray(attendance)) {
      return res.status(400).json({ message: 'Missing required session data.' });
    }

    const formattedAttendance = attendance.map((entry) => ({
      student: entry.studentId,
      status: entry.status === 'present' ? 'present' : 'absent',
      notes: entry.notes || '',
    }));

    let meetListUrl;
    if (req.file) {
      if (!isConfigured()) {
        return res.status(400).json({
          message: 'File upload unavailable. Please configure Cloudinary environment variables.',
        });
      }
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'raw',
              folder: 'attendance-meetlists',
              public_id: `${Date.now()}-${req.file.originalname}`,
            },
            (error, result) => {
              if (error) return reject(error);
              return resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
        meetListUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          message: 'Failed to upload file. Please try again.',
        });
      }
    }

    const sessionDoc = await Session.create({
      title,
      trainerName,
      overview,
      date: new Date(date),
      startTime,
      endTime,
      meetListUrl,
      attendance: formattedAttendance,
    });

    res.status(201).json({
      id: sessionDoc._id,
      reportUrl: `/sessions/${sessionDoc._id}`,
    });
  } catch (error) {
    next(error);
  }
};

const getSession = async (req, res, next) => {
  try {
    const sessionDoc = await Session.findById(req.params.sessionId).populate('attendance.student');
    if (!sessionDoc) {
      return res.status(404).send('Session not found.');
    }
    return res.send(renderSessionReport(sessionDoc));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getSession,
};

