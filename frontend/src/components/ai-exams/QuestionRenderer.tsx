import { 
  CheckSquare, 
  List, 
  Columns, 
  FileText, 
  ArrowDownUp,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Wrench,
  Image as ImageIcon,
  BarChart3,
  CheckCircle,
  XCircle,
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

interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short_answer';
  expectedAnswer: string;
  keywords?: string[];
}

interface EssayQuestion extends BaseQuestion {
  type: 'essay';
  rubric: string[];
}

interface CaseAnalysisQuestion extends BaseQuestion {
  type: 'case_analysis';
  questions: string[];
}

interface ProblemSolvingQuestion extends BaseQuestion {
  type: 'problem_solving';
  solution: {
    steps: string[];
    finalAnswer: string;
  };
}

interface DataInterpretationQuestion extends BaseQuestion {
  type: 'data_interpretation';
  options: { text: string; isCorrect: boolean }[];
}

type Question = 
  | MultipleChoiceQuestion 
  | TrueFalseQuestion 
  | MatchingQuestion 
  | FillBlankQuestion
  | OrderingQuestion
  | ShortAnswerQuestion
  | EssayQuestion
  | CaseAnalysisQuestion
  | ProblemSolvingQuestion
  | DataInterpretationQuestion;

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
      true_false: List,
      matching: Columns,
      fill_blank: FileText,
      ordering: ArrowDownUp,
      short_answer: MessageSquare,
      essay: BookOpen,
      case_analysis: Lightbulb,
      problem_solving: Wrench,
      data_interpretation: BarChart3,
    };
    const Icon = icons[question.type] || CheckSquare;
    return <Icon className="w-5 h-5" />;
  };

  const getQuestionTypeName = () => {
    const names = {
      multiple_choice: 'Opción Múltiple',
      true_false: 'Verdadero/Falso',
      matching: 'Relación de Columnas',
      fill_blank: 'Completar Espacios',
      ordering: 'Ordenar/Secuenciar',
      short_answer: 'Respuesta Corta',
      essay: 'Ensayo',
      case_analysis: 'Análisis de Caso',
      problem_solving: 'Resolución de Problemas',
      data_interpretation: 'Interpretación de Datos',
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

      case 'short_answer':
        return (
          <div className="space-y-3">
            <textarea
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Escribe tu respuesta aquí..."
              disabled={mode !== 'exam'}
            />
            {mode === 'review' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-semibold text-blue-800">Respuesta esperada:</p>
                <p className="mt-1 text-sm text-blue-700">{question.expectedAnswer}</p>
                {question.keywords && question.keywords.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-blue-800">Palabras clave:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {question.keywords.map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-3">
            <textarea
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              rows={8}
              placeholder="Desarrolla tu respuesta aquí..."
              disabled={mode !== 'exam'}
            />
            {(mode === 'preview' || mode === 'review') && question.rubric && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                <p className="text-sm font-semibold text-purple-800">Criterios de evaluación:</p>
                <ul className="mt-2 space-y-1">
                  {question.rubric.map((criterion, idx) => (
                    <li key={idx} className="text-sm text-purple-700 flex items-start gap-2">
                      <span className="text-purple-500">•</span>
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'case_analysis':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800 mb-2">Caso de estudio:</p>
              <p className="text-gray-700 leading-relaxed">{question.text}</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Preguntas a responder:</p>
              {question.questions.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-sm text-gray-700 font-medium">{idx + 1}. {q}</p>
                  <textarea
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    rows={3}
                    placeholder="Tu respuesta..."
                    disabled={mode !== 'exam'}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'problem_solving':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-gray-700 leading-relaxed">{question.text}</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Desarrollo de la solución:</p>
              <textarea
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                rows={6}
                placeholder="Muestra tu proceso de solución paso a paso..."
                disabled={mode !== 'exam'}
              />
            </div>
            {mode === 'review' && question.solution && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-sm font-semibold text-green-800 mb-2">Solución esperada:</p>
                <div className="space-y-2">
                  {question.solution.steps.map((step, idx) => (
                    <p key={idx} className="text-sm text-green-700">
                      <strong>Paso {idx + 1}:</strong> {step}
                    </p>
                  ))}
                  <p className="text-sm text-green-800 font-semibold mt-3">
                    Respuesta final: {question.solution.finalAnswer}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'data_interpretation':
        // Las preguntas de interpretación de datos ahora son de opción múltiple simple
        // El gráfico se renderiza automáticamente antes del QuestionRenderer
        return (
          <div className="space-y-3">
            {(question as DataInterpretationQuestion).options?.map((option, idx) => (
              <label
                key={idx}
                className={`
                  flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition
                  ${mode === 'exam' 
                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    : mode === 'review'
                    ? option.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : userAnswer === idx
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200'
                    : 'border-gray-200'
                  }
                  ${userAnswer === idx && mode === 'exam' ? 'border-blue-500 bg-blue-50' : ''}
                `}
              >
                <input
                  type="radio"
                  name={`question-${questionNumber}`}
                  checked={userAnswer === idx}
                  onChange={() => mode === 'exam' && onAnswerChange?.(idx)}
                  disabled={mode !== 'exam'}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex-1 text-sm text-gray-700">{option.text}</span>
                {mode === 'review' && option.isCorrect && (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
                {mode === 'review' && !option.isCorrect && userAnswer === idx && (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
              </label>
            ))}
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

      {/* Gráfico para data_interpretation (entre pregunta y opciones) */}
      {question.type === 'data_interpretation' && (question as any).chartImage && (
        <div className="my-6 flex justify-center">
          <div className="w-full max-w-2xl p-4 bg-gray-50 rounded-lg border border-gray-200">
            <img 
              src={(question as any).chartImage} 
              alt="Gráfico de datos" 
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}

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
