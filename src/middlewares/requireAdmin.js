const requireAdmin = (req, res, next) => {
  // Prevent cached admin pages so back button after logout does not reopen them
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (req.session?.isAdmin) {
    return next();
  }

  // If not authenticated, send user back to public page
  return res.redirect('/');
};

module.exports = requireAdmin;

