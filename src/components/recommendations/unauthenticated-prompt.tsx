import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "@tanstack/react-router";
import { Film, Tv, Sparkles, ArrowRight } from "lucide-react";

export function UnauthenticatedPrompt() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    router.navigate({ to: "/login" });
  };

  const handleSignUp = () => {
    router.navigate({ to: "/sign-up" });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl mt-8">
      <Card className="text-center">
        <CardHeader className="pb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Get Personalized Movie & TV Recommendations</CardTitle>
          <CardDescription className="text-lg mt-2">
            Discover your next favorite shows with AI-powered recommendations tailored just for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center space-y-3">
              <Film className="h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold">Movie Recommendations</h3>
              <p className="text-sm text-muted-foreground text-center">
                Get personalized movie suggestions based on your tastes
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <Tv className="h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold">TV Series</h3>
              <p className="text-sm text-muted-foreground text-center">
                Find binge-worthy shows matched to your preferences
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold">AI-Powered</h3>
              <p className="text-sm text-muted-foreground text-center">
                Smart recommendations that learn from what you love
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 text-left max-w-md mx-auto">
              <li>1. Sign up for a free account</li>
              <li>2. Tell us about your favorite movies and shows</li>
              <li>3. Get personalized recommendations instantly</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleLogin} className="gap-2">
              Sign In
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={handleSignUp}>
              Create Free Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}