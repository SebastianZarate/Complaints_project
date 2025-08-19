# 🚀 Tecnologías Utilizadas

## 🖥️ Backend
- **Node.js v18+** – Runtime de JavaScript  
- **Express.js v4.18+** – Framework web  
- **MySQL2 v3.6+** – Cliente MySQL con soporte para promesas  
- **CORS v2.8+** – Manejo de Cross-Origin Resource Sharing  
- **Helmet v7.0+** – Headers de seguridad HTTP  
- **Express Rate Limit v8.0+** – Rate limiting  
- **Compression v1.7+** – Compresión de respuestas  
- **Dotenv v16.3+** – Gestión de variables de entorno  

## 🗄️ Base de Datos
- **MySQL v8.0+** – Sistema de gestión de base de datos relacional  
  - Charset: `utf8mb4` con collation `utf8mb4_unicode_ci`  
  - Engine: `InnoDB` con soporte para transacciones y claves foráneas  

## ☁️ Infraestructura y Despliegue
- **Docker** – Containerización  
- **Docker Compose** – Orquestación de contenedores  
- **Nginx** – Proxy reverso y servidor web  
- **OpenSSL** – Certificados SSL/TLS  

## 🛠️ Herramientas de Desarrollo
- **Jest v29.7+** – Framework de pruebas  
- **Supertest v6.3+** – Pruebas de API HTTP  
- **Nodemon v3.0+** – Desarrollo con recarga automática  
- **ESLint** – Linter de JavaScript  
- **Prettier** – Formateador de código

# ⚡ Instalación y Configuración

## 📋 Prerrequisitos

### 🔹 Para ejecución con Docker (**RECOMENDADO**)
- **Docker v20.0+**  
- **Docker Compose v2.0+**  
- **Git** – Para clonar el repositorio  

### 🔹 Para ejecución manual
- **Node.js v18+**  
- **MySQL v8.0+**  
- **npm v9+**  

# ⚡ Instalación y Configuración

# 🚀 Guía de Instalación y Ejecución

## 📥 1. Clonar el Repositorio

git clone https://github.com/tu-usuario/sistema-quejas-boyaca.git
cd COMPLAINTS_PROJECT

## ⚙️ Instalación Manual

### 1. Instalar dependencias
npm install

### 2. Configurar MySQL (crear base de datos y usuario)
mysql -u root -p

### 3. Inicializar base de datos
npm run init-db

### 4. Iniciar aplicación
npm start


## 🐳 Instalación con Docker (**RECOMENDADO**)

## Generar certificados SSL

Ejecuta el siguiente comando para generar los certificados SSL en la carpeta `ssl` existente:

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -subj "/C=CO/ST=Boyaca/L=Tunja/O=QuejasApp/CN=localhost"

### Construir la imagen y levantar contenedores
docker-compose up -d --build

## 💻 Ejecución en Modo Desarrollo

### 1. Instalar dependencias
npm install

### 2. Configurar base de datos
npm run init-db

### 3. Iniciar en modo desarrollo (con recarga automática)
npm run dev

### 4. Verificar funcionamiento
npm run health-check

## 🎯 Funcionalidades Testadas

### 1. **CONSULTAR QUEJAS**
- ✅ Obtener todas las quejas
- ✅ Consultar quejas por entidad específica
- ✅ Manejar consulta de queja inexistente
- ✅ Obtener lista de entidades disponibles

### 2. **ESCRIBIR QUEJAS**
- ✅ Crear nueva queja exitosamente
- ✅ Validar campos requeridos
- ✅ Validar longitud mínima de descripción (20 caracteres)
- ✅ Validar entidad existente
- ✅ Verificar que la queja creada se puede consultar

### 3. **GENERACIÓN DE REPORTES**
- ✅ Generar reporte de quejas por entidad
- ✅ Generar reporte CSV descargable
- ✅ Verificar rendimiento de generación de reportes

## 📋 Requisitos Previos

1. **Base de datos disponible**: Asegúrate de que MySQL esté corriendo
   ```powershell
   # Verificar contenedores Docker
   docker-compose ps
   
   # Si no están corriendo, levantarlos
   docker-compose up -d
   ```

2. **Dependencias instaladas**:
   ```powershell
   npm install
   ```

3. **Variables de entorno configuradas**: El archivo `.env` debe tener las configuraciones de base de datos

## 🚀 Comandos para Ejecutar Tests

```powershell
npm run test:funcionalidades
```
