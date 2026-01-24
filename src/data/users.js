import mongoose from "mongoose";
import { userCollection } from "../model/index.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  checkString,
  validateEmail,
  validatePassword,
  validateName,
  isValidId
} from "../helper/helper.js";

const saltRounds = 10;

const fitForSession = (user) => ({
  id: user._id.toString(),
  fname: user.fname || "",
  lname: user.lname || "",
  email: user.lowerEmail,
  role: user.role
});

const exportedMethods = {
  async createUser(fname, lname, email, password, role = "user") {
    fname = validateName(fname, "First Name");
    lname = validateName(lname, "Last Name");
    email = validateEmail(email);
    password = validatePassword(password);
    role = checkString(role, "Role").toLowerCase();

    if (role !== "user" && role !== "admin") throw "Invalid role";

    const lowerEmail = email.toLowerCase();
    const existing = await userCollection.findOne({ lowerEmail });

    // Check if there's a deleted account with this email - if so, reactivate it
    if (existing) {
      if (!existing.isDeleted) throw "Email already exists";

      const hash = await bcrypt.hash(password, saltRounds);
      const reactivatedUser = await userCollection.findByIdAndUpdate(
        existing._id,
        { fname, lname, hashedPwd: hash, isDeleted: false, role },
        { new: true }
      );

      return fitForSession(reactivatedUser);
    }

    const hash = await bcrypt.hash(password, saltRounds);

    const newUser = await userCollection.create({
      fname,
      lname,
      lowerEmail,
      hashedPwd: hash,
      role,
      comments: [],
      likedBoroughs: [],
      creationDate: new Date(),
      isDeleted: false
    });

    return fitForSession(newUser);
  },

  async login(email, password) {
    email = validateEmail(email);
    password = validatePassword(password);
    const lowerEmail = email.toLowerCase();

    const user = await userCollection.findOne({ lowerEmail });

    if (!user) throw "Email or password invalid";
    // Check if account exists but is deleted
    if (user.isDeleted) throw "This account has been deleted.";

    const match = await bcrypt.compare(password, user.hashedPwd);
    if (!match) throw "Email or password invalid";

    return fitForSession(user);
  },

  async updateUser(userId, fname, lname, email) {
    userId = isValidId(userId);
    fname = validateName(fname, "First Name");
    lname = validateName(lname, "Last Name");
    email = validateEmail(email);

    const user = await userCollection.findById(userId);
    if (!user) throw "User not found";

    const newLowerEmail = email.toLowerCase();

    if (newLowerEmail !== user.lowerEmail) {
      const existing = await userCollection.findOne({ lowerEmail: newLowerEmail });
      if (existing) throw "Email already exists. Please use a different email.";
    }

    const updatedUser = await userCollection.findByIdAndUpdate(
      userId,
      { fname, lname, lowerEmail: newLowerEmail, updatedAt: new Date() },
      { new: true }
    );

    return fitForSession(updatedUser);
  },

  async removeUser(userId) {
    userId = isValidId(userId);

    const updated = await userCollection.findByIdAndUpdate(
      userId,
      { isDeleted: true },
      { new: true }
    );

    if (!updated) throw "User not found";
    return true;
  },

  async creatPwdResetToken(email) {
    email = validateEmail(email);

    const lowerEmail = email.toLowerCase();
    const user = await userCollection.findOne({ lowerEmail, isDeleted: false });

    if (!user) return null;

    const resetToken = crypto.randomBytes(16).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);

    await userCollection.findByIdAndUpdate(user._id, {
      resetToken,
      resetTokenExpires
    });

    return { token: resetToken, email: lowerEmail };
  },

  async resetPwd(token, newPassword) {
    checkString(token, "Reset Token");
    newPassword = validatePassword(newPassword);

    const user = await userCollection.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() }
    });

    if (!user) throw "Token invalid or expired";

    const hash = await bcrypt.hash(newPassword, saltRounds);

    await userCollection.findByIdAndUpdate(user._id, {
      hashedPwd: hash,
      resetToken: null,
      resetTokenExpires: null
    });

    return true;
  },

  // Toggle like/unlike for a borough
  async toggleLikeBorough(userId, boroughId) {
    userId = isValidId(userId);
    boroughId = isValidId(boroughId);

    const user = await userCollection.findById(userId);
    if (!user) throw "User not found";

    const boroughObjectId = new mongoose.Types.ObjectId(boroughId);
    const isLiked = (user.likedBoroughs || []).some((id) => id.equals(boroughObjectId));

    const updateQuery = isLiked
      ? { $pull: { likedBoroughs: boroughObjectId } }
      : { $push: { likedBoroughs: boroughObjectId } };

    return userCollection.findByIdAndUpdate(userId, updateQuery, { new: true });
  }
};

export default exportedMethods;
