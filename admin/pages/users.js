import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import { getUsers, isLoggedIn } from "../lib/api";

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "full_name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  {
    key: "role",
    label: "Role",
    render: (v) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          v === "admin"
            ? "bg-red-100 text-red-700"
            : v === "driver"
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {v}
      </span>
    ),
  },
];

export default function UsersPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/"); return; }
    getUsers()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Users</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <DataTable columns={COLUMNS} rows={rows} loading={loading} />
    </Layout>
  );
}
