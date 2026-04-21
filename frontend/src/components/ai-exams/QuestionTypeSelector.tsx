import { useState } from 'react';
import { useColors } from '../../hooks/useColors';
import { 
  CheckSquare, 
  ListChecks,
  List, 
  Columns, 
  FileText, 
  ArrowDownUp,
} from 'lucide-react';

export interface QuestionType {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
}

interface QuestionTypeSelectorProps {
  onConfirm: (selectedTypes: QuestionType[]) => void;
  onCancel: () => void;
}

export default function QuestionTypeSelector({ onConfirm, onCancel }: QuestionTypeSelectorProps) {
  const colors = useColors();
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    {
      id: 'multiple_choice',
      name: 'Opción Única',
      description: 'Pregunta con 4 opciones, solo una correcta',
      icon: CheckSquare,
      enabled: true,
    },
    {
      id: 'multiple_select',
      name: 'Opción Múltiple',
      description: 'Pregunta con varias respuestas correctas',
      icon: ListChecks,
      enabled: false,
    },
    {
      id: 'true_false',
      name: 'Verdadero / Falso',
      description: 'Pregunta con dos opciones: verdadero o falso',
      icon: List,
      enabled: false,
    },
    {
      id: 'matching',
      name: 'Relación de Columnas',
      description: 'Emparejar elementos de dos columnas',
      icon: Columns,
      enabled: false,
    },
    {
      id: 'fill_blank',
      name: 'Completar Espacios',
      description: 'Completar palabras o frases faltantes',
      icon: FileText,
      enabled: false,
    },
    {
      id: 'ordering',
      name: 'Ordenar / Secuenciar',
      description: 'Ordenar elementos en la secuencia correcta',
      icon: ArrowDownUp,
      enabled: false,
    },
  ]);

  const toggleType = (id: string) => {
    setQuestionTypes(prev =>
      prev.map(type =>
        type.id === id ? { ...type, enabled: !type.enabled } : type
      )
    );
  };

  const handleConfirm = () => {
    const selected = questionTypes.filter(type => type.enabled);
    if (selected.length === 0) {
      alert('Debes seleccionar al menos un tipo de pregunta');
      return;
    }
    onConfirm(selected);
  };

  const selectedCount = questionTypes.filter(t => t.enabled).length;

  return (
    <div className="fixed inset-0 bg-gray-800/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Selecciona los Tipos de Preguntas
          </h2>
          <p className="text-gray-600 mt-2">
            Elige los tipos de preguntas que deseas generar para tu examen. 
            Puedes seleccionar múltiples tipos.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `${colors.primaryColor}15`, color: colors.primaryColor }}>
            {selectedCount} tipo{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Grid de tipos */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questionTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-left
                    ${type.enabled
                      ? 'shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                    }
                  `}
                  style={type.enabled ? { borderColor: colors.primaryColor, backgroundColor: `${colors.primaryColor}10` } : {}}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      p-2 rounded-lg flex-shrink-0
                      ${type.enabled ? 'text-white' : 'bg-gray-100 text-gray-600'}
                    `}
                    style={type.enabled ? { backgroundColor: colors.primaryColor } : {}}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`
                        font-semibold text-sm mb-1
                        ${type.enabled ? '' : 'text-gray-900'}
                      `}
                      style={type.enabled ? { color: colors.primaryColor } : {}}>
                        {type.name}
                      </h3>
                      <p className={`
                        text-xs
                        ${type.enabled ? '' : 'text-gray-600'}
                      `}
                      style={type.enabled ? { color: colors.primaryColor } : {}}>
                        {type.description}
                      </p>
                    </div>
                    {type.enabled && (
                      <div className="flex-shrink-0">
                        <CheckSquare className="w-5 h-5" style={{ color: colors.primaryColor }} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            style={{ backgroundColor: colors.primaryColor }}
            className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            Continuar con {selectedCount} tipo{selectedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
