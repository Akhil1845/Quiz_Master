-- Clear all data from users table
DELETE FROM user;

-- Reset auto increment ID counter
ALTER TABLE user AUTO_INCREMENT = 1;
