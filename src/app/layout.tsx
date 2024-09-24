import CustomCursor from "./components/Cursor";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Yusuf Kaplan",
  description: "Portfolio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main>
          {children} <CustomCursor />
        </main>
      </body>
    </html>
  );
}
