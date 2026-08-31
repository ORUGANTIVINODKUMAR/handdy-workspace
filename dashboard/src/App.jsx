import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./context/ThemeContext";
import ThemeSelector from "./components/layout/ThemeSelector";
import "./styles/themes.css";
import "./styles/professional.css";

function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
      <ThemeSelector />
    </ThemeProvider>
  );
}

export default App;
