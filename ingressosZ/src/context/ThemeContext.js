import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./theme";
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme)
            return savedTheme;
        if (window.matchMedia("(prefers-color-scheme: dark)").matches)
            return "dark";
        return "light";
    });
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === "dark")
            root.classList.add("dark");
        else
            root.classList.remove("dark");
        localStorage.setItem("theme", theme);
    }, [theme]);
    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    }, []);
    const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
    return _jsx(ThemeContext.Provider, { value: value, children: children });
}
