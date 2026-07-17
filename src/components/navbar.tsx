import { Link, useRouter } from "@tanstack/react-router";
import { sessionQuery } from "@/lib/data/auth";
import {
  Search,
  Bell,
  LogOut,
  Settings,
  User as UserIcon,
  Heart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import SearchModal from "./search-modal";
import { authClient } from "@/lib/auth-client";
import { motion } from "motion/react";

const NAV_LINKS = [
  { to: "/" as const, label: "Home" },
  { to: "/movies" as const, label: "Movies" },
  { to: "/tvs" as const, label: "TV Shows" },
  { to: "/recommendations" as const, label: "Recommendations", icon: Sparkles },
] as const;

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();

  // Session via better-auth's own hook (same one movie-card and
  // recommendations use). Single source of truth; isPending drives the
  // avatar Skeleton during the initial fetch.
  const { data: session, isPending: isFetchingSession } = authClient.useSession();
  const user = session?.user;
  const showSessionSkeleton = isFetchingSession && !user;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "w-full fixed top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300 ease-out px-4 md:px-12 py-4",
        scrolled
          ? "glass glass-edge"
          : "bg-transparent"
      )}
    >
      <div className="flex items-center justify-between mx-auto">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-3xl font-display font-bold text-primary tracking-tighter active:scale-95 transition-transform"
          >
            MyFlix
          </Link>
          <div className="hidden md:flex items-center gap-1 text-sm font-medium relative">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
              >
                {({ isActive }) => (
                  <span
                    className={cn(
                      "relative px-3 py-1.5 rounded-lg transition-colors",
                      isActive
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-lg bg-primary/10"
                        transition={{
                          type: "spring" as const,
                          duration: 0.4,
                          bounce: 0.5,
                        }}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      {"icon" in link && link.icon && (
                        <link.icon className="w-4 h-4" />
                      )}
                      {link.label}
                    </span>
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="text-foreground hover:text-primary hover:bg-transparent"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:text-primary hover:bg-transparent"
          >
            <Bell className="w-5 h-5" />
          </Button>

          {showSessionSkeleton ? (
            <Skeleton className="w-8 h-8 rounded-full bg-muted-foreground/30" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 cursor-pointer active:scale-95 transition-transform ring-2 ring-transparent hover:ring-primary/30">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.name?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 glass text-foreground"
              >
                <DropdownMenuLabel>
                  {user?.name || "My Account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/preferences"
                    activeOptions={{ exact: false }}
                    activeProps={{ className: "text-primary" }}
                    inactiveProps={{ className: "text-foreground" }}
                    className="flex items-center w-full cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    <span>Preferences</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                  onClick={() =>
                    authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          // Session is cached with staleTime: Infinity; drop it
                          // so the next nav re-resolves as logged-out.
                          router.options.context.queryClient.invalidateQueries({
                            queryKey: sessionQuery.queryKey,
                          });
                          router.navigate({ to: "/" });
                        },
                      },
                    })
                  }
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/sign-up">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </nav>
  );
}
