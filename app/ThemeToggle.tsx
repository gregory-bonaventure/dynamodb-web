"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const theme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(theme === "dark" || (!theme && prefersDark));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const nowDark = !html.classList.contains("dark");
    html.classList.toggle("dark");
    localStorage.setItem("theme", nowDark ? "dark" : "light");
    setIsDark(nowDark);
  };

  if (!mounted) return null;

  return (
    <button
      className="btn px-3 py-1 text-xs"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
    >
      <span className="inline-block align-middle mr-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-8.66l-.71.71M4.05 4.05l-.71.71m16.97 16.97l-.71-.71M4.05 19.95l-.71-.71M21 12h1M3 12H2m16.24-6.24l-.71.71M6.34 17.66l-.71.71" />
        </svg>
      </span>
      Toggle {isDark ? "Light" : "Dark"} Mode
    </button>
  );
}
