export const toIsoDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const relativeDate = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return toIsoDate(date); };
export const displayDate = value => value?.replace(/^\d{4}-/, '').replace('-', '.');
export const TOMORROW = relativeDate(1);
