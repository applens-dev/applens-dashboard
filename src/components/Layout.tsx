import type { ReactNode } from "react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header />
      {children}
    </div>
  );
}

