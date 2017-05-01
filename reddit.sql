-- This creates the users table. The username field is constrained to unique
-- values only, by using a UNIQUE KEY on that column
CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(60) NOT NULL, -- why 60??? ask me :)
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- This creates the posts table. The userId column references the id column of
-- users. If a user is deleted, the corresponding posts' userIds will be set NULL.
CREATE TABLE `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(300) DEFAULT NULL,
  `url` varchar(2000) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;




-- 4) Add subreddits functionality
-- This feature will be more complicated to implement, because it will require not only adding 
-- new functions, but also modifying existing ones.
-- 4.1) Step 1:
-- The first step will be to create a subreddits table. Each subreddit should have a unique, 
-- auto incrementing id, a name anywhere from 1 to 30 characters, and an optional description 
-- of up to 200 characters. Each sub should also have createdAt and updatedAt timestamps that 
-- you can copy from an existing table. To guarantee the integrity of our data, we should make 
-- sure that the name column is unique.
-- Once you figure out the correct CREATE TABLE statement, add it to reddit.sql with a comment.

CREATE TABLE `subreddits` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, 
  `name` varchar(30) NOT NULL UNIQUE,
  `description` varchar(200),
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL
  -- PRIMARY KEY (`id`), // if you put 'primary key' on the 'id' line, you dont need to have this line.
  -- UNIQUE KEY `name` (`name`) // if you put 'UNIQUE' on the 'name' line, you dont need to include this line.
);


-- 4.2) Step 2:
-- Then we need to add a subredditId column to the posts table, with associated foreign key. 
-- Once you figure out the correct ALTER TABLE statement, make sure to add it to reddit.sql with 
-- a comment.

ALTER TABLE posts ADD COLUMN subredditId INT REFERENCES subreddits AFTER id; 
-- // REFERENCES in the above means it refers to other table which is the subreddits table and REFERENCES means 'foreign key'
-- look at the first thing on http://dev.mysql.com/doc/refman/5.7/en/alter-table.html, as shown below;
-- ALTER [IGNORE] TABLE tbl_name
--     [alter_specification [, alter_specification] ...]
--     [partition_options]

