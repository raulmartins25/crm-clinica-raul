export function getDefaultCategories(clinicType: string | null | undefined): string[] {
  switch (clinicType) {
    case 'MEDICA':
      return ['Medicamentos', 'Materiais de Curativo', 'EPI', 'Descartáveis', 'Equipamentos', 'Outros']
    case 'ODONTOLOGIA':
      return ['Materiais Restauradores', 'Anestésicos', 'Descartáveis', 'Instrumentais', 'Radiologia', 'Higiene', 'Outros']
    case 'GINECOLOGIA':
      return ['Medicamentos', 'Descartáveis', 'EPI', 'Materiais de Exame', 'Outros']
    case 'PEDIATRIA':
      return ['Medicamentos Pediátricos', 'Vacinas', 'Descartáveis', 'EPI', 'Outros']
    case 'DERMATOLOGIA':
      return ['Cosméticos', 'Ativos', 'Descartáveis', 'Equipamentos', 'EPI', 'Outros']
    case 'FISIOTERAPIA':
      return ['Materiais de Terapia', 'Eletrodos', 'Géis', 'EPI', 'Equipamentos', 'Outros']
    case 'ENDOCRINOLOGIA':
      return ['Medicamentos', 'Materiais de Coleta', 'Descartáveis', 'EPI', 'Outros']
    case 'NUTRICAO':
      return ['Suplementos', 'Materiais de Avaliação', 'Descartáveis', 'Outros']
    case 'PSICOLOGIA':
      return ['Material de Escritório', 'Testes Psicológicos', 'Outros']
    default:
      return ['Medicamentos', 'Descartáveis', 'EPI', 'Equipamentos', 'Outros']
  }
}

export const STOCK_UNITS = ['unidade', 'caixa', 'frasco', 'ml', 'g', 'comprimido', 'ampola', 'par', 'rolo']
