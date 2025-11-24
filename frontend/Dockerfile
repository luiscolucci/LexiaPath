# --- ESTÁGIO 1: Build do React ---
FROM node:20-alpine as build

WORKDIR /app

# Copia arquivos de dependência primeiro (para aproveitar cache do Docker)
COPY package.json package-lock.json ./

# Instala dependências
RUN npm install

# Copia o resto do código
COPY . .

# Gera a pasta 'dist' com o site otimizado
RUN npm run build

# --- ESTÁGIO 2: Servidor Nginx ---
FROM nginx:alpine

# Copia os arquivos gerados no estágio anterior para a pasta do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração básica do Nginx para React (SPA)
# Isso garante que se recarregar a página, ele não dê erro 404
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
