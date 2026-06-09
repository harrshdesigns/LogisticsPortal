const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { failure } = require('../utils/helpers');

const prisma = new PrismaClient();

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return failure(res, 'No token provided', 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { adminRole: true } });
    if (!user || !user.isActive) return failure(res, 'Unauthorized', 401);
    req.user = user;
    next();
  } catch {
    return failure(res, 'Invalid token', 401);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return failure(res, 'Forbidden', 403);
    }
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    const perms = req.user.adminRole?.permissions || [];
    if (!perms.includes(permission) && req.user.role !== 'SUPER_ADMIN') {
      return failure(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

module.exports = { authenticate, requireRole, requirePermission };
