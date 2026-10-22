const fs = require('fs');
const path = require('path');

const ADMIN_FILE = path.join(__dirname, '../data/admin-users.json');

function getEnabledAdmins() {
  try {
    const raw = fs.readFileSync(ADMIN_FILE, 'utf8');
    const admins = JSON.parse(raw);
    return admins.filter(a => a && a.enabled
      && Array.isArray(a.notificationTypes) && a.notificationTypes.includes('remittance'));
  } catch (e) {
    return [];
  }
}

module.exports = { getEnabledAdmins };
