import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import { useToast, ToastContainer } from '../common';
import { useColors } from '../../hooks/useColors';
import {
  ClipboardCheck,
  User,
  Calendar,
  FileText,
  Save,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Award,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Answer {
  id: string;
  questionId: string;
  textValue?: string;
  jsonValue?: any;
  pointsEarned?: number;
  isCorrect?: boolean;
  feedback?: string;
  gradedAt?: string;
  question: {
    id: string;
    text: string;
    type: string;
    points: number;
    metadata?: any;
  };
}

interface AttemptDetail {
  id: string;
  examId: string;
  attemptNumber: number;
  studentName: string;
  studentEmail?: string;
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  score?: number;
  maxScore: number;
  passed?: boolean;
  autoGraded?: boolean;
  exam?: {
    id: string;
    title: string;
  };
  answers?: Answer[];
}

interface ExamGradingViewProps {
  examId: string;
  attemptId: string;
}

export default function ExamGradingView({ examId, attemptId }: ExamGradingViewProps) {
  const colors = useColors();
  const toast = useToast();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAttempt();
  }, [examId, attemptId]);

  const loadAttempt = async () => {
    try {
      setLoading(true);
      const data = await examService.getAttemptById(examId, attemptId);
      setAttempt(data);

      // Inicializar scores y feedbacks con valores existentes
      const initialScores: Record<string, number> = {};
      const initialFeedbacks: Record<string, string> = {};
      (data.answers || []).forEach((a: Answer) => {
        if (needsManualGrading(a)) {
          initialScores[a.id] = a.pointsEarned || 0;
          initialFeedbacks[a.id] = a.feedback || '';
        }
      });
      setScores(initialScores);
      setFeedbacks(initialFeedbacks);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al cargar intento');
    } finally {
      setLoading(false);
    }
  };

  const needsManualGrading = (answer: Answer): boolean => {
    const type = answer.question.type?.toUpperCase();
    return type === 'TEXT' || type === 'TEXTAREA';
  };

  const manualAnswers = (attempt?.answers || []).filter(needsManualGrading);
  const currentAnswer = manualAnswers[currentIndex];
  const gradedCount = manualAnswers.filter(a => a.gradedAt).length;
  const allGraded = manualAnswers.length > 0 && manualAnswers.every(a => a.gradedAt || scores[a.id] !== undefined);

  const handleSave = async (answerId: string) => {
    setSaving(true);
    try {
      await examService.gradeQuestionManually(examId, attemptId, answerId, {
        pointsEarned: scores[answerId] || 0,
        feedback: feedbacks[answerId] || undefined,
      });

      // Actualizar estado local
      if (attempt) {
        const updatedAnswers = (attempt.answers || []).map(a =>
          a.id === answerId
            ? { ...a, pointsEarned: scores[answerId], feedback: feedbacks[answerId], gradedAt: new Date().toISOString() }
            : a
        );
        setAttempt({ ...attempt, answers: updatedAnswers });
      }

      toast.success('Guardado', 'Calificacion guardada correctamente');

      // Avanzar si hay mas
      if (currentIndex < manualAnswers.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="text-center py-16 text-gray-600">Intento no encontrado</div>
    );
  }

  // Si no hay preguntas que calificar manualmente, mostrar resumen
  if (manualAnswers.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <a href={`/admin/exams/${examId}/attempts`} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Detalle del Intento</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Estudiante</p>
              <p className="font-medium">{attempt.studentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Puntuacion</p>
              <p className="font-medium">{attempt.score ?? 0} / {attempt.maxScore}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado</p>
              <p className={`font-medium ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                {attempt.passed ? 'Aprobado' : 'No aprobado'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tiempo</p>
              <p className="font-medium">{attempt.timeSpent ? formatTime(attempt.timeSpent) : 'N/A'}</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">Este intento no tiene preguntas que requieran calificacion manual. Todas las preguntas fueron calificadas automaticamente.</p>
          </div>
        </div>

        <a href={`/admin/exams/${examId}/attempts`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4" /> Volver a intentos
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <a href={`/admin/exams/${examId}/attempts`} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calificacion Manual</h1>
              <p className="text-gray-600">{attempt.exam?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <ClipboardCheck className="w-5 h-5" />
            <span className="font-semibold">{gradedCount}/{manualAnswers.length} calificadas</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Estudiante</p>
              <p className="font-medium text-gray-900">{attempt.studentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Fecha de entrega</p>
              <p className="font-medium text-gray-900">{attempt.completedAt ? formatDate(attempt.completedAt) : 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Tiempo empleado</p>
              <p className="font-medium text-gray-900">{attempt.timeSpent ? formatTime(attempt.timeSpent) : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegacion de preguntas */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Pregunta {currentIndex + 1} de {manualAnswers.length}
          </h3>
          <div className="flex gap-2">
            {manualAnswers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-full font-medium transition text-sm ${
                  idx === currentIndex
                    ? 'text-white'
                    : manualAnswers[idx].gradedAt
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={idx === currentIndex ? { backgroundColor: colors.primaryColor } : {}}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pregunta actual */}
      {currentAnswer && (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          {/* Texto de la pregunta */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex-1">
                {currentAnswer.question.text}
              </h3>
              <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                {currentAnswer.question.points} pts
              </div>
            </div>

            {/* Metadata (respuesta esperada, keywords, rubrica) */}
            {currentAnswer.question.metadata?.expectedAnswer && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-1">Respuesta esperada:</p>
                <p className="text-sm text-blue-800">{currentAnswer.question.metadata.expectedAnswer}</p>
              </div>
            )}

            {currentAnswer.question.metadata?.keywords && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-semibold text-purple-900 mb-2">Palabras clave:</p>
                <div className="flex flex-wrap gap-2">
                  {currentAnswer.question.metadata.keywords.map((kw: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {currentAnswer.question.metadata?.rubric && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-900 mb-1">Rubrica:</p>
                <p className="text-sm text-green-800 whitespace-pre-line">{currentAnswer.question.metadata.rubric}</p>
              </div>
            )}
          </div>

          {/* Respuesta del estudiante */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Respuesta del estudiante:
            </label>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-800 whitespace-pre-line">
                {currentAnswer.textValue || 'Sin respuesta'}
              </p>
            </div>
          </div>

          {/* Calificacion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Puntuacion (max: {currentAnswer.question.points})
              </label>
              <input
                type="number"
                min="0"
                max={currentAnswer.question.points}
                step="0.5"
                value={scores[currentAnswer.id] || 0}
                onChange={(e) => setScores(prev => ({ ...prev, [currentAnswer.id]: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!currentAnswer.gradedAt}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Estado</label>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                currentAnswer.gradedAt ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {currentAnswer.gradedAt ? (
                  <><CheckCircle className="w-5 h-5" /><span className="font-medium">Calificada</span></>
                ) : (
                  <><AlertCircle className="w-5 h-5" /><span className="font-medium">Pendiente</span></>
                )}
              </div>
            </div>
          </div>

          {/* Retroalimentacion */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Retroalimentacion para el estudiante
            </label>
            <textarea
              value={feedbacks[currentAnswer.id] || ''}
              onChange={(e) => setFeedbacks(prev => ({ ...prev, [currentAnswer.id]: e.target.value }))}
              rows={3}
              placeholder="Escribe comentarios o sugerencias..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={!!currentAnswer.gradedAt}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            {!currentAnswer.gradedAt && (
              <button
                onClick={() => handleSave(currentAnswer.id)}
                disabled={saving}
                style={{ backgroundColor: colors.primaryColor }}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Guardando...' : 'Guardar calificacion'}
              </button>
            )}

            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
            )}

            {currentIndex < manualAnswers.length - 1 && (
              <button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completar calificacion */}
      {allGraded && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Award className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">
                Todas las preguntas han sido calificadas
              </h3>
              <p className="text-sm text-green-800 mb-4">
                La calificacion del estudiante se ha actualizado automaticamente.
              </p>
              <a
                href={`/admin/exams/${examId}/attempts`}
                style={{ backgroundColor: colors.primaryColor }}
                className="inline-flex items-center gap-2 px-6 py-2 text-white rounded-lg hover:opacity-90 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a intentos
              </a>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
