# Use an official Node.js runtime as a parent image
FROM node:16

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the app's source code
COPY . .

# Expose the port (Cloud Run expects it to listen on 8080)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
