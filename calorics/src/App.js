import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import './App.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/profile.css';

function App() {
  // Simple auth check
  const isAuthenticated = () => !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated() ? <Dashboard /> : <Dashboard />//<Navigate to="/login" />
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route 
          path="/profile" 
          element={
            isAuthenticated() ? <Profile /> : <Profile />//<Navigate to="/login" />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
