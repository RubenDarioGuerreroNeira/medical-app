
<div align="center">
  <img src="src/images/medical_banner.png" width="100%" alt="Medical Appointments API Banner" style="border-radius: 10px; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);" />
  
  <br />
  
  <h1 style="font-size: 3em; color: #2C3E50;">🏥 Medical Appointments API</h1>
  
  <p align="center" style="font-size: 1.2em; max-width: 600px; margin: auto;">
    <strong>Sistema Integral de Gestión Médica potenciado por Inteligencia Artificial y Telegram</strong>
  </p>

  <br />

  <!-- Badges -->
  <div align="center">
    <a href="https://nestjs.com/">
      <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS">
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    </a>
    <a href="https://www.postgresql.org/">
      <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
    </a>
    <a href="https://graphql.org/">
      <img src="https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white" alt="GraphQL">
    </a>
    <a href="https://core.telegram.org/bots/api">
      <img src="https://img.shields.io/badge/Telegram_Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Bot">
    </a>
    <a href="https://ai.google.dev/">
      <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google-bard&logoColor=white" alt="Google Gemini AI">
    </a>
  </div>
</div>

<br />

---

## ⚡ **Descripción General**

**Medical Appointments API** es una solución de backend de vanguardia diseñada para transformar la administración sanitaria. Construida sobre la robustez de **NestJS**, esta plataforma no solo gestiona citas y pacientes, sino que integra un ecosistema completo de salud digital.

Desde la gestión de historiales clínicos hasta la asistencia médica automatizada 24/7 mediante un **Bot de Telegram con IA**, este sistema está preparado para escalar en clínicas, hospitales y consultorios modernos.

### 🌟 **Características Principales**
*   🤖 **Asistente Médico IA**: Consultas preliminares, análisis de síntomas y recordatorios inteligentes powered by Google Gemini.
*   📅 **Gestión de Citas Avanzada**: Algoritmos de disponibilidad en tiempo real y reprogramación automática.
*   🔐 **Seguridad de Grado Médico**: Roles granulares, encriptación de datos sensibles y cumplimiento de normativas.
*   📱 **Omnicanalidad**: Acceso fluido desde Web, Móvil y Telegram.

---

## 🏗️ **Arquitectura del Sistema**

Diseñado bajo una arquitectura modular y escalable, garantizando alto rendimiento y mantenibilidad.

```mermaid
graph TB
    subgraph "Frontend Interfaces"
        TG[📱 Telegram Bot]
        WEB[🌐 Web Dashboard]
        MOB[📱 Mobile App]
    end
    
    subgraph "API Gateway & Authentification"
        GW[🔐 NestJS API Gateway]
        AUTH[🔑 JWT Authentication]
        GUARD[🛡️ Role-Based Guards]
    end
    
    subgraph "Core Applications"
        US[👥 User Service]
        AS[📅 Appointments Service] 
        MS[🏥 Medical Service]
        NS[📝 Notes Service]
        RS[💊 Prescriptions Service]
    end
    
    subgraph "Intelligent Agents"
        BOT[🤖 Telegram Bot Service]
        AI[🧠 Gemini AI Integration]
        GEO[📍 Location Services]
        REMIND[⏰ Reminder System]
    end
    
    subgraph "Data Storage"
        PG[(🗄️ PostgreSQL)]
        REDIS[(📊 Redis Cache)]
        CLOUD[☁️ Cloudinary]
    end

    TG & WEB & MOB --> GW
    GW --> AUTH --> GUARD
    GUARD --> US & AS & MS & NS & RS
    
    BOT <--> AI
    BOT --> GEO & REMIND
    
    US & AS & MS & NS & RS --> PG
    GW & BOT --> REDIS
    RS & MS --> CLOUD
    
    style TG fill:#26A5E4,stroke:#1DA1F2
    style BOT fill:#FF6B6B,stroke:#FF5252
    style AI fill:#4285F4,stroke:#1976D2
    style PG fill:#336791,stroke:#2E5984
```

### 🗃️ **Modelo de Datos (ERD)**

Estructura de base de datos relacional optimizada para integridad y consultas complejas.

```mermaid
erDiagram
    Usuarios ||--o{ Cita : "programa"
    Usuarios ||--o| Medico : "es (si rol=doctor)"
    Usuarios ||--o| HistorialMedico : "tiene"
    Usuarios ||--o{ DocumentoConsulta : "sube"
    
    Medico ||--o{ Cita : "atiende"
    Medico ||--o{ NotaMedica : "escribe"
    Medico ||--o{ RecetaMedica : "prescribe"
    
    Cita ||--o| NotaMedica : "genera"
    Cita ||--o{ RecetaMedica : "incluye"
    
    HistorialMedico ||--o{ MedicationReminder : "contiene"
    HistorialMedico ||--o{ EmergencyInfo : "incluye"
    
    Usuarios {
        uuid id PK
        string email
        string password
        enum role
        boolean isActive
    }
    
    Cita {
        uuid id PK
        timestamp fecha
        enum estado
        uuid paciente_id FK
        uuid medico_id FK
    }

    Medico {
        uuid id PK
        uuid usuario_id FK
        string especialidad
        string licencia
    }

    HistorialMedico {
        uuid id PK
        uuid usuario_id FK
        jsonb diagnosticos
        jsonb antecedentes
    }
```

---

## 🛠️ **Stack Tecnológico**

| Capa | Tecnologías | Descripción |
| :--- | :--- | :--- |
| **Core** | ![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) | Framework progresivo y tipado estático |
| **Data** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) ![TypeORM](https://img.shields.io/badge/TypeORM-FE0E0E?logo=typeorm&logoColor=white) | Persistencia robusta y ORM |
| **Cache** | ![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white) | Gestión de sesiones y rate limiting |
| **IA & Bot** | ![Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?logo=google-bard&logoColor=white) ![Telegram](https://img.shields.io/badge/Telegram_API-26A5E4?logo=telegram&logoColor=white) | Procesamiento de lenguaje natural y mensajería |
| **API** | ![GraphQL](https://img.shields.io/badge/GraphQL-E10098?logo=graphql&logoColor=white) ![Swagger](https://img.shields.io/badge/Swagger-85EA2D?logo=swagger&logoColor=black) | Interfaces flexibles y documentación |

---

## 🚀 **Instalación y Despliegue**

### Prerrequisitos
*   **Node.js** v18+
*   **PostgreSQL** v14+
*   **Redis** v6+

### 1. Clonar el repositorio
```bash
git clone https://github.com/RubenDarioGuerreroNeira/medical-appointments-api.git
cd medical-appointments-api
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar entorno
Crea un archivo `.env` basado en `.env.example`:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medical_db

# Security
JWT_SECRET=super_secret_key_change_me

# External Services
TELEGRAM_BOT_TOKEN=your_token
GEMINI_API_KEY=your_key
CLOUDINARY_URL=your_url
```

### 4. Inicializar base de datos
```bash
npm run migration:run
```

### 5. Iniciar servidor
```bash
# Modo Desarrollo
npm run start:dev

# Modo Producción
npm run build
npm run start:prod
```

---

## 🧪 **Calidad y Testing**

El proyecto mantiene altos estándares de calidad de código y cobertura de pruebas.

```bash
npm run test          # Unit Tests
npm run test:e2e      # End-to-End Tests
npm run test:cov      # Coverage Report
```

> **Coverage Goal:** > 90% en módulos críticos.

---

## 📞 **Autor y Contacto**

<div align="center">
  <img src="https://github.com/RubenDarioGuerreroNeira.png" width="100px" style="border-radius: 50%;" alt="Avatar"/>
  <br />
  <strong>Rubén D. Guerrero N.</strong>
  <br />
  <p>Full Stack Developer & AI Integration Specialist</p>
  
  <a href="mailto:rudargeneira@gmail.com">
    <img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
  <a href="https://t.me/Rubedev">
    <img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
  </a>
  <a href="https://linkedin.com/in/rubendguerrero">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
</div>

---

<p align="center">
  Made with ❤️ using NestJS and AI
</p>
