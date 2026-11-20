# Blog Application — Frontend

A clean, responsive, editorial-style blog platform frontend built with **pure HTML5, CSS3, and Vanilla JavaScript** — no frameworks, no dependencies.

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Landing page, hero section, article feed, newsletter CTA |
| Login | `login.html` | Sign-in form with split-panel layout |
| Register | `register.html` | Account creation form |
| Dashboard | `dashboard.html` | Author overview: stats, article management table |
| Create Blog | `create-blog.html` | Article editor with Markdown toolbar and publish settings |

## Design System

- **Palette:** Strict dual-tone — black / white / grays only. Zero accent colors.
- **Corners:** Sharp (no border-radius anywhere).
- **Typography:** `Instrument Serif` (headlines) · `Inter` (body) · `JetBrains Mono` (UI labels / metadata)
- **Theme:** Light ↔ Dark toggle, persisted in `localStorage`.
- **Layout:** Inspired by Medium, Ghost (Casper), and NYT editorial grid patterns.

## Project Structure

```
frontend/
├── index.html          # Home / blog feed
├── login.html          # Sign in
├── register.html       # Sign up
├── dashboard.html      # Author dashboard
├── create-blog.html    # Create / edit article
├── css/
│   └── style.css       # Full design system (CSS custom properties, light + dark)
├── js/
│   └── main.js         # Theme toggle, mobile nav, filters, image preview, mock forms
└── README.md
```

## How to Run

No build step needed. Open any `.html` file directly in a browser, or use VS Code's **Live Server** extension.

## Note on Demo Data

> All article data, author names, statistics, and images visible in the UI are **placeholder/demo content only**.  
> When a backend database is connected, this static data will be replaced with real API responses and all hardcoded demo content will be removed.

---

*Frontend Development Assignment — Internship Project*
