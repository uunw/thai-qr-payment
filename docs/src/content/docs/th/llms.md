---
title: สำหรับ LLMs
description: ไฟล์ข้อความล้วนของเอกสารทุกหน้าในรูปแบบที่ออกแบบมาเพื่อให้ LLM อ่านได้
---

`thai-qr-payment` มีไฟล์ข้อความล้วน 3 ไฟล์ที่สะท้อนเนื้อหาของเว็บเอกสารนี้ ออกแบบมาเพื่อให้ large language model ใช้งาน ไฟล์ทั้งหมดเป็นไปตามข้อเสนอ [llms.txt](https://llmstxt.org) และสร้างขึ้นใหม่ทุกครั้งที่ build เอกสาร ผ่าน [`starlight-llms-txt`](https://delucis.github.io/starlight-llms-txt/)

| Endpoint                             | จุดประสงค์                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| [`/llms.txt`](/llms.txt)             | ไฟล์ index ขนาดสั้น เชื่อมโยงไปยังไฟล์เต็มอีก 2 ไฟล์ เหมาะสำหรับวางใน context ของ LLM เพื่อใช้เป็น entry-point |
| [`/llms-full.txt`](/llms-full.txt)   | ไฟล์ข้อความเต็มของเอกสารทุกหน้า ~4,600 บรรทัด เหมาะกับโมเดลที่มี context window ขนาดใหญ่                       |
| [`/llms-small.txt`](/llms-small.txt) | เวอร์ชันย่อ ตัด note, tip และหน้า demo ออกเพื่อให้ขนาดพอดีกับ context window ที่เล็ก                           |

## วิธีใช้งาน

วาง URL ลงใน ChatGPT, Claude หรือ Gemini เป็นแหล่งข้อมูล หรือดึงผ่าน command line:

```bash
curl https://thai-qr-payment.js.org/llms.txt
curl https://thai-qr-payment.js.org/llms-full.txt
```

ไฟล์ทั้ง 3 สร้างใหม่ทุกครั้งที่ push เข้า `main` จึงอัปเดตตามเอกสารที่เผยแพร่ตลอดเวลา
