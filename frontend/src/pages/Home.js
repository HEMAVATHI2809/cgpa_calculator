import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { token } = useAuth();

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">CGPA Calculator</h1>
        <p className="home-subtitle">
          Track your academic progress and calculate your CGPA with ease
        </p>
        <div className="home-buttons">
          {token ? (
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
              <Link to="/signup" className="btn btn-secondary">
                Sign Up
              </Link>
            </>
          )}
        </div>
        <div className="home-features">
          <div className="feature-card">
            <h3>📊 Semester Tracking</h3>
            <p>Keep track of your GPA for each semester</p>
          </div>
          <div className="feature-card">
            <h3>🎯 CGPA Calculation</h3>
            <p>Automatically calculate your overall CGPA</p>
          </div>
          <div className="feature-card">
            <h3>💾 Save Progress</h3>
            <p>Your academic data is securely saved</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
