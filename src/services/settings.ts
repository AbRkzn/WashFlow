import { db } from '@/data/db';
import { SettingsRepository } from '@/data/repositories';
import { DEFAULT_SCHEDULE, SETTING_KEYS, type Schedule } from '@/domain/settings';

const settingsRepository = new SettingsRepository(db);

async function getInt(key: string, fallback: number): Promise<number> {
  const raw = await settingsRepository.get(key);
  const parsed = raw === null ? null : Number.parseInt(raw, 10);
  return parsed === null || Number.isNaN(parsed) ? fallback : parsed;
}

export async function getSchedule(): Promise<Schedule> {
  const [openMinutes, closeMinutes, slotMinutes] = await Promise.all([
    getInt(SETTING_KEYS.businessOpenMinutes, DEFAULT_SCHEDULE.openMinutes),
    getInt(SETTING_KEYS.businessCloseMinutes, DEFAULT_SCHEDULE.closeMinutes),
    getInt(SETTING_KEYS.slotMinutes, DEFAULT_SCHEDULE.slotMinutes),
  ]);
  return { openMinutes, closeMinutes, slotMinutes };
}

export async function setSchedule(schedule: Schedule): Promise<void> {
  await settingsRepository.set(SETTING_KEYS.businessOpenMinutes, String(schedule.openMinutes));
  await settingsRepository.set(SETTING_KEYS.businessCloseMinutes, String(schedule.closeMinutes));
  await settingsRepository.set(SETTING_KEYS.slotMinutes, String(schedule.slotMinutes));
}
