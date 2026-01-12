import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import ExamEditor from './ExamEditor';
import type { Exam } from '../../lib/types';

interface ExamEditorLoaderProps {
  examId: string;
}

export default function ExamEditorLoader({ examId }: ExamEditorLoaderProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const data = await examService.getExamById(examId);
      setExam(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar examen');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <h3 className="font-semibold text-red-800">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error || 'Examen no encontrado'}</p>
      </div>
    );
  }

  const latestVersion = exam.versions?.[0];
  if (!latestVersion) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4">
        <h3 className="font-semibold text-yellow-800">Advertencia</h3>
        <p className="text-yellow-700 text-sm mt-1">Este examen no tiene versiones</p>
      </div>
    );
  }

  return (
    <ExamEditor
      examId={examId}
      initialData={{
        title: exam.title,
        description: exam.description,
        templateId: exam.templateId,
        timeLimit: exam.timeLimit,
        maxAttempts: exam.maxAttempts,
        passingScore: exam.passingScore,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleOptions: exam.shuffleOptions,
        showResults: exam.showResults,
        allowReview: exam.allowReview,
        sections: latestVersion.sections.map(section => ({
          title: section.title,
          description: section.description,
          questions: section.questions.map(question => ({
            type: question.type,
            text: question.text,
            helpText: question.helpText,
            points: question.points,
            options: question.options?.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            })),
            correctAnswer: question.correctAnswer || undefined,
            feedback: question.feedback || undefined
          }))
        }))
      }}
    />
  );
}
