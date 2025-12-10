import { Link, useLocation } from "@tanstack/react-router";
import {
  Search,
  Bell,
  LogOut,
  Settings,
  User as UserIcon,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useAuth } from "@/contexts/auth-context";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

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
        "fixed top-0 z-50 w-full transition-all duration-500 px-4 md:px-12 py-4",
        scrolled
          ? "bg-background/80 backdrop-blur-md shadow-md"
          : "bg-linear-to-b from-black/80 to-transparent"
      )}
    >
      <div className="flex items-center justify-between mx-auto">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-3xl font-display font-bold text-primary tracking-tighter hover:opacity-90 transition-opacity"
          >
            MyFlix
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link
              to="/"
              className={cn(
                "transition-colors",
                location.pathname === "/"
                  ? "text-primary font-semibold"
                  : "text-foreground hover:text-primary"
              )}
            >
              Home
            </Link>
            <Link
              to="/movies"
              className={cn(
                "transition-colors",
                location.pathname === "/movies"
                  ? "text-primary font-semibold"
                  : "text-foreground hover:text-primary"
              )}
            >
              Movies
            </Link>
            <Link
              to="/tvs"
              className={cn(
                "transition-colors",
                location.pathname === "/tvs"
                  ? "text-primary font-semibold"
                  : "text-foreground hover:text-primary"
              )}
            >
              TV Shows
            </Link>
            </div>
        </div>

        <div className="flex items-center gap-4">
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

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 cursor-pointer hover:scale-105 transition-transform border-2 border-transparent hover:border-primary">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-background/95 backdrop-blur border-white/10 text-foreground"
              >
                <DropdownMenuLabel>{user?.name || "My Account"}</DropdownMenuLabel>
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
                    className={cn(
                      "flex items-center w-full cursor-pointer focus:bg-white/10 focus:text-white",
                      location.pathname === "/preferences"
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    <span>Preferences</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                  onClick={signOut}
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
