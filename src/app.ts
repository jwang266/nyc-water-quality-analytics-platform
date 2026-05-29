import express from "express";
import session from "express-session";
import passport from "passport";
import exphbs from "express-handlebars";
import path from "node:path";

import "./types/session.js";
import configRoutes from "./routes/index.js";
import connectDB from "./config/mongoConnection.js";
import { logMdw } from "./middleware.js";

if (process.env.NODE_ENV !== "production") {
  const { default: dotenv } = await import("dotenv");
  dotenv.config();
}

// Connect to Local MongoDB
await connectDB();

// init passport strategies
await import("./config/passport.js");

// Handlebars helper boundary type (template layer is dynamic)
type HbsHelper = (...args: unknown[]) => unknown;

const app = express();

// Request parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Setup
app.use(
  session({
    name: "AuthCookie",
    secret: process.env.SESSION_SECRET || "local_dev_secret_key_123", // Safe fallback for local dev
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Global Local Variables
app.use((req, res, next) => {
  // keep it safe even if session typing isn't added yet
  const user = (req.session as any)?.user ?? null;
  res.locals.currentUser = user;
  res.locals.isAuthenticated = !!user;
  next();
});

// Logging Middleware
app.use(logMdw);

// Static + Views are at project root (not inside src)
app.use(express.static(path.join(process.cwd(), 'public')));

// Handlebars Configuration
app.engine(
  "handlebars",
  exphbs.engine({
    defaultLayout: "main",
    helpers: {
      eq: ((a: unknown, b: unknown) => a == b) as HbsHelper,

      or: ((...args: unknown[]) => {
        // last arg is handlebars options
        args.pop();
        return args.some(Boolean);
      }) as HbsHelper,

      len: ((arr: unknown) => (Array.isArray(arr) ? arr.length : 0)) as HbsHelper,

      gt: ((a: unknown, b: unknown) => Number(a) > Number(b)) as HbsHelper,

      toFixed3: ((v: unknown) => {
        const n = Number(v);
        if (v === null || v === undefined || Number.isNaN(n) || v === "N/A") return "N/A";
        return n.toFixed(3);
      }) as HbsHelper,

      ifGreaterThan: ((v1: unknown, v2: unknown, options: any) =>
        Number(v1) > Number(v2) ? options.fn(this) : options.inverse(this)
      ) as HbsHelper,

      json: ((context: unknown) => JSON.stringify(context)) as HbsHelper,

      array: ((...args: unknown[]) => {
        args.pop();
        return args;
      }) as HbsHelper,

      qualityClass: ((value: unknown, type: unknown) => {
        const rules: Record<string, (v: number) => string> = {
          chlorine: (v) =>
            v >= 0.4 && v <= 0.9 ? "good" : v >= 0.2 && v <= 1.0 ? "average" : "poor",
          turbidity: (v) => (v <= 1 ? "good" : v <= 2 ? "average" : "poor"),
          coliform: (v) => (v <= 0.1 ? "good" : v <= 1 ? "average" : "poor"),
          ecoli: (v) => (v === 0 ? "good" : "poor"),
          fluoride: (v) =>
            v >= 0.6 && v <= 0.9 ? "good" : v >= 0.5 && v <= 1.0 ? "average" : "poor"
        };

        const numValue = Number(value);
        if (Number.isNaN(numValue)) return "";

        const key = String(type);
        return rules[key]?.(numValue) ?? "";
      }) as HbsHelper,

      ifEquals: ((a: unknown, b: unknown, options: any) =>
        a === b ? options.fn(this) : options.inverse(this)
      ) as HbsHelper
    }
  })
);

app.set("view engine", "handlebars");
app.set('views', path.join(process.cwd(), 'views'));

// Configure Routes
configRoutes(app);

export default app;
