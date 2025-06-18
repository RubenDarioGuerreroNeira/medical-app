import { InputType, Field, Int } from "@nestjs/graphql";

@InputType()
export class CreateMedicationReminderInput {
  @Field()
  medicationName: string;

  @Field()
  dosage: string;

  @Field({ description: "Time in HH:MM format" })
  reminderTime: string;

  @Field(() => [Int], {
    description: "Days of the week (0=Sunday, 1=Monday, ..., 6=Saturday)",
  })
  daysOfWeek: number[];

  @Field({ nullable: true })
  timezone?: string;

  // isActive por defecto será true al crear, según la lógica de tu servicio.
  // No es necesario incluirlo aquí a menos que quieras permitir establecerlo explícitamente al crear.

  // userId y chatId se obtendrán del contexto/autenticación, no del input directo del cliente.
}

@InputType()
export class UpdateMedicationReminderInput {
  @Field({ nullable: true })
  medicationName?: string;

  @Field({ nullable: true })
  dosage?: string;

  @Field({ nullable: true, description: "Time in HH:MM format" })
  reminderTime?: string;

  @Field(() => [Int], {
    nullable: true,
    description: "Days of the week (0=Sunday, 1=Monday, ..., 6=Saturday)",
  })
  daysOfWeek?: number[];

  @Field({ nullable: true })
  timezone?: string;

  @Field({ nullable: true })
  isActive?: boolean;
}
