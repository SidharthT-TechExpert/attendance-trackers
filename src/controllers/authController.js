const renderLoginPage = (errorMessage = '') => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Login</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main>
      <section class="card">
        <h1>Admin Login</h1>
        ${errorMessage ? `<p class="error">${errorMessage}</p>` : ''}
        <form method="POST" action="/admin/login" class="stack">
          <label>Username
            <input type="text" name="username" required />
          </label>
          <label>Password
            <input type="password" name="password" required />
          </label>
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  </body>
</html>`;

const getLogin = (req, res) => {
  if (req.session?.isAdmin) {
    return res.redirect('/admin/students');
  }
  return res.send(renderLoginPage());
};

const postLogin = (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return res.status(500).send('Admin credentials are not configured.');
  }

  if (username === expectedUser && password === expectedPass) {
    req.session.isAdmin = true;
    return res.redirect('/admin/students');
  }

  return res.send(renderLoginPage('Invalid username or password.'));
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
};

module.exports = {
  getLogin,
  postLogin,
  logout,
};

