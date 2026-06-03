import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types
export interface CreateScheduleData {
  examId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  location?: string;
}

export interface UpdateScheduleData {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  capacity?: number;
  location?: string;
  isActive?: boolean;
}

export interface ScheduleWithAvailability {
  id: string;
  examId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  capacity: number;
  location: string | null;
  isActive: boolean;
  registeredCount: number;
  availableSpots: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crear un nuevo horario para un examen
 */
export const createSchedule = async (data: CreateScheduleData) => {
  // Validar campos requeridos
  if (!data.examId) {
    throw new Error('El ID del examen es requerido');
  }
  if (!data.title || !data.title.trim()) {
    throw new Error('El titulo del horario es requerido');
  }
  if (!data.startTime || !data.endTime) {
    throw new Error('Las fechas de inicio y fin son requeridas');
  }

  // Convertir strings a Date si es necesario
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error('Las fechas proporcionadas no son validas');
  }

  // Validar que endTime > startTime
  if (endTime <= startTime) {
    throw new Error('La hora de fin debe ser posterior a la hora de inicio');
  }

  // Validar capacity > 0
  if (!data.capacity || data.capacity <= 0) {
    throw new Error('La capacidad debe ser mayor a 0');
  }

  const schedule = await prisma.examSchedule.create({
    data: {
      examId: data.examId,
      title: data.title.trim(),
      description: data.description,
      startTime,
      endTime,
      capacity: data.capacity,
      location: data.location,
    },
  });

  return schedule;
};

/**
 * Obtener todos los horarios de un examen (para admin)
 */
export const getSchedulesByExamId = async (examId: string) => {
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
    },
    orderBy: { startTime: 'asc' },
  });

  return schedules.map((s: typeof schedules[0]) => ({
    ...s,
    registeredCount: s._count.registrations,
    availableSpots: s.capacity - s._count.registrations,
  }));
};

/**
 * Obtener horarios disponibles para inscripción (solo activos con cupo)
 */
export const getAvailableSchedules = async (examId: string): Promise<ScheduleWithAvailability[]> => {
  const schedules = await prisma.examSchedule.findMany({
    where: {
      examId,
      isActive: true,
      startTime: {
        gt: new Date(), // Solo horarios futuros
      },
    },
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
    orderBy: { startTime: 'asc' },
  });

  return schedules
    .map((s: typeof schedules[0]) => ({
      id: s.id,
      examId: s.examId,
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      location: s.location,
      isActive: s.isActive,
      registeredCount: s._count.registrations,
      availableSpots: s.capacity - s._count.registrations,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))
    .filter(s => s.availableSpots > 0); // Solo con cupo disponible
};

/**
 * Verificar si un horario tiene cupo disponible (con lock optimista)
 */
export const hasAvailableSpots = async (scheduleId: string): Promise<boolean> => {
  const schedule = await prisma.examSchedule.findUnique({
    where: { id: scheduleId },
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

  if (!schedule || !schedule.isActive) {
    return false;
  }

  return schedule._count.registrations < schedule.capacity;
};

/**
 * Obtener un horario por ID
 */
export const getScheduleById = async (scheduleId: string) => {
  const schedule = await prisma.examSchedule.findUnique({
    where: { id: scheduleId },
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
          studentName: true,
          studentEmail: true,
          studentPhone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!schedule) return null;

  return {
    ...schedule,
    registeredCount: schedule._count.registrations,
    availableSpots: schedule.capacity - schedule._count.registrations,
  };
};

/**
 * Actualizar un horario
 */
export const updateSchedule = async (scheduleId: string, data: UpdateScheduleData) => {
  // Validar que no se reduzca la capacidad por debajo de los inscritos actuales
  if (data.capacity !== undefined) {
    const schedule = await prisma.examSchedule.findUnique({
      where: { id: scheduleId },
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

    if (schedule && data.capacity < schedule._count.registrations) {
      throw new Error(`No se puede reducir la capacidad a ${data.capacity}. Ya hay ${schedule._count.registrations} inscritos.`);
    }
  }

  const updated = await prisma.examSchedule.update({
    where: { id: scheduleId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.startTime && { startTime: data.startTime }),
      ...(data.endTime && { endTime: data.endTime }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  return updated;
};

/**
 * Eliminar un horario (solo si no tiene inscritos)
 */
export const deleteSchedule = async (scheduleId: string) => {
  const schedule = await prisma.examSchedule.findUnique({
    where: { id: scheduleId },
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

  if (schedule._count.registrations > 0) {
    throw new Error('No se puede eliminar un horario que tiene inscritos');
  }

  await prisma.examSchedule.delete({
    where: { id: scheduleId },
  });

  return { success: true };
};

/**
 * Duplicar horarios de un examen a otro (útil para nuevas ediciones)
 */
export const duplicateSchedules = async (sourceExamId: string, targetExamId: string) => {
  const sourceSchedules = await prisma.examSchedule.findMany({
    where: {
      examId: sourceExamId,
      isActive: true,
    },
  });

  const created = await prisma.$transaction(
    sourceSchedules.map((s: typeof sourceSchedules[0]) =>
      prisma.examSchedule.create({
        data: {
          examId: targetExamId,
          title: s.title,
          description: s.description,
          startTime: s.startTime, // Mantener mismo horario (ajustar manualmente después)
          endTime: s.endTime,
          capacity: s.capacity,
          location: s.location,
        },
      })
    )
  );

  return created;
};
