import mongoose, { Schema, Document } from 'mongoose'

const DaySchema = new Schema({
  open:  { type: Boolean, default: true },
  start: { type: String, default: '09:00' },
  end:   { type: String, default: '19:00' },
}, { _id: false })

export interface IScheduleDoc extends Document {
  salonId: mongoose.Types.ObjectId
  days: { [key: string]: { open: boolean; start: string; end: string } }
}

const ScheduleSchema = new Schema<IScheduleDoc>({
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, unique: true },
  days: {
    Lu: { type: DaySchema, default: () => ({ open: true,  start: '09:00', end: '19:00' }) },
    Ma: { type: DaySchema, default: () => ({ open: true,  start: '09:00', end: '19:00' }) },
    Me: { type: DaySchema, default: () => ({ open: true,  start: '09:00', end: '19:00' }) },
    Je: { type: DaySchema, default: () => ({ open: true,  start: '09:00', end: '19:00' }) },
    Ve: { type: DaySchema, default: () => ({ open: true,  start: '09:00', end: '19:00' }) },
    Sa: { type: DaySchema, default: () => ({ open: true,  start: '09:00', end: '18:00' }) },
    Di: { type: DaySchema, default: () => ({ open: false, start: '09:00', end: '18:00' }) },
  }
}, { timestamps: true })

export default mongoose.models.Schedule || mongoose.model<IScheduleDoc>('Schedule', ScheduleSchema)
