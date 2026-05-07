import Link from 'next/link'
import { Shield } from 'lucide-react'

const CLINIC_TYPES = [
  { type: 'MEDICA',        emoji: '🩺', label: 'Clínica Médica' },
  { type: 'ODONTOLOGIA',   emoji: '🦷', label: 'Odontologia' },
  { type: 'GINECOLOGIA',   emoji: '🤰', label: 'Ginecologia' },
  { type: 'PEDIATRIA',     emoji: '👶', label: 'Pediatria' },
  { type: 'DERMATOLOGIA',  emoji: '💆', label: 'Dermatologia' },
  { type: 'PSICOLOGIA',    emoji: '🧠', label: 'Psicologia' },
  { type: 'FISIOTERAPIA',  emoji: '🦵', label: 'Fisioterapia' },
  { type: 'ENDOCRINOLOGIA',emoji: '🩸', label: 'Endocrinologia' },
  { type: 'NUTRICAO',      emoji: '🥗', label: 'Nutrição' },
]

export default function AdminPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-5 flex items-start gap-4">
        <div className="p-2.5 bg-amber-100 rounded-lg flex-shrink-0">
          <Shield className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-amber-900">Painel Exclusivo — Admin ClinicaOS</h1>
          <p className="text-sm text-amber-700 mt-0.5">
            Selecione um tipo de clínica para visualizar a interface como o cliente veria
          </p>
        </div>
      </div>

      {/* Grid de tipos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CLINIC_TYPES.map(({ type, emoji, label }) => (
          <div
            key={type}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4 hover:border-amber-200 hover:shadow-md transition"
          >
            <span className="text-5xl" role="img" aria-label={label}>{emoji}</span>
            <p className="font-semibold text-gray-900 text-center">{label}</p>
            <Link
              href={`/admin/preview?type=${type}`}
              className="w-full text-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition"
            >
              Visualizar interface
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
