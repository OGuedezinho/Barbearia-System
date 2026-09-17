import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />

      <div className="min-h-screen lg:pl-72">
        {children}
      </div>
    </div>
  );
}