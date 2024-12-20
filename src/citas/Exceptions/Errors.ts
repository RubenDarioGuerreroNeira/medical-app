export class CitaNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CitaNotFoundError";
  }
}

export class CitaAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CitaAlreadyExistsError";
  }
}
