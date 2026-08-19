-- Seed data: example monitors
insert into public.monitors (name, url, method, interval_minutes, active) values
  ('Example.com', 'https://example.com', 'GET', 5, true),
  ('GitHub', 'https://github.com', 'GET', 5, true),
  ('Flaky demo service', 'https://httpstat.us/503', 'GET', 5, true);
