export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full min-h-screen flex flex-col">{children}</div>;
}
