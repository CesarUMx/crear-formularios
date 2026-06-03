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
      // gpt-5.4-mini tiene 128K tokens de output — 50 preguntas ≈ 15K tokens (12% del límite)
      const MAX_QUESTIONS_PER_CALL = 50;
      const ABSOLUTE_MAX = 500;
      // gpt-5.4-mini: contexto 400K tokens → reservar 100K para instrucciones/respuesta
      // 300K tokens × ~4 chars/token = 1,200,000 chars máximo de contenido por llamada
      const MAX_CONTENT_CHARS = 1_200_000;
      // TPM limit de la cuenta: 200K tokens/min
      // Para extractTopics reservamos ~50K tokens para prompt+respuesta → 150K tokens de contenido
      // 150K tokens × 4 chars/token = 600,000 chars máximo para extracción de temas
      const MAX_TOPICS_CHARS = 600_000;

      // Validación de cap absoluto
      if (numberOfQuestions > ABSOLUTE_MAX) {
        throw new Error(
          `El número máximo de preguntas permitido es ${ABSOLUTE_MAX}. Solicitaste ${numberOfQuestions}.`
        );
      }

      // Paso 1: Extraer todos los temas del contenido completo antes de generar
      if (onProgress) {
        onProgress({ percentage: 10, step: 'Analizando contenido y extrayendo temas...' });
      }
      // Para documentos grandes, limitar el contenido enviado a extractTopics
      // al TPM de la cuenta (200K tokens/min) → máximo 600K chars para esa llamada
      const contentForTopics = content.length > MAX_TOPICS_CHARS
        ? this.sampleContent(content, MAX_TOPICS_CHARS)
        : content;
      if (content.length > MAX_TOPICS_CHARS) {
        console.log(`Documento grande (${Math.round(content.length / 1000)}K chars). Usando muestra (${MAX_TOPICS_CHARS / 1000}K chars) para extracción de temas.`);
      }
      const topics = await this.extractTopics(contentForTopics, language);
      console.log(`Temas identificados: ${topics.length} → ${topics.slice(0, 5).join(', ')}${topics.length > 5 ? '...' : ''}`);

      // Validación de cap por contenido
      // Combina dos señales: cantidad de temas Y extensión del contenido
      // - Por temas: 15 preguntas por tema/subtema (cubre temas extensos)
      // - Por extensión: 1 pregunta por cada 500 chars de contenido (~1 página cada 2000 chars)
      // Se toma el mayor de los dos para no penalizar docs con pocos temas pero muy extensos
      if (topics.length > 0) {
        const byTopics = topics.length * 15;
        const byLength = Math.ceil(content.length / 500);
        const contentCapacity = Math.min(ABSOLUTE_MAX, Math.max(byTopics, byLength));
        if (numberOfQuestions > contentCapacity) {
          throw new Error(
            `El contenido proporcionado (${topics.length} temas/subtemas, ~${Math.round(content.length / 2000)} páginas) ` +
            `permite generar un máximo estimado de ${contentCapacity} preguntas únicas sin repetición. ` +
            `Solicitaste ${numberOfQuestions}. Por favor reduce el número de preguntas o proporciona un contenido más extenso.`
          );
        }
      }

      if (onProgress) {
        onProgress({ percentage: 25, step: 'Distribuyendo preguntas por tema...' });
      }

      if (numberOfQuestions > MAX_QUESTIONS_PER_CALL) {
        // Dividir en múltiples llamadas, distribuyendo temas entre lotes
        const numCalls = Math.ceil(numberOfQuestions / MAX_QUESTIONS_PER_CALL);
        const allQuestions: GeneratedQuestion[] = [];
        const coveredTopics: string[] = [];
        let remainingQuestions = numberOfQuestions;

        // Para documentos grandes: dividir el contenido en secciones por lote
        // Así cada lote recibe ~contenido/numCalls chars en lugar del documento completo
        // Ej: 613 págs / 10 lotes = 61 págs por lote ≈ 150K chars → muy por debajo de 400K tokens
        const useContentChunking = content.length > MAX_CONTENT_CHARS;
        const contentChunkSize = useContentChunking ? Math.ceil(content.length / numCalls) : content.length;
        if (useContentChunking) {
          console.log(`Chunking contenido: ${numCalls} lotes × ~${Math.round(contentChunkSize / 1000)}K chars c/u`);
        }

        // Distribuir temas de forma equitativa entre lotes
        const topicsPerBatch = topics.length > 0 ? Math.ceil(topics.length / numCalls) : 0;

        for (let i = 0; i < numCalls; i++) {
          const questionsThisCall = Math.min(remainingQuestions, MAX_QUESTIONS_PER_CALL);
          // Asignar un subconjunto de temas a este lote para forzar cobertura uniforme
          const batchTopics = topicsPerBatch > 0
            ? topics.slice(i * topicsPerBatch, (i + 1) * topicsPerBatch)
            : topics;
          // Contenido para este lote: sección proporcional del documento o contenido completo
          const contentForBatch = useContentChunking
            ? content.slice(i * contentChunkSize, (i + 1) * contentChunkSize)
            : content;

          if (onProgress) {
            const baseProgress = 25;
            const progressRange = 35;
            const pct = baseProgress + Math.round((i / numCalls) * progressRange);
            onProgress({
              percentage: pct,
              step: `Generando lote ${i + 1} de ${numCalls}...`,
              currentQuestion: allQuestions.length,
              totalQuestions: numberOfQuestions,
            });
          }

          const result = await this.generateQuestionsBatch(
            contentForBatch,
            questionsThisCall,
            difficulty,
            topic,
            language,
            questionTypes,
            batchTopics,
            coveredTopics
          );

          // Truncar al número exacto pedido en este lote (OpenAI a veces genera de más)
          const batchResult = result.questions.slice(0, questionsThisCall);
          allQuestions.push(...batchResult);
          coveredTopics.push(...batchTopics);
          remainingQuestions -= batchResult.length;
        }

        if (onProgress) {
          onProgress({ percentage: 60, step: 'Verificando preguntas...' });
        }

        console.log(`Total generadas: ${allQuestions.length} preguntas`);

        return {
          questions: allQuestions,
          totalGenerated: allQuestions.length,
        };
      } else {
        // Una sola llamada
        if (onProgress) {
          onProgress({ percentage: 40, step: 'Generando preguntas...' });
        }

        // Si el contenido supera el límite seguro, muestrearlo
        const contentForSingle = content.length > MAX_CONTENT_CHARS
          ? this.sampleContent(content, MAX_CONTENT_CHARS)
          : content;

        const result = await this.generateQuestionsBatch(
          contentForSingle,
          numberOfQuestions,
          difficulty,
          topic,
          language,
          questionTypes,
          topics,
          []
        );

        if (onProgress) {
          onProgress({ percentage: 60, step: 'Verificando preguntas...' });
        }

        // Truncar al número exacto pedido (OpenAI a veces genera de más)
        const trimmed = result.questions.slice(0, numberOfQuestions);
        console.log(`Total generadas: ${trimmed.length} preguntas`);

        return {
          questions: trimmed,
          totalGenerated: trimmed.length,
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
    topics: string[] = [],
    coveredTopics: string[] = []
  ): Promise<GenerateQuestionsResult> {
    const prompt = this.buildPrompt(content, numberOfQuestions, difficulty, topic, language, questionTypes, topics, coveredTopics);

    console.log(`Solicitando a OpenAI: ${numberOfQuestions} preguntas`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
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
    topics: string[] = [],
    coveredTopics: string[] = []
  ): string {
    const typeInstructions = this.getTypeInstructions(questionTypes);
    const formatExamples = this.getFormatExamples(questionTypes);

    const topicsBlock = topics.length > 0
      ? `**DISTRIBUCIÓN DE TEMAS (OBLIGATORIO):**
Lee y comprende el contenido completo antes de generar preguntas. Distribuye las ${numberOfQuestions} preguntas cubriendo los siguientes temas de forma equilibrada (máximo 2 preguntas por tema, NUNCA 2 preguntas sobre el mismo concepto específico):
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}
${coveredTopics.length > 0 ? `\n**Temas ya cubiertos en lotes anteriores (NO repetir):**\n${coveredTopics.map(t => `- ${t}`).join('\n')}` : ''}`
      : `**Lee el contenido completo y cubre todos sus temas y subtemas de forma equilibrada. NO generes 2 preguntas sobre el mismo concepto específico.**`;

    return `
INSTRUCCIÓN CRÍTICA ABSOLUTA
Debes generar EXACTAMENTE ${numberOfQuestions} preguntas. NO MÁS, NO MENOS.

NÚMERO REQUERIDO: ${numberOfQuestions}
NÚMERO MÍNIMO: ${numberOfQuestions}
NÚMERO MÁXIMO: ${numberOfQuestions}

${topicsBlock}

**REQUISITOS OBLIGATORIOS (INCUMPLIMIENTO = RECHAZO):**
1. EXACTAMENTE ${numberOfQuestions} preguntas en el array "questions"
2. Nivel de dificultad: ${difficulty}
3. Tema general: ${topic}
4. Distribuye equitativamente entre estos tipos: ${questionTypes.join(', ')}
5. Cada pregunta DEBE tener el campo "type" con uno de estos valores: ${questionTypes.join(', ')}
6. Incluye feedback explicativo para cada pregunta
7. Evalúa comprensión, no solo memorización
8. Cada pregunta debe cubrir un concepto o tema DIFERENTE al resto
9. **PROHIBIDO** usar frases como "según el texto", "de acuerdo con el documento", "según el capítulo", "según la página", "en el texto se menciona", "el autor dice", "según la lectura" o cualquier referencia al documento fuente. Las preguntas deben ser INDEPENDIENTES y formuladas como conocimiento directo.

${typeInstructions}

**Contenido completo:**
${content}

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
6. Verifica que ninguna pregunta sea repetida o similar a otra
7. **Revisa cada pregunta**: ¿contiene palabras como "texto", "documento", "capítulo", "página", "según", "el autor", "la lectura"? Si sí, RE-ESCRÍBELA eliminando esa referencia.

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
   * Muestrea el contenido distribuyendo secciones del inicio, medio y fin del documento.
   * Garantiza que los temas de todo el documento queden representados
   * aunque el texto total supere el límite de contexto de la API.
   */
  private sampleContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;

    // Distribuir en 3 secciones: inicio (40%), medio (20%), fin (40%)
    const startSize  = Math.floor(maxChars * 0.40);
    const middleSize = Math.floor(maxChars * 0.20);
    const endSize    = Math.floor(maxChars * 0.40);

    const start  = content.slice(0, startSize);
    const midPos = Math.floor(content.length / 2) - Math.floor(middleSize / 2);
    const middle = content.slice(midPos, midPos + middleSize);
    const end    = content.slice(content.length - endSize);

    const sep = '\n\n[... sección omitida por longitud de documento ...]\n\n';
    console.log(`sampleContent: ${content.length} → ${(start + sep + middle + sep + end).length} chars`);
    return start + sep + middle + sep + end;
  }

  /**
   * Extrae todos los temas y subtemas del contenido para distribuir preguntas de forma uniforme
   */
  async extractTopics(content: string, language: string): Promise<string[]> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de contenido educativo. Tu tarea es identificar de forma exhaustiva TODOS los temas y subtemas de un documento.',
          },
          {
            role: 'user',
            content: `Lee el siguiente contenido completo e identifica TODOS los temas principales y subtemas que abarca. Sé exhaustivo, no omitas ningún tema aunque sea menor.

Responde en ${language} con formato JSON:
{
  "topics": ["Tema principal 1", "Subtema 1.1", "Subtema 1.2", "Tema principal 2", "Subtema 2.1", ...]
}

CONTENIDO:
${content}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) return [];

      const parsed = JSON.parse(responseContent);
      return Array.isArray(parsed.topics) ? parsed.topics : [];
    } catch (error) {
      console.error('Error al extraer temas:', error);
      return []; // Si falla, continuar sin temas (buildPrompt usará el fallback genérico)
    }
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
${content}

**Requisitos OBLIGATORIOS:**
- Tipo de pregunta: ${questionType} (MANTENER EL MISMO TIPO)
- Nivel de dificultad: ${difficulty}
- Enfoque DIFERENTE pero mismo concepto/tema
- NO repitas la pregunta original ni las preguntas existentes
- Incluye feedback explicativo
- La nueva pregunta debe ser única y no similar a las existentes
- DEBE incluir el campo "type": "${questionType}"
- **PROHIBIDO** usar frases como "según el texto", "de acuerdo con el documento", "según el capítulo", "según la página", "en el texto se menciona", "el autor dice", "según la lectura" o cualquier referencia al documento fuente. La pregunta debe ser INDEPENDIENTE y formulada como conocimiento directo.

${typeInstructions}

**Formato de respuesta (JSON):**
{
  ${formatExamples}
}

IMPORTANTE: La pregunta regenerada DEBE mantener el tipo "${questionType}" y seguir su formato específico.
`.trim();

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.4-mini',
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
