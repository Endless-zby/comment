"use client";

import { AuthGate } from "./auth-provider";
import { Sidebar } from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-56 min-h-screen">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </AuthGate>
  );
}
