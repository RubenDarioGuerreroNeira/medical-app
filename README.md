<img src="/src/images/Clinica C.jpg" width="320" alt="Medical Logo" />

# Medical Appointments API

## Descripción

Esta API, desarrollada con NestJS, ofrece una solución completa para la gestión de citas médicas, facilitando la administración de pacientes, médicos y sus respectivas citas en centros de salud. Está dirigida a clínicas, hospitales y consultorios médicos que buscan optimizar la organización y el control de su flujo de pacientes.

## Desarrollador

**Rubén D. Guerrero N.**  
Desarrollador Full Stack  
Email: rudargeneira@gmail.com  
Telegram: @Rubedev

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

<img src="/src/images/Bot telegram Bw.jpg" width="320" alt="Telegram Bot Screenshot" />

## Características Principales

El bot de Telegram [@CitasMedicbot](https://t.me/CitasMedicbot) complementa nuestra API de citas médicas, ofreciendo una interfaz conversacional accesible y fácil de usar para los pacientes.

### Funcionalidades Implementadas

- **Menú Interactivo**: Navegación intuitiva mediante botones y comandos
- **Búsqueda de Farmacias**: Localiza farmacias cercanas basadas en la ubicación del usuario
- **Búsqueda de Centros Médicos**: Encuentra centros médicos cercanos con opciones para obtener direcciones
- **Consultas Médicas por IA**: Responde preguntas médicas básicas utilizando inteligencia artificial
- **Recordatorios de Medicamentos**: Configura y gestiona recordatorios para tomar medicamentos
- **Información de Contacto**: Acceso rápido a información de contacto del centro médico
- **Gestión de Historial Médico**: Registro y consulta de historiales médicos personales
  - Creación de nuevos registros médicos con diagnósticos, tratamientos y médicos
  - Visualización detallada del historial médico completo
  - Eliminación de registros médicos específicos
  - Interfaz intuitiva con botones interactivos para navegar entre opciones
  - **Exportación de Recordatorios Médicos**: Genera y descarga reportes de medicamentos en formato PDF o CSV
  - Exportación personalizada con datos del paciente
  - Opción para compartir directamente con profesionales médicos
  - Formato profesional para uso clínico
  - Resumen estadístico de medicamentos y frecuencias
- **Recordatorios de Citas Médicas**: Configuración y gestión de recordatorios para citas médicas programadas
- **Integración con Geolocalización**: Búsqueda de servicios médicos basada en la ubicación actual del usuario

### Próximas Funcionalidades

#### 1. Sistema de Citas Médicas

- Programación, visualización y cancelación de citas médicas directamente desde Telegram
- Recordatorios automáticos de citas próximas
- Opción para reprogramar citas con un simple botón

#### 2. Seguimiento de Medicamentos Mejorado

- Registro de medicamentos con fotos (el usuario puede enviar una foto del medicamento)
- Alertas de interacciones medicamentosas peligrosas
- Recordatorios personalizables (sonidos, frecuencia, mensajes)

#### 3. Síntomas y Primeros Auxilios

- Guía interactiva de primeros auxilios con imágenes y videos
- Evaluador de síntomas básico que sugiera nivel de urgencia
- Información sobre cuándo buscar atención médica inmediata

#### 4. Integración con Seguros Médicos

- Verificación de cobertura de seguro para clínicas y farmacias mostradas
- Consulta de saldo disponible o estado de reembolsos
- Información sobre trámites y documentación necesaria

#### 5. Comunidad y Soporte

- Grupos de apoyo para condiciones específicas
- Conexión con otros pacientes (anónima y moderada)
- Preguntas frecuentes sobre condiciones médicas comunes

#### 6. Telemedicina

- Integración con servicios de consulta médica virtual
- Programación de videoconsultas desde el bot
- Sala de espera virtual con notificaciones

#### 7. Gamificación para Adherencia al Tratamiento

- Sistema de puntos por seguir tratamientos correctamente
- Insignias y logros por mantener hábitos saludables
- Estadísticas visuales de progreso

#### 8. Información Nutricional y Ejercicio

- Recomendaciones personalizadas según condiciones médicas
- Seguimiento de actividad física básica
- Sugerencias de dietas específicas para condiciones médicas

#### 9. Emergencias Médicas Mejoradas

- Botón de pánico que envía ubicación a contactos de emergencia
- Información de contacto de emergencias según ubicación actual
- Instrucciones de audio para situaciones críticas

## Soporte

Para soporte o consultas, por favor contactar a través de los canales disponibles.

## Licencia

MIT

### Tecnologías Utilizadas

- Node-telegram-bot-api
- NestJS para la integración con el backend
- Servicios de geolocalización
- Integración con APIs externas para información médica
- Cloudinary para manejo de imágenes
