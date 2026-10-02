import type { CycleRecord } from '../types/autonomous'

const STORAGE_KEY = 'helix_autonomous_cycles'

export function saveCycleRecords(records: CycleRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.error('Failed to persist cycle records to localStorage:', err)
  }
}

export function loadCycleRecords(): CycleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CycleRecord[]
  } catch (err) {
    console.error('Failed to load cycle records from localStorage:', err)
    return []
  }
}

export function clearCycleRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear cycle records from localStorage:', err)
  }
}
