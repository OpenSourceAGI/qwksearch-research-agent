/**
 * @module NotFound
 * @description Renders a 404 page when the user navigates to an unknown route.
 * Logs the attempted path to the console as an error.
 */
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/**
 * Full-page 404 component. Logs the unmatched `location.pathname` and presents
 * a user-friendly error message with a link back to the home route.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
