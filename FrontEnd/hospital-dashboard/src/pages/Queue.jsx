import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import { getUserEmail, getUserRole } from "../utils/auth";

const initialForm = {
  appointmentId: "",
  patientId: "",
  doctorId: "",
  queueDate: "",
};

const initialFilters = {
  entryId: "",
  patientId: "",
  doctorId: "",
  date: "",
};

function Queue() {
  const userRole = getUserRole();
  const userEmail = getUserEmail();
  const isAdmin = userRole === "ADMIN";
  const isDoctor = userRole === "DOCTOR";
  const isPatient = userRole === "PATIENT";

  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selfPatient, setSelfPatient] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [error, setError] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [message, setMessage] = useState("");

  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const doctorMap = useMemo(
    () => new Map(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors]
  );
  const appointmentMap = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment])),
    [appointments]
  );

  const loadQueue = useCallback(
    async (overrides = {}) => {
      const query = { ...filters, ...overrides };

      setLoading(true);
      setError("");

      try {
        let res;

        if (isPatient) {
          if (!selfPatient?.id) {
            setQueue([]);
            return;
          }

          res = await API.get(`/queue-service/queues/patient/${selfPatient.id}`);
          setQueue(res.data);
          return;
        }

        if (query.entryId) {
          res = await API.get(`/queue-service/queues/${query.entryId}`);
          setQueue([res.data]);
        } else if (query.doctorId && query.date) {
          res = await API.get(
            `/queue-service/queues/doctor/${query.doctorId}/date/${query.date}`
          );
          setQueue(res.data);
        } else if (query.patientId) {
          res = await API.get(`/queue-service/queues/patient/${query.patientId}`);
          setQueue(res.data);
        } else if (query.date) {
          res = await API.get(`/queue-service/queues/date/${query.date}`);
          setQueue(res.data);
        } else {
          res = await API.get("/queue-service/queues");
          setQueue(res.data);
        }
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load queue entries");
        setQueue([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, isPatient, selfPatient?.id]
  );

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const loadReferenceData = useCallback(async () => {
    setReferenceLoading(true);
    setReferenceError("");

    try {
      if (isAdmin) {
        const [appointmentsRes, patientsRes, doctorsRes] = await Promise.all([
          API.get("/appointment-service/appointments"),
          API.get("/patient-service/patients/active"),
          API.get("/doctor-service/doctors/active"),
        ]);

        const allAppointments = Array.isArray(appointmentsRes.data)
          ? appointmentsRes.data
          : [];
        const pendingAppointments = allAppointments.filter(
          (appointment) =>
            !["CANCELLED", "COMPLETED"].includes(
              String(appointment.status || "").toUpperCase()
            )
        );

        setAppointments(pendingAppointments);
        setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
        setDoctors(Array.isArray(doctorsRes.data) ? doctorsRes.data : []);
      } else {
        setAppointments([]);
        setPatients([]);
        setDoctors([]);
      }

      if (isPatient) {
        if (!userEmail) {
          setReferenceError("Unable to resolve account email for patient profile");
          return;
        }

        const selfRes = await API.get("/patient-service/patients/search", {
          params: { keyword: userEmail },
        });

        const fetchedPatients = Array.isArray(selfRes.data) ? selfRes.data : [];
        const matchedPatient =
          fetchedPatients.find(
            (patient) =>
              String(patient.email || "").toLowerCase() === userEmail.toLowerCase()
          ) || fetchedPatients[0];

        if (!matchedPatient) {
          setSelfPatient(null);
          setReferenceError(
            "No patient profile found. Open Appointments page and complete your profile first."
          );
          return;
        }

        setSelfPatient(matchedPatient);
      } else {
        setSelfPatient(null);
      }
    } catch (err) {
      setReferenceError(
        err?.response?.data?.message || "Failed to load form options"
      );
    } finally {
      setReferenceLoading(false);
    }
  }, [isAdmin, isPatient, userEmail]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const handleFormChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAppointmentSelect = (e) => {
    const selectedAppointmentId = e.target.value;
    const appointment = appointmentMap.get(Number(selectedAppointmentId));

    setForm((prev) => ({
      ...prev,
      appointmentId: selectedAppointmentId,
      patientId: appointment?.patientId?.toString() || "",
      doctorId: appointment?.doctorId?.toString() || "",
      queueDate: appointment?.appointmentDate || prev.queueDate,
    }));
  };

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const applyFilters = async (e) => {
    e.preventDefault();
    await loadQueue();
  };

  const clearFilters = async () => {
    setFilters(initialFilters);
    await loadQueue(initialFilters);
  };

  const getPatientDisplay = (patientId) => {
    if (!patientId) {
      return "-";
    }

    const patient = patientMap.get(Number(patientId));
    return patient ? `${patient.fullName} (#${patientId})` : `#${patientId}`;
  };

  const getDoctorDisplay = (doctorId) => {
    if (!doctorId) {
      return "-";
    }

    const doctor = doctorMap.get(Number(doctorId));
    return doctor ? `${doctor.fullName} (#${doctorId})` : `#${doctorId}`;
  };

  const getAppointmentDisplay = (appointment) => {
    const appointmentTime = (appointment.appointmentTime || "").slice(0, 5);
    return `#${appointment.id} | ${getPatientDisplay(appointment.patientId)} | ${getDoctorDisplay(appointment.doctorId)} | ${appointment.appointmentDate} ${appointmentTime}`;
  };

  const createQueueEntry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (!isAdmin) {
        setError("Only ADMIN can create queue entries manually");
        return;
      }

      if (!form.appointmentId || !form.patientId || !form.doctorId || !form.queueDate) {
        setError("Select an appointment to auto-fill patient and doctor");
        return;
      }

      await API.post("/queue-service/queues", {
        appointmentId: Number(form.appointmentId),
        patientId: Number(form.patientId),
        doctorId: Number(form.doctorId),
        queueDate: form.queueDate,
      });

      setForm(initialForm);
      setMessage("Queue entry created successfully");
      await loadReferenceData();
      await loadQueue();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create queue entry");
    } finally {
      setSubmitting(false);
    }
  };

  const callNextPatient = async () => {
    if (!isAdmin && !isDoctor) {
      setError("Only ADMIN or DOCTOR can call next patient");
      return;
    }

    if (!filters.doctorId || !filters.date) {
      setError("Provide doctor ID and date in filters to call next patient");
      return;
    }

    setError("");
    setMessage("");

    try {
      await API.patch(
        `/queue-service/queues/doctor/${filters.doctorId}/date/${filters.date}/next`
      );
      setMessage("Next patient called successfully");
      await loadQueue();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to call next patient");
    }
  };

  const updateQueueStatus = async (id, action) => {
    setError("");
    setMessage("");

    try {
      if (!isAdmin && !isDoctor) {
        setError("Only ADMIN or DOCTOR can update queue status");
        return;
      }

      if (action === "waiting") {
        await API.patch(`/queue-service/queues/${id}/waiting`);
        setMessage(`Queue entry #${id} marked as waiting`);
      }

      if (action === "complete") {
        await API.patch(`/queue-service/queues/${id}/complete`);
        setMessage(`Queue entry #${id} completed`);
      }

      if (action === "cancel") {
        await API.patch(`/queue-service/queues/${id}/cancel`);
        setMessage(`Queue entry #${id} cancelled`);
      }

      await loadQueue();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update queue status");
    }
  };

  return (
    <DashboardLayout title={isPatient ? "My Queue" : "Queue Management"}>
      <div className={`grid gap-6 ${isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        {isAdmin && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xl font-bold">Create Queue Entry</h3>

            <form onSubmit={createQueueEntry} className="space-y-4">
              <select
                name="appointmentId"
                value={form.appointmentId}
                onChange={handleAppointmentSelect}
                required
                disabled={referenceLoading}
              >
                <option value="">Select Appointment</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {getAppointmentDisplay(appointment)}
                  </option>
                ))}
              </select>
              <input
                value={getPatientDisplay(form.patientId)}
                readOnly
                placeholder="Patient"
              />
              <input
                value={getDoctorDisplay(form.doctorId)}
                readOnly
                placeholder="Doctor"
              />
              <input
                name="queueDate"
                type="date"
                value={form.queueDate}
                onChange={handleFormChange}
                required
                min={new Date().toISOString().split("T")[0]}
              />

              {referenceError && (
                <div className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-700">
                  {referenceError}
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

              <button
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Create Queue Entry"}
              </button>
            </form>
          </div>
        )}

        <div className={`rounded-xl bg-white p-6 shadow-sm ${isAdmin ? "lg:col-span-2" : ""}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">{isPatient ? "My Queue List" : "Queue List"}</h3>
            {(isAdmin || isDoctor) && (
              <button
                type="button"
                onClick={callNextPatient}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Call Next (Doctor + Date)
              </button>
            )}
          </div>

          {referenceError && (
            <div className="mb-4 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-700">
              {referenceError}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {!isPatient ? (
            <form onSubmit={applyFilters} className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <input
                name="entryId"
                type="number"
                placeholder="By Entry ID"
                value={filters.entryId}
                onChange={handleFilterChange}
              />
              <input
                name="patientId"
                type="number"
                placeholder="By Patient"
                value={filters.patientId}
                onChange={handleFilterChange}
              />
              <input
                name="doctorId"
                type="number"
                placeholder="By Doctor"
                value={filters.doctorId}
                onChange={handleFilterChange}
              />
              <input name="date" type="date" value={filters.date} onChange={handleFilterChange} />
              <div className="flex gap-2">
                <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900">
                  Filter
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                >
                  Reset
                </button>
              </div>
            </form>
          ) : (
            <p className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Showing your queue details only.
            </p>
          )}

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500">
                    <th className="py-3">ID</th>
                    <th className="py-3">Queue No</th>
                    <th className="py-3">Appointment</th>
                    <th className="py-3">Patient</th>
                    <th className="py-3">Doctor</th>
                    <th className="py-3">Date</th>
                    <th className="py-3">Status</th>
                    {(isAdmin || isDoctor) && <th className="py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3">{item.id}</td>
                      <td className="py-3">{item.queueNumber}</td>
                      <td className="py-3">{item.appointmentId}</td>
                      <td className="py-3">{getPatientDisplay(item.patientId)}</td>
                      <td className="py-3">{getDoctorDisplay(item.doctorId)}</td>
                      <td className="py-3">{item.queueDate}</td>
                      <td className="py-3">{item.status}</td>
                      {(isAdmin || isDoctor) && (
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateQueueStatus(item.id, "waiting")}
                              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              Waiting
                            </button>
                            <button
                              type="button"
                              onClick={() => updateQueueStatus(item.id, "complete")}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => updateQueueStatus(item.id, "cancel")}
                              className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      )}
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

export default Queue;
