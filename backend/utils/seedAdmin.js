const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ROLES } = require('./constants');

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: ROLES.ADMIN });

    if (!adminExists) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('Admin@123', salt);

      await User.create({
        name: 'System Admin',
        email: 'admin@erp.com',
        password: hashedPassword,
        role: ROLES.ADMIN,
        department: 'admin',
        isActive: true,
      });

      console.log('🌱 Default admin user seeded: admin@erp.com / Admin@123');
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  }
};

module.exports = seedAdmin;
