FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source
COPY . .

# Expose the port
EXPOSE 3001

# Start the server
CMD ["npx", "ts-node", "src/index.ts"]
