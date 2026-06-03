import { PrismaClient, RegistrationStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Types
export interface CreateRegistrationData {
  responseId: string;
  scheduleId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  notes?: string;
  hasExemption?: boolean;
  exemptionFileUrl?: string;
}

export interface UpdateRegistrationData {
  scheduleId?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  notes?: string;
  status?: RegistrationStatus;
}

export interface RegistrationWithDetails {
  id: string;
  responseId: string;
  scheduleId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string | null;
  notes: string | null;
  status: RegistrationStatus;
  createdAt: Date;
  updatedAt: Date;
  schedule: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    location: string | null;
  };
}

/**
 * Crear un registro de examen (con control de concurrencia)
 * Esta función usa una transacción para evitar race conditions
 */
export const createRegistration = async (data: CreateRegistrationData, existingTx?: any) => {
  const execute = async (tx: any) => {
    // 1. Verificar que el schedule existe y tiene cupo (con lock optimista)
    const schedule = await tx.examSchedule.findUnique({
      where: { id: data.scheduleId },
      include: {
        _count: {
          select: {
            registrations: {
              where: {
                status: 'CONFIRMED',
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new Error('Horario no encontrado');
    }

    if (!schedule.isActive) {
      throw new Error('Este horario no está activo');
    }

    const registeredCount = schedule._count.registrations;
    if (registeredCount >= schedule.capacity) {
      throw new Error('No hay cupo disponible en este horario');
    }

    // 2. Verificar que el email no esté duplicado en el mismo examen
    const existingRegistration = await tx.examRegistration.findFirst({
      where: {
        studentEmail: data.studentEmail,
        status: 'CONFIRMED',
        schedule: {
          examId: schedule.examId,
        },
      },
    });

    if (existingRegistration) {
      throw new Error('Ya existe un registro con este email para este examen');
    }

    // 3. Crear el registro
    const registration = await tx.examRegistration.create({
      data: {
        responseId: data.responseId,
        scheduleId: data.scheduleId,
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        studentPhone: data.studentPhone,
        notes: data.notes,
        hasExemption: data.hasExemption ?? false,
        exemptionFileUrl: data.exemptionFileUrl,
        status: 'CONFIRMED',
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            location: true,
          },
        },
      },
    });

    return registration;
  };

  // Si se pasa un tx existente, usarlo directamente (llamado desde responseService)
  if (existingTx) {
    return execute(existingTx);
  }

  // Si no, crear transacción propia
  return await prisma.$transaction(execute, {
    maxWait: 5000,
    timeout: 10000,
    isolationLevel: 'Serializable',
  });
};

/**
 * Obtener un registro por ID
 */
export const getRegistrationById = async (registrationId: string) => {
  const registration = await prisma.examRegistration.findUnique({
    where: { id: registrationId },
    include: {
      schedule: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
          examId: true,
        },
      },
      response: {
        select: {
          id: true,
          folio: true,
          submittedAt: true,
          answers: {
            select: {
              questionId: true,
              textValue: true,
              fileUrl: true,
              selectedOptions: {
                select: {
                  id: true,
                  text: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return registration;
};

/**
 * Obtener registro por responseId
 */
export const getRegistrationByResponseId = async (responseId: string) => {
  const registration = await prisma.examRegistration.findUnique({
    where: { responseId },
    include: {
      schedule: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
        },
      },
    },
  });

  return registration;
};

/**
 * Obtener todos los registros de un examen (para admin)
 */
export const getRegistrationsByExamId = async (
  examId: string,
  options?: {
    status?: RegistrationStatus;
    search?: string;
  }
) => {
  const where: any = {
    schedule: {
      examId,
    },
  };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.search) {
    where.OR = [
      { studentName: { contains: options.search, mode: 'insensitive' } },
      { studentEmail: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const registrations = await prisma.examRegistration.findMany({
    where,
    include: {
      schedule: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
        },
      },
      response: {
        select: {
          id: true,
          folio: true,
          submittedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return registrations;
};

/**
 * Obtener registros de un horario específico
 */
export const getRegistrationsByScheduleId = async (scheduleId: string) => {
  const registrations = await prisma.examRegistration.findMany({
    where: {
      scheduleId,
      status: 'CONFIRMED',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return registrations;
};

/**
 * Verificar si un email ya está registrado en un examen
 */
export const isEmailRegistered = async (examId: string, email: string): Promise<boolean> => {
  const existing = await prisma.examRegistration.findFirst({
    where: {
      studentEmail: email,
      status: 'CONFIRMED',
      schedule: {
        examId,
      },
    },
  });

  return !!existing;
};

/**
 * Actualizar un registro
 */
export const updateRegistration = async (
  registrationId: string,
  data: UpdateRegistrationData
) => {
  return await prisma.$transaction(async (tx) => {
    // Verificar que el registro existe
    const existing = await tx.examRegistration.findUnique({
      where: { id: registrationId },
      include: {
        schedule: true,
      },
    });

    if (!existing) {
      throw new Error('Registro no encontrado');
    }

    // Si se cambia de horario, verificar cupo
    if (data.scheduleId && data.scheduleId !== existing.scheduleId) {
      const newSchedule = await tx.examSchedule.findUnique({
        where: { id: data.scheduleId },
        include: {
          _count: {
            select: {
              registrations: {
                where: {
                  status: 'CONFIRMED',
                },
              },
            },
          },
        },
      });

      if (!newSchedule) {
        throw new Error('Nuevo horario no encontrado');
      }

      if (!newSchedule.isActive) {
        throw new Error('El nuevo horario no está activo');
      }

      if (newSchedule._count.registrations >= newSchedule.capacity) {
        throw new Error('No hay cupo disponible en el nuevo horario');
      }

      // Verificar que el nuevo horario sea del mismo examen
      if (newSchedule.examId !== existing.schedule.examId) {
        throw new Error('No se puede cambiar a un horario de otro examen');
      }
    }

    // Si se actualiza el email, verificar duplicados
    if (data.studentEmail && data.studentEmail !== existing.studentEmail) {
      const duplicate = await tx.examRegistration.findFirst({
        where: {
          studentEmail: data.studentEmail,
          status: 'CONFIRMED',
          schedule: {
            examId: existing.schedule.examId,
          },
          id: { not: registrationId },
        },
      });

      if (duplicate) {
        throw new Error('Ya existe otro registro con este email');
      }
    }

    // Actualizar
    const updated = await tx.examRegistration.update({
      where: { id: registrationId },
      data: {
        ...(data.scheduleId && { scheduleId: data.scheduleId }),
        ...(data.studentName && { studentName: data.studentName }),
        ...(data.studentEmail && { studentEmail: data.studentEmail }),
        ...(data.studentPhone !== undefined && { studentPhone: data.studentPhone }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status && { status: data.status }),
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            location: true,
          },
        },
      },
    });

    return updated;
  });
};

/**
 * Cancelar un registro (libera el cupo)
 */
export const cancelRegistration = async (registrationId: string) => {
  const registration = await prisma.examRegistration.update({
    where: { id: registrationId },
    data: {
      status: 'CANCELLED',
    },
    include: {
      schedule: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  return registration;
};

/**
 * Marcar asistencia
 */
export const markAttendance = async (
  registrationId: string,
  attended: boolean
): Promise<void> => {
  await prisma.examRegistration.update({
    where: { id: registrationId },
    data: {
      status: attended ? 'ATTENDED' : 'NO_SHOW',
    },
  });
};

/**
 * Obtener estadísticas de inscripción por examen
 */
export const getRegistrationStats = async (examId: string) => {
  const schedules = await prisma.examSchedule.findMany({
    where: { examId },
    include: {
      _count: {
        select: {
          registrations: {
            where: {
              status: 'CONFIRMED',
            },
          },
        },
      },
      registrations: {
        where: {
          status: 'CONFIRMED',
        },
        select: {
          id: true,
        },
      },
    },
  });

  const stats = {
    totalSchedules: schedules.length,
    activeSchedules: schedules.filter(s => s.isActive).length,
    totalCapacity: schedules.reduce((sum, s) => sum + s.capacity, 0),
    totalRegistered: schedules.reduce((sum, s) => sum + s._count.registrations, 0),
    schedulesWithAvailability: schedules.filter(
      s => s.isActive && s._count.registrations < s.capacity
    ).length,
    bySchedule: schedules.map(s => ({
      id: s.id,
      title: s.title,
      capacity: s.capacity,
      registered: s._count.registrations,
      available: s.capacity - s._count.registrations,
      isFull: s._count.registrations >= s.capacity,
      isActive: s.isActive,
    })),
  };

  return stats;
};
