const { PrismaClient } = require('@prisma/client');
const { success, failure } = require('../utils/helpers');

const prisma = new PrismaClient();

// ─── Saved Consignors ────────────────────────────────────────────────────────

async function listSavedConsignors(req, res) {
  try {
    const consignors = await prisma.savedConsignor.findMany({ orderBy: { name: 'asc' } });
    return success(res, { consignors });
  } catch (e) {
    return failure(res, 'Failed to fetch consignors', 500, e.message);
  }
}

async function createSavedConsignor(req, res) {
  try {
    const { name, pin, addressLine1, addressLine2, city, state, contactPerson, countryCode, phone, email } = req.body;
    if (!name) return failure(res, 'Name is required', 400);
    const consignor = await prisma.savedConsignor.create({
      data: { name, pin, addressLine1, addressLine2, city, state, contactPerson, countryCode: countryCode || '+91', phone, email },
    });
    return success(res, { consignor }, 'Consignor saved', 201);
  } catch (e) {
    return failure(res, 'Failed to create consignor', 500, e.message);
  }
}

async function updateSavedConsignor(req, res) {
  try {
    const { name, pin, addressLine1, addressLine2, city, state, contactPerson, countryCode, phone, email } = req.body;
    const consignor = await prisma.savedConsignor.update({
      where: { id: req.params.id },
      data: { name, pin, addressLine1, addressLine2, city, state, contactPerson, countryCode: countryCode || '+91', phone, email },
    });
    return success(res, { consignor }, 'Consignor updated');
  } catch (e) {
    return failure(res, 'Failed to update consignor', 500, e.message);
  }
}

async function deleteSavedConsignor(req, res) {
  try {
    await prisma.savedConsignor.delete({ where: { id: req.params.id } });
    return success(res, {}, 'Consignor deleted');
  } catch (e) {
    return failure(res, 'Failed to delete consignor', 500, e.message);
  }
}

// ─── Saved Consignees ────────────────────────────────────────────────────────

async function listSavedConsignees(req, res) {
  try {
    const consignees = await prisma.savedConsignee.findMany({ orderBy: { name: 'asc' } });
    return success(res, { consignees });
  } catch (e) {
    return failure(res, 'Failed to fetch consignees', 500, e.message);
  }
}

async function createSavedConsignee(req, res) {
  try {
    const { name, pin, addressLine1, addressLine2, city, state, contactPerson, countryCode, phone, email } = req.body;
    if (!name) return failure(res, 'Name is required', 400);
    const consignee = await prisma.savedConsignee.create({
      data: { name, pin, addressLine1, addressLine2, city, state, contactPerson, countryCode: countryCode || '+91', phone, email },
    });
    return success(res, { consignee }, 'Consignee saved', 201);
  } catch (e) {
    return failure(res, 'Failed to create consignee', 500, e.message);
  }
}

async function updateSavedConsignee(req, res) {
  try {
    const { name, pin, addressLine1, addressLine2, city, state, contactPerson, countryCode, phone, email } = req.body;
    const consignee = await prisma.savedConsignee.update({
      where: { id: req.params.id },
      data: { name, pin, addressLine1, addressLine2, city, state, contactPerson, countryCode: countryCode || '+91', phone, email },
    });
    return success(res, { consignee }, 'Consignee updated');
  } catch (e) {
    return failure(res, 'Failed to update consignee', 500, e.message);
  }
}

async function deleteSavedConsignee(req, res) {
  try {
    await prisma.savedConsignee.delete({ where: { id: req.params.id } });
    return success(res, {}, 'Consignee deleted');
  } catch (e) {
    return failure(res, 'Failed to delete consignee', 500, e.message);
  }
}

module.exports = {
  listSavedConsignors, createSavedConsignor, updateSavedConsignor, deleteSavedConsignor,
  listSavedConsignees, createSavedConsignee, updateSavedConsignee, deleteSavedConsignee,
};
