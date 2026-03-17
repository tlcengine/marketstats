import { SessionProvider } from "@/components/providers/SessionProvider";
import { MetricProvider } from "@/components/providers/MetricProvider";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { MetricBar } from "@/components/layout/MetricBar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <MetricProvider>
        <div className="min-h-screen bg-white">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Mobile top bar */}
          <MobileNav />

          {/* Main content area */}
          <main className="lg:pl-60 pt-14 lg:pt-0 pb-24">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>

          {/* Fixed bottom metric bar */}
          <MetricBar />
        </div>
      </MetricProvider>
    </SessionProvider>
  );
}
