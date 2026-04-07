const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({ email: 'admin@example.com' });

    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit();
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@erp.com',
      password: hashedPassword,
      role: 'admin',
      department: 'admin',
      isActive: true,
    });

    console.log('Admin created:', admin.email);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();