import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==================== TIPOS ====================

export interface GenerateQuestionsParams {
  content: string;
  numberOfQuestions: number;
  difficulty?: string;
  topic?: string;
  language?: string;
  questionTypes?: string[];
}

export interface ProgressCallback {
  percentage: number;
  step: string;
  currentQuestion?: number;
  totalQuestions?: number;
}

export interface GeneratedQuestion {
  type: string;
  text: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  pairs?: Array<{ left: string; right: string }>;
  blanks?: Array<{ position: number; correctAnswer: string }>;
  items?: Array<{ text: string; correctOrder: number }>;
  expectedAnswer?: string;
  keywords?: string[];
  rubric?: string[];
  questions?: string[];
  solution?: any;
  imageDescription?: string;
  dataDescription?: string;
  feedback?: string;
  metadata?: any;
}

export interface GenerateQuestionsResult {
  questions: GeneratedQuestion[];
  totalGenerated: number;
}

// ==================== CLASE ====================

class OpenAIService {
  /**
   * Genera preguntas de opción múltiple a partir de un contenido
   */
  async generateQuestions(
    params: GenerateQuestionsParams, 
    onProgress: ((progress: ProgressCallback) => void) | null = null
  ): Promise<GenerateQuestionsResult> {
    const {
      content,
      numberOfQuestions,
      difficulty = 'medium',
      topic = 'general',
      language = 'español',
      questionTypes = ['multiple_choice'],
    } = params;

    try {
      const MAX_QUESTIONS_PER_CALL = 20;
      
      // Pedir N+5 preguntas para asegurar que tengamos suficientes
      const EXTRA_QUESTIONS = 5;
      const questionsToRequest = numberOfQuestions + EXTRA_QUESTIONS;
      
      console.log(`Solicitadas por usuario: ${numberOfQuestions} preguntas`);
      console.log(`Pidiendo a OpenAI: ${questionsToRequest} preguntas (con ${EXTRA_QUESTIONS} extras)`);
      
      if (onProgress) {
        onProgress({
          percentage: 25,
          step: 'Seleccionando preguntas...',
        });
      }
      
      if (questionsToRequest > MAX_QUESTIONS_PER_CALL) {
        // Dividir en múltiples llamadas
        const numCalls = Math.ceil(questionsToRequest / MAX_QUESTIONS_PER_CALL);
        const allQuestions: GeneratedQuestion[] = [];
        let remainingQuestions = questionsToRequest;

        for (let i = 0; i < numCalls; i++) {
          const questionsThisCall = Math.min(remainingQuestions, MAX_QUESTIONS_PER_CALL);

          if (onProgress) {
            const baseProgress = 25;
            const progressRange = 35; // 25% a 60%
            const pct = baseProgress + Math.round((i / numCalls) * progressRange);
            onProgress({
              percentage: pct,
              step: `Generando lote ${i + 1} de ${numCalls}...`,
              currentQuestion: allQuestions.length,
              totalQuestions: numberOfQuestions,
            });
          }

          const result = await this.generateQuestionsBatch(
            content,
            questionsThisCall,
            difficulty,
            topic,
            language,
            questionTypes,
            allQuestions // Pasar preguntas ya generadas para evitar repeticiones
          );

          allQuestions.push(...result.questions);
          remainingQuestions -= result.questions.length;
        }

        if (onProgress) {
          onProgress({
            percentage: 60,
            step: 'Generando opciones de respuesta...',
          });
        }

        // Tomar solo las N preguntas solicitadas por el usuario
        const finalQuestions = allQuestions.slice(0, numberOfQuestions);
        
        console.log(`Generadas: ${allQuestions.length} preguntas`);
        console.log(`Guardando: ${finalQuestions.length} preguntas`);
        
        return {
          questions: finalQuestions,
          totalGenerated: finalQuestions.length,
        };
      } else {
        // Una sola llamada para 20 o menos preguntas (con extras)
        if (onProgress) {
          onProgress({
            percentage: 40,
            step: 'Generando opciones de respuesta...',
          });
        }
        
        const result = await this.generateQuestionsBatch(
          content, 
          questionsToRequest, // Pedir N+5
          difficulty, 
          topic, 
          language, 
          questionTypes
        );
        
        if (onProgress) {
          onProgress({
            percentage: 60,
            step: 'Verificando dificultad...',
          });
        }
        
        // Tomar solo las N preguntas solicitadas por el usuario
        const finalQuestions = result.questions.slice(0, numberOfQuestions);
        
        console.log(`Generadas: ${result.questions.length} preguntas`);
        console.log(`Guardando: ${finalQuestions.length} preguntas`);
        
        return {
          questions: finalQuestions,
          totalGenerated: finalQuestions.length,
        };
      }
    } catch (error: any) {
      console.error('Error al generar preguntas con OpenAI:', error);
      throw new Error(
        error instanceof Error
          ? `Error al generar preguntas: ${error.message}`
          : 'Error desconocido al generar preguntas'
      );
    }
  }

  /**
   * Genera un lote de preguntas (máximo 20)
   */
  async generateQuestionsBatch(
    content: string, 
    numberOfQuestions: number, 
    difficulty: string, 
    topic: string, 
    language: string, 
    questionTypes: string[], 
    existingQuestions: GeneratedQuestion[] = []
  ): Promise<GenerateQuestionsResult> {
    const prompt = this.buildPrompt(content, numberOfQuestions, difficulty, topic, language, questionTypes, existingQuestions);

    console.log(`Solicitando a OpenAI: ${numberOfQuestions} preguntas`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en educación y evaluación académica. DEBES generar EXACTAMENTE el número de preguntas solicitado. Tu tarea es generar preguntas de evaluación de alta calidad basadas en el contenido proporcionado. Las preguntas deben ser claras, precisas y evaluar la comprensión del material. IMPORTANTE: Respeta estrictamente el número de preguntas solicitado.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0].message.content;
    
    if (!responseContent) {
      throw new Error('OpenAI no retornó contenido');
    }

    const parsedResponse = JSON.parse(responseContent);
    
    console.log(`OpenAI respondió con: ${parsedResponse.questions?.length || 0} preguntas`);
    
    // Validar estructura de la respuesta
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error('Formato de respuesta inválido de OpenAI');
    }

    // Si generó más preguntas de las pedidas, truncar (el slice en generateQuestions se encargará)
    // Si generó menos, no pasa nada, el slice tomará las que haya
    const receivedCount = parsedResponse.questions.length;
    const expectedCount = numberOfQuestions;
    
    if (receivedCount !== expectedCount) {
      console.warn(`OpenAI generó ${receivedCount} preguntas (esperadas: ${expectedCount})`);
    }

    const validatedQuestions = parsedResponse.questions.map((q: any, index: number) => {
      if (!q.text || !q.type) {
        throw new Error(`Pregunta ${index + 1} tiene formato inválido (falta text o type)`);
      }

      // Validación específica por tipo
      const questionType = q.type;
      
      // Para tipos con opciones (multiple_choice, multiple_select, true_false)
      if (['multiple_choice', 'multiple_select', 'true_false'].includes(questionType)) {
        if (!q.options || !Array.isArray(q.options)) {
          throw new Error(`Pregunta ${index + 1} de tipo ${questionType} debe tener opciones`);
        }
        const correctCount = q.options.filter((opt: any) => opt.isCorrect).length;
        if (correctCount < 1) {
          throw new Error(`Pregunta ${index + 1} debe tener al menos una respuesta correcta`);
        }
      }

      // Retornar la pregunta completa con todos sus campos
      return {
        type: q.type,
        text: q.text,
        options: q.options || undefined,
        pairs: q.pairs || undefined,
        blanks: q.blanks || undefined,
        items: q.items || undefined,
        feedback: q.feedback || '',
        metadata: q.metadata || undefined,
      };
    });

    console.log(`Validadas ${validatedQuestions.length} preguntas correctamente`);

    return {
      questions: validatedQuestions,
      totalGenerated: validatedQuestions.length,
    };
  }

  /**
   * Construye el prompt para OpenAI
   */
  buildPrompt(
    content: string, 
    numberOfQuestions: number, 
    difficulty: string, 
    topic: string, 
    language: string, 
    questionTypes: string[], 
    existingQuestions: GeneratedQuestion[] = []
  ): string {
    let existingQuestionsText = '';
    if (existingQuestions.length > 0) {
      existingQuestionsText = `\n**IMPORTANTE: Ya se generaron las siguientes preguntas. NO las repitas y genera preguntas sobre OTROS aspectos del contenido:**\n${existingQuestions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}\n`;
    }

    const typeInstructions = this.getTypeInstructions(questionTypes);
    const formatExamples = this.getFormatExamples(questionTypes);

    return `
INSTRUCCIÓN CRÍTICA ABSOLUTA
Debes generar EXACTAMENTE ${numberOfQuestions} preguntas. NO MÁS, NO MENOS.

NÚMERO REQUERIDO: ${numberOfQuestions}
NÚMERO MÍNIMO: ${numberOfQuestions}
NÚMERO MÁXIMO: ${numberOfQuestions}

${existingQuestionsText}

**REQUISITOS OBLIGATORIOS (INCUMPLIMIENTO = RECHAZO):**
1. EXACTAMENTE ${numberOfQuestions} preguntas en el array "questions"
2. Nivel de dificultad: ${difficulty}
3. Tema: ${topic}
4. Distribuye equitativamente entre estos tipos: ${questionTypes.join(', ')}
5. Cada pregunta DEBE tener el campo "type" con uno de estos valores: ${questionTypes.join(', ')}
6. Incluye feedback explicativo para cada pregunta
7. Evalúa comprensión, no solo memorización
8. Cubre diferentes aspectos del contenido

${typeInstructions}

**Contenido:**
${content.substring(0, 8000)} ${content.length > 8000 ? '...(contenido truncado)' : ''}

**Formato de respuesta (JSON):**
{
  "questions": [
    ${formatExamples}
  ]
}

VERIFICACIÓN OBLIGATORIA ANTES DE RESPONDER
1. Cuenta las preguntas en el array "questions"
2. ¿Son EXACTAMENTE ${numberOfQuestions}? 
3. Si no son ${numberOfQuestions}, AJUSTA hasta que sean ${numberOfQuestions}
4. Verifica que cada pregunta tenga el campo "type"
5. Verifica que los tipos estén distribuidos entre: ${questionTypes.join(', ')}

SI NO GENERAS EXACTAMENTE ${numberOfQuestions} PREGUNTAS, LA RESPUESTA SERÁ RECHAZADA

Genera en ${language} EXACTAMENTE ${numberOfQuestions} preguntas ahora.
`.trim();
  }

  /**
   * Obtiene las instrucciones específicas para cada tipo de pregunta
   */
  getTypeInstructions(questionTypes: string[]): string {
    const instructions: Record<string, string> = {
      multiple_choice: '- **Opción Única**: 4 opciones, solo una correcta (radio)',
      multiple_select: '- **Opción Múltiple**: 4-6 opciones, varias correctas (checkbox). DEBE tener entre 2 y 4 opciones correctas',
      true_false: '- **Verdadero/Falso**: 2 opciones (verdadero o falso)',
      matching: '- **Relación de Columnas**: Pares de elementos para emparejar (mínimo 4 pares)',
      fill_blank: '- **Completar Espacios**: Texto con espacios en blanco y respuestas correctas',
      ordering: '- **Ordenar/Secuenciar**: Lista de elementos para ordenar correctamente',

    };

    return questionTypes.map(type => instructions[type] || '').join('\n');
  }

  /**
   * Obtiene ejemplos de formato para cada tipo de pregunta
   */
  getFormatExamples(questionTypes: string[]): string {
    const examples: string[] = [];
    
    if (questionTypes.includes('multiple_choice')) {
      examples.push(`
    {
      "type": "multiple_choice",
      "text": "Pregunta de opción única",
      "options": [
        { "text": "Opción A", "isCorrect": false },
        { "text": "Opción B", "isCorrect": true },
        { "text": "Opción C", "isCorrect": false },
        { "text": "Opción D", "isCorrect": false }
      ],
      "feedback": "Explicación"
    }`);
    }

    if (questionTypes.includes('multiple_select')) {
      examples.push(`
    {
      "type": "multiple_select",
      "text": "Selecciona todas las respuestas correctas",
      "options": [
        { "text": "Opción A", "isCorrect": true },
        { "text": "Opción B", "isCorrect": false },
        { "text": "Opción C", "isCorrect": true },
        { "text": "Opción D", "isCorrect": false },
        { "text": "Opción E", "isCorrect": true }
      ],
      "feedback": "Explicación de por qué A, C y E son correctas"
    }`);
    }

    if (questionTypes.includes('true_false')) {
      examples.push(`
    {
      "type": "true_false",
      "text": "Pregunta de verdadero o falso",
      "options": [
        { "text": "Verdadero", "isCorrect": true },
        { "text": "Falso", "isCorrect": false }
      ],
      "feedback": "Explicación"
    }`);
    }

    if (questionTypes.includes('matching')) {
      examples.push(`
    {
      "type": "matching",
      "text": "Relaciona los elementos de ambas columnas",
      "pairs": [
        { "left": "Elemento 1", "right": "Correspondencia 1" },
        { "left": "Elemento 2", "right": "Correspondencia 2" },
        { "left": "Elemento 3", "right": "Correspondencia 3" },
        { "left": "Elemento 4", "right": "Correspondencia 4" }
      ],
      "feedback": "Explicación de las relaciones correctas"
    }`);
    }

    if (questionTypes.includes('fill_blank')) {
      examples.push(`
    {
      "type": "fill_blank",
      "text": "El proceso de _____ es fundamental para _____",
      "blanks": [
        { "position": 1, "correctAnswer": "fotosíntesis" },
        { "position": 2, "correctAnswer": "la vida en la Tierra" }
      ],
      "feedback": "Explicación"
    }`);
    }

    if (questionTypes.includes('ordering')) {
      examples.push(`
    {
      "type": "ordering",
      "text": "Ordena los siguientes pasos en la secuencia correcta",
      "items": [
        { "text": "Paso 1", "correctOrder": 1 },
        { "text": "Paso 2", "correctOrder": 2 },
        { "text": "Paso 3", "correctOrder": 3 },
        { "text": "Paso 4", "correctOrder": 4 }
      ],
      "feedback": "Explicación del orden correcto"
    }`);
    }

    return examples.join(',');
  }

  /**
   * Regenera una pregunta específica manteniendo su tipo
   */
  async regenerateQuestion(
    originalQuestion: string, 
    content: string, 
    difficulty: string = 'medium', 
    questionType: string = 'multiple_choice', 
    existingQuestions: string[] = []
  ) {
    let existingQuestionsText = '';
    if (existingQuestions.length > 0) {
      existingQuestionsText = `\n**Preguntas que ya existen (NO las repitas):**\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`;
    }

    const typeInstructions = this.getTypeInstructions([questionType]);
    const formatExamples = this.getFormatExamples([questionType]);

    const prompt = `
Regenera la siguiente pregunta con un enfoque COMPLETAMENTE DIFERENTE pero evaluando el mismo concepto o tema.

**Pregunta original a reemplazar:**
${originalQuestion}
${existingQuestionsText}

**Contenido de referencia:**
${content.substring(0, 4000)}

**Requisitos OBLIGATORIOS:**
- Tipo de pregunta: ${questionType} (MANTENER EL MISMO TIPO)
- Nivel de dificultad: ${difficulty}
- Enfoque DIFERENTE pero mismo concepto/tema
- NO repitas la pregunta original ni las preguntas existentes
- Incluye feedback explicativo
- La nueva pregunta debe ser única y no similar a las existentes
- DEBE incluir el campo "type": "${questionType}"

${typeInstructions}

**Formato de respuesta (JSON):**
{
  ${formatExamples}
}

IMPORTANTE: La pregunta regenerada DEBE mantener el tipo "${questionType}" y seguir su formato específico.
`.trim();

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en educación. Regenera preguntas de evaluación manteniendo la calidad y el concepto evaluado.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('No se recibió respuesta de OpenAI');
      }

      const parsedResponse = JSON.parse(responseContent);
      
      return {
        text: parsedResponse.text,
        options: parsedResponse.options,
        feedback: parsedResponse.feedback || '',
      };
    } catch (error) {
      console.error('Error al regenerar pregunta:', error);
      throw new Error('Error al regenerar pregunta con OpenAI');
    }
  }
}

export const openAIService = new OpenAIService();
