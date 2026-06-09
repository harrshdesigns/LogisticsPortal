const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { success, failure } = require('../utils/helpers');

const prisma = new PrismaClient();

async function register(req, res) {
  try {
    const { name, email, password, company, gstin, phone } = req.body;
    if (!name || !email || !password) return failure(res, 'Name, email, and password are required', 400);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return failure(res, 'Email already registered', 409);

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, company, gstin, phone, role: 'CUSTOMER' },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const { password: _, ...userOut } = user;
    return success(res, { user: userOut, token }, 'Registered successfully', 201);
  } catch (e) {
    return failure(res, 'Registration failed', 500, e.message);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return failure(res, 'Email and password required', 400);

    const user = await prisma.user.findUnique({ where: { email }, include: { adminRole: true } });
    if (!user || !user.isActive) return failure(res, 'Invalid credentials', 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return failure(res, 'Invalid credentials', 401);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const { password: _, ...userOut } = user;
    return success(res, { user: userOut, token }, 'Login successful');
  } catch (e) {
    return failure(res, 'Login failed', 500, e.message);
  }
}

async function me(req, res) {
  const { password: _, ...userOut } = req.user;
  return success(res, { user: userOut });
}

async function updateProfile(req, res) {
  try {
    const { name, company, gstin, phone } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, company, gstin, phone },
    });
    const { password: _, ...userOut } = updated;
    return success(res, { user: userOut }, 'Profile updated');
  } catch (e) {
    return failure(res, 'Update failed', 500, e.message);
  }
}

module.exports = { register, login, me, updateProfile };
