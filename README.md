<img src="/src/images/Clinica C.jpg" width="320" alt="Medical Logo" />

# Medical Appointments API

## Descripción

Esta API, desarrollada con NestJS, ofrece una solución completa para la gestión de citas médicas, facilitando la administración de pacientes, médicos y sus respectivas citas en centros de salud. Está dirigida a clínicas, hospitales y consultorios médicos que buscan optimizar la organización y el control de su flujo de pacientes.

## Tecnologías Utilizadas

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Class Validator
- JWT
- Cloudinary (almacenamiento de imágenes)

## Pruebas

- Unitarias: `npm run test`
- E2E: `npm run test:e2e`
- Cobertura: `npm run test:cov`

## Documentación

La documentación completa de la API está disponible a través de Swagger una vez que el servidor está en ejecución.

## Seguridad

- Autenticación mediante JWT
- Validación de datos con Class Validator
- Encriptación de contraseñas
- Configuración CORS

## Funcionalidades Principales

### Gestión de Usuarios (Pacientes, Médicos, Administradores)

La API permite el registro, autenticación y gestión de usuarios con diferentes roles (paciente, médico, administrador). Se utiliza un sistema de roles para controlar los permisos y accesos a las diferentes funcionalidades.

### Creación y Gestión de Citas

Los pacientes pueden solicitar citas con médicos específicos, seleccionando fecha y hora según la disponibilidad del médico. El estado de la cita (confirmada, cancelada, completada) se gestiona a través de un sistema de enums, permitiendo un seguimiento preciso del flujo de la cita.

### Gestión de Historiales Médicos

Se registra el historial médico de cada paciente, incluyendo descripciones, diagnósticos, tratamientos y datos médicos complejos en formato JSONB para facilitar la búsqueda y el análisis.

### Manejo de Recetas Médicas

Integración con la gestión de recetas médicas, incluyendo la lista de medicamentos, indicaciones y la fecha de emisión. Se permite la asociación de recetas a citas específicas y almacenamiento de imágenes mediante Cloudinary.

### Registro de Notas Médicas

Facilita la creación y gestión de notas médicas asociadas a las citas, con la opción de marcarlas como privadas para controlar el acceso a la información sensible.

### Almacenamiento de Documentos de Consulta

Permite subir y gestionar documentos relacionados con las consultas, incluyendo el nombre del archivo, tipo de documento, URL del archivo y la fecha de subida.

### Manejo de Horarios Médicos

Se gestionan los horarios de disponibilidad de los médicos utilizando un formato JSONB para representar la complejidad de los horarios.

# Bot de Telegram para Citas Médicas

<img src="/src/images/beautiful-young-female-doctor-looking-camera-office (1) (1).jpg" width="320" alt="Telegram Bot Screenshot" />

## Características Principales

El bot de Telegram complementa nuestra API de citas médicas, ofreciendo una interfaz conversacional accesible y fácil de usar para los pacientes.

### Funcionalidades Implementadas

- **Menú Interactivo**: Navegación intuitiva mediante botones y comandos
- **Búsqueda de Farmacias**: Localiza farmacias cercanas basadas en la ubicación del usuario
- **Búsqueda de Centros Médicos**: Encuentra centros médicos cercanos con opciones para obtener direcciones
- **Consultas Médicas por IA**: Responde preguntas médicas básicas utilizando inteligencia artificial
- **Recordatorios de Medicamentos**: Configura y gestiona recordatorios para tomar medicamentos
- **Información de Contacto**: Acceso rápido a información de contacto del centro médico

### Tecnologías Utilizadas

- Node-telegram-bot-api
- NestJS para la integración con el backend
- Servicios de geolocalización
- Integración con APIs externas para información médica
- Cloudinary para manejo de imágenes

### Próximas Funcionalidades

- Programación de citas médicas directamente desde el bot
- Historial médico personal
- Seguimiento de medicamentos con reconocimiento de imágenes
- Telemedicina y videoconsultas
- Integración con seguros médicos

## Soporte

Para soporte o consultas, por favor contactar a través de los canales disponibles.

## Licencia

MIT
