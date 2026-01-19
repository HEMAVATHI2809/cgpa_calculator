const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  credits: {
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        // SC grades can have 0 credits (no-credit course)
        // All other grades must have credits >= 1
        if (this.grade === 'SC') {
          return value === 0;
        }
        return value >= 1;
      },
      message: 'Credits must be >= 1 for all subjects except SC (which must be 0)'
    }
  },
  grade: {
    type: String,
    required: true
  },
  gradePoint: {
    type: Number,
    required: true
  }
});

const semesterSchema = new mongoose.Schema({
  semesterNumber: {
    type: Number,
    required: true
  },
  subjects: [subjectSchema],
  gpa: {
    type: Number,
    default: 0
  },
  totalCredits: {
    type: Number,
    default: 0
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
});

const cgpaSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  semesters: [semesterSchema],
  overallCGPA: {
    type: Number,
    default: 0
  },
  totalCredits: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure one CGPA document per user
cgpaSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('CGPA', cgpaSchema);
