import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createRegistration } from './examRegistrationService.js';
import { evaluateCondition, type CurrentAnswers } from '../utils/conditionalEngine.js';
import { sendExamCredentialsEmail } from './emailService.js';
import { dispatchOnFormSubmit, scheduleReminders } from './emailDispatcher.js';
import { syncOnFormSubmit } from './hubspotSyncService.js';

const prisma = new PrismaClient();

/**
 * Genera una contraseña aleatoria de 8 caracteres (letras + numeros)
 */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export interface CreateResponseData {
  formId: string;
  versionId: string;
  answers: Array<{
    questionId: string;
    value: string | string[] | number | null;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
  }>;
  ipAddress?: string;
  userAgent?: string;
  email?: string;
}

export interface ResponseWithRegistration {
  id: string;
  folio: string;
  formTitle: string;
  isExamRegistration: boolean;
  registered?: boolean; // true = se registró, false = condición no cumplida
  registrationSkipReason?: string;
  registration?: {
    id: string;
    scheduleId: string;
    scheduleTitle: string;
    studentName: string;
    studentEmail: string;
    startTime: Date;
    endTime: Date;
    location: string | null;
  };
}

/**
 * Convierte el array de answers al formato CurrentAnswers del conditional engine
 */
function buildAnswersMap(answers: CreateResponseData['answers']): CurrentAnswers {
  const map: CurrentAnswers = {};
  for (const answer of answers) {
    if (answer.questionId.startsWith('_')) continue;
    if (answer.value === null || answer.value === undefined) continue;
    if (Array.isArray(answer.value)) {
      map[answer.questionId] = answer.value;
    } else {
      map[answer.questionId] = String(answer.value);
    }
  }
  return map;
}

/**
 * Crear una respuesta y, si es formulario de registro, crear el registro de examen
 */
export const createResponse = async (data: CreateResponseData): Promise<ResponseWithRegistration> => {
  // Capturamos la contraseña en texto plano para enviarla por email AFUERA de la transaccion
  let plainPassword: string | null = null;
  let examTitleForEmail: string | null = null;
  let examSlugForEmail: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Obtener información del formulario
    const form = await tx.form.findUnique({
      where: { id: data.formId },
      select: {
        id: true,
        title: true,
        formType: true,
        linkedExamId: true,
        emailQuestionId: true,
        nameQuestionId: true,
        registrationCondition: true,
      },
    });

    if (!form) {
      throw new Error('Formulario no encontrado');
    }

    // 2. Validar duplicado por email (si el formulario tiene emailQuestionId configurado)
    if (form.emailQuestionId) {
      const emailAnswer = data.answers.find(a => a.questionId === form.emailQuestionId);
      const submitterEmail = typeof emailAnswer?.value === 'string'
        ? emailAnswer.value.trim().toLowerCase()
        : null;

      if (submitterEmail) {
        const isExamReg = form.formType === 'EXAM_REGISTRATION';
        // Para EXAM_REGISTRATION: solo bloquear si la respuesta previa generó un registro real.
        // Si la condición no se cumplió (sin examRegistration), permitir re-envío.
        // Para STANDARD: bloquear siempre.
        const duplicate = await tx.answer.findFirst({
          where: {
            questionId: form.emailQuestionId,
            textValue: { equals: submitterEmail, mode: 'insensitive' },
            response: {
              formId: data.formId,
              ...(isExamReg ? { examRegistration: { isNot: null } } : {}),
            },
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new Error(
            isExamReg
              ? 'Ya estás registrado al examen con este correo electrónico'
              : 'Ya existe una respuesta registrada con este correo electrónico'
          );
        }
      }
    } else {
      // Fallback para formularios sin emailQuestionId configurado:
      // buscar cualquier respuesta cuyo valor parezca un email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailAnswers = data.answers.filter(
        a => typeof a.value === 'string' && emailRegex.test(a.value.trim())
      );

      for (const ea of emailAnswers) {
        const duplicate = await tx.answer.findFirst({
          where: {
            questionId: ea.questionId,
            textValue: { equals: (ea.value as string).trim(), mode: 'insensitive' },
            response: { formId: data.formId },
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new Error('Ya existe una respuesta registrada con este correo electrónico');
        }
      }
    }

    // 3. Verificar que es EXAM_REGISTRATION
    const isExamRegistration = form.formType === 'EXAM_REGISTRATION';

    // 4. Generar folio único
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const folio = `RES-${dateStr}-${random}`;

    // 4. Extraer datos del estudiante si es registro de examen
    let scheduleId: string | null = null;
    let studentName = '';
    let studentEmail = data.email || '';
    let studentPhone: string | undefined;

    if (isExamRegistration) {
      // Buscar el campo de scheduleId en las respuestas (campo especial)
      const scheduleAnswer = data.answers.find(a => a.questionId === '_scheduleId');
      if (scheduleAnswer && typeof scheduleAnswer.value === 'string') {
        scheduleId = scheduleAnswer.value;
      }

      // Buscar nombre y email en las respuestas
      const version = await tx.formVersion.findUnique({
        where: { id: data.versionId },
        include: {
          sections: {
            include: {
              questions: {
                select: {
                  id: true,
                  type: true,
                  text: true,
                },
              },
            },
          },
        },
      });

      if (version) {
        const questions = version.sections.flatMap(s => s.questions);
        
        // Usar IDs mapeados si existen, si no hacer fallback por regex
        const nameQId = form.nameQuestionId ||
          questions.find(q => /nombre|name|estudiante/i.test(q.text))?.id;
        if (nameQId) {
          const ans = data.answers.find(a => a.questionId === nameQId);
          if (ans && typeof ans.value === 'string') studentName = ans.value;
        }

        const emailQId = form.emailQuestionId ||
          questions.find(q => /email|correo|e-mail/i.test(q.text))?.id;
        if (emailQId) {
          const ans = data.answers.find(a => a.questionId === emailQId);
          if (ans && typeof ans.value === 'string') studentEmail = ans.value;
        }

        const phoneQuestion = questions.find(q =>
          /teléfono|telefono|phone|celular/i.test(q.text)
        );
        if (phoneQuestion) {
          const ans = data.answers.find(a => a.questionId === phoneQuestion.id);
          if (ans && typeof ans.value === 'string') studentPhone = ans.value;
        }
      }

      // Evaluar condicion de registro ANTES de validar scheduleId/nombre/email
      // Si la condicion no se cumple, el formulario se puede enviar sin horario
      const willRegister = evaluateCondition(
        form.registrationCondition as any,
        buildAnswersMap(data.answers)
      );

      if (willRegister) {
        // Solo si el estudiante se va a registrar, verificar que haya examen vinculado
        if (!form.linkedExamId) {
          throw new Error('Este formulario de registro no tiene un examen vinculado');
        }

        // Solo si el estudiante se va a registrar, verificar horario y datos obligatorios
        const linkedExam = await tx.exam.findUnique({
          where: { id: form.linkedExamId! },
          select: { enforceSchedule: true },
        });

        if (linkedExam?.enforceSchedule && !scheduleId) {
          throw new Error('Debe seleccionar un horario para el examen');
        }

        if (!studentName) {
          throw new Error('Debe proporcionar su nombre');
        }

        if (!studentEmail) {
          throw new Error('Debe proporcionar su email');
        }
      }
    }

    // 5. Crear la respuesta
    const response = await tx.response.create({
      data: {
        formId: data.formId,
        formVersionId: data.versionId,
        folio,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        email: data.email,
        isComplete: true,
        completedAt: new Date(),
      },
    });

    // 6. Crear las respuestas individuales
    const answerCreates = data.answers
      .filter(a => !a.questionId.startsWith('_')) // Ignorar campos especiales
      .map(answer => {
        const value = answer.value;
        
        if (value === null || value === undefined) {
          return null;
        }

        if (answer.fileUrl) {
          // Respuesta de tipo archivo
          return tx.answer.create({
            data: {
              responseId: response.id,
              questionId: answer.questionId,
              fileUrl: answer.fileUrl,
              fileName: answer.fileName ?? null,
              fileSize: answer.fileSize ?? null,
            },
          });
        } else if (Array.isArray(value)) {
          // Múltiples opciones seleccionadas
          return tx.answer.create({
            data: {
              responseId: response.id,
              questionId: answer.questionId,
              selectedOptions: {
                connect: value.map(optId => ({ id: optId })),
              },
            },
          });
        } else {
          return tx.answer.create({
            data: {
              responseId: response.id,
              questionId: answer.questionId,
              textValue: typeof value === 'number' ? value.toString() : value,
            },
          });
        }
      })
      .filter(Boolean);

    await Promise.all(answerCreates);

    // 7. Si es EXAM_REGISTRATION, evaluar condición y crear el registro de examen
    let registration = null;
    let registered: boolean | undefined;
    let registrationSkipReason: string | undefined;

    if (isExamRegistration && scheduleId && form.linkedExamId) {
      // Evaluar condición de registro si existe
      const conditionMet = evaluateCondition(
        form.registrationCondition as any,
        buildAnswersMap(data.answers)
      );

      if (!conditionMet) {
        // Condición no cumplida: se guarda la respuesta pero NO se registra al examen
        registered = false;
        registrationSkipReason = 'condition_not_met';
      } else {
        // Verificar que el schedule pertenece al examen vinculado
        const schedule = await tx.examSchedule.findFirst({
          where: {
            id: scheduleId,
            examId: form.linkedExamId,
          },
        });

        if (!schedule) {
          throw new Error('El horario seleccionado no pertenece a este examen');
        }

        // Crear el registro (usando el servicio de registro con el tx actual)
        registration = await createRegistration({
          responseId: response.id,
          scheduleId,
          studentName,
          studentEmail,
          studentPhone,
        }, tx);
        registered = true;

        // Crear o actualizar ExamStudent con contraseña autogenerada
        const rawPassword = generatePassword();
        plainPassword = rawPassword;
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        await tx.examStudent.upsert({
          where: {
            examId_email: {
              examId: form.linkedExamId!,
              email: studentEmail,
            },
          },
          create: {
            examId: form.linkedExamId!,
            name: studentName,
            email: studentEmail,
            password: hashedPassword,
            isActive: true,
          },
          update: {
            name: studentName,
            password: hashedPassword,
            isActive: true,
          },
        });

        // Guardamos datos del examen para el email (fuera de la transaccion)
        const exam = await tx.exam.findUnique({
          where: { id: form.linkedExamId! },
          select: { title: true, slug: true },
        });
        examTitleForEmail = exam?.title ?? form.title;
        examSlugForEmail = exam?.slug ?? null;
      }
    }

    return {
      id: response.id,
      folio: response.folio!,
      formTitle: form.title,
      isExamRegistration,
      registered,
      registrationSkipReason,
      registration: registration ? {
        id: registration.id,
        scheduleId: registration.scheduleId,
        scheduleTitle: registration.schedule.title,
        studentName: registration.studentName,
        studentEmail: registration.studentEmail,
        startTime: registration.schedule.startTime,
        endTime: registration.schedule.endTime,
        location: registration.schedule.location,
      } : undefined,
    };
  }, {
    maxWait: 5000,
    timeout: 10000,
  });

  // Enviar email con credenciales DESPUES de confirmar la transaccion
  if (result.registered && result.registration && plainPassword) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
    const examUrl = examSlugForEmail
      ? `${frontendUrl}/e/${examSlugForEmail}`
      : frontendUrl;

    const startDate = new Date(result.registration.startTime);
    const endDate = new Date(result.registration.endTime);
    const scheduleDate = `${startDate.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })} de ${startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} a ${endDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;

    sendExamCredentialsEmail({
      to: result.registration.studentEmail,
      studentName: result.registration.studentName,
      examTitle: examTitleForEmail ?? result.formTitle,
      examUrl,
      password: plainPassword,
      scheduleTitle: result.registration.scheduleTitle,
      scheduleDate,
      scheduleLocation: result.registration.location,
    }).catch((err) => {
      console.error('[emailService] Error enviando email de credenciales:', err);
    });
  }

  // Disparar emails condicionales (ON_FORM_SUBMIT) y programar recordatorios
  dispatchOnFormSubmit(result.id).catch((err) => {
    console.error('[emailDispatcher] Error en dispatch:', err);
  });
  scheduleReminders(result.id).catch((err) => {
    console.error('[emailDispatcher] Error programando recordatorios:', err);
  });

  syncOnFormSubmit(result.id).catch((err) => {
    console.error('[hubspot] Error en sync:', err);
  });

  return result;
};

/**
 * Obtener respuesta con detalles de registro si aplica
 */
export const getResponseWithRegistration = async (responseId: string) => {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    include: {
      form: {
        select: {
          title: true,
          formType: true,
        },
      },
      answers: {
        include: {
          question: {
            select: {
              text: true,
              type: true,
            },
          },
          selectedOptions: {
            select: {
              text: true,
            },
          },
        },
      },
      examRegistration: {
        include: {
          schedule: {
            select: {
              title: true,
              startTime: true,
              endTime: true,
              location: true,
            },
          },
        },
      },
    },
  });

  return response;
};
