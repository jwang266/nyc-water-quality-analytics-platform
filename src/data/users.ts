import mongoose from 'mongoose';
import { userCollection } from '../model/index.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  checkString,
  validateEmail,
  validatePassword,
  validateName,
  isValidId
} from '../helper/helper.js';
import type { SessionUser } from '../types/session.js';

const saltRounds = 10;

interface UserLike {
  _id: mongoose.Types.ObjectId;
  fname?: string | null;
  lname?: string | null;
  lowerEmail: string;
  role?: string | null;
}

const fitForSession = (user: UserLike): SessionUser => ({
  id: user._id.toString(),
  fname: user.fname || '',
  lname: user.lname || '',
  email: user.lowerEmail,
  role: user.role ?? undefined
});

const exportedMethods = {
  async createUser(
    fname: unknown,
    lname: unknown,
    email: unknown,
    password: unknown,
    role = 'user'
  ): Promise<SessionUser> {
    const validFname = validateName(fname, 'First Name');
    const validLname = validateName(lname, 'Last Name');
    const validEmail = validateEmail(email);
    const validPassword = validatePassword(password);
    const validRole = checkString(role, 'Role').toLowerCase();

    if (validRole !== 'user' && validRole !== 'admin') throw 'Invalid role';

    const lowerEmail = validEmail.toLowerCase();
    const existing = await userCollection.findOne({ lowerEmail }).lean<UserLike & { isDeleted?: boolean; hashedPwd?: string }>();

    if (existing) {
      if (!existing.isDeleted) throw 'Email already exists';

      const hash = await bcrypt.hash(validPassword, saltRounds);
      const reactivatedUser = await userCollection
        .findByIdAndUpdate(
          existing._id,
          { fname: validFname, lname: validLname, hashedPwd: hash, isDeleted: false, role: validRole },
          { new: true }
        )
        .lean<UserLike>();

      if (!reactivatedUser) throw 'Could not reactivate user';
      return fitForSession(reactivatedUser);
    }

    const hash = await bcrypt.hash(validPassword, saltRounds);

    const newUser = await new userCollection({
      fname: validFname,
      lname: validLname,
      lowerEmail,
      hashedPwd: hash,
      role: validRole,
      comments: [],
      likedBoroughs: [],
      isDeleted: false
    }).save();

    return fitForSession(newUser as unknown as UserLike);
  },

  async login(email: unknown, password: unknown): Promise<SessionUser> {
    const validEmail = validateEmail(email);
    const validPassword = validatePassword(password);
    const lowerEmail = validEmail.toLowerCase();

    const user = await userCollection.findOne({ lowerEmail }).lean<UserLike & { isDeleted?: boolean; hashedPwd: string }>();

    if (!user) throw 'Email or password invalid';
    if (user.isDeleted) throw 'This account has been deleted.';

    const match = await bcrypt.compare(validPassword, user.hashedPwd);
    if (!match) throw 'Email or password invalid';

    return fitForSession(user);
  },

  async updateUser(
    userId: unknown,
    fname: unknown,
    lname: unknown,
    email: unknown
  ): Promise<SessionUser> {
    const validId = isValidId(userId);
    const validFname = validateName(fname, 'First Name');
    const validLname = validateName(lname, 'Last Name');
    const validEmail = validateEmail(email);

    const user = await userCollection.findById(validId).lean<UserLike>();
    if (!user) throw 'User not found';

    const newLowerEmail = validEmail.toLowerCase();

    if (newLowerEmail !== user.lowerEmail) {
      const existing = await userCollection.findOne({ lowerEmail: newLowerEmail }).lean();
      if (existing) throw 'Email already exists. Please use a different email.';
    }

    const updatedUser = await userCollection
      .findByIdAndUpdate(
        validId,
        { fname: validFname, lname: validLname, lowerEmail: newLowerEmail },
        { new: true }
      )
      .lean<UserLike>();

    if (!updatedUser) throw 'User not found';
    return fitForSession(updatedUser);
  },

  async removeUser(userId: unknown): Promise<true> {
    const validId = isValidId(userId);

    const updated = await userCollection.findByIdAndUpdate(
      validId,
      { isDeleted: true },
      { new: true }
    );

    if (!updated) throw 'User not found';
    return true;
  },

  async creatPwdResetToken(email: unknown): Promise<{ token: string; email: string } | null> {
    const validEmail = validateEmail(email);

    const lowerEmail = validEmail.toLowerCase();
    const user = await userCollection.findOne({ lowerEmail }).lean<UserLike & { isDeleted?: boolean }>();

    if (!user || user.isDeleted) return null;

    const resetToken = crypto.randomBytes(16).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);

    await userCollection.findByIdAndUpdate(user._id, {
      resetToken,
      resetTokenExpires
    });

    return { token: resetToken, email: lowerEmail };
  },

  async resetPwd(token: unknown, newPassword: unknown): Promise<true> {
    const validToken = checkString(token, 'Reset Token');
    const validPassword = validatePassword(newPassword);

    const user = await userCollection
      .findOne({
        resetToken: validToken,
        resetTokenExpires: { $gt: new Date() }
      })
      .lean();

    if (!user) throw 'Token invalid or expired';

    const hash = await bcrypt.hash(validPassword, saltRounds);

    await userCollection.findByIdAndUpdate(user._id, {
      hashedPwd: hash,
      resetToken: null,
      resetTokenExpires: null
    });

    return true;
  },

  async toggleLikeBorough(userId: unknown, boroughId: unknown) {
    const validUserId = isValidId(userId);
    const validBoroughId = isValidId(boroughId);

    const user = await userCollection.findById(validUserId).lean<{ likedBoroughs?: mongoose.Types.ObjectId[] }>();
    if (!user) throw 'User not found';

    const boroughObjectId = new mongoose.Types.ObjectId(validBoroughId);
    const likedBoroughs = user.likedBoroughs ?? [];
    const isLiked = likedBoroughs.some((id) => id.equals(boroughObjectId));

    const updateQuery = isLiked
      ? { $pull: { likedBoroughs: boroughObjectId } }
      : { $push: { likedBoroughs: boroughObjectId } };

    const updated = await userCollection.findByIdAndUpdate(validUserId, updateQuery, {
      new: true
    });
    if (!updated) throw 'User not found';
    return updated;
  }
};

export default exportedMethods;
