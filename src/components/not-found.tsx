import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { fadeUpContainer, fadeUpItem } from "@/lib/motion";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        className="text-center max-w-md"
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={fadeUpItem}
          className="text-8xl md:text-9xl font-display font-bold text-primary mb-4"
          style={{ letterSpacing: "-0.04em", lineHeight: 1 }}
        >
          404
        </motion.div>

        <motion.h1
          variants={fadeUpItem}
          className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-2"
        >
          Page Not Found
        </motion.h1>

        <motion.p variants={fadeUpItem} className="text-muted-foreground mb-8">
          The content you're looking for doesn't exist or has been moved.
        </motion.p>

        <motion.div
          variants={fadeUpItem}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => navigate({ to: "/" })}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              navigate({ to: "/movies/search", search: { query: "" } })
            }
            className="border-border text-foreground hover:bg-accent"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Content
          </Button>
        </motion.div>

        <motion.p
          variants={fadeUpItem}
          className="text-sm text-muted-foreground mt-8"
        >
          If you think this is an error, please contact support.
        </motion.p>
      </motion.div>
    </div>
  );
}
