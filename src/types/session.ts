import 'express-session';

export interface SessionUser {
  id: string;
  fname: string;
  lname: string;
  email: string;
  role?: string;
  _id?: string;
}

export interface SessionToast {
  type: 'message' | 'error' | string;
  message: string;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
    toast?: SessionToast;
  }
}
