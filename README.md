# House of PurviSurbhi

A full-stack e-commerce website for "House of PurviSurbhi", offering premium sarees and designer ladies suits.

## Features
- **Public Storefront**: Browse sarees and suits, search by name, filter by category, view detailed product pages with an image gallery.
- **Order Capture**: Easy checkout process allowing users to submit their details. Orders are captured in the database.
- **WhatsApp Integration**: After ordering, customers can seamlessly forward their order details to the admin via WhatsApp.
- **Admin Dashboard**: Manage products (add/edit/delete, multiple image upload, stock management, soft delete) and track orders (status, payment mode, tracking details).

## Tech Stack
- **Frontend**: React 19, Vite, React Router DOM, pure CSS (Custom Properties for theming).
- **Backend**: Express 5, Node.js.
- **Database**: SQLite (via `sql.js`), file-based persistent storage (`server/database.sqlite`).
- **File Uploads**: `multer` for managing product images, saved in `server/uploads/`.
- **Testing**: `vitest` and `supertest` for API validation.

## Local Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   ADMIN_PASSWORD=admin123
   ADMIN_TOKEN=admin-token-purvisurbhi
   WEB3FORMS_ACCESS_KEY=your_key_here
   ```
3. **Run Development Servers (Frontend + Backend)**
   ```bash
   npm run dev
   ```
   - The frontend will run on `http://localhost:5173`.
   - The backend API will run on `http://localhost:3001`.

## Admin Credentials
To access the Admin Dashboard:
- **URL**: `http://localhost:5173/admin`
- **Password**: Defined in your `.env` (default is `admin123`).

## Project Structure
- `src/`: React frontend code (Components, Pages, CSS).
- `server/`: Node.js Express backend.
  - `database.js`: SQLite setup and helpers.
  - `routes/`: Express routers (`auth.js`, `products.js`, `orders.js`).
  - `uploads/`: Directory for user-uploaded product images.
- `public/`: Static assets including seed images.

## Deployment Notes
When deploying (e.g. to Render):
- Ensure the start command triggers the server: `npm run start`.
- The build command should build the Vite bundle: `npm install && npm run build`.
- The backend serves the React `dist` folder natively.
