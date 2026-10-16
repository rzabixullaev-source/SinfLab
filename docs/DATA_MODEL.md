# Ma’lumotlar modeli

PostgreSQL asosiy tizim holatini saqlaydi. Har bir jadvalning id maydoni UUID. Vaqtlar UTC timestamptz ko‘rinishida saqlanadi, foydalanuvchiga uning vaqt zonasida chiqariladi. Faylning o‘zi object storage da, bazada faqat kalit va metama’lumot turadi.

## Asosiy bog‘lanish

User → ClassroomMember → Classroom → Lesson
Classroom → Message, Asset, Assignment, Quiz, LabActivity
Lesson → LessonMaterial, LiveSession, Assignment, Quiz, LabActivity
Assignment → Submission → SubmissionRevision → Feedback
Quiz → QuizQuestion → QuizAttempt → QuizResponse
LabTemplate → LabActivity → LabRun

Bir o‘quvchi bir necha xonada bo‘lishi mumkin. Dars, chat, material, vazifa, test va lab aynan bir xonaga tegishli. Xona huquqi har bir so‘rovda tekshiriladi.

## Jadvallar: birinchi migratsiya

### users
id, auth_subject, email, display_name, created_at, updated_at. auth_subject kirish xizmatidagi identifikator; parol bu bazada saqlanmaydi.

### classrooms
id, owner_id, name, subject, mode (course/club), description, status, created_at, updated_at. Xona egasi yagona; keyinchalik egalikni o‘tkazish alohida amal bo‘ladi.

### classroom_members
classroom_id + user_id birgalikda yagona kalit. role (owner/teacher/assistant/student), status (active/invited/removed), joined_at. Bir foydalanuvchi shu xonada faqat bitta faol a’zolikka ega.

### classroom_invites
id, classroom_id, code_hash, intended_role, expires_at, max_uses, used_count, created_by, revoked_at. Kodning o‘zi qayta o‘qilmaydi; faqat yaratilgan zahoti ko‘rsatiladi.

### lessons
id, classroom_id, created_by, title, description, starts_at, ends_at, status (draft/scheduled/live/completed/cancelled), created_at.

### resource_folders
id, classroom_id, parent_id, created_by, title, position, created_at. Papkalar xona ichida ierarxik tartibda saqlanadi.

### assets
id, classroom_id, folder_id, uploaded_by, storage_key, filename, mime_type, byte_size, extraction_status, created_at. Fayl URL emas, storage_key saqlanadi. Yuklash va ko‘rish ruxsatlari API orqali beriladi.

### lesson_materials
lesson_id + asset_id bog‘lanishi, title va position. Bir material bir necha darsga biriktirilishi mumkin.

### messages
id, classroom_id, sender_id, reply_to_id, body, created_at, edited_at, deleted_at. Reply orqali mavzuga bog‘langan suhbat hosil bo‘ladi.

### message_assets
message_id + asset_id boglanishi; xabarga biriktirilgan fayllar shu jadvalda turadi.

### live_sessions
id, lesson_id, provider, provider_room_id, status, started_at, ended_at, recording_asset_id. Kirish tokenlari saqlanmaydi; qisqa muddatga yaratiladi.

### attendance
id, live_session_id, user_id, joined_at, left_at. Qayta ulanish alohida qator bo‘ladi, jami vaqt hisoblanishi mumkin.

### assignments
id, classroom_id, lesson_id, created_by, title, instructions, due_at, status (draft/published/closed), created_at. Vazifa e’loni xona a’zolariga ko‘rinadi.

### submissions
id, assignment_id, student_id, status (draft/submitted/needs_revision/accepted), current_version, submitted_at, updated_at. Bir vazifa uchun bir o‘quvchining bitta asosiy submission qatori bo‘ladi.

### submission_revisions
id, submission_id, version, body, submitted_at. Tuzatishlar tarixi o‘chmaydi. submission_assets orqali fayllar biriktiriladi.

### feedback
id, revision_id, author_id, body, score, created_at. O‘quvchi va shu xonaning ustozlari ko‘radi.

### quizzes va quiz_questions
Quiz: id, classroom_id, lesson_id, created_by, title, status, time_limit_seconds, created_at.
Question: id, quiz_id, kind, prompt, choices JSON, answer_key JSON, source_asset_id, source_locator, position. Manba beti yoki rasm hududi source_locator da bo‘ladi. AI tuzgan savol ustoz tasdiqlamaguncha draft holatida qoladi.

### quiz_attempts va quiz_responses
Attempt: id, quiz_id, student_id, attempt_no, status, started_at, submitted_at, score.
Response: id, attempt_id, question_id, answer JSON, awarded_score, feedback. Bir urinishda bir savolga bitta joriy javob.

### lab_templates
id, code, kind (physics/chemistry/math/code/cyber/language), version, title, config_schema JSON, enabled. Bu fan moduli turi, o‘quvchi urinishi emas.

### lab_activities
id, classroom_id, lesson_id, template_id, created_by, title, configuration JSON, status, opens_at, closes_at. Ustoz bir darsga laboratoriya faoliyatini qo‘shadi.

### lab_runs
id, activity_id, student_id, attempt_no, status, input_data JSON, result_data JSON, evidence_asset_id, sandbox_expires_at, started_at, finished_at. Cyber modulida vaqtinchalik server muddati shu urinishga bog‘lanadi; serverning maxfiy kaliti saqlanmaydi.

### ai_drafts
id, classroom_id, requested_by, source_asset_id, draft_type, status, content JSON, reviewed_by, created_at. AI ishlab bergan test yoki material avval qoralama.

### audit_events
id, classroom_id, actor_id, action, entity_type, entity_id, metadata JSON, created_at. A’zolik, rol, material, baho va lab ishga tushirish kabi muhim o‘zgarishlar qayd etiladi.

## Rejalashtirilgan keyingi model

- organizations, organization_members, group_schedules: o‘quv markazi va xonalar jadvali.
- learning_goals, skills, skill_prerequisites, learner_skill_evidence: maqsad va bilim xaritasi. Skill holati mustaqil urinishlar daliliga tayanadi.
- study_plans, plan_items, review_queue: shaxsiy reja va takrorlash.
- guardian_links, guardian_permissions: ota-ona kirishi va qaysi ma’lumot ochilishi.
- notifications, notification_preferences: dars, vazifa va maslahat eslatmalari.
- ai_conversations, ai_messages: manbaga bog‘langan yordamchi suhbatlari.
- lab_sandbox_instances: cyber mashq serverining ishga tushish/to‘xtash auditi.
- course_catalog, enrollment_requests: kurs va ustoz tanlash.
- payments, invoices: markaz hisob-kitobi.

Bu obyektlar mahsulot dizaynida bor, lekin birinchi migratsiyaga qo‘shilmagan. Har biri tegishli funksiya ishga tushganda migratsiya bilan qo‘shiladi.

## Ruxsat qoidalari

- Xona tarkibi va chat: faqat faol a’zolar.
- Vazifa e’loni: xona a’zolari. Individual submission va feedback: egasi bo‘lgan o‘quvchi, ustoz va huquqli yordamchi.
- Quiz javob kaliti: test yopilgunga yoki ustoz belgilagan vaqtgacha serverda.
- AI qoralama: ustoz tasdiqlamaguncha o‘quvchiga ko‘rinmaydi.
- Lab natijasi: o‘quvchi o‘zini, ustoz guruhni ko‘radi. Ommaviy reyting faqat faoliyatga mos bo‘lsa alohida yoqiladi.
- Yozuv va fayl: xona huquqi tekshirilib, qisqa muddatli havola beriladi.

## Butunlik qoidalari

Barcha child obyektlarning classroom_id qiymati bog‘langan dars/xona bilan bir xil bo‘lishi kerak; API tranzaksiyada tekshiradi. Submission uchun (assignment_id, student_id), revision uchun (submission_id, version), quiz attempt uchun (quiz_id, student_id, attempt_no), lab run uchun (activity_id, student_id, attempt_no) takrorlanmaydi. Baho tarixini saqlash uchun revision va feedback qatorlari tahrir o‘rniga qo‘shiladi.
