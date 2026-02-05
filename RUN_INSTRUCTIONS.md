# How to Run SpaceScope

This project consists of two parts: a **Server** (Node.js/Express) and a **Client** (React + Vite). You need to run both for the application to work correctly.

## Prerequisites
- Node.js installed on your machine.
- NPM (Node Package Manager) included with Node.js.
- **PostgreSQL** installed and running locally.

## 1. Start the Server

1. Open a terminal.
2. Navigate to the `server` directory:
   ```bash
   cd server
   ```
3. Install dependencies (first time only):
   ```bash
   npm install
   ```
    You should see: `Server is running on port 5000`

## 2. Database Setup (PostgreSQL)

1. **Create Database**: Open your PostgreSQL tool (pgAdmin, psql, etc.) and create a new database named `spacescope`.
2. **Configure Environment**: 
   - Open `server/.env`.
   - Update `DATABASE_URL` with your local credentials:
     `DATABASE_URL=postgres://[USER]:[PASSWORD]@localhost:5432/spacescope`
   - Example: `DATABASE_URL=postgres://postgres:admin123@localhost:5432/spacescope`
3. **Table Initialization**: The server automatically creates the required tables (`instructors`, `reports`, etc.) the first time it starts.

## 2. Start the Client

1. Open a **new** terminal window (keep the server running in the first one).
2. Navigate to the `client` directory:
   ```bash
   cd client
   ```
3. Install dependencies (first time only):
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open the link shown in the terminal (usually `https://spacescope-4q7k0htjv-parths-projects-267acbe7.vercel.app`) in your browser.

## Troubleshoot
- **API Issues**: Ensure the server is running. The client expects the API at `https://spacescope-1v1p.onrender.com`.
- **CORS Errors**: If you see CORS errors, ensure the server is running and `cors` is enabled (it is by default in `server/index.js`).
