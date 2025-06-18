import { ObjectType, Field, ID, Int } from "@nestjs/graphql";

@ObjectType("MedicationReminder") // El nombre 'MedicationReminder' será usado en el schema.gql
export class MedicationReminderGQLModel {
  @Field(() => ID)
  id: number;

  @Field()
  medicationName: string;

  @Field()
  dosage: string;

  @Field()
  reminderTime: string; // HH:MM format

  @Field(() => [Int], {
    description: "Days of the week (0=Sunday, 1=Monday, ..., 6=Saturday)",
  })
  daysOfWeek: number[];

  @Field({ nullable: true })
  timezone?: string;

  @Field()
  isActive: boolean;

  @Field(() => Date, {
    nullable: true,
    description: "Timestamp of when the medication was last marked as taken",
  })
  lastTaken?: Date;

  @Field({
    description: "Telegram Chat ID associated with this reminder",
  })
  chatId: string; // Asumiendo que chatId en tu entidad es string

  @Field(() => String, {
    description: "User ID associated with this reminder (from Telegram)", // Corregí un pequeño typo aquí: "User ID is..."
  })
  userId: string; // Coincide con el tipo string de tu entidad

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date, {
    nullable: true,
    description: "Timestamp of the last update to the reminder", // Descripción actualizada para updatedAt
  })
  updatedAt?: Date;

  @Field({ description: "Type of reminder (e.g., medication, appointment)" }) // Corregí un pequeño typo aquí: "Type of Reminder..."
  type: string;

  @Field(() => [Date], {
    nullable: true,
    description: "List of timestamps when the medication was marked as taken", // Descripción actualizada para timesTaken
  })
  timesTaken?: Date[];
}
