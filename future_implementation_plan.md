# Phase 2: Feature Expansion Implementation Plan

This plan outlines the architecture and steps required to implement the next wave of features for House of PurviSurbhi: Advanced Filtering, Customer Accounts & Wishlists, Email Notifications, Reviews & Ratings, Related Products, and Admin Analytics. (Note: Payment Gateway integration is deferred for now.)

## 1. Customer Accounts & Wishlists
**Detailed Improvement:**
- Users can create an account and log in.
- Registered users can save delivery addresses for faster checkout.
- Users can maintain a personalized "Wishlist" of favorite sarees and suits.
- A new "Account Dashboard" page will show order history and saved items.

## 2. Advanced Filtering & Sorting
**Detailed Improvement:**
- A robust filtering sidebar/topbar on the Home page.
- Users can filter products by:
  - Price Range (min to max).
  - Color.
  - Fabric (e.g., Silk, Cotton, Georgette).
  - Occasion (e.g., Bridal, Party Wear, Casual).
- Sorting options (Price Low-to-High, Price High-to-Low, Newest Arrivals).
- Admin forms will be updated with predefined dropdowns to enforce consistent attributes.

## 3. Product Reviews & Ratings
**Detailed Improvement:**
- A 5-star rating system displayed on the Product Detail page.
- Customers can submit text reviews.
- The average rating and review count will be visible on Product Cards on the Home page, building social proof.

## 4. "You May Also Like" (Related Products)
**Detailed Improvement:**
- A horizontally scrolling carousel at the bottom of the Product Detail page.
- Automatically recommends 4-5 similar products based on the current product's category, fabric, or color.

## 5. Automated Email Notifications
**Detailed Improvement:**
- Uses a generic SMTP setup (`nodemailer`) configured with a Gmail App Password.
- When the admin updates an order status to "Confirmed," "Shipped," or "Delivered," an automated, styled email receipt/tracking update is dispatched to the customer.

## 6. Advanced Admin Analytics
**Detailed Improvement:**
- The Admin Dashboard will gain a new "Analytics" tab.
- Utilizes the `recharts` library to display visually appealing graphs of monthly sales trends, revenue, and top-selling products.

---

## Technical Architecture & Proposed Changes

### Database Schema Updates (`server/database.js`)
- **[MODIFY]** `products` table: Add `color`, `fabric`, `occasion`, `rating_sum`, `review_count` columns.
- **[MODIFY]** `orders` table: Add `user_id` (nullable for guests).
- **[NEW]** `users` table: Store `id`, `name`, `email`, `password_hash`, `saved_address`.
- **[NEW]** `wishlists` table: Map `user_id` to `product_id`.
- **[NEW]** `reviews` table: Map `product_id` to `user_name`, `rating`, `comment`, `created_at`.

### Backend API Routes
- **[NEW]** `server/routes/users.js`: User registration, login (JWT), fetching user profile.
- **[NEW]** `server/routes/wishlist.js`: Adding/removing/getting wishlist items.
- **[NEW]** `server/routes/reviews.js`: Submitting a review and fetching reviews.
- **[MODIFY]** `server/routes/products.js`: Handle new filter query params and related products logic.
- **[MODIFY]** `server/routes/orders.js`: Dispatch `nodemailer` emails on status updates.
- **[NEW]** `server/routes/analytics.js`: Aggregate data for charts.

### Frontend: Components & Pages
- **Dependencies**: `recharts` (charts), `lucide-react` (icons).
- **[NEW]** `LoginRegister.jsx`: Dual form for sign-in/sign-up.
- **[NEW]** `AccountDashboard.jsx`: User portal.
- **[MODIFY]** `Home.jsx`: Add advanced filtering sidebar.
- **[MODIFY]** `ProductDetail.jsx`: Display reviews and related products.
- **[MODIFY]** `ProductCard.jsx`: Add wishlist toggle heart.
- **[MODIFY]** `AdminDashboard.jsx`: Analytics tab and updated Add/Edit forms.
- **[MODIFY]** `CheckoutModal.jsx`: Pre-fill logged-in user data.
