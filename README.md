# HRM Employee Self-Service (ESS)

An Employee Self-Service application designed to manage work schedules and employee information. This project consists of a mobile-first frontend built with React Native/Expo and a backend powered by FastAPI.

## Tech Stack

### Frontend
- **Framework:** [Expo](https://expo.dev/) (v54) / React Native
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Styling:** [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **Language:** TypeScript
- **State Management:** React Hooks & Context API
- **UI Components:** [React Native Calendars](https://github.com/wix/react-native-calendars), `@rn-primitives`

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **Validation:** Pydantic (v2)
- **Authentication:** JWT (JSON Web Tokens)
- **Environment Management:** Pydantic Settings

---

## Project Structure

```text
hrm_ess/
├── app/                # Expo Router pages & layouts (Frontend entry points)
│   ├── (auth)/         # Authentication screens and context
│   ├── (tabs)/         # Main application tabs (Schedule, etc.)
│   └── _layout.tsx     # Root layout
├── assets/             # Images, fonts, and other static files
├── backend/            # FastAPI Backend
│   ├── app/            # Main application package
│   │   ├── db/         # Database models, schemas, and session management
│   │   ├── routers/    # API endpoint definitions (auth, employee, department, schedule)
│   │   ├── config.py   # Configuration and environment variable loading
│   │   └── main.py     # FastAPI application entry point
│   ├── docker-compose.yml # PostgreSQL database container setup
│   └── .env            # Backend environment variables
├── components/         # Reusable React Native components
├── hooks/              # Custom React hooks (e.g., useScheduleMonth)
├── lib/                # Utility functions, API clients, and constants
├── package.json        # Frontend dependencies and npm scripts
└── tsconfig.json       # TypeScript configuration
```

---

## Getting Started

### Prerequisites
- **Node.js:** v18.x or higher
- **Python:** 3.10 or higher
- **Docker:** Required for running the PostgreSQL database
- **Mobile Emulator or Expo Go:** For testing the frontend

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv .venv
    # Windows:
    .venv\Scripts\activate
    # Linux/macOS:
    source .venv/bin/activate
    ```

3.  **Install dependencies:**
    *(Note: Add a `requirements.txt` file if missing. Based on the codebase, the following are required)*
    ```bash
    pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic-settings python-multipart python-jose[cryptography] passlib[bcrypt]
    ```

4.  **Configure Environment Variables:**
    Ensure a `.env` file exists in the `backend/` directory:
    ```env
    DATABASE_URL=postgresql+psycopg2://hrm_user:hrm_pass@localhost:5432/hrm
    JWT_SECRET=your_super_secret_key_here
    JWT_ALG=HS256
    ACCESS_TOKEN_EXPIRE_MIN=60
    ```

5.  **Start the Database:**
    ```bash
    docker-compose up -d
    ```

6.  **Run the Server:**
    ```bash
    uvicorn app.main:app --reload
    ```

### Frontend Setup

1.  **Install dependencies:**
    From the root directory, run:
    ```bash
    npm install
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the root directory:
    ```env
    EXPO_PUBLIC_API_URL=http://your-local-ip:8000
    ```

3.  **Start Expo:**
    ```bash
    npm start
    ```
    Press `a` for Android, `i` for iOS, or scan the QR code with the Expo Go app.

---

## Available Scripts

### Frontend (`package.json`)
| Script | Description |
| :--- | :--- |
| `npm start` | Starts the Expo development server. |
| `npm run android` | Opens the app in an Android emulator/device. |
| `npm run ios` | Opens the app in an iOS simulator/device. |
| `npm run web` | Opens the app in a web browser. |
| `npm run lint` | Runs ESLint to check for code quality issues. |
| `npm run reset-project` | Resets the project state (runs `node ./scripts/reset-project.js`). |

### Backend
| Command | Description |
| :--- | :--- |
| `uvicorn app.main:app --reload` | Starts the FastAPI server with hot-reload enabled. |

---

## Environment Variables

### Backend (`backend/.env`)
- `DATABASE_URL`: Connection string for PostgreSQL.
- `JWT_SECRET`: Secret key for signing JWT tokens.
- `JWT_ALG`: Algorithm for JWT (default: `HS256`).
- `ACCESS_TOKEN_EXPIRE_MIN`: Token expiration time in minutes.

### Frontend (`.env`)
- `EXPO_PUBLIC_API_URL`: The base URL of the backend API.

---

## TODOs
- [ ] **Dependencies:** Create a `requirements.txt` or `pyproject.toml` in the `backend` folder.
- [ ] **Tests:** Add unit and integration tests for both frontend (Jest/React Native Testing Library) and backend (Pytest).
- [ ] **Documentation:** Add API documentation (available at `/docs` when the backend is running).
- [ ] **License:** Determine and add a license file.

---

## License
*TODO: Add license information.*
