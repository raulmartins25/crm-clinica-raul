export interface AppointmentType {
  label: string
  duration: number   // minutes
  color: string      // hex
  price?: number
}

export interface CalendarConfig {
  defaultDuration: number
  appointmentTypes: AppointmentType[]
  returnIntervals: { label: string; days: number }[]
  slotDuration: string     // FullCalendar format e.g. '00:30:00'
  businessHours: {
    startTime: string      // 'HH:MM'
    endTime: string
    daysOfWeek: number[]   // 0=Sun,1=Mon,...,6=Sat
  }
  professionalLabel: string
}

export function getCalendarConfig(clinicType?: string | null): CalendarConfig {
  switch (clinicType) {
    case 'ODONTOLOGIA':
      return {
        defaultDuration: 60,
        appointmentTypes: [
          { label: 'Consulta Inicial', duration: 60, color: '#3b82f6' },
          { label: 'Retorno',          duration: 30, color: '#22c55e' },
          { label: 'Limpeza',          duration: 45, color: '#06b6d4' },
          { label: 'Canal',            duration: 90, color: '#8b5cf6' },
          { label: 'Extração',         duration: 45, color: '#ef4444' },
          { label: 'Implante',         duration: 120, color: '#f59e0b' },
          { label: 'Ortodontia',       duration: 30, color: '#ec4899' },
          { label: 'Clareamento',      duration: 60, color: '#f97316' },
        ],
        returnIntervals: [
          { label: '7 dias',   days: 7   },
          { label: '15 dias',  days: 15  },
          { label: '3 meses',  days: 90  },
          { label: '6 meses',  days: 180 },
          { label: '1 ano',    days: 365 },
        ],
        slotDuration: '00:30:00',
        businessHours: { startTime: '08:00', endTime: '18:00', daysOfWeek: [1,2,3,4,5,6] },
        professionalLabel: 'Dentista',
      }

    case 'GINECOLOGIA':
      return {
        defaultDuration: 30,
        appointmentTypes: [
          { label: 'Consulta',     duration: 30, color: '#3b82f6' },
          { label: 'Pré-natal',    duration: 20, color: '#ec4899' },
          { label: 'Retorno',      duration: 20, color: '#22c55e' },
          { label: 'Colposcopia',  duration: 45, color: '#8b5cf6' },
          { label: 'Ultrassom',    duration: 30, color: '#06b6d4' },
        ],
        returnIntervals: [
          { label: '15 dias',  days: 15 },
          { label: '28 dias',  days: 28 },
          { label: '2 meses',  days: 60 },
          { label: '3 meses',  days: 90 },
        ],
        slotDuration: '00:15:00',
        businessHours: { startTime: '08:00', endTime: '17:00', daysOfWeek: [1,2,3,4,5] },
        professionalLabel: 'Médico(a)',
      }

    case 'PEDIATRIA':
      return {
        defaultDuration: 30,
        appointmentTypes: [
          { label: 'Consulta',       duration: 30, color: '#3b82f6' },
          { label: 'Puericultura',   duration: 30, color: '#22c55e' },
          { label: 'Retorno',        duration: 20, color: '#06b6d4' },
          { label: 'Vacinação',      duration: 15, color: '#f59e0b' },
          { label: 'Urgência',       duration: 20, color: '#ef4444' },
        ],
        returnIntervals: [
          { label: '15 dias',  days: 15  },
          { label: '1 mês',    days: 30  },
          { label: '2 meses',  days: 60  },
          { label: '3 meses',  days: 90  },
          { label: '6 meses',  days: 180 },
        ],
        slotDuration: '00:15:00',
        businessHours: { startTime: '08:00', endTime: '18:00', daysOfWeek: [1,2,3,4,5] },
        professionalLabel: 'Pediatra',
      }

    case 'DERMATOLOGIA':
      return {
        defaultDuration: 45,
        appointmentTypes: [
          { label: 'Consulta',        duration: 45, color: '#3b82f6' },
          { label: 'Retorno',         duration: 20, color: '#22c55e' },
          { label: 'Peeling',         duration: 60, color: '#f59e0b' },
          { label: 'Botox',           duration: 30, color: '#ec4899' },
          { label: 'Laser',           duration: 60, color: '#8b5cf6' },
          { label: 'Preenchimento',   duration: 45, color: '#f97316' },
          { label: 'Cauterização',    duration: 30, color: '#ef4444' },
        ],
        returnIntervals: [
          { label: '15 dias',  days: 15  },
          { label: '1 mês',    days: 30  },
          { label: '3 meses',  days: 90  },
          { label: '6 meses',  days: 180 },
        ],
        slotDuration: '00:15:00',
        businessHours: { startTime: '09:00', endTime: '19:00', daysOfWeek: [1,2,3,4,5,6] },
        professionalLabel: 'Dermatologista',
      }

    case 'PSICOLOGIA':
      return {
        defaultDuration: 50,
        appointmentTypes: [
          { label: 'Sessão Individual', duration: 50, color: '#8b5cf6' },
          { label: 'Sessão Casal',      duration: 50, color: '#ec4899' },
          { label: 'Sessão Familiar',   duration: 60, color: '#f97316' },
          { label: 'Avaliação',         duration: 90, color: '#3b82f6' },
          { label: 'Retorno',           duration: 50, color: '#22c55e' },
        ],
        returnIntervals: [
          { label: '7 dias',   days: 7  },
          { label: '15 dias',  days: 15 },
        ],
        slotDuration: '00:50:00',
        businessHours: { startTime: '08:00', endTime: '20:00', daysOfWeek: [1,2,3,4,5] },
        professionalLabel: 'Psicólogo(a)',
      }

    case 'FISIOTERAPIA':
      return {
        defaultDuration: 50,
        appointmentTypes: [
          { label: 'Sessão',     duration: 50, color: '#3b82f6' },
          { label: 'Avaliação',  duration: 60, color: '#f59e0b' },
          { label: 'Alta',       duration: 30, color: '#22c55e' },
        ],
        returnIntervals: [
          { label: '2 dias',  days: 2 },
          { label: '3 dias',  days: 3 },
          { label: '7 dias',  days: 7 },
        ],
        slotDuration: '00:50:00',
        businessHours: { startTime: '07:00', endTime: '19:00', daysOfWeek: [1,2,3,4,5,6] },
        professionalLabel: 'Fisioterapeuta',
      }

    case 'ENDOCRINOLOGIA':
      return {
        defaultDuration: 30,
        appointmentTypes: [
          { label: 'Consulta',           duration: 30, color: '#3b82f6' },
          { label: 'Retorno',            duration: 20, color: '#22c55e' },
          { label: 'Revisão de Exames',  duration: 20, color: '#f59e0b' },
        ],
        returnIntervals: [
          { label: '1 mês',    days: 30  },
          { label: '3 meses',  days: 90  },
          { label: '6 meses',  days: 180 },
        ],
        slotDuration: '00:15:00',
        businessHours: { startTime: '08:00', endTime: '17:00', daysOfWeek: [1,2,3,4,5] },
        professionalLabel: 'Endocrinologista',
      }

    case 'NUTRICAO':
      return {
        defaultDuration: 50,
        appointmentTypes: [
          { label: 'Consulta',           duration: 50, color: '#22c55e' },
          { label: 'Retorno',            duration: 30, color: '#3b82f6' },
          { label: 'Avaliação Corporal', duration: 60, color: '#f59e0b' },
        ],
        returnIntervals: [
          { label: '15 dias',  days: 15 },
          { label: '1 mês',    days: 30 },
          { label: '2 meses',  days: 60 },
          { label: '3 meses',  days: 90 },
        ],
        slotDuration: '00:30:00',
        businessHours: { startTime: '08:00', endTime: '18:00', daysOfWeek: [1,2,3,4,5] },
        professionalLabel: 'Nutricionista',
      }

    default: // MEDICA and fallback
      return {
        defaultDuration: 30,
        appointmentTypes: [
          { label: 'Consulta',  duration: 30, color: '#3b82f6' },
          { label: 'Retorno',   duration: 20, color: '#22c55e' },
          { label: 'Exame',     duration: 45, color: '#f59e0b' },
          { label: 'Urgência',  duration: 15, color: '#ef4444' },
        ],
        returnIntervals: [
          { label: '7 dias',    days: 7   },
          { label: '15 dias',   days: 15  },
          { label: '30 dias',   days: 30  },
          { label: '3 meses',   days: 90  },
          { label: '6 meses',   days: 180 },
        ],
        slotDuration: '00:15:00',
        businessHours: { startTime: '08:00', endTime: '18:00', daysOfWeek: [1,2,3,4,5] },
        professionalLabel: 'Médico',
      }
  }
}
