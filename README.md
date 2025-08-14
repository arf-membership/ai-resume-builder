# AI-Powered CV Improvement Platform

A serverless React application that allows users to upload their PDF CVs, analyze them using AI, and generate improved versions.

## Tech Stack

- **Frontend**: React 18 with Vite and TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Storage, Edge Functions)
- **State Management**: Zustand (to be added)
- **PDF Handling**: react-pdf and pdf-lib (to be added)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your Supabase credentials
4. Set up the database schema (see Database Setup section below)
5. Start the development server:
   ```bash
   npm run dev
   ```

## Database Setup

The application uses Supabase for backend services. Follow these steps to set up the database:

### Option 1: Quick Setup (Recommended)
Run the complete deployment script in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of database/deploy.sql
```

### Option 2: Step-by-Step Setup
1. **Schema**: Run `database/schema.sql` to create tables and indexes
2. **Storage**: Run `database/storage.sql` to create storage buckets
3. **Security**: Run `database/rls.sql` to set up Row Level Security policies
4. **Seed Data**: Run `database/seed.sql` to insert default AI provider settings

### Option 3: Using Migrations
If you're using Supabase CLI:
```bash
supabase migration up
```

### Verification
Run `database/verify.sql` to verify that all components are properly configured.

### Required Secrets
Set up these secrets in your Supabase project:
- `OPENAI_API_KEY`: Your OpenAI API key for CV analysis
- `ANTHROPIC_API_KEY`: Your Anthropic API key (optional)

## Project Structure

```
src/
├── components/     # React components
├── services/       # API and business logic services
├── types/          # TypeScript type definitions
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
└── lib/            # Library configurations (Supabase, etc.)
```

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key