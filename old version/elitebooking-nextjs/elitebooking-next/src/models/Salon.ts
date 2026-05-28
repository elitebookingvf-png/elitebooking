import mongoose, { Schema, Document } from 'mongoose'

export interface ISalonDoc extends Document {
  ownerId: mongoose.Types.ObjectId
  name: string
  category: string
  city: string
  address?: string
  description?: string
  phone?: string
  rating: number
  reviewsCount: number
  active: boolean
}

const SalonSchema = new Schema<ISalonDoc>({
  ownerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true, trim: true },
  category:     { type: String, required: true },
  city:         { type: String, required: true },
  address:      { type: String },
  description:  { type: String },
  phone:        { type: String },
  rating:       { type: Number, default: 5.0 },
  reviewsCount: { type: Number, default: 0 },
  active:       { type: Boolean, default: true },
}, { timestamps: true })

SalonSchema.index({ city: 1, category: 1 })
SalonSchema.index({ ownerId: 1 })

export default mongoose.models.Salon || mongoose.model<ISalonDoc>('Salon', SalonSchema)
