import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import DashboardLayout from "../layouts/DashboardLayout";

const toArray = (value) => (Array.isArray(value) ? value : []);
const toDateOnly = (value) => String(value || "").slice(0, 10);
const toTimeOnly = (value) => String(value || "").slice(0, 5);
const upper = (value) => String(value || "").trim().toUpperCase();

const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatStatus = (status) => {
  if (!status) {
    return "UNKNOWN";
  }

  return upper(status).replaceAll("_", " ");
};

function Dashboard() {
  const today = useMemo(() => getLocalToday(), []);

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [dashboardDate, setDashboardDate] = useState(today);
  const [datePinned, setDatePinned] = useState(false);

  const [reportType, setReportType] = useState("daily");
  const [reportDate, setReportDate] = useState(today);
  const [reportText, setReportText] = useState("");
  const [reportMessage, setReportMessage] = useState("");

  const doctorMap = useMemo(
    () => new Map(doctors.map((doctor) => [Number(doctor.id), doctor])),
    [doctors]
  );
  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [Number(patient.id), patient])),
    [patients]
  );

  const loadDashboardData = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [patientsRes, doctorsRes, appointmentsRes, queueRes] = await Promise.all([
        API.get("/patient-service/patients"),
        API.get("/doctor-service/doctors"),
        API.get("/appointment-service/appointments"),
        API.get("/queue-service/queues"),
      ]);

      setPatients(toArray(patientsRes.data));
      setDoctors(toArray(doctorsRes.data));
      setAppointments(toArray(appointmentsRes.data));
      setQueueEntries(toArray(queueRes.data));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const latestDataDate = useMemo(() => {
    const dates = [
      ...appointments.map((item) => toDateOnly(item.appointmentDate)),
      ...queueEntries.map((item) => toDateOnly(item.queueDate)),
    ].filter(Boolean);

    if (!dates.length) {
      return today;
    }

    return dates.sort((a, b) => a.localeCompare(b))[dates.length - 1];
  }, [appointments, queueEntries, today]);

  useEffect(() => {
    if (!datePinned) {
      setDashboardDate(latestDataDate);
      setReportDate(latestDataDate);
    }
  }, [datePinned, latestDataDate]);

  const selectedAppointments = useMemo(
    () =>
      appointments.filter(
        (item) => toDateOnly(item.appointmentDate) === dashboardDate
      ),
    [appointments, dashboardDate]
  );

  const selectedQueue = useMemo(
    () =>
      queueEntries.filter((item) => toDateOnly(item.queueDate) === dashboardDate),
    [dashboardDate, queueEntries]
  );

  const waitingQueueCount = useMemo(
    () => selectedQueue.filter((item) => upper(item.status) === "WAITING").length,
    [selectedQueue]
  );
  const calledQueueCount = useMemo(
    () => selectedQueue.filter((item) => upper(item.status) === "CALLED").length,
    [selectedQueue]
  );
  const completedQueueCount = useMemo(
    () => selectedQueue.filter((item) => upper(item.status) === "COMPLETED").length,
    [selectedQueue]
  );

  const busiestDoctor = useMemo(() => {
    const countByDoctor = new Map();

    selectedAppointments.forEach((appointment) => {
      const doctorId = Number(appointment.doctorId);
      countByDoctor.set(doctorId, (countByDoctor.get(doctorId) || 0) + 1);
    });

    let topDoctorId = null;
    let topCount = 0;

    countByDoctor.forEach((count, doctorId) => {
      if (count > topCount) {
        topCount = count;
        topDoctorId = doctorId;
      }
    });

    if (!topDoctorId) {
      return { doctorName: "-", count: 0 };
    }

    const doctor = doctorMap.get(topDoctorId);
    return {
      doctorName: doctor?.fullName || `Doctor #${topDoctorId}`,
      count: topCount,
    };
  }, [doctorMap, selectedAppointments]);

  const statusBreakdown = useMemo(() => {
    const statusCounts = {
      WAITING: 0,
      CALLED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      OTHER: 0,
    };

    selectedQueue.forEach((entry) => {
      const status = upper(entry.status);
      if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
        statusCounts[status] += 1;
      } else {
        statusCounts.OTHER += 1;
      }
    });

    const total = selectedQueue.length || 1;
    return [
      {
        label: "WAITING",
        value: statusCounts.WAITING,
        percentage: Math.round((statusCounts.WAITING / total) * 100),
        color: "bg-amber-500",
      },
      {
        label: "CALLED",
        value: statusCounts.CALLED,
        percentage: Math.round((statusCounts.CALLED / total) * 100),
        color: "bg-blue-500",
      },
      {
        label: "COMPLETED",
        value: statusCounts.COMPLETED,
        percentage: Math.round((statusCounts.COMPLETED / total) * 100),
        color: "bg-emerald-500",
      },
      {
        label: "CANCELLED",
        value: statusCounts.CANCELLED,
        percentage: Math.round((statusCounts.CANCELLED / total) * 100),
        color: "bg-rose-500",
      },
    ];
  }, [selectedQueue]);

  const metricCards = useMemo(
    () => [
      {
        label: "Total Patients",
        value: patients.length,
        helper: "From patient-service",
        accent: "from-cyan-500 to-sky-600",
      },
      {
        label: "Total Doctors",
        value: doctors.length,
        helper: "From doctor-service",
        accent: "from-indigo-500 to-blue-700",
      },
      {
        label: "Total Appointments",
        value: appointments.length,
        helper: "All dates",
        accent: "from-violet-500 to-fuchsia-600",
      },
      {
        label: "Total Queue Entries",
        value: queueEntries.length,
        helper: "All dates",
        accent: "from-amber-500 to-orange-600",
      },
      {
        label: `Appointments (${dashboardDate})`,
        value: selectedAppointments.length,
        helper: "Selected date",
        accent: "from-emerald-500 to-green-600",
      },
      {
        label: `Queue Waiting (${dashboardDate})`,
        value: waitingQueueCount,
        helper: "Selected date",
        accent: "from-rose-500 to-red-600",
      },
    ],
    [
      appointments.length,
      dashboardDate,
      doctors.length,
      patients.length,
      queueEntries.length,
      selectedAppointments.length,
      waitingQueueCount,
    ]
  );

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(
        (item) =>
          !["CANCELLED", "COMPLETED"].includes(upper(item.status)) &&
          toDateOnly(item.appointmentDate) >= today
      )
      .sort((a, b) => {
        const dateA = `${toDateOnly(a.appointmentDate)}T${String(a.appointmentTime || "00:00:00")}`;
        const dateB = `${toDateOnly(b.appointmentDate)}T${String(b.appointmentTime || "00:00:00")}`;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })
      .slice(0, 8);
  }, [appointments, today]);

  const buildReportText = useCallback(() => {
    const selectedAppointmentsForReport = appointments.filter(
      (item) => toDateOnly(item.appointmentDate) === reportDate
    );
    const selectedQueueForReport = queueEntries.filter(
      (item) => toDateOnly(item.queueDate) === reportDate
    );

    const queueStatusCounts = selectedQueueForReport.reduce((acc, item) => {
      const status = upper(item.status) || "UNKNOWN";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const doctorLoads = selectedAppointmentsForReport.reduce((acc, item) => {
      const doctorId = Number(item.doctorId);
      acc[doctorId] = (acc[doctorId] || 0) + 1;
      return acc;
    }, {});

    const header = [
      "MediCink - Operational Report",
      `Generated At: ${new Date().toLocaleString()}`,
      `Report Type: ${reportType.toUpperCase()}`,
      `Report Date: ${reportDate}`,
      "",
    ];

    if (reportType === "daily") {
      return [
        ...header,
        "SUMMARY",
        `Total Patients: ${patients.length}`,
        `Total Doctors: ${doctors.length}`,
        `Appointments On Date: ${selectedAppointmentsForReport.length}`,
        `Queue Entries On Date: ${selectedQueueForReport.length}`,
        "",
        "QUEUE STATUS",
        `WAITING: ${queueStatusCounts.WAITING || 0}`,
        `CALLED: ${queueStatusCounts.CALLED || 0}`,
        `COMPLETED: ${queueStatusCounts.COMPLETED || 0}`,
        `CANCELLED: ${queueStatusCounts.CANCELLED || 0}`,
      ].join("\n");
    }

    if (reportType === "queue") {
      const lines = [...header, "QUEUE ENTRIES"];

      if (!selectedQueueForReport.length) {
        lines.push("No queue entries for selected date.");
      } else {
        selectedQueueForReport
          .sort((a, b) => (Number(a.queueNumber) || 0) - (Number(b.queueNumber) || 0))
          .forEach((entry) => {
            const patient = patientMap.get(Number(entry.patientId));
            const doctor = doctorMap.get(Number(entry.doctorId));
            lines.push(
              `#${entry.id} | Queue ${entry.queueNumber} | Patient: ${patient?.fullName || `#${entry.patientId}`} | Doctor: ${doctor?.fullName || `#${entry.doctorId}`} | Status: ${formatStatus(entry.status)}`
            );
          });
      }

      return lines.join("\n");
    }

    const doctorLoadRows = Object.entries(doctorLoads)
      .map(([doctorId, count]) => {
        const doctor = doctorMap.get(Number(doctorId));
        return {
          doctorName: doctor?.fullName || `Doctor #${doctorId}`,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    return [
      ...header,
      "DOCTOR UTILIZATION",
      `Doctors With Appointments: ${doctorLoadRows.length}`,
      "",
      ...(
        doctorLoadRows.length
          ? doctorLoadRows.map(
              (row) => `${row.doctorName}: ${row.count} appointment(s)`
            )
          : ["No appointment load for selected date."]
      ),
    ].join("\n");
  }, [
    appointments,
    doctorMap,
    doctors.length,
    patientMap,
    patients.length,
    queueEntries,
    reportDate,
    reportType,
  ]);

  const generateReport = () => {
    setReportMessage("");
    const nextText = buildReportText();
    setReportText(nextText);
    setReportMessage("Report generated.");
  };

  const downloadReportPdf = async () => {
    if (!reportText) {
      setReportMessage("Generate a report first.");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const fileName = `admin-report-${reportType}-${reportDate}.pdf`;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const lineHeight = 14;

    let y = margin;
    doc.setFont("courier", "normal");
    doc.setFontSize(10);

    reportText.split("\n").forEach((line) => {
      const wrappedLines = doc.splitTextToSize(line || " ", pageWidth - margin * 2);

      wrappedLines.forEach((wrappedLine) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        doc.text(wrappedLine, margin, y);
        y += lineHeight;
      });
    });

    doc.save(fileName);
    setReportMessage(`Downloaded ${fileName}`);
  };

  const copyReport = async () => {
    if (!reportText) {
      setReportMessage("Generate a report first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(reportText);
      setReportMessage("Report copied to clipboard.");
    } catch {
      setReportMessage("Clipboard copy failed.");
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Dashboard Date</p>
              <h3 className="text-xl font-bold text-slate-800">{dashboardDate}</h3>
              <p className="text-xs text-slate-500">
                Today: {today} | Latest data date: {latestDataDate}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dashboardDate}
                onChange={(e) => {
                  setDashboardDate(e.target.value);
                  setDatePinned(true);
                }}
                className="max-w-[170px]"
              />
              <button
                type="button"
                onClick={() => {
                  setDatePinned(false);
                  setDashboardDate(latestDataDate);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Use Latest
              </button>
              <button
                type="button"
                onClick={() => loadDashboardData(true)}
                disabled={refreshing || loading}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => (
            <div key={card.label} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className={`h-1.5 w-full bg-gradient-to-r ${card.accent}`} />
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                Queue Flow ({dashboardDate})
              </h3>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                Total: {selectedQueue.length}
              </span>
            </div>
            <div className="space-y-3">
              {statusBreakdown.map((status) => (
                <div key={status.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{status.label}</span>
                    <span className="text-slate-500">
                      {status.value} ({status.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${status.color}`}
                      style={{ width: `${status.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Waiting</p>
                <p className="text-2xl font-bold text-amber-800">{waitingQueueCount}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-700">Called</p>
                <p className="text-2xl font-bold text-blue-800">{calledQueueCount}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Completed</p>
                <p className="text-2xl font-bold text-emerald-800">{completedQueueCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800">
              Doctor Load ({dashboardDate})
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Busiest doctor:{" "}
              <span className="font-semibold text-slate-700">
                {busiestDoctor.doctorName}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Appointments:{" "}
              <span className="font-semibold text-slate-700">
                {busiestDoctor.count}
              </span>
            </p>

            <div className="mt-6 rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Appointment Throughput</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">
                {selectedAppointments.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Total scheduled on selected date
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">Upcoming Appointments</h3>
            <span className="text-sm text-slate-500">Next {upcomingAppointments.length}</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading appointments...</p>
          ) : upcomingAppointments.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming appointments.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500">
                    <th className="py-3">Appointment</th>
                    <th className="py-3">Patient</th>
                    <th className="py-3">Doctor</th>
                    <th className="py-3">Date</th>
                    <th className="py-3">Time</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppointments.map((item) => {
                    const patient = patientMap.get(Number(item.patientId));
                    const doctor = doctorMap.get(Number(item.doctorId));

                    return (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 font-medium text-slate-700">#{item.id}</td>
                        <td className="py-3">{patient?.fullName || `#${item.patientId}`}</td>
                        <td className="py-3">{doctor?.fullName || `#${item.doctorId}`}</td>
                        <td className="py-3">{item.appointmentDate}</td>
                        <td className="py-3">{toTimeOnly(item.appointmentTime) || "-"}</td>
                        <td className="py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {formatStatus(item.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800">Report Generation</h3>
          <p className="mt-1 text-sm text-slate-500">
            Generate text reports from your live microservice data.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="daily">Daily Summary</option>
              <option value="queue">Queue Detail</option>
              <option value="doctor">Doctor Utilization</option>
            </select>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateReport}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={downloadReportPdf}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={copyReport}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Copy
            </button>
          </div>

          {reportMessage && (
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              {reportMessage}
            </p>
          )}

          <textarea
            className="mt-4 min-h-64 font-mono text-xs"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Generated report will appear here..."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
