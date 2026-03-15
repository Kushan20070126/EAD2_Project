import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import DashboardLayout from "../layouts/DashboardLayout";

const DAY_OPTIONS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const normalizeAvailableDays = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((day) => String(day).trim().toUpperCase())
      .filter((day) => DAY_OPTIONS.includes(day));
  }

  return String(value)
    .split(",")
    .map((day) => day.trim().toUpperCase())
    .filter((day) => DAY_OPTIONS.includes(day));
};

const initialForm = {
  fullName: "",
  specialization: "",
  phone: "",
  email: "",
  roomNumber: "",
  availableDays: [],
};

function Doctors() {
  const [doctors, setDoctors] = useState([]);
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

  const loadDoctors = useCallback(
    async (options = {}) => {
      const keyword = options.keyword ?? searchKeyword;
      const activeOnly = options.activeOnly ?? showActiveOnly;

      setLoading(true);
      setError("");

      try {
        let res;

        if (keyword.trim()) {
          res = await API.get("/doctor-service/doctors/search", {
            params: { keyword: keyword.trim() },
          });
        } else if (activeOnly) {
          res = await API.get("/doctor-service/doctors/active");
        } else {
          res = await API.get("/doctor-service/doctors");
        }

        setDoctors(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load doctors");
      } finally {
        setLoading(false);
      }
    },
    [searchKeyword, showActiveOnly]
  );

  useEffect(() => {
    loadDoctors({ keyword: "", activeOnly: false });
  }, [loadDoctors]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const toggleAvailableDay = (day) => {
    setForm((prev) => {
      const exists = prev.availableDays.includes(day);
      const nextDays = exists
        ? prev.availableDays.filter((selectedDay) => selectedDay !== day)
        : [...prev.availableDays, day];

      return {
        ...prev,
        availableDays: nextDays,
      };
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setShowActiveOnly(false);
    await loadDoctors({ keyword: searchKeyword, activeOnly: false });
  };

  const showAllDoctors = async () => {
    setSearchKeyword("");
    setShowActiveOnly(false);
    await loadDoctors({ keyword: "", activeOnly: false });
  };

  const showActiveDoctors = async () => {
    setSearchKeyword("");
    setShowActiveOnly(true);
    await loadDoctors({ keyword: "", activeOnly: true });
  };

  const findDoctorById = async () => {
    if (!lookupId) {
      setError("Enter doctor ID to fetch");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await API.get(`/doctor-service/doctors/${lookupId}`);
      setDoctors([res.data]);
      setShowActiveOnly(false);
      setSearchKeyword("");
    } catch (err) {
      setError(err?.response?.data?.message || "Doctor not found");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const checkDoctorExists = async () => {
    if (!lookupId) {
      setError("Enter doctor ID to check");
      return;
    }

    setError("");
    setMessage("");

    try {
      const res = await API.get(`/doctor-service/doctors/${lookupId}/exists`);
      setMessage(res.data ? `Doctor #${lookupId} exists and is active` : `Doctor #${lookupId} is not active`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to check doctor");
    }
  };

  const saveDoctor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (form.availableDays.length === 0) {
        setError("Select at least one available day");
        return;
      }

      const payload = {
        ...form,
        availableDays: form.availableDays.join(","),
      };

      if (editingId) {
        await API.put(`/doctor-service/doctors/${editingId}`, payload);
        setMessage("Doctor updated successfully");
      } else {
        await API.post("/doctor-service/doctors", payload);
        setMessage("Doctor created successfully");
      }

      resetForm();
      await loadDoctors();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save doctor");
    } finally {
      setSubmitting(false);
    }
  };

  const editDoctor = (doctor) => {
    setEditingId(doctor.id);
    setForm({
      fullName: doctor.fullName || "",
      specialization: doctor.specialization || "",
      phone: doctor.phone || "",
      email: doctor.email || "",
      roomNumber: doctor.roomNumber || "",
      availableDays: normalizeAvailableDays(doctor.availableDays),
    });
    setError("");
    setMessage("");
  };

  const deactivateDoctor = async (id) => {
    const confirmed = window.confirm("Deactivate this doctor?");

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await API.delete(`/doctor-service/doctors/${id}`);
      setMessage("Doctor deactivated successfully");

      if (editingId === id) {
        resetForm();
      }

      await loadDoctors();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to deactivate doctor");
    }
  };

  return (
    <DashboardLayout title="Doctors">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold">
            {editingId ? "Update Doctor" : "Add Doctor"}
          </h3>

          <form onSubmit={saveDoctor} className="space-y-4">
            <input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required />
            <input
              name="specialization"
              placeholder="Specialization"
              value={form.specialization}
              onChange={handleChange}
              required
            />
            <input name="phone" placeholder="Phone (10 digits)" value={form.phone} onChange={handleChange} required />
            <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
            <input name="roomNumber" placeholder="Room Number" value={form.roomNumber} onChange={handleChange} required />
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Available Days</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DAY_OPTIONS.map((day) => {
                  const isSelected = form.availableDays.includes(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleAvailableDay(day)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Selected: {form.availableDays.join(", ") || "None"}
              </p>
            </div>

            {error && <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
            {message && <div className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-700">{message}</div>}

            <button
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingId ? "Update Doctor" : "Save Doctor"}
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
            <h3 className="text-xl font-bold">Doctor List</h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={showAllDoctors}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
              >
                All
              </button>
              <button
                type="button"
                onClick={showActiveDoctors}
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
              placeholder="Search doctors"
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
              placeholder="Doctor ID"
              className="max-w-[140px]"
            />
            <button
              type="button"
              onClick={findDoctorById}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
            >
              Get By ID
            </button>
            <button
              type="button"
              onClick={checkDoctorExists}
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
                    <th className="py-3">Specialization</th>
                    <th className="py-3">Phone</th>
                    <th className="py-3">Available Days</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id} className="border-b">
                      <td className="py-3">{doctor.id}</td>
                      <td className="py-3">{doctor.fullName}</td>
                      <td className="py-3">{doctor.specialization}</td>
                      <td className="py-3">{doctor.phone}</td>
                      <td className="py-3">{doctor.availableDays}</td>
                      <td className="py-3">{doctor.status}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editDoctor(doctor)}
                            className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deactivateDoctor(doctor.id)}
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

export default Doctors;
