-- Terra Pride demo seed: 30 public gallery photos.
-- Run in Supabase SQL editor for the environment you want to preview.
-- Cleanup:
--   delete from public.photos where image_path like 'seed/demo/%';
--   delete from public.users where email = 'demo.seed@terra.local';

with demo_user as (
  insert into public.users (email)
  values ('demo.seed@terra.local')
  on conflict (email) do update set email = excluded.email
  returning id
),
seed_rows (n, caption) as (
  values
    (1, 'รถดี คู่ Pride ตลอดไป'),
    (2, 'ชมวิวสวยๆ กาแฟมุมโปรด'),
    (3, 'ชาว redblue เจ้าของเสียงหน่อย'),
    (4, 'การเดินทางของนักผจญภัย'),
    (5, 'ภาพสุดโหลดยามบ่าย'),
    (6, 'สีสันตรงทางเดิน'),
    (7, 'วันทำงานที่มีแดดนิดๆ'),
    (8, 'มุมเล็กๆ ที่อยากเก็บไว้'),
    (9, 'แสงเช้าในเมืองใหญ่'),
    (10, 'พักหายใจระหว่างทาง'),
    (11, 'รูปนี้มีเรื่องเล่า'),
    (12, 'ทางผ่านที่กลายเป็นความทรงจำ'),
    (13, 'จังหวะที่พอดีมาก'),
    (14, 'วันนี้ฟ้าดีเป็นพิเศษ'),
    (15, 'สีของวันศุกร์'),
    (16, 'ความสุขแบบไม่ต้องจัดฉาก'),
    (17, 'มองไกลๆ แล้วใจนิ่ง'),
    (18, 'ทางเดินของเรา'),
    (19, 'ประกายเล็กๆ หลังเลิกงาน'),
    (20, 'เมืองที่มีสีรุ้งซ่อนอยู่'),
    (21, 'แอบถ่ายแสงสวย'),
    (22, 'อีกมุมหนึ่งของ Terra'),
    (23, 'รูปโปรดประจำวันนี้'),
    (24, 'ถนนกับแสงไฟ'),
    (25, 'แดดนุ่มๆ ก่อนเย็น'),
    (26, 'มุมนี้ขอเก็บไว้ก่อน'),
    (27, 'จังหวะเดินผ่าน'),
    (28, 'ภาพที่ทำให้ยิ้ม'),
    (29, 'มุมธรรมดาที่ไม่ธรรมดา'),
    (30, 'ปิดท้ายด้วยสีสวยๆ')
)
insert into public.photos (
  owner_user_id,
  image_url,
  image_path,
  thumbnail_url,
  caption,
  created_at
)
select
  demo_user.id,
  'https://picsum.photos/seed/terra-pride-' || lpad(seed_rows.n::text, 2, '0') || '/1400/1800',
  'seed/demo/terra-pride-' || lpad(seed_rows.n::text, 2, '0') || '.jpg',
  'https://picsum.photos/seed/terra-pride-' || lpad(seed_rows.n::text, 2, '0') || '/600/800',
  seed_rows.caption,
  now() - (seed_rows.n || ' minutes')::interval
from seed_rows
cross join demo_user;
