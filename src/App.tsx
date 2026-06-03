import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Complaints from "./pages/Complaints";
import MyComplaints from "./pages/MyComplaints";
import Requests from "./pages/Requests";
import Enquiries from "./pages/Enquiries";
import MyEnquiries from "./pages/MyEnquiries";
import Reporting from "./pages/Reporting";
import TrackReport from "./pages/TrackReport";
import Application from "./pages/Application";
import Registration from "./pages/Registration";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/my-complaints" element={<MyComplaints />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/enquiries" element={<Enquiries />} />
            <Route path="/my-enquiries" element={<MyEnquiries />} />
            <Route path="/reporting" element={<Reporting />} />
            <Route path="/track-report" element={<TrackReport />} />
            <Route path="/application" element={<Application />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
