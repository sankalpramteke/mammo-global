import mongoose, { Schema } from 'mongoose';

const HospitalSchema = new Schema({
  name:       { type: String, required: true },
  hospitalId: { type: String, required: true, unique: true },
  location:   { type: String, default: '' },
  lat:        { type: Number, default: 20.5937 },
  lng:        { type: Number, default: 78.9629 },
  lastSeen:   { type: Date, default: Date.now },
  status:     { type: String, enum: ['online', 'offline'], default: 'offline' },
  totalScans: { type: Number, default: 0 },
  benignCount:    { type: Number, default: 0 },
  malignantCount: { type: Number, default: 0 },
  roundsParticipated: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Hospital || mongoose.model('Hospital', HospitalSchema);
