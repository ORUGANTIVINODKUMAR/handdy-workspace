import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./context/ThemeContext";
import ThemeSelector from "./components/layout/ThemeSelector";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import "./styles/themes.css";
import "./styles/professional.css";
import AppShell from "./components/layout/AppShell";
import "./styles/workspace.css";
import "./styles/adminEmployees.css";

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppShell><AppRoutes /></AppShell>
        <ThemeSelector />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
