# Usar Node.js LTS como imagen base
FROM node:18-alpine

# Información de la imagen
LABEL maintainer="Sistema de Quejas Boyacá"
LABEL version="2.0.0"
LABEL description="Sistema de gestión de quejas ciudadanas para Boyacá"

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Configurar zona horaria para Colombia
ENV TZ=America/Bogota
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Crear directorio de la aplicación
WORKDIR /app

# Copiar archivos de package primero (para optimizar cache de Docker)
COPY package*.json ./

# Instalar dependencias
RUN npm install --only=production && \
    npm cache clean --force

# Copiar el resto del código de la aplicación
COPY --chown=nodejs:nodejs . .

# Crear directorios necesarios con permisos correctos
RUN mkdir -p logs data && \
    chown -R nodejs:nodejs logs data

# Cambiar al usuario no-root
USER nodejs

# Exponer el puerto de la aplicación
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Comando para iniciar la aplicación
CMD ["node", "server.js"]