# One Place Frontend

Frontend application for the One Place Medical Platform.

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Update the `.env` file with your API URL:
```
# For local development
VITE_API_URL=http://localhost:5000

# For production (set in Vercel environment variables)
# VITE_API_URL=https://oneplace.now
```

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

Build the production bundle:
```bash
npm run build
```

The build output will be in the `dist` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Deployment to Vercel

### Automatic Deployment

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository in Vercel
3. Vercel will automatically detect it's a Vite project
4. Add environment variable `VITE_API_URL` in Vercel dashboard
5. Deploy!

### Manual Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. For production:
```bash
vercel --prod
```

### Environment Variables

Make sure to set the following environment variable in Vercel:

- `VITE_API_URL`: Your backend API URL (e.g., `https://api.oneplace.com`)

**Important:** Do NOT include `/api` at the end of the URL. The application will add it automatically.

### Configuration

The `vercel.json` file is already configured for:
- SPA routing (all routes redirect to index.html)
- Asset caching
- Build optimization

## Project Structure

```
src/
├── components/     # Reusable components
├── contexts/       # React contexts (Auth, etc.)
├── layouts/        # Layout components
├── pages/          # Page components
├── router.jsx      # Route configuration
└── utils/         # Utility functions
```

## Technologies

- React 18
- Vite
- React Router DOM
- Recharts (for charts)
- date-fns (for date handling)

## License

MIT

