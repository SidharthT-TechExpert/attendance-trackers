const Student = require('../models/Student');

const renderStudentsPage = (students = []) => {
  const rows = students
    .map(
      (student) => `<tr>
    <td>${student.fullName}</td>
    <td>${student.email || '-'}</td>
    <td>${student.role || '-'}</td>
    <td>${student.isActive ? 'Active' : 'Inactive'}</td>
    <td>
      <form method="POST" action="/admin/students/${student._id}" class="inline-form">
        <input type="hidden" name="id" value="${student._id}" />
        <input type="text" name="fullName" value="${student.fullName}" required />
        <input type="email" name="email" value="${student.email || ''}" />
        <input type="text" name="role" value="${student.role || ''}" />
        <label class="inline">
          <input type="checkbox" name="isActive" ${student.isActive ? 'checked' : ''} />
          Active
        </label>
        <button type="submit">Update</button>
      </form>
    </td>
  </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Manage Students</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main>
      <header>
        <div>
          <p class="eyebrow">Admin dashboard</p>
          <h1>Student directory</h1>
        </div>
        <form method="POST" action="/admin/logout">
          <button class="secondary" type="submit">Logout</button>
        </form>
      </header>
      <section class="card">
        <h2>Add new student</h2>
        <form method="POST" action="/admin/students" class="stack">
          <label>Full name
            <input type="text" name="fullName" required />
          </label>
          <label>Email
            <input type="email" name="email" />
          </label>
          <label>Role / Cohort
            <input type="text" name="role" />
          </label>
          <button type="submit">Add student</button>
        </form>
      </section>
      <section class="card">
        <h2>Existing students</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5">No students yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </body>
</html>`;
};

const listStudents = async (req, res, next) => {
  try {
    const students = await Student.find().sort({ fullName: 1 });
    res.send(renderStudentsPage(students));
  } catch (error) {
    next(error);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const { fullName, email, role } = req.body;
    await Student.create({ fullName, email, role });
    res.redirect('/admin/students');
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { fullName, email, role, isActive } = req.body;
    await Student.findByIdAndUpdate(studentId, {
      fullName,
      email,
      role,
      isActive: Boolean(isActive),
    });
    res.redirect('/admin/students');
  } catch (error) {
    next(error);
  }
};

const listActiveStudentsJson = async (req, res, next) => {
  try {
    const students = await Student.find({ isActive: true }).sort({ fullName: 1 });
    res.json(students);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listStudents,
  createStudent,
  updateStudent,
  listActiveStudentsJson,
};

