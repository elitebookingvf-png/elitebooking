import mongoose, { Schema, Document } from 'mongoose'

export interface IServiceDoc extends Document {
  salonId: mongoose.Types.ObjectId
  name: string
  price: number
  duration: number
  desc?: string
  staffIds: mongoose.Types.ObjectId[]
}

const ServiceSchema = new Schema<IServiceDoc>({
  salonId:  { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  name:     { type: String, required: true, trim: true },
  price:    { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 5 }, // minutes
  desc:     { type: String },
  staffIds: [{ type: Schema.Types.ObjectId, ref: 'Staff' }],
}, { timestamps: true })

ServiceSchema.index({ salonId: 1 })

export default mongoose.models.Service || mongoose.model<IServiceDoc>('Service', ServiceSchema)
