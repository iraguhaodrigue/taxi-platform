import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import { getSubscriptions, isLoggedIn } from "../lib/api";

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "vehicle_id", label: "Vehicle ID" },
  {
    key: "plan",
    label: "Plan",
    render: (v) => (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
        {v}
      </span>
    ),
  },
  { key: "price", label: "Price (RWF)", render: (v) => v?.toLocaleString() },
  {
    key: "start_date",
    label: "Start",
    render: (v) => v ? new Date(v).toLocaleDateString() : "—",
  },
  {
    key: "end_date",
    label: "End",
    render: (v) => v ? new Date(v).toLocaleDateString() : "—",
  },
  {
    key: "is_active",
    label: "Active",
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
        {v ? "Active" : "Expired"}
      </span>
    ),
  },
];

export default function SubscriptionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/"); return; }
    getSubscriptions()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Subscriptions</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <DataTable columns={COLUMNS} rows={rows} loading={loading} />
    </Layout>
  );
}
