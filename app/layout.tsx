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
      <body className={robotoFlex.className}>
        {children}
      </body>
    </html>
  );
}
