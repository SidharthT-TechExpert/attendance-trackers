const { Schema, model } = require('mongoose');

const attendanceSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'absent',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const sessionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    trainerName: { type: String, trim: true },
    meetListUrl: { type: String, trim: true },
    overview: { type: String, trim: true },
    date: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    attendance: [attendanceSchema],
  },
  { timestamps: true }
);

module.exports = model('Session', sessionSchema);

