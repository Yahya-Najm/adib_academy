import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    padding: 0,
  },
  header: {
    backgroundColor: "#134e4a",
    paddingVertical: 28,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "column" },
  headerTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 1 },
  headerSubtitle: { fontSize: 10, color: "#99f6e4", marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  docLabel: { fontSize: 9, color: "#99f6e4", textTransform: "uppercase", letterSpacing: 1.5 },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#f0fdfa", marginTop: 2 },
  docDate: { fontSize: 9, color: "#99f6e4", marginTop: 4 },

  payTypeBadge: {
    marginTop: 6,
    backgroundColor: "#0d9488",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  payTypeBadgeText: { fontSize: 8, color: "#ffffff", fontFamily: "Helvetica-Bold" },

  body: { paddingHorizontal: 40, paddingTop: 28, paddingBottom: 40 },

  infoRow: { flexDirection: "row", gap: 20, marginBottom: 20 },
  infoCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  infoCardTitle: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
  },
  infoField: { flexDirection: "row", marginBottom: 5 },
  infoLabel: { fontSize: 9, color: "#64748b", width: 80 },
  infoValue: { fontSize: 9, color: "#1e293b", fontFamily: "Helvetica-Bold", flex: 1 },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#134e4a",
    marginBottom: 8,
    marginTop: 20,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  table: { borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0fdfa", paddingVertical: 7, paddingHorizontal: 12 },
  tableHeaderCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0f766e", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  tableCell: { fontSize: 9, color: "#374151" },
  noData: { fontSize: 9, color: "#94a3b8", paddingVertical: 8, paddingHorizontal: 12 },

  financialBox: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 4,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  financialLabel: { fontSize: 10, color: "#64748b" },
  financialValue: { fontSize: 10, color: "#1e293b", fontFamily: "Helvetica-Bold" },
  financialRowNet: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#134e4a",
  },
  financialLabelNet: { fontSize: 11, color: "#f0fdfa", fontFamily: "Helvetica-Bold" },
  financialValueNet: { fontSize: 13, color: "#34d399", fontFamily: "Helvetica-Bold" },

  deductionReason: {
    backgroundColor: "#fef9c3",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  deductionReasonLabel: { fontSize: 8, color: "#92400e", fontFamily: "Helvetica-Bold", marginBottom: 3 },
  deductionReasonText: { fontSize: 9, color: "#78350f" },

  memoBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 12,
    marginBottom: 4,
  },
  memoLabel: { fontSize: 8, color: "#166534", fontFamily: "Helvetica-Bold", marginBottom: 4 },
  memoText: { fontSize: 9, color: "#15803d", lineHeight: 1.5 },

  reportRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 8,
  },
  reportBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    backgroundColor: "#6366f1",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  reportAbsent: { backgroundColor: "#ef4444" },
  reportLate: { backgroundColor: "#f59e0b" },
  reportDate: { fontSize: 8, color: "#64748b", width: 65 },
  reportText: { fontSize: 9, color: "#374151", flex: 1 },

  signatureSection: { flexDirection: "row", gap: 20, marginTop: 32 },
  signatureBox: {
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: "#134e4a",
    paddingTop: 8,
  },
  signatureName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  signatureRole: { fontSize: 9, color: "#64748b", marginTop: 2 },
  signatureDate: { fontSize: 8, color: "#94a3b8", marginTop: 10 },
  signatureNote: { fontSize: 8, color: "#64748b", fontStyle: "italic", marginTop: 4 },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#94a3b8" },
});

interface TeacherPaymentPDFProps {
  payment: {
    id: string;
    month: number;
    year: number;
    paymentType: string;
    grossAmount: number;
    deduction: number;
    deductionReason?: string | null;
    memo?: string | null;
    netAmount: number;
    status: string;
  };
  teacher: {
    name: string;
    userId?: string | null;
    perClassRate?: number | null;
    revenuePercentage?: number | null;
    hourlyRate?: number | null;
  };
  branchName: string;
  sections: {
    id: string;
    classNameSnapshot: string;
    sectionLabel: string;
    sessionsCount: number;
    rateSnapshot: number;
    amount: number;
  }[];
  classMonths: {
    id: string;
    classNameSnapshot: string;
    monthNumber: number;
    totalFeesAmount: number;
    percentageSnapshot: number;
    sectionsInClass: number;
    teacherSections: number;
    amount: number;
  }[];
  absences: {
    id: string;
    date: Date | string;
    classSection: { courseClass: { courseTemplate: { name: string } } };
  }[];
  reports: {
    id: string;
    date: Date | string;
    reportType: string;
    content?: string | null;
    manager?: { name: string } | null;
    teacher?: { name: string } | null;
  }[];
  generatedAt?: Date | string;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function payTypeLabel(t: string) {
  if (t === "PER_CLASS") return "Per Section — Fixed Rate";
  if (t === "REVENUE_PERCENTAGE") return "Revenue Percentage";
  if (t === "FIXED_HOURS") return "Fixed Hours — Hourly Rate";
  return t;
}

export default function TeacherPaymentPDF({
  payment, teacher, branchName, sections, classMonths, absences, reports, generatedAt,
}: TeacherPaymentPDFProps) {
  return (
    <Document title={`Teacher Payment — ${teacher.name}`} author="Adib Academy">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>ADIB ACADEMY</Text>
            <Text style={styles.headerSubtitle}>{branchName}</Text>
            <View style={styles.payTypeBadge}>
              <Text style={styles.payTypeBadgeText}>{payTypeLabel(payment.paymentType)}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docLabel}>Teacher Payment</Text>
            <Text style={styles.docTitle}>{MONTHS[payment.month]} {payment.year}</Text>
            <Text style={styles.docDate}>Generated: {fmtDate(generatedAt ?? new Date())}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Teacher & Period Info */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Teacher Information</Text>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{teacher.name}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Teacher ID</Text>
                <Text style={styles.infoValue}>{teacher.userId ?? "N/A"}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Payment Type</Text>
                <Text style={styles.infoValue}>{payTypeLabel(payment.paymentType)}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Rate</Text>
                <Text style={styles.infoValue}>
                  {payment.paymentType === "PER_CLASS" && teacher.perClassRate
                    ? `$${fmt(teacher.perClassRate)} / section`
                    : payment.paymentType === "FIXED_HOURS" && teacher.hourlyRate
                    ? `$${fmt(teacher.hourlyRate)} / hour`
                    : payment.paymentType === "REVENUE_PERCENTAGE" && teacher.revenuePercentage
                    ? `${teacher.revenuePercentage}% of revenue`
                    : "—"}
                </Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Pay Period</Text>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Month</Text>
                <Text style={styles.infoValue}>{MONTHS[payment.month]} {payment.year}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Branch</Text>
                <Text style={styles.infoValue}>{branchName}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>{payment.status}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Gross Pay</Text>
                <Text style={styles.infoValue}>${fmt(payment.grossAmount)}</Text>
              </View>
            </View>
          </View>

          {/* Sections Taught (PER_CLASS / FIXED_HOURS) */}
          {payment.paymentType !== "REVENUE_PERCENTAGE" && (
            <>
              <Text style={styles.sectionTitle}>Sections Taught This Month ({sections.length})</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Class</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Section</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>Sessions</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Rate</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "right" }]}>Amount</Text>
                </View>
                {sections.length === 0 ? (
                  <Text style={styles.noData}>No sessions recorded for this period.</Text>
                ) : (
                  sections.map((s, i) => (
                    <View key={s.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{s.classNameSnapshot}</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{s.sectionLabel}</Text>
                      <Text style={[styles.tableCell, { width: 60, fontFamily: "Helvetica-Bold" }]}>{s.sessionsCount}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>${fmt(s.rateSnapshot)}</Text>
                      <Text style={[styles.tableCell, { width: 70, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#134e4a" }]}>${fmt(s.amount)}</Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {/* Class Months (REVENUE_PERCENTAGE) */}
          {payment.paymentType === "REVENUE_PERCENTAGE" && (
            <>
              <Text style={styles.sectionTitle}>Class Months Included ({classMonths.length})</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Class</Text>
                  <Text style={[styles.tableHeaderCell, { width: 50 }]}>Month</Text>
                  <Text style={[styles.tableHeaderCell, { width: 80 }]}>Total Fees</Text>
                  <Text style={[styles.tableHeaderCell, { width: 50 }]}>%</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "right" }]}>Amount</Text>
                </View>
                {classMonths.length === 0 ? (
                  <Text style={styles.noData}>No finalized class months available for payment.</Text>
                ) : (
                  classMonths.map((cm, i) => (
                    <View key={cm.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{cm.classNameSnapshot}</Text>
                      <Text style={[styles.tableCell, { width: 50 }]}>M{cm.monthNumber}</Text>
                      <Text style={[styles.tableCell, { width: 80 }]}>${fmt(cm.totalFeesAmount)}</Text>
                      <Text style={[styles.tableCell, { width: 50 }]}>{cm.percentageSnapshot * cm.teacherSections}%</Text>
                      <Text style={[styles.tableCell, { width: 70, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#134e4a" }]}>${fmt(cm.amount)}</Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {/* Absences */}
          {absences.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Absences This Period ({absences.length})</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: 90 }]}>Date</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Class</Text>
                </View>
                {absences.slice(0, 15).map((a, i) => (
                  <View key={a.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: 90, color: "#dc2626" }]}>{fmtDate(a.date)}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{a.classSection.courseClass.courseTemplate.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Reports */}
          <Text style={styles.sectionTitle}>Reports ({reports.length})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: 65 }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: 70 }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Details</Text>
              <Text style={[styles.tableHeaderCell, { width: 60 }]}>Author</Text>
            </View>
            {reports.length === 0 ? (
              <Text style={styles.noData}>No reports for this period.</Text>
            ) : (
              reports.slice(0, 15).map((r, i) => (
                <View key={r.id} style={[styles.reportRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.reportDate}>{fmtDate(r.date)}</Text>
                  <Text style={[
                    styles.reportBadge,
                    r.reportType === "ABSENT" ? styles.reportAbsent :
                    r.reportType === "LATE" ? styles.reportLate : {},
                  ]}>{r.reportType}</Text>
                  <Text style={styles.reportText}>{r.content ?? "—"}</Text>
                  <Text style={[styles.reportDate, { textAlign: "right" }]}>
                    {r.manager?.name ?? r.teacher?.name ?? "System"}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Financials */}
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>
          <View style={styles.financialBox}>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Gross Earnings</Text>
              <Text style={styles.financialValue}>${fmt(payment.grossAmount)}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: "#dc2626" }]}>Deduction</Text>
              <Text style={[styles.financialValue, { color: "#dc2626" }]}>- ${fmt(payment.deduction)}</Text>
            </View>
            <View style={styles.financialRowNet}>
              <Text style={styles.financialLabelNet}>NET PAYMENT</Text>
              <Text style={styles.financialValueNet}>${fmt(payment.netAmount)}</Text>
            </View>
          </View>

          {payment.deduction > 0 && payment.deductionReason && (
            <View style={styles.deductionReason}>
              <Text style={styles.deductionReasonLabel}>DEDUCTION REASON</Text>
              <Text style={styles.deductionReasonText}>{payment.deductionReason}</Text>
            </View>
          )}

          {payment.memo && (
            <>
              <Text style={styles.sectionTitle}>General Memo</Text>
              <View style={styles.memoBox}>
                <Text style={styles.memoLabel}>STATEMENT</Text>
                <Text style={styles.memoText}>{payment.memo}</Text>
              </View>
            </>
          )}

          {/* Signatures */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureName}>{teacher.name}</Text>
              <Text style={styles.signatureRole}>Teacher · {branchName}</Text>
              <Text style={styles.signatureDate}>Date: ________________________</Text>
              <Text style={styles.signatureNote}>Signature confirms receipt of payment statement</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureName}>Branch Manager</Text>
              <Text style={styles.signatureRole}>Authorized Signatory · {branchName}</Text>
              <Text style={styles.signatureDate}>Date: ________________________</Text>
              <Text style={styles.signatureNote}>Signature authorizes payment disbursement</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Adib Academy — {branchName}</Text>
            <Text style={styles.footerText}>Payment ID: {payment.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.footerText}>CONFIDENTIAL — For internal use only</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
