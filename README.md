# NYC Water Quality Analytics Platform

http://nyc-water-quality-analytics-env.eba-etgqypky.us-east-1.elasticbeanstalk.com

Full-stack Node.js + Express (TypeScript) + MongoDB Atlas — borough water-quality analytics, dashboards, and community engagement.

## Tech Stack
- Node.js / Express — full-stack TypeScript (strict mode)
- MongoDB Atlas / Mongoose
- Handlebars (fully responsive server-rendered views)
- React functional components (Islands via Vite build pipeline) for interactive sample browsing
- Tailwind CSS v3 (PostCSS compilation) + Dark Mode
- Centralized native ES Module client (`public/js/apiClient.js`) with `async/await` and native `fetch`
- Deployed on AWS Elastic Beanstalk

---

## Running the Application

Set `MONGODB_URI` in `.env` to your **MongoDB Atlas** cluster (no local MongoDB).

```bash
npm install          # resolve dependencies
npm run data:sync    # sole data pipeline: rolling 2-year NYC Open Data → Atlas (src/scripts/ingestWaterData.ts)
npm run dev          # local dev: tsx hot-reload on src/index.ts (http://localhost:3000)
npm run build        # local compile: tsc → dist/, PostCSS → public/css/main.css, Vite → public/islands/watersamples/
npm start            # production run: node dist/index.js
```

---

## Test Accounts

The following test accounts are provided for testing purposes:

**Regular User Account**
- Email: `test123@gmail.com`
- Password: `Password123!`

**Admin Account**
- Email: `admin123@gmail.com`
- Password: `Password123!`

Use these credentials against the Atlas-backed deployment to test user features and admin moderation.
Administrator accounts are not publicly creatable.

---

## Project Structure

```
.
├── dist/                  # compiled JS (build locally; deployed to AWS)
├── islands
├── public
│   ├── css
│   ├── geojson
│   ├── islands
│   └── js
├── src
│   ├── config
│   ├── data
│   ├── helper
│   ├── model
│   ├── routes
│   ├── scripts
│   ├── styles
│   ├── types
│   ├── app.ts
│   ├── index.ts
│   └── middleware.ts
└── views
    └── layouts
```

**Deploy:** Run `npm run build` locally before packaging for AWS Elastic Beanstalk. Upload prebuilt `dist/`, CSS, and island bundles — EB runs `npm start` only (no cloud `tsc`).

---

## Feature Matrix

| Area | Capabilities |
|------|----------------|
| **Borough analytics** | Five-borough summaries, per-borough indicators (Cl, turbidity, coliform, E. coli, F), trends, health notices |
| **Samples** | Paginated React island; API-driven browse/filter |
| **Community** | Borough comments & likes; weekly “cleanest borough” vote |
| **Accounts** | Auth, profiles (liked boroughs + comment history) |
| **Admin** | Global comment moderation |
| **Presentation** | Borough map, trend charts, dark mode, comparison table |

---

## Page Routes

### Home Page
**method**: `GET`  
**route**: `/`

Displays the landing page.

---

### Borough Listings
**method**: `GET`  
**route**: `/boroughs`

Displays all five NYC boroughs and their average water quality indicators.

---

### Borough Detail Page
**method**: `GET`  
**route**: `/boroughs/:id`

Displays detailed information for a selected borough, including:
- Borough description
- Average water quality indicators (chlorine, turbidity, coliform, E. coli, fluoride), if available
- Informational (non-medical) health notices and tips when indicators exceed defined guidelines
- Like/unlike functionality for authenticated users
- Community comments and feedback
- Recent water quality sample data, if available

---

### Water Samples Overview
**method**: `GET`  
**route**: `/waterSamples`

Sample results are rendered by a React island and fetched from /api/water-samples on the client.

---

### User Profile
**method**: `GET`  
**route**: `/users/profile`

Requires authentication. Displays the logged-in user's account information, liked boroughs, and the user's comment history.

---

### Voting Page
**method**: `GET`  
**route**: `/votes/best`

Displays the weekly voting page and current results.

---

### Community Comments
**method**: `GET`, `POST`, `DELETE`  
**route**: `/api/comments`

Allows authenticated users to post comments on borough pages.  
Comments are submitted via the centralized API client (`public/js/apiClient.js`) using native `fetch`.  
Users can delete their own comments after refreshing the page, and admins can moderate all comments.

---

### Submit Vote
**method**: `POST`  
**route**: `/votes`

Allows logged-in users to vote for the “cleanest borough of the week”.  
On submission, the user is redirected back to `/votes/best`.

---

### Like Borough
**method**: `POST`  
**route**: `/boroughs/:id/like`

Requires authentication. Toggles the like/unlike status for the selected borough.

**response**
```json
{
  "success": true,
  "isLiked": true
}
```

---

## Data Pipeline

- **Ingest:** `npm run data:sync` — 24-month rolling window from [NYC Open Data](https://data.cityofnewyork.us/resource/bkwf-xfky.json) → **MongoDB Atlas** (`src/scripts/ingestWaterData.ts`)
- **Integrity:** Mongoose schema validation + DB constraints on insert
- **Aggregation:** Borough stats (chlorine, turbidity, coliform, E. coli, fluoride) computed from Atlas sample data
