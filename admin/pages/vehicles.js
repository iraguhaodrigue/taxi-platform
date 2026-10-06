import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import { getVehicles, isLoggedIn } from "../lib/api";

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "plate_number", label: "Plate" },
  { key: "driver_name", label: "Driver" },
  { key: "driver_phone", label: "Phone" },
  {
    key: "is_available",
    label: "Available",
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
        {v ? "Yes" : "No"}
      </span>
    ),
  },
  {
    key: "is_listed",
    label: "Listed",
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
        {v ? "Listed" : "Unlisted"}
      </span>
    ),
  },
];

export default function VehiclesPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/"); return; }
    getVehicles()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Vehicles</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <DataTable columns={COLUMNS} rows={rows} loading={loading} />
    </Layout>
  );
}
