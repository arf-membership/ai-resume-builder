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
4. Start the development server:
   ```bash
   npm run dev
   ```

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