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

### 3. Create application tables in Supabase

Run the SQL from `supabase/setup.sql` in Supabase SQL Editor.

The setup includes the public pre-registration queue. Requests submitted at
`/pre-register` are validated by `/api/pre-registration` and stored in the
`pre_registrations` table through the server-side service role. Review pending
rows in Supabase before creating user accounts.

For deployments where the migration has not reached production yet, the API
durably stores requests in the existing private `pavilion_contact_requests`
queue with `pavilion_id = 'pre-registration'`. Once the dedicated table is
available, new submissions use `pre_registrations` automatically.

### 4. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

### 5. Optional: force frontend ICE servers

If the signalling server sends the wrong WebRTC config, the frontend can override it before creating the peer connection.

Add these optional values to `.env.local`:

```bash
NEXT_PUBLIC_PIXELSTREAM_FORCE_ICE_TRANSPORT_POLICY=relay
NEXT_PUBLIC_PIXELSTREAM_FORCE_ICE_SERVERS=[{"urls":["stun:stun.example.com:3478"]},{"urls":["turn:turn.example.com:3478?transport=tcp"],"username":"turn_username","credential":"turn_password"}]
```

After redeploying, open the browser console or `chrome://webrtc-internals` and verify the applied ICE URLs match your TURN provider.

## Supplier Auth + Nonagon Chat

- Supplier login/signup page: `/login`
- Supplier dashboard: `/supplier/dashboard`
- Supplier intake upload page: `/supplier/upload`
- Experience page can open supplier chat by selecting a product and pressing `Chat Supplier`.
- Supplier messages are stored in Supabase via `src/app/api/supplier-chat/route.ts`.
