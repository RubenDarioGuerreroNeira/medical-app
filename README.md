<img src="/src/images/Clinica C.jpg" width="320" alt="Medical Logo" />

# Medical Appointments API

## Descripción

Esta API, desarrollada con NestJS, ofrece una solución completa para la gestión de citas médicas, facilitando la administración de pacientes, médicos y sus respectivas citas en centros de salud. Está dirigida a clínicas, hospitales y consultorios médicos que buscan optimizar la organización y el control de su flujo de pacientes.

## Tecnologías Utilizadas:

NestJS
TypeScript
PostgreSQL
TypeORM
Class Validator
JWT

## Unitarias: npm run test

E2E: npm run test:e2e
Cobertura: npm run test:cov
Documentación:

Consultar la documentación de la API.

## Seguridad:

Autenticación mediante JWT.
Validación de datos con Class Validator.
Contribución:

## Soporte:

Para soporte o consultas, por favor contactar a través de los canales disponibles.

Licencia:

MIT

## Funcionalidades de la API para Citas Médicas:

Gestión de Usuarios (Pacientes, Médicos, Administradores): La API permite el registro, autenticación y gestión de usuarios con diferentes roles (paciente, médico, administrador). Se utiliza un sistema de roles para controlar los permisos y accesos a las diferentes funcionalidades.
Creación y Gestión de Citas: Los pacientes pueden solicitar citas con médicos específicos, seleccionando fecha y hora según la disponibilidad del médico. El estado de la cita (confirmada, cancelada, completada) se gestiona a través de un sistema de enums, permitiendo un seguimiento preciso del flujo de la cita.
Gestión de Historiales Médicos: Se registra el historial médico de cada paciente, incluyendo descripciones, diagnósticos, tratamientos y datos médicos complejos en formato JSONB para facilitar la búsqueda y el análisis.

La API provee endpoints para crear, leer, actualizar y eliminar entradas del historial médico. Se relaciona correctamente con el paciente y el médico asociado.

## Manejo de Recetas Médicas:

Integración con la gestión de recetas médicas, incluyendo la lista de medicamentos, indicaciones y la fecha de emisión. Se permite la asociación de recetas a citas específicas. Se incluye la posibilidad de almacenar la URL de un archivo de receta.

## Registro de Notas Médicas:

Facilita la creación y gestión de notas médicas asociadas a las citas, con la opción de marcarlas como privadas para controlar el acceso a la información sensible.
Almacenamiento de Documentos de Consulta: Permite subir y gestionar documentos relacionados con las consultas, incluyendo el nombre del archivo, tipo de documento, URL del archivo y la fecha de subida. Estos documentos se asocian a citas específicas.

## Manejo de Horarios Médicos:

Se gestionan los horarios de disponibilidad de los médicos utilizando un formato JSONB para representar la complejidad de los horarios. Esto permite una búsqueda eficiente de disponibilidad y la programación de citas.
Tecnologías y Herramientas:

## NestJS:

Framework de Node.js para construir aplicaciones escalables y mantenibles.
TypeORM: ORM para la interacción con la base de datos, facilitando la gestión de entidades y relaciones.

## PostgreSQL:

Base de datos relacional robusta para el almacenamiento de la información.

## JSONB:

Formato para almacenar datos complejos y realizar búsquedas eficientes.

## UUID:

Utilización de UUIDs como identificadores únicos para las entidades.

## Enfoque en la eficiencia y la escalabilidad:

El diseño de la API se centra en la eficiencia en el manejo de datos, especialmente para la gestión de historiales médicos, horarios y datos médicos complejos. La utilización de JSONB permite realizar búsquedas y consultas optimizadas.

La arquitectura de NestJS y la modularidad del código promueven la escalabilidad y el mantenimiento a largo plazo.
