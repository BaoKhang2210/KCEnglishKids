const TEACHING_STATUSES = ['ACTIVE', 'UPCOMING'];
const normalizeClassName = value => String(value || '').normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('vi');
module.exports = { TEACHING_STATUSES, normalizeClassName };
