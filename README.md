## 3DSFERA Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SUPPLIER_INTAKE_EMAIL=suppliers@3dsfera.org
```

Security: if the `SUPABASE_SERVICE_ROLE_KEY` was ever shared publicly, rotate it immediately in Supabase Dashboard (`Project Settings -> API`) and update all deployments.

### 3. Create chat table in Supabase

Run the SQL from `supabase/setup.sql` in Supabase SQL Editor.

### 4. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supplier Auth + Nonagon Chat

- Supplier login/signup page: `/login`
- Supplier dashboard: `/supplier/dashboard`
- Supplier intake upload page: `/supplier/upload`
- Experience page can open supplier chat by selecting a product and pressing `Chat Supplier`.
- Supplier messages are stored in Supabase via `src/app/api/supplier-chat/route.ts`.
