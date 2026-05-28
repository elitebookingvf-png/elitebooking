import mongoose, { Schema, Document } from 'mongoose'

export interface IStaffDoc extends Document {
  salonId: mongoose.Types.ObjectId
  firstname: string
  lastname: string
  role: string
  phone?: string
  days: string[]
  start: string
  end: string
}

const StaffSchema = new Schema<IStaffDoc>({
  salonId:   { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  firstname: { type: String, required: true, trim: true },
  lastname:  { type: String, required: true, trim: true },
  role:      { type: String, required: true },
  phone:     { type: String },
  days:      { type: [String], default: ['Lu','Ma','Me','Je','Ve'] },
  start:     { type: String, default: '09:00' },
  end:       { type: String, default: '19:00' },
}, { timestamps: true })

StaffSchema.index({ salonId: 1 })

export default mongoose.models.Staff || mongoose.model<IStaffDoc>('Staff', StaffSchema)
