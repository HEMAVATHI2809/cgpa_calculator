# CGPA Calculator - Full Stack Web Application

A modern, full-stack web application for calculating and tracking CGPA (Cumulative Grade Point Average) with semester-wise GPA tracking.

## Features

- 🔐 User Authentication (Login/Signup)
- 📊 Semester-wise GPA calculation
- 🎯 Automatic CGPA calculation from all semesters
- 💾 Persistent data storage in MongoDB
- 📱 Responsive and modern UI
- 🔄 Automatic inclusion of previous semester data

## Tech Stack

### Frontend
- React 18
- React Router DOM
- Axios
- Modern CSS with gradients and animations

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing

## Project Structure

```
cg_calci/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── CGPA.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── cgpa.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cgpa_calculator
JWT_SECRET=your_secret_key_here_change_in_production
```

4. Start MongoDB (if running locally):
```bash
# Make sure MongoDB is running on your system
```

5. Start the backend server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional, defaults to localhost:5000):
```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Home Page**: Visit the application to see the landing page
2. **Sign Up**: Create a new account with username, email, and password
3. **Login**: Use your credentials to log in
4. **Dashboard**: 
   - View your overall CGPA
   - Select or create a new semester
   - Add subjects with credits and grades
   - Calculate and save GPA for the current semester
   - View all previous semesters summary

## Grade Scale

The application uses a standard 4.0 grade point scale:
- A+/A: 4.0
- A-: 3.7
- B+: 3.3
- B: 3.0
- B-: 2.7
- C+: 2.3
- C: 2.0
- C-: 1.7
- D+: 1.3
- D: 1.0
- D-: 0.7
- F: 0.0

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Login to existing account

### CGPA
- `GET /api/cgpa` - Get user's CGPA data (requires authentication)
- `POST /api/cgpa/calculate` - Calculate and save semester GPA
- `PUT /api/cgpa/semester/:semesterNumber` - Update a specific semester
- `DELETE /api/cgpa/semester/:semesterNumber` - Delete a semester

## Features in Detail

- **Automatic CGPA Calculation**: When you calculate GPA for a higher semester, the system automatically includes all previous semester data
- **Persistent Storage**: All your academic data is saved in MongoDB and persists across sessions
- **Semester Management**: Easy navigation between semesters, update existing semesters, or add new ones
- **Real-time Updates**: CGPA is recalculated automatically when you save semester GPA

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- Protected routes on both frontend and backend

## License

This project is open source and available for educational purposes.
