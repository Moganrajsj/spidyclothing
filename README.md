# Spidy Clothing

A React storefront backed by a same-origin Node API and MySQL. The API keeps database credentials server-side, stores customer accounts and sessions, reads the catalog and inventory from MySQL, persists signed-in carts and wishlists, and records Cash on Delivery orders.

## Local development

1. Copy `.env.example` to `.env.local` and set the database credentials. Keep `.env.local` out of source control.
2. Install packages with `npm install`.
3. Create the store tables and import the starter catalog once with `npm run db:migrate`.
4. Start the storefront and database API together with `npm run dev`.

The development API is available under `/api` on the Vite origin. `GET /api/health` reports database connectivity; `GET /api/products` returns the live catalog.

## Production

Build with `npm run build`, then run `npm start` on a Node.js host with the database environment variables configured. The server serves the Vite `dist` build and the `/api` routes from one origin. Configure the hosting panel to run the Node app and allow the app server to reach the MySQL host. Do not put database credentials in `VITE_*` variables or frontend code.

## Database and store behavior

- `server/schema.sql` creates products, size inventory, customers, hashed customer sessions, carts, wishlists, orders, and order items.
- `npm run db:migrate` imports `src/data/products.json` only when the products table is empty. Later runs preserve catalog edits made in the database.
- Customer passwords use Node's scrypt password hashing. Browser sessions use random HttpOnly, SameSite cookies; only hashes of session tokens are stored in MySQL.
- Products and size stock are read from MySQL. Signed-in carts and wishlists sync to MySQL; guest carts and wishlists remain in that browser's local storage.
- Checkout currently creates Cash on Delivery orders and reserves stock in a transaction. UPI/card payment processing is not connected; those options remain unavailable until a payment provider and server-side verification are configured.
- The home page includes a trust strip, first-order coupon, customer reviews, a shoppable UGC grid, fit guide, FAQ, store teaser, recently viewed products, and a newsletter form. Newsletter sign-ups are stored in the `newsletter_subscribers` table through `POST /api/newsletter`.
- Customer accounts currently have sign-up/sign-in and order history. Email verification, password recovery, and a product-management dashboard are not included.

## Customer accounts and Google sign-in

Customers can create an account with an email and password, or continue with Google. The account page at `/account` lets a signed-in customer edit their name and phone number and review past orders. Checkout requires an account: guests see the sign-in/create-account panel before they can enter shipping details.

Email/password accounts use the existing `customers` table and scrypt hashing. Google accounts store the Google account id in `google_id` and leave `password_hash` empty. Run `npm run db:migrate` after pulling these changes to add the `google_id`, `avatar_url`, and nullable `password_hash` columns.

To enable Google sign-in:

1. In Google Cloud Console, create an OAuth 2.0 Client ID of type "Web application".
2. Add an authorized redirect URI for each origin you serve:
   - `http://localhost:5173/api/auth/google/callback`
   - `https://your-production-domain/api/auth/google/callback`
3. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APP_ORIGIN` (the public origin, without a trailing slash) to `.env.local` (and to the production host's environment).
4. Restart the app. `GET /api/auth/providers` returns `{ "google": true }` once the credentials are detected; until then the Google button is shown disabled.

`APP_ORIGIN` must match the origin registered in Google Cloud Console, because the same value is used to build both the authorization redirect and the token exchange redirect URI.

## Project structure

```text
server/              MySQL schema, API routes, migration/seed and production server
src/context/         Catalog and store/account state
src/data/            Starter product catalog imported into a new database
src/pages/            Home, shop, product, cart, checkout and account pages
public/images/       Storefront product and editorial images
```
