import { useState, useEffect } from 'react';
import { analyticsService, type FormResponse } from '../../lib/analyticsService';
import { formatDate } from '../../utils/dateUtils';

interface ResponseDetailProps {
  formId: string;
  responseId: string;
  response?: FormResponse | null;
}

export default function ResponseDetail({ formId, responseId, response: initialResponse }: ResponseDetailProps) {
  const [response, setResponse] = useState<FormResponse | null>(initialResponse || null);
  const [loading, setLoading] = useState(!initialResponse);
  const [error, setError] = useState('');

  useEffect(() => {
    if (formId && responseId) {
      loadResponse();
    }
  }, [formId, responseId]);

  const loadResponse = async () => {
    try {
      setLoading(true);
      
      const data = await analyticsService.getResponseById(formId, responseId);
      console.log('Respuesta recibida:', data);
      setResponse(data);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Error al cargar la respuesta');
      console.error('Error al cargar respuesta:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="animate-spin h-10 w-10 text-blue-500 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="mt-2 text-sm text-gray-500">Cargando respuesta...</p>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="py-6 text-center bg-red-50 border border-red-200 rounded-lg">
        <svg className="h-10 w-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm text-red-800">{error || 'No se encontró la respuesta'}</p>
        <button 
          onClick={loadResponse} 
          className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Agrupar respuestas por sección
  const answersBySection: Record<string, any[]> = {};
  
  response.answers?.forEach(answer => {
    const sectionId = answer.question?.sectionId || 'sin-seccion';
    if (!answersBySection[sectionId]) {
      answersBySection[sectionId] = [];
    }
    answersBySection[sectionId].push(answer);
  });

  // Renderizar el valor de la respuesta según el tipo de pregunta
  const renderAnswerValue = (answer: any) => {
    if (!answer) return <span className="text-gray-400">Sin respuesta</span>;

    switch (answer.question?.type) {
      case 'TEXT':
      case 'TEXTAREA':
        return <p className="text-gray-800">{answer.textValue || <span className="text-gray-400">Sin respuesta</span>}</p>;
        
      case 'SELECT':
        // Para preguntas de tipo SELECT (selección única en dropdown)
        console.log('Respuesta SELECT:', answer);
        console.log('Texto de respuesta SELECT:', answer.textValue);
        
        // Las respuestas de SELECT se guardan como textAnswer
        if (answer.textValue) {
          return <p className="text-gray-800">{answer.textValue}</p>;
        }
        
        // Si por alguna razón se guardaron como selectedOptions (caso poco probable)
        if (answer.selectedOptions && answer.selectedOptions.length > 0) {
          return <p className="text-gray-800">{answer.selectedOptions[0]?.text || 'Opción no disponible'}</p>;
        }
        
        return <span className="text-gray-400">Sin selección</span>;
        
      case 'RADIO':
        // Para preguntas de tipo RADIO (selección única)
        console.log('Respuesta RADIO:', answer);
        console.log('Opciones seleccionadas:', answer.selectedOptions);
        console.log('Texto de respuesta:', answer.textValue);
        
        // Primero verificar si hay un textValue (forma antigua de guardar respuestas RADIO)
        if (answer.textValue) {
          return <p className="text-gray-800">{answer.textValue}</p>;
        }
        
        // Si no hay textValue, verificar si hay selectedOptions
        if (!answer.selectedOptions || answer.selectedOptions.length === 0) {
          return <span className="text-gray-400">Sin selección</span>;
        }
        
        // Mostrar solo la primera opción seleccionada (debería ser la única)
        return (
          <p className="text-gray-800">
            {answer.selectedOptions[0]?.text || 'Opción no disponible'}
          </p>
        );
        
      case 'CHECKBOX':
        // Para preguntas de tipo CHECKBOX (selección múltiple)
        if (!answer.selectedOptions || answer.selectedOptions.length === 0) {
          return <span className="text-gray-400">Sin selección</span>;
        }
        return (
          <ul className="list-disc pl-5 text-gray-800">
            {answer.selectedOptions.map((option: any) => (
              <li key={option.id}>{option.text}</li>
            ))}
          </ul>
        );
        
      case 'FILE':
        if (!answer.fileUrl) {
          return <span className="text-gray-400">Sin archivo</span>;
        }
        // Modificar la URL para que apunte al backend
        const backendUrl = import.meta.env.PUBLIC_API_URL?.split('/api')[0] || 'http://localhost:3000';
        const fileUrl = answer.fileUrl.startsWith('http') 
          ? answer.fileUrl 
          : `${backendUrl}${answer.fileUrl}`;
          
        return (
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Ver archivo
          </a>
        );
        
      default:
        // Para cualquier otro tipo de pregunta no manejado específicamente
        console.log('Tipo de pregunta no manejado:', answer.question?.type);
        console.log('Datos de respuesta:', answer);
        
        // Intentar mostrar textValue si existe
        if (answer.textValue) {
          return <p className="text-gray-800">{answer.textValue}</p>;
        }
        
        // Intentar mostrar selectedOptions si existen
        if (answer.selectedOptions && answer.selectedOptions.length > 0) {
          return (
            <ul className="list-disc pl-5 text-gray-800">
              {answer.selectedOptions.map((option: any) => (
                <li key={option.id}>{option.text}</li>
              ))}
            </ul>
          );
        }
        
        return <span className="text-gray-400">Formato no soportado</span>;
    }
  };

  return (
    <div>
      {/* Información de la respuesta */}
      <div className="mb-8">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la respuesta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Folio</p>
              <p className="mt-1 text-gray-900 font-semibold">{response.folio || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha de envío</p>
              <p className="mt-1 text-gray-900">{formatDate(response.submittedAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${response.isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {response.isComplete ? 'Completa' : 'Parcial'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">IP</p>
              <p className="mt-1 text-gray-900">{response.ipAddress || 'No disponible'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Respuestas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Respuestas</h2>
        
        {Object.entries(answersBySection).map(([sectionId, answers]) => {
          // Obtener el título de la sección (si está disponible)
          const sectionTitle = answers[0]?.question?.section?.title || 'Sin sección';
          
          return (
            <div key={sectionId} className="mb-8">
              <h3 className="text-md font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
                {sectionTitle}
              </h3>
              
              <div className="space-y-6">
                {answers.sort((a, b) => (a.question?.order || 0) - (b.question?.order || 0)).map(answer => (
                  <div key={answer.id} className="bg-gray-50 p-4 rounded-md">
                    <p className="font-medium text-gray-900 mb-2">
                      {answer.question?.text || 'Pregunta sin texto'}
                      {answer.question?.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <div className="mt-2">
                      {renderAnswerValue(answer)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {Object.keys(answersBySection).length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay respuestas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Esta respuesta no contiene datos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
