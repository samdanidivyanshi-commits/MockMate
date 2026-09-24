# MockMate — Node.js + MongoDB Backend

## Project Structure

```
mockmate-backend/
├── src/
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── middleware/
│   │   └── auth.js          # JWT protect middleware
│   ├── models/
│   │   ├── User.js          # User schema (email + hashed password)
│   │   └── Result.js        # Per-user interview results (hr + technical)
│   ├── routes/
│   │   ├── auth.js          # /api/auth  (signup, login, logout, /me)
│   │   └── results.js       # /api/results (GET, POST, DELETE/:category)
│   └── server.js            # Express entry point
├── script.js                # ← REPLACE your existing script.js with this file
├── .env.example
└── package.json
```

---

## Quick Start

### 1 — Prerequisites
- Node.js ≥ 18
- MongoDB running locally **or** a free [MongoDB Atlas](https://cloud.mongodb.com) cluster

### 2 — Install dependencies
```bash
cd mockmate-backend
npm install
```

### 3 — Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set:
| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `5000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime e.g. `7d`, `24h` |
| `CLIENT_ORIGIN` | Comma-separated list of your frontend origins |

### 4 — Start the server
```bash
# Production
npm start

# Development (auto-restarts on file change)
npm run dev
```
You should see:
```
✅  MongoDB connected: localhost
🚀  MockMate API listening on http://localhost:5000
```

### 5 — Update your frontend
Replace the `script.js` in your frontend folder with the `script.js` file included here.

Make sure the `API_BASE` constant at the top of the file points to your server:
```js
const API_BASE = "http://localhost:5000/api";   // local dev
// const API_BASE = "https://your-api.onrender.com/api";  // production
```

Open your HTML files through a local server (e.g. VS Code Live Server on port 5500) so that CORS works correctly.

---

## API Reference

### Auth — `/api/auth`

| Method | Path | Body | Auth | Description |
|--------|------|------|------|-------------|
| POST | `/signup` | `{ email, password }` | ✗ | Register a new account |
| POST | `/login` | `{ email, password }` | ✗ | Login — returns JWT |
| GET | `/me` | — | ✔ Bearer | Get current user info |
| POST | `/logout` | — | ✗ | Semantic no-op (JWT is stateless) |

All successful responses include `{ success: true, token, user: { id, email } }`.

### Results — `/api/results`

All routes require `Authorization: Bearer <token>`.

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/` | — | Fetch full result bundle for logged-in user |
| POST | `/` | See below | Save results after an interview session |
| DELETE | `/:category` | — | Clear results for `hr` or `technical` |

**POST body:**
```json
{
  "category": "hr",
  "totalScore": 90,
  "questionCount": 5,
  "answers": [
    {
      "question": "Tell me about yourself...",
      "answer": "I am a frontend developer with...",
      "feedback": "Detailed",
      "score": 30,
      "length": 150
    }
  ]
}
```

---

## Deployment

### Render (recommended for beginners)
1. Push this folder to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all `.env` variables in the Render dashboard.
6. Update `CLIENT_ORIGIN` with your frontend's deployed URL.
7. Update `API_BASE` in `script.js` to your Render service URL.

### MongoDB Atlas (free tier)
1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user and copy the connection string.
3. Paste it into `MONGO_URI` in your `.env` / Render env vars.
4. Whitelist `0.0.0.0/0` in Network Access for Render deployments.
