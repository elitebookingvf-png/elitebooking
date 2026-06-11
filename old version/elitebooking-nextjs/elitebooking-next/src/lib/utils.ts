// Convert time string "HH:MM" to minutes
export function timeToMin(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + m
}

// Check if a time slot is free for a staff member
export function isSlotFree(
  rdvs: any[],
  staffId: string,
  date: string,
  slotTime: string,
  duration: number
): boolean {
  const s = timeToMin(slotTime)
  const e = s + duration

  const staffRdvs = rdvs.filter(
    (r) => r.staffId?.toString() === staffId && r.date === date && r.status !== 'cancelled'
  )

  for (const r of staffRdvs) {
    const rs = timeToMin(r.time)
    const re = rs + (r.duration || 30)
    if (s < re && e > rs) return false
  }
  return true
}

// Format date to ISO (local timezone)
export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Format date for display
export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

// Generate time slots
export function generateSlots(startH = 9, endH = 20): string[] {
  const slots: string[] = []
  for (let h = startH; h < endH; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`)
    }
  }
  return slots
}
