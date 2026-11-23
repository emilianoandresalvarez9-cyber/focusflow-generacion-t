import crypto from "node:crypto";
import { SystemClock } from "../utils/clock.mjs";

export const MINUTOS_POR_BLOQUE = 25;
export const MIN_BLOQUES = 1;
export const MAX_BLOQUES = 20;
export const MIN_TITULO_LENGTH = 3;
export const MAX_TITULO_LENGTH = 100;
export const MAX_DESCRIPCION_LENGTH = 500;
export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

export const CATEGORIAS_VALIDAS = ["tp", "clase", "proyecto", "lectura"];
export const ESTADOS_VALIDOS = ["pendiente", "en_progreso", "completada"];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

function validarTitulo(valor) {
  if (typeof valor !== "string") {
    throw new ValidationError("El titulo es obligatorio y debe ser texto.");
  }
  const limpio = valor.trim();
  if (limpio.length < MIN_TITULO_LENGTH || limpio.length > MAX_TITULO_LENGTH) {
    throw new ValidationError(
      `El titulo debe tener entre ${MIN_TITULO_LENGTH} y ${MAX_TITULO_LENGTH} caracteres.`
    );
  }
  return limpio;
}

function validarDescripcion(valor) {
  if (valor === undefined || valor === null) return "";
  if (typeof valor !== "string") {
    throw new ValidationError("La descripcion debe ser texto.");
  }
  const limpio = valor.trim();
  if (limpio.length > MAX_DESCRIPCION_LENGTH) {
    throw new ValidationError(`La descripcion no puede superar los ${MAX_DESCRIPCION_LENGTH} caracteres.`);
  }
  return limpio;
}

function validarCategoria(valor) {
  if (!CATEGORIAS_VALIDAS.includes(valor)) {
    throw new ValidationError(
      `Categoria invalida. Valores permitidos: ${CATEGORIAS_VALIDAS.join(", ")}.`
    );
  }
  return valor;
}

function validarEstado(valor) {
  if (!ESTADOS_VALIDOS.includes(valor)) {
    throw new ValidationError(
      `Estado invalido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}.`
    );
  }
  return valor;
}

function validarBloques(valor) {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < MIN_BLOQUES || valor > MAX_BLOQUES) {
    throw new ValidationError(
      `bloquesEstimados debe ser un numero entero entre ${MIN_BLOQUES} y ${MAX_BLOQUES}.`
    );
  }
  return valor;
}

function validarFechaLimite(valor) {
  if (valor === undefined || valor === null || valor === "") return "";
  if (typeof valor !== "string" || !ISO_DATE_REGEX.test(valor.trim())) {
    throw new ValidationError("fechaLimite debe tener el formato YYYY-MM-DD.");
  }
  return valor.trim();
}

/**
 * Capa Service: concentra las reglas de negocio, validaciones independientes del transporte HTTP
 * y calculos basados en el reloj inyectado (zona horaria Argentina).
 */
export class TaskService {
  constructor(repository, clock = new SystemClock()) {
    this.repository = repository;
    this.clock = clock;
  }

  enrichWithOverdueFlag(task) {
    const todayLocal = this.clock.todayLocalDate();
    const estaVencida =
      Boolean(task.fechaLimite) &&
      task.estado !== "completada" &&
      todayLocal > task.fechaLimite;

    return {
      ...task,
      estaVencida
    };
  }

  async listTasks(filters = {}) {
    const rawLimit = filters.limit !== undefined ? Number(filters.limit) : DEFAULT_PAGE_LIMIT;
    const rawOffset = filters.offset !== undefined ? Number(filters.offset) : 0;

    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > MAX_PAGE_LIMIT) {
      throw new ValidationError(`limit debe ser un entero entre 1 y ${MAX_PAGE_LIMIT}.`);
    }
    if (!Number.isInteger(rawOffset) || rawOffset < 0) {
      throw new ValidationError("offset debe ser un entero mayor o igual a 0.");
    }

    const queryFilters = {
      limit: rawLimit,
      offset: rawOffset
    };

    if (filters.categoria) {
      queryFilters.categoria = validarCategoria(filters.categoria);
    }
    if (filters.estado) {
      queryFilters.estado = validarEstado(filters.estado);
    }
    if (filters.favorito === true || filters.favorito === "true") {
      queryFilters.favorito = true;
    }
    if (typeof filters.q === "string" && filters.q.trim().length > 0) {
      queryFilters.q = filters.q.trim();
    }

    const page = await this.repository.findAll(queryFilters);
    return {
      ...page,
      items: page.items.map((task) => this.enrichWithOverdueFlag(task))
    };
  }

  async getTaskById(id) {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new ValidationError("El id de la tarea es obligatorio.");
    }
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError("Tarea no encontrada.");
    }
    return this.enrichWithOverdueFlag(task);
  }

  async createTask(input) {
    if (!input || typeof input !== "object") {
      throw new ValidationError("El cuerpo de la solicitud debe ser un objeto JSON valido.");
    }

    const task = {
      id: crypto.randomUUID(),
      titulo: validarTitulo(input.titulo),
      descripcion: validarDescripcion(input.descripcion),
      categoria: validarCategoria(input.categoria),
      estado: input.estado !== undefined ? validarEstado(input.estado) : "pendiente",
      bloquesEstimados: validarBloques(input.bloquesEstimados),
      fechaLimite: validarFechaLimite(input.fechaLimite),
      fechaCreacion: this.clock.nowIso(),
      favorito: Boolean(input.favorito)
    };

    const saved = await this.repository.create(task);
    return this.enrichWithOverdueFlag(saved);
  }

  async updateTask(id, patch) {
    if (!patch || typeof patch !== "object") {
      throw new ValidationError("El cuerpo de actualizacion debe ser un objeto JSON valido.");
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Tarea no encontrada.");
    }

    const updated = {
      ...existing,
      titulo: patch.titulo !== undefined ? validarTitulo(patch.titulo) : existing.titulo,
      descripcion:
        patch.descripcion !== undefined ? validarDescripcion(patch.descripcion) : existing.descripcion,
      categoria: patch.categoria !== undefined ? validarCategoria(patch.categoria) : existing.categoria,
      estado: patch.estado !== undefined ? validarEstado(patch.estado) : existing.estado,
      bloquesEstimados:
        patch.bloquesEstimados !== undefined
          ? validarBloques(patch.bloquesEstimados)
          : existing.bloquesEstimados,
      fechaLimite:
        patch.fechaLimite !== undefined ? validarFechaLimite(patch.fechaLimite) : existing.fechaLimite,
      favorito: patch.favorito !== undefined ? Boolean(patch.favorito) : existing.favorito
    };

    const saved = await this.repository.update(id, updated);
    return this.enrichWithOverdueFlag(saved);
  }

  async deleteTask(id) {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundError("Tarea no encontrada.");
    }
    return true;
  }

  async getStudySummary() {
    const allTasks = await this.repository.findAllUnpaginatedForSummary();
    const enriched = allTasks.map((task) => this.enrichWithOverdueFlag(task));

    let tareasPendientes = 0;
    let tareasCompletadas = 0;
    let minutosEstimadosPendientes = 0;
    let favoritosPendientes = 0;
    let tareasVencidas = 0;

    for (const task of enriched) {
      if (task.estado === "completada") {
        tareasCompletadas += 1;
      } else {
        tareasPendientes += 1;
        minutosEstimadosPendientes += task.bloquesEstimados * MINUTOS_POR_BLOQUE;
        if (task.favorito) {
          favoritosPendientes += 1;
        }
        if (task.estaVencida) {
          tareasVencidas += 1;
        }
      }
    }

    return {
      totalTareas: enriched.length,
      tareasPendientes,
      tareasCompletadas,
      minutosEstimadosPendientes,
      favoritosPendientes,
      tareasVencidas,
      fechaReferenciaLocal: this.clock.todayLocalDate(),
      zonaHoraria: this.clock.timeZone
    };
  }
}
