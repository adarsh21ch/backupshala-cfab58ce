import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <Link to="/" className="inline-flex items-center mb-6">
          <span className="font-heading text-2xl font-800"><span className="text-accent">Backup</span><span className="text-primary">shala</span></span>
        </Link>
        <h1 className="mb-2 font-heading text-6xl font-800 text-muted-foreground/30">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">This page doesn't exist</p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="rounded-md">
            <Link to="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md">
            <Link to="/explore">Explore Courses</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
