import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Number */}
        <div className="text-8xl md:text-9xl font-display font-bold text-primary mb-4">
          404
        </div>

        {/* Error Message */}
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-2">
          Page Not Found
        </h1>

        <p className="text-muted-foreground mb-8">
          The content you're looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate({ to: "/" })}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate({ to: "/search" })}
            className="border-border text-foreground hover:bg-accent"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Content
          </Button>
        </div>

        {/* Additional Help Text */}
        <p className="text-sm text-muted-foreground mt-8">
          If you think this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}