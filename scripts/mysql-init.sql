-- Script de inicialización para permisos MySQL
-- Este archivo se ejecuta automáticamente cuando se crea el container

-- Crear usuario si no existe y otorgar permisos completos
CREATE USER IF NOT EXISTS 'complaints_user'@'%' IDENTIFIED BY 'secure_password_2024';
CREATE USER IF NOT EXISTS 'complaints_user'@'localhost' IDENTIFIED BY 'secure_password_2024';

-- Otorgar todos los permisos en la base de datos complaints_boyaca
GRANT ALL PRIVILEGES ON complaints_boyaca.* TO 'complaints_user'@'%';
GRANT ALL PRIVILEGES ON complaints_boyaca.* TO 'complaints_user'@'localhost';

-- Permisos adicionales para conexiones desde cualquier IP
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON complaints_boyaca.* TO 'complaints_user'@'%';

-- Aplicar los cambios
FLUSH PRIVILEGES;

-- Verificar que la base de datos existe
CREATE DATABASE IF NOT EXISTS complaints_boyaca CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE complaints_boyaca;

-- Mensaje de confirmación
SELECT 'MySQL initialization completed successfully' as status;