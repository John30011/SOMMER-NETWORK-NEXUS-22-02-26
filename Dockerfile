# ==========================================
# Etapa 1: Construcción (La cocina)
# ==========================================
# Usamos una computadora de Node.js pequeña (alpine) para "preparar la comida"
FROM node:20-alpine AS build

# Creamos una carpeta de trabajo dentro de la caja llamada /app
WORKDIR /app

# Copiamos primero la "lista de ingredientes" (archivos de dependencias)
COPY package.json package-lock.json ./

# Instalamos todas las librerías necesarias
RUN npm install

# Copiamos todo el resto del código del proyecto
COPY . .

# Cocinamos el proyecto final (esto crea una carpeta llamada 'dist' con archivos súper comprimidos)
RUN npm run build

# ==========================================
# Etapa 2: Servidor Web (El local y el recepcionista)
# ==========================================
# Ahora usamos a Nginx (un programa que sirve sitios web)
FROM nginx:alpine

# Le damos a Nginx sus instrucciones para que no se pierda buscando páginas (React necesita esto)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Traemos la "comida preparada" (la carpeta dist) desde la Etapa 1 y la ponemos en la bandeja del Recepcionista
COPY --from=build /app/dist /usr/share/nginx/html

# Indicamos que nuestra caja de cristal tendrá la puerta número 80 lista para recibir pedidos
EXPOSE 80

# Encendemos al recepcionista para que empiece a trabajar y no se detenga
CMD ["nginx", "-g", "daemon off;"]
