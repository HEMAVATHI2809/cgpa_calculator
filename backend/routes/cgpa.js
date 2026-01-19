const express = require('express');
const CGPA = require('../models/CGPA');
const authenticate = require('../middleware/auth');
const router = express.Router();

// Grade point mapping (10-point academic scale)
// Grades for marks >= 50%: O, A+, A, B+, B, C
// Grade for marks < 50%: U (To Reappear)
// Special grade: SC (Successfully Completed - no credit, excluded from GPA/CGPA)
const GRADE_POINTS = {
  'O': 10,   // Outstanding (marks >= 50%)
  'A+': 9,   // Excellent (marks >= 50%)
  'A': 8,    // Very Good (marks >= 50%)
  'B+': 7,   // Good (marks >= 50%)
  'B': 6,    // Above Average (marks >= 50%)
  'C': 5,    // Average (marks >= 50%)
  'U': 0,    // To Reappear (marks < 50%)
  'SC': 0    // Successfully Completed (no-credit course, excluded from calculations)
};

// Calculate GPA for a semester
// Exclude SC (Successfully Completed) from GPA calculations as it carries no credit
function calculateGPA(subjects) {
  if (!subjects || subjects.length === 0) return 0;
  
  let totalPoints = 0;
  let totalCredits = 0;

  subjects.forEach(subject => {
    // Exclude SC grades from GPA calculation (no-credit courses)
    if (subject.grade !== 'SC') {
      const points = subject.gradePoint * subject.credits;
      totalPoints += points;
      totalCredits += subject.credits;
    }
  });

  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

// Calculate overall CGPA
function calculateCGPA(semesters) {
  if (!semesters || semesters.length === 0) return 0;

  let totalPoints = 0;
  let totalCredits = 0;

  semesters.forEach(semester => {
    if (semester.gpa > 0 && semester.totalCredits > 0) {
      totalPoints += semester.gpa * semester.totalCredits;
      totalCredits += semester.totalCredits;
    }
  });

  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

// Get user's CGPA data
router.get('/', authenticate, async (req, res) => {
  try {
    let cgpaData = await CGPA.findOne({ user: req.user._id }).populate('user', 'username email');

    if (!cgpaData) {
      // Create new CGPA document for user
      cgpaData = new CGPA({
        user: req.user._id,
        semesters: [],
        overallCGPA: 0,
        totalCredits: 0
      });
      await cgpaData.save();
    }

    res.json(cgpaData);
  } catch (error) {
    console.error('Get CGPA error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Calculate and save semester GPA
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const { semesterNumber, subjects } = req.body;

    // Validate and convert semesterNumber to number
    const semesterNum = parseInt(semesterNumber, 10);
    if (!semesterNumber || isNaN(semesterNum) || semesterNum <= 0) {
      return res.status(400).json({ message: 'Please provide a valid semester number' });
    }

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'Please provide subjects' });
    }

    // Validate subjects
    for (const subject of subjects) {
      if (!subject.name || !subject.grade) {
        return res.status(400).json({ message: 'All subjects must have name and grade' });
      }
      // SC can have 0 credits (no-credit course), others must have credits > 0
      if (subject.grade !== 'SC' && (!subject.credits || subject.credits <= 0)) {
        return res.status(400).json({ message: 'All subjects (except SC) must have credits > 0' });
      }
      // Check if grade exists in GRADE_POINTS (use 'in' operator to handle 0 grade points correctly)
      if (!(subject.grade in GRADE_POINTS)) {
        return res.status(400).json({ message: `Invalid grade: ${subject.grade}` });
      }
    }

    // Get or create CGPA document
    let cgpaData = await CGPA.findOne({ user: req.user._id });

    if (!cgpaData) {
      cgpaData = new CGPA({
        user: req.user._id,
        semesters: [],
        overallCGPA: 0,
        totalCredits: 0
      });
    }

    // Map subjects with grade points
    // SC grades are stored with 0 credits (no-credit courses)
    const subjectsWithPoints = subjects.map(subject => ({
      name: subject.name,
      credits: subject.grade === 'SC' ? 0 : (subject.credits || 0),
      grade: subject.grade,
      gradePoint: GRADE_POINTS[subject.grade]
    }));

    // Calculate semester GPA (excludes SC from calculation)
    const semesterGPA = calculateGPA(subjectsWithPoints);
    // Exclude SC grades from credit calculation (no-credit courses)
    const semesterCredits = subjectsWithPoints
      .filter(s => s.grade !== 'SC')
      .reduce((sum, s) => sum + s.credits, 0);

    // Find existing semester or create new one
    const existingSemesterIndex = cgpaData.semesters.findIndex(
      s => s.semesterNumber === semesterNum
    );

    if (existingSemesterIndex >= 0) {
      // Update existing semester
      cgpaData.semesters[existingSemesterIndex].subjects = subjectsWithPoints;
      cgpaData.semesters[existingSemesterIndex].gpa = semesterGPA;
      cgpaData.semesters[existingSemesterIndex].totalCredits = semesterCredits;
      cgpaData.semesters[existingSemesterIndex].calculatedAt = new Date();
    } else {
      // Add new semester
      cgpaData.semesters.push({
        semesterNumber: semesterNum,
        subjects: subjectsWithPoints,
        gpa: semesterGPA,
        totalCredits: semesterCredits,
        calculatedAt: new Date()
      });
    }

    // Sort semesters by semester number
    cgpaData.semesters.sort((a, b) => a.semesterNumber - b.semesterNumber);

    // Calculate overall CGPA from all semesters
    const overallCGPA = calculateCGPA(cgpaData.semesters);
    const totalCredits = cgpaData.semesters.reduce((sum, s) => sum + s.totalCredits, 0);

    cgpaData.overallCGPA = overallCGPA;
    cgpaData.totalCredits = totalCredits;
    cgpaData.lastUpdated = new Date();

    await cgpaData.save();

    res.json({
      message: 'GPA calculated and saved successfully',
      semesterGPA,
      overallCGPA,
      cgpaData
    });
  } catch (error) {
    console.error('Calculate GPA error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update a specific semester
router.put('/semester/:semesterNumber', authenticate, async (req, res) => {
  try {
    const { semesterNumber } = req.params;
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'Please provide subjects' });
    }

    let cgpaData = await CGPA.findOne({ user: req.user._id });
    if (!cgpaData) {
      return res.status(404).json({ message: 'CGPA data not found' });
    }

    const semesterIndex = cgpaData.semesters.findIndex(
      s => s.semesterNumber === parseInt(semesterNumber)
    );

    if (semesterIndex < 0) {
      return res.status(404).json({ message: 'Semester not found' });
    }

    // Validate subjects
    for (const subject of subjects) {
      if (!subject.name || !subject.grade) {
        return res.status(400).json({ message: 'All subjects must have name and grade' });
      }
      // SC can have 0 credits (no-credit course), others must have credits > 0
      if (subject.grade !== 'SC' && (!subject.credits || subject.credits <= 0)) {
        return res.status(400).json({ message: 'All subjects (except SC) must have credits > 0' });
      }
      // Check if grade exists in GRADE_POINTS (use 'in' operator to handle 0 grade points correctly)
      if (!(subject.grade in GRADE_POINTS)) {
        return res.status(400).json({ message: `Invalid grade: ${subject.grade}` });
      }
    }

    // Map subjects with grade points
    const subjectsWithPoints = subjects.map(subject => ({
      name: subject.name,
      credits: subject.grade === 'SC' ? 0 : (subject.credits || 0),
      grade: subject.grade,
      gradePoint: GRADE_POINTS[subject.grade]
    }));

    // Update semester (excludes SC from calculation)
    const semesterGPA = calculateGPA(subjectsWithPoints);
    // Exclude SC grades from credit calculation (no-credit courses)
    const semesterCredits = subjectsWithPoints
      .filter(s => s.grade !== 'SC')
      .reduce((sum, s) => sum + s.credits, 0);

    cgpaData.semesters[semesterIndex].subjects = subjectsWithPoints;
    cgpaData.semesters[semesterIndex].gpa = semesterGPA;
    cgpaData.semesters[semesterIndex].totalCredits = semesterCredits;
    cgpaData.semesters[semesterIndex].calculatedAt = new Date();

    // Recalculate overall CGPA
    const overallCGPA = calculateCGPA(cgpaData.semesters);
    const totalCredits = cgpaData.semesters.reduce((sum, s) => sum + s.totalCredits, 0);

    cgpaData.overallCGPA = overallCGPA;
    cgpaData.totalCredits = totalCredits;
    cgpaData.lastUpdated = new Date();

    await cgpaData.save();

    res.json({
      message: 'Semester updated successfully',
      semesterGPA,
      overallCGPA,
      cgpaData
    });
  } catch (error) {
    console.error('Update semester error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a semester
router.delete('/semester/:semesterNumber', authenticate, async (req, res) => {
  try {
    const { semesterNumber } = req.params;

    let cgpaData = await CGPA.findOne({ user: req.user._id });
    if (!cgpaData) {
      return res.status(404).json({ message: 'CGPA data not found' });
    }

    cgpaData.semesters = cgpaData.semesters.filter(
      s => s.semesterNumber !== parseInt(semesterNumber)
    );

    // Recalculate overall CGPA
    const overallCGPA = calculateCGPA(cgpaData.semesters);
    const totalCredits = cgpaData.semesters.reduce((sum, s) => sum + s.totalCredits, 0);

    cgpaData.overallCGPA = overallCGPA;
    cgpaData.totalCredits = totalCredits;
    cgpaData.lastUpdated = new Date();

    await cgpaData.save();

    res.json({
      message: 'Semester deleted successfully',
      overallCGPA,
      cgpaData
    });
  } catch (error) {
    console.error('Delete semester error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
