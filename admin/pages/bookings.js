import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import { getBookings, isLoggedIn } from "../lib/api";

const STATUS_COLOR = {
  requested: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "passenger_id", label: "Passenger" },
  { key: "vehicle_id", label: "Vehicle" },
  {
    key: "status",
    label: "Status",
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[v] || "bg-gray-100 text-gray-600"}`}>
        {v}
      </span>
    ),
  },
  { key: "estimated_distance_km", label: "Dist (km)" },
  { key: "estimated_time_min", label: "Time (min)" },
  { key: "estimated_fare", label: "Est. Fare" },
  {
    key: "created_at",
    label: "Created",
    render: (v) => v ? new Date(v).toLocaleString() : "—",
  },
];

export default function BookingsPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/"); return; }
    getBookings()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Bookings</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <DataTable columns={COLUMNS} rows={rows} loading={loading} />
    </Layout>
  );
}
