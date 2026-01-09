export const logMdw = (req, res, next) => {
  const t = new Date().toUTCString();
  const method = req.method;
  const path = req.path;
  let status = '(Non-Authenticated)';

  if (req.session.user) {
    if (req.session.user.role === 'admin') {
      status = '(Authenticated Admin)';
    } else {
      status = '(Authenticated User)';
    }
  }

  console.log(`[${t}]: ${method} ${path} ${status}`);

  next();
};

export const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/users/profile'); 
  }
  next();
};

export const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/users/login');
  }
  next();
};

// Only admin can access
export const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/users/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Forbidden',
      error: 'You do not have permission to view this page.',
      link: '/' 
    });
  }
  next();
};