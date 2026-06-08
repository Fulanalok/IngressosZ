import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/theme/useTheme";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-pressed={theme === "dark"}
      className="dark-toggle"
      aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}

export default ThemeToggle;
