import { Switch, Route, Router } from "wouter";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MapPage from "@/pages/map";
import NotFound from "@/pages/not-found";

function Routes() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <Router base="/geopolygonsapp">
      <TooltipProvider>
        <Toaster />
        <Routes />
      </TooltipProvider>
    </Router>
  );
}

export default App;
