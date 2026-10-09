import { Nav } from "@/components/shell/nav";
import { ClientSetup } from "@/components/shell/client-setup";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClientSetup />
      <Nav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:pb-12">{children}</main>
    </>
  );
}
