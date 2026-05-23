-- Recreate chats and messages without FK constraints on userId.
-- D1 enforces FK by default; users authenticated in one environment
-- (e.g. local dev) may not exist in another (remote D1), causing inserts to fail.

CREATE TABLE `__new_chats` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `createdAt` text NOT NULL,
  `focusMode` text NOT NULL,
  `userId` text,
  `files` text DEFAULT '[]',
  `thinkingTimeLimit` integer DEFAULT 0
);
INSERT INTO `__new_chats` SELECT `id`, `title`, `createdAt`, `focusMode`, `userId`, `files`, `thinkingTimeLimit` FROM `chats`;
DROP TABLE `chats`;
ALTER TABLE `__new_chats` RENAME TO `chats`;

CREATE TABLE `__new_messages` (
  `id` integer PRIMARY KEY NOT NULL,
  `type` text NOT NULL,
  `chatId` text NOT NULL,
  `userId` text,
  `createdAt` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `messageId` text NOT NULL,
  `content` text,
  `sources` text DEFAULT '[]'
);
INSERT INTO `__new_messages` SELECT `id`, `type`, `chatId`, `userId`, `createdAt`, `messageId`, `content`, `sources` FROM `messages`;
DROP TABLE `messages`;
ALTER TABLE `__new_messages` RENAME TO `messages`;
