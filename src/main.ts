import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./all-exceptions.filter";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    const config = new DocumentBuilder()
      .setTitle("API Rest")
      .setDescription("API Rest MedicalAppointments")
      .setVersion("1.0")
      .addTag("Citas")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api", app, document);

    app.useGlobalFilters(new AllExceptionsFilter());

    const port = process.env.PORT || 5500;
    await app.listen(port, "0.0.0.0");
    console.log(`Server started on port ${port}`);
  } catch (error) {
    console.error("Error starting server", error);
    process.exit(1);
  }
}
bootstrap();
