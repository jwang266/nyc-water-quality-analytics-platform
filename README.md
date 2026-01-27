# NYC Water Quality Analytics Platform

http://nyc-water-quality-analytics-env.eba-etgqypky.us-east-1.elasticbeanstalk.com

A full-stack Node.js + Express (TypeScript) + MongoDB web application for analyzing and visualizing NYC drinking water quality by borough, featuring interactive dashboards and community engagement.

## Tech Stack
- Node.js / Express (TypeScript)
- MongoDB Atlas / Mongoose
- Handlebars (server-rendered views)
- React island (Vite) for interactive sample browsing
- Client-side data fetching (fetch / AJAX)
- Custom CSS + Dark Mode
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
│   └── watersamples
│       └── src
├── public
│   ├── css
│   │   └── videos
│   ├── geojson
│   ├── islands
│   │   └── watersamples
│   └── js
├── seedData
├── src
│   ├── config
│   ├── data
│   ├── helper
│   ├── model
│   └── routes
└── views
    └── layouts
```

- islands/watersamples/ contains the React island (Vite) used to render and paginate the Water Samples list.
- The rest of the app remains server-rendered with Handlebars.

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
- Client-side AJAX interactions for comments, likes, and voting
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
Comments are submitted via AJAX.  
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
- Uses a local snapshot of NYC drinking water data stored in `seedData/`
- CSV files are parsed with Papa Parse and written into MongoDB using batch inserts
- Only a recent subset of sample records is seeded locally by default to keep startup fast,
while the data layer is designed to scale to the full NYC Open Data dataset


### Data Integrity
- All records are validated through Mongoose schemas
- Database constraints help prevent invalid or conflicting records

### Borough Aggregation
- Borough-level statistics (chlorine, turbidity, coliform, E. coli, fluoride)
  are pre-computed during seeding to support fast page rendering

---

## Notes

* AJAX is used for dynamic interactions such as comments and likes
* The water samples page uses a React island for client-side rendering and pagination
* Custom CSS is used throughout the application
* MongoDB is accessed via Mongoose models
* Password reset links are displayed in the UI for local development and demonstration purposes.
* The application has been tested to ensure core features function as intended
