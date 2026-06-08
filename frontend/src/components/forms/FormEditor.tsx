import { useState, useEffect, useRef, useMemo } from 'react';
import { formService } from '../../lib/formService';
import { api } from '../../lib/api';
import type { QuestionType, SectionInput, QuestionInput, ConditionalLogic, SimpleCondition, FormType, TextValidation } from '../../lib/types';
import { TemplateSelector } from '../templates';
import { PageHeader } from '../common';
import { useColors } from '../../hooks/useColors';
import ConditionalLogicEditor from './ConditionalLogicEditor';
import RegistrationConditionEditor from './RegistrationConditionEditor';
import { 
  Trash2, 
  GripVertical, 
  Save,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  ClipboardList,
  BookOpen,
  ImagePlus,
  X
} from 'lucide-react';

interface ExamOption {
  id: string;
  title: string;
}

interface FormEditorProps {
  formId?: string;
  hideHeader?: boolean;
  initialData?: {
    title: string;
    description?: string;
    templateId?: string;
    formType?: FormType;
    linkedExamId?: string;
    emailQuestionId?: string;
    nameQuestionId?: string;
    allowExemption?: boolean;
    registrationCondition?: SimpleCondition;
    coverImage?: string;
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
  { value: 'BOOLEAN', label: 'Aceptación (Casilla única)' },
];

export default function FormEditor({ formId, hideHeader, initialData }: FormEditorProps) {
  const colors = useColors();
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
            id: `temp-0-0-${Date.now()}`,
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
  const [formType, setFormType] = useState<FormType>(initialData?.formType || 'STANDARD');
  const [linkedExamId, setLinkedExamId] = useState(initialData?.linkedExamId || '');
  const [emailQuestionId, setEmailQuestionId] = useState(initialData?.emailQuestionId || '');
  const [nameQuestionId, setNameQuestionId] = useState(initialData?.nameQuestionId || '');
  const [allowExemption, setAllowExemption] = useState(initialData?.allowExemption || false);
  const [registrationCondition, setRegistrationCondition] = useState<SimpleCondition | undefined>(initialData?.registrationCondition);
  const [availableExams, setAvailableExams] = useState<ExamOption[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState<number[]>([0]);

  // Imagen de portada
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Cargar examenes disponibles
  useEffect(() => {
    if (formType === 'EXAM_REGISTRATION') {
      setLoadingExams(true);
      api.get<any[]>('/exams?limit=100')
        .then(data => {
          const exams = Array.isArray(data) ? data : ((data as any).exams || (data as any).data || []);
          const privateExams = exams.filter((e: any) => e.accessType === 'PRIVATE');
          setAvailableExams(privateExams.map((e: any) => ({ id: e.id, title: e.title })));
        })
        .catch(() => setAvailableExams([]))
        .finally(() => setLoadingExams(false));
    }
  }, [formType]);

  // Asegurar que todas las preguntas tengan ID (temporal o real)
  useEffect(() => {
    setSections(prev => prev.map((section, sIdx) => ({
      ...section,
      questions: section.questions.map((q, qIdx) => ({
        ...q,
        id: q.id || `temp-${sIdx}-${qIdx}-${Date.now()}`
      }))
    })));
  }, []); // Solo al montar

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
    const tempId = `temp-${sectionIndex}-${newSections[sectionIndex].questions.length}-${Date.now()}`;
    newSections[sectionIndex].questions.push({
      id: tempId,
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
      const oldText = question.options[optionIndex]?.text ?? '';
      question.options[optionIndex] = { text: value };

      // Actualizar rule.value en todas las conditionalLogic y registrationCondition
      // que referencien el texto anterior (los valores son textos de opciones)
      if (oldText && oldText !== value) {
        const remapRules = (rules: any[]) =>
          rules.map((rule: any) => {
            if (rule.questionId !== question.id) return rule;
            if (rule.value === oldText) return { ...rule, value };
            if (Array.isArray(rule.value)) {
              return { ...rule, value: rule.value.map((v: string) => v === oldText ? value : v) };
            }
            return rule;
          });

        for (const section of newSections) {
          for (const q of section.questions) {
            if (!q.conditionalLogic) continue;
            const logic = q.conditionalLogic as any;
            if (logic?.rules) logic.rules = remapRules(logic.rules);
          }
        }

        // Actualizar también registrationCondition si referencia esta pregunta
        if (registrationCondition?.rules) {
          setRegistrationCondition(prev => ({
            ...prev!,
            rules: remapRules(prev!.rules)
          }));
        }
      }

      setSections(newSections);
    }
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formId) return;
    setCoverError('');
    setCoverUploading(true);
    try {
      const result = await formService.uploadCoverImage(formId, file);
      setCoverImage(result.coverImageUrl);
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleRemoveCoverImage = async () => {
    if (!formId) return;
    setCoverError('');
    try {
      await formService.deleteCoverImage(formId);
      setCoverImage('');
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : 'Error al eliminar imagen');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = {
        title, description, templateId, formType,
        linkedExamId: formType === 'EXAM_REGISTRATION' ? linkedExamId : undefined,
        emailQuestionId: formType === 'EXAM_REGISTRATION' ? emailQuestionId : undefined,
        nameQuestionId: formType === 'EXAM_REGISTRATION' ? nameQuestionId : undefined,
        allowExemption: formType === 'EXAM_REGISTRATION' ? allowExemption : false,
        registrationCondition: formType === 'EXAM_REGISTRATION' ? registrationCondition : undefined,
        sections
      };

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
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          icon={FileText}
          title={formId ? "Editar Formulario" : "Crear Nuevo Formulario"}
          description={formId ? "Modifica tu formulario existente" : "Diseña tu formulario agregando secciones y preguntas con puntos"}
          primaryColor={colors.primaryColor}
        />
      )}
      
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

      {/* Tipo de Formulario */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Tipo de Formulario</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => { setFormType('STANDARD'); setLinkedExamId(''); }}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
              formType === 'STANDARD'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <ClipboardList className="w-6 h-6 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium text-sm">Formulario Estándar</div>
              <div className="text-xs text-gray-500">Encuestas y captación de datos</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFormType('EXAM_REGISTRATION')}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
              formType === 'EXAM_REGISTRATION'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <BookOpen className="w-6 h-6 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium text-sm">Registro de Examen</div>
              <div className="text-xs text-gray-500">Inscripción con selección de horario</div>
            </div>
          </button>
        </div>

        {/* Configuración EXAM_REGISTRATION */}
        {formType === 'EXAM_REGISTRATION' && (
          <div className="space-y-5 border-t border-purple-100 pt-4">

            {/* Examen vinculado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Examen a vincular *</label>
              {loadingExams ? (
                <div className="text-sm text-gray-500 py-2">Cargando exámenes...</div>
              ) : availableExams.length === 0 ? (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                  No hay exámenes disponibles. Crea un examen primero.
                </div>
              ) : (
                <select
                  value={linkedExamId}
                  onChange={(e) => setLinkedExamId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Selecciona un examen --</option>
                  {availableExams.map(exam => (
                    <option key={exam.id} value={exam.id}>{exam.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Mapeo de campos */}
            {sections.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué pregunta contiene el <strong>email</strong>? *</label>
                  <select
                    value={emailQuestionId}
                    onChange={e => setEmailQuestionId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="">-- Selecciona --</option>
                    {sections.flatMap(s => s.questions).map(q => (
                      <option key={q.id} value={q.id}>{q.text || '(sin texto)'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué pregunta contiene el <strong>nombre</strong>? *</label>
                  <select
                    value={nameQuestionId}
                    onChange={e => setNameQuestionId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="">-- Selecciona --</option>
                    {sections.flatMap(s => s.questions).map(q => (
                      <option key={q.id} value={q.id}>{q.text || '(sin texto)'}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Toggle exencion */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAllowExemption(!allowExemption)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${allowExemption ? 'bg-purple-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${allowExemption ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-700">Permitir solicitud de exencion (sube archivo)</span>
            </div>

            {/* Condicion de registro */}
            <RegistrationConditionEditor
              condition={registrationCondition}
              onChange={setRegistrationCondition}
              allQuestions={sections.flatMap(s => s.questions)}
            />

          </div>
        )}
      </div>

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

        {/* Imagen de portada */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen de Portada (Opcional)
          </label>
          {coverError && (
            <p className="text-red-600 text-xs mb-2">{coverError}</p>
          )}
          {coverImage ? (
            <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={coverImage.startsWith('http') ? coverImage : `http://localhost:3000${coverImage}`}
                alt="Portada del formulario"
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {formId && (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                    className="p-1.5 rounded-lg bg-white shadow text-blue-600 hover:bg-blue-50 transition"
                    title="Cambiar imagen"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRemoveCoverImage}
                  disabled={coverUploading}
                  className="p-1.5 rounded-lg bg-white shadow text-red-600 hover:bg-red-50 transition"
                  title="Eliminar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {!formId ? (
                <p className="text-sm text-gray-500">Guarda el formulario primero para agregar una imagen de portada.</p>
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">La imagen se mostrará en la parte superior del formulario público</p>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
                  >
                    {coverUploading ? 'Subiendo...' : 'Seleccionar imagen'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">JPG, PNG, WebP — máx. 500 KB</p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">Medida recomendada: 1200 × 300 px (proporción 4:1)</p>
                </>
              )}
            </div>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleCoverImageChange}
            className="hidden"
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

                      {/* Text Validation Configuration */}
                      {question.type === 'TEXT' && (
                        <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
                          <h5 className="font-medium text-green-900">Validación de Texto</h5>

                          {/* Input type */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de contenido permitido</label>
                            <select
                              value={question.textValidation?.inputType || 'any'}
                              onChange={(e) =>
                                updateQuestion(sectionIndex, questionIndex, 'textValidation', {
                                  ...question.textValidation,
                                  inputType: e.target.value as TextValidation['inputType']
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="any">Cualquier texto</option>
                              <option value="letters">Solo letras (a-z, A-Z)</option>
                              <option value="numbers">Solo números (0-9)</option>
                              <option value="alphanumeric">Letras y números</option>
                              <option value="email">Correo electrónico</option>
                              <option value="phone">Teléfono</option>
                            </select>
                          </div>

                          {/* Allow special chars */}
                          {['any', 'letters', 'alphanumeric'].includes(question.textValidation?.inputType || 'any') && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={question.textValidation?.allowSpecialChars ?? true}
                                onChange={(e) =>
                                  updateQuestion(sectionIndex, questionIndex, 'textValidation', {
                                    ...question.textValidation,
                                    allowSpecialChars: e.target.checked
                                  })
                                }
                                className="w-4 h-4 rounded border-gray-300 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">Permitir caracteres especiales (!, @, #, etc.)</span>
                            </label>
                          )}

                          {/* Min / Max length */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo de caracteres</label>
                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={question.textValidation?.minLength ?? ''}
                                onChange={(e) =>
                                  updateQuestion(sectionIndex, questionIndex, 'textValidation', {
                                    ...question.textValidation,
                                    minLength: e.target.value ? parseInt(e.target.value) : undefined
                                  })
                                }
                                placeholder="Sin mínimo"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de caracteres</label>
                              <input
                                type="number"
                                min="1"
                                max="9999"
                                value={question.textValidation?.maxLength ?? ''}
                                onChange={(e) =>
                                  updateQuestion(sectionIndex, questionIndex, 'textValidation', {
                                    ...question.textValidation,
                                    maxLength: e.target.value ? parseInt(e.target.value) : undefined
                                  })
                                }
                                placeholder="Sin máximo"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

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

                      {/* Conditional Logic */}
                      <ConditionalLogicEditor
                        logic={question.conditionalLogic}
                        onChange={(logic) => updateQuestion(sectionIndex, questionIndex, 'conditionalLogic', logic)}
                        allQuestions={section.questions}
                        currentQuestionIndex={questionIndex}
                        currentSectionIndex={sectionIndex}
                      />
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
      <div className="flex gap-4 justify-between sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="flex gap-2">
          {formId && (
            <>
              <a
                href={`/admin/forms/${formId}/responses`}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Ver respuestas
              </a>
              <a
                href={`/admin/forms/${formId}/emails`}
                className="px-4 py-2.5 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition font-medium text-sm"
              >
                Correos automáticos
              </a>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <a
            href="/admin"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: colors.primaryColor }}
            className="px-6 py-2.5 text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : formId ? 'Actualizar Formulario' : 'Crear Formulario'}
          </button>
        </div>
      </div>
    </form>
    </div>
  );
}
