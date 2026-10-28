import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider } from '@/components/SidebarContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export const metadata: Metadata = {
  title: 'BOOKSTACK — Library Management & Book Tracking System',
  description: 'A modern, high-contrast Neo-Brutalist library management web application designed for RDBMS lab projects demonstrating full MySQL relational architecture.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#FFFDF5] text-black" style={{ colorScheme: 'light' }}>
      <body className="bg-[#FFFDF5] text-black min-h-screen selection:bg-[#FFE566] selection:text-black">
        <SidebarProvider>
          <div className="flex min-h-screen bg-[#FFFDF5]">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 lg:pl-64 bg-[#FFFDF5] transition-all">
              <Topbar />
              <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto bg-[#FFFDF5] text-black animate-fade-in">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
