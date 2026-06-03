import { PrismaClient } from '@prisma/client';
import { evaluateConditionalLogic } from '../utils/conditionalEngine.js';
import type { CurrentAnswers, ConditionalLogic } from '../utils/conditionalEngine.js';
import {
  searchHubSpotObject,
  updateHubSpotObject,
  decryptToken,
} from './hubspotClient.js';

const prisma = new PrismaClient();

interface PropertyMapping {
  hubspotProperty: string;
  sourceType?: 'question' | 'static' | 'exam_date';
  questionId: string;
  staticValue?: string;
  staticIsDate?: boolean;
  staticDateFormat?: 'timestamp_ms' | 'iso' | 'date';
  dateFormat?: 'timestamp_ms' | 'iso' | 'date';
  valueMap?: { when: string; send: string }[];
  // Si se define, solo se mapea si la condición se cumple
  condition?: {
    combinator: 'AND' | 'OR';
    rules: Array<{ questionId: string; operator: string; value?: string | string[] }>;
    action: 'SHOW' | 'HIDE' | 'REQUIRE';
  };
}

/**
 * Construye un mapa questionId -> valor de respuesta para usar con el motor condicional
 */
async function buildAnswerMap(responseId: string): Promise<CurrentAnswers> {
  const answers = await prisma.answer.findMany({
    where: { responseId },
    include: { selectedOptions: { select: { text: true } } },
  });

  const map: CurrentAnswers = {};
  for (const answer of answers) {
    if (answer.selectedOptions.length > 0) {
      map[answer.questionId] = answer.selectedOptions.map((o: { text: string }) => o.text);
    } else if (answer.textValue !== null && answer.textValue !== undefined) {
      map[answer.questionId] = answer.textValue;
    }
  }
  return map;
}

/**
 * Obtiene el valor de texto de una pregunta específica en una respuesta
 */
async function getAnswerValue(responseId: string, questionId: string): Promise<string | null> {
  const answer = await prisma.answer.findUnique({
    where: { responseId_questionId: { responseId, questionId } },
    include: { selectedOptions: { select: { text: true } } },
  });
  if (!answer) return null;
  if (answer.selectedOptions.length > 0) {
    return answer.selectedOptions.map((o: { text: string }) => o.text).join(', ');
  }
  return answer.textValue ?? null;
}

/**
 * Obtiene la fecha de inicio del horario de examen vinculado a una respuesta.
 * Devuelve null si la respuesta no tiene ExamRegistration.
 */
async function getExamDate(
  responseId: string,
  format: 'timestamp_ms' | 'iso' | 'date' = 'timestamp_ms'
): Promise<string | null> {
  const reg = await prisma.examRegistration.findUnique({
    where: { responseId },
    include: { schedule: { select: { startTime: true } } },
  });
  if (!reg) return null;
  const date = reg.schedule.startTime;
  if (format === 'timestamp_ms') return String(date.getTime());
  if (format === 'date') return date.toISOString().slice(0, 10);
  return date.toISOString();
}

/**
 * Dispara la sincronización con HubSpot después de recibir una respuesta de formulario.
 * Es no-bloqueante: los errores se loguean pero no interrumpen el flujo.
 */
export async function syncOnFormSubmit(responseId: string): Promise<void> {
  // Obtener el formId de esta respuesta
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: { formId: true },
  });
  if (!response) return;

  // Buscar configuración HubSpot activa para este formulario
  const config = await prisma.hubSpotConfig.findUnique({
    where: { formId: response.formId },
  });
  if (!config || !config.isActive) return;

  let status: 'SUCCESS' | 'NOT_FOUND' | 'MULTIPLE_MATCHES_USED_LATEST' | 'FAILED' | 'SKIPPED' =
    'FAILED';
  let objectId: string | null = null;
  let message: string | null = null;

  try {
    const accessToken = decryptToken(config.accessTokenEncrypted);
    const objectType = config.objectType.toLowerCase() as 'contacts' | 'deals';

    // Obtener el valor de la pregunta usada como criterio de búsqueda
    const matchValue = await getAnswerValue(responseId, config.matchQuestionId);
    if (!matchValue) {
      status = 'SKIPPED';
      message = `Pregunta de búsqueda (${config.matchQuestionId}) no tiene valor en esta respuesta`;
      return;
    }

    // Buscar en HubSpot
    const searchResult = await searchHubSpotObject(
      objectType,
      config.matchOperator,
      config.matchProperty,
      matchValue,
      accessToken
    );

    if (searchResult.total === 0) {
      status = 'NOT_FOUND';
      message = `No se encontró ningún ${objectType} con ${config.matchProperty} = "${matchValue}"`;
      return;
    }

    // Tomar el primero (ya ordenados por hs_lastmodifieddate DESC)
    const target = searchResult.results[0];
    objectId = target.id;

    if (searchResult.total > 1) {
      status = 'MULTIPLE_MATCHES_USED_LATEST';
      message = `Se encontraron ${searchResult.total} registros, se usó el más reciente (id: ${target.id})`;
    } else {
      status = 'SUCCESS';
    }

    // Construir las propiedades a actualizar según los mappings
    const answerMap = await buildAnswerMap(responseId);
    const mappings = (config.propertyMappings as unknown) as PropertyMapping[];
    const propertiesToUpdate: Record<string, string> = {};

    for (const mapping of mappings) {
      // Si tiene condición, evaluarla
      if (mapping.condition) {
        const isVisible = evaluateConditionalLogic(mapping.condition as ConditionalLogic, answerMap);
        if (!isVisible) continue;
      }

      const srcType = mapping.sourceType ?? 'question';

      if (srcType === 'static') {
        if (mapping.staticValue !== undefined && mapping.staticValue !== '') {
          if (mapping.staticIsDate && mapping.staticValue) {
            const d = mapping.staticValue === '__now__' ? new Date() : new Date(mapping.staticValue);
            const fmt = mapping.staticDateFormat ?? 'timestamp_ms';
            if (fmt === 'timestamp_ms') propertiesToUpdate[mapping.hubspotProperty] = String(d.getTime());
            else if (fmt === 'date') propertiesToUpdate[mapping.hubspotProperty] = d.toISOString().slice(0, 10);
            else propertiesToUpdate[mapping.hubspotProperty] = d.toISOString();
          } else {
            propertiesToUpdate[mapping.hubspotProperty] = mapping.staticValue;
          }
        }
        continue;
      }

      if (srcType === 'exam_date') {
        const dateVal = await getExamDate(responseId, mapping.dateFormat ?? 'timestamp_ms');
        if (dateVal !== null) {
          propertiesToUpdate[mapping.hubspotProperty] = dateVal;
        }
        continue;
      }

      // sourceType === 'question' (default)
      const value = answerMap[mapping.questionId];
      if (value !== undefined && value !== null) {
        const strValue = Array.isArray(value) ? value.join(';') : value;
        if (mapping.valueMap && mapping.valueMap.length > 0) {
          const rule = mapping.valueMap.find((r) => r.when === strValue);
          propertiesToUpdate[mapping.hubspotProperty] = rule ? rule.send : strValue;
        } else {
          propertiesToUpdate[mapping.hubspotProperty] = strValue;
        }
      }
    }

    if (Object.keys(propertiesToUpdate).length > 0) {
      await updateHubSpotObject(objectType, objectId, propertiesToUpdate, accessToken);
    } else {
      message = (message ?? '') + ' | Sin propiedades para actualizar';
    }

    if (status === 'SUCCESS') {
      message = `Objeto ${objectId} actualizado correctamente en HubSpot`;
    }
  } catch (err) {
    status = 'FAILED';
    message = err instanceof Error ? err.message : String(err);
  } finally {
    // Siempre guardar el log (catch para que nunca rompa el flujo)
    await prisma.hubSpotSyncLog
      .create({
        data: {
          configId: config.id,
          responseId,
          status,
          objectId,
          message,
        },
      })
      .catch((_logErr: unknown) => {
        console.error('[hubspot] Error guardando sync log:', _logErr);
      });
  }
}
