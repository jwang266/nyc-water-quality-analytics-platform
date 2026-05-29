import './types/session.js';
import type { Request, Response, NextFunction } from 'express';

export const logMdw = (req: Request, res: Response, next: NextFunction): void => {
  const t: string = new Date().toUTCString();
  const method: string = req.method;
  const path: string = req.path;
  let status: string = '(Non-Authenticated)';

  if (req.session.user) {
    if (req.session.user.role === 'admin') {
      status = '(Authenticated Admin)';
    } else {
      status = '(Authenticated User)';
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[${t}]: ${method} ${path} ${status}`);

  next();
};

export const redirectIfLoggedIn = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.session.user) {
    res.redirect('/users/profile'); 
    return;
  }
  next();
};

export const requireLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.session.user) {
    res.redirect('/users/login');
    return;
  }
  next();
};

// Only admin can access
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.session.user) {
    res.redirect('/users/login');
    return;
  }
  if (req.session.user.role !== 'admin') {
    res.status(403).render('error', {
      title: 'Forbidden',
      error: 'You do not have permission to view this page.',
      link: '/' 
    });
    return;
  }
  next();
};