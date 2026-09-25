# Abraham Shop

Abraham Shop is a mobile-first inventory and sales management application built with Vue 3, TypeScript, Vite, and Capacitor. It is designed for retail operations where staff can manage stock, record sales, monitor low-stock items, and review business performance from a simple dashboard.

The app works as a hybrid web/mobile solution, stores core data locally in IndexedDB via Dexie for fast offline access, and syncs changes across clients using Firebase Realtime Database. It supports role-based access for managers and shop keepers, with PIN-based login and localized UI in English and Amharic.

## Highlights

- Inventory tracking for products and stock levels
- Restocking workflows with acquisition and selling prices
- Sales recording and itemized revenue/margin tracking
- Low-stock alerts and restock history
- Business dashboard with KPI cards and chart visualizations
- Role-based access with manager and shop keeper permissions
- Offline-first storage with queued sync updates
- Firebase-backed multi-device synchronization
- Mobile app packaging via Capacitor for Android
- Internationalization with English and Amharic locales

## Tech Stack

- Vue 3 + TypeScript
- Vite
- Pinia for state management
- Vue Router
- Tailwind CSS
- Flowbite UI components
- Dexie (IndexedDB)
- Firebase Realtime Database
- Capacitor for Android app packaging
- ApexCharts for analytics

## Core App Features

### 1. Authentication and Authorization

The app uses a PIN-based login flow. Users are stored in the local Dexie database and seeded with default demo users on first run.

Default demo accounts:

- Manager User — PIN: 123456
- Shop Keeper User — PIN: 654321

The router includes an auth guard that redirects unauthenticated users to the login page.

### 2. Inventory Management

Users can:

- Add new items
- Manage inventory quantities
- Record restocks with purchase and selling prices
- View low-stock items
- Review item restock history

### 3. Shop / Sales Workflow

The shop module allows users to:

- Select inventory items
- Sell stock with quantity and pricing details
- Track revenue, costs, and profit margin
- View sales history for a specific item or recent sales window

### 4. Dashboard and Analytics

The home page and analytics screen provide:

- Total sold items
- Revenue overview
- Margin overview
- Low-stock indicator
- Sales trends over time
- Product revenue breakdown

### 5. Local-First Offline Sync

The app stores all operational data in Dexie. Any create, update, or delete action is queued into a local sync queue and then processed by a web worker that pushes changes to Firebase.

This design gives the app resilience when the network is unavailable while preserving eventual consistency across clients.

### 6. Multi-Client Synchronization

Firebase acts as the shared ledger for synchronization. The app listens for remote ledger updates and applies them locally while preventing echo loops from the same client. Local HLC timestamps are used to keep ordering and reduce conflict issues during remote updates.

## Project Structure

```text
Abraham-Shop/
├─ android/                     # Capacitor Android project
├─ public/                      # Static assets
├─ resources/                   # Android app resources
├─ src/
│  ├─ api/                     # API client utilities
│  ├─ components/              # Shared UI components
│  ├─ database/                # Dexie database and sync queue logic
│  ├─ i18n.ts                  # Localization loader
│  ├─ libs/                    # Firebase, auth, sync, date utilities, worker
│  ├─ locales/                 # en-US and am-ET translation files
│  ├─ pages/                   # Route-level screens
│  ├─ router/                  # Vue router configuration
│  ├─ store/                   # Pinia stores
│  ├─ types/                   # Shared TypeScript models
│  ├─ App.vue
│  ├─ main.ts
│  └─ style.css
├─ capacitor.config.ts          # Capacitor configuration
├─ index.html
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ vite.config.ts
├─ README.md
└─ ...
```

## Main Routes

The application includes the following route groups:

- /login — PIN sign-in
- / — dashboard home
- /shop — sales workflow
- /shop/sold/:id? — sold items history
- /inventory — inventory overview
- /inventory/low-stock — low-stock items
- /inventory/history/:id? — restock history
- /analysis — charts and performance insights
- /settings — settings hub
- /setting/shop-items — manage catalog items
- /setting/users — manage users and roles

## Data Model Overview

The project uses a set of typed entities for core business information:

- UserType — user name, PIN, role
- Inventory — product stock item with price and threshold data
- Restock — restock events tied to inventory items
- Shop — sold item transactions and revenue metrics
- Item — stock item definition
- SyncQueue — queued database change record for synchronization

## Synchronization Flow

The sync model is designed around local-first behavior and eventual consistency:

1. User actions update Dexie tables.
2. Dexie hooks detect create, update, and delete operations.
3. Each change is sanitized and added to the local _syncQueue table.
4. A background worker listens for queue activity and sends pending changes to Firebase.
5. Firebase writes to a global_ledger stream.
6. Other clients receive the ledger events and apply remote changes locally.
7. Local write guards prevent feedback loops and duplicate remote writes.

This allows the app to behave predictably even when offline or when multiple clients are active.

## Required Environment Variables

Create a .env file at the project root for Firebase configuration. The app reads these values from import.meta.env:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=your_firebase_database_url
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

If you also use a backend API, the app may expect:

```env
VITE_API_URL=http://localhost:3000
```

## Local Development

### Install dependencies

```bash
pnpm install
```

### Run the app in the browser

```bash
pnpm dev
```

This starts the Vite development server and enables the web app for local testing.

## Production Build

```bash
pnpm build
```

The build command runs TypeScript validation and produces a production bundle in the dist folder.

## Android App Packaging

This project is configured for Capacitor Android packaging.

### Initialize Android project

```bash
npx cap add android
```

### Sync web build with native project

```bash
pnpm build
npx cap sync android
```

### Open in Android Studio

```bash
npx cap open android
```

## Notes on Runtime Behavior

- Data is seeded automatically when the app loads.
- Default clients and inventory data are managed in the Dexie database.
- The app is intentionally local-first, so many workflows remain usable without internet access.
- Network restoration triggers queued sync processing automatically.
- The UI supports light/dark theming and locale switching by user environment.

## Future Possibilities

This app is structured to support future enhancements such as:

- Role-specific permissions beyond simple PIN access
- Real backend authentication and user management
- Export/import of sales and stock data
- Barcode scanning for faster sales entry
- Push notifications for low-stock alerts
- Better offline conflict resolution and audit logs

## License

This project does not currently declare a license in the repository. If you plan to distribute or deploy it publicly, add a license file and update this section accordingly.

## Summary

Abraham Shop is a complete retail management application tailored to small shop operations. It balances local speed, offline reliability, mobile deployment, and multi-device synchronization so that daily inventory and sales workflows remain efficient even in unpredictable network conditions.

