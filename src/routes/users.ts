import { Router, type Request, type Response, type NextFunction } from 'express';
import userData from '../data/users.js';
import commentsData from '../data/comments.js';
import { boroughCollection, userCollection as User } from '../model/index.js';

const router = Router();

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user) {
    res.redirect('/users/login');
    return;
  }
  next();
};

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user!.id;

    const user = await User.findById(userId).select('likedBoroughs').lean();

    let likedBoroughsDetails: { name: string }[] = [];
    if (user && user.likedBoroughs.length > 0) {
      const boroughs = await boroughCollection
        .find({ _id: { $in: user.likedBoroughs } })
        .select('name')
        .lean();
      likedBoroughsDetails = boroughs.map((b) => ({
        name: b.name ?? 'Unknown'
      }));
    }

    const userComments = await commentsData.getCommentsByUser(userId);

    const formattedComments = userComments.map((c) => ({
      ...c,
      commentDate: c.commentDate
        ? new Date(c.commentDate).toLocaleDateString()
        : 'N/A'
    }));

    res.render('profile', {
      title: 'My Profile',
      user: req.session.user,
      likedBoroughs: likedBoroughsDetails,
      userComments: formattedComments,
      css: '/css/styles.css'
    });
  } catch (e) {
    console.error('Profile Load Error:', e);
    res.render('error', { error: 'Failed to load profile data.' });
  }
});

router.get('/edit-profile', requireAuth, (req, res) => {
  res.render('edit-profile', {
    title: 'Edit Profile',
    css: '/css/styles.css',
    user: req.session.user
  });
});

router.post('/edit-profile', requireAuth, async (req, res) => {
  const { fname, lname, email } = req.body as {
    fname?: string;
    lname?: string;
    email?: string;
  };

  try {
    const updatedUser = await userData.updateUser(
      req.session.user!.id,
      fname,
      lname,
      email
    );

    req.session.user = updatedUser;
    res.redirect('/users/profile');
  } catch (e) {
    res.status(400).render('edit-profile', {
      title: 'Edit Profile',
      css: '/css/styles.css',
      user: req.session.user,
      error: String(e),
      hasErrors: true
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

router.post('/delete-account', requireAuth, async (req, res) => {
  try {
    await userData.removeUser(req.session.user!.id);
    req.session.destroy(() => {
      res.json({ success: true, message: 'Account deleted' });
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get('/debug/session', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).send('Not found');
    return;
  }

  res.json({
    session: req.session || null,
    user: req.session ? req.session.user : null
  });
});

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/');
    return;
  }
  res.render('login', {
    title: 'Login',
    css: '/css/styles.css',
    redirect: typeof req.query.redirect === 'string' ? req.query.redirect : '/'
  });
});

router.post('/login', async (req, res) => {
  const { email, password, redirect } = req.body as {
    email?: string;
    password?: string;
    redirect?: string;
  };

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
      css: '/css/styles.css'
    });
  }
});

router.get('/register', (req, res) => {
  if (req.session.user) {
    res.redirect('/');
    return;
  }
  res.render('register', {
    title: 'Create Account',
    css: '/css/styles.css'
  });
});

router.post('/register', async (req, res) => {
  const { fname, lname, email, password } = req.body as {
    fname?: string;
    lname?: string;
    email?: string;
    password?: string;
  };

  try {
    const sessionUser = await userData.createUser(fname, lname, email, password);

    req.session.user = sessionUser;
    res.redirect('/');
  } catch (e) {
    res.status(400).render('register', {
      title: 'Create Account',
      error: e,
      hasErrors: true,
      reqBody: { fname, lname, email },
      css: '/css/styles.css'
    });
  }
});

export default router;
