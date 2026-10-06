import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { getSummary, isLoggedIn } from "../lib/api";

function StatCard({ label, value, color = "text-green-600" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? "—"}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/"); return; }
    getSummary()
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={summary?.total_users} />
        <StatCard label="Total Vehicles" value={summary?.total_vehicles} />
        <StatCard label="Listed Vehicles" value={summary?.listed_vehicles} color="text-blue-600" />
        <StatCard label="Total Bookings" value={summary?.total_bookings} color="text-purple-600" />
        <StatCard label="Active Subscriptions" value={summary?.active_subscriptions} color="text-orange-500" />
      </div>
    </Layout>
  );
}
