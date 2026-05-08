import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Remove diacritics so jsPDF default (Helvetica) renders them correctly
function n(str: string | null | undefined): string {
  if (!str) return ''
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }) } catch { return dateStr }
}

function fmtMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

const STATUS_PT: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Nao Compareceu',
}

export interface MonthlyReportData {
  month: string
  clinicName: string
  total: number
  byStatus: Record<string, number>
  byDoctor: { name: string; count: number; revenue: number }[]
  revenue: number
  newPatients: number
}

export interface PatientRecordData {
  clinicName: string
  patient: {
    name: string; cpf?: string | null; birthDate?: string | null
    gender?: string | null; phone: string; email?: string | null
    address?: string | null; bloodType?: string | null
    allergies?: string | null
  }
  appointments: { startTime: string; title: string; status: string; doctorName: string }[]
  medicalRecords: {
    createdAt: string; doctorName: string; chiefComplaint?: string | null
    diagnosis?: string | null; treatment?: string | null
  }[]
}

export interface DataExportData {
  clinicName: string
  type: string
  from: string
  to: string
  columns: string[]
  rows: (string | number | null)[][]
}

export async function generateMonthlyReport(data: MonthlyReportData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF()
  const M = 10
  let y = 20

  // Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(n(data.clinicName), M, y)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120)
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 200, y, { align: 'right' })
  y += 7

  pdf.setTextColor(0)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  const [year, monthNum] = data.month.split('-')
  const monthLabel = format(new Date(Number(year), Number(monthNum) - 1, 1), 'MMMM yyyy', { locale: ptBR })
  pdf.text(n(`Relatorio Mensal - ${monthLabel}`), M, y)
  y += 3
  pdf.setDrawColor(14, 165, 233)
  pdf.setLineWidth(0.5)
  pdf.line(M, y, 200, y)
  y += 10

  // Summary boxes
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(14, 165, 233)
  pdf.text('RESUMO', M, y)
  y += 7

  const boxes = [
    { label: 'Total de Consultas', value: String(data.total) },
    { label: 'Concluidas', value: String(data.byStatus['COMPLETED'] || 0) },
    { label: 'Canceladas', value: String(data.byStatus['CANCELLED'] || 0) },
    { label: 'Receita Total', value: fmtMoney(data.revenue) },
    { label: 'Novos Pacientes', value: String(data.newPatients) },
  ]
  const boxW = 36
  for (let i = 0; i < boxes.length; i++) {
    const bx = M + i * (boxW + 2)
    pdf.setDrawColor(220)
    pdf.setFillColor(248, 250, 252)
    pdf.roundedRect(bx, y, boxW, 18, 2, 2, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor(14, 165, 233)
    pdf.text(boxes[i].value, bx + boxW / 2, y + 10, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(100)
    pdf.text(boxes[i].label, bx + boxW / 2, y + 16, { align: 'center' })
  }
  y += 26

  // By status
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(14, 165, 233)
  pdf.text('STATUS DAS CONSULTAS', M, y)
  pdf.setDrawColor(14, 165, 233)
  pdf.line(M, y + 2, 200, y + 2)
  y += 8
  pdf.setTextColor(0)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const statusEntries = Object.entries(data.byStatus)
  for (let i = 0; i < statusEntries.length; i += 3) {
    const row = statusEntries.slice(i, i + 3)
    for (let j = 0; j < row.length; j++) {
      const [status, count] = row[j]
      pdf.text(`${STATUS_PT[status] || status}: ${count}`, M + j * 62, y)
    }
    y += 7
  }
  y += 5

  // By doctor
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(14, 165, 233)
  pdf.text('CONSULTAS POR PROFISSIONAL', M, y)
  pdf.setDrawColor(14, 165, 233)
  pdf.line(M, y + 2, 200, y + 2)
  y += 8
  pdf.setFillColor(241, 245, 249)
  pdf.rect(M, y - 4, 190, 7, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(0)
  pdf.text('Profissional', M + 2, y)
  pdf.text('Consultas', M + 118, y)
  pdf.text('Receita', M + 152, y)
  y += 6
  pdf.setFont('helvetica', 'normal')
  for (const doc of data.byDoctor) {
    if (y > 270) { pdf.addPage(); y = 20 }
    pdf.text(n(doc.name), M + 2, y)
    pdf.text(String(doc.count), M + 118, y)
    pdf.text(fmtMoney(doc.revenue), M + 152, y)
    pdf.setDrawColor(230)
    pdf.line(M, y + 2, 200, y + 2)
    y += 7
  }

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8)
  pdf.setTextColor(150)
  pdf.text('Relatorio gerado automaticamente pelo sistema ClinicaOS', 105, 287, { align: 'center' })

  pdf.save(`relatorio-mensal-${n(monthLabel).replace(/\s+/g, '-')}.pdf`)
}

export async function generatePatientRecord(data: PatientRecordData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF()
  const M = 10
  let y = 20

  // Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(n(data.clinicName), M, y)
  y += 6
  pdf.setFontSize(12)
  pdf.text('Prontuario do Paciente', M, y)
  y += 3
  pdf.setDrawColor(14, 165, 233)
  pdf.setLineWidth(0.5)
  pdf.line(M, y, 200, y)
  y += 10

  // Patient info
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(14, 165, 233)
  pdf.text('DADOS DO PACIENTE', M, y)
  pdf.line(M, y + 2, 200, y + 2)
  y += 9

  const p = data.patient
  const infoRows: [string, string][] = [
    [`Nome: ${n(p.name)}`, `CPF: ${n(p.cpf || '-')}`],
    [`Telefone: ${n(p.phone)}`, `Email: ${n(p.email || '-')}`],
    [`Nascimento: ${fmt(p.birthDate || null)}`, `Tipo Sanguineo: ${n(p.bloodType || '-')}`],
    [`Genero: ${n(p.gender || '-')}`, `Endereco: ${n(p.address || '-')}`],
    [`Alergias: ${n(p.allergies || '-')}`, ''],
  ]
  pdf.setTextColor(0)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  for (const [left, right] of infoRows) {
    pdf.text(left, M, y)
    if (right) pdf.text(right, 110, y)
    y += 7
  }
  y += 4

  // Appointments
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(14, 165, 233)
  pdf.text('HISTORICO DE CONSULTAS', M, y)
  pdf.setDrawColor(14, 165, 233)
  pdf.line(M, y + 2, 200, y + 2)
  y += 8

  if (data.appointments.length === 0) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(9)
    pdf.setTextColor(150)
    pdf.text('Nenhuma consulta registrada.', M, y)
    y += 8
  } else {
    pdf.setFillColor(241, 245, 249)
    pdf.rect(M, y - 4, 190, 7, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(0)
    pdf.text('Data', M + 2, y)
    pdf.text('Tipo', M + 34, y)
    pdf.text('Profissional', M + 112, y)
    pdf.text('Status', M + 160, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    for (const apt of data.appointments) {
      if (y > 270) { pdf.addPage(); y = 20 }
      pdf.text(fmt(apt.startTime), M + 2, y)
      const titleLines = pdf.splitTextToSize(n(apt.title), 74)
      pdf.text(titleLines[0], M + 34, y)
      pdf.text(n(apt.doctorName), M + 112, y)
      pdf.text(STATUS_PT[apt.status] || apt.status, M + 160, y)
      pdf.setDrawColor(230)
      pdf.line(M, y + 2, 200, y + 2)
      y += 7
    }
  }
  y += 5

  // Medical records
  if (y > 240) { pdf.addPage(); y = 20 }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(14, 165, 233)
  pdf.text('EVOLUCOES CLINICAS', M, y)
  pdf.setDrawColor(14, 165, 233)
  pdf.line(M, y + 2, 200, y + 2)
  y += 9

  if (data.medicalRecords.length === 0) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(9)
    pdf.setTextColor(150)
    pdf.text('Nenhuma evolucao registrada.', M, y)
  } else {
    pdf.setTextColor(0)
    for (const rec of data.medicalRecords) {
      if (y > 260) { pdf.addPage(); y = 20 }
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text(`${fmt(rec.createdAt)} - ${n(rec.doctorName)}`, M, y)
      y += 6
      pdf.setFont('helvetica', 'normal')
      if (rec.chiefComplaint) {
        const lines = pdf.splitTextToSize(`Queixa: ${n(rec.chiefComplaint)}`, 185)
        pdf.text(lines, M + 3, y)
        y += lines.length * 5
      }
      if (rec.diagnosis) {
        const lines = pdf.splitTextToSize(`Diagnostico: ${n(rec.diagnosis)}`, 185)
        pdf.text(lines, M + 3, y)
        y += lines.length * 5
      }
      if (rec.treatment) {
        const lines = pdf.splitTextToSize(`Tratamento: ${n(rec.treatment)}`, 185)
        pdf.text(lines, M + 3, y)
        y += lines.length * 5
      }
      pdf.setDrawColor(230)
      pdf.line(M, y + 2, 200, y + 2)
      y += 6
    }
  }

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8)
  pdf.setTextColor(150)
  pdf.text('Prontuario gerado automaticamente pelo sistema ClinicaOS', 105, 287, { align: 'center' })

  pdf.save(`prontuario-${n(data.patient.name).replace(/\s+/g, '-')}.pdf`)
}

export interface PaymentReceiptData {
  id: string
  clinicName: string
  patient: { name: string }
  appointment: { title: string; startTime: string } | null
  amount: number
  amountPaid: number
  discount: number
  method: string
  paidAt: string | null
}

const METHOD_LABELS_PDF: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartao de Credito',
  DEBIT_CARD: 'Cartao de Debito',
  PIX: 'PIX',
  BANK_TRANSFER: 'Transferencia Bancaria',
  HEALTH_INSURANCE: 'Convenio',
  OTHER: 'Outro',
}

export async function generatePaymentReceipt(data: PaymentReceiptData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF()
  const M = 20
  let y = 22

  // Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(n(data.clinicName), M, y)
  y += 7
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(120)
  pdf.text(`Recibo N. ${data.id.slice(0, 8).toUpperCase()}`, M, y)
  pdf.text(`Data: ${data.paidAt ? fmt(data.paidAt) : format(new Date(), 'dd/MM/yyyy')}`, 190, y, { align: 'right' })
  y += 4
  pdf.setDrawColor(14, 165, 233)
  pdf.setLineWidth(0.7)
  pdf.line(M, y, 190, y)
  y += 12

  // Patient
  pdf.setTextColor(0)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(14, 165, 233)
  pdf.text('PACIENTE', M, y)
  pdf.setDrawColor(14, 165, 233)
  pdf.line(M, y + 2, 190, y + 2)
  y += 8
  pdf.setTextColor(0)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`Nome: ${n(data.patient.name)}`, M, y)
  y += 14

  // Appointment (if present)
  if (data.appointment) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(14, 165, 233)
    pdf.text('ATENDIMENTO', M, y)
    pdf.setDrawColor(14, 165, 233)
    pdf.line(M, y + 2, 190, y + 2)
    y += 8
    pdf.setTextColor(0)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`Tipo: ${n(data.appointment.title)}`, M, y)
    y += 6
    pdf.text(`Data: ${fmt(data.appointment.startTime)}`, M, y)
    y += 14
  }

  // Payment details
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(14, 165, 233)
  pdf.text('VALORES', M, y)
  pdf.setDrawColor(14, 165, 233)
  pdf.line(M, y + 2, 190, y + 2)
  y += 8

  pdf.setFillColor(248, 250, 252)
  pdf.rect(M, y - 2, 170, data.discount > 0 ? 38 : 30, 'F')
  pdf.setTextColor(0)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)

  pdf.text('Valor total:', M + 3, y + 4)
  pdf.text(fmtMoney(data.amount), 188, y + 4, { align: 'right' })

  if (data.discount > 0) {
    pdf.text('Desconto:', M + 3, y + 12)
    pdf.text(`- ${fmtMoney(data.discount)}`, 188, y + 12, { align: 'right' })
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(14, 165, 233)
    pdf.text('Valor pago:', M + 3, y + 20)
    pdf.text(fmtMoney(data.amountPaid), 188, y + 20, { align: 'right' })
    pdf.setTextColor(0)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Forma de pagamento: ${METHOD_LABELS_PDF[data.method] || data.method}`, M + 3, y + 30)
    y += 44
  } else {
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(14, 165, 233)
    pdf.text('Valor pago:', M + 3, y + 12)
    pdf.text(fmtMoney(data.amountPaid), 188, y + 12, { align: 'right' })
    pdf.setTextColor(0)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Forma de pagamento: ${METHOD_LABELS_PDF[data.method] || data.method}`, M + 3, y + 22)
    y += 36
  }

  if (data.paidAt) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(80)
    pdf.text(`Pagamento registrado em: ${format(new Date(data.paidAt), "dd/MM/yyyy 'as' HH:mm")}`, M, y)
    y += 20
  }

  // Signature lines
  pdf.setDrawColor(100)
  pdf.setLineWidth(0.3)
  const sigY = Math.max(y + 20, 200)
  pdf.line(M, sigY, M + 70, sigY)
  pdf.line(M + 100, sigY, M + 170, sigY)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(100)
  pdf.text('Paciente ou Responsavel', M + 35, sigY + 5, { align: 'center' })
  pdf.text(n(data.clinicName), M + 135, sigY + 5, { align: 'center' })

  // Footer
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8)
  pdf.setTextColor(150)
  pdf.text('Recibo gerado pelo ClinicaOS', 105, 287, { align: 'center' })

  pdf.save(`recibo-${data.id.slice(0, 8)}.pdf`)
}

export async function generateDataExport(data: DataExportData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape' })
  const M = 10
  const PAGE_W = 277
  let y = 20

  // Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(n(data.clinicName), M, y)
  y += 6
  pdf.setFontSize(12)
  pdf.text(`Exportacao de Dados: ${n(data.type)}`, M, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(100)
  pdf.text(`Periodo: ${fmt(data.from)} a ${fmt(data.to)}`, M, y + 6)
  y += 12
  pdf.setTextColor(0)
  pdf.setDrawColor(14, 165, 233)
  pdf.setLineWidth(0.5)
  pdf.line(M, y, PAGE_W, y)
  y += 8

  if (data.rows.length === 0) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(10)
    pdf.setTextColor(150)
    pdf.text('Nenhum dado encontrado para o periodo selecionado.', M, y)
  } else {
    const colCount = data.columns.length
    const colW = Math.min(Math.floor((PAGE_W - M * 2) / colCount), 55)

    pdf.setFillColor(241, 245, 249)
    pdf.rect(M, y - 5, PAGE_W - M * 2, 8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(0)
    data.columns.forEach((col, i) => {
      pdf.text(n(col), M + i * colW + 1, y)
    })
    y += 7

    pdf.setFont('helvetica', 'normal')
    for (const row of data.rows) {
      if (y > 190) { pdf.addPage(); y = 15 }
      row.forEach((cell, i) => {
        const val = cell === null ? '-' : n(String(cell))
        const truncated = val.length > 18 ? val.slice(0, 16) + '..' : val
        pdf.text(truncated, M + i * colW + 1, y)
      })
      pdf.setDrawColor(230)
      pdf.line(M, y + 2, PAGE_W - M, y + 2)
      y += 6
    }
  }

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(7)
  pdf.setTextColor(150)
  pdf.text('Exportacao gerada automaticamente pelo sistema ClinicaOS', 148, 202, { align: 'center' })

  const typeStr = n(data.type).toLowerCase().replace(/\s+/g, '-')
  pdf.save(`exportacao-${typeStr}-${data.from.slice(0, 10)}-${data.to.slice(0, 10)}.pdf`)
}

export interface SignedDocumentData {
  title: string
  clinicName: string
  patientName: string
  content: string
  signerName: string
  signerCpf: string
  signedAt: string
  ipAddress: string
  signatureImageUrl: string
}

function maskCpfDisplay(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
}

export async function generateSignedDocumentPdf(data: SignedDocumentData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF()
  const M = 15
  let y = 20

  // Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(n(data.clinicName), M, y)
  y += 7
  pdf.setFontSize(12)
  pdf.text(n(data.title), M, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(100)
  pdf.text(`Paciente: ${n(data.patientName)}`, M, y + 4)
  y += 7
  pdf.setTextColor(0)
  pdf.setDrawColor(14, 165, 233)
  pdf.setLineWidth(0.5)
  pdf.line(M, y, 195, y)
  y += 10

  // Document content
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(0)
  const contentLines = pdf.splitTextToSize(n(data.content), 180)
  // Check if content fits on current page
  const maxContentHeight = 190 - y
  const lineH = 5
  if (contentLines.length * lineH > maxContentHeight) {
    // Draw as much as fits, then add page
    const linesPerPage = Math.floor(maxContentHeight / lineH)
    pdf.text(contentLines.slice(0, linesPerPage), M, y)
    pdf.addPage()
    y = 20
    pdf.text(contentLines.slice(linesPerPage), M, y)
    y += Math.max(0, (contentLines.length - linesPerPage)) * lineH
  } else {
    pdf.text(contentLines, M, y)
    y += contentLines.length * lineH
  }
  y += 10

  // Signature proof section
  if (y > 220) { pdf.addPage(); y = 20 }
  pdf.setFillColor(248, 250, 252)
  pdf.setDrawColor(14, 165, 233)
  pdf.setLineWidth(0.4)
  pdf.rect(M, y, 180, 70, 'FD')
  y += 7

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(14, 165, 233)
  pdf.text('COMPROVANTE DE ASSINATURA DIGITAL', M + 3, y)
  y += 6

  pdf.setTextColor(0)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text(`Signatario: ${n(data.signerName)}`, M + 3, y)
  y += 5
  pdf.text(`CPF: ${maskCpfDisplay(data.signerCpf)}`, M + 3, y)
  y += 5
  pdf.text(`Data/Hora: ${format(new Date(data.signedAt), "dd/MM/yyyy 'as' HH:mm:ss")}`, M + 3, y)
  y += 5
  pdf.text(`IP registrado: ${n(data.ipAddress)}`, M + 3, y)
  y += 8

  // Signature image
  try {
    pdf.addImage(data.signatureImageUrl, 'PNG', M + 3, y, 60, 20)
  } catch { /* ignore if image fails */ }
  y += 24

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8)
  pdf.setTextColor(80)
  pdf.text('Documento assinado digitalmente. Esta assinatura tem validade legal conforme MP 2.200-2/2001.', M + 3, y)

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(7)
  pdf.setTextColor(150)
  pdf.text('Gerado pelo ClinicaOS', 105, 290, { align: 'center' })

  pdf.save(`${n(data.title).replace(/\s+/g, '_')}_assinado.pdf`)
}
