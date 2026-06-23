import { createContext, useContext, useState, useEffect } from "react";

const ThemeCtx = createContext({ dark: false, toggleDark: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [dark]);

  return (
    <ThemeCtx.Provider value={{ dark, toggleDark: () => setDark(d => !d) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
