import { ObjectId } from "mongodb";

export const checkString = (str: unknown, varName: string): string => {
  if (str === undefined || str === null) throw `${varName} is required`;
  if (typeof str !== "string") throw `${varName} must be a string`;
  const trimmed = str.trim();
  if (trimmed.length === 0) throw `${varName} cannot be empty or just spaces`;
  return trimmed;
};

export const validateName = (name: unknown, varName: string): string => {
  const validName = checkString(name, varName);
  if (validName.length < 2) throw `${varName} must be at least 2 characters`;
  if (validName.length > 50) throw `${varName} cannot exceed 50 characters`;
  const nameRegex = /^[a-zA-Z\s\-']+$/;

  if (!nameRegex.test(validName)) {
    throw `${varName} format is not valid`;
  }
  return validName;
};

export const isValidId = (id: unknown): string => {
  const stringId = checkString(id, "id");
  if (!ObjectId.isValid(stringId)) throw `Invalid ObjectId format`;
  return stringId;
};

export const validateEmail = (email: unknown): string => {
  const validEmail = checkString(email, "Email").toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(validEmail)) {
    throw "Email is invalid";
  }
  return validEmail;
};

export function validatePassword(password: unknown): string {
  const trimmed = checkString(password, "Password");
  if (trimmed.includes(" ")) throw "Password cannot contain spaces";
  const pwdRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!pwdRe.test(trimmed)) {
    throw "Password must be at least 8 characters and include uppercase, lowercase, number and symbol.";
  }
  
  return trimmed;
}

export const getCurrentWeekStart = (): Date => {
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