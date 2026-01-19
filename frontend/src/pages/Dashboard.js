import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Grade options matching the academic grading scheme
// Marks >= 50%: O, A+, A, B+, B, C
// Marks < 50%: U (To Reappear)
// Special: SC (Successfully Completed - no credit)
const GRADE_OPTIONS = ['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'SC'];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cgpaData, setCgpaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSemester, setCurrentSemester] = useState(1);
  const [subjects, setSubjects] = useState([
    { name: '', credits: '', grade: 'O' }
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCGPAData();
  }, []);

  const fetchCGPAData = async () => {
    try {
      const response = await axios.get(`${API_URL}/cgpa`);
      setCgpaData(response.data);
      
      // Set current semester to the next available
      if (response.data.semesters && response.data.semesters.length > 0) {
        const maxSemester = Math.max(...response.data.semesters.map(s => s.semesterNumber));
        setCurrentSemester(maxSemester);
        
        // Load subjects for current semester if exists
        const currentSemData = response.data.semesters.find(s => s.semesterNumber === maxSemester);
        if (currentSemData) {
          setSubjects(
            currentSemData.subjects.map(s => ({
              name: s.name,
              credits: s.credits,
              grade: s.grade
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching CGPA data:', error);
      
      // Handle authentication errors (401)
      if (error.response?.status === 401) {
        setMessage({ 
          type: 'error', 
          text: 'Session expired. Please login again.' 
        });
        // Clear invalid token and redirect to login
        logout();
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.message || 'Error loading CGPA data' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = () => {
    setSubjects([...subjects, { name: '', credits: '', grade: 'O' }]);
  };

  const handleRemoveSubject = (index) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((_, i) => i !== index));
    }
  };

  const handleSubjectChange = (index, field, value) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index][field] = value;
    setSubjects(updatedSubjects);
  };

  const handleCalculate = async () => {
    // Validation
    // SC can have 0 credits (no-credit course), other subjects need credits > 0
    const validSubjects = subjects.filter(s => 
      s.name.trim() && s.grade && (s.grade === 'SC' || (s.credits && s.credits > 0))
    );
    
    if (validSubjects.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one valid subject' });
      return;
    }

    for (const subject of validSubjects) {
      if (!subject.name.trim()) {
        setMessage({ type: 'error', text: 'All subjects must have a name' });
        return;
      }
      // SC can have 0 credits, others must have credits > 0
      if (subject.grade !== 'SC' && (!subject.credits || subject.credits <= 0)) {
        setMessage({ type: 'error', text: 'All subjects (except SC) must have valid credits' });
        return;
      }
    }

    setSaving(true);
    setMessage('');

    try {
      // Map subjects for backend - SC always has 0 credits (no-credit course)
      const subjectsToSend = validSubjects.map(s => ({
        name: s.name.trim(),
        credits: s.grade === 'SC' ? 0 : parseInt(s.credits, 10) || 0,
        grade: s.grade
      }));

      // Ensure semesterNumber is a number
      const response = await axios.post(`${API_URL}/cgpa/calculate`, {
        semesterNumber: parseInt(currentSemester, 10),
        subjects: subjectsToSend
      });

      setCgpaData(response.data.cgpaData);
      setMessage({ type: 'success', text: `GPA calculated and saved! Semester GPA: ${response.data.semesterGPA.toFixed(2)}` });
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Calculate GPA error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error calculating GPA';
      setMessage({
        type: 'error',
        text: `Server error: ${errorMessage}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSemesterSelect = (semesterNum) => {
    setCurrentSemester(semesterNum);
    setMessage('');
    
    // Load subjects for selected semester
    if (cgpaData && cgpaData.semesters) {
      const semData = cgpaData.semesters.find(s => s.semesterNumber === semesterNum);
      if (semData) {
        setSubjects(
          semData.subjects.map(s => ({
            name: s.name,
            credits: s.credits,
            grade: s.grade
          }))
        );
      } else {
        setSubjects([{ name: '', credits: '', grade: 'O' }]);
      }
    }
  };

  const handleNewSemester = () => {
    if (cgpaData && cgpaData.semesters && cgpaData.semesters.length > 0) {
      const maxSemester = Math.max(...cgpaData.semesters.map(s => s.semesterNumber));
      setCurrentSemester(maxSemester + 1);
    } else {
      setCurrentSemester(1);
    }
    setSubjects([{ name: '', credits: '', grade: 'O' }]);
    setMessage('');
  };

  const handleDeleteSemester = async (semesterNumber) => {
    if (!window.confirm(`Are you sure you want to delete Semester ${semesterNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/cgpa/semester/${semesterNumber}`);
      
      setCgpaData(response.data.cgpaData);
      setMessage({ type: 'success', text: `Semester ${semesterNumber} deleted successfully. CGPA recalculated.` });
      
      // If we deleted the current semester, switch to another one or reset
      if (currentSemester === semesterNumber) {
        const remainingSemesters = response.data.cgpaData.semesters || [];
        if (remainingSemesters.length > 0) {
          const maxSemester = Math.max(...remainingSemesters.map(s => s.semesterNumber));
          handleSemesterSelect(maxSemester);
        } else {
          setCurrentSemester(1);
          setSubjects([{ name: '', credits: '', grade: 'O' }]);
        }
      }
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error deleting semester'
      });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>CGPA Dashboard</h1>
          <p className="welcome-text">Welcome, {user?.username || 'User'}!</p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        {/* CGPA Overview */}
        <div className="cgpa-overview">
          <div className="cgpa-card">
            <h3>Overall CGPA</h3>
            <div className="cgpa-value">
              {cgpaData?.overallCGPA?.toFixed(2) || '0.00'}
            </div>
            <p className="cgpa-credits">
              Total Credits: {cgpaData?.totalCredits || 0}
            </p>
          </div>
        </div>

        {/* Semester Navigation */}
        <div className="semester-nav">
          <h3>Select Semester</h3>
          <div className="semester-buttons">
            {cgpaData?.semesters?.map((sem) => (
              <div key={sem.semesterNumber} className="semester-button-wrapper">
                <button
                  onClick={() => handleSemesterSelect(sem.semesterNumber)}
                  className={`semester-btn ${currentSemester === sem.semesterNumber ? 'active' : ''}`}
                >
                  Semester {sem.semesterNumber}
                  <span className="semester-gpa">GPA: {sem.gpa.toFixed(2)}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSemester(sem.semesterNumber);
                  }}
                  className="delete-semester-btn"
                  title="Delete Semester"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={handleNewSemester}
              className="semester-btn new-semester"
            >
              + New Semester
            </button>
          </div>
        </div>

        {/* Current Semester Display */}
        {cgpaData?.semesters?.find(s => s.semesterNumber === currentSemester) && (
          <div className="current-semester-info">
            <h3>Semester {currentSemester} GPA: {
              cgpaData.semesters.find(s => s.semesterNumber === currentSemester).gpa.toFixed(2)
            }</h3>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Subject Input Form */}
        <div className="subjects-section">
          <div className="section-header">
            <h3>Semester {currentSemester} Subjects</h3>
            <button onClick={handleAddSubject} className="btn btn-primary">
              + Add Subject
            </button>
          </div>

          <div className="subjects-list">
            {subjects.map((subject, index) => (
              <div key={index} className="subject-row">
                <input
                  type="text"
                  placeholder="Subject Name"
                  value={subject.name}
                  onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                  className="subject-input"
                />
                <input
                  type="number"
                  placeholder="Credits"
                  value={subject.credits}
                  onChange={(e) => handleSubjectChange(index, 'credits', e.target.value)}
                  min="1"
                  className="subject-input credits-input"
                />
                <select
                  value={subject.grade}
                  onChange={(e) => handleSubjectChange(index, 'grade', e.target.value)}
                  className="subject-select"
                >
                  {GRADE_OPTIONS.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemoveSubject(index)}
                  className="btn btn-danger remove-btn"
                  disabled={subjects.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleCalculate}
            className="btn btn-primary calculate-btn"
            disabled={saving}
          >
            {saving ? 'Calculating...' : 'Calculate & Save GPA'}
          </button>
        </div>

        {/* Previous Semesters Summary */}
        {cgpaData?.semesters && cgpaData.semesters.length > 0 && (
          <div className="semesters-summary">
            <h3>All Semesters Summary</h3>
            <div className="summary-table">
              <div className="summary-header">
                <span>Semester</span>
                <span>GPA</span>
                <span>Credits</span>
                <span>Action</span>
              </div>
              {cgpaData.semesters.map((sem) => (
                <div key={sem.semesterNumber} className="summary-row">
                  <span>Semester {sem.semesterNumber}</span>
                  <span>{sem.gpa.toFixed(2)}</span>
                  <span>{sem.totalCredits}</span>
                  <span>
                    <button
                      onClick={() => handleDeleteSemester(sem.semesterNumber)}
                      className="btn btn-danger delete-btn-small"
                      title="Delete Semester"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
