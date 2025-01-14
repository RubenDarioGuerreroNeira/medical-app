import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./all-exceptions.filter";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const config = new DocumentBuilder()
      .setTitle("API Rest")
      .setDescription("API Rest MedicalAppointments")
      .setVersion("1.0")
      .addTag("Citas")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api", app, document);

    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(3000);
  } catch (error) {
    console.error(error);
  }
}
bootstrap();
