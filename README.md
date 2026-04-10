# CipherVault

A Next.js app with Supabase integration and deployment-ready pages.

## Local development

Install dependencies and run the dev server:

```bash
npm install
npm run dev -- --hostname 0.0.0.0
```

Then open the forwarded preview URL from your remote environment or:

- `http://localhost:3000`
- `http://127.0.0.1:3000`

If you are using a remote Codespace or tunnel, forward port `3000` in the VS Code Ports view and open the generated browser link.

## Environment variables

Create a `.env.local` file in the repository root with your Supabase settings:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Do not commit `.env.local` to Git.

## Supabase table

To show live data in the app, create a table named `vault_items` in Supabase with columns:

- `id` (integer, primary key)
- `title` (text)
- `summary` (text)

Then reload the app to see live records.

## Deployment to Vercel

1. Push this repository to GitHub.
2. Create a new project in Vercel.
3. Connect your GitHub repo.
4. Add the same environment variables in Vercel.
5. Deploy the project.

Vercel will provide a permanent URL like `https://your-project.vercel.app`.
