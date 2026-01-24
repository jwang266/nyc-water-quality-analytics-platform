import { ObjectId } from "mongodb";

export const checkString = (str, varName) => {
  if (!str) throw `${varName} is required`;
  if (typeof str !== "string") throw `${varName} must be a string`;
  str = str.trim();
  if (str.length === 0) throw `${varName} cannot be empty or just spaces`;
  return str;
};

export const validateName = (name, varName) => {
  name = checkString(name, varName);
  if (name.length < 2) throw `${varName} must be at least 2 characters`;
  if (name.length > 50) throw `${varName} cannot exceed 50 characters`;
  const nameRegex = /^[a-zA-Z\s\-']+$/;

  if (!nameRegex.test(name)) {
    throw `${varName} format is not valid`;
  }
  return name;
};

export const isValidId = (id) => {
  checkString(id, "id");
  id = id.trim();
  if (!ObjectId.isValid(id)) throw `Invalid ObjectId format`;
  return id;
};

export const validateEmail = (email) => {
  email = checkString(email, "Email").toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw "Email is invalid";
  }
  return email;
};

export function validatePassword(password) {
  const trimmed = checkString(password, "Password");
  if (trimmed.includes(" ")) throw "Password cannot contain spaces";
  const pwdRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!pwdRe.test(trimmed)) {
    throw "Password must be at least 8 characters and include uppercase, lowercase, number and symbol.";
  }
  
  return trimmed;
};

export const getCurrentWeekStart = () => {
  // Using UTC to prevent DST issues like Lab6
  // Existing vote data was deleted after changing this function
  const now = new Date();
  const day = now.getUTCDay(); 
  const diff = (day + 6) % 7;
  
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  
  return monday;
};