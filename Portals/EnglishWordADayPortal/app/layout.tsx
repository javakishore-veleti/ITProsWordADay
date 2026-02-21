import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IT Pros WordADay — English Vocabulary for IT Professionals",
  description:
    "Learn one powerful English word every day, tailored for cloud computing, software development, DevOps, AI/ML, and professional communication in tech.",
  keywords: [
    "vocabulary",
    "English words",
    "IT professionals",
    "tech vocabulary",
    "professional communication",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <Header />
        <Sidebar />
        <main className="min-h-screen" style={{ paddingTop: "var(--total-header)" }}>
          <div className="px-5 py-8 lg:px-12 xl:px-20 max-w-7xl mx-auto">{children}</div>
        </main>
        <style>{`@media (max-width: 1023px) { main { padding-bottom: 68px; } }`}</style>
      </body>
    </html>
  );
}
