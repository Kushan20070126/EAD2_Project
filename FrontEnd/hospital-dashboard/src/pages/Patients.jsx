import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import DashboardLayout from "../layouts/DashboardLayout";

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  age: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const loadPatients = useCallback(
    async (options = {}) => {
      const keyword = options.keyword ?? searchKeyword;
      const activeOnly = options.activeOnly ?? showActiveOnly;

      setLoading(true);
      setError("");

      try {
        let res;

        if (keyword.trim()) {
          res = await API.get("/patient-service/patients/search", {
            params: { keyword: keyword.trim() },
          });
        } else if (activeOnly) {
          res = await API.get("/patient-service/patients/active");
        } else {
          res = await API.get("/patient-service/patients");
        }

        setPatients(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load patients");
      } finally {
        setLoading(false);
      }
    },
    [searchKeyword, showActiveOnly]
  );

  useEffect(() => {
    loadPatients({ keyword: "", activeOnly: false });
  }, [loadPatients]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setShowActiveOnly(false);
    await loadPatients({ keyword: searchKeyword, activeOnly: false });
  };

  const showAllPatients = async () => {
    setSearchKeyword("");
    setShowActiveOnly(false);
    await loadPatients({ keyword: "", activeOnly: false });
  };

  const showActivePatients = async () => {
    setSearchKeyword("");
    setShowActiveOnly(true);
    await loadPatients({ keyword: "", activeOnly: true });
  };

  const findPatientById = async () => {
    if (!lookupId) {
      setError("Enter patient ID to fetch");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await API.get(`/patient-service/patients/${lookupId}`);
      setPatients([res.data]);
      setShowActiveOnly(false);
      setSearchKeyword("");
    } catch (err) {
      setError(err?.response?.data?.message || "Patient not found");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const checkPatientExists = async () => {
    if (!lookupId) {
      setError("Enter patient ID to check");
      return;
    }

    setError("");
    setMessage("");

    try {
      const res = await API.get(`/patient-service/patients/${lookupId}/exists`);
      setMessage(res.data ? `Patient #${lookupId} exists and is active` : `Patient #${lookupId} is not active`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to check patient");
    }
  };

  const savePatient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...form,
        age: Number(form.age),
      };

      if (editingId) {
        await API.put(`/patient-service/patients/${editingId}`, payload);
        setMessage("Patient updated successfully");
      } else {
        await API.post("/patient-service/patients", payload);
        setMessage("Patient created successfully");
      }

      resetForm();
      await loadPatients();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save patient");
    } finally {
      setSubmitting(false);
    }
  };

  const editPatient = (patient) => {
    setEditingId(patient.id);
    setForm({
      fullName: patient.fullName || "",
      phone: patient.phone || "",
      email: patient.email || "",
      age: patient.age?.toString() || "",
      gender: patient.gender || "",
      address: patient.address || "",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
    });
    setMessage("");
    setError("");
  };

  const deactivatePatient = async (id) => {
    const confirmed = window.confirm("Deactivate this patient?");

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await API.delete(`/patient-service/patients/${id}`);
      setMessage("Patient deactivated successfully");

      if (editingId === id) {
        resetForm();
      }

      await loadPatients();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to deactivate patient");
    }
  };

  return (
    <DashboardLayout title="Patients">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-xl font-bold">
            {editingId ? "Update Patient" : "Add Patient"}
          </h3>

          <form onSubmit={savePatient} className="space-y-4">
            <input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required />
            <input name="phone" placeholder="Phone (10 digits)" value={form.phone} onChange={handleChange} required />
            <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
            <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} required />
            <input name="gender" placeholder="Gender" value={form.gender} onChange={handleChange} required />
            <input name="address" placeholder="Address" value={form.address} onChange={handleChange} required />
            <input
              name="emergencyContactName"
              placeholder="Emergency Contact Name"
              value={form.emergencyContactName}
              onChange={handleChange}
              required
            />
            <input
              name="emergencyContactPhone"
              placeholder="Emergency Contact Phone"
              value={form.emergencyContactPhone}
              onChange={handleChange}
              required
            />

            {error && <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
            {message && <div className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-700">{message}</div>}

            <button
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingId ? "Update Patient" : "Save Patient"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold">Patient List</h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={showAllPatients}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
              >
                All
              </button>
              <button
                type="button"
                onClick={showActivePatients}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Active
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search patients"
            />
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
              Search
            </button>
          </form>

          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="number"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Patient ID"
              className="max-w-[140px]"
            />
            <button
              type="button"
              onClick={findPatientById}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
            >
              Get By ID
            </button>
            <button
              type="button"
              onClick={checkPatientExists}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
            >
              Check Exists
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500">
                    <th className="py-3">ID</th>
                    <th className="py-3">Name</th>
                    <th className="py-3">Phone</th>
                    <th className="py-3">Age</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="border-b">
                      <td className="py-3">{patient.id}</td>
                      <td className="py-3">{patient.fullName}</td>
                      <td className="py-3">{patient.phone}</td>
                      <td className="py-3">{patient.age}</td>
                      <td className="py-3">{patient.status}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editPatient(patient)}
                            className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deactivatePatient(patient.id)}
                            className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Patients;
