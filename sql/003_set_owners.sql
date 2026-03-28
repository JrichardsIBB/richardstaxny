-- ============================================================
-- Set Owner Roles
-- Run this AFTER Roy and Jay have created their accounts
-- Replace the emails below with the actual signup emails
-- ============================================================

-- Set Roy as owner
UPDATE profiles
SET role = 'owner'
WHERE email = 'roy@richardstaxny.com';

-- Set Jay as owner (update with your actual email)
-- UPDATE profiles
-- SET role = 'owner'
-- WHERE email = 'jay@youremail.com';

-- Verify the owners
SELECT id, email, full_name, role FROM profiles WHERE role = 'owner';
