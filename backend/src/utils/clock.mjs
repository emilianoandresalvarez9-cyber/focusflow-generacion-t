export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * Reloj del sistema inyectable para evitar bugs de zona horaria (UTC vs Argentina UTC-3)
 * y permitir testear reglas temporales sin esperar dias reales.
 */
export class SystemClock {
  constructor(timeZone = DEFAULT_TIMEZONE) {
    this.timeZone = timeZone;
  }

  now() {
    return new Date();
  }

  nowIso() {
    return this.now().toISOString();
  }

  /**
   * Devuelve la fecha local YYYY-MM-DD en la zona horaria configurada (por defecto Argentina).
   */
  todayLocalDate() {
    return formatLocalDate(this.now(), this.timeZone);
  }
}

/**
 * Reloj simulado (FakeClock) para tests deterministas: se puede fijar y adelantar en milisegundos.
 */
export class FakeClock {
  constructor(initialIsoDate, timeZone = DEFAULT_TIMEZONE) {
    this.currentDate = new Date(initialIsoDate);
    this.timeZone = timeZone;
  }

  now() {
    return new Date(this.currentDate.getTime());
  }

  nowIso() {
    return this.now().toISOString();
  }

  todayLocalDate() {
    return formatLocalDate(this.currentDate, this.timeZone);
  }

  advanceHours(hours) {
    this.currentDate = new Date(this.currentDate.getTime() + hours * 60 * 60 * 1000);
  }

  advanceDays(days) {
    this.advanceHours(days * 24);
  }
}

export function formatLocalDate(date, timeZone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}
