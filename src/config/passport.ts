import passport from 'passport';
import type { PassportStatic } from 'passport';
import Users from '../model/user.js';
import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface User {
      _id?: Types.ObjectId | string;
      id?: string;
      fname?: string;
      lname?: string;
      email?: string;
      role?: string;
    }
  }
}

const typedPassport: PassportStatic = passport;

typedPassport.serializeUser((user: Express.User, done) => {
  const rawId = user._id ?? user.id;
  if (rawId) {
    done(null, String(rawId));
    return;
  }
  done(new Error('Invalid user object for serialization'));
});

typedPassport.deserializeUser(async (id: string, done) => {
  try {
    const user = await Users.findById(id).lean().exec();
    if (!user) {
      done(null, false);
      return;
    }

    const sessionUser: Express.User = {
      _id: user._id,
      id: String(user._id),
      fname: user.fname ?? '',
      lname: user.lname ?? '',
      email: user.lowerEmail,
      role: user.role
    };
    done(null, sessionUser);
  } catch (e) {
    done(e);
  }
});

export default typedPassport;
