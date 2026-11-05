# Kindora — Backend

<p align="center">
  <strong>Small Acts. Greater Impact.</strong>
</p>

<p align="center">
  REST API for Kindora — a community-driven event management and volunteering platform.
</p>

<p align="center">
  Built with Node.js, Express.js, MongoDB, and Better Auth JWT.
</p>

---

## 🌸 About Kindora Backend

The Kindora backend powers the application's event management, user participation, and data operations.

It provides RESTful API endpoints for retrieving events, creating and managing events, joining events, and retrieving user-specific event information.

The backend uses MongoDB for persistent data storage and Better Auth JWT verification to secure protected API endpoints.

## ✨ Features

- **Event Management**
  - Create events.
  - Retrieve all events.
  - Retrieve individual event details.
  - Retrieve upcoming events.
  - Update existing events.
  - Delete events.

- **Event Participation**
  - Join an event.
  - Retrieve joined events.
  - Manage event participants.

- **Authentication & Security**
  - Better Auth JWT verification.
  - Protected API endpoints.
  - Bearer token authentication.
  - Organizer authorization checks.

- **Database**
  - MongoDB database integration.
  - MongoDB Atlas support.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Backend framework |
| MongoDB | NoSQL database |
| MongoDB Atlas | Cloud database |
| Better Auth | Authentication |
| JWT | API authorization |
| dotenv | Environment variables |
| cors | Cross-origin requests |

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- MongoDB Atlas account or local MongoDB
- Git

### 1. Clone the repository

```bash
git clone <YOUR_BACKEND_GITHUB_URL>
```

### 2. Navigate to the project

```bash
cd kindora-backend
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the root directory.

```env
PORT=5000

MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING

AUTH_BASE_URL=http://localhost:3000

CLIENT_URL=http://localhost:3000
```

Replace the placeholder MongoDB connection string with your actual MongoDB URI.

For production, use your deployed frontend URL for `AUTH_BASE_URL` and `CLIENT_URL`.

**Important:** Never commit your `.env` file or expose database credentials, secrets, or private keys.

### 5. Start the server

```bash
node index.js
```

If your project has a development script configured, you can also use:

```bash
npm run dev
```

The server should start at:

```text
http://localhost:5000
```

## 🔐 Authentication & Authorization

Kindora uses Better Auth for authentication and JWT for securing backend API requests.

Protected endpoints require an access token in the request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

The backend verifies the token before allowing access to protected operations.

### Public API Operations

- Retrieve available events.
- Retrieve upcoming events.
- View individual event details.

### Protected API Operations

- Create events.
- Update and delete events.
- Join events.
- Retrieve organizer-specific events.
- Retrieve user-specific joined events.

**Note:** Authentication and authorization are enforced by the backend, not just by frontend page restrictions.

## 📡 API Documentation

The following describes the main API operations.

| Method | Endpoint | Access |
|---|---|---|
| GET | `/` | Public |
| GET | `/events` | Protected |
| GET | `/events/upcoming` | Public |
| GET | `/events/:id` | Public |
| POST | `/events/create` | Protected |
| GET | `/events/organizer/:email` | Protected |
| PUT | `/events/:id` | Protected |
| DELETE | `/events/:id` | Protected |
| POST | `/events/:id/join` | Protected |
| GET | `/joined-events/:email` | Protected |

All protected endpoints require a valid Bearer token.

*Check the actual Express route definitions in the repository before publishing this table, as route prefixes may depend on how the routers are mounted.*

## 🌐 Deployment

The backend can be deployed to a Node.js hosting platform such as Render.

Configure the required environment variables in your hosting provider's dashboard.

**Backend URL:** `<YOUR_DEPLOYED_BACKEND_URL>`

## 📁 Project Structure

```text
kindora-backend/
│
├── index.js
├── routes/
├── middleware/
├── controllers/
├── models/
├── .env
├── package.json
└── README.md
```

*Representative structure. Adjust it to match the actual backend folders.*

## 🔗 Frontend

The backend provides APIs for the Kindora frontend.

**Frontend Repository:** `kindora-client`

**Live Website:**  
https://kindora-forntend.vercel.app

## 🔒 Security Notes

- Keep database credentials in environment variables.
- Never expose JWT secrets or private keys.
- Verify authentication tokens on protected endpoints.
- Validate incoming request data.
- Check event ownership before allowing organizer operations.
- Never trust user identity supplied only through request bodies or URL parameters.

## 👨‍💻 Author

Developed as part of the Kindora full-stack web development project.

---

<p align="center">
  Made with ❤️ for a kinder community.
</p>
