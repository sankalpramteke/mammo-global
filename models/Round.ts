import mongoose, { Schema } from 'mongoose';

const RoundSchema = new Schema({
  roundNumber:       { type: Number, required: true },
  accuracy:          { type: Number, required: true },
  participants:      { type: Number, default: 0 },
  hospitalIds:       [{ type: String }],
  contributions:     [{
    hospitalId:   { type: String },
    hospitalName: { type: String },
    sampleCount:  { type: Number },
    weightsHash:  { type: String }
  }],
  modelVersion:      { type: String, default: 'ResNet50-v1.0' },
  weightsPath:       { type: String, default: '' },
  sampleCount:       { type: Number, default: 0 },
  aggregationMethod: { type: String, default: 'FedAvg' },
  status:            { type: String, enum: ['in_progress', 'complete'], default: 'complete' },
  completedAt:       { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Round || mongoose.model('Round', RoundSchema);
