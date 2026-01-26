import express from "express";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";
import exphbs from "express-handlebars";
import path from "node:path";
import configRoutes from "./routes/index.js";
import connectDB from "./config/mongoConnection.js";
import { logMdw } from "./middleware.js";
dotenv.config();
// Connect to Local MongoDB
await connectDB();
// init passport strategies
await import("./config/passport.js");
const app = express();
// Request parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Session Setup
app.use(session({
    name: "AuthCookie",
    secret: process.env.SESSION_SECRET || "local_dev_secret_key_123", // Safe fallback for local dev
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// Global Local Variables
app.use((req, res, next) => {
    // keep it safe even if session typing isn't added yet
    const user = req.session?.user ?? null;
    res.locals.currentUser = user;
    res.locals.isAuthenticated = !!user;
    next();
});
// Logging Middleware
app.use(logMdw);
// Static + Views are at project root (not inside src)
app.use(express.static(path.join(process.cwd(), 'public')));
// Handlebars Configuration
app.engine("handlebars", exphbs.engine({
    defaultLayout: "main",
    helpers: {
        eq: ((a, b) => a == b),
        or: ((...args) => {
            // last arg is handlebars options
            args.pop();
            return args.some(Boolean);
        }),
        len: ((arr) => (Array.isArray(arr) ? arr.length : 0)),
        gt: ((a, b) => Number(a) > Number(b)),
        toFixed3: ((v) => {
            const n = Number(v);
            if (v === null || v === undefined || Number.isNaN(n) || v === "N/A")
                return "N/A";
            return n.toFixed(3);
        }),
        ifGreaterThan: ((v1, v2, options) => Number(v1) > Number(v2) ? options.fn(this) : options.inverse(this)),
        json: ((context) => JSON.stringify(context)),
        array: ((...args) => {
            args.pop();
            return args;
        }),
        qualityClass: ((value, type) => {
            const rules = {
                chlorine: (v) => v >= 0.4 && v <= 0.9 ? "good" : v >= 0.2 && v <= 1.0 ? "average" : "poor",
                turbidity: (v) => (v <= 1 ? "good" : v <= 2 ? "average" : "poor"),
                coliform: (v) => (v <= 0.1 ? "good" : v <= 1 ? "average" : "poor"),
                ecoli: (v) => (v === 0 ? "good" : "poor"),
                fluoride: (v) => v >= 0.6 && v <= 0.9 ? "good" : v >= 0.5 && v <= 1.0 ? "average" : "poor"
            };
            const numValue = Number(value);
            if (Number.isNaN(numValue))
                return "";
            const key = String(type);
            return rules[key]?.(numValue) ?? "";
        }),
        ifEquals: ((a, b, options) => a === b ? options.fn(this) : options.inverse(this))
    }
}));
app.set("view engine", "handlebars");
app.set('views', path.join(process.cwd(), 'views'));
// Configure Routes
configRoutes(app);
export default app;
