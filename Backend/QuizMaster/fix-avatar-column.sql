-- Fix avatar column to support large base64 images
ALTER TABLE users MODIFY COLUMN avatar LONGTEXT;
