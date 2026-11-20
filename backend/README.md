# BlogVerse Backend — Node.js / Express REST API

Secure REST API for the BlogVerse blog application.

## Tech Stack
- **Runtime:** Node.js ≥ 18
- **Framework:** Express.js 4
- **Database:** MongoDB + Mongoose
- **Auth:** JWT stored in `httpOnly` cookies
- **Security:** Helmet · CORS · Rate Limiting · NoSQL Sanitisation · XSS Clean · HPP · bcrypt

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Register a new user |
| `POST` | `/api/v1/auth/login` | Public | Log in, returns JWT cookie |
| `POST` | `/api/v1/auth/logout` | 🔒 JWT | Clear JWT cookie |
| `GET`  | `/api/v1/auth/me` | 🔒 JWT | Get current user profile |
| `GET`  | `/api/v1/blogs` | Public | List published posts (paginated) |
| `GET`  | `/api/v1/blogs/my` | 🔒 JWT | Current user's posts (all statuses) |
| `GET`  | `/api/v1/blogs/:id` | Public | Get a single post |
| `POST` | `/api/v1/blogs` | 🔒 JWT | Create a blog post |
| `PATCH`| `/api/v1/blogs/:id` | 🔒 JWT | Update a post (owner only) |
| `DELETE`| `/api/v1/blogs/:id` | 🔒 JWT | Delete a post (owner only) |
| `GET`  | `/api/health` | Public | Server health check |

## Security Measures

| Layer | Implementation |
|-------|----------------|
| HTTP Headers | `helmet` — CSP, HSTS, X-Frame-Options, noSniff, XSS Filter |
| CORS | Strict origin whitelist from `CLIENT_ORIGIN` env var |
| Body size | 10 KB hard limit on JSON / URL-encoded bodies |
| Rate limiting | 200 req/15 min globally; **10 req/15 min on auth routes** |
| NoSQL Injection | `express-mongo-sanitize` strips `$` and `.` operators |
| XSS | `xss-clean` encodes HTML entities in all inputs |
| Parameter Pollution | `hpp` deduplicates query parameters |
| Password hashing | `bcryptjs` with 12 salt rounds |
| JWT | `HS256`, 7-day expiry, `httpOnly + Secure + SameSite=Strict` cookie |
| Input validation | `express-validator` — whitelist, type-check, length-check every field |
| Mongo schema | Mongoose validators as a second validation layer |
| Ownership | Controllers verify `req.user.id === post.author` before mutations |
| Error messages | Generic messages in production — no stack traces or internals leaked |
| User enumeration | Same error message for wrong email **and** wrong password |
| Inactive users | Pre-query filter hides soft-deleted accounts |

## Setup

```bash
cd backend
cp .env.example .env     # Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev              # Development (nodemon)
# npm start              # Production
```

## Environment Variables

See `.env.example` for all variables. Required:

| Variable | Example | Notes |
|----------|---------|-------|
| `MONGO_URI` | `mongodb://...` | Local or Atlas connection string |
| `JWT_SECRET` | `abc123...` | 64+ random hex chars |
| `CLIENT_ORIGIN` | `http://127.0.0.1:5500` | Frontend origin for CORS |
| `PORT` | `5000` | Server port |
| `NODE_ENV` | `development` | `production` removes stack traces from errors |

> **Note:** All demo/placeholder data is frontend-only. When the backend is connected, the frontend's `initHomeFeed()` and `initDashboard()` functions automatically fetch and display real data from the API. Static demo rows in `dashboard.html` will be replaced by API data at runtime.
