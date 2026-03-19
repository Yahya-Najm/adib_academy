import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    padding: 0,
  },
  header: {
    backgroundColor: "#1e293b",
    paddingVertical: 28,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "column" },
  headerTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 1 },
  headerSubtitle: { fontSize: 10, color: "#94a3b8", marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  docLabel: { fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5 },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#f1f5f9", marginTop: 2 },
  docDate: { fontSize: 9, color: "#94a3b8", marginTop: 4 },

  body: { paddingHorizontal: 40, paddingTop: 28, paddingBottom: 40 },

  // Info section
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

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 20,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  // Table
  table: { borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 7, paddingHorizontal: 12 },
  tableHeaderCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  tableRowAlt: { backgroundColor: "#fafafa" },
  tableCell: { fontSize: 9, color: "#374151" },

  // Financials
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
    backgroundColor: "#1e293b",
  },
  financialLabelNet: { fontSize: 11, color: "#f1f5f9", fontFamily: "Helvetica-Bold" },
  financialValueNet: { fontSize: 13, color: "#34d399", fontFamily: "Helvetica-Bold" },

  // Deduction
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

  // Memo
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

  // Report badge
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
  reportDate: { fontSize: 8, color: "#64748b", width: 60 },
  reportText: { fontSize: 9, color: "#374151", flex: 1 },
  noData: { fontSize: 9, color: "#94a3b8", paddingVertical: 8, paddingHorizontal: 12 },

  // Signature
  signatureSection: { flexDirection: "row", gap: 20, marginTop: 32 },
  signatureBox: {
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: "#1e293b",
    paddingTop: 8,
  },
  signatureName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  signatureRole: { fontSize: 9, color: "#64748b", marginTop: 2 },
  signatureDate: { fontSize: 8, color: "#94a3b8", marginTop: 10 },
  signatureNote: { fontSize: 8, color: "#64748b", fontStyle: "italic", marginTop: 4 },

  // Footer
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

interface StaffPaymentPDFProps {
  payment: {
    id: string;
    dueDate: Date | string;
    periodStart: Date | string;
    periodEnd: Date | string;
    grossAmount: number;
    deduction: number;
    deductionReason?: string | null;
    memo?: string | null;
    netAmount: number;
    status: string;
  };
  user: {
    name: string;
    userId?: string | null;
    role: string;
    staffType?: string | null;
  };
  branchName: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  reports: {
    id: string;
    date: Date | string;
    reportType: string;
    reportKind: string;
    content?: string | null;
    isAutomatic: boolean;
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

export default function StaffPaymentPDF({
  payment, user, branchName, presentDays, absentDays, lateDays, reports, generatedAt,
}: StaffPaymentPDFProps) {
  const roleLabel = user.role === "MANAGER" ? "Manager" : user.staffType ? `Staff — ${user.staffType}` : "Staff";

  return (
    <Document title={`Payment Statement — ${user.name}`} author="Adib Academy">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>ADIB ACADEMY</Text>
            <Text style={styles.headerSubtitle}>{branchName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docLabel}>Payment Statement</Text>
            <Text style={styles.docTitle}>SALARY DOCUMENT</Text>
            <Text style={styles.docDate}>Generated: {fmtDate(generatedAt ?? new Date())}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Employee & Period Info */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Employee Information</Text>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{user.name}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Employee ID</Text>
                <Text style={styles.infoValue}>{user.userId ?? "N/A"}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{roleLabel}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Branch</Text>
                <Text style={styles.infoValue}>{branchName}</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Pay Period</Text>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Period Start</Text>
                <Text style={styles.infoValue}>{fmtDate(payment.periodStart)}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Period End</Text>
                <Text style={styles.infoValue}>{fmtDate(payment.periodEnd)}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Due Date</Text>
                <Text style={styles.infoValue}>{fmtDate(payment.dueDate)}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>{payment.status}</Text>
              </View>
            </View>
          </View>

          {/* Attendance Summary */}
          <Text style={styles.sectionTitle}>Attendance Summary</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Days Present</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Days Absent</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Days Late</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Total Recorded</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1, color: "#16a34a", fontFamily: "Helvetica-Bold" }]}>{presentDays}</Text>
              <Text style={[styles.tableCell, { flex: 1, color: "#dc2626", fontFamily: "Helvetica-Bold" }]}>{absentDays}</Text>
              <Text style={[styles.tableCell, { flex: 1, color: "#d97706", fontFamily: "Helvetica-Bold" }]}>{lateDays}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{presentDays + absentDays}</Text>
            </View>
          </View>

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
              reports.slice(0, 20).map((r, i) => (
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
              <Text style={styles.financialLabel}>Monthly Salary</Text>
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

          {/* Deduction Reason */}
          {payment.deduction > 0 && payment.deductionReason && (
            <View style={styles.deductionReason}>
              <Text style={styles.deductionReasonLabel}>DEDUCTION REASON</Text>
              <Text style={styles.deductionReasonText}>{payment.deductionReason}</Text>
            </View>
          )}

          {/* Memo */}
          {payment.memo && (
            <>
              <Text style={styles.sectionTitle}>General Memo</Text>
              <View style={styles.memoBox}>
                <Text style={styles.memoLabel}>STATEMENT</Text>
                <Text style={styles.memoText}>{payment.memo}</Text>
              </View>
            </>
          )}

          {/* Signature Section */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureName}>{user.name}</Text>
              <Text style={styles.signatureRole}>{roleLabel} · {branchName}</Text>
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
