import { useState, useEffect } from 'react';
import { FileText, AlertCircle, UserCheck, Clock } from 'lucide-react';
import { analyticsService, type FormResponse, type Pagination, type ResponsesResult } from '../../lib/analyticsService';
import { formatDate } from '../../utils/dateUtils';
import EmptyState from '../common/EmptyState';

interface ResponsesListProps {
  formId: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Extrae el valor mostrable de un answer */
function answerValue(a: FormResponse['answers'][number]): string {
  if (a.selectedOptions.length > 0) return a.selectedOptions.map(o => o.text).join(', ');
  if (a.question.type === 'FILE') return a.fileName ?? '(archivo)';
  return a.textValue ?? '';
}

/** Trunca texto largo */
function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Busca el identificador principal: usa emailQuestionId/nameQuestionId, o hace fallback */
function getIdentifier(
  row: FormResponse,
  emailQId: string | null,
  nameQId: string | null
): { label: string; value: string } | null {
  // Si hay registration, preferir esos datos
  if (row.examRegistration) {
    return { label: 'Correo', value: row.examRegistration.studentEmail };
  }

  // emailQuestionId configurado
  if (emailQId) {
    const a = row.answers.find(a => a.questionId === emailQId);
    const v = a ? answerValue(a) : '';
    if (v) return { label: 'Correo', value: v };
  }

  // nameQuestionId configurado
  if (nameQId) {
    const a = row.answers.find(a => a.questionId === nameQId);
    const v = a ? answerValue(a) : '';
    if (v) return { label: 'Nombre', value: v };
  }

  // Fallback: buscar cualquier answer que parezca email
  const emailAnswer = row.answers.find(a => EMAIL_REGEX.test(a.textValue ?? ''));
  if (emailAnswer) return { label: 'Correo', value: emailAnswer.textValue! };

  // Fallback: primer answer de texto
  const first = row.answers.find(a => a.textValue && a.question.type !== 'BOOLEAN');
  if (first) return { label: first.question.text, value: first.textValue! };

  return null;
}

/** Devuelve las 3 respuestas más relevantes para mostrar en la fila (excluyendo el identificador) */
function getKeyAnswers(
  row: FormResponse,
  emailQId: string | null,
  nameQId: string | null,
  excludeQId?: string | null
): { label: string; value: string }[] {
  const skipIds = new Set([emailQId, nameQId, excludeQId].filter(Boolean) as string[]);

  return row.answers
    .filter(a => !skipIds.has(a.questionId) && a.question.type !== 'FILE')
    .slice(0, 3)
    .map(a => ({ label: a.question.text, value: answerValue(a) }))
    .filter(a => a.value);
}

export default function ResponsesList({ formId }: ResponsesListProps) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [formMeta, setFormMeta] = useState<ResponsesResult['formMeta']>({
    formType: 'STANDARD',
    emailQuestionId: null,
    nameQuestionId: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, pages: 0 });

  useEffect(() => {
    if (formId) loadResponses(1);
  }, [formId]);

  const loadResponses = async (page: number) => {
    try {
      setLoading(true);
      const result = await analyticsService.getFormResponses(formId, page);
      setResponses(result.data);
      setFormMeta(result.formMeta);
      setPagination(result.pagination);
      setError('');
    } catch (err) {
      setError('Error al cargar respuestas');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Error al cargar respuestas"
        description={error}
        buttonText="Reintentar"
        onButtonClick={() => loadResponses(1)}
        primaryColor="#ef4444"
      />
    );
  }

  if (responses.length === 0 && !loading) {
    return (
      <EmptyState
        icon={FileText}
        title="No hay respuestas"
        description="Este formulario aún no ha recibido respuestas."
        primaryColor="#006eff"
      />
    );
  }

  const isExamReg = formMeta.formType === 'EXAM_REGISTRATION';

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">Cargando respuestas…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Folio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-44">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Identificador</th>
                {isExamReg && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Registro</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Respuestas</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {responses.map(row => {
                const identifier = getIdentifier(row, formMeta.emailQuestionId, formMeta.nameQuestionId);
                const keyAnswers = getKeyAnswers(
                  row,
                  formMeta.emailQuestionId,
                  formMeta.nameQuestionId,
                  identifier ? (row.answers.find(a => answerValue(a) === identifier.value)?.questionId ?? null) : null
                );
                const registered = !!row.examRegistration;

                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    {/* Folio */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-700">{row.folio ?? '-'}</span>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {formatDate(row.submittedAt)}
                      </div>
                    </td>

                    {/* Identificador */}
                    <td className="px-4 py-3">
                      {identifier ? (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-gray-400 uppercase tracking-wide leading-none mb-0.5">{identifier.label}</span>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[180px]" title={identifier.value}>
                            {truncate(identifier.value, 28)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Badge registro examen */}
                    {isExamReg && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {registered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <UserCheck className="w-3 h-3" />
                            Registrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                            Sin registro
                          </span>
                        )}
                      </td>
                    )}

                    {/* Respuestas clave */}
                    <td className="px-4 py-3">
                      {/* Para EXAM_REGISTRATION registrado: mostrar horario */}
                      {registered && row.examRegistration?.schedule ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-400 uppercase tracking-wide leading-none">Horario</span>
                          <span className="text-sm text-gray-700">{row.examRegistration.schedule.title}</span>
                        </div>
                      ) : keyAnswers.length > 0 ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {keyAnswers.map((ka, i) => (
                            <div key={i} className="flex flex-col min-w-0">
                              <span className="text-xs text-gray-400 uppercase tracking-wide leading-none">{truncate(ka.label, 20)}</span>
                              <span className="text-sm text-gray-700" title={ka.value}>{truncate(ka.value, 30)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Acción */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <a
                        href={`/admin/forms/${formId}/responses/${row.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver detalle
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>–
            <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de{' '}
            <span className="font-medium">{pagination.total}</span>
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => loadResponses(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Anterior
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.pages || Math.abs(p - pagination.page) <= 1)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="px-2 py-1.5 text-sm text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => loadResponses(p as number)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition ${
                      pagination.page === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => loadResponses(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


interface ResponsesListProps {
  formId: string;
}


