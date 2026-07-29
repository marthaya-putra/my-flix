# MyFlix

A modern, full-stack movie discovery and recommendation platform built with cutting edge web technologies.

## 🎬 Features

- **🎥 Movie & TV Show Discovery**: Browse trending, popular, and upcoming content
- **🔍 Advanced Search**: Multi-criteria filtering by genre, rating, year, and more
- **🤖 AI-Powered Recommendations**: Personalized content suggestions using Google AI
- **👤 User Authentication**: Secure auth system with Better Auth
- **⭐ Personalization**: Save favorites, preferences, and get tailored recommendations
- **📱 Responsive Design**: Beautiful UI that works on all devices
- **🎨 Modern UI/UX**: Built with Tailwind CSS and shadcn/ui components

## 🛠️ Tech Stack

### Frontend
- **[TanStack Start](https://tanstack.com/start)** - Full-stack React framework with SSR
- **[React 19](https://react.dev)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality UI components
- **[Vite](https://vitejs.dev)** - Fast build tool and dev server

### Backend & Data
- **[Nitro](https://nitro.unjs.io/)** - Universal web server framework
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe SQL toolkit
- **[PostgreSQL](https://www.postgresql.org/)** - Primary database
- **[Better Auth](https://better-auth.com/)** - Authentication solution

### AI & External APIs
- **[Google AI SDK](https://ai.google.dev/sdk)** - AI recommendations
- **[TMDB API](https://www.themoviedb.org/documentation/api)** - Movie/TV data
- **[Mistral AI](https://www.mistral.ai/)** - Additional AI capabilities

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- TMDB API key
- Google AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/marthaya-putra/my-flix.git
   cd my-flix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5433/myflix

   # TMDB API
   TMDB_TOKEN=your_tmdb_token_here
   INCLUDE_ADULT=false

   # Google AI
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here
   MISTRAL_API_KEY=your_mistral_api_key_here

   # Auth
   BETTER_AUTH_SECRET=your_better_auth_secret_here
   BETTER_AUTH_URL=http://localhost:3000
   ```

4. **Set up the database**
   ```bash
   # Generate database schema
   npm run db:generate

   # Run migrations
   npm run db:migrate

   # (Optional) Open Drizzle Studio to manage database
   npm run db:studio
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── filters/        # Search and filter components
│   ├── preferences/    # User preference components
│   └── recommendations/ # AI recommendation components
├── lib/                # Core utilities and configurations
│   ├── auth/           # Authentication setup
│   ├── ai/             # AI recommendation logic
│   ├── data/           # Data fetching and TMDB API
│   ├── db/             # Database schema and migrations
│   └── repositories/   # Data access layer
├── routes/             # File-based routing
│   ├── __root.tsx      # Root layout and metadata
│   ├── index.tsx       # Home page
│   ├── movies/         # Movie-related routes
│   ├── tvs/            # TV show routes
│   └── api/            # API routes
└── styles/             # Global styles
```

## 🎯 Key Features Explained

### AI-Powered Recommendations
- Uses Google AI to analyze user preferences
- Provides personalized movie/TV suggestions
- Considers user's favorite genres, actors, and viewing history

### Advanced Filtering
- Genre-based filtering for movies and TV shows
- Rating and year range filters
- Real-time search with debouncing
- Persistent filter state across sessions

### User Authentication
- Secure login/signup with Better Auth
- Session-based authentication
- OAuth provider support ready
- Protected routes and API endpoints

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly interfaces
- Optimized performance

## 🗄️ Database Schema

The application uses PostgreSQL with the following main entities:
- **Users** - User accounts and preferences
- **User Preferences** - Favorite genres, actors, and content types
- **User Dislikes** - Content users don't want recommended
- **User People** - Favorite actors and directors

## 🎬 External APIs

### TMDB (The Movie Database)
- Provides movie and TV show metadata
- Poster images and trailers
- Cast and crew information
- Genre classifications

### Google AI
- Powers the recommendation engine
- Analyzes user preferences
- Generates personalized suggestions

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start dev server (checks for existing servers)
npm run dev:force        # Force start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Database
npm run db:generate      # Generate database schema
npm run db:migrate       # Run database migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Drizzle Studio
npm run db:check         # Check database schema

# TypeScript
npm run typecheck        # Run TypeScript type checking
```

## 🎨 UI Components

The application uses shadcn/ui components for a consistent design system:
- **Form Components**: Inputs, selects, checkboxes, radio groups
- **Navigation**: Menus, breadcrumbs, pagination
- **Feedback**: Alerts, toasts, loading states
- **Layout**: Cards, grids, scroll areas
- **Interactive**: Modals, dialogs, tooltips

## 🔐 Security

- Environment-based configuration
- SQL injection protection via Drizzle ORM
- Type-safe API endpoints
- Secure session management
- XSS protection with React's built-in safeguards

## 🚀 Deployment

The application can be deployed to any platform that supports Node.js:

### Environment Setup
1. Set production environment variables
2. Run database migrations
3. Build the application
4. Start the production server

### Docker Support
The application structure supports containerization for easy deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for providing the movie and TV show data
- [Google AI](https://ai.google.dev/) for powering the recommendation engine
- [TanStack](https://tanstack.com/) for the excellent React framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components

---

Built with ❤️ using modern web technologies