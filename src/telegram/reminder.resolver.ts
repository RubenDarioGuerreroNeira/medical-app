import { Resolver, Query, Args, Int, Context, Mutation } from "@nestjs/graphql";
import { MedicationReminderGQLModel } from "./graphql/medication-reminder.model";
import { ReminderService } from "./reminder.service";
import {
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
// import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'; // Crearemos esto más adelante
// import { CurrentUser } from '../auth/decorators/current-user.decorator'; // Y esto también
import {
  CreateMedicationReminderInput,
  UpdateMedicationReminderInput,
} from "./graphql/medication-reminder.inputs";
import { MedicationReminder } from "src/Entities/MedicationReminder.entity"; // No es necesario si solo se usa en el servicio

@Resolver(() => MedicationReminderGQLModel)
export class ReminderResolver {
  private readonly logger = new Logger(ReminderResolver.name);
  constructor(private reminderService: ReminderService) {}

  // Ejemplo de cómo podrías obtener el usuario/chatId del contexto (requiere configuración de Auth)
  private getChatIdFromContext(context: any): string {
    const testChatId = "6237920973";
    this.logger.log("testChatId: " + testChatId);

    if (!testChatId) {
      this.logger.error("Chat ID no encontrado en el contexto.");
      // Es crucial lanzar una excepción aquí para detener el flujo si no hay chatId.
      throw new UnauthorizedException(
        "Chat ID no encontrado. Asegúrate de que el usuario esté autenticado."
      );
    }
    return String(testChatId); // Asegurarse de que sea un string

    // Esto es un placeholder. La implementación real dependerá de tu sistema de autenticación.
    // Por ejemplo, si usas JWT, podrías decodificar el token aquí o en un guard.
    // Asumamos que después de la autenticación, el `chatId` está en `context.req.user.chatId`
    // const chatId = context?.req?.user?.chatId || context?.chatId;

    // if (!chatId) {
    //   this.logger.error("Chat ID no encontrado en el contexto.");
    //   // Es crucial lanzar una excepción aquí para detener el flujo si no hay chatId.
    //   throw new UnauthorizedException(
    //     "Chat ID no encontrado. Asegúrate de que el usuario esté autenticado."
    //   );
    // }
    // return String(chatId); // Asegurarse de que sea un string
  }

  private cleanReminderData(
    reminder: MedicationReminder | null
  ): MedicationReminderGQLModel | null {
    if (!reminder) {
      return null;
    }

    let cleanedTimesTaken: Date[] | undefined = undefined;
    if (Array.isArray(reminder.timesTaken)) {
      cleanedTimesTaken = reminder.timesTaken.filter(
        (ts) => ts instanceof Date && !isNaN(ts.getTime())
      );
    } else if (
      reminder.timesTaken === null ||
      typeof reminder.timesTaken === "undefined"
    ) {
      cleanedTimesTaken = undefined;
    } else {
      this.logger.warn(
        `[cleanReminderData] Valor inesperado para timesTaken en recordatorio ID ${
          reminder.id
        }. Valor: ${JSON.stringify(
          reminder.timesTaken
        )}, Tipo: ${typeof reminder.timesTaken}. Se tratará como indefinido.`
      );
      cleanedTimesTaken = undefined;
    }
    return {
      ...reminder,
      timesTaken: cleanedTimesTaken,
    } as MedicationReminderGQLModel;
  }

  @Query(() => MedicationReminderGQLModel, {
    name: "reminderById",
    nullable: true,
  })
  // @UseGuards(GqlAuthGuard) // Descomentar cuando tengas GqlAuthGuard
  async getReminder(
    @Args("id", { type: () => Int }) id: number,
    @Context() context: any
    // @CurrentUser() user: any, // Descomentar cuando tengas CurrentUser decorator
  ): Promise<MedicationReminderGQLModel | null> {
    const userChatIdString = this.getChatIdFromContext(context); // Replace with actual auth later
    const reminderFromService = await this.reminderService.getReminderById(id);

    if (!reminderFromService) {
      throw new NotFoundException("No recordatorio encontrado");
    }
    if (reminderFromService.chatId !== userChatIdString) {
      throw new UnauthorizedException(
        "No tienes permiso para acceder a este recordatorio."
      );
    }
    return this.cleanReminderData(reminderFromService);
  }

  @Query(() => [MedicationReminderGQLModel], { name: "myReminders" })
  // @UseGuards(GqlAuthGuard) // Descomentar cuando tengas GqlAuthGuard
  async getMyReminders(
    @Context() context: any
    // @CurrentUser() user: any, // Replace with actual auth later
  ): Promise<MedicationReminderGQLModel[]> {
    const chatIdString = this.getChatIdFromContext(context);
    const chatIdNumber = parseInt(chatIdString, 10);
    if (isNaN(chatIdNumber)) {
      this.logger.error(
        `Error al convertir el chatId ${chatIdString} a un número`
      );
      throw new BadRequestException("Chat Id  Invalido");
    }
    const remindersFromService = await this.reminderService.getUserReminders(
      chatIdNumber
    );
    return remindersFromService
      .map((r) => this.cleanReminderData(r))
      .filter((r) => r !== null) as MedicationReminderGQLModel[]; // typer assertion
  }

  @Mutation(() => MedicationReminderGQLModel)
  // @UseGuards(GqlAuthGuard) // Descomentar cuando tengas GqlAuthGuard
  async createMedicationReminder(
    @Args("input") input: CreateMedicationReminderInput,
    @Context() context: any
    // @CurrentUser() user: any, // Replace with actual auth later
  ): Promise<MedicationReminderGQLModel | null> {
    const chatIdString = this.getChatIdFromContext(context); // Replace with actual auth later
    const chatIdNumber = parseInt(chatIdString, 10);
    if (isNaN(chatIdNumber)) {
      this.logger.error(
        `Chat ID inválido al crear recordatorio ${chatIdString} a un número`
      );
      throw new BadRequestException("El Chat Id inválido");
    }
    // Assuming createReminder expects chatId as the first argument
    const newReminderFromService = await this.reminderService.createReminder(
      chatIdNumber,
      input
    );
    if (!newReminderFromService) return null;
    return this.cleanReminderData(newReminderFromService); // Type assertion
  }

  @Mutation(() => MedicationReminderGQLModel, { nullable: true })
  // @UseGuards(GqlAuthGuard) // Descomentar cuando tengas GqlAuthGuard
  async updateMedicationReminder(
    @Args("id", { type: () => Int }) id: number,
    @Args("input") input: UpdateMedicationReminderInput,
    @Context() context: any
    // @CurrentUser() user: any, // Replace with actual auth later
  ): Promise<MedicationReminderGQLModel | null> {
    const userChatIdString = this.getChatIdFromContext(context); // Replace with actual auth later
    const existingReminder = await this.reminderService.getReminderById(id);
    if (!existingReminder) {
      throw new NotFoundException(` Recordatorio con ID ${id} no encontrado.}`);
    }
    if (existingReminder.chatId !== userChatIdString) {
      throw new UnauthorizedException(
        "No tienes permiso para actualizar este recordatorio."
      );
    }

    const updatedReminderFromService =
      await this.reminderService.updateReminder(id, input);
    return this.cleanReminderData(updatedReminderFromService); // Type assertion
  }

  @Mutation(() => Boolean)
  // @UseGuards(GqlAuthGuard) // Descomentar cuando tengas GqlAuthGuard
  async deleteMedicationReminder(
    @Args("id", { type: () => Int }) id: number,
    @Context() context: any
    // @CurrentUser() user: any, // Replace with actual auth later
  ): Promise<boolean> {
    const userChatId = this.getChatIdFromContext(context);
    const existingReminder = await this.reminderService.getReminderById(id);

    if (!existingReminder)
      throw new NotFoundException(`Recordatorio con ID ${id} no encontrado.}`);

    if (existingReminder.chatId !== userChatId) {
      throw new UnauthorizedException(
        "No tienes permiso para eliminar este recordatorio ."
      );
    }

    await this.reminderService.deleteReminder(id);
    return true; // Indicate success
  }

  @Mutation(() => MedicationReminderGQLModel, { nullable: true })
  // @UseGuards(GqlAuthGuard) // Descomentar cuando tengas GqlAuthGuard
  async markMedicationTaken(
    @Args("id", { type: () => Int }) id: number,
    @Context() context: any
    // @CurrentUser() user: any, // Replace with actual auth later
  ): Promise<MedicationReminderGQLModel | null> {
    const chatId = this.getChatIdFromContext(context); // Replace with actual auth later
    // Verificar propiedad antes de marcar como tomado
    const existingReminder = await this.reminderService.getReminderById(id);
    if (!existingReminder || existingReminder.chatId !== chatId) {
      throw new UnauthorizedException(
        "No tienes permiso para marcar este recordatorio como tomado o no existe."
      );
    }

    const updatedReminderService =
      await this.reminderService.markMedicationAsTaken(id);

    return this.cleanReminderData(updatedReminderService); // Type assertion
  }
}
