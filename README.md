# 🏠 Marco Esquivel Real Estate Website

A full-featured luxury real estate website built with **Node.js + Express + Handlebars**, powered by the **Repliers API** for live property listings.

---

## ✨ Pages Included

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero search, neighborhoods grid, portfolio, testimonials |
| Buy a Home | `/listings` | Searchable, filterable listings with pagination |
| Listing Detail | `/listings/:mls` | Full property detail with gallery & contact form |
| Featured Properties | `/featured` | Filtered premium listings grid |
| Sell a Home | `/sell` | Seller services + free home valuation form |
| Neighborhoods | `/neighborhoods` | All 11 California communities |
| Neighborhood Detail | `/neighborhoods/:slug` | Live listings per area |
| About | `/about` | Marco bio, credentials, stats |
| Blog | `/blog` | 6 articles with full post pages |
| Testimonials | `/testimonials` | Client reviews with star ratings |
| Let's Connect | `/contact` | Full contact form |

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Edit the `.env` file (already pre-configured with your keys):

```env
PORT=3000
REPLIERS_API_KEY=taecHelmCkhO5q9QdKZYFmNcCh6YeQ
REPLIERS_BASE_URL=https://api.repliers.io
GMAPS_KEY=bkvVOCVVfQhCfvnOXjLoZfNex30=
```

### 3. Run the server

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

### 4. Open in browser

```
http://localhost:3000
```

---

## 📁 Project Structure

```
marco-realestate/
├── server.js               # Express server + all routes
├── .env                    # API keys & config
├── package.json
├── public/
│   ├── css/
│   │   └── main.css        # All styles (874 lines)
│   ├── js/
│   │   └── main.js         # Client-side JS (animations, AJAX, autocomplete)
│   └── images/
│       └── placeholder.jpg # Fallback image
└── views/
    ├── layouts/
    │   └── main.hbs        # Master HTML layout
    ├── partials/
    │   ├── navbar.hbs      # Responsive navigation
    │   ├── footer.hbs      # Footer with links & social
    │   └── listing-card.hbs # Reusable property card
    └── pages/
        ├── home.hbs
        ├── listings.hbs
        ├── listing-detail.hbs
        ├── featured.hbs
        ├── sell.hbs
        ├── neighborhoods.hbs
        ├── neighborhood-detail.hbs
        ├── about.hbs
        ├── blog.hbs
        ├── blog-post.hbs
        ├── testimonials.hbs
        ├── contact.hbs
        └── 404.hbs
```

---

## 🔌 Repliers API

All property data is pulled live from the **Repliers API** (`api.repliers.io`).

### Endpoints Used

| Endpoint | Usage |
|----------|-------|
| `GET /listings` | Search & filter listings |
| `GET /listings/:mlsNumber` | Single listing detail |

### Query Parameters Supported

| Param | Description |
|-------|-------------|
| `status` | `A` (Active), `U` (Sold), `P` (Pending) |
| `resultsPerPage` | Number of listings per page (default: 9) |
| `pageNum` | Page number for pagination |
| `sortBy` | `createdOnDesc`, `listPriceAsc`, `listPriceDesc` |
| `minPrice` / `maxPrice` | Price range filter |
| `minBeds` / `minBaths` | Bedroom/bathroom filter |
| `search` | Full-text search (address, city, etc.) |
| `type` | Property type filter |

### Internal API Routes

| Route | Description |
|-------|-------------|
| `GET /api/listings` | Proxied listings JSON (used by AJAX filters) |
| `GET /api/search?q=` | Autocomplete search results |

---

## 🎨 Design

- **Fonts:** Playfair Display (headings) + DM Sans (body) + Cormorant Garamond (italics)
- **Colors:** Navy `#1a3a5c`, Gold `#c9a96e`, Off-white `#f8f6f2`
- **Icons:** Font Awesome 6
- **Images:** Unsplash (placeholder) + Repliers CDN (listings)
- **Fully responsive:** Mobile, tablet, and desktop

---

## ⚙️ Customization

### Update Agent Info
Edit `views/partials/navbar.hbs`, `footer.hbs`, and `views/pages/about.hbs` with real contact details.

### Update Neighborhoods
Edit the `neighborhoods` array in `server.js` around line 130.

### Change Colors
Edit CSS variables at the top of `public/css/main.css`:
```css
:root {
  --navy: #1a3a5c;
  --gold: #c9a96e;
  ...
}
```

### Add Blog Posts
Add objects to the `allPosts` array in the `/blog/:slug` route in `server.js`.

---

## 🚢 Deployment

### Deploy to Railway / Render / Fly.io
1. Push to GitHub
2. Connect repo to Railway/Render
3. Set environment variables in dashboard
4. Deploy — it will run `npm start`

### Deploy to VPS / DigitalOcean
```bash
# Install PM2 for process management
npm install -g pm2

# Start the app
pm2 start server.js --name marco-realestate

# Auto-start on reboot
pm2 startup
pm2 save
```

---

## 📝 Notes

- All contact/valuation forms are front-end only. To receive submissions, add a mailer (e.g. Nodemailer + Gmail) or a service like Formspree.
- The `.env` file contains live API keys — do not commit to public repositories. Use `.gitignore` (already included).
- The `GMAPS_KEY` is included for potential Google Maps integration in listing detail pages.

---

*Built with ❤️ for Marco Esquivel Real Estate | Powered by Repliers API*
