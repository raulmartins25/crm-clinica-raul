export interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select'
  placeholder?: string
  options?: string[]
  readonly?: boolean
  calculated?: boolean
  colSpan?: 'full'
}

export interface VitalsConfig {
  bloodPressure: boolean
  heartRate: boolean
  temperature: boolean
  weight: boolean
  height: boolean
  oxygenSat: boolean
}

export interface MedicalRecordConfig {
  showVitals: VitalsConfig
  extraSection?: {
    title: string
    fields: FieldConfig[]
  }
}

export function getMedicalRecordConfig(clinicType?: string | null): MedicalRecordConfig {
  switch (clinicType) {
    case 'ODONTOLOGIA':
      return {
        showVitals: { bloodPressure: false, heartRate: false, temperature: true, weight: true, height: true, oxygenSat: false },
        extraSection: {
          title: 'Odontologia',
          fields: [
            { key: 'procedimento', label: 'Procedimento Realizado', type: 'text', placeholder: 'ex: Extração, Canal' },
            { key: 'materiais', label: 'Materiais Utilizados', type: 'text' },
            { key: 'planoTratamento', label: 'Plano de Tratamento', type: 'textarea', colSpan: 'full' },
            { key: 'proximaSessao', label: 'Próxima Sessão', type: 'text' },
          ],
        },
      }

    case 'GINECOLOGIA':
      return {
        showVitals: { bloodPressure: true, heartRate: true, temperature: true, weight: true, height: true, oxygenSat: true },
        extraSection: {
          title: 'Dados Obstétricos',
          fields: [
            { key: 'dum', label: 'DUM (Última Menstruação)', type: 'date' },
            { key: 'dpp', label: 'DPP (Data Provável do Parto)', type: 'date', readonly: true, calculated: true },
            { key: 'semanasGestacao', label: 'Semanas de Gestação', type: 'number', readonly: true, calculated: true },
            { key: 'gpa', label: 'G/P/A', type: 'text', placeholder: 'ex: G2P1A0' },
            { key: 'tipoConsulta', label: 'Tipo de Consulta', type: 'select', options: ['', 'Pré-natal', 'Ginecológica', 'Retorno'] },
            { key: 'papanicolau', label: 'Papanicolau', type: 'select', options: ['', 'Em dia', 'Atrasado', 'Não realizado'] },
          ],
        },
      }

    case 'PEDIATRIA':
      return {
        showVitals: { bloodPressure: true, heartRate: true, temperature: true, weight: true, height: true, oxygenSat: true },
        extraSection: {
          title: 'Dados Pediátricos',
          fields: [
            { key: 'perimetroCefalico', label: 'Perímetro Cefálico (cm)', type: 'number' },
            { key: 'vacinasEmDia', label: 'Vacinas em Dia', type: 'select', options: ['', 'Sim', 'Não', 'Parcial'] },
            { key: 'desenvolvimentoNPM', label: 'Desenvolvimento Neuropsicomotor', type: 'textarea', colSpan: 'full' },
            { key: 'queixaPais', label: 'Queixa dos Pais/Responsáveis', type: 'textarea', colSpan: 'full' },
          ],
        },
      }

    case 'DERMATOLOGIA':
      return {
        showVitals: { bloodPressure: false, heartRate: false, temperature: true, weight: true, height: true, oxygenSat: false },
        extraSection: {
          title: 'Avaliação Dermatológica',
          fields: [
            { key: 'tipoPele', label: 'Tipo de Pele', type: 'select', options: ['', 'Normal', 'Seca', 'Oleosa', 'Mista', 'Sensível'] },
            { key: 'descricaoLesoes', label: 'Descrição das Lesões', type: 'textarea', colSpan: 'full' },
            { key: 'procedimentoEstetico', label: 'Procedimento Estético', type: 'text' },
            { key: 'protocoloUtilizado', label: 'Protocolo Utilizado', type: 'text' },
            { key: 'orientacoesPos', label: 'Orientações Pós-Procedimento', type: 'textarea', colSpan: 'full' },
          ],
        },
      }

    case 'PSICOLOGIA':
      return {
        showVitals: { bloodPressure: false, heartRate: false, temperature: false, weight: false, height: false, oxygenSat: false },
        extraSection: {
          title: 'Evolução de Sessão',
          fields: [
            { key: 'tipoSessao', label: 'Tipo de Sessão', type: 'select', options: ['', 'Individual', 'Casal', 'Familiar', 'Grupo'] },
            { key: 'humorAfeto', label: 'Humor / Afeto', type: 'text' },
            { key: 'escalaAplicada', label: 'Escala Aplicada', type: 'select', options: ['', 'Nenhuma', 'PHQ-9', 'GAD-7', 'Beck', 'BPRS', 'Outra'] },
            { key: 'pontuacaoEscala', label: 'Pontuação', type: 'number' },
            { key: 'hipoteseDiagnostica', label: 'Hipótese Diagnóstica (DSM-5)', type: 'text' },
            { key: 'objetivosProximaSessao', label: 'Objetivos da Próxima Sessão', type: 'textarea', colSpan: 'full' },
          ],
        },
      }

    case 'FISIOTERAPIA':
      return {
        showVitals: { bloodPressure: true, heartRate: true, temperature: true, weight: true, height: true, oxygenSat: true },
        extraSection: {
          title: 'Avaliação Fisioterapêutica',
          fields: [
            { key: 'numeroDaSessao', label: 'Número da Sessão', type: 'number' },
            { key: 'escalaDor', label: 'Escala de Dor (EVA)', type: 'select', options: ['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { key: 'regiaoAnatomica', label: 'Região Anatômica', type: 'text' },
            { key: 'avaliacaoPostural', label: 'Avaliação Postural', type: 'textarea', colSpan: 'full' },
            { key: 'exerciciosPrescritos', label: 'Exercícios Prescritos', type: 'textarea', colSpan: 'full' },
            { key: 'altaPrevista', label: 'Alta Fisioterapêutica Prevista', type: 'date' },
          ],
        },
      }

    case 'ENDOCRINOLOGIA':
      return {
        showVitals: { bloodPressure: true, heartRate: true, temperature: true, weight: true, height: true, oxygenSat: true },
        extraSection: {
          title: 'Exames e Metas',
          fields: [
            { key: 'glicemia', label: 'Glicemia (mg/dL)', type: 'number' },
            { key: 'hba1c', label: 'HbA1c (%)', type: 'number' },
            { key: 'tsh', label: 'TSH (mUI/L)', type: 'number' },
            { key: 't4l', label: 'T4 Livre', type: 'number' },
            { key: 'colesterolTotal', label: 'Colesterol Total', type: 'number' },
            { key: 'triglicerideos', label: 'Triglicerídeos', type: 'number' },
            { key: 'medicacaoAtual', label: 'Medicação Atual', type: 'textarea', colSpan: 'full' },
            { key: 'metaTerapeutica', label: 'Meta Terapêutica', type: 'textarea', colSpan: 'full' },
            { key: 'adesaoTratamento', label: 'Adesão ao Tratamento', type: 'select', options: ['', 'Boa', 'Regular', 'Ruim'] },
          ],
        },
      }

    case 'NUTRICAO':
      return {
        showVitals: { bloodPressure: false, heartRate: false, temperature: false, weight: true, height: true, oxygenSat: false },
        extraSection: {
          title: 'Avaliação Nutricional',
          fields: [
            { key: 'circAbdominal', label: 'Circunferência Abdominal (cm)', type: 'number' },
            { key: 'percentualGordura', label: '% Gordura Corporal', type: 'number' },
            { key: 'imc', label: 'IMC', type: 'number', readonly: true, calculated: true },
            { key: 'objetivo', label: 'Objetivo', type: 'select', options: ['', 'Emagrecimento', 'Ganho de massa', 'Manutenção', 'Saúde geral', 'Reeducação alimentar'] },
            { key: 'restricoesAlimentares', label: 'Restrições / Alergias', type: 'textarea', colSpan: 'full' },
            { key: 'recordatorio24h', label: 'Recordatório 24h', type: 'textarea', colSpan: 'full' },
            { key: 'planoAlimentar', label: 'Plano Alimentar Prescrito', type: 'textarea', colSpan: 'full' },
          ],
        },
      }

    // MEDICA e padrão: todos os sinais vitais, sem seção extra
    default:
      return {
        showVitals: { bloodPressure: true, heartRate: true, temperature: true, weight: true, height: true, oxygenSat: true },
      }
  }
}
