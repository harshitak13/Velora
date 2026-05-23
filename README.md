# Velora Market - Multi-vendor Marketplace

Live Link: [https://velora-three-virid.vercel.app/]([https://velora-three-virid.vercel.app/])

Velora Market is a full-stack multi-vendor marketplace website for independent sellers and buyers. The project includes a public shopping experience, product browsing, cart and order flows, seller dashboards, admin management screens, authentication, notifications, product uploads, and API routes for marketplace data.

## GitHub Repository Description

Full-stack multi-vendor marketplace with a static HTML/CSS/JavaScript storefront, seller and admin dashboards, a Next.js API backend, authentication, product/order management, notifications, and MongoDB persistence.

## Tech Stack

| Layer | Programming languages / tools used |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | TypeScript, TSX, Next.js API Routes, Node.js |
| Database | MongoDB with Mongoose |
| Authentication | JWT, bcryptjs, HTTP-only refresh cookie |
| Uploads | Cloudinary when configured, local base64 preview fallback |
| Styling | Custom CSS |

## Project Structure

```text
Multi-vendor Marketplace/
  frontend/
    public/          Static website pages
    css/             Shared styles
    js/              Frontend JavaScript modules
  backend/
    app/api/         Next.js API routes
    lib/             Auth, data, and MongoDB helpers
    package.json     Backend dependencies and scripts
```

## Main Features

- Buyer storefront with homepage, shop, product detail, cart, orders, login, and registration pages
- Seller dashboard with product, order, payout, and settings pages
- Admin dashboard for users, vendors, disputes, and marketplace overview
- Product filtering, sorting, reviews, reports, and notifications
- Role-based authentication for buyers, sellers, and admins
- MongoDB persistence with in-memory demo data fallback when `MONGODB_URI` is not set

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs at:

```text
http://localhost:3000
```

### Frontend

Serve the static frontend from `frontend/public`. For example:

```bash
cd frontend/public
python -m http.server 5173
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

By default, `frontend/js/api.js` points API requests to `http://localhost:3000`.

## Environment Variables

Create these variables in `backend/.env.local` for local development and in Vercel for production:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=velora_market
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
FRONTEND_ORIGIN=https://your-frontend-domain.vercel.app
CLOUDINARY_CLOUD_NAME=optional_cloudinary_cloud_name
CLOUDINARY_API_KEY=optional_cloudinary_api_key
CLOUDINARY_API_SECRET=optional_cloudinary_api_secret
```

## How to Deploy on Vercel

This repository has two deployable parts: the `backend` Next.js API and the static `frontend`.

### 1. Deploy the Backend API

1. Push this project to GitHub.
2. Open [Vercel](https://vercel.com/) and choose **Add New Project**.
3. Import the GitHub repository.
4. Set the project **Root Directory** to:

```text
backend
```

5. Keep the framework preset as **Next.js**.
6. Add the environment variables listed above.
7. Click **Deploy**.

After deployment, copy the backend URL. It will look similar to:

```text
https://your-backend-project.vercel.app
```

### 2. Deploy the Frontend

1. Create another Vercel project from the same GitHub repository.
2. Set the project **Root Directory** to:

```text
frontend/public
```

3. Use **Other** as the framework preset.
4. Leave the build command empty.
5. Set the output directory to:

```text
.
```

6. Deploy the frontend.

### 3. Connect Frontend to Backend

Before deploying the frontend, set the API base URL to your backend deployment URL. Add this before `../js/api.js` is loaded in the HTML pages:

```html
<script>
  window.API_BASE_URL = "https://your-backend-project.vercel.app";
</script>
```

Also set the backend `FRONTEND_ORIGIN` environment variable to your deployed frontend URL:

```env
FRONTEND_ORIGIN=https://your-frontend-project.vercel.app
```

Then redeploy the backend and frontend.

## Useful Backend Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Default Admin Login

```text
Email: admin@velora.com
Password: Admin123!
```

