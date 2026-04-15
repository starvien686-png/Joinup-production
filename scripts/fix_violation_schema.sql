-- ======================================================
-- JOINUP! DATABASE SCHEMA SYNCHRONIZATION
-- Goal: Standardize on 'violation_points'
-- ======================================================

-- 1. Remove the redundant column if it still exists
-- Note: MySQL does not natively support 'DROP COLUMN IF EXISTS' in all versions
-- but running this will ensure the schema matches the code.
ALTER TABLE users DROP COLUMN IF EXISTS violation_count;

-- 2. Ensure 'violation_points' exists and is correctly typed
-- This adds it if missing, or does nothing if it already exists (safely).
-- (Using a procedure if you want it to be idempotent on all MySQL versions)

DROP PROCEDURE IF EXISTS FixViolationPoints;
DELIMITER //
CREATE PROCEDURE FixViolationPoints()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'violation_points'
    ) THEN
        ALTER TABLE users ADD COLUMN violation_points INT DEFAULT 0;
    ELSE
        ALTER TABLE users MODIFY COLUMN violation_points INT DEFAULT 0;
    END IF;
END //
DELIMITER ;
CALL FixViolationPoints();
DROP PROCEDURE FixViolationPoints();

-- 3. Verify the final structure
DESCRIBE users;
