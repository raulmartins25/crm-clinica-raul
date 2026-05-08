export interface AppointmentTemplateData {
  patientName: string
  doctorName: string
  clinicName: string
  date: string          // e.g. "segunda-feira, 12 de maio"
  time: string          // e.g. "14:30"
  appointmentType: string
}

export interface ReturnTemplateData {
  patientName: string
  clinicName: string
  suggestedDate: string
}

export interface PostTemplateData {
  patientName: string
  doctorName: string
  clinicName: string
  appointmentType: string
}

export interface NotificationTemplates {
  reminder24h: (data: AppointmentTemplateData) => string
  returnSuggestion: (data: ReturnTemplateData) => string
  postAppointment: (data: PostTemplateData) => string
}

export function getNotificationTemplates(clinicType?: string | null): NotificationTemplates {
  switch (clinicType) {
    case 'ODONTOLOGIA':
      return {
        reminder24h: (d) =>
          `Olá, ${d.patientName}! 🦷\n` +
          `Lembrete do seu procedimento odontológico amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `👨‍⚕️ Dr(a). ${d.doctorName}\n` +
          `Procedimento: ${d.appointmentType}\n` +
          `⚠️ Lembre-se de escovar os dentes antes da consulta.\n` +
          `Confirme respondendo *SIM*.`,

        returnSuggestion: (d) =>
          `Olá, ${d.patientName}! 😊\n` +
          `Seu tratamento está progredindo bem! Está na hora de agendar a próxima sessão na ${d.clinicName}.\n` +
          `Entre em contato para marcar seu horário.`,

        postAppointment: (d) =>
          `Olá, ${d.patientName}! 🦷\n` +
          `Obrigado pela sua visita à ${d.clinicName}.\n` +
          `Siga as orientações do Dr(a). ${d.doctorName} para uma recuperação tranquila.\n` +
          `Qualquer dúvida, estamos aqui!`,
      }

    case 'GINECOLOGIA':
      return {
        reminder24h: (d) =>
          `Olá, ${d.patientName}! 🌸\n` +
          `Lembrete da sua consulta amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `👩‍⚕️ Dra. ${d.doctorName}\n` +
          `Tipo: ${d.appointmentType}\n` +
          `Traga seus exames anteriores se houver.\n` +
          `Confirme respondendo *SIM*.`,

        returnSuggestion: (d) =>
          `Olá, ${d.patientName}! 🌸\n` +
          `Seu acompanhamento é muito importante. Entre em contato com a ${d.clinicName} para agendar sua próxima consulta.`,

        postAppointment: (d) =>
          `Olá, ${d.patientName}! 💜\n` +
          `Obrigado pela sua visita à ${d.clinicName}.\n` +
          `Qualquer dúvida ou desconforto, não hesite em nos contatar. Cuide-se! 🌸`,
      }

    case 'PEDIATRIA':
      return {
        reminder24h: (d) =>
          `Olá! 👶\n` +
          `Lembrete da consulta do seu filho(a) amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `👨‍⚕️ Dr(a). ${d.doctorName}\n` +
          `Tipo: ${d.appointmentType}\n` +
          `Traga a caderneta de vacinação.\n` +
          `Confirme respondendo *SIM*.`,

        returnSuggestion: (d) =>
          `Olá! O acompanhamento regular é fundamental para o desenvolvimento saudável.\n` +
          `Entre em contato com a ${d.clinicName} para agendar a próxima consulta de ${d.patientName}.`,

        postAppointment: (d) =>
          `Olá! 💙\n` +
          `Obrigado pela visita à ${d.clinicName}.\n` +
          `Qualquer dúvida sobre ${d.patientName}, estamos à disposição. Cuide bem! 🌟`,
      }

    case 'DERMATOLOGIA':
      return {
        reminder24h: (d) =>
          `Olá, ${d.patientName}! ✨\n` +
          `Lembrete do seu procedimento amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `👨‍⚕️ Dr(a). ${d.doctorName}\n` +
          `Procedimento: ${d.appointmentType}\n` +
          `⚠️ Evite exposição ao sol no dia anterior.\n` +
          `Confirme respondendo *SIM*.`,

        returnSuggestion: (d) =>
          `Olá, ${d.patientName}! ✨\n` +
          `Para melhores resultados, é importante manter o protocolo de acompanhamento.\n` +
          `Entre em contato com a ${d.clinicName} para seu próximo agendamento.`,

        postAppointment: (d) =>
          `Olá, ${d.patientName}! 💆\n` +
          `Obrigado pela sua visita à ${d.clinicName}.\n` +
          `Siga as orientações pós-procedimento do Dr(a). ${d.doctorName}.\n` +
          `Em caso de dúvidas, estamos aqui! ✨`,
      }

    case 'PSICOLOGIA':
      return {
        reminder24h: (d) =>
          `Olá, ${d.patientName}.\n` +
          `Lembramos que você tem sessão amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `Profissional: ${d.doctorName}\n` +
          `Caso precise reagendar, entre em contato com antecedência.\n` +
          `Confirme respondendo *SIM*.`,

        returnSuggestion: (d) =>
          `Olá, ${d.patientName}.\n` +
          `A continuidade do acompanhamento é importante para seu progresso.\n` +
          `Entre em contato com a ${d.clinicName} para agendar sua próxima sessão.`,

        postAppointment: (d) =>
          `Olá, ${d.patientName}.\n` +
          `Obrigado pela sua presença na ${d.clinicName}.\n` +
          `Até o próximo encontro. Cuide-se! 💙`,
      }

    case 'FISIOTERAPIA':
      return {
        reminder24h: (d) =>
          `Olá, ${d.patientName}! 💪\n` +
          `Lembrete da sua sessão amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `Fisioterapeuta: ${d.doctorName}\n` +
          `Vista roupas confortáveis.\n` +
          `Confirme respondendo *SIM*.`,

        returnSuggestion: (d) =>
          `Olá, ${d.patientName}! 💪\n` +
          `A regularidade das sessões é essencial para sua recuperação.\n` +
          `Entre em contato com a ${d.clinicName} para agendar sua próxima sessão.`,

        postAppointment: (d) =>
          `Olá, ${d.patientName}! 💙\n` +
          `Obrigado pela sua dedicação na ${d.clinicName}.\n` +
          `Lembre-se de fazer os exercícios prescritos pelo ${d.doctorName} em casa. 💪`,
      }

    case 'ENDOCRINOLOGIA':
      return {
        reminder24h: (d) =>
          `Olá, ${d.patientName}! \n` +
          `Lembrete da sua consulta amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `👨‍⚕️ Dr(a). ${d.doctorName}\n` +
          `⚠️ Se possuir exames recentes, traga os resultados.\n` +
          `Confirme respondendo *SIM*.`,

        returnSuggestion: (d) =>
          `Olá, ${d.patientName}!\n` +
          `O acompanhamento regular é fundamental para manter suas metas terapêuticas.\n` +
          `Entre em contato com a ${d.clinicName} para seu próximo retorno.`,

        postAppointment: (d) =>
          `Olá, ${d.patientName}! \n` +
          `Obrigado pela sua visita à ${d.clinicName}.\n` +
          `Siga as orientações do Dr(a). ${d.doctorName} e mantenha o controle dos seus exames. Cuide-se! 💙`,
      }

    case 'NUTRICAO':
      return {
        reminder24h: (d) =>
          `Olá, ${d.patientName}! 🥗\n` +
          `Lembrete da sua consulta de nutrição amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `Nutricionista: ${d.doctorName}\n` +
          `📝 Se possível, anote o que comeu hoje para compartilhar na consulta.\n` +
          `Confirme respondendo *SIM*.`,

        returnSuggestion: (d) =>
          `Olá, ${d.patientName}! 🥗\n` +
          `O acompanhamento nutricional regular potencializa seus resultados.\n` +
          `Entre em contato com a ${d.clinicName} para seu próximo retorno.`,

        postAppointment: (d) =>
          `Olá, ${d.patientName}! 💚\n` +
          `Obrigado pela sua visita à ${d.clinicName}.\n` +
          `Siga o plano alimentar do ${d.doctorName} e qualquer dúvida estamos aqui! 🥗`,
      }

    default: // MEDICA and fallback
      return {
        reminder24h: (d) =>
          `Olá, ${d.patientName}! 👋\n` +
          `Lembramos que você tem consulta amanhã na ${d.clinicName}.\n` +
          `📅 ${d.date} às ${d.time}\n` +
          `👨‍⚕️ Dr(a). ${d.doctorName}\n` +
          `Tipo: ${d.appointmentType}\n` +
          `Confirme sua presença respondendo *SIM* ou entre em contato para reagendar.`,

        returnSuggestion: (d) =>
          `Olá, ${d.patientName}! 😊\n` +
          `Sua consulta foi concluída. O médico recomenda um retorno em breve.\n` +
          `Entre em contato com a ${d.clinicName} para agendar seu retorno.`,

        postAppointment: (d) =>
          `Olá, ${d.patientName}! Esperamos que esteja bem.\n` +
          `Obrigado por sua visita à ${d.clinicName}.\n` +
          `Em caso de dúvidas sobre sua consulta, estamos à disposição. Cuide-se! 💙`,
      }
  }
}
