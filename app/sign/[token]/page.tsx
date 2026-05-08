import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, XCircle, FileText } from 'lucide-react'
import { SignClient } from './SignClient'

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const document = await prisma.document.findUnique({
    where: { signatureToken: token },
    include: {
      patient: { select: { name: true } },
      createdBy: {
        include: { clinic: { select: { name: true } } },
      },
    },
  })

  // Token not found
  if (!document) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link inválido ou expirado</h2>
          <p className="text-gray-500 text-sm">
            Este link de assinatura não é válido. Solicite um novo link à clínica.
          </p>
        </div>
      </PublicLayout>
    )
  }

  // Already signed
  if (document.signatureStatus === 'SIGNED') {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Documento já assinado</h2>
          {document.signedAt && (
            <p className="text-gray-500">
              Assinado em{' '}
              {format(document.signedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
          <p className="text-sm text-gray-400 mt-2">por {document.signerName}</p>
        </div>
      </PublicLayout>
    )
  }

  const clinicName = document.createdBy.clinic.name

  return (
    <PublicLayout>
      {/* Doc header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <FileText className="w-4 h-4" />
          {clinicName}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
        <p className="text-sm text-gray-500 mt-1">Paciente: {document.patient.name}</p>
      </div>

      <SignClient
        doc={{
          id: document.id,
          title: document.title,
          content: document.content,
          clinicName,
          patientName: document.patient.name,
          token,
        }}
      />
    </PublicLayout>
  )
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}
