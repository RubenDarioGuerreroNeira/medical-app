URL: http://localhost:3000/nota-medica/upload-imagen/{id}
Reemplaza {id} con el ID real de la nota médica
En Body, selecciona multipart/form-data
Añade un campo:
Key: file
Value: Selecciona tu archivo de imagen
Envía la solicitud
El flujo es:

La imagen se sube a Cloudinary
Cloudinary devuelve la URL de la imagen
Esa URL se guarda en el campo contenido de la nota médica
Se devuelve la nota médica actualizada
Si todo funciona correctamente, verás una respuesta como:

{
"message": "Imagen subida y nota médica actualizada exitosamente",
"notaMedica": {
"id": "uuid-de-la-nota",
"contenido": "https://res.cloudinary.com/tu-cloud/image/upload/v1234567/notas-medicas/imagen.jpg",
// otros campos...
}
}
Copy
Insert

Claude 3.5 Sonnet (Latest)
