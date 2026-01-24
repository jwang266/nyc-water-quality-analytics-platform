import { Router } from 'express';
import userData from '../data/users.js';
import commentsData from '../data/comments.js';
import { boroughCollection, userCollection as User } from '../model/index.js';

const router = Router();

const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/users/login');
  next();
};

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const user = await User.findById(userId)
      .select('likedBoroughs')
      .lean();

    let likedBoroughsDetails = [];
    if (user && user.likedBoroughs.length > 0) {
      likedBoroughsDetails = await boroughCollection
        .find({ _id: { $in: user.likedBoroughs } })
        .select('name')
        .lean();
    }

    let userComments = await commentsData.getCommentsByUser(userId);

    userComments.forEach(c => {
      c.commentDate = c.commentDate
        ? new Date(c.commentDate).toLocaleDateString()
        : 'N/A';
    });

    res.render('profile', {
      title: 'My Profile',
      user: req.session.user,
      likedBoroughs: likedBoroughsDetails,
      userComments,
      css: '/public/css/styles.css'
    });
  } catch (e) {
    console.error('Profile Load Error:', e);
    res.render('error', { error: 'Failed to load profile data.' });
  }
});

router.get('/edit-profile', requireAuth, (req, res) => {
  res.render('edit-profile', {
    title: 'Edit Profile',
    css: '/public/css/styles.css',
    user: req.session.user
  });
});

router.post('/edit-profile', requireAuth, async (req, res) => {
  const { fname, lname, email } = req.body;

  try {
    const updatedUser = await userData.updateUser(
      req.session.user.id,
      fname,
      lname,
      email
    );

    req.session.user = updatedUser;
    res.redirect('/users/profile');
  } catch (e) {
    res.status(400).render('edit-profile', {
      title: 'Edit Profile',
      css: '/public/css/styles.css',
      user: req.session.user,
      error: e.toString(),
      hasErrors: true
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

router.post('/delete-account', requireAuth, async (req, res) => {
  try {
    await userData.removeUser(req.session.user.id);
    req.session.destroy();
    res.json({ success: true, message: 'Account deleted' });
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

router.get('/debug/session', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  res.json({
    session: req.session || null,
    user: req.session ? req.session.user : null
  });
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', {
    title: 'Login',
    css: '/public/css/styles.css',
    redirect: req.query.redirect || '/'
  });
});

router.post('/login', async (req, res) => {
  const { email, password, redirect } = req.body;

  try {
    const sessionUser = await userData.login(email, password);
    req.session.user = sessionUser;
    res.redirect(redirect || '/');
  } catch (e) {
    res.status(400).render('login', {
      title: 'Login',
      error: e,
      hasErrors: true,
      email,
      redirect,
      css: '/public/css/styles.css'
    });
  }
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', {
    title: 'Create Account',
    css: '/public/css/styles.css'
  });
});

router.post('/register', async (req, res) => {
  const { fname, lname, email, password } = req.body;

  try {
    const sessionUser = await userData.createUser(
      fname,
      lname,
      email,
      password
    );

    req.session.user = sessionUser;
    res.redirect('/');
  } catch (e) {
    res.status(400).render('register', {
      title: 'Create Account',
      error: e,
      hasErrors: true,
      reqBody: { fname, lname, email },
      css: '/public/css/styles.css'
    });
  }
});

router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', {
    title: 'Forgot Password',
    css: '/public/css/styles.css'
  });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await userData.creatPwdResetToken(email);

    let message =
      'If an account with that email exists, you will receive password reset instructions.';
    let resetLink = null;

    if (result) {
      resetLink = `http://localhost:3000/users/reset-password/${result.token}`;
      console.log(`[Dev Reset Link]: ${resetLink}`);
    }

    res.render('forgot-password', {
      title: 'Forgot Password',
      message,
      resetLink,
      css: '/public/css/styles.css'
    });
  } catch (e) {
    res.render('forgot-password', {
      title: 'Forgot Password',
      error: e,
      hasErrors: true,
      css: '/public/css/styles.css'
    });
  }
});

router.get('/reset-password/:token', (req, res) => {
  res.render('reset-password', {
    title: 'Reset Password',
    token: req.params.token,
    css: '/public/css/styles.css'
  });
});

router.post('/reset-password/:token', async (req, res) => {
  const { password, confirmPassword } = req.body;
  const token = req.params.token;

  try {
    if (password !== confirmPassword) throw 'Passwords do not match';

    await userData.resetPwd(token, password);

    res.render('login', {
      title: 'Login',
      message: 'Password reset successful! Please log in.',
      css: '/public/css/styles.css'
    });
  } catch (e) {
    res.status(400).render('reset-password', {
      title: 'Reset Password',
      token,
      error: e,
      hasErrors: true,
      css: '/public/css/styles.css'
    });
  }
});

export default router;
