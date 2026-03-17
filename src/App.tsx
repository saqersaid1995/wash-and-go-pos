import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Workflow from "./pages/Workflow.tsx";
import OrderDetails from "./pages/OrderDetails.tsx";
import Customers from "./pages/Customers.tsx";
import CustomerProfile from "./pages/CustomerProfile.tsx";
import Reports from "./pages/Reports.tsx";
import Scanner from "./pages/Scanner.tsx";
import ServicesPricing from "./pages/ServicesPricing.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/order/:orderId" element={<OrderDetails />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customer/:customerId" element={<CustomerProfile />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/scan" element={<Scanner />} />
          <Route path="/services" element={<ServicesPricing />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
