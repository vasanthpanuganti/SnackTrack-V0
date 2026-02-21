# SnackTrack Frontend

A modern, highly interactive Next.js 15 frontend for the SnackTrack nutrition and meal planning platform.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

## Features

### Authentication
- ✅ Email/Password Sign Up & Login
- ✅ JWT-based authentication
- ✅ Protected routes with middleware
- ✅ Persistent auth state with Zustand

### Dashboard
- ✅ Daily nutrition overview
- ✅ Calorie and macro tracking
- ✅ Quick action buttons
- ✅ AI-powered recipe recommendations
- ✅ Progress visualization

### Recipe Management
- 🔄 Recipe browser with pagination
- 🔄 Advanced search and filters
- 🔄 Recipe detail pages
- 🔄 Favorite recipes
- 🔄 Allergen filtering

### Meal Planning
- 🔄 Weekly meal planner
- 🔄 Drag-and-drop meal scheduling
- 🔄 Auto-generate meal plans
- 🔄 Meal swap functionality
- 🔄 Shopping list generation

### Meal Logging
- 🔄 Food diary
- 🔄 Quick log from recipes
- 🔄 Manual food entry
- 🔄 Nutrition breakdown

### User Profile
- 🔄 Personal information
- 🔄 Health goals
- 🔄 Dietary preferences
- 🔄 Allergen management
- 🔄 Settings

Legend: ✅ Implemented | 🔄 Coming Soon

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn components
│   ├── layout/            # Layout components (Header, Sidebar)
│   ├── auth/              # Auth forms
│   ├── recipes/           # Recipe components
│   ├── meal-plan/         # Meal planner components
│   ├── charts/            # Chart components
│   └── shared/            # Shared components
├── lib/
│   ├── api/               # API client & endpoints
│   ├── auth/              # Supabase auth utilities
│   ├── store/             # Zustand stores
│   ├── hooks/             # Custom React hooks
│   └── utils.ts           # Utility functions
├── providers/             # React context providers
├── types/                 # TypeScript type definitions
└── global.d.ts           # Global type declarations
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
# Install dependencies (from root of monorepo)
pnpm install

# Or install just for frontend
cd apps/frontend
pnpm install
```

### Development

```bash
# Run development server
pnpm dev

# Run from monorepo root
pnpm --filter @snacktrack/frontend dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Building

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## API Integration

The frontend communicates with the backend API using axios and TanStack Query. All API endpoints are defined in `src/lib/api/`:

- `auth.api.ts` - Authentication endpoints
- `recipes.api.ts` - Recipe endpoints
- `meal-plans.api.ts` - Meal plan endpoints
- `meal-logs.api.ts` - Meal log endpoints
- `users.api.ts` - User profile endpoints

### Using API Hooks

```typescript
import { useRecipes, useCreateMealPlan } from "@/lib/hooks";

function MyComponent() {
  // Fetch data
  const { data, isLoading } = useRecipes({ diet: "vegetarian" });

  // Mutations
  const { mutate: createPlan } = useCreateMealPlan();

  const handleCreate = () => {
    createPlan({
      name: "My Meal Plan",
      startDate: "2026-02-20",
      endDate: "2026-02-27",
    });
  };
}
```

## State Management

### Auth State (Zustand)

```typescript
import { useAuthStore } from "@/lib/store/auth-store";

const { user, setAuth, clearAuth } = useAuthStore();
```

### Server State (TanStack Query)

All server state is managed through TanStack Query hooks in `src/lib/hooks/`.

## Styling

This project uses Tailwind CSS v4 with custom design tokens:

- **Primary**: Green (#10b981) - Health/Nutrition theme
- **Secondary**: Blue (#3b82f6) - Trust
- **Accent**: Orange (#f59e0b) - Energy

### Adding Custom Styles

```typescript
// Using Tailwind classes
<div className="bg-primary text-white p-4 rounded-lg" />

// Using cn utility for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class"
)} />
```

## Component Development

### shadcn Components

Components are located in `src/components/ui/`. To add new components:

```bash
npx shadcn@latest add <component-name>
```

Note: Due to workspace protocol issues, components may need to be manually created.

### Custom Components

Follow these guidelines:
- Use TypeScript for all components
- Export components from index files
- Use compound component patterns where appropriate
- Keep components focused and composable

## Testing (Future)

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Deployment

The frontend is optimized for Vercel deployment:

```bash
# Deploy to Vercel
vercel

# Production deployment
vercel --prod
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private - All rights reserved
