const { query } = require('../../db/pool');
const ApiError = require('../../utils/ApiError');

async function getProfile(userId) {
  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.company_name, u.email_verified_at,
            u.created_at, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('User not found');
  return result.rows[0];
}

async function updateProfile(userId, { fullName, companyName }) {
  const result = await query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         company_name = COALESCE($2, company_name),
         updated_at = now()
     WHERE id = $3
     RETURNING id, email, full_name, company_name`,
    [fullName || null, companyName || null, userId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('User not found');
  return result.rows[0];
}

module.exports = { getProfile, updateProfile };
