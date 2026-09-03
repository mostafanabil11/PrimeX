"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

// A safety net for legacy and staff-only views while their data remains shared.
// Exact matches only: it never changes values, URLs, names, prices, or API data.
const AR: Record<string, string> = {
  Home: "الرئيسية", Membership: "الاشتراكات", Classes: "الحصص", Trainers: "المدربون",
  Contact: "تواصل معنا", FAQ: "الأسئلة الشائعة", Shop: "المتجر", "Join Now": "اشترك الآن", "Ask on WhatsApp": "اسألنا على واتساب",
  WhatsApp: "واتساب", Search: "بحث", Menu: "القائمة", Close: "إغلاق", Back: "رجوع",
  "Open menu": "فتح القائمة", "ALWAYS OPEN, NO LIMITS": "مفتوح دائماً، بلا حدود", "Open 24 hours, seven days a week": "مفتوح ٢٤ ساعة طوال أيام الأسبوع",
  "Personal Training": "التدريب الشخصي", "Privacy Policy": "سياسة الخصوصية", "Terms of Service": "شروط الاستخدام",
  Login: "تسجيل الدخول", "Log in": "تسجيل الدخول", "Sign up": "إنشاء حساب", Logout: "تسجيل الخروج", Email: "البريد الإلكتروني",
  Password: "كلمة المرور", "Forgot password?": "نسيت كلمة المرور؟", "Reset password": "إعادة تعيين كلمة المرور", Continue: "متابعة",
  Account: "الحساب", Profile: "الملف الشخصي", Settings: "الإعدادات", Orders: "الطلبات", Wishlist: "المفضلة",
  Dashboard: "لوحة التحكم", Memberships: "الاشتراكات", "Class Types": "أنواع الحصص", Enquiries: "الاستفسارات",
  Branches: "الفروع", Plans: "الخطط", Offers: "العروض", "Website Content": "محتوى الموقع", Reviews: "التقييمات", Members: "الأعضاء",
  "Audit Log": "سجل النشاط", Staff: "فريق العمل", Products: "المنتجات", Categories: "التصنيفات", "Promo Codes": "أكواد الخصم",
  Schedule: "الجدول", Customers: "العملاء", Coupons: "كوبونات الخصم", New: "جديد", Add: "إضافة", Edit: "تعديل", Delete: "حذف",
  Save: "حفظ", Cancel: "إلغاء", Confirm: "تأكيد", Submit: "إرسال", Update: "تحديث", View: "عرض", Actions: "الإجراءات",
  Name: "الاسم", Phone: "رقم الهاتف", Status: "الحالة", Active: "نشط", Inactive: "غير نشط", Paid: "مدفوع", Unpaid: "غير مدفوع",
  Payment: "الدفع", Reference: "المرجع", Date: "التاريخ", Price: "السعر", Description: "الوصف", Title: "العنوان", Role: "الدور",
  All: "الكل", Pending: "قيد الانتظار", Confirmed: "مؤكد", Completed: "مكتمل", Notes: "ملاحظات", Details: "التفاصيل",
  Previous: "السابق", Next: "التالي", Loading: "جارٍ التحميل", "No results found": "لا توجد نتائج", "Try again": "حاول مرة أخرى",
  "Go back": "رجوع", "Back to home": "العودة للرئيسية", "Something went wrong": "حدث خطأ ما", "Page not found": "الصفحة غير موجودة",
  "That address does not exist, or it has moved. The links below go where most people are heading.": "هذا الرابط غير موجود أو تم نقله. الروابط أدناه تنقلك إلى الوجهات الأكثر طلباً.",
  "Or talk to us →": "أو تحدث معنا ←",
  "This page failed to load. Trying again usually fixes it — if it does not, the gym is on WhatsApp.": "تعذّر تحميل هذه الصفحة. غالباً ما تحل المحاولة مرة أخرى المشكلة، وإذا لم تنجح فتواصل معنا عبر واتساب.",
  "Contact us": "تواصل معنا",
  "24/7 • ALWAYS OPEN, NO LIMITS": "مفتوح ٢٤ ساعة · بلا حدود",
  "Zero Excuses, Maximum Output": "بلا أعذار، أقصى أداء", "Certified Coaches": "مدربون معتمدون", "No Long Contracts": "بدون عقود طويلة", "Open 24/7": "مفتوح ٢٤ ساعة",
  "Pause the announcements": "إيقاف شريط الإعلانات", "Resume the announcements": "تشغيل شريط الإعلانات",
  "Industrial strength discipline": "انضباط يصنع القوة", "Break The Limit": "اكسر حدودك",
  "Industrial strength discipline for those who refuse to settle. We build performance through raw intensity, unwavering commitment and zero friction utility.": "تدريب جاد لمن لا يقبلون بالأداء العادي. نبني القوة واللياقة بالالتزام، والكفاءة، وبيئة تساعدك على التركيز بلا تشتيت.",
  "Choose your path": "اختر اشتراكك", "Compare all plans →": "قارن كل الاشتراكات ←", "All plans →": "كل الاشتراكات ←", "See all": "عرض الكل",
  "Four tiers, each sold over four terms. Pick how often you intend to train and how long you want to commit for.": "أربع فئات بأربع مدد مختلفة. اختر عدد مرات التدريب والمدة التي تناسب هدفك.",
  "Four tiers, each sold over four terms. Pick how often you intend to train and how long you are willing to commit — the longer the term, the lower the monthly rate. Prices are below; memberships are arranged with the team over WhatsApp, and there is no online payment on this site.": "أربع فئات بأربع مدد مختلفة. اختر عدد مرات التدريب والمدة المناسبة لك؛ كلما طالت المدة انخفض المتوسط الشهري. الأسعار موضحة بالأسفل، ويتم حجز الاشتراك والتنسيق مع الفريق عبر واتساب دون دفع إلكتروني على الموقع.",
  "What you get": "ماذا ستحصل عليه", "The Facility": "تجهيزات متكاملة", "Everything you need to get stronger, from elite machines to premium free weights.": "كل ما تحتاجه لتصبح أقوى، من الأجهزة المتطورة إلى الأوزان الحرة عالية الجودة.",
  "Coaches who are certified, not just enthusiastic": "مدربون معتمدون يمتلكون الخبرة، لا الحماس فقط",
  "Equipment maintained on a schedule, not when it breaks": "صيانة دورية للمعدات قبل حدوث الأعطال",
  "Classes capped so you get seen": "أعداد محدودة في الحصص لتحصل على متابعة حقيقية",
  "Train with a coach": "تدرّب مع مدرب", "Capped numbers, so you get corrected rather than counted.": "أعداد محدودة تضمن لك التوجيه وتصحيح الأداء.", "All classes →": "كل الحصص ←",
  "Personal training": "التدريب الشخصي", "The team": "فريق المدربين", "Coached floor most of the day, and one-to-one when you want it.": "مدربون متواجدون أغلب اليوم، وجلسات فردية عندما تحتاجها.", "Meet the team →": "تعرّف على الفريق ←",
  "No excuses": "لا أعذار", "Come and see the place before you decide.": "زُر المكان قبل أن تقرر.", "Come and see the place before you decide. Somebody at the desk will tell you honestly which tier fits.": "زُر المكان قبل أن تقرر. سيساعدك فريق الاستقبال بوضوح في اختيار الاشتراك الأنسب لك.",
  "See plans and prices": "عرض الاشتراكات والأسعار", "Talk to us": "تحدث معنا", "Open now · directions": "مفتوح الآن · الاتجاهات",
  "← All classes": "→ كل الحصص", "What you will use": "ما ستحتاجه", "Length": "المدة", "Group size": "عدد المجموعة", "Intensity": "الشدة", "Ask about this class": "اسأل عن هذه الحصة",
  "Message us on WhatsApp for the full details on this class — what it covers, who coaches it, and when it runs.": "راسلنا على واتساب لمعرفة كل تفاصيل هذه الحصة — محتواها، والمدرب المسؤول عنها، ومواعيدها.",
  "Where to find us": "موقعنا", "Train With Us": "ابدأ التدريب معنا", "Your email address": "بريدك الإلكتروني", "Your email": "بريدك الإلكتروني", Join: "اشترك",
  "All rights reserved.": "جميع الحقوق محفوظة.", "Message PrimeX on WhatsApp": "تواصل مع PrimeX عبر واتساب",
  "Gamal Abd El-Nasir Street, First Al Faiyum, Faiyum Governorate 63511": "شارع جمال عبد الناصر، قسم الفيوم، محافظة الفيوم ٦٣٥١١",
  "The Origin": "البداية",
  "We opened because Fayoum had plenty of places to exercise and very few built for people who take training seriously. Our first floor had eight racks and no mirrors. The idea has not changed since: give serious people the equipment, the coaching and the room to do the work properly.": "بدأنا لأن الفيوم كانت تضم أماكن كثيرة للتمرين، لكن القليل منها صُمم لمن يتعاملون مع التدريب بجدية. انطلقت صالتنا الأولى بثمانية حوامل أوزان ومن دون مرايا. وما زالت الفكرة كما هي: توفير المعدات والتوجيه والمساحة التي يحتاجها كل شخص جاد ليتمرن بالشكل الصحيح.",
  Location: "الموقع", Coaches: "المدربون", "Years of coaching experience": "سنوات من الخبرة التدريبية", Mission: "رسالتنا", "The Mission": "رسالتنا",
  "To make good training accessible to anyone willing to show up for it — with coaching that meets you where you are, and standards that do not move.": "أن نجعل التدريب الجيد متاحاً لكل شخص مستعد للالتزام، بتوجيه يناسب مستواه ومعايير ثابتة لا تتغير.",
  "Why here": "لماذا PrimeX", "What makes the difference": "ما الذي يصنع الفارق", "Come and see it": "تعال وشاهد بنفسك",
  "The floor tells you more than any page can. Book a session and have a look around.": "زيارة المكان ستخبرك أكثر من أي صفحة. احجز موعداً وتعال لتتعرّف على الجيم.", "Find us": "اعرف موقعنا",
  "Every price": "كل الأسعار", "The full grid": "جدول الأسعار الكامل", "Membership price by tier and length": "أسعار الاشتراكات حسب الفئة والمدة", Tier: "الفئة",
  "1 Month": "شهر واحد", "3 Months": "٣ أشهر", "6 Months": "٦ أشهر", "1 Year": "سنة واحدة", Starter: "ستارتر", Master: "ماستر", Elite: "إيليت", Popular: "الأكثر طلباً",
  "Gym or Fitness": "الجيم أو الفتنس", "Gym + Fitness": "الجيم والفتنس", Unlimited: "غير محدود", "Unlimited sessions": "حصص غير محدودة", "every day": "يومياً",
  "Go Pro": "جو برو",
  "Offer on": "العرض ساري", Questions: "أسئلة", "Before you join": "قبل الاشتراك", "Still deciding?": "ما زلت محتاراً؟", "Talk to us first": "تحدث معنا أولاً",
  "What is the difference between the tiers?": "ما الفرق بين فئات الاشتراك؟",
  "How often you can train, and what you can train in. Starter and Go Pro cover the gym floor or the studio timetable — you choose which. Master and Elite cover both, and add jacuzzi, sauna and InBody scans.": "الفرق في عدد مرات التدريب والمناطق المتاحة. يتيح ستارتر وجو برو الاختيار بين صالة الجيم أو جدول الفتنس، بينما يجمع ماستر وإيليت بينهما مع مزايا الجاكوزي والساونا وقياسات InBody.",
  "Is there a joining fee?": "هل توجد رسوم انضمام؟", "There is a one-off joining fee on most plans — we will tell you before you commit to anything. Every annual plan waives it.": "توجد رسوم انضمام تُدفع مرة واحدة على معظم الخطط، وسنوضحها لك قبل تأكيد أي شيء. الخطط السنوية معفاة منها.",
  "What does a session mean?": "ماذا تعني الحصة؟", "One visit. A Go Pro membership at three days a week works out as twelve sessions a month, and the number on each card is the total across the whole term. Elite has no cap at all.": "الحصة تعني زيارة واحدة. اشتراك جو برو لثلاثة أيام أسبوعياً يعادل ١٢ حصة شهرياً، والرقم الموضح على كل بطاقة هو إجمالي المدة بالكامل. اشتراك إيليت غير محدود.",
  "Can I freeze my membership?": "هل يمكن تجميد الاشتراك؟", "The longer Master and Elite plans include a month of freeze time — the card says which. Ask us on WhatsApp or at the desk and we will set the date you choose.": "تتضمن بعض خطط ماستر وإيليت الطويلة شهراً للتجميد كما هو موضح على البطاقة. تواصل معنا عبر واتساب أو الاستقبال لتحديد التاريخ المناسب.",
  "What happens when my plan runs out?": "ماذا يحدث عند انتهاء الاشتراك؟", "Nothing renews automatically. Message us on WhatsApp or drop by the desk when you want to carry on, and we will set you up again.": "لا يتم تجديد أي اشتراك تلقائياً. تواصل معنا عبر واتساب أو الاستقبال عندما ترغب في التجديد.",
  "Do the offers stack?": "هل يمكن جمع أكثر من عرض؟", "No. Where more than one promotion covers a plan you get the single best one, never both applied one after the other. The price on the card is always the price you pay.": "لا. إذا شمل الاشتراك أكثر من عرض فسيُطبق العرض الأفضل فقط. السعر الموضح على البطاقة هو السعر الذي ستدفعه.",
  "Come in and talk it through. We would rather point you at the tier that fits how you actually train than sell you the biggest one.": "تعال وتحدث معنا. نفضّل مساعدتك في اختيار الفئة التي تناسب تدريبك فعلاً بدلاً من بيع الفئة الأعلى.",
  "Strength Foundations": "أساسيات القوة", "Squat, press, hinge, pull. The four movements everything else is built on, coached properly and loaded slowly.": "القرفصاء، والدفع، والانحناء، والسحب. أربع حركات أساسية تتعلمها بتوجيه صحيح وتدرّج مدروس.",
  "HIIT Inferno": "تمارين HIIT المكثفة", "Forty-five minutes of intervals with nowhere to hide. Come having eaten.": "خمس وأربعون دقيقة من التمارين المتقطعة عالية الشدة. احرص على تناول وجبة مناسبة قبل الحصة.",
  "Olympic Lifting": "رفع الأثقال الأولمبي", "Snatch and clean and jerk, from the platform. Technique first — you will spend a session on an empty bar and be glad of it.": "تعلّم الخطف والنتر من المنصة. التقنية أولاً، ثم زيادة الأوزان تدريجياً.",
  "Metabolic Conditioning": "اللياقة الأيضية", "Sustained work at a pace you can hold. Builds the engine everything else runs on.": "تمرين مستمر بوتيرة يمكنك الحفاظ عليها لبناء قاعدة لياقة تدعم كل أنواع التدريب.",
  Moderate: "متوسطة", Hard: "عالية", "Very hard": "عالية جداً", "Head of Strength": "مدرب القوة الرئيسي", "Conditioning Lead": "مدرب اللياقة الرئيسي", "Olympic Lifting Coach": "مدرب رفع أثقال أولمبي", "Mobility & Recovery": "الحركة والاستشفاء",
  Powerlifting: "رفع القوة", "Strength programming": "برامج القوة", "Return from injury": "العودة بعد الإصابة", Conditioning: "اللياقة البدنية", Endurance: "التحمل", "Olympic weightlifting": "رفع الأثقال الأولمبي", Technique: "التقنية", "Youth athletes": "الرياضيون الناشئون", Mobility: "المرونة الحركية", "Injury rehabilitation": "التأهيل بعد الإصابة", Yoga: "اليوغا",
  "Very easy": "خفيفة جداً", Easy: "خفيفة", "Mobility & Core": "المرونة وعضلات الوسط", "Slow, deliberate, and the reason your other sessions keep working. Bring socks.": "حركات هادئة ومدروسة تحافظ على جودة أدائك في باقي التمارين. أحضر جواربك.",
  Boxing: "الملاكمة", "Footwork, combinations and pad work. No sparring, no experience needed.": "حركة القدمين، والتركيبات، والتدريب على الوسائد. بدون نزالات ولا تحتاج إلى خبرة سابقة.",
  "Vinyasa flow, open to every level. The quietest hour in the building.": "تمارين فينياسا تناسب جميع المستويات. ساعة هادئة تستعيد فيها توازنك.",
  "Functional Circuit": "التمارين الوظيفية الدائرية", "Stations, timed rotations, full body. The best place to start if classes are new.": "محطات متتابعة بتوقيت محدد لتمرين الجسم بالكامل. بداية ممتازة إذا كانت الحصص الجماعية جديدة عليك.",
  "Recovery & Stretch": "الاستشفاء والإطالات", "Guided mobility for the day after a heavy session. Thirty minutes, no shoes.": "تمارين حركة موجهة لليوم التالي بعد تمرين قوي. ثلاثون دقيقة بدون أحذية.",
  "Numbers are capped on every session, which is the whole point — a coach who can see the room can correct it.": "الأعداد محدودة في كل حصة، حتى يتمكن المدرب من متابعة الجميع وتصحيح الأداء.",
  "Want to join a class?": "هل تريد الانضمام إلى حصة؟", "Classes run through the week. Message us on WhatsApp and we will tell you what is on and put your name down.": "الحصص متاحة طوال الأسبوع. راسلنا على واتساب لمعرفة المواعيد وتسجيل اسمك.",
  "Private Sessions": "جلسات تدريب فردية", "Pick the coach you want to work with. Every profile takes a request directly — tell them when you can train and what you are working towards, and the team confirms times and pricing with you on WhatsApp.": "اختر المدرب الذي تريد العمل معه. يمكنك إرسال طلب من صفحة أي مدرب، وتحديد الأوقات المناسبة وهدفك، ثم يؤكد الفريق المواعيد والأسعار معك عبر واتساب.",
  Faiyum: "الفيوم", "Boxing Coach": "مدرب ملاكمة", Footwork: "حركة القدمين", "Coach, Beginners Programme": "مدرب برنامج المبتدئين", "Strength for beginners": "القوة للمبتدئين", "Nutrition coaching": "التوجيه الغذائي",
  "Not sure who to pick? Open any profile and send a request anyway — the team will point you at the right coach for what you are after.": "لست متأكداً من اختيار المدرب؟ افتح أي ملف وأرسل طلباً، وسيساعدك الفريق في الوصول إلى المدرب الأنسب لهدفك.",
  years: "سنة خبرة", min: "دقيقة",
  "Questions about membership, classes or personal training? Send us a message and we will come back to you within one working day.": "لديك سؤال عن الاشتراكات أو الحصص أو التدريب الشخصي؟ أرسل لنا رسالة وسنرد عليك خلال يوم عمل واحد.",
  "Your name *": "الاسم *", "Your name": "الاسم", "Phone *": "رقم الهاتف *", "We will call you on this number.": "سنتواصل معك على هذا الرقم.",
  "Optional — add it and we will send you a confirmation.": "اختياري — أضفه إذا أردت استلام تأكيد.", Message: "الرسالة", "Leave this empty": "اترك هذا الحقل فارغاً", "Send message": "إرسال الرسالة",
  "Open in Maps": "فتح في الخرائط", "Open in Maps (opens in new tab)": "فتح في الخرائط (في تبويب جديد)", Map: "الخريطة", "Get directions": "الاتجاهات", "Reach us": "وسائل التواصل",
  "Opening hours": "مواعيد العمل", "Open 24 hours, seven days a week.": "مفتوح ٢٤ ساعة طوال أيام الأسبوع.", "Women-only hours": "مواعيد السيدات", Saturday: "السبت",
  "The floor": "داخل الجيم", "What is here": "التجهيزات المتاحة", "Eight power racks": "ثمانية حوامل للقوة", "Conditioning zone": "منطقة اللياقة", "One studio": "استوديو واحد", Sauna: "ساونا", "Stretching area": "منطقة للإطالات", "Juice bar": "بار للمشروبات",
  "Questions we get asked": "أسئلة تتكرر كثيراً", "If the answer you need is not here, call us or send a message — we would rather tell you properly than have you guess.": "إذا لم تجد الإجابة التي تحتاجها، اتصل بنا أو أرسل رسالة. يسعدنا أن نوضح لك كل شيء بدقة.",
  Joining: "الانضمام", "Can I try before I join?": "هل يمكنني التجربة قبل الاشتراك؟", "Come in and ask at the desk, or message us on WhatsApp — we would rather show you the place than sell you a plan over the internet. The shortest commitment we sell is one month, on any tier.": "تفضل بزيارتنا واسأل فريق الاستقبال، أو راسلنا عبر واتساب. نفضّل أن ترى المكان بنفسك قبل اختيار الاشتراك. أقصر مدة متاحة هي شهر واحد في أي فئة.", "See the plans": "عرض الاشتراكات",
  "What do I need to bring on my first visit?": "ماذا أحضر في أول زيارة؟", "Trainers, something to train in, and a water bottle. Towels and lockers are included with every membership. If you are joining on the day, bring ID.": "حذاء وملابس مناسبة للتمرين وزجاجة مياه. المناشف والخزائن متاحة مع كل اشتراك. وإذا كنت ستشترك في نفس اليوم فأحضر بطاقة الهوية.",
  "There is a one-off joining fee on most plans — we will tell you before you commit to anything. The annual plan waives it entirely.": "توجد رسوم انضمام تُدفع مرة واحدة على معظم الخطط، وسنوضحها لك قبل التأكيد. الخطة السنوية معفاة منها بالكامل.",
  "Do you have a student rate?": "هل يوجد سعر للطلاب؟", "Yes. Bring a valid student card to your first session and we will verify it at the desk.": "نعم. أحضر بطاقة طالب سارية في أول زيارة وسيقوم فريق الاستقبال بالتحقق منها.",
  "How old do I have to be?": "ما الحد الأدنى للعمر؟", "Sixteen to train on the gym floor unsupervised. Fourteen and fifteen year olds can train with a parent present or in a coached session — talk to us first.": "يمكن التدريب في صالة الجيم دون إشراف من عمر ١٦ عاماً. ويمكن لمن أعمارهم ١٤ و١٥ عاماً التدريب بحضور ولي الأمر أو ضمن حصة بإشراف مدرب؛ تواصل معنا أولاً.",
  "Membership and billing": "الاشتراك والدفع", "What payment methods do you accept?": "ما طرق الدفع المتاحة؟", "Cash at the front desk, or an InstaPay transfer. There is no online payment on this site — memberships are arranged with the team directly.": "يمكن الدفع كاش في الاستقبال أو عبر تحويل InstaPay. لا يوجد دفع إلكتروني على الموقع؛ يتم ترتيب الاشتراك مباشرة مع الفريق.",
  "Will my membership renew automatically?": "هل يتجدد الاشتراك تلقائياً؟", "No. Nothing renews on its own and nothing is ever charged without you choosing to pay. Message us on WhatsApp or drop by the desk when you want to carry on.": "لا. لا يتجدد أي اشتراك تلقائياً ولا يتم تحصيل أي مبلغ دون موافقتك. راسلنا عبر واتساب أو تفضل بزيارة الاستقبال عند رغبتك في التجديد.",
  "Most plans include a set number of freeze days — the": "تتضمن معظم الخطط عدداً محدداً من أيام التجميد؛ وتوضح", "plan card": "بطاقة الاشتراك", "says how many. Ask us on WhatsApp or at the desk and we will set the date it starts.": "العدد المتاح. اطلب التجميد عبر واتساب أو الاستقبال وسنحدد تاريخ البداية.",
  "Can I upgrade partway through?": "هل يمكن ترقية الاشتراك أثناء مدته؟", "Yes. Talk to us on WhatsApp or at the desk and we will work out the difference for the time remaining.": "نعم. تواصل معنا عبر واتساب أو الاستقبال وسنحسب فرق السعر للفترة المتبقية.",
  "What if I want to cancel?": "ماذا لو أردت إلغاء الاشتراك؟", "Get in touch and we will process it. Cancellation takes effect after the notice period set out in your membership agreement.": "تواصل معنا وسنتولى الإجراء. يصبح الإلغاء سارياً بعد مدة الإخطار الموضحة في اتفاقية الاشتراك.",
  "Classes and training": "الحصص والتدريب", "Are classes included in my membership?": "هل الحصص مشمولة في الاشتراك؟", "It depends on the plan — some include a set number of classes each month, some include unlimited, and the entry plan is gym floor only. Each": "يعتمد ذلك على الخطة؛ بعضها يشمل عدداً محدداً من الحصص شهرياً، وبعضها غير محدود، والخطة الأساسية مخصصة لصالة الجيم فقط. توضح كل", plan: "خطة", "says which.": "التفاصيل المتاحة.",
  "Do I need to book classes in advance?": "هل يجب حجز الحصص مسبقاً؟", "Message us on WhatsApp and we will put your name down. There is no online booking on this site.": "راسلنا عبر واتساب وسنسجل اسمك. لا يوجد حجز حصص من خلال الموقع.",
  "I have never done a class before. Where do I start?": "لم أجرب الحصص من قبل، من أين أبدأ؟", "Functional Circuit or Strength Foundations. Both are coached from the ground up and assume no experience. Every class also carries an": "ابدأ بالتمارين الوظيفية الدائرية أو أساسيات القوة. كلاهما يبدأ من الأساس ولا يتطلب خبرة سابقة. كما تحمل كل حصة", "intensity rating": "تقييماً للشدة",
  "Do you have women-only hours?": "هل توجد مواعيد مخصصة للسيدات؟", "Yes. The exact windows are on the": "نعم. المواعيد المحددة موجودة في", "contact page": "صفحة التواصل", ", alongside the rest of the week.": " مع باقي مواعيد الأسبوع.",
  "At the gym": "داخل الجيم", "What are your opening hours?": "ما مواعيد العمل؟", "We are open 24 hours a day, seven days a week.": "نحن مفتوحون ٢٤ ساعة يومياً طوال أيام الأسبوع.",
  "Is there parking?": "هل يوجد موقف للسيارات؟", "Yes. The contact page lists what is on site, parking included.": "نعم. تعرض صفحة التواصل كل الخدمات المتاحة في الموقع، ومنها موقف السيارات.",
  "Can I bring a guest?": "هل يمكنني إحضار ضيف؟", "Most plans include guest passes each month. Bring them to the front desk and we will sign them in.": "تشمل معظم الخطط دعوات شهرية للضيوف. اصطحب ضيفك إلى الاستقبال وسنسجل دخوله.",
  "I have an injury. Can I still train?": "لدي إصابة، هل يمكنني التدريب؟", "Usually, and often it is exactly what helps. Tell the front desk when you join, or add it to your profile, and speak to a coach before your first session so they can work around it.": "غالباً نعم، وقد يكون التدريب المناسب جزءاً من التحسن. أخبر فريق الاستقبال عند الاشتراك وتحدث مع مدرب قبل أول حصة ليضع ذلك في الاعتبار.",
  "Still not sure?": "ما زال لديك سؤال؟", "Ask us anything. We will come back to you within one working day.": "اسألنا عن أي شيء، وسنرد عليك خلال يوم عمل واحد.", "Send a message": "إرسال رسالة",
  "Commit to be fit": "التزم لتصبح أقوى", "Welcome back.": "أهلاً بعودتك.", "Fayoum · Est. 2024": "الفيوم · منذ ٢٠٢٤", "Welcome Back": "مرحباً بعودتك", "Sign in to access your account.": "سجّل الدخول للوصول إلى حسابك.",
  "Email Address": "البريد الإلكتروني", "Sign In": "تسجيل الدخول", Or: "أو", "Continue with Google": "المتابعة باستخدام Google",
  "Create Account": "إنشاء حساب", "Create your account": "أنشئ حسابك", "Already have an account?": "لديك حساب بالفعل؟", "Don't have an account?": "ليس لديك حساب؟", "Confirm Password": "تأكيد كلمة المرور",
  "Forgot Password": "نسيت كلمة المرور", "Forgot Password?": "نسيت كلمة المرور؟", "Enter your email and we will send you a reset link.": "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.", "Enter your email and we'll send you a link to reset it.": "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.", "Send Reset Link": "إرسال رابط الاستعادة", "Back to sign in": "العودة لتسجيل الدخول", "Back to Sign In": "العودة لتسجيل الدخول",
  "Remembered it?": "تذكّرت كلمة المرور؟", "Check Your Email": "تحقق من بريدك الإلكتروني",
  "Set New Password": "تعيين كلمة مرور جديدة", "New Password": "كلمة المرور الجديدة", "Confirm New Password": "تأكيد كلمة المرور الجديدة", "Update Password": "تحديث كلمة المرور",
  "Last updated August 2026": "آخر تحديث: أغسطس ٢٠٢٦", "What we collect": "البيانات التي نجمعها", "Health information": "المعلومات الصحية", Payments: "المدفوعات", "How we use it": "كيف نستخدم البيانات", "Who we share it with": "مع من نشارك البيانات", Cookies: "ملفات تعريف الارتباط", "How long we keep it": "مدة الاحتفاظ بالبيانات", "Your rights": "حقوقك", "Getting in touch": "التواصل معنا",
  "When you create an account we collect your name, email address and password. The password is stored as a one-way hash — we never see it, and we cannot recover it for you.": "عند إنشاء حساب نجمع اسمك وبريدك الإلكتروني وكلمة المرور. تُحفظ كلمة المرور بصورة مشفرة أحادية الاتجاه؛ لا يمكننا رؤيتها أو استعادتها نيابةً عنك.",
  "When you join we also collect your phone number, date of birth and an emergency contact. If you sign in with Google we receive your name and email from Google instead of a password.": "عند الاشتراك نجمع أيضاً رقم هاتفك وتاريخ ميلادك وبيانات شخص للاتصال في الطوارئ. وإذا سجلت الدخول عبر Google نستلم اسمك وبريدك الإلكتروني من Google بدلاً من كلمة المرور.",
  "If you send us a message, we keep what you told us so we can call you back.": "إذا أرسلت إلينا رسالة نحتفظ بما شاركته حتى نتمكن من الرد عليك.",
  "Any injuries or conditions you tell us about, and notes a coach makes about training around them, are": "أي إصابات أو حالات صحية تخبرنا بها، وأي ملاحظات يضيفها المدرب لمراعاتها أثناء التدريب، تُعد", "sensitive personal information": "معلومات شخصية حساسة", ", and we treat them differently from everything else.": " ونتعامل معها بعناية خاصة.",
  "They are visible only to you and to the staff who need them to keep you safe — your coaches and the front desk team. They are never used for marketing, never shared with anyone outside the gym, and never sold.": "لا يطّلع عليها إلا أنت وأفراد الفريق الذين يحتاجونها للحفاظ على سلامتك، مثل المدربين وفريق الاستقبال. لا نستخدمها للتسويق ولا نشاركها خارج الجيم ولا نبيعها.",
  "You do not have to tell us anything. Some of it we ask for because training with an unmentioned heart condition is genuinely dangerous, but the choice is yours, and you can remove it from your profile at any time.": "لست ملزماً بمشاركة معلومات صحية، لكننا نسأل عن بعضها لأن التدريب مع حالة قلبية غير معلنة قد يكون خطراً. القرار لك ويمكنك حذفها من ملفك في أي وقت.",
  "There is no online payment on this site at the moment. Membership is arranged with the team over WhatsApp or at the front desk, paid by cash or InstaPay, and the staff member who takes it records it against your membership.": "لا يوجد دفع إلكتروني على الموقع حالياً. يتم ترتيب الاشتراك مع الفريق عبر واتساب أو الاستقبال، والدفع كاش أو عبر InstaPay، ثم يسجل الموظف الدفعة على اشتراكك.",
  "To run your membership: taking payment, telling you when it is due to expire, letting you book classes, and knowing whether you are entitled to walk in.": "لإدارة اشتراكك، بما يشمل تسجيل الدفع وإبلاغك بموعد الانتهاء وحجز الحصص والتحقق من صلاحية الدخول.",
  "To contact you about your membership — receipts, expiry reminders, booking confirmations and anything that affects a class you booked. These are part of the service and are not marketing.": "للتواصل معك بخصوص الاشتراك، مثل الإيصالات وتذكير الانتهاء وتأكيدات الحجز وأي تغيير يؤثر في حصة حجزتها. هذه رسائل خدمية وليست تسويقية.",
  "To send you news and offers, only if you have not turned that off. You can turn it off at any time from your profile settings, and every marketing email has an unsubscribe link.": "لإرسال الأخبار والعروض فقط إذا لم توقف ذلك. يمكنك إيقافها من إعدادات ملفك في أي وقت، وتتضمن كل رسالة تسويقية رابطاً لإلغاء الاشتراك.",
  "Our email provider, to deliver the messages above. Nobody else, unless the law requires it.": "مزود خدمة البريد الإلكتروني لإرسال الرسائل المذكورة أعلاه، ولا نشاركها مع أي جهة أخرى إلا إذا ألزمنا القانون.", "We do not sell your information. There is no version of this where we would.": "لا نبيع معلوماتك تحت أي ظرف.",
  "We use a small number of cookies to keep you signed in. They hold a session token, not your details, and they are set as httpOnly so no script on the page can read them.": "نستخدم عدداً محدوداً من ملفات تعريف الارتباط لإبقائك مسجلاً للدخول. تحتوي على رمز للجلسة لا بياناتك الشخصية، ويتم ضبطها بطريقة تمنع سكربتات الصفحة من قراءتها.", "We do not use advertising cookies or third-party trackers.": "لا نستخدم ملفات إعلانية أو أدوات تتبع تابعة لجهات خارجية.",
  "While you are a member, and for as long afterwards as we are required to keep financial records. Health information is deleted when you ask us to, or when your membership has been closed for two years, whichever comes first.": "نحتفظ بالبيانات أثناء عضويتك وبعدها للمدة التي يفرضها الاحتفاظ بالسجلات المالية. تُحذف المعلومات الصحية عند طلبك أو بعد مرور عامين على إغلاق العضوية، أيهما أقرب.", "Enquiries that never became memberships are deleted after twelve months.": "تُحذف الاستفسارات التي لم تتحول إلى اشتراكات بعد ١٢ شهراً.",
  "You can see everything we hold about you, correct anything that is wrong, ask us to delete it, or ask for a copy to take elsewhere. Ask us and we will do it.": "يمكنك الاطلاع على بياناتك وتصحيح أي خطأ وطلب حذفها أو الحصول على نسخة منها. تواصل معنا لتنفيذ طلبك.", "Deleting your account does not delete records we are legally required to keep, such as invoices. It does delete your health information.": "حذف الحساب لا يلغي السجلات التي يلزمنا القانون بالاحتفاظ بها مثل الفواتير، لكنه يحذف معلوماتك الصحية.",
  "Questions about any of this, or a request you want us to action, go through our": "لأي سؤال أو طلب يتعلق بهذه السياسة، تواصل معنا عبر", "or the front desk at any branch.": "أو فريق الاستقبال.",
  "Who these apply to": "نطاق تطبيق الشروط", "Freezing and cancelling": "التجميد والإلغاء", "Booking classes": "حجز الحصص", "Your health": "صحتك", "Using the gym": "استخدام الجيم", "Your belongings": "متعلقاتك", Changes: "التغييرات",
  "These terms cover anyone using PrimeX — members, guests on a pass, and anyone using this website. Joining, booking a class or walking through the door means you accept them.": "تنطبق هذه الشروط على كل من يستخدم PrimeX، من الأعضاء والضيوف ومستخدمي الموقع. الانضمام أو حجز حصة أو دخول الجيم يعني قبولك لها.",
  "Your membership agreement is a separate document you accept when you join. Where the two disagree, the membership agreement wins.": "اتفاقية الاشتراك وثيقة منفصلة توافق عليها عند الانضمام، وتكون لها الأولوية إذا تعارضت مع هذه الشروط.",
  "A membership is personal to you and cannot be lent, shared or transferred. We may ask for identification at the desk.": "الاشتراك شخصي ولا يجوز إعارته أو مشاركته أو نقله. قد نطلب إثبات الهوية عند الاستقبال.",
  "Your plan runs for the term you bought and ends on the date agreed when you joined. Nothing renews automatically — ask us any time to check how long you have left, and renewing is something you choose to do.": "يسري اشتراكك للمدة التي اخترتها وينتهي في التاريخ المتفق عليه. لا يتم التجديد تلقائياً، ويمكنك سؤالنا في أي وقت عن المدة المتبقية، والتجديد قرار تتخذه أنت.",
  "Prices are in Egyptian pounds and include any applicable tax. A joining fee applies to most plans and is shown before you pay.": "الأسعار بالجنيه المصري وتشمل الضرائب المطبقة. توجد رسوم انضمام على معظم الخطط ويتم توضيحها قبل الدفع.",
  "Most plans include a number of freeze days. Freezing pauses your access and extends your end date by the same number of days, up to the allowance on your plan.": "تشمل معظم الخطط عدداً من أيام التجميد. يوقف التجميد صلاحية الدخول ويمدد تاريخ الانتهاء بالعدد نفسه من الأيام ضمن الحد المتاح في خطتك.",
  "You can cancel at any time by telling us. Cancellation takes effect after the notice period in your membership agreement, and you keep access until then.": "يمكنك طلب الإلغاء في أي وقت. يسري الإلغاء بعد مدة الإخطار المحددة في الاتفاقية، وتظل صلاحية الدخول متاحة حتى ذلك الموعد.",
  "We do not refund unused time on a plan you chose to cancel. If we close the gym or materially change what you paid for, that is different and we will make it right.": "لا نرد قيمة المدة غير المستخدمة عند اختيارك الإلغاء. أما إذا أغلقنا الجيم أو غيّرنا الخدمة الأساسية التي دفعت مقابلها فسنعالج الأمر بصورة عادلة.",
  "Exercise carries risk. You train at your own risk and are responsible for knowing whether you are well enough to do so. If you are unsure, speak to a doctor before you start.": "ينطوي التدريب على مخاطر. أنت مسؤول عن التأكد من ملاءمة حالتك الصحية، وإذا لم تكن متأكداً فاستشر طبيباً قبل البدء.",
  "Our coaches are qualified fitness professionals, not medical practitioners. Nothing they tell you is medical advice.": "مدربونا متخصصون مؤهلون في اللياقة البدنية وليسوا ممارسين طبيين، ولا يُعد توجيههم نصيحة طبية.",
  "Stop and tell a member of staff if you feel unwell, dizzy or in pain while training.": "توقف وأبلغ أحد أفراد الفريق إذا شعرت بتعب أو دوار أو ألم أثناء التدريب.",
  "Photography and filming are not permitted where other members appear without their agreement.": "لا يُسمح بالتصوير إذا ظهر أعضاء آخرون دون موافقتهم.",
  "Anything unclear here, ask us through the": "إذا كان أي بند غير واضح فتواصل معنا عبر", "or at the front desk.": "أو اسأل فريق الاستقبال.",
  "Booking opens two weeks ahead and closes shortly before the class starts. A booked spot is held for you; it is not held for anyone else.": "يبدأ الحجز قبل أسبوعين من الحصة ويُغلق قبل موعدها بوقت قصير. يُحجز لك المكان ولا يُتاح لغيرك.",
  "Cancel within the window shown when you book and your class credit is returned. Cancel later and it is not, because by then the spot cannot be filled by someone else.": "الإلغاء خلال المهلة الموضحة عند الحجز يعيد رصيد الحصة إلى حسابك. الإلغاء بعد ذلك لا يعيده، لأن المكان لم يعد بالإمكان إتاحته لشخص آخر.",
  "Repeatedly booking and not turning up may result in booking being suspended for a short period. This is not a punishment — it is the only way to keep popular classes available to people who will attend.": "الحجز المتكرر دون حضور قد يؤدي إلى إيقاف إمكانية الحجز لفترة قصيرة. هذا ليس عقاباً، بل الوسيلة الوحيدة لإبقاء الحصص المزدحمة متاحة لمن سيحضر فعلاً.",
  "We may cancel a session — a coach falls ill, equipment fails. If we do, everyone booked is notified and any credit used is returned.": "قد نُلغي حصة لسبب طارئ، مثل مرض المدرب أو عطل في المعدات. في هذه الحالة نُخطر جميع من حجزوا ونعيد أي رصيد تم استخدامه.",
  "You must tell us about any condition or injury that affects your ability to train safely, and keep that up to date. Tell the front desk, or add it to your profile from your account.": "يجب إخبارنا بأي حالة صحية أو إصابة تؤثر على قدرتك على التدريب بأمان، وتحديث ذلك عند تغيّره. أخبر فريق الاستقبال أو أضفه إلى ملفك من حسابك.",
  "Use equipment as it is intended and as you have been shown. Put weights back. Wipe equipment down after use. Wear appropriate footwear — no bare feet or open sandals on the gym floor.": "استخدم المعدات كما هو مخصص لها وكما تم توجيهك. أعد الأوزان إلى مكانها. امسح المعدات بعد الاستخدام. ارتدِ حذاءً مناسباً؛ يُمنع التدريب حافي القدمين أو بالصنادل المفتوحة داخل صالة الجيم.",
  "We may end a membership without refund for behaviour that puts others at risk, for harassment of members or staff, or for deliberate damage to equipment. This is rare and we do not do it lightly.": "يجوز لنا إنهاء الاشتراك دون استرداد في حال وجود سلوك يعرّض الآخرين للخطر، أو مضايقة الأعضاء أو الفريق، أو إتلاف متعمد للمعدات. هذا إجراء نادر ولا نلجأ إليه إلا لضرورة.",
  "Lockers are provided for use during your session. Leave nothing overnight. We are not responsible for property lost, damaged or stolen on the premises, so please do not bring anything you would hate to lose.": "تُتاح الخزائن للاستخدام أثناء الحصة فقط، ويُرجى عدم ترك أي أغراض بها بين عشية وضحاها. لا نتحمل مسؤولية أي ممتلكات تُفقد أو تُتلف أو تُسرق داخل الجيم، لذا يُرجى عدم إحضار أي شيء تخشى فقدانه.",
  "We may change the classes we run, the equipment on the floor, or these terms. Where a change materially affects what you are paying for, we will tell you before it takes effect.": "يجوز لنا تغيير الحصص التي نقدمها أو المعدات المتاحة أو هذه الشروط. وإذا أثّر أي تغيير جوهرياً على ما تدفع مقابله، سنخبرك قبل تطبيقه.",

  // Class reviews (class-reviews-section.tsx)
  "No reviews yet": "لا توجد تقييمات بعد", "Write a review": "اكتب تقييماً", Rating: "التقييم", Review: "نص التقييم",
  "Only members who have attended this class can leave a review.": "يمكن فقط للأعضاء الذين حضروا هذه الحصة إضافة تقييم.",
  "Be the first to review this class.": "كن أول من يقيّم هذه الحصة.", "Submitting…": "جارٍ الإرسال…", "Submit review": "إرسال التقييم",
  "Thanks — your review is awaiting approval": "شكراً — تقييمك بانتظار الموافقة",
  "Could not submit review — you can only review a class you have attended": "تعذر إرسال التقييم — يمكنك تقييم الحصص التي حضرتها فقط",

  // Product stock messaging (product-detail-view.tsx, cart-changed-banner.tsx)
  "Your bag has changed": "تغيّرت محتويات سلتك", "An item": "عنصر",

  // Join funnel step progress (join-funnel.tsx)
  "Plan & start": "الخطة والبدء", Pay: "الدفع", "Last one": "الأخيرة", "Just a moment…": "لحظة من فضلك…",

  // Account area — membership status and access (types/membership.ts)
  "Awaiting payment": "بانتظار الدفع", Frozen: "مجمّد", Expired: "منتهي", Cancelled: "ملغى",
  "Unlimited classes": "حصص غير محدودة", "Gym floor only": "صالة الجيم فقط",

  // Account area — membership card (components/account/membership-card.tsx)
  "Your membership": "اشتراكك",
  "Pay at the front desk on your next visit and this activates straight away.": "ادفع في الاستقبال في زيارتك القادمة وسيُفعَّل الاشتراك فوراً.",
  "Frozen. Your end date has moved out by the same number of days, so nothing is lost.": "الاشتراك مجمّد. تم تأجيل تاريخ الانتهاء بنفس عدد أيام التجميد، فلا شيء يُفقد.",
  Started: "تاريخ البدء", "Runs until": "ينتهي في", "Home branch": "الفرع الرئيسي",
  "Classes left this month": "الحصص المتبقية هذا الشهر", "Guest passes left": "دعوات الضيوف المتبقية", "Freeze days left": "أيام التجميد المتبقية",
  "Every branch": "كل الفروع", "Home branch only": "الفرع الرئيسي فقط",
  "This is your last day. Renew to keep training without a break.": "هذا آخر يوم في اشتراكك. جدّده لتستمر في التدريب دون انقطاع.",
  "Renew now": "جدّد الآن", "No membership yet": "لا يوجد اشتراك بعد",
  "You have an account but nothing to train on. Pick a plan and you can be on the floor today.": "لديك حساب لكن بلا اشتراك فعّال. اختر خطة وابدأ التدريب اليوم.",
  "Choose a plan": "اختر خطة", "Compare plans": "قارن الخطط",
  paid: "مدفوع", failed: "فشل الدفع", refunded: "مسترد",

  // Account area — membership page (app/account/membership/page.tsx)
  "My membership": "اشتراكي", Previously: "سابقاً", "Need to change something?": "تريد تعديل شيء؟",
  "Freezing, upgrading and cancelling all go through the front desk at the moment — it takes a minute and we can talk through what suits you.": "التجميد والترقية والإلغاء تتم حالياً عبر الاستقبال — الأمر يستغرق دقيقة وسنساعدك في اختيار الأنسب لك.",
  "Get in touch": "تواصل معنا",

  // Account area — dashboard (app/account/page.tsx)
  "Recent payments": "آخر المدفوعات", "See all →": "عرض الكل ←", "Upcoming classes": "الحصص القادمة",
  "Nothing booked yet. The timetable is open two weeks ahead.": "لا توجد حجوزات بعد. جدول الحصص متاح للحجز حتى أسبوعين مقدماً.",
  "Find a class": "ابحث عن حصة",

  // Account area — my classes (app/account/classes/page.tsx)
  "My classes": "حصصي", Upcoming: "القادمة", Past: "السابقة",
  "Nothing booked. The timetable is open two weeks ahead.": "لا توجد حجوزات. جدول الحصص متاح للحجز حتى أسبوعين مقدماً.",
  "No classes yet. Once you have trained with us they show up here.": "لا توجد حصص بعد. ستظهر هنا بمجرد أن تبدأ التدريب معنا.",
  "Browse the timetable": "تصفّح الجدول", Booked: "محجوزة", Attended: "تم الحضور", Missed: "لم يتم الحضور", "Cancelled by us": "أُلغيت من الجيم",
  "Cancelled — your class credit is back": "تم الإلغاء — تمت إعادة رصيد الحصة",
  "Cancelled. This was inside the window, so the class still counts.": "تم الإلغاء. كان ذلك ضمن المهلة المسموحة، لذا لا تُحتسب الحصة.",
  "Could not cancel that booking": "تعذر إلغاء هذا الحجز",

  // Account area — settings (app/account/settings/page.tsx)
  "Profile & settings": "الملف الشخصي والإعدادات",
  "One of your health answers means a coach will have a quick word with you before your first session. Nothing to worry about — just come a few minutes early.": "إحدى إجاباتك الصحية تعني أن أحد المدربين سيتحدث معك بإيجاز قبل أول حصة. لا داعي للقلق — فقط احضر قبل الموعد ببضع دقائق.",
  "About you": "معلوماتك", "Emergency contact": "جهة اتصال الطوارئ", "Who we call if something happens while you are training.": "الشخص الذي نتصل به إذا حدث أي طارئ أثناء تدريبك.",
  Health: "الحالة الصحية", "Only you and the staff keeping you safe can see this.": "لا يطّلع على هذا سواك وفريق العمل المسؤول عن سلامتك.",
  Notifications: "الإشعارات",
  "Receipts, expiry warnings and anything affecting a class you booked always send — those are part of the service.": "الإيصالات وتنبيهات الانتهاء وأي تغيير يؤثر على حصة حجزتها تُرسل دائماً؛ فهي جزء من الخدمة.",
  "First name": "الاسم الأول", "Last name": "اسم العائلة", "Date of birth": "تاريخ الميلاد", "Relationship to you": "صلة القرابة بك",
  "Injuries, conditions, medication": "الإصابات أو الحالات الصحية أو الأدوية",
  "You can clear this at any time. See our": "يمكنك حذف هذا في أي وقت. راجع", "privacy policy": "سياسة الخصوصية", "for how it is handled.": "لمعرفة طريقة التعامل معه.",
  "Class reminders": "تذكير الحصص", "The evening before a session you have booked.": "مساء اليوم السابق لأي حصة حجزتها.",
  "News and offers": "الأخبار والعروض", "Occasional. Never more than monthly.": "غير متكررة، ولا تُرسل أكثر من مرة شهرياً.",
  "Saving…": "جارٍ الحفظ…", "Save changes": "حفظ التغييرات", "Current password": "كلمة المرور الحالية", "New password": "كلمة المرور الجديدة",
  "Changing…": "جارٍ التغيير…", "Change password": "تغيير كلمة المرور",
  "Your referral code": "كود الإحالة الخاص بك", "Give it to a friend. Ask at the desk what it is worth this month.": "شاركه مع صديق، واسأل في الاستقبال عن قيمته هذا الشهر.",
  Saved: "تم الحفظ", "Password changed. Please sign in again.": "تم تغيير كلمة المرور. يرجى تسجيل الدخول مرة أخرى.",
  "Could not save your details": "تعذر حفظ بياناتك", "Could not change your password": "تعذر تغيير كلمة المرور",

  // Account area — wishlist (app/account/wishlist/page.tsx)
  "Nothing saved yet.": "لا يوجد شيء محفوظ بعد.", "Continue Shopping": "مواصلة التسوق",
  "Remove from wishlist": "إزالة من المفضلة", "Removed from wishlist": "تمت الإزالة من المفضلة",

  // Account area — orders (app/account/orders/**)
  "Order History": "سجل الطلبات", "You haven't placed any orders yet.": "لم تقم بأي طلب حتى الآن.", "Start Shopping": "ابدأ التسوق",
  "Order Not Found": "الطلب غير موجود", "Back to order history": "العودة إلى سجل الطلبات", "← Back to order history": "← العودة إلى سجل الطلبات",
  Unfulfilled: "لم يُجهّز", Processing: "قيد التجهيز", Shipped: "تم الشحن", Delivered: "تم التوصيل",
  "Payment Pending": "بانتظار الدفع", "Payment Failed": "فشل الدفع", Refunded: "مسترد",
  Subtotal: "المجموع الفرعي", Shipping: "الشحن", Free: "مجاني", Discount: "الخصم", Total: "الإجمالي",
  "Tracking Number": "رقم التتبع", "Shipping To": "الشحن إلى",
  "Cash on Delivery": "الدفع عند الاستلام", "Paid by card": "تم الدفع بالبطاقة", "Card payment failed": "فشلت عملية الدفع بالبطاقة", "Card — awaiting payment": "بطاقة — بانتظار الدفع",
  "Cancel this order? This can't be undone.": "إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
  "Cancelling…": "جارٍ الإلغاء…", "Yes, Cancel Order": "نعم، إلغاء الطلب", "Never Mind": "تراجع", "Cancel this order": "إلغاء الطلب",
  "Order cancelled": "تم إلغاء الطلب", "Could not cancel this order": "تعذر إلغاء الطلب",

  // Account area — layout and payments (app/account/layout.tsx, app/account/payments/page.tsx)
  "Your account": "حسابك", "My Membership": "اشتراكي", "My Classes": "حصصي", "Profile & Settings": "الملف الشخصي والإعدادات",
  "Nothing here yet. Receipts appear as soon as you have paid for something.": "لا يوجد شيء هنا بعد. ستظهر الإيصالات بمجرد إتمام أي عملية دفع.",
  "Paid to date": "المدفوع حتى الآن",
  "Need a printed receipt? Ask at the front desk and quote the reference.": "هل تحتاج إيصالاً مطبوعاً؟ اسأل في الاستقبال مع ذكر رقم المرجع.",
};

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);

const arabicDigits = (value: string) => value.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);

function translated(value: string): string | null {
  if (AR[value]) return AR[value];
  let match: RegExpMatchArray | null;
  if ((match = value.match(/^(\d+) sessions?$/))) return `${arabicDigits(match[1])} حصة`;
  // The leading "· " is only echoed back when the source text already had
  // one — some layouts render it as part of this same node, others render
  // the separator as a sibling node of its own, and adding a second one
  // unconditionally doubled it ("20 sessions · · 5 days a week").
  if ((match = value.match(/^·\s*(\d+) days? a week$/))) return `· ${arabicDigits(match[1])} أيام أسبوعياً`;
  if ((match = value.match(/^(\d+) days? a week$/))) return `${arabicDigits(match[1])} أيام أسبوعياً`;
  if ((match = value.match(/^(\d+) guest invites?$/))) return `${arabicDigits(match[1])} دعوة لضيف`;
  if ((match = value.match(/^(\d+) min$/))) return `${arabicDigits(match[1])} دقيقة`;
  if ((match = value.match(/^(\d+) minutes$/))) return `${arabicDigits(match[1])} دقيقة`;
  if ((match = value.match(/^Up to (\d+)$/))) return `حتى ${arabicDigits(match[1])}`;
  if ((match = value.match(/^(\d+) years?$/))) return `${arabicDigits(match[1])} سنة خبرة`;
  if ((match = value.match(/^(\d+) days$/))) return `${arabicDigits(match[1])} أيام`;
  if ((match = value.match(/^Cap (\d+)$/))) return `السعة ${arabicDigits(match[1])}`;
  if ((match = value.match(/^All (\d+) →$/))) return `الكل (${arabicDigits(match[1])}) ←`;
  if ((match = value.match(/^Reference (.+)$/))) return `الرقم المرجعي: ${match[1]}`;
  if ((match = value.match(/^If an account exists for (.+), we've sent a link to reset your password\. It expires in 1 hour\.$/)))
    return `إذا كان يوجد حساب مرتبط بالبريد ${match[1]}، فقد أرسلنا رابطاً لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة.`;
  if ((match = value.match(/^Intensity:\s*(.+)$/))) return `الشدة: ${AR[match[1]] ?? match[1]}`;
  if ((match = value.match(/^Choose (.+)$/))) return `اختر ${AR[match[1]] ?? match[1]}`;
  // Intl.NumberFormat inserts a non-breaking space (U+00A0) between an ISO
  // currency code and the amount, not a regular space — "EGP 1,800" —
  // so these match on \s rather than a literal " " or every price-prefixed
  // string silently falls through untranslated.
  if ((match = value.match(/^from (EGP\s.+)$/))) return `يبدأ من ${match[1]}`;
  if ((match = value.match(/^Plans from (EGP\s.+)$/))) return `الاشتراكات تبدأ من ${match[1]}`;
  if ((match = value.match(/^(EGP\s.+) a month$/))) return `${match[1]} شهرياً`;
  if ((match = value.match(/^Save (\d+)%$/))) return `وفّر ${arabicDigits(match[1])}٪`;
  if ((match = value.match(/^© (\d{4}) (.+)\. All rights reserved\.$/))) return `© ${match[1]} ${match[2]}. جميع الحقوق محفوظة.`;
  if ((match = value.match(/^Welcome back(?:, (.+))?$/))) return match[1] ? `أهلاً بعودتك، ${match[1]}` : "أهلاً بعودتك";
  // Class rating summary — "4.5 out of 5 (12 reviews)". The decimal rating
  // stays in Latin digits (an Arabic-Indic fraction reads awkwardly), same
  // treatment as prices; the review count and the "out of 5" denominator get
  // Arabic-Indic digits like every other plain count in a sentence.
  if ((match = value.match(/^(\d+(?:\.\d+)?) out of 5 \((\d+) reviews?\)$/)))
    return `${match[1]} من ٥ (${arabicDigits(match[2])} تقييم)`;
  // Low-stock messaging (product-detail-view.tsx, cart-changed-banner.tsx).
  if ((match = value.match(/^Only (\d+) left$/))) return `لم يتبق سوى ${arabicDigits(match[1])}`;
  if ((match = value.match(/^Only (\d+) of (.+) \((.+)\) (?:is|are) left — quantity updated\.$/)))
    return `لم يتبق سوى ${arabicDigits(match[1])} من ${match[2]} (${match[3]}) — تم تحديث الكمية.`;
  if ((match = value.match(/^(.+) \((.+)\) is out of stock and was removed\.$/)))
    return `${AR[match[1]] ?? match[1]} (${match[2]}) نفد من المخزون وتمت إزالته من السلة.`;
  if ((match = value.match(/^(.+) \((.+)\) is no longer available and was removed\.$/)))
    return `${AR[match[1]] ?? match[1]} (${match[2]}) لم يعد متاحاً وتمت إزالته من السلة.`;
  // Join funnel step progress — "Step 2 of 3 · Account".
  if ((match = value.match(/^Step (\d+) of (\d+) · (.+)$/)))
    return `الخطوة ${arabicDigits(match[1])} من ${arabicDigits(match[2])} · ${AR[match[3]] ?? match[3]}`;
  // Account area — membership access and time remaining.
  if ((match = value.match(/^(\d+) classes a month$/))) return `${arabicDigits(match[1])} حصة شهرياً`;
  if ((match = value.match(/^(day left|days left) · ends (.+)$/)))
    return `${match[1] === "day left" ? "يوم متبقٍ" : "أيام متبقية"} · ينتهي في ${match[2]}`;
  if ((match = value.match(/^Your membership ends in (\d+) days\. Nothing renews automatically\.$/)))
    return `ينتهي اشتراكك خلال ${arabicDigits(match[1])} أيام. لا يتم التجديد تلقائياً.`;
  if (value.match(/^(?:class left|classes left) this month$/)) return "الحصص المتبقية هذا الشهر";
  if ((match = value.match(/^· resets (.+)$/))) return `· يتجدد في ${match[1]}`;
  if ((match = value.match(/^until (.+)$/))) return `حتى ${match[1]}`;
  if ((match = value.match(/^(\d+) items?$/))) return `${arabicDigits(match[1])} منتج`;
  if ((match = value.match(/^Placed on (.+)$/))) return `تم الطلب في ${match[1]}`;
  if ((match = value.match(/^Payment: (.+)$/))) return `الدفع: ${AR[match[1]] ?? match[1]}`;
  if ((match = value.match(/^Your email is (.+)\. To change it, talk to the front desk\.$/)))
    return `بريدك الإلكتروني هو ${match[1]}. للتغيير، تواصل مع فريق الاستقبال.`;
  if (value.includes(" · ")) {
    const parts = value.split(" · ");
    const mapped = parts.map((part) => AR[part] ?? part);
    if (mapped.some((part, index) => part !== parts[index])) return mapped.join(" · ");
  }
  return null;
}

function translateTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent || SKIP.has(parent.tagName) || parent.closest("[data-no-translate]")) return;
  const raw = node.nodeValue ?? "";
  const trimmed = raw.trim();
  const result = translated(trimmed);
  if (result) node.nodeValue = raw.replace(trimmed, result);
}

function translateElement(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) translateTextNode(node);

  if (root instanceof Element) {
    const candidates = [root, ...root.querySelectorAll<HTMLElement>("[aria-label],[placeholder],[title],[alt]")];
    for (const element of candidates) {
      for (const attribute of ["aria-label", "placeholder", "title", "alt"] as const) {
        const value = element.getAttribute(attribute);
        const result = value ? translated(value.trim()) : null;
        if (result) element.setAttribute(attribute, result);
      }
    }
  }
}

export function ArabicUiTranslator() {
  const locale = useLocale();

  useEffect(() => {
    if (locale !== "ar") return;
    translateElement(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // React updates an existing text node's data in place (no childList
        // mutation) when only its value changes between renders — e.g. a
        // price that starts blank and fills in once data loads. Without
        // watching characterData, that node is translated once at mount and
        // never revisited, so the later value stays in English.
        if (mutation.type === "characterData") {
          if (mutation.target.nodeType === Node.TEXT_NODE) translateTextNode(mutation.target as Text);
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) translateElement(node as Element);
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) translateElement(node.parentElement);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
