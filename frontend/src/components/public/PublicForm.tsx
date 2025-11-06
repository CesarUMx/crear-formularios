import { useState, useEffect, useRef } from 'react';
import { publicFormService, type PublicForm, type AnswerInput } from '../../lib/publicFormService';
import { getTemplateById, getDefaultTemplate, type FormTemplate } from '../../lib/templates';
import { templateService } from '../../lib/templateService';
import { getSectionClassName, getInputClassName, getButtonClassName } from '../../lib/templates';
import { draftService } from '../../lib/draftService';
import TemplateWrapper from './templates/TemplateWrapper';
import FileInput from './FileInput';
import { Send, CheckCircle, AlertCircle, Loader, Save } from 'lucide-react';

interface PublicFormProps {
  slug: string;
}

export default function PublicForm({ slug }: PublicFormProps) {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [responseData, setResponseData] = useState<{
    id: string;
    folio: string;
    submittedAt: string;
    formTitle: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Map<string, AnswerInput>>(new Map());
  const [responseId] = useState(() => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDraftMessage, setShowDraftMessage] = useState(false);
  
  // Referencia para el temporizador de guardado automático
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadForm();
  }, [slug]);
  
  // Efecto para guardar automáticamente las respuestas cada 30 segundos
  useEffect(() => {
    if (form && answers.size > 0) {
      // Limpiar el temporizador anterior si existe
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Configurar nuevo temporizador para guardar después de 30 segundos de inactividad
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 30000); // 30 segundos
    }
    
    // Limpiar el temporizador cuando el componente se desmonte
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [answers, form]);

  useEffect(() => {
    if (template) {
      templateService.applyTemplateStyles(template);
    }
    return () => {
      templateService.removeTemplateStyles();
    };
  }, [template]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const data = await publicFormService.getFormBySlug(slug);
      setForm(data);
      
      // Cargar plantilla
      const templateId = (data as any).templateId || 'modern';
      const loadedTemplate = getTemplateById(templateId) || getDefaultTemplate();
      setTemplate(loadedTemplate);
      
      // Verificar si hay un borrador guardado
      const draft = draftService.getDraft(slug);
      if (draft) {
        setHasDraft(true);
        setShowDraftMessage(true);
        setLastSaved(draft.lastUpdated);
        
        // Preguntar al usuario si desea cargar el borrador
        const loadDraft = window.confirm(
          `Encontramos un borrador guardado del ${draft.lastUpdated.toLocaleString()}. ¿Desea cargarlo?`
        );
        
        if (loadDraft) {
          setAnswers(draft.answers);
        } else {
          // Si el usuario no quiere cargar el borrador, lo eliminamos
          draftService.removeDraft(slug);
          setHasDraft(false);
        }
      }
      
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar formulario');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para guardar el borrador actual
  const saveDraft = () => {
    if (form && answers.size > 0) {
      draftService.saveDraft(slug, form.id, form.title, answers);
      setLastSaved(new Date());
      setHasDraft(true);
    }
  };

  const handleTextChange = (questionId: string, value: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      questionId,
      textAnswer: value
    });
    setAnswers(newAnswers);
    
    // Reiniciar el temporizador de guardado automático
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 30000); // 30 segundos
  };

  const handleCheckboxChange = (questionId: string, optionId: string, checked: boolean) => {
    const newAnswers = new Map(answers);
    const current = newAnswers.get(questionId);
    const selectedOptions = current?.selectedOptions || [];

    if (checked) {
      selectedOptions.push(optionId);
    } else {
      const index = selectedOptions.indexOf(optionId);
      if (index > -1) selectedOptions.splice(index, 1);
    }

    newAnswers.set(questionId, {
      questionId,
      selectedOptions
    });
    setAnswers(newAnswers);
    
    // Reiniciar el temporizador de guardado automático
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 30000); // 30 segundos
  };

  const handleFileChange = (questionId: string, fileUrl: string, fileName: string, fileSize: number) => {
    const newAnswers = new Map(answers);
    if (fileUrl) {
      newAnswers.set(questionId, {
        questionId,
        fileUrl,
        fileName,
        fileSize
      });
    } else {
      newAnswers.delete(questionId);
    }
    setAnswers(newAnswers);
    
    // Reiniciar el temporizador de guardado automático
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 30000); // 30 segundos
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validar respuestas
    const validation = publicFormService.validateAnswers(form, answers);
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Iniciar animación de progreso
    setSubmitting(true);
    setError('');
    setSubmitProgress(10); // Iniciar con 10%
    
    // Actualizar progreso cada 200ms
    const updateProgress = () => {
      setSubmitProgress(prev => {
        const newProgress = prev + (90 - prev) * 0.1;
        return newProgress > 90 ? 90 : newProgress;
      });
    };
    
    // Configurar intervalo para actualizar el progreso
    const progressTimer = setInterval(updateProgress, 200);
    
    try {

      const response = await publicFormService.submitResponse({
        formId: form.id,
        versionId: form.version.id,
        answers: Array.from(answers.values())
      });

      setResponseData({
        id: response.id,
        folio: response.folio,
        submittedAt: response.submittedAt,
        formTitle: response.formTitle
      });
      // Detener la animación de progreso y mostrar 100%
      clearInterval(progressTimer);
      setSubmitProgress(100);
      
      // Pequeña pausa para mostrar el 100% antes de mostrar la confirmación
      setTimeout(() => {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Eliminar el borrador cuando se envía exitosamente
        draftService.removeDraft(slug);
        setHasDraft(false);
        setLastSaved(null);
      }, 500);

    } catch (err) {
      // Detener la animación de progreso en caso de error
      clearInterval(progressTimer);
      setSubmitProgress(0);
      setError(err instanceof Error ? err.message : 'Error al enviar respuesta');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: any, sectionIndex: number, questionIndex: number) => {
    const answer = answers.get(question.id);

    switch (question.type) {
      case 'TEXT':
        return (
          <input
            type="text"
            value={answer?.textAnswer || ''}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            placeholder={question.placeholder || ''}
            required={question.isRequired}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            value={answer?.textAnswer || ''}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            placeholder={question.placeholder || ''}
            required={question.isRequired}
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        );

      case 'SELECT':
        return (
          <select
            value={answer?.textAnswer || ''}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            required={question.isRequired}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar...</option>
            {question.options.map((option: any) => (
              <option key={option.id} value={option.text}>
                {option.text}
              </option>
            ))}
          </select>
        );

      case 'RADIO':
        return (
          <div className="space-y-2">
            {question.options.map((option: any) => (
              <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                <input
                  type="radio"
                  name={question.id}
                  value={option.text}
                  checked={answer?.textAnswer === option.text}
                  onChange={(e) => handleTextChange(question.id, e.target.value)}
                  required={question.isRequired}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'CHECKBOX':
        return (
          <div className="space-y-2">
            {question.options.map((option: any) => (
              <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={answer?.selectedOptions?.includes(option.id) || false}
                  onChange={(e) => handleCheckboxChange(question.id, option.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'FILE':
        return (
          <FileInput
            questionId={question.id}
            formId={form!.id}
            responseId={responseId}
            allowedFileTypes={question.allowedFileTypes}
            maxFileSize={question.maxFileSize}
            isRequired={question.isRequired}
            onChange={(url, name, size) => handleFileChange(question.id, url, name, size)}
          />
        );

      default:
        return <p className="text-gray-500">Tipo de pregunta no soportado</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted && responseData) {
    // Formatear fecha
    const submittedDate = new Date(responseData.submittedAt);
    const formattedDate = new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(submittedDate);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Respuesta Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Gracias por completar el formulario. Tu respuesta ha sido registrada exitosamente.
          </p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-left">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Detalles de tu respuesta:</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Folio de respuesta:</p>
                <p className="text-lg font-mono font-semibold text-gray-800">{responseData.folio}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Formulario:</p>
                <p className="font-medium text-gray-800">{responseData.formTitle}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Fecha y hora:</p>
                <p className="font-medium text-gray-800">{formattedDate}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Enviar otra respuesta
            </button>
            
            <button 
              onClick={() => {
                // Copiar folio al portapapeles
                navigator.clipboard.writeText(responseData.folio)
                  .then(() => alert('Folio copiado al portapapeles'))
                  .catch(() => alert('No se pudo copiar el folio'));
              }}
              className="px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copiar Folio
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Guarda tu folio para consultas futuras. Puedes verificar el estado de tu respuesta en cualquier momento.
            </p>
            <a 
              href={`/verificar?folio=${encodeURIComponent(responseData.folio)}`}
              className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium inline-flex items-center gap-1"
              target="_self"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Verificar respuesta
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!form || !template) return null;

  const sectionClass = getSectionClassName(template.sectionStyle);
  const inputClass = getInputClassName(template.inputStyle);
  const buttonClass = getButtonClassName(template.buttonStyle);

  return (
    <TemplateWrapper form={form} template={template}>
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {form.version.sections.map((section, sectionIndex) => (
          <div 
            key={section.id} 
            className={sectionClass}
            style={template.sectionStyle === 'bordered' ? {
              borderLeftColor: sectionIndex % 2 === 0 ? template.secondaryColor : template.primaryColor,
              borderRadius: '0.5rem',
              boxShadow: '1px 4px 8px rgba(0,0,0,0.05)',
            } : {}}
          >
            <h2 className="text-xl font-semibold mb-2" style={{ color: template.primaryColor }}>
              {section.title}
            </h2>
            {section.description && (
              <p className="text-gray-600 mb-6">{section.description}</p>
            )}

            <div className="space-y-6">
              {section.questions.map((question, questionIndex) => (
                <div key={question.id}>
                  <label className="block mb-2">
                    <span className="font-medium" style={{ color: template.textColor }}>
                      {question.text}
                      {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    {question.helpText && (
                      <span className="block text-sm text-gray-500 mt-1">{question.helpText}</span>
                    )}
                  </label>
                  {renderQuestion(question, sectionIndex, questionIndex)}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Submit Button */}
        <div className={template.id === 'academic' ? 'bg-transparent p-6' : sectionClass} style={template.id === 'academic' ? { border: 'none', boxShadow: 'none' } : {}}>
          {/* Mensaje de borrador guardado */}
          {showDraftMessage && hasDraft && lastSaved && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Save className="w-4 h-4" />
                  <span>Borrador guardado automáticamente</span>
                </div>
                <span className="text-xs text-blue-600">
                  Última actualización: {lastSaved.toLocaleTimeString()}
                </span>
                <button 
                  type="button"
                  onClick={() => setShowDraftMessage(false)}
                  className="text-blue-700 hover:text-blue-900"
                  aria-label="Cerrar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Barra de progreso */}
          {submitting && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Enviando respuesta...</span>
                <span>{Math.round(submitProgress)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ 
                    width: `${submitProgress}%`,
                    backgroundColor: template.primaryColor 
                  }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Botón para guardar borrador */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                saveDraft();
                setShowDraftMessage(true);
              }}
              className={`flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition font-medium ${buttonClass}`}
            >
              <Save className="w-5 h-5" />
              Guardar Borrador
            </button>
            
            {/* Botón para enviar respuesta */}
            <button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: template.secondaryColor }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white hover:opacity-90 transition font-medium disabled:opacity-50 text-lg ${buttonClass}`}
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Respuesta
                </>
              )}
            </button>
          </div>
          </div>
        </form>
      </TemplateWrapper>
  );
}
