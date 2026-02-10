import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <div className="text-center relative z-10 space-y-6">
        <div className="text-8xl font-display font-bold text-gradient-primary">404</div>
        <p className="text-xl text-muted-foreground">This page doesn't exist</p>
        <Button asChild variant="outline" className="rounded-full">
          <a href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return Home
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
