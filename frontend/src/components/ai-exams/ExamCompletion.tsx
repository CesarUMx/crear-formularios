import { CheckCircle, Clock, AlertCircle, TrendingUp, Award } from 'lucide-react';

interface ExamCompletionProps {
  attempt: {
    id: string;
    score: number | null;
    totalCorrect: number;
    totalQuestions: number;
    timeSpent: number;
    passed: boolean | null;
    requiresManualGrading: boolean;
    isGraded: boolean;
    autoScore: number;
    manualScore: number;
  };
  examTitle: string;
  passingScore: number;
  onViewResults?: () => void;
  onReturnHome?: () => void;
}

export default function ExamCompletion({
  attempt,
  examTitle,
  passingScore,
  onViewResults,
  onReturnHome,
}: ExamCompletionProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Vista para exámenes que requieren calificación manual
  if (attempt.requiresManualGrading && !attempt.isGraded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
              <Clock className="w-10 h-10 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Examen Enviado
            </h1>
            <p className="text-lg text-gray-600">
              {examTitle}
            </p>
          </div>

          {/* Mensaje de espera */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">
                  Tu examen está en revisión
                </h3>
                <p className="text-yellow-800 text-sm leading-relaxed">
                  Este examen contiene preguntas que requieren calificación manual por parte del docente.
                  Recibirás una notificación cuando tu calificación esté disponible.
                </p>
              </div>
            </div>
          </div>

          {/* Estadísticas parciales */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Preguntas respondidas</p>
              <p className="text-2xl font-bold text-gray-900">
                {attempt.totalQuestions}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tiempo empleado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(attempt.timeSpent)}
              </p>
            </div>
          </div>

          {/* Botón de retorno */}
          <button
            onClick={onReturnHome}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Vista para exámenes calificados automáticamente
  const percentage = attempt.score || 0;
  const isPassed = attempt.passed || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            isPassed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {isPassed ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <AlertCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPassed ? '¡Felicidades!' : 'Examen Completado'}
          </h1>
          <p className="text-lg text-gray-600">
            {examTitle}
          </p>
        </div>

        {/* Resultado principal */}
        <div className={`rounded-xl p-8 mb-6 ${
          isPassed 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' 
            : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200'
        }`}>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">
              Tu calificación
            </p>
            <p className={`text-6xl font-bold mb-2 ${
              isPassed ? 'text-green-600' : 'text-red-600'
            }`}>
              {percentage.toFixed(1)}%
            </p>
            <p className={`text-lg font-medium ${
              isPassed ? 'text-green-700' : 'text-red-700'
            }`}>
              {isPassed ? 'Aprobado' : 'No aprobado'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Calificación mínima: {passingScore}%
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <TrendingUp className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">Correctas</p>
            <p className="text-xl font-bold text-gray-900">
              {attempt.totalCorrect}/{attempt.totalQuestions}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Clock className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">Tiempo</p>
            <p className="text-xl font-bold text-gray-900">
              {formatTime(attempt.timeSpent)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Award className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">Puntos</p>
            <p className="text-xl font-bold text-gray-900">
              {attempt.autoScore.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-4">
          {onViewResults && (
            <button
              onClick={onViewResults}
              className="flex-1 px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-medium"
            >
              Ver respuestas
            </button>
          )}
          <button
            onClick={onReturnHome}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
