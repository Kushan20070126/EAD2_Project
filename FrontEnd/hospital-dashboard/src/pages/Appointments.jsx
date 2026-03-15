import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import DashboardLayout from "../layouts/DashboardLayout";
import { getUserEmail, getUserRole } from "../utils/auth";

const initialForm = {
  patientId: "",
  doctorId: "",
  appointmentDate: "",
  appointmentTime: "",
  notes: "",
};

const initialFilters = {
  appointmentId: "",
  patientId: "",
  doctorId: "",
  date: "",
};

const initialProfileForm = {
  fullName: "",
  phone: "",
  age: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

function Appointments() {
  const userRole = getUserRole();
  const userEmail = getUserEmail();
  const isAdmin = userRole === "ADMIN";
  const isPatient = userRole === "PATIENT";

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selfPatient, setSelfPatient] = useState(null);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [printingSlipId, setPrintingSlipId] = useState(null);
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

  const normalizeTime = (value) => {
    if (!value) {
      return value;
    }

    return value.includes(":") ? `${value}:00`.slice(0, 8) : value;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const needsPatientProfile = isPatient && !selfPatient;

  const loadAppointments = useCallback(
    async (overrides = {}) => {
      const query = { ...filters, ...overrides };

      setLoading(true);
      setError("");

      try {
        let res;

        if (isPatient) {
          if (!selfPatient?.id) {
            setAppointments([]);
            return;
          }

          res = await API.get(`/appointment-service/appointments/patient/${selfPatient.id}`);
          setAppointments(res.data);
          return;
        }

        if (query.appointmentId) {
          res = await API.get(`/appointment-service/appointments/${query.appointmentId}`);
          setAppointments([res.data]);
        } else if (query.patientId) {
          res = await API.get(`/appointment-service/appointments/patient/${query.patientId}`);
          setAppointments(res.data);
        } else if (query.doctorId) {
          res = await API.get(`/appointment-service/appointments/doctor/${query.doctorId}`);
          setAppointments(res.data);
        } else if (query.date) {
          res = await API.get(`/appointment-service/appointments/date/${query.date}`);
          setAppointments(res.data);
        } else {
          res = await API.get("/appointment-service/appointments");
          setAppointments(res.data);
        }
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load appointments");
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, isPatient, selfPatient?.id]
  );

  const loadReferenceData = useCallback(async () => {
    setReferenceLoading(true);
    setReferenceError("");

    try {
      if (isPatient && !userEmail) {
        setReferenceError("Unable to resolve account email for patient profile");
        return;
      }

      const doctorPromise = API.get("/doctor-service/doctors/active");
      const patientPromise = isAdmin
        ? API.get("/patient-service/patients/active")
        : isPatient
          ? API.get("/patient-service/patients/search", {
              params: { keyword: userEmail },
            })
          : Promise.resolve({ data: [] });

      const [patientsRes, doctorsRes] = await Promise.all([
        patientPromise,
        doctorPromise,
      ]);

      const fetchedPatients = Array.isArray(patientsRes.data) ? patientsRes.data : [];
      setDoctors(Array.isArray(doctorsRes.data) ? doctorsRes.data : []);

      if (isPatient) {
        const matchedPatient =
          fetchedPatients.find(
            (patient) =>
              String(patient.email || "").toLowerCase() === userEmail.toLowerCase()
          ) || fetchedPatients[0];

        if (!matchedPatient) {
          setPatients([]);
          setSelfPatient(null);
          setReferenceError("No patient profile found for this account email");
          return;
        }

        setSelfPatient(matchedPatient);
        setPatients([matchedPatient]);
        setForm((prev) => ({
          ...prev,
          patientId: matchedPatient.id?.toString() || "",
        }));
      } else {
        setPatients(fetchedPatients);
        setSelfPatient(null);
      }
    } catch (err) {
      setReferenceError(
        err?.response?.data?.message || "Failed to load patient/doctor options"
      );
    } finally {
      setReferenceLoading(false);
    }
  }, [isAdmin, isPatient, userEmail]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const handleFormChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleProfileChange = (e) => {
    setProfileForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const applyFilters = async (e) => {
    e.preventDefault();
    await loadAppointments();
  };

  const clearFilters = async () => {
    setFilters(initialFilters);
    await loadAppointments(initialFilters);
  };

  const createPatientProfile = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (!userEmail) {
        setError("Account email is missing. Please logout and login again.");
        return;
      }

      await API.post("/patient-service/patients", {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        email: userEmail,
        age: Number(profileForm.age),
        gender: profileForm.gender,
        address: profileForm.address,
        emergencyContactName: profileForm.emergencyContactName,
        emergencyContactPhone: profileForm.emergencyContactPhone,
      });

      setMessage("Patient profile created successfully. You can now book appointments.");
      setReferenceError("");
      await loadReferenceData();
      await loadAppointments();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create patient profile");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(
      isPatient && selfPatient?.id
        ? { ...initialForm, patientId: String(selfPatient.id) }
        : initialForm
    );
    setEditingId(null);
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
    return doctor
      ? `${doctor.fullName} (${doctor.specialization}) (#${doctorId})`
      : `#${doctorId}`;
  };

  const getPatientName = (patientId) => {
    const patient = patientMap.get(Number(patientId));
    return patient?.fullName || `Patient #${patientId}`;
  };

  const getDoctorName = (doctorId) => {
    const doctor = doctorMap.get(Number(doctorId));
    return doctor?.fullName || `Doctor #${doctorId}`;
  };

  const fetchQueueEntryByAppointmentId = async (appointmentId, attempts = 8, delayMs = 400) => {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const res = await API.get(`/queue-service/queues/appointment/${appointmentId}`);
        return res.data;
      } catch (err) {
        if (err?.response?.status === 404 && attempt < attempts) {
          await sleep(delayMs);
          continue;
        }
        throw err;
      }
    }

    return null;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const openPrintWindow = (html) =>
    new Promise((resolve, reject) => {
      const printWindow = window.open("", "_blank", "width=430,height=680");

      if (!printWindow) {
        reject(new Error("Popup blocked. Please allow popups to print the slip."));
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        resolve();
      }, 250);
    });

  const printAppointmentSlip = async (appointment, queueEntry) => {
    const patientName = getPatientName(appointment.patientId);
    const doctorName = getDoctorName(appointment.doctorId);
    const appointmentTime = String(appointment.appointmentTime || "").slice(0, 5);
    const printedAt = new Date().toLocaleString();

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Appointment Slip #${escapeHtml(appointment.id)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #111827; }
            .slip { max-width: 340px; margin: 0 auto; border: 1px dashed #334155; border-radius: 12px; padding: 16px; }
            .title { text-align: center; font-weight: 700; font-size: 18px; margin-bottom: 12px; }
            .queue { text-align: center; background: #eff6ff; color: #1d4ed8; border-radius: 10px; padding: 12px; margin-bottom: 14px; }
            .queue small { display: block; color: #475569; font-size: 11px; margin-top: 4px; }
            .row { margin-bottom: 8px; font-size: 13px; }
            .label { color: #475569; font-weight: 600; display: inline-block; width: 116px; }
            .footer { margin-top: 14px; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="title">Appointment Slip</div>
            <div class="queue">
              <div style="font-size:12px;">Queue Number</div>
              <div style="font-size:34px; font-weight:700;">${escapeHtml(queueEntry.queueNumber)}</div>
              <small>Queue Entry ID: ${escapeHtml(queueEntry.id)}</small>
            </div>
            <div class="row"><span class="label">Appointment ID:</span>${escapeHtml(appointment.id)}</div>
            <div class="row"><span class="label">Patient:</span>${escapeHtml(patientName)}</div>
            <div class="row"><span class="label">Doctor:</span>${escapeHtml(doctorName)}</div>
            <div class="row"><span class="label">Date:</span>${escapeHtml(appointment.appointmentDate)}</div>
            <div class="row"><span class="label">Time:</span>${escapeHtml(appointmentTime || "-")}</div>
            <div class="row"><span class="label">Status:</span>${escapeHtml(appointment.status || "CONFIRMED")}</div>
            <div class="footer">Printed: ${escapeHtml(printedAt)}</div>
          </div>
        </body>
      </html>
    `;

    await openPrintWindow(html);
  };

  const printSlipForAppointment = async (appointment, attempts = 1) => {
    setPrintingSlipId(appointment.id);
    setError("");

    try {
      const queueEntry = await fetchQueueEntryByAppointmentId(appointment.id, attempts);
      if (!queueEntry) {
        throw new Error("Queue entry is not ready yet");
      }

      await printAppointmentSlip(appointment, queueEntry);
      setMessage(`Slip opened with queue #${queueEntry.queueNumber}.`);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Appointment created but failed to print slip"
      );
    } finally {
      setPrintingSlipId(null);
    }
  };

  const saveAppointment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      let createdAppointment = null;
      const selectedPatientId = isPatient ? selfPatient?.id : Number(form.patientId);

      if (!selectedPatientId) {
        setError("Patient profile not found for this account");
        return;
      }

      const payload = {
        patientId: Number(selectedPatientId),
        doctorId: Number(form.doctorId),
        appointmentDate: form.appointmentDate,
        appointmentTime: normalizeTime(form.appointmentTime),
        notes: form.notes,
      };

      if (editingId) {
        await API.put(`/appointment-service/appointments/${editingId}`, payload);
        setMessage("Appointment updated successfully");
      } else {
        const res = await API.post("/appointment-service/appointments", payload);
        createdAppointment = res.data;
        setMessage("Appointment created successfully");
      }

      resetForm();
      await loadAppointments();

      if (createdAppointment?.id) {
        await printSlipForAppointment(createdAppointment, 8);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const editAppointment = (item) => {
    setEditingId(item.id);
    setForm({
      patientId: item.patientId?.toString() || "",
      doctorId: item.doctorId?.toString() || "",
      appointmentDate: item.appointmentDate || "",
      appointmentTime: (item.appointmentTime || "").slice(0, 5),
      notes: item.notes || "",
    });
    setMessage("");
    setError("");
  };

  const updateStatus = async (id, action) => {
    setError("");
    setMessage("");

    try {
      if (action === "confirm") {
        await API.patch(`/appointment-service/appointments/${id}/confirm`);
        setMessage(`Appointment #${id} confirmed`);
      }

      if (action === "complete") {
        await API.patch(`/appointment-service/appointments/${id}/complete`);
        setMessage(`Appointment #${id} completed`);
      }

      if (action === "cancel") {
        await API.delete(`/appointment-service/appointments/${id}`);
        setMessage(`Appointment #${id} cancelled`);
      }

      await loadAppointments();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update appointment status");
    }
  };

  return (
    <DashboardLayout title={isPatient ? "My Appointments" : "Appointments"}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold">
            {needsPatientProfile
              ? "Complete Patient Profile"
              : editingId
                ? "Update Appointment"
                : "Book Appointment"}
          </h3>

          {needsPatientProfile ? (
            <form onSubmit={createPatientProfile} className="space-y-4">
              <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                First login setup: create your patient profile once to access appointments and queue details.
              </p>
              <input
                name="fullName"
                placeholder="Full Name"
                value={profileForm.fullName}
                onChange={handleProfileChange}
                required
              />
              <input
                name="phone"
                placeholder="Phone (10 digits)"
                value={profileForm.phone}
                onChange={handleProfileChange}
                required
                pattern="[0-9]{10}"
                maxLength={10}
              />
              <input
                name="age"
                type="number"
                placeholder="Age"
                value={profileForm.age}
                onChange={handleProfileChange}
                required
                min={0}
                max={130}
              />
              <select
                name="gender"
                value={profileForm.gender}
                onChange={handleProfileChange}
                required
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                name="address"
                placeholder="Address"
                value={profileForm.address}
                onChange={handleProfileChange}
                required
              />
              <input
                name="emergencyContactName"
                placeholder="Emergency Contact Name"
                value={profileForm.emergencyContactName}
                onChange={handleProfileChange}
                required
              />
              <input
                name="emergencyContactPhone"
                placeholder="Emergency Contact Phone (10 digits)"
                value={profileForm.emergencyContactPhone}
                onChange={handleProfileChange}
                required
                pattern="[0-9]{10}"
                maxLength={10}
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
                disabled={profileSubmitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {profileSubmitting ? "Saving Profile..." : "Create Patient Profile"}
              </button>
            </form>
          ) : (
            <form onSubmit={saveAppointment} className="space-y-4">
              {isAdmin ? (
                <select
                  name="patientId"
                  value={form.patientId}
                  onChange={handleFormChange}
                  required
                  disabled={referenceLoading}
                >
                  <option value="">Select Patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName} (ID: {patient.id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={selfPatient ? `${selfPatient.fullName} (ID: ${selfPatient.id})` : ""}
                  placeholder="Your patient profile"
                  readOnly
                  required
                />
              )}
              <select
                name="doctorId"
                value={form.doctorId}
                onChange={handleFormChange}
                required
                disabled={referenceLoading}
              >
                <option value="">Select Doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.fullName} - {doctor.specialization} (ID: {doctor.id})
                  </option>
                ))}
              </select>
              <input
                name="appointmentDate"
                type="date"
                value={form.appointmentDate}
                onChange={handleFormChange}
                required
                min={new Date().toISOString().split("T")[0]}
              />
              <input
                name="appointmentTime"
                type="time"
                value={form.appointmentTime}
                onChange={handleFormChange}
                required
              />
              <textarea
                name="notes"
                placeholder="Notes"
                value={form.notes}
                onChange={handleFormChange}
                rows="4"
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
                {submitting ? "Saving..." : editingId ? "Update Appointment" : "Save Appointment"}
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
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-xl font-bold">
            {isPatient ? "My Appointment List" : "Appointment List"}
          </h3>

          {isAdmin ? (
            <form onSubmit={applyFilters} className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <input
                name="appointmentId"
                type="number"
                placeholder="By ID"
                value={filters.appointmentId}
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
              Showing your appointment details only.
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
                    <th className="py-3">Patient</th>
                    <th className="py-3">Doctor</th>
                    <th className="py-3">Date</th>
                    <th className="py-3">Time</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3">{item.id}</td>
                      <td className="py-3">{getPatientDisplay(item.patientId)}</td>
                      <td className="py-3">{getDoctorDisplay(item.doctorId)}</td>
                      <td className="py-3">{item.appointmentDate}</td>
                      <td className="py-3">{item.appointmentTime}</td>
                      <td className="py-3">{item.status}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => printSlipForAppointment(item, 2)}
                            disabled={printingSlipId === item.id}
                            className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                          >
                            {printingSlipId === item.id ? "Printing..." : "Print Slip"}
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => editAppointment(item)}
                                className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(item.id, "confirm")}
                                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(item.id, "complete")}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(item.id, "cancel")}
                                className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                              >
                                Cancel
                              </button>
                            </>
                          )}
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

export default Appointments;
