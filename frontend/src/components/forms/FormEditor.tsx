import { useState } from 'react';
import { formService } from '../../lib/formService';
import type { QuestionType, SectionInput, QuestionInput } from '../../lib/types';
import { TemplateSelector } from '../templates';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface FormEditorProps {
  formId?: string;
  initialData?: {
    title: string;
    description?: string;
    templateId?: string;
    sections: SectionInput[];
  };
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'TEXT', label: 'Texto Corto' },
  { value: 'TEXTAREA', label: 'Texto Largo' },
  { value: 'SELECT', label: 'Selección (Dropdown)' },
  { value: 'RADIO', label: 'Opción Única (Radio)' },
  { value: 'CHECKBOX', label: 'Opción Múltiple (Checkbox)' },
  { value: 'FILE', label: 'Subir Archivo' },
];

export default function FormEditor({ formId, initialData }: FormEditorProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [templateId, setTemplateId] = useState(initialData?.templateId || 'modern');
  const [sections, setSections] = useState<SectionInput[]>(
    initialData?.sections || [
      {
        title: 'Sección 1',
        description: '',
        questions: [
          {
            type: 'TEXT',
            text: '',
            placeholder: '',
            helpText: '',
            isRequired: false,
            options: []
          }
        ]
      }
    ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState<number[]>([0]);

  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        title: `Sección ${sections.length + 1}`,
        description: '',
        questions: [
          {
            type: 'TEXT',
            text: '',
            placeholder: '',
            helpText: '',
            isRequired: false,
            options: []
          }
        ]
      }
    ]);
    setExpandedSections([...expandedSections, sections.length]);
  };

  const removeSection = (index: number) => {
    if (sections.length === 1) {
      alert('Debe haber al menos una sección');
      return;
    }
    setSections(sections.filter((_, i) => i !== index));
    setExpandedSections(expandedSections.filter(i => i !== index));
  };

  const updateSection = (index: number, field: keyof SectionInput, value: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const addQuestion = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions.push({
      type: 'TEXT',
      text: '',
      placeholder: '',
      helpText: '',
      isRequired: false,
      options: []
    });
    setSections(newSections);
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    if (sections[sectionIndex].questions.length === 1) {
      alert('Debe haber al menos una pregunta por sección');
      return;
    }
    const newSections = [...sections];
    newSections[sectionIndex].questions = newSections[sectionIndex].questions.filter(
      (_, i) => i !== questionIndex
    );
    setSections(newSections);
  };

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    field: keyof QuestionInput,
    value: any
  ) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions[questionIndex] = {
      ...newSections[sectionIndex].questions[questionIndex],
      [field]: value
    };

    // Si cambia el tipo y requiere opciones, agregar una opción por defecto
    if (field === 'type' && ['SELECT', 'RADIO', 'CHECKBOX'].includes(value)) {
      if (!newSections[sectionIndex].questions[questionIndex].options?.length) {
        newSections[sectionIndex].questions[questionIndex].options = [{ text: 'Opción 1' }];
      }
    }

    setSections(newSections);
  };

  const addOption = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...sections];
    const question = newSections[sectionIndex].questions[questionIndex];
    if (!question.options) question.options = [];
    question.options.push({ text: `Opción ${question.options.length + 1}` });
    setSections(newSections);
  };

  const removeOption = (sectionIndex: number, questionIndex: number, optionIndex: number) => {
    const newSections = [...sections];
    const question = newSections[sectionIndex].questions[questionIndex];
    if (question.options && question.options.length > 1) {
      question.options = question.options.filter((_, i) => i !== optionIndex);
      setSections(newSections);
    }
  };

  const updateOption = (
    sectionIndex: number,
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const newSections = [...sections];
    const question = newSections[sectionIndex].questions[questionIndex];
    if (question.options) {
      question.options[optionIndex] = { text: value };
      setSections(newSections);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = { title, description, templateId, sections };

      if (formId) {
        await formService.updateForm(formId, data);
        setSuccess('Formulario actualizado exitosamente (nueva versión creada)');
      } else {
        await formService.createForm(data);
        setSuccess('Formulario creado exitosamente');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar formulario');
    } finally {
      setLoading(false);
    }
  };

  const needsOptions = (type: QuestionType) => ['SELECT', 'RADIO', 'CHECKBOX'].includes(type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensajes */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 flex items-start">
          <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      {/* Información del formulario */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Información del Formulario</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título del Formulario *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Encuesta de Satisfacción"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción (Opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe el propósito de este formulario..."
          />
        </div>
      </div>

      {/* Selector de Plantilla */}
      <TemplateSelector
        selectedTemplateId={templateId}
        onSelect={setTemplateId}
      />

      {/* Secciones */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-white rounded-lg shadow">
            {/* Section Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSection(sectionIndex)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {expandedSections.includes(sectionIndex) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
                <GripVertical className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-900">
                  {section.title || `Sección ${sectionIndex + 1}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeSection(sectionIndex)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Eliminar sección"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Section Body */}
            {expandedSections.includes(sectionIndex) && (
              <div className="p-6 space-y-6">
                {/* Section Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título de la Sección *
                    </label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Información Personal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción de la Sección (Opcional)
                    </label>
                    <input
                      type="text"
                      value={section.description || ''}
                      onChange={(e) => updateSection(sectionIndex, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Descripción breve..."
                    />
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Preguntas</h4>
                  
                  {section.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Pregunta {questionIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(sectionIndex, questionIndex)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          title="Eliminar pregunta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Question Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Pregunta *
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) =>
                            updateQuestion(sectionIndex, questionIndex, 'type', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {QUESTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Question Text */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pregunta *
                        </label>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) =>
                            updateQuestion(sectionIndex, questionIndex, 'text', e.target.value)
                          }
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Escribe tu pregunta..."
                        />
                      </div>

                      {/* Placeholder */}
                      {['TEXT', 'TEXTAREA'].includes(question.type) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Placeholder (Opcional)
                          </label>
                          <input
                            type="text"
                            value={question.placeholder || ''}
                            onChange={(e) =>
                              updateQuestion(sectionIndex, questionIndex, 'placeholder', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Texto de ayuda..."
                          />
                        </div>
                      )}

                      {/* Help Text */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Texto de Ayuda (Opcional)
                        </label>
                        <input
                          type="text"
                          value={question.helpText || ''}
                          onChange={(e) =>
                            updateQuestion(sectionIndex, questionIndex, 'helpText', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Información adicional..."
                        />
                      </div>

                      {/* File Configuration */}
                      {question.type === 'FILE' && (
                        <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h5 className="font-medium text-blue-900">Configuración de Archivo</h5>
                          
                          {/* Allowed File Types */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tipos de Archivo Permitidos *
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={question.allowedFileTypes?.includes('IMAGE') || false}
                                  onChange={(e) => {
                                    const current = question.allowedFileTypes?.split(',').map(t => t.trim()).filter(Boolean) || [];
                                    const newTypes = e.target.checked
                                      ? [...current, 'IMAGE']
                                      : current.filter(t => t !== 'IMAGE');
                                    updateQuestion(sectionIndex, questionIndex, 'allowedFileTypes', newTypes.join(','));
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Imágenes (se convertirán a WebP)</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={question.allowedFileTypes?.includes('PDF') || false}
                                  onChange={(e) => {
                                    const current = question.allowedFileTypes?.split(',').map(t => t.trim()).filter(Boolean) || [];
                                    const newTypes = e.target.checked
                                      ? [...current, 'PDF']
                                      : current.filter(t => t !== 'PDF');
                                    updateQuestion(sectionIndex, questionIndex, 'allowedFileTypes', newTypes.join(','));
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">PDF (se comprimirán)</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={question.allowedFileTypes?.includes('EXCEL') || false}
                                  onChange={(e) => {
                                    const current = question.allowedFileTypes?.split(',').map(t => t.trim()).filter(Boolean) || [];
                                    const newTypes = e.target.checked
                                      ? [...current, 'EXCEL']
                                      : current.filter(t => t !== 'EXCEL');
                                    updateQuestion(sectionIndex, questionIndex, 'allowedFileTypes', newTypes.join(','));
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Excel (.xlsx)</span>
                              </label>
                            </div>
                          </div>

                          {/* Max File Size */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tamaño Máximo (MB)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={question.maxFileSize || 10}
                              onChange={(e) =>
                                updateQuestion(sectionIndex, questionIndex, 'maxFileSize', parseInt(e.target.value))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Tamaño máximo permitido por archivo (1-50 MB)
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Options */}
                      {needsOptions(question.type) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opciones *
                          </label>
                          <div className="space-y-2">
                            {question.options?.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) =>
                                    updateOption(sectionIndex, questionIndex, optionIndex, e.target.value)
                                  }
                                  required
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder={`Opción ${optionIndex + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOption(sectionIndex, questionIndex, optionIndex)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Eliminar opción"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(sectionIndex, questionIndex)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              + Agregar Opción
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Required */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${sectionIndex}-${questionIndex}`}
                          checked={question.isRequired}
                          onChange={(e) =>
                            updateQuestion(sectionIndex, questionIndex, 'isRequired', e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`required-${sectionIndex}-${questionIndex}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          Campo obligatorio
                        </label>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addQuestion(sectionIndex)}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition font-medium"
                  >
                    + Agregar Pregunta
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addSection}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition font-medium"
        >
          + Agregar Sección
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <a
          href="/admin"
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Guardando...' : formId ? 'Actualizar Formulario' : 'Crear Formulario'}
        </button>
      </div>
    </form>
  );
}
