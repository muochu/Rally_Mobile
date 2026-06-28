const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const fmtTime = (d: Date): string => {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour}${period}`
    : `${hour}:${String(m).padStart(2, '0')}${period}`;
};

export const formatTimeRange = (start: Date, end: Date): string =>
  `${fmtTime(start)}–${fmtTime(end)}`;

export const formatSlotDate = (start: Date): string =>
  `${DAY_NAMES[start.getDay()]} ${MONTH_NAMES[start.getMonth()]} ${start.getDate()}`;

export const formatSlotFull = (start: Date, end: Date): string =>
  `${formatSlotDate(start)}, ${formatTimeRange(start, end)}`;

export const formatDuration = (start: Date, end: Date): string => {
  const totalMins = Math.round((end.getTime() - start.getTime()) / 60_000);
  const totalHours = totalMins / 60;
  if (totalMins < 60) return `${totalMins}m`;
  if (totalHours < 24) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const days = Math.floor(totalHours / 24);
  const remH = Math.floor(totalHours % 24);
  return remH === 0 ? `${days}d` : `${days}d ${remH}h`;
};

export const encodeSlotId = (start: Date, end: Date): string =>
  `${start.getTime()}_${end.getTime()}`;

export const decodeSlotId = (
  slotId: string,
): { start: Date; end: Date } | null => {
  const parts = (slotId ?? '').split('_');
  const startMs = Number(parts[0]);
  const endMs = Number(parts[1]);
  if (!parts[0] || !parts[1] || isNaN(startMs) || isNaN(endMs)) return null;
  return { start: new Date(startMs), end: new Date(endMs) };
};
