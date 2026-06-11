import mongoose, { Schema, Document } from 'mongoose'

export interface IBlockDoc extends Document {
  salonId: mongoose.Types.ObjectId
  label: string
  date: string
  start: string
  end: string
  staff?: string
}

const BlockSchema = new Schema<IBlockDoc>({
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  label:   { type: String, required: true },
  date:    { type: String, required: true },
  start:   { type: String, required: true },
  end:     { type: String, required: true },
  staff:   { type: String },
}, { timestamps: true })

BlockSchema.index({ salonId: 1, date: 1 })

export default mongoose.models.Block || mongoose.model<IBlockDoc>('Block', BlockSchema)
