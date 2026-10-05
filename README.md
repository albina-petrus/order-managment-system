# Order Management System (OMS)

A modern, full-stack Information System designed for managing client orders, tracking statuses, and maintaining a detailed history of interactions (notes, calls, meetings). 

![Dashboard Preview](https://via.placeholder.com/1000x500.png?text=Dashboard+Preview) <!-- Placeholder for a real screenshot -->

## 🌟 Key Features

- **📊 Interactive Dashboard**: View real-time KPIs, revenue trends, and order status distributions using beautiful, interactive charts.
- **📦 Order Management**: Create, view, update, and manage orders. Assign priorities (Low, Medium, High, Urgent) and statuses (Pending, In Progress, Completed, etc.).
- **💬 Interaction Tracking**: Keep a chronological history of client communications directly tied to each order. Log notes, phone calls, emails, and meetings.
- **👥 Client Management**: Quick access to client details and order histories.
- **🔐 Authentication**: Secure login system for managers and administrators.
- **🎨 Premium UI/UX**: Built with modern "Glassmorphism" aesthetics, responsive design, dark mode, and sleek animations.

## 🛠️ Technology Stack

**Frontend:**
- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [shadcn/ui](https://ui.shadcn.com/) for accessible, customizable components
- [Recharts](https://recharts.org/) for data visualization
- [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/react) for testing

**Backend:**
- [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- [SQLite](https://sqlite.org/) (via `better-sqlite3`) for lightweight, fast data storage
- [Jest](https://jestjs.io/) for API and route testing
- JSON Web Tokens (JWT) for authentication

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+ recommended) installed on your machine.

### 1. Clone the repository
```bash
git clone <repository-url>
cd order-managment-system
```

### 2. Setup the Backend
Navigate to the root directory, install dependencies, and start the development server.
```bash
# Install backend dependencies
npm install

# Start the backend server (runs on port 3000 by default)
npm run dev
```

### 3. Setup the Frontend
Open a new terminal window, navigate to the `frontend` directory, install dependencies, and start the Vite dev server.
```bash
# Navigate to the frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the frontend server (runs on port 5173 by default)
npm run dev
```

The application should now be running. Open your browser and navigate to `http://localhost:5173`.

## 🧪 Testing

The project is fully covered by automated tests.

**To run backend tests (Jest):**
```bash
# In the root directory
npm run test
```

**To run frontend tests (Vitest):**
```bash
# In the frontend directory
npm run test
```

## 📂 Project Structure

```text
order-managment-system/
├── src/                  # Backend source code (routes, database, middlewares)
├── tests/                # Backend Jest tests
├── database/             # SQLite database file and setup scripts
├── frontend/             # React Frontend application
│   ├── src/              
│   │   ├── components/   # Reusable UI components (shadcn)
│   │   ├── pages/        # Main pages (Dashboard, Orders, OrderDetails, etc.)
│   │   ├── lib/          # API utilities and helpers
│   │   └── __tests__/    # Vitest frontend tests
│   └── package.json
└── package.json          # Backend dependencies and scripts
```

## 📄 License
This project is licensed under the MIT License.
