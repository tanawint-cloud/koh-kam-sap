# เกาะคำศัพท์ — ซอร์สโค้ด (backup)

เกมเรียนคำศัพท์ภาษาอังกฤษสำหรับเด็กไทย + Dashboard ผู้ปกครอง

## โครงสร้าง

| ไฟล์ | คืออะไร |
|------|---------|
| `kohkamsap-src.html` | ต้นฉบับตัวเกม มี placeholder `__AUDIO_JSON__` / `__AUDIO_TH_JSON__` |
| `audio-manifest-en.json` / `audio-manifest-th.json` | แผนที่ชื่อไฟล์เสียง (คำ → path ไฟล์ใน `/audio`) |
| `admin-template.html` | ต้นฉบับหน้า Dashboard มี placeholder `__BACKEND_URL__` / `__ADMIN_DATA__` |
| `admin-data.json` | ข้อมูลคำศัพท์ฝังใน Dashboard (META 217 คำ + 32 หมวด) |
| `Code.gs` | โค้ดหลังบ้าน Google Apps Script (**รหัส admin ถูกลบออก** — ดูด้านล่าง) |

> ไฟล์ที่ deploy จริง (`../index.html`, `../admin.html`, `../audio/`) build มาจากไฟล์เหล่านี้

## วิธี build ตัวเกม (index.html)

แทนที่ placeholder ใน`kohkamsap-src.html`ด้วยเนื้อหาของ manifest 2 ไฟล์:

```python
src = open('kohkamsap-src.html', encoding='utf-8').read()
en  = open('audio-manifest-en.json', encoding='utf-8').read()
th  = open('audio-manifest-th.json', encoding='utf-8').read()
open('../index.html','w',encoding='utf-8').write(
    src.replace('__AUDIO_JSON__', en).replace('__AUDIO_TH_JSON__', th))
```

## วิธี build Dashboard (admin.html)

```python
tpl  = open('admin-template.html', encoding='utf-8').read()
data = open('admin-data.json', encoding='utf-8').read()
BACKEND = 'https://script.google.com/macros/s/XXXX/exec'   # URL ของ Apps Script
open('../admin.html','w',encoding='utf-8').write(
    tpl.replace('__BACKEND_URL__', BACKEND).replace('__ADMIN_DATA__', data))
```

## เสียง

เสียงอังกฤษ = Ava (Premium), เสียงไทย = Narisa (Enhanced) อัดบน macOS:
`say -v "Ava (Premium)" -o out.aiff "cat"` → `afconvert out.aiff -f m4af -d aac -b 24000 -c 1 out.m4a`
ไฟล์เสียงจริงอยู่ใน `../audio/en/` และ `../audio/th/` (ชื่อไฟล์ = slug ของคำ + hash)

## หลังบ้าน (Code.gs)

- ตั้ง `ADMIN_KEY` ในไฟล์ (ตอนนี้เป็น placeholder `__ใส่รหัสลับของคุณตรงนี้__` — **ห้าม commit รหัสจริงลงรีโป public**)
- ดูข้อมูล: `<BACKEND_URL>?action=admin&key=<ADMIN_KEY>`
- กู้ข้อมูลผู้เล่น: `?action=restore&name=&pin=`
- 2 ชีต: "ล่าสุด" (1 แถว/คน) + "ประวัติ" (append ตอนเล่นสำเร็จวันใหม่)

## ⚠️ ข้อควรระวัง

- รีโปนี้ **public** (จำเป็นสำหรับ GitHub Pages) — **อย่าใส่รหัส admin จริง** ลงไฟล์ใดๆ
- เพิ่มคำ/หมวดใหม่ต้อง **append ท้าย array เท่านั้น** ห้ามแทรกกลาง (index ผูกกับความคืบหน้าผู้เล่น)
- เพิ่มคำใหม่ต้องเช็ค emoji ไม่ให้ซ้ำกับคำอื่น (โหมดทวนสุ่มรูปมาให้เลือก)
