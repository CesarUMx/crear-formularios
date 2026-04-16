import { 
  CheckSquare,
  ListChecks,
  List, 
  Columns, 
  FileText, 
  ArrowDownUp,
} from 'lucide-react';

interface BaseQuestion {
  type: string;
  text: string;
  feedback?: string;
}

interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: { text: string; isCorrect: boolean }[];
}

interface MultipleSelectQuestion extends BaseQuestion {
  type: 'multiple_select';
  options: { text: string; isCorrect: boolean }[];
}

interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  options: { text: string; isCorrect: boolean }[];
}

interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: { left: string; right: string }[];
}

interface FillBlankQuestion extends BaseQuestion {
  type: 'fill_blank';
  blanks: { position: number; correctAnswer: string }[];
}

interface OrderingQuestion extends BaseQuestion {
  type: 'ordering';
  items: { text: string; correctOrder: number }[];
}

type Question = 
  | MultipleChoiceQuestion
  | MultipleSelectQuestion
  | TrueFalseQuestion 
  | MatchingQuestion 
  | FillBlankQuestion
  | OrderingQuestion;

interface QuestionRendererProps {
  question: Question;
  questionNumber: number;
  mode: 'preview' | 'exam' | 'review';
  userAnswer?: any;
  onAnswerChange?: (answer: any) => void;
  showFeedback?: boolean;
}

export default function QuestionRenderer({
  question,
  questionNumber,
  mode,
  userAnswer,
  onAnswerChange,
  showFeedback = false,
}: QuestionRendererProps) {
  const getQuestionIcon = () => {
    const icons = {
      multiple_choice: CheckSquare,
      multiple_select: ListChecks,
      true_false: List,
      matching: Columns,
      fill_blank: FileText,
      ordering: ArrowDownUp,
    };
    const Icon = icons[question.type] || CheckSquare;
    return <Icon className="w-5 h-5" />;
  };

  const getQuestionTypeName = () => {
    const names = {
      multiple_choice: 'Opción Única',
      multiple_select: 'Opción Múltiple',
      true_false: 'Verdadero/Falso',
      matching: 'Relación de Columnas',
      fill_blank: 'Completar Espacios',
      ordering: 'Ordenar/Secuenciar',
    };
    return names[question.type] || 'Pregunta';
  };

  const renderQuestionContent = () => {
    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
        return (
          <div className="space-y-3">
            {question.options.map((option: any, idx) => {
              // Usar el ID de la opción si está disponible, sino usar el índice
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
                    <span className="text-green-600 font-semibold text-sm">✓ Correcta</span>
                  )}
                </label>
              );
            })}
          </div>
        );

      case 'multiple_select':
        const selectedOptions: string[] = Array.isArray(userAnswer) ? userAnswer : [];
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 italic">Selecciona todas las respuestas correctas</p>
            {(question as MultipleSelectQuestion).options.map((option: any, idx) => {
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
                    <span className="text-green-600 font-semibold text-sm">✓ Correcta</span>
                  )}
                </label>
              );
            })}
          </div>
        );

      case 'matching':
        const matchingAnswer = userAnswer as any;
        // Usar columna derecha mezclada si está disponible (modo exam), o la original (preview/review)
        const rightColumn = (question as any).shuffledRightColumn || question.pairs.map((p: any) => p.right);
        
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Relaciona los elementos de ambas columnas:</p>
            <div className="space-y-3">
              {question.pairs.map((pair, idx) => (
                <div key={idx} className={`flex items-center gap-4 p-3 rounded border-2 ${mode === 'preview' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex-1">
                    <span className="font-medium">{idx + 1}.</span> {pair.left}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">→</span>
                    {mode === 'exam' ? (
                      <select
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={matchingAnswer?.[idx] || ''}
                        onChange={(e) => {
                          const newAnswer = [...(matchingAnswer || Array(question.pairs.length).fill(''))];
                          newAnswer[idx] = e.target.value;
                          onAnswerChange?.(newAnswer);
                        }}
                      >
                        <option value="">Selecciona...</option>
                        {rightColumn.map((rightText: string, i: number) => (
                          <option key={i} value={String.fromCharCode(65 + i)}>
                            {String.fromCharCode(65 + i)}. {rightText}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className={`px-3 py-2 rounded border ${mode === 'preview' ? 'bg-white border-green-500 font-semibold text-green-700' : 'bg-white border-gray-300'}`}>
                        {String.fromCharCode(65 + idx)}. {pair.right}
                      </div>
                    )}
                    {mode === 'preview' && (
                      <span className="text-green-600 font-semibold text-sm ml-2">✓ Correcta</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {mode === 'preview' && (
              <p className="text-xs text-green-600 italic font-medium">
                ✓ Respuestas correctas: Cada elemento de la izquierda se empareja con su letra correspondiente
              </p>
            )}
          </div>
        );

      case 'fill_blank':
        const fillBlankAnswer = userAnswer as any || {};
        return (
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-800 leading-relaxed">
                {question.text.split('_____').map((part, idx) => (
                  <span key={idx}>
                    {part}
                    {idx < question.blanks.length && (
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
            {(mode === 'review' || mode === 'preview') && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm font-semibold text-green-800">✓ Respuestas correctas:</p>
                <ul className="mt-2 space-y-1">
                  {question.blanks.map((blank, idx) => (
                    <li key={idx} className="text-sm text-green-700">
                      Espacio {idx + 1}: <strong>{blank.correctAnswer}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'ordering':
        // Usar items mezclados si están disponibles (modo exam), o items ordenados (preview/review)
        const itemsToShow = mode === 'exam' 
          ? ((question as any).shuffledItems || question.items)
          : question.items.sort((a: any, b: any) => (mode === 'review' || mode === 'preview') ? a.correctOrder - b.correctOrder : 0);
        
        const orderingAnswer = userAnswer as number[] || itemsToShow.map((_: any, i: number) => i);
        const orderedItems = mode === 'exam' 
          ? orderingAnswer.map((idx: number) => itemsToShow[idx])
          : itemsToShow;
        
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Ordena los siguientes elementos en la secuencia correcta:</p>
            {mode === 'preview' && (
              <p className="text-xs text-green-600 italic font-medium">
                ✓ Orden correcto mostrado a continuación:
              </p>
            )}
            <div className="space-y-2">
              {orderedItems.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded border-2 ${mode === 'preview' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'}`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-semibold ${mode === 'preview' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {(mode === 'review' || mode === 'preview') ? item.correctOrder : idx + 1}
                  </span>
                  <span className="flex-1">{item.text}</span>
                  {mode === 'preview' && (
                    <span className="text-green-600 font-semibold text-sm">✓</span>
                  )}
                  {mode === 'exam' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (idx > 0) {
                            const newOrder = [...orderingAnswer];
                            [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
                            onAnswerChange?.(newOrder);
                          }
                        }}
                        disabled={idx === 0}
                        className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Subir"
                      >
                        ▲
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
                        className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Bajar"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {mode === 'preview' && (
              <p className="text-xs text-gray-500 italic">
                En el examen, los estudiantes usarán los botones ▲▼ para ordenar los elementos
              </p>
            )}
          </div>
        );

      default:
        return <p className="text-gray-500">Tipo de pregunta no soportado</p>;
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
              {getQuestionIcon()}
              {getQuestionTypeName()}
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{question.text}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {renderQuestionContent()}
      </div>

      {/* Feedback */}
      {showFeedback && question.feedback && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-800 mb-1">Retroalimentación:</p>
          <p className="text-sm text-blue-700">{question.feedback}</p>
        </div>
      )}
    </div>
  );
}
