import express from 'express';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import exphbs from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import configRoutes from './routes/index.js';
import connectDB, { disconnectDB } from './config/mongoConnection.js';
import { logMdw } from './middleware.js';

dotenv.config();

// Connect to Local MongoDB
await connectDB();

await import('./config/passport.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Request parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Setup
app.use(session({
  name: 'AuthCookie',
  secret: process.env.SESSION_SECRET || 'local_dev_secret_key_123', // Safe fallback for local dev
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Global Local Variables
app.use((req, res, next) => {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

// Logging Middleware
app.use(logMdw);

app.use('/public', express.static(path.join(__dirname, 'public')));

// Handlebars Configuration
app.engine(
  'handlebars',
  exphbs.engine({
    defaultLayout: 'main',
    helpers: {
      eq: (a, b) => a == b,
      or: (...args) => {
        args.pop();
        return args.some(Boolean);
      },
      len: (arr) => (Array.isArray(arr) ? arr.length : 0),
      gt: (a, b) => Number(a) > Number(b),
      toFixed3: (v) => {
        const n = Number(v);
        if (v === null || v === undefined || Number.isNaN(n) || v === 'N/A') return 'N/A';
        return n.toFixed(3);
      },
      ifGreaterThan: (v1, v2, options) =>
        Number(v1) > Number(v2) ? options.fn(this) : options.inverse(this),
      json: (context) => JSON.stringify(context),
      array: (...args) => {
        args.pop();
        return args;
      },
      qualityClass: (value, type) => {
        const rules = {
          chlorine: v => v >= 0.4 && v <= 0.9 ? 'good' : (v >= 0.2 && v <= 1.0 ? 'average' : 'poor'),
          turbidity: v => v <= 1 ? 'good' : (v <= 2 ? 'average' : 'poor'),
          coliform: v => v <= 0.1 ? 'good' : (v <= 1 ? 'average' : 'poor'),
          ecoli: v => v === 0 ? 'good' : 'poor',
          fluoride: v => v >= 0.6 && v <= 0.9 ? 'good' : (v >= 0.5 && v <= 1.0 ? 'average' : 'poor')
        };
        const numValue = Number(value);
        if (isNaN(numValue)) return '';
        return rules[type]?.(numValue) ?? '';
      },
      ifEquals(a, b, options) {
        return a === b ? options.fn(this) : options.inverse(this);
      },
    }
  })
);

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Configure Routes
configRoutes(app);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log(" Shutting down...");
  await disconnectDB();
  process.exit(0);
});