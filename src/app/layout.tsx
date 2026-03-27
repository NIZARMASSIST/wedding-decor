import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "نظام إدارة تصنيع ديكور الأعراس",
  description: "نظام إدارة المراحل والإنتاج والجدولة الزمنية لتصنيع ديكور الأعراس",
  keywords: ["ديكور أعراس", "تصنيع", "إنتاج", "جدولة", "نجارة", "حدادة", "خياطة"],
  authors: [{ name: "Wedding Decor Team" }],
  openGraph: {
    title: "نظام إدارة تصنيع ديكور الأعراس",
    description: "إدارة المراحل والإنتاج والجدولة الزمنية",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
