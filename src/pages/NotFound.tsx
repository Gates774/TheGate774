import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Helmet>
        <title>Page not found — THE GATE®</title>
        <meta name="description" content="The page you are looking for does not exist on THE GATE®. Return home to continue your civic action." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://thegate774app.lovable.app/404" />
        <meta property="og:title" content="Page not found — THE GATE®" />
        <meta property="og:description" content="The requested page could not be found on THE GATE®." />
        <meta property="og:url" content="https://thegate774app.lovable.app/404" />
      </Helmet>
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
