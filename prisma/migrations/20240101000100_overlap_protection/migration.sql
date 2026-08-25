-- Защита от двойного бронирования на уровне базы данных.
--
-- Идея: у каждой брони есть вычисляемый диапазон времени (time_range).
-- PostgreSQL умеет гарантировать через EXCLUDE-ограничение, что среди
-- активных броней (PENDING/CONFIRMED) не может быть двух с пересекающимися
-- диапазонами — это проверяется атомарно на уровне БД при INSERT/UPDATE,
-- а не в коде приложения. Значит, даже если два запроса на создание брони
-- придут одновременно (гонка), выиграет только один — второй получит
-- ошибку конфликта прямо от базы.
--
-- REJECTED/CANCELLED брони не блокируют время (см. WHERE-условие ниже),
-- поэтому отклонённая или отменённая бронь сразу освобождает слот.
--
-- Проверено вручную (см. сессию разработки): пересекающиеся PENDING-брони
-- отклоняются с ошибкой "conflicting key value violates exclusion
-- constraint", непересекающиеся создаются нормально, а отклонённая бронь
-- корректно освобождает своё время для новой.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD COLUMN "time_range" tstzrange GENERATED ALWAYS AS (tstzrange("starts_at", "ends_at", '[)')) STORED;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("time_range" WITH &&)
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));
