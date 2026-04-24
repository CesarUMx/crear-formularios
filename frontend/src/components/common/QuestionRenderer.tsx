import {
  CheckSquare,
  ListChecks,
  List,
  Columns,
  FileText,
  ArrowDownUp,
  Type,
  AlignLeft,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import FileAttachment from './FileAttachment';

// ==================== TIPOS ====================

// Mapeo de tipos normales (UPPERCASE) a tipos internos (lowercase)
const TYPE_MAP: Record<string, string> = {
  RADIO: 'multiple_choice',
  CHECKBOX: 'multiple_select',
  TRUE_FALSE: 'true_false',
  MATCHING: 'matching',
  FILL_BLANK: 'fill_blank',
  ORDERING: 'ordering',
  TEXT: 'text',
  TEXTAREA: 'textarea',
  // IA ya viene en lowercase
  multiple_choice: 'multiple_choice',
  multiple_select: 'multiple_select',
  true_false: 'true_false',
  matching: 'matching',
  fill_blank: 'fill_blank',
  ordering: 'ordering',
};

function normalizeType(type: string): string {
  return TYPE_MAP[type] || type;
}

interface QuestionOption {
  id?: string;
  text: string;
  isCorrect?: boolean;
  order?: number;
}

interface QuestionData {
  type: string;
  text: string;
  helpText?: string;
  feedback?: string;
  points?: number;
  options?: QuestionOption[];
  // Metadata para tipos complejos
  pairs?: { left: string; right: string }[];
  blanks?: { position: number; correctAnswer: string }[];
  items?: { text: string; correctOrder: number }[];
  metadata?: any;
  // Datos mezclados (modo exam)
  shuffledRightColumn?: string[];
  shuffledItems?: any[];
  // Archivo adjunto
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

interface QuestionRendererProps {
  question: QuestionData;
  questionNumber: number;
  mode: 'preview' | 'exam' | 'review';
  userAnswer?: any;
  onAnswerChange?: (answer: any) => void;
  showFeedback?: boolean;
}

// ==================== ICONOS Y NOMBRES ====================

const QUESTION_ICONS: Record<string, any> = {
  multiple_choice: CheckSquare,
  multiple_select: ListChecks,
  true_false: List,
  matching: Columns,
  fill_blank: FileText,
  ordering: ArrowDownUp,
  text: Type,
  textarea: AlignLeft,
};

const QUESTION_NAMES: Record<string, string> = {
  multiple_choice: 'Opcion Unica',
  multiple_select: 'Opcion Multiple',
  true_false: 'Verdadero/Falso',
  matching: 'Relacion de Columnas',
  fill_blank: 'Completar Espacios',
  ordering: 'Ordenar/Secuenciar',
  text: 'Respuesta Corta',
  textarea: 'Respuesta Larga',
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function QuestionRenderer({
  question,
  questionNumber,
  mode,
  userAnswer,
  onAnswerChange,
  showFeedback = false,
}: QuestionRendererProps) {
  const type = normalizeType(question.type);
  const Icon = QUESTION_ICONS[type] || CheckSquare;
  const typeName = QUESTION_NAMES[type] || 'Pregunta';

  // Obtener datos de metadata si existen (para tipos complejos en examen normal)
  const pairs = question.pairs || question.metadata?.pairs || [];
  const blanks = question.blanks || question.metadata?.blanks || [];
  const items = question.items || question.metadata?.items || [];

  const renderContent = () => {
    switch (type) {
      case 'multiple_choice':
      case 'true_false':
        return renderRadioOptions(question.options || [], mode, userAnswer, questionNumber, onAnswerChange);

      case 'multiple_select':
        return renderCheckboxOptions(question.options || [], mode, userAnswer, onAnswerChange);

      case 'matching':
        return renderMatching(pairs, question.shuffledRightColumn, mode, userAnswer, onAnswerChange);

      case 'fill_blank':
        return renderFillBlank(question.text, blanks, mode, userAnswer, onAnswerChange);

      case 'ordering':
        return renderOrdering(items, question.shuffledItems, mode, userAnswer, onAnswerChange);

      case 'text':
        return renderTextInput(mode, userAnswer, onAnswerChange);

      case 'textarea':
        return renderTextarea(mode, userAnswer, onAnswerChange);

      default:
        return <p className="text-gray-500">Tipo de pregunta no soportado: {question.type}</p>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
          {questionNumber}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
              <Icon className="w-4 h-4" />
              {typeName}
            </div>
            {question.points !== undefined && (
              <span className="text-xs text-gray-500">{question.points} pts</span>
            )}
          </div>
          {type !== 'fill_blank' && (
            <h3
              className="text-lg font-semibold text-gray-900 rich-text"
              dangerouslySetInnerHTML={{ __html: question.text }}
            />
          )}
          {question.helpText && (
            <p className="text-sm text-gray-500 mt-1">{question.helpText}</p>
          )}
        </div>
      </div>

      {/* Archivo adjunto de la pregunta */}
      {question.fileUrl && question.fileName && question.fileType && (
        <div className="mb-4">
          <FileAttachment
            fileUrl={question.fileUrl}
            fileName={question.fileName}
            fileType={question.fileType}
          />
        </div>
      )}

      {/* Contenido de la pregunta */}
      <div className="mt-4">
        {renderContent()}
      </div>

      {/* Feedback */}
      {showFeedback && question.feedback && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-800 mb-1">Retroalimentacion:</p>
          <p className="text-sm text-blue-700">{question.feedback}</p>
        </div>
      )}

      {/* Nota para calificacion manual */}
      {mode === 'review' && (type === 'text' || type === 'textarea') && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            La calificacion de preguntas abiertas sera proporcionada por el profesor posteriormente.
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== RENDERIZADO POR TIPO ====================

function renderRadioOptions(
  options: QuestionOption[],
  mode: string,
  userAnswer: any,
  questionNumber: number,
  onAnswerChange?: (answer: any) => void
) {
  return (
    <div className="space-y-3">
      {options.map((option, idx) => {
        const optionId = option.id || String(idx);
        const isSelected = mode === 'preview' ? option.isCorrect : userAnswer === optionId;

        return (
          <label
            key={idx}
            className={`
              flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition
              ${mode === 'exam'
                ? isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                : mode === 'review'
                ? option.isCorrect
                  ? 'border-green-500 bg-green-50'
                  : isSelected
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200'
                : mode === 'preview' && option.isCorrect
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200'
              }
            `}
          >
            <input
              type="radio"
              name={`question-${questionNumber}`}
              checked={isSelected}
              onChange={() => onAnswerChange?.(optionId)}
              disabled={mode !== 'exam'}
              className="mt-1"
            />
            <span className="flex-1">{option.text}</span>
            {(mode === 'review' || mode === 'preview') && option.isCorrect && (
              <span className="text-green-600 font-semibold text-sm">Correcta</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function renderCheckboxOptions(
  options: QuestionOption[],
  mode: string,
  userAnswer: any,
  onAnswerChange?: (answer: any) => void
) {
  const selectedOptions: string[] = Array.isArray(userAnswer) ? userAnswer : [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 italic">Selecciona todas las respuestas correctas</p>
      {options.map((option, idx) => {
        const optionId = option.id || String(idx);
        const isSelected = mode === 'preview' ? option.isCorrect : selectedOptions.includes(optionId);

        return (
          <label
            key={idx}
            className={`
              flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition
              ${mode === 'exam'
                ? isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                : mode === 'review'
                ? option.isCorrect
                  ? 'border-green-500 bg-green-50'
                  : isSelected
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200'
                : mode === 'preview' && option.isCorrect
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200'
              }
            `}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {
                if (mode !== 'exam') return;
                const newSelected = isSelected
                  ? selectedOptions.filter(id => id !== optionId)
                  : [...selectedOptions, optionId];
                onAnswerChange?.(newSelected);
              }}
              disabled={mode !== 'exam'}
              className="mt-1"
            />
            <span className="flex-1">{option.text}</span>
            {(mode === 'review' || mode === 'preview') && option.isCorrect && (
              <span className="text-green-600 font-semibold text-sm">Correcta</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function renderMatching(
  pairs: { left: string; right: string }[],
  shuffledRightColumn: string[] | undefined,
  mode: string,
  userAnswer: any,
  onAnswerChange?: (answer: any) => void
) {
  const matchingAnswer = userAnswer as any;
  const rightColumn = shuffledRightColumn || pairs.map(p => p.right);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Relaciona los elementos de ambas columnas:</p>
      <div className="space-y-3">
        {pairs.map((pair, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-4 p-3 rounded border-2 ${
              mode === 'preview' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex-1">
              <span className="font-medium">{idx + 1}.</span> {pair.left}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">&rarr;</span>
              {mode === 'exam' ? (
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={matchingAnswer?.[idx] || ''}
                  onChange={(e) => {
                    const newAnswer = [...(matchingAnswer || Array(pairs.length).fill(''))];
                    newAnswer[idx] = e.target.value;
                    onAnswerChange?.(newAnswer);
                  }}
                >
                  <option value="">Selecciona...</option>
                  {rightColumn.map((rightText: string, i: number) => (
                    <option key={i} value={rightText}>
                      {String.fromCharCode(65 + i)}. {rightText}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className={`px-3 py-2 rounded border ${
                    mode === 'preview'
                      ? 'bg-white border-green-500 font-semibold text-green-700'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}. {pair.right}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderFillBlank(
  text: string,
  blanks: { position: number; correctAnswer: string }[],
  mode: string,
  userAnswer: any,
  onAnswerChange?: (answer: any) => void
) {
  const fillBlankAnswer = userAnswer || {};

  return (
    <div className="space-y-3">
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-800 leading-relaxed">
          {text.split('_____').map((part, idx) => (
            <span key={idx}>
              {part}
              {idx < blanks.length && (
                <input
                  type="text"
                  value={fillBlankAnswer[idx] || ''}
                  onChange={(e) => {
                    if (mode === 'exam') {
                      const newAnswer = { ...fillBlankAnswer, [idx]: e.target.value };
                      onAnswerChange?.(newAnswer);
                    }
                  }}
                  className="inline-block mx-2 px-3 py-1 border-b-2 border-blue-500 bg-white min-w-[120px] text-center"
                  placeholder="..."
                  disabled={mode !== 'exam'}
                />
              )}
            </span>
          ))}
        </p>
      </div>
      {(mode === 'review' || mode === 'preview') && blanks.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-semibold text-green-800">Respuestas correctas:</p>
          <ul className="mt-2 space-y-1">
            {blanks.map((blank, idx) => (
              <li key={idx} className="text-sm text-green-700">
                Espacio {idx + 1}: <strong>{blank.correctAnswer}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderOrdering(
  items: { text: string; correctOrder: number }[],
  shuffledItems: any[] | undefined,
  mode: string,
  userAnswer: any,
  onAnswerChange?: (answer: any) => void
) {
  const itemsToShow =
    mode === 'exam'
      ? shuffledItems || items
      : [...items].sort((a, b) => a.correctOrder - b.correctOrder);

  const orderingAnswer: number[] = userAnswer || itemsToShow.map((_: any, i: number) => i);
  const orderedItems = mode === 'exam' ? orderingAnswer.map((idx: number) => itemsToShow[idx]) : itemsToShow;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Ordena los siguientes elementos en la secuencia correcta:</p>
      <div className="space-y-2">
        {orderedItems.map((item: any, idx: number) => (
          <div
            key={idx}
            className={`flex items-center gap-3 p-3 rounded border-2 ${
              mode === 'preview' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <span
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-semibold ${
                mode === 'preview' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {mode === 'review' || mode === 'preview' ? item.correctOrder : idx + 1}
            </span>
            <span className="flex-1">{item.text}</span>
            {mode === 'exam' && (
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    if (idx > 0) {
                      const newOrder = [...orderingAnswer];
                      [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
                      onAnswerChange?.(newOrder);
                    }
                  }}
                  disabled={idx === 0}
                  className="p-0.5 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Subir"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (idx < orderedItems.length - 1) {
                      const newOrder = [...orderingAnswer];
                      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                      onAnswerChange?.(newOrder);
                    }
                  }}
                  disabled={idx === orderedItems.length - 1}
                  className="p-0.5 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Bajar"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {mode === 'preview' && (
        <p className="text-xs text-gray-500 italic">
          En el examen, los estudiantes usaran los botones para ordenar los elementos
        </p>
      )}
    </div>
  );
}

function renderTextInput(
  mode: string,
  userAnswer: any,
  onAnswerChange?: (answer: any) => void
) {
  return (
    <div>
      <input
        type="text"
        value={userAnswer || ''}
        onChange={(e) => onAnswerChange?.(e.target.value)}
        disabled={mode !== 'exam'}
        placeholder={mode === 'exam' ? 'Escribe tu respuesta...' : 'Respuesta del estudiante'}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}

function renderTextarea(
  mode: string,
  userAnswer: any,
  onAnswerChange?: (answer: any) => void
) {
  return (
    <div>
      <textarea
        value={userAnswer || ''}
        onChange={(e) => onAnswerChange?.(e.target.value)}
        disabled={mode !== 'exam'}
        placeholder={mode === 'exam' ? 'Escribe tu respuesta...' : 'Respuesta del estudiante'}
        rows={5}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-y"
      />
    </div>
  );
}
