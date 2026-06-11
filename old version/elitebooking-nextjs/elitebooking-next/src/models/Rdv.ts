import mongoose, { Schema, Document } from 'mongoose'

export interface IRdvDoc extends Document {
  clientId: mongoose.Types.ObjectId | string
  clientName?: string
  clientPhone?: string
  salonId: mongoose.Types.ObjectId
  salonName: string
  serviceId: mongoose.Types.ObjectId
  serviceName: string
  staffId: mongoose.Types.ObjectId
  staffName: string
  date: string       // 'YYYY-MM-DD'
  time: string       // 'HH:MM'
  price: number
  duration: number   // minutes
  status: 'confirmed' | 'cancelled' | 'completed'
  notes?: string
}

const RdvSchema = new Schema<IRdvDoc>({
  clientId:     { type: Schema.Types.Mixed, required: true }, // ObjectId or 'pro-add'
  clientName:   { type: String },
  clientPhone:  { type: String },
  salonId:      { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  salonName:    { type: String, required: true },
  serviceId:    { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceName:  { type: String, required: true },
  staffId:      { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  staffName:    { type: String, required: true },
  date:         { type: String, required: true },
  time:         { type: String, required: true },
  price:        { type: Number, required: true, min: 0 },
  duration:     { type: Number, required: true, min: 5 },
  status:       { type: String, enum: ['confirmed','cancelled','completed'], default: 'confirmed' },
  notes:        { type: String },
}, { timestamps: true })

RdvSchema.index({ salonId: 1, date: 1 })
RdvSchema.index({ clientId: 1 })
RdvSchema.index({ staffId: 1, date: 1 })

export default mongoose.models.Rdv || mongoose.model<IRdvDoc>('Rdv', RdvSchema)
