import {
  useEffect,
  useState,
} from "react";
import { ThemeContext, themes } from "./themeContextInstance";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("app-theme");

    // "upsilon" was the old automatic default, never a deliberate
    // pick, so treat it the same as no saved theme and move
    // everyone forward to the new default instead of stranding
    // existing sessions on it.
    if (!savedTheme || savedTheme === "upsilon") {
      return "console";
    }

    const isValidTheme = themes.some(
      (item) => item.id === savedTheme
    );

    return isValidTheme ? savedTheme : "console";
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const changeTheme = (themeId) => {
    const isValidTheme = themes.some(
      (item) => item.id === themeId
    );

    if (!isValidTheme) {
      return;
    }

    setTheme(themeId);
  };

  const currentTheme =
    themes.find((item) => item.id === theme) ||
    themes[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentTheme,
        changeTheme,
        themes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
