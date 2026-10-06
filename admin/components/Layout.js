import Link from "next/link";
import { useRouter } from "next/router";
import { logout } from "../lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/users", label: "Users" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/bookings", label: "Bookings" },
  { href: "/subscriptions", label: "Subscriptions" },
];

export default function Layout({ children }) {
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-800">Taxi Admin</span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                router.pathname === href
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
