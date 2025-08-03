import type { Metadata } from "next";
import { Roboto_Flex } from "next/font/google";
import "./globals.css";
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
      </head>
      <body className={robotoFlex.className + " min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--background)] text-gray-900 flex flex-col"}>
        <div className="flex-1 pt-20 px-4 pb-8 bg-[var(--background)]">
          <div className="max-w-5xl mx-auto">
            <main className="w-full rounded-2xl shadow-xl bg-white/80 border border-gray-200 p-6 md:p-8 backdrop-blur-lg">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
