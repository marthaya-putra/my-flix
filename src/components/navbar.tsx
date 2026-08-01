import { Link, useRouter } from "@tanstack/react-router";
import {
  Bell,
  Bookmark,
  Heart,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { sessionQuery } from "@/lib/data/auth";
import { cn } from "@/lib/utils";
import { SearchModal } from "./search-modal";

const NAV_LINKS = [
  { to: "/" as const, label: "Home" },
  { to: "/movies" as const, label: "Movies" },
  { to: "/tvs" as const, label: "TV Shows" },
  { to: "/recommendations" as const, label: "Recommendations", icon: Sparkles },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  // Session via better-auth's own hook (same one movie-card and
  // recommendations use). Single source of truth; isPending drives the
  // avatar Skeleton during the initial fetch.
  const { data: session, isPending: isFetchingSession } =
    authClient.useSession();
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
        scrolled ? "glass glass-edge" : "scrim-top",
      )}
    >
      <div className="flex items-center justify-between mx-auto">
        <div className="flex items-center gap-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="md:hidden text-foreground hover:text-primary hover:bg-transparent active:scale-95 transition-transform"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 p-0 glass glass-edge border-r border-white/10"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <MobileNavContent
                user={user}
                showSessionSkeleton={showSessionSkeleton}
                onClose={() => setMobileOpen(false)}
                onSignOut={() =>
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        router.options.context.queryClient.invalidateQueries({
                          queryKey: sessionQuery.queryKey,
                        });
                        router.navigate({ to: "/" });
                        setMobileOpen(false);
                      },
                    },
                  })
                }
              />
            </SheetContent>
          </Sheet>
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
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-lg bg-primary/10"
                        transition={{
                          type: "tween" as const,
                          ease: "easeOut" as const,
                          duration: 0.4,
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
            aria-label="Search"
            className="text-foreground hover:text-primary hover:bg-transparent"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="text-foreground hover:text-primary hover:bg-transparent"
          >
            <Bell className="w-5 h-5" />
          </Button>

          {showSessionSkeleton ? (
            <Skeleton className="hidden w-8 h-8 rounded-full bg-muted-foreground/30 md:flex" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="hidden md:flex w-8 h-8 cursor-pointer active:scale-95 transition-transform ring-2 ring-transparent hover:ring-primary/30">
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
                <DropdownMenuItem asChild>
                  <Link
                    to="/watchlist"
                    activeOptions={{ exact: false }}
                    activeProps={{ className: "text-primary" }}
                    inactiveProps={{ className: "text-foreground" }}
                    className="flex items-center w-full cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    <Bookmark className="mr-2 h-4 w-4" />
                    <span>Watchlist</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
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
            <div className="hidden md:flex items-center gap-2">
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

const MOBILE_NAV_EASE = [0.23, 1, 0.32, 1] as const;

type MobileNavContentProps = {
  user?: { name?: string | null; image?: string | null } | null;
  showSessionSkeleton: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

function MobileNavContent({
  user,
  showSessionSkeleton,
  onClose,
  onSignOut,
}: MobileNavContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-4">
        <span className="text-2xl font-display font-bold text-primary tracking-tighter">
          MyFlix
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {NAV_LINKS.map((link, index) => (
            <motion.li
              key={link.to}
              initial={{ opacity: 0, transform: "translateY(8px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{
                duration: 0.2,
                ease: MOBILE_NAV_EASE,
                delay: 0.05 + index * 0.04,
              }}
            >
              <Link
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                onClick={onClose}
              >
                {({ isActive }) => (
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors active:scale-[0.98]",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {"icon" in link && link.icon && (
                      <link.icon className="w-4 h-4" />
                    )}
                    {link.label}
                  </span>
                )}
              </Link>
            </motion.li>
          ))}
        </ul>

        <div className="my-4 h-px bg-white/10" />

        {showSessionSkeleton ? (
          <div className="flex flex-col gap-2 px-3">
            <Skeleton className="h-9 w-full rounded-lg bg-muted-foreground/30" />
            <Skeleton className="h-9 w-full rounded-lg bg-muted-foreground/30" />
          </div>
        ) : user ? (
          <ul className="flex flex-col gap-1">
            <MobileLinkItem
              to="/preferences"
              icon={Heart}
              label="Preferences"
              onClose={onClose}
              index={0}
            />
            <MobileLinkItem
              to="/watchlist"
              icon={Bookmark}
              label="Watchlist"
              onClose={onClose}
              index={1}
            />
          </ul>
        ) : (
          <div className="flex flex-col gap-2 px-2">
            <Button asChild variant="ghost" className="w-full">
              <Link to="/login" onClick={onClose}>
                Sign in
              </Link>
            </Button>
            <Button asChild className="w-full">
              <Link to="/sign-up" onClick={onClose}>
                Sign up
              </Link>
            </Button>
          </div>
        )}
      </nav>

      {user && (
        <div className="border-t border-white/10 p-3">
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </div>
      )}
    </div>
  );
}

type MobileLinkItemProps = {
  to: "/preferences" | "/watchlist";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClose: () => void;
  index: number;
};

function MobileLinkItem({
  to,
  icon: Icon,
  label,
  onClose,
  index,
}: MobileLinkItemProps) {
  return (
    <motion.li
      initial={{ opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{
        duration: 0.2,
        ease: MOBILE_NAV_EASE,
        delay: 0.25 + index * 0.04,
      }}
      className="list-none"
    >
      <Link to={to} activeOptions={{ exact: false }} onClick={onClose}>
        {({ isActive }) => (
          <span
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors active:scale-[0.98]",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-foreground/80 hover:text-foreground hover:bg-muted",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </span>
        )}
      </Link>
    </motion.li>
  );
}
