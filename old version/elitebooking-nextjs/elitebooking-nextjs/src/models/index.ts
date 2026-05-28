import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── USER ──────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  firstname: string;
  lastname: string;
  email: string;
  password: string;          // bcrypt hash
  type: 'client' | 'pro';
  phone?: string;
  salonId?: string;          // pro only – ref to Salon._id
  pin?: string;              // 4-digit PIN (pro only), stored plain (no PII)
  trialEndsAt?: Date;        // 14-day free trial
  plan?: 'trial' | 'starter' | 'pro';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  firstname:   { type: String, required: true, trim: true },
  lastname:    { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  type:        { type: String, enum: ['client','pro'], default: 'client' },
  phone:       { type: String },
  salonId:     { type: Schema.Types.ObjectId, ref: 'Salon' },
  pin:         { type: String, default: '0000' },
  trialEndsAt: { type: Date },
  plan:        { type: String, enum: ['trial','starter','pro'], default: 'trial' },
}, { timestamps: true });

// ─── SALON ─────────────────────────────────────────────────────────────────
export interface ISalon extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  category: string;          // 'hammam' | 'coiffure' | 'onglerie' | 'spa' | 'massage' | 'autre'
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  rating: number;
  reviewCount: number;
  active: boolean;
  whatsapp?: string;
  instagram?: string;
  coverImage?: string;       // URL (Cloudinary or local /uploads)
  pin: string;               // 4-digit PIN for revenue + cancel protection
}

const SalonSchema = new Schema<ISalon>({
  ownerId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true, trim: true },
  category:    { type: String, required: true },
  city:        { type: String, required: true },
  address:     { type: String },
  phone:       { type: String },
  email:       { type: String },
  description: { type: String },
  rating:      { type: Number, default: 4.5 },
  reviewCount: { type: Number, default: 0 },
  active:      { type: Boolean, default: true },
  whatsapp:    { type: String },
  instagram:   { type: String },
  coverImage:  { type: String },
  pin:         { type: String, default: '0000' },
}, { timestamps: true });
SalonSchema.index({ city: 1, category: 1 });
SalonSchema.index({ ownerId: 1 });

// ─── SERVICE CATEGORY ──────────────────────────────────────────────────────
export interface IServiceCategory extends Document {
  salonId: mongoose.Types.ObjectId;
  name: string;
  color: string;             // hex color e.g. '#C17B4E'
  order: number;
}

const ServiceCategorySchema = new Schema<IServiceCategory>({
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  name:    { type: String, required: true },
  color:   { type: String, default: '#C17B4E' },
  order:   { type: Number, default: 0 },
}, { timestamps: true });
ServiceCategorySchema.index({ salonId: 1, order: 1 });

// ─── SERVICE ───────────────────────────────────────────────────────────────
export interface IService extends Document {
  salonId: mongoose.Types.ObjectId;
  catId?: mongoose.Types.ObjectId;   // ref ServiceCategory
  name: string;
  description?: string;
  priceType: 'fixed' | 'from' | 'quote';
  price: number;                     // 0 if quote
  duration: number;                  // minutes
  staffIds: mongoose.Types.ObjectId[];  // eligible staff; empty = all
  active: boolean;
  order: number;
}

const ServiceSchema = new Schema<IService>({
  salonId:     { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  catId:       { type: Schema.Types.ObjectId, ref: 'ServiceCategory' },
  name:        { type: String, required: true },
  description: { type: String },
  priceType:   { type: String, enum: ['fixed','from','quote'], default: 'fixed' },
  price:       { type: Number, default: 0 },
  duration:    { type: Number, required: true, min: 5 },
  staffIds:    [{ type: Schema.Types.ObjectId, ref: 'Staff' }],
  active:      { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });
ServiceSchema.index({ salonId: 1, catId: 1, order: 1 });

// ─── STAFF ─────────────────────────────────────────────────────────────────
export interface IStaff extends Document {
  salonId: mongoose.Types.ObjectId;
  firstname: string;
  lastname: string;
  role: string;
  days: string[];           // ['Lu','Ma','Me','Je','Ve','Sa','Di']
  start: string;            // '09:00'
  end: string;              // '19:00'
  phone?: string;
  avatar?: string;
  active: boolean;
}

const StaffSchema = new Schema<IStaff>({
  salonId:   { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  firstname: { type: String, required: true },
  lastname:  { type: String, required: true },
  role:      { type: String, default: 'Employé(e)' },
  days:      [{ type: String }],
  start:     { type: String, default: '09:00' },
  end:       { type: String, default: '19:00' },
  phone:     { type: String },
  avatar:    { type: String },
  active:    { type: Boolean, default: true },
}, { timestamps: true });
StaffSchema.index({ salonId: 1 });

// ─── SCHEDULE ──────────────────────────────────────────────────────────────
// One document per salon — stores weekly opening hours
export interface IDaySchedule {
  open: boolean;
  start: string;   // '09:00'
  end: string;     // '19:00'
}
export interface ISchedule extends Document {
  salonId: mongoose.Types.ObjectId;
  Lu: IDaySchedule;
  Ma: IDaySchedule;
  Me: IDaySchedule;
  Je: IDaySchedule;
  Ve: IDaySchedule;
  Sa: IDaySchedule;
  Di: IDaySchedule;
}

const DaySchema = new Schema<IDaySchedule>({
  open:  { type: Boolean, default: true },
  start: { type: String, default: '09:00' },
  end:   { type: String, default: '19:00' },
}, { _id: false });

const ScheduleSchema = new Schema<ISchedule>({
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, unique: true },
  Lu: { type: DaySchema, default: {} },
  Ma: { type: DaySchema, default: {} },
  Me: { type: DaySchema, default: {} },
  Je: { type: DaySchema, default: {} },
  Ve: { type: DaySchema, default: {} },
  Sa: { type: DaySchema, default: { start: '09:00', end: '18:00' } },
  Di: { type: DaySchema, default: { open: false } },
}, { timestamps: true });

// ─── BLOCK (unavailability) ────────────────────────────────────────────────
export interface IBlock extends Document {
  salonId: mongoose.Types.ObjectId;
  label: string;
  date: string;       // 'YYYY-MM-DD'
  start: string;      // 'HH:MM'
  end: string;        // 'HH:MM'
  staffId?: mongoose.Types.ObjectId;  // null = whole salon
}

const BlockSchema = new Schema<IBlock>({
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  label:   { type: String, default: 'Blocage' },
  date:    { type: String, required: true },
  start:   { type: String, required: true },
  end:     { type: String, required: true },
  staffId: { type: Schema.Types.ObjectId, ref: 'Staff' },
}, { timestamps: true });
BlockSchema.index({ salonId: 1, date: 1 });

// ─── RDV (appointment) ─────────────────────────────────────────────────────
export interface IRdv extends Document {
  clientId: mongoose.Types.ObjectId | 'pro-add';
  clientName?: string;       // always stored for display (denormalized)
  clientPhone?: string;
  salonId: mongoose.Types.ObjectId;
  salonName: string;         // denormalized
  serviceId: mongoose.Types.ObjectId;
  serviceName: string;       // denormalized
  staffId: mongoose.Types.ObjectId;
  staffName: string;         // denormalized
  date: string;              // 'YYYY-MM-DD'
  time: string;              // 'HH:MM'
  duration: number;          // minutes
  price: number;
  priceType: 'fixed' | 'from' | 'quote';
  status: 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes?: string;
  groupId?: string;          // UUID linking multiple services booked together
  source: 'client' | 'pro'; // who created the RDV
}

const RdvSchema = new Schema<IRdv>({
  clientId:    { type: Schema.Types.Mixed, required: true },  // ObjectId or 'pro-add'
  clientName:  { type: String },
  clientPhone: { type: String },
  salonId:     { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  salonName:   { type: String, required: true },
  serviceId:   { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceName: { type: String, required: true },
  staffId:     { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  staffName:   { type: String, required: true },
  date:        { type: String, required: true },
  time:        { type: String, required: true },
  duration:    { type: Number, required: true },
  price:       { type: Number, default: 0 },
  priceType:   { type: String, enum: ['fixed','from','quote'], default: 'fixed' },
  status:      { type: String, enum: ['confirmed','cancelled','completed','no-show'], default: 'confirmed' },
  notes:       { type: String },
  groupId:     { type: String },   // random UUID for multi-service bookings
  source:      { type: String, enum: ['client','pro'], default: 'client' },
}, { timestamps: true });
RdvSchema.index({ salonId: 1, date: 1 });
RdvSchema.index({ clientId: 1, status: 1 });
RdvSchema.index({ staffId: 1, date: 1 });
RdvSchema.index({ groupId: 1 });

// ─── Model exports (safe for hot-reload) ───────────────────────────────────
function getModel<T extends Document>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const User            = getModel<IUser>('User', UserSchema);
export const Salon           = getModel<ISalon>('Salon', SalonSchema);
export const ServiceCategory = getModel<IServiceCategory>('ServiceCategory', ServiceCategorySchema);
export const Service         = getModel<IService>('Service', ServiceSchema);
export const Staff           = getModel<IStaff>('Staff', StaffSchema);
export const Schedule        = getModel<ISchedule>('Schedule', ScheduleSchema);
export const Block           = getModel<IBlock>('Block', BlockSchema);
export const Rdv             = getModel<IRdv>('Rdv', RdvSchema);
