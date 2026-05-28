import mongoose, { Schema, Document } from 'mongoose'

export interface IUserDoc extends Document {
  firstname: string
  lastname: string
  email: string
  password: string
  phone?: string
  type: 'client' | 'pro'
  salonId?: mongoose.Types.ObjectId
  createdAt: Date
}

const UserSchema = new Schema<IUserDoc>({
  firstname: { type: String, required: true, trim: true },
  lastname:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  phone:     { type: String },
  type:      { type: String, enum: ['client', 'pro'], default: 'client' },
  salonId:   { type: Schema.Types.ObjectId, ref: 'Salon' },
}, { timestamps: true })

export default mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema)
