# NYC Water Quality Analytics Platform

http://nyc-water-quality-analytics-env.eba-etgqypky.us-east-1.elasticbeanstalk.com

A full-stack Node.js + Express (TypeScript) + MongoDB web application for analyzing and visualizing NYC drinking water quality by borough, featuring interactive dashboards and community engagement.

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

```bash
npm install
npm run seed
# development (TypeScript, tsx)
npm run dev
# production (compiled JavaScript)
npm start
```
The application uses a local MongoDB database. You must seed the database before starting the server.

The server will start on:

```text
http://localhost:3000

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

These accounts are pre-seeded in the database and can be used to test user features and admin moderation functionality.
For security reasons, administrator accounts are not publicly creatable and can only be provisioned via database seeding.


---


## Project Structure

```
.
├── islands
├── public
│   ├── css
│   ├── geojson
│   ├── islands
│   └── js
├── seedData
│   └── sampleSites.json
├── src
│   ├── config
│   ├── data
│   ├── helper
│   ├── model
│   ├── routes
│   ├── styles
│   ├── types
│   ├── app.ts
│   ├── index.ts
│   ├── middleware.ts
│   └── seed.ts
└── views
    └── layouts
```

- islands/watersamples/ contains the React island (Vite) used to render and paginate the Water Samples list.
- The view layer combines server-rendered Handlebars templates with dynamic React functional components (Islands).
- Client-side network calls use the centralized ES Module API client at public/js/apiClient.js.

---

## Core Features

- Borough-level water quality summaries  
- Detailed borough indicator pages  
- Community comments and likes  
- Weekly voting for the cleanest borough
- Trend analysis across years  
- Data overview comparison table  
- User profiles with liked boroughs and comments  
- Admin comment moderation
- Client-side fetch interactions for comments, likes, and voting via `public/js/apiClient.js`
- React island for interactive water sample browsing
- Simple health tips 

## Extra Features

- Map visualization  
- Dark mode support  
- Statistical charts and diagrams  

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


## Data Seeding & Optimization Strategy

### Data Source & Ingestion
- Uses NYC Open Data via `npm run data:sync` (`src/scripts/ingestWaterData.ts`) for the rolling 2-year water sample window
- Local `seedData/sampleSites.json` seeds reference sample sites for borough validation


### Data Integrity
- All records are validated through Mongoose schemas
- Database constraints help prevent invalid or conflicting records

### Borough Aggregation
- Borough-level statistics (chlorine, turbidity, coliform, E. coli, fluoride)
  are pre-computed during seeding to support fast page rendering

---

## Notes

* Dynamic interactions (comments, likes, borough dashboard stats/trends) use native `async/await` `fetch` via `public/js/apiClient.js`
* The water samples page uses a React island (Vite) for client-side rendering and pagination
* Styling uses Tailwind CSS v3 compiled through PostCSS to `public/css/main.css`
* MongoDB is accessed via Mongoose models
* The application has been tested to ensure core features function as intended
