# MyFlix

A modern movie and TV streaming platform built with React 19, TypeScript, and TanStack Start. Discover trending movies, explore TV shows, and manage your favorites with a sleek, Netflix-inspired interface.

## 🚀 Tech Stack

### Core Framework

- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **TanStack Start** - Full-stack React framework with SSR
- **Vite** - Lightning-fast build tool

### UI & Styling

- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Modern React component library
- **Lucide React** - Beautiful icon library
- **Radix UI** - Accessible component primitives

### Data & API

- **TMDB API** - The Movie Database for movie/TV data
- **Server Functions** - Server-side data fetching

### Development Tools

- **TypeScript** - Static type checking
- **ESLint** - Code linting
- **Vite Plugin** - Development server and bundling

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Clone and Install

```bash
git clone <repository-url>
cd my-flix
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
VITE_TMDB_BASE_URL=https://api.themoviedb.org/3
```

Get your TMDB API key from [TMDB Developers](https://www.themoviedb.org/settings/api)

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

## 🚀 Deployment

The app is ready for deployment on any platform that supports Node.js:

- **Vercel** (recommended for TanStack Start)
- **Netlify**
- **AWS Amplify**
- **Traditional VPS/Docker**

For production builds, ensure:

1. TMDB API key is configured in environment variables
2. Build runs successfully with `npm run build`
3. Static assets are properly served

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for providing the movie/TV database API
- [TanStack](https://tanstack.com/) for the excellent router and framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

---

**Built with ❤️ for movie and TV enthusiasts**
