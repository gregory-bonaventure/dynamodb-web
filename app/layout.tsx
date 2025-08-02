import type { Metadata } from "next";
import { Roboto_Flex } from "next/font/google";
import "./globals.css";
import ThemeToggle from "./ThemeToggle";

const robotoFlex = Roboto_Flex({ subsets: ["latin"], display: 'swap' });

export const metadata: Metadata = {
  title: "DynamoDash",
  description: "A modern web interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:wght@100..1000&family=Limelight&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();
          `
        }} />
      </head>
      <body className={robotoFlex.className + " min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--background)] dark:from-[var(--background)] dark:to-[var(--background)] text-gray-900 dark:text-gray-100 transition-colors duration-500"}>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--background)] dark:bg-[var(--background)] transition-colors duration-500">
          <main className="w-full max-w-5xl rounded-2xl shadow-xl bg-white/80 dark:bg-[#181a20]/80 border border-gray-200 dark:border-gray-800 p-6 md:p-10 mt-8 mb-8 backdrop-blur-lg">
            <div className='w-full flex justify-end mb-2'>
              <ThemeToggle />
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
