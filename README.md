# BlogVerse — Fullstack Blog Application

A production-ready, security-hardened blogging platform built with **pure HTML5/CSS3/Vanilla JS** on the frontend and **Node.js, Express.js, and MongoDB** on the backend. Designed with a minimalist, monochrome editorial aesthetic inspired by *Medium*, *Ghost*, and *The New York Times*.

---

## 📌 Features & Architecture

### 1. Frontend Development
- **Pure Web Standards:** Built entirely without bloated frameworks — 100% vanilla HTML5, CSS3, and JavaScript.
- **Strict Dual-Tone Design System:** Minimalist black & white / grayscale palette with zero distracting accent colors.
- **Architectural Sharp Corners:** 0px border-radius across all UI elements (buttons, inputs, cards, tables, image containers).
- **Editorial Typography:** High-contrast serif headlines (`Instrument Serif`), clean grotesque body text (`Inter`), and tracked monospace labels (`JetBrains Mono`).
- **Persistent Theme Toggle:** Light ↔ Dark mode switch with preference stored in `localStorage` to prevent theme flash.
- **5 Complete Responsive Pages:**
  - `index.html` — **Home / Editorial Feed**: Hero lead, feature strip, sticky category filter, and archival article index.
  - `login.html` — **Login**: Split-panel authentication layout with literary quotes sidebar.
  - `register.html` — **Register**: Clean account creation form with validation hints.
  - `dashboard.html` — **Author Dashboard**: Performance metric cards and post management data table with live Delete/Edit actions.
  - `create-blog.html` — **Article Studio**: Publishing interface with Markdown formatting toolbar, cover upload preview, and publish settings.
  - `blog-detail.html` — **Article Reading View**: Full individual article view with author bio, reading metrics, tag index, and copy-link share action.

### 2. Backend Development & REST API
- **Runtime & Framework:** Node.js (≥18) and Express.js with full Model-View-Controller (MVC) modular architecture.
- **Database:** MongoDB via Mongoose with strict schema validation, automatic slug generation, and reading time estimation.
- **Stateless Authentication:** JWT issued inside **`httpOnly`, `SameSite=Strict`, `Secure`** cookies to defend against XSS-based token theft.
- **Password Security:** Salted hashes generated via **`bcryptjs` (12 rounds)**; passwords excluded from queries by default (`select: false`).
- **CRUD REST API:** Endpoints for user authentication and blog post lifecycle (creation, reading, updating, deletion, and author isolation).

---

## 🛡️ Security Hardening ("Hackproof" Implementation)

The backend implements defense-in-depth across every layer of the HTTP lifecycle:

| Layer | Security Mechanism | Attack Vectors Prevented |
|---|---|---|
| **NoSQL Injection** | `express-mongo-sanitize` | Strips MongoDB query operators (`$`, `.`) from request bodies, queries, and params. |
| **Cross-Site Scripting (XSS)** | Custom recursive entity encoder (`middleware/xss.js`) | Prevents malicious script execution from user-submitted text. |
| **HTTP Headers** | `helmet` | Enforces Content Security Policy (CSP), HSTS, `frameguard: deny` (anti-clickjacking), and disables `X-Powered-By`. |
| **Rate Limiting** | `express-rate-limit` | Global rate limiter (200 req/15 min) + strict auth limiter (**10 req/15 min**) to stop brute-force attacks. |
| **Parameter Pollution** | `hpp` | Prevents duplicate query parameter manipulation, with strict whitelist for sorting and pagination. |
| **Payload Size Protection** | Express body parser | Hard **10 KB payload limit** to block denial-of-service (DoS) buffer exhaustion. |
| **Input Validation** | `express-validator` | Whitelists, types, normalizes, and validates every input field before controller execution. |
| **Information Leakage** | Production Error Pipeline | Strips stack traces and database internal error codes; client receives safe generic messages only. |
| **Audit Status** | `npm audit` | Clean dependency tree with **0 vulnerabilities**. |

---

## 📁 Repository Structure

```text
├── index.html                  # Landing page & editorial article feed
├── login.html                  # User authentication (Sign In)
├── register.html               # Account creation (Sign Up)
├── dashboard.html              # Author post management & analytics
├── create-blog.html            # Article editor & publishing studio
├── blog-detail.html            # Individual blog post reading page
├── css/
│   └── style.css               # Design system & CSS custom properties (Light + Dark)
├── js/
│   └── main.js                 # API client, theme toggle, mobile navigation & UI logic
├── backend/
│   ├── server.js               # Express entry point & security middleware chain
│   ├── package.json            # Node.js dependencies & scripts
│   ├── .env.example            # Environment variable template
│   ├── .gitignore              # Node modules & secrets exclusion
│   ├── README.md               # Detailed backend documentation
│   ├── config/
│   │   └── db.js               # MongoDB Mongoose connection
│   ├── controllers/
│   │   ├── authController.js   # Register, Login, Logout, and GetMe handlers
│   │   └── blogController.js   # Full CRUD handlers for blog posts
│   ├── middleware/
│   │   ├── auth.js             # JWT verification & role authorization
│   │   ├── errorHandler.js     # Production-safe centralized error handler
│   │   ├── validate.js         # express-validator schemas
│   │   └── xss.js              # Recursive XSS sanitization
│   ├── models/
│   │   ├── Blog.js             # Blog post Mongoose schema
│   │   └── User.js             # User account Mongoose schema
│   ├── routes/
│   │   ├── authRoutes.js       # /api/v1/auth router
│   │   └── blogRoutes.js       # /api/v1/blogs router
│   └── utils/
│       └── AppError.js         # Operational error class
└── README.md
```

---

## 📡 API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register a new author account |
| `POST` | `/login` | Public | Authenticate user & issue httpOnly JWT cookie |
| `POST` | `/logout` | Authenticated | Clear session cookie |
| `GET` | `/me` | Authenticated | Retrieve current user profile |

### Blog Posts (`/api/v1/blogs`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | List published articles (supports `?page=`, `?limit=`, `?category=`, `?sort=`) |
| `GET` | `/my` | Authenticated | List all articles authored by logged-in user |
| `GET` | `/:id` | Public | View single post (increments view count) |
| `POST` | `/` | Authenticated | Create a new blog post |
| `PATCH` | `/:id` | Authenticated (Owner/Admin) | Update an existing post |
| `DELETE`| `/:id` | Authenticated (Owner/Admin) | Delete a post |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas URI)

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env

# Edit .env with your MongoDB connection string and secret
# MONGO_URI=mongodb://127.0.0.1:27017/blogverse
# JWT_SECRET=your_super_secret_64_char_key

# Start the server (Development mode with nodemon)
npm run dev

# Or start in Production mode
npm start
```
The backend server runs on `http://localhost:5000` by default.

### 3. Frontend Setup
Because the frontend is built with pure web technologies, no build tools or package managers are required:
- Open `index.html` directly in your browser, or
- Use VS Code's **Live Server** extension (serves at `http://127.0.0.1:5500`, which is whitelisted in CORS by default).

---

## 📜 Git Commit History
```text
c48d07c backend development
33a5e5c frontend development
```

---

*Fullstack Development Assignment — Internship Project*
