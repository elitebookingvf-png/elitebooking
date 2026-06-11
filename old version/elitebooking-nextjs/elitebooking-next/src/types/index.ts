export interface IUser {
  _id: string
  firstname: string
  lastname: string
  email: string
  phone?: string
  type: 'client' | 'pro'
  salonId?: string
}

export interface ISalon {
  _id: string
  ownerId: string
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

export interface IService {
  _id: string
  salonId: string
  name: string
  price: number
  duration: number
  desc?: string
  staffIds: string[]
}

export interface IStaff {
  _id: string
  salonId: string
  firstname: string
  lastname: string
  role: string
  phone?: string
  days: string[]   // ['Lu','Ma','Me','Je','Ve']
  start: string    // '09:00'
  end: string      // '19:00'
}

export interface IRdv {
  _id: string
  clientId: string
  clientName?: string
  clientPhone?: string
  salonId: string
  salonName: string
  serviceId: string
  serviceName: string
  staffId: string
  staffName: string
  date: string     // 'YYYY-MM-DD'
  time: string     // 'HH:MM'
  price: number
  duration: number
  status: 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  createdAt: string
}

export interface ISchedule {
  salonId: string
  days: {
    [key: string]: { open: boolean; start: string; end: string }
    Lu: { open: boolean; start: string; end: string }
    Ma: { open: boolean; start: string; end: string }
    Me: { open: boolean; start: string; end: string }
    Je: { open: boolean; start: string; end: string }
    Ve: { open: boolean; start: string; end: string }
    Sa: { open: boolean; start: string; end: string }
    Di: { open: boolean; start: string; end: string }
  }
}

export interface IBlock {
  _id: string
  salonId: string
  label: string
  date: string
  start: string
  end: string
  staff?: string
}

export type AgendaView = 'day' | 'staff' | 'week' | 'month'
