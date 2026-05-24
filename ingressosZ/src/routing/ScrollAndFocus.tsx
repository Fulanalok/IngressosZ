import { useEffect } from "react";
import { useLocation } from "react-router";

export function ScrollAndFocus() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const el = document.getElementById("main-content");
    if (el) el.focus();
  }, [location]);

  return null;
}
