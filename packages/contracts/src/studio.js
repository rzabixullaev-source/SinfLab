import { z } from "zod";

export const studioTools = {
  hcl: ["Xlorid kislota", "#e8b969"], naoh: ["Natriy gidroksid", "#7bd7ca"],
  vinegar: ["Sirka eritmasi", "#dba37a"], bicarbonate: ["Soda", "#e5e7de"],
  fecl3: ["Temir(III) xlorid", "#cc884f"], kscn: ["Tiotsianat", "#e9d6af"],
  cuso4: ["Mis sulfat", "#4a9cde"], agno3: ["Kumush nitrat", "#d4d8de"],
  nacl: ["Tuz eritmasi", "#dce4e8"], h2o2: ["Peroksid", "#c7e6ec"],
  mno2: ["Katalizator", "#4d5964"], iodine: ["Yod eritmasi", "#79475b"],
  starch: ["Kraxmal", "#efe2b9"], phenolphthalein: ["Fenolftalein", "#eccad6"],
  carbonate: ["Karbonat", "#d9d4ba"], indicator: ["Universal indikator", "#c8b673"],
  water: ["Suv", "#79c9de"], ammonia: ["Ammiak eritmasi", "#d8d9a1"],
  ramp: ["Qiya tekislik", "#8ca1ad"], block: ["Yog'och blok", "#bd9366"],
  bob: ["Mayatnik shari", "#e9ae43"], string: ["Ip va tayanch", "#b6c7d2"],
  spring: ["Prujina", "#7fbbc3"], weight: ["Og'irlik toshi", "#c3b4a5"],
  lever: ["Richag", "#ab7b55"], fulcrum: ["Tayanch", "#86adb1"],
  launcher: ["Uloqtirgich", "#647d91"], ball: ["Sharcha", "#d1af66"],
  tank: ["Suyuqlik idishi", "#83cddd"], float: ["Jism", "#c99b75"],
  battery: ["Batareya", "#dcae64"], resistor: ["Rezistor", "#8ac4bb"],
  source: ["Yorug'lik manbai", "#f3d889"], lens: ["Linza", "#acd9e1"],
  glass: ["Shisha plastina", "#bbd5de"],
  ballA: ["Birinchi shar", "#e9ae43"], ballB: ["Ikkinchi shar", "#69c9be"],
  heater: ["Isitkich", "#ed866f"], metal: ["Metall plastina", "#a8b9c0"],
  microscope: ["Mikroskop", "#a8c5c9"], slide: ["Preparat", "#d8b9a0"],
  cell: ["Hujayra", "#80c5a3"], saline: ["Tuzli muhit", "#a8d4dd"],
  enzyme: ["Ferment", "#b8a5de"], substrate: ["Substrat", "#e4bc79"],
  leaf: ["Barg", "#68ba86"], lamp: ["Lampa", "#f5d685"],
  glucose: ["Glyukoza", "#d5b67b"], oxygen: ["Kislorod", "#98d4e7"],
  membrane: ["Membrana", "#82c6af"], dye: ["Bo'yoq zarrasi", "#ca87ca"],
  alleleA: ["A alleli", "#e4a96d"], alleleB: ["a alleli", "#a99bd0"],
  heart: ["Yurak modeli", "#d78383"], valve: ["Klapan", "#bfcbd0"],
  plant: ["O'simlik", "#76c68d"], herbivore: ["O'txo'r", "#c8b17d"],
  bioStarch: ["Oziq namunasi", "#d9c8a5"], bioIodine: ["Yod reaktivi", "#8c6b86"],
  bacteria: ["Bakteriya namunasi", "#9bd6be"], antibiotic: ["Antibiotik diski", "#d8d7ae"],
  account: ["Hisob", "#68b8c4"], vault: ["Parol menejeri", "#e5b666"],
  email: ["Shubhali xat", "#da9c79"], header: ["Xat sarlavhasi", "#8fc1d6"],
  gateway: ["Tarmoq darvozasi", "#89baca"], rule: ["Xavfsizlik qoidasi", "#d8b06f"],
  authenticator: ["Tasdiqlash kodi", "#b0d9a5"], browser: ["Brauzer", "#88b9d3"],
  certificate: ["Sertifikat", "#ddc380"], database: ["Ma'lumotlar bazasi", "#96accc"],
  backup: ["Zaxira nusxa", "#8fd2ad"], user: ["Foydalanuvchi", "#abc4ce"],
  role: ["Cheklangan rol", "#e9ae43"], event: ["Hodisa jurnali", "#c6accf"],
  monitor: ["Kuzatuv tizimi", "#80c8c4"], server: ["Sinov serveri", "#98b7c6"],
  patch: ["Yangilanish", "#9fcf9c"], form: ["Kirish formasi", "#94b8cb"],
  validator: ["Ma'lumot tekshiruvi", "#e7b778"],
};

const make = (subject, id, title, mission, model, tools, target, controls = [], outcome = "") =>
  ({ subject, id, title, mission, model, tools, target, controls, outcome });
const ctl = (id, label, min, max, value, step = 1, unit = "") => ({ id, label, min, max, value, step, unit });

export const studioScenarios = [
  make("chemistry", "chem-neutralization", "Neytrallanish", "Kislota va asosni stakanda aralashtirib pH o'zgarishini kuzating.", "neutralization", ["hcl", "naoh", "water", "indicator"], ["hcl", "naoh"], [], "Tuz va suv hosil bo'ladi."),
  make("chemistry", "chem-carbon-dioxide", "Gaz ajralishi", "Sirka bilan sodani birlashtirib gaz ajralishini kuzating.", "gas", ["vinegar", "bicarbonate", "water", "starch"], ["vinegar", "bicarbonate"], [], "CO₂ pufakchalari paydo bo'ladi."),
  make("chemistry", "chem-iron-complex", "Qizil kompleks", "Temir eritmasiga tiotsianat qo'shing va rangni kuzating.", "color", ["fecl3", "kscn", "nacl", "water"], ["fecl3", "kscn"], [], "To'q qizil kompleks hosil bo'ladi."),
  make("chemistry", "chem-copper-precipitate", "Cho'kma hosil qilish", "Mis sulfat va asosni aralashtirib cho'kmani kuzating.", "precipitate", ["cuso4", "naoh", "water", "nacl"], ["cuso4", "naoh"], [], "Ko'k cho'kma hosil bo'ladi."),
  make("chemistry", "chem-silver-precipitate", "Oq cho'kma", "Kumush nitrat va tuz eritmasini birlashtiring.", "precipitate", ["agno3", "nacl", "water", "starch"], ["agno3", "nacl"], [], "Oq cho'kma hosil bo'ladi."),
  make("chemistry", "chem-catalyst", "Katalizator ta'siri", "Peroksidga katalizator qo'shib tezlashgan parchalanishni kuzating.", "gas", ["h2o2", "mno2", "water", "nacl"], ["h2o2", "mno2"], [], "Kislorod pufakchalari ajraladi."),
  make("chemistry", "chem-starch-test", "Kraxmalni aniqlash", "Yod eritmasini kraxmal bilan aralashtiring.", "color", ["iodine", "starch", "water", "nacl"], ["iodine", "starch"], [], "To'q ko'k rang paydo bo'ladi."),
  make("chemistry", "chem-indicator", "Indikator rangi", "Fenolftalein va asosni stakanga quying.", "color", ["phenolphthalein", "naoh", "water", "hcl"], ["phenolphthalein", "naoh"], [], "Eritma pushti rangga o'tadi."),
  make("chemistry", "chem-carbonate", "Karbonat reaksiyasi", "Karbonatga kislota qo'shib gaz ajralishini kuzating.", "gas", ["carbonate", "hcl", "water", "naoh"], ["carbonate", "hcl"], [], "CO₂ gazi ajraladi."),
  make("chemistry", "chem-ph-indicator", "pH indikatori", "Universal indikatorga kislota qo'shib rangni kuzating.", "color", ["indicator", "hcl", "naoh", "water"], ["indicator", "hcl"], [], "Indikator qizil rangga o'tadi."),

  make("physics", "phys-ramp", "Qiya tekislik", "Blokni qiya tekislikka joylang, burchakni o'zgartirib tezlanishni o'lchang.", "ramp", ["ramp", "block", "ball", "weight"], ["ramp", "block"], [ctl("angle", "Burchak", 5, 60, 25, 1, "°"), ctl("mass", "Massa", 0.2, 5, 1, 0.1, "kg")]),
  make("physics", "phys-pendulum", "Mayatnik davri", "Sharni ipga ulang, uzunligini va burchagini o'zgartiring.", "pendulum", ["bob", "string", "block", "spring"], ["bob", "string"], [ctl("length", "Ip uzunligi", 0.3, 2.5, 1, 0.1, "m"), ctl("angle", "Boshlang'ich burchak", 5, 45, 20, 1, "°")]),
  make("physics", "phys-spring", "Guk qonuni", "Toshni prujinaga osib cho'zilishini o'lchang.", "spring", ["spring", "weight", "string", "bob"], ["spring", "weight"], [ctl("mass", "Massa", 0.1, 3, 0.5, 0.1, "kg"), ctl("stiffness", "Qattiqlik", 10, 100, 40, 1, "N/m")]),
  make("physics", "phys-lever", "Richag muvozanati", "Og'irlikni richagga qo'yib kuch yelkasini o'zgartiring.", "lever", ["lever", "fulcrum", "weight", "block"], ["lever", "fulcrum"], [ctl("left", "Chap yelka", 0.2, 2, 1, 0.1, "m"), ctl("right", "O'ng yelka", 0.2, 2, 1, 0.1, "m")]),
  make("physics", "phys-projectile", "Uloqtirish harakati", "Sharchani uloqtirgichga qo'ying, tezlik va burchakni sinang.", "projectile", ["launcher", "ball", "block", "ramp"], ["launcher", "ball"], [ctl("speed", "Boshlang'ich tezlik", 2, 30, 12, 1, "m/s"), ctl("angle", "Burchak", 10, 80, 45, 1, "°")]),
  make("physics", "phys-buoyancy", "Suzish va cho'kish", "Jismni suyuqlikka tushirib Arximed kuchini kuzating.", "buoyancy", ["tank", "float", "ball", "weight"], ["tank", "float"], [ctl("density", "Jism zichligi", 200, 1600, 700, 50, "kg/m³"), ctl("fluid", "Suyuqlik zichligi", 700, 1200, 1000, 50, "kg/m³")]),
  make("physics", "phys-circuit", "Elektr zanjiri", "Batareya va rezistorni ulang, tok kuchini kuzating.", "circuit", ["battery", "resistor", "spring", "metal"], ["battery", "resistor"], [ctl("voltage", "Kuchlanish", 1, 24, 9, 1, "V"), ctl("resistance", "Qarshilik", 1, 100, 18, 1, "Ω")]),
  make("physics", "phys-lens", "Linza va tasvir", "Yorug'lik manbaini linza oldiga qo'ying, fokusni o'zgartiring.", "lens", ["source", "lens", "ball", "glass"], ["source", "lens"], [ctl("focal", "Fokus masofasi", 5, 30, 10, 1, "cm"), ctl("distance", "Manba masofasi", 12, 80, 30, 1, "cm")]),
  make("physics", "phys-collision", "Ikki shar to'qnashuvi", "Sharlarni yo'lga joylab impuls o'tishini o'lchang.", "collision", ["ballA", "ballB", "block", "ramp"], ["ballA", "ballB"], [ctl("mass", "Birinchi shar massasi", 0.2, 3, 1, 0.1, "kg"), ctl("speed", "Birinchi shar tezligi", 1, 12, 5, 0.5, "m/s")]),
  make("physics", "phys-heat", "Issiqlik o'tkazish", "Plastinani isitkichga qo'yib vaqt va haroratni kuzating.", "heat", ["heater", "metal", "block", "water"], ["heater", "metal"], [ctl("time", "Vaqt", 1, 120, 30, 1, "s"), ctl("power", "Quvvat", 10, 100, 50, 1, "W")]),

  make("biology", "bio-microscope", "Mikroskop preparati", "Preparatni mikroskop stolchasiga qo'ying va kattalashtirishni sozlang.", "microscope", ["microscope", "slide", "cell", "leaf"], ["microscope", "slide"], [ctl("magnification", "Kattalashtirish", 40, 400, 100, 20, "×")]),
  make("biology", "bio-osmosis", "Osmos", "Hujayrani tuzli muhitga tushiring va hajm o'zgarishini kuzating.", "osmosis", ["cell", "saline", "water", "slide"], ["cell", "saline"], [ctl("concentration", "Tashqi konsentratsiya", 0, 15, 8, 0.5, "%")]),
  make("biology", "bio-enzyme", "Ferment faolligi", "Ferment va substratni idishga qo'shib haroratni o'zgartiring.", "enzyme", ["enzyme", "substrate", "water", "glucose"], ["enzyme", "substrate"], [ctl("temperature", "Harorat", 5, 80, 37, 1, "°C"), ctl("ph", "pH", 2, 12, 7, 0.5)]),
  make("biology", "bio-photosynthesis", "Fotosintez", "Bargni yorug'lik ostiga qo'ying va yorug'lik kuchini boshqaring.", "photosynthesis", ["leaf", "lamp", "water", "glucose"], ["leaf", "lamp"], [ctl("light", "Yorug'lik", 0, 100, 65, 5, "%")]),
  make("biology", "bio-respiration", "Hujayra nafas olishi", "Glyukoza va kislorodni hujayra modeliga qo'shing.", "respiration", ["glucose", "oxygen", "water", "cell"], ["glucose", "oxygen"], [ctl("glucose", "Glyukoza miqdori", 1, 10, 4, 1)]),
  make("biology", "bio-diffusion", "Membrana orqali diffuziya", "Bo'yoq zarrasini membrana yoniga qo'ying, gradientni o'zgartiring.", "diffusion", ["membrane", "dye", "cell", "water"], ["membrane", "dye"], [ctl("gradient", "Konsentratsiya farqi", 1, 20, 8, 1, "%")]),
  make("biology", "bio-genetics", "Allel kombinatsiyasi", "Ikki allelni tanlab avlod ehtimolini ko'ring.", "genetics", ["alleleA", "alleleB", "cell", "slide"], ["alleleA", "alleleB"], [ctl("samples", "Model namunalar", 10, 100, 40, 10)]),
  make("biology", "bio-heart", "Yurak klapani", "Klapan modelini yurakka joylab urish tezligini o'zgartiring.", "heart", ["heart", "valve", "cell", "oxygen"], ["heart", "valve"], [ctl("rate", "Yurak urishi", 50, 150, 75, 5, "bpm")]),
  make("biology", "bio-ecosystem", "Oziq zanjiri", "O'simlik va o'txo'rni ekotizimga joylab nisbatni sinang.", "ecosystem", ["plant", "herbivore", "leaf", "water"], ["plant", "herbivore"], [ctl("plants", "O'simlik soni", 10, 100, 60, 5), ctl("animals", "O'txo'r soni", 1, 40, 12, 1)]),
  make("biology", "bio-food-test", "Kraxmal testi", "Oziq namunasi va yod reaktivini idishga qo'shing.", "food", ["bioStarch", "bioIodine", "water", "slide"], ["bioStarch", "bioIodine"], [ctl("amount", "Namuna", 1, 10, 4, 1)]),

  make("cybersecurity", "cyber-password", "Parol mustahkamligi", "Hisobni parol menejeriga ulang, uzunlik ta'sirini sinang.", "password", ["account", "vault", "email", "user"], ["account", "vault"], [ctl("length", "Parol uzunligi", 6, 32, 16, 1, "belgi")]),
  make("cybersecurity", "cyber-phishing", "Shubhali xatni tekshirish", "Xatni sarlavha tekshiruviga olib keling va signalni aniqlang.", "phishing", ["email", "header", "browser", "account"], ["email", "header"], [ctl("signals", "Shubhali belgilar", 0, 5, 3, 1)]),
  make("cybersecurity", "cyber-firewall", "Tarmoq qoidasi", "Darvozaga filtr qoidasini qo'ying va trafikni sinang.", "firewall", ["gateway", "rule", "server", "email"], ["gateway", "rule"], [ctl("allowed", "Ruxsatli portlar", 0, 10, 2, 1)]),
  make("cybersecurity", "cyber-mfa", "Ikki bosqichli kirish", "Hisobga tasdiqlash vositasini ulang.", "mfa", ["account", "authenticator", "vault", "email"], ["account", "authenticator"], [ctl("attempts", "Sinov kirishlari", 1, 10, 4, 1)]),
  make("cybersecurity", "cyber-tls", "Sertifikat tekshiruvi", "Brauzer va sertifikatni ulang, amal qilish holatini kuzating.", "tls", ["browser", "certificate", "email", "server"], ["browser", "certificate"], [ctl("days", "Qolgan kunlar", 0, 365, 90, 1, "kun")]),
  make("cybersecurity", "cyber-backup", "Zaxira va tiklash", "Bazani zaxira nusxasi bilan bog'lab tiklash oralig'ini sinang.", "backup", ["database", "backup", "server", "patch"], ["database", "backup"], [ctl("interval", "Zaxira oralig'i", 1, 30, 1, 1, "kun")]),
  make("cybersecurity", "cyber-permission", "Minimal huquq", "Foydalanuvchiga cheklangan rol bering.", "permission", ["user", "role", "account", "server"], ["user", "role"], [ctl("permissions", "Berilgan huquqlar", 1, 10, 3, 1)]),
  make("cybersecurity", "cyber-monitor", "Hodisa jurnali", "Jurnalni kuzatuv tizimiga ulang va signal chegarasini sinang.", "monitor", ["event", "monitor", "server", "email"], ["event", "monitor"], [ctl("threshold", "Ogohlantirish chegarasi", 1, 20, 5, 1)]),
  make("cybersecurity", "cyber-patch", "Serverni yangilash", "Sinov serveriga yangilanishni qo'llang.", "patch", ["server", "patch", "database", "gateway"], ["server", "patch"], [ctl("age", "Oxirgi yangilanish", 0, 180, 7, 1, "kun")]),
  make("cybersecurity", "cyber-validation", "Kirishni tekshirish", "Formaga ma'lumot tekshiruvini ulang va sinov yuboring.", "validation", ["form", "validator", "server", "email"], ["form", "validator"], [ctl("checks", "Tekshiruvlar soni", 0, 8, 4, 1)]),
];

export const studioById = Object.fromEntries(studioScenarios.map((item) => [item.id, item]));
export const studioInventory = Object.fromEntries(
  ["chemistry", "physics", "biology", "cybersecurity"].map((subject) =>
    [subject, [...new Set(studioScenarios.filter((item) => item.subject === subject).flatMap((item) => item.tools))]]
  )
);
export const studioSubjects = {
  chemistry: "Kimyo", physics: "Fizika", biology: "Biologiya", cybersecurity: "Kiberxavfsizlik",
};

export const studioLabSchema = z.object({
  title: z.string().trim().min(3).max(160),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  scenarioId: z.string().refine((value) => Object.hasOwn(studioById, value), "Unknown scenario"),
}).strict();

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add"), itemId: z.string().max(40), amount: z.number().min(1).max(50).default(10) }).strict(),
  z.object({ type: z.literal("remove"), itemId: z.string().max(40) }).strict(),
  z.object({ type: z.literal("set"), controlId: z.string().max(40), value: z.number().finite() }).strict(),
  z.object({ type: z.literal("reset") }).strict(),
]);
export const studioRunSchema = z.object({ actions: z.array(actionSchema).min(1).max(80) }).strict();

const round = (value, digits = 2) => Number(value.toFixed(digits));
const chemicalEffects = {
  "hcl|naoh": ["neutral", "#b6cfbf", "pH neytralga yaqinlashdi; tuz va suv hosil bo'ldi."],
  "bicarbonate|vinegar": ["gas", "#dec49e", "CO₂ pufakchalari ajraldi."],
  "fecl3|kscn": ["color", "#9b263b", "Eritma to'q qizil rangga kirdi."],
  "cuso4|naoh": ["precipitate", "#51a8d4", "Ko'k cho'kma kuzatildi."],
  "agno3|nacl": ["precipitate", "#e7e7dc", "Oq cho'kma kuzatildi."],
  "h2o2|mno2": ["gas", "#afd9db", "Katalizator bilan kislorod ajralishi tezlashdi."],
  "iodine|starch": ["color", "#26365c", "Kraxmal yod bilan to'q ko'k rang berdi."],
  "naoh|phenolphthalein": ["color", "#ed8fc2", "Indikator ishqoriy muhitda pushti rang oldi."],
  "carbonate|hcl": ["gas", "#d7c49a", "Karbonat kislotada CO₂ ajratdi."],
  "hcl|indicator": ["color", "#e47766", "Indikator kislotali muhitni qizil rangda ko'rsatdi."],
};
const pairKey = (a, b) => [a, b].sort().join("|");

function measurementFor(scenario, values) {
  const v = (id) => values[id] ?? scenario.controls.find((control) => control.id === id)?.value ?? 0;
  switch (scenario.model) {
    case "ramp": return { label: "Tezlanish", value: round(9.81 * Math.sin(v("angle") * Math.PI / 180)), unit: "m/s²" };
    case "pendulum": return { label: "Davr", value: round(2 * Math.PI * Math.sqrt(v("length") / 9.81)), unit: "s" };
    case "spring": return { label: "Cho'zilish", value: round(v("mass") * 9.81 / v("stiffness") * 100), unit: "cm" };
    case "lever": return { label: "Yelka nisbati", value: round(v("left") / v("right")), unit: ":1" };
    case "projectile": return { label: "Uchish masofasi", value: round(v("speed") ** 2 * Math.sin(2 * v("angle") * Math.PI / 180) / 9.81), unit: "m" };
    case "buoyancy": return { label: "Holat", value: v("density") < v("fluid") ? "Suzadi" : "Cho'kadi", unit: "" };
    case "circuit": return { label: "Tok kuchi", value: round(v("voltage") / v("resistance"), 3), unit: "A" };
    case "lens": return v("distance") <= v("focal")
      ? { label: "Tasvir", value: "Mavhum / cheksiz", unit: "" }
      : { label: "Tasvir masofasi", value: round(1 / (1 / v("focal") - 1 / v("distance"))), unit: "cm" };
    case "collision": return { label: "Impuls", value: round(v("mass") * v("speed")), unit: "kg·m/s" };
    case "heat": return { label: "Berilgan energiya", value: round(v("power") * v("time")), unit: "J" };
    case "microscope": return { label: "Ko'rinish", value: v("magnification"), unit: "×" };
    case "osmosis": return { label: "Hujayra holati", value: v("concentration") > 5 ? "Kichrayadi" : "Shishadi", unit: "" };
    case "enzyme": return { label: "Nisbiy faollik", value: round(Math.max(0, 100 - Math.abs(v("temperature") - 37) * 3 - Math.abs(v("ph") - 7) * 12)), unit: "%" };
    case "photosynthesis": return { label: "Nisbiy tezlik", value: round(v("light") * 0.82), unit: "%" };
    case "respiration": return { label: "Model energiya", value: v("glucose") * 30, unit: "ATP" };
    case "diffusion": return { label: "Diffuziya oqimi", value: round(v("gradient") * 0.6), unit: "nisbiy" };
    case "genetics": return { label: "Aa ehtimoli", value: 50, unit: "%" };
    case "heart": return { label: "Taxminiy oqim", value: round(v("rate") * 0.07), unit: "L/min" };
    case "ecosystem": return { label: "Oziq nisbati", value: round(v("plants") / v("animals")), unit: ":1" };
    case "food": return { label: "Yod testi", value: "Ko'k-qora", unit: "" };
    case "password": return { label: "Parol holati", value: v("length") >= 12 ? "Kuchliroq" : "Zaif", unit: "" };
    case "phishing": return { label: "Xavf belgisi", value: v("signals"), unit: "ta" };
    case "firewall": return { label: "Ochiq portlar", value: v("allowed"), unit: "ta" };
    case "mfa": return { label: "To'silgan sinovlar", value: v("attempts"), unit: "ta" };
    case "tls": return { label: "Sertifikat", value: v("days") > 0 ? "Amalda" : "Muddati tugagan", unit: "" };
    case "backup": return { label: "Tiklash oralig'i", value: v("interval"), unit: "kun" };
    case "permission": return { label: "Berilgan huquqlar", value: v("permissions"), unit: "ta" };
    case "monitor": return { label: "Signal chegarasi", value: v("threshold"), unit: "hodisa" };
    case "patch": return { label: "Yangilanish yoshi", value: v("age"), unit: "kun" };
    case "validation": return { label: "Tekshiruvlar", value: v("checks"), unit: "ta" };
    default: return null;
  }
}

export function simulateStudio(scenario, actions) {
  const placed = [];
  const values = Object.fromEntries(scenario.controls.map((control) => [control.id, control.value]));
  let reaction = null;
  for (const action of actions) {
    if (action.type === "reset") {
      placed.length = 0; reaction = null;
      for (const control of scenario.controls) values[control.id] = control.value;
      continue;
    }
    if (action.type === "set") {
      const control = scenario.controls.find((item) => item.id === action.controlId);
      if (!control || action.value < control.min || action.value > control.max) throw new Error("Invalid laboratory control");
      values[action.controlId] = action.value;
      continue;
    }
    const inventory = scenario.subject === "chemistry" ? studioInventory.chemistry : scenario.tools;
    if (!inventory.includes(action.itemId)) throw new Error("Item is not available in this laboratory");
    if (action.type === "remove") {
      const index = placed.findIndex((item) => item.itemId === action.itemId);
      if (index >= 0) placed.splice(index, 1);
      reaction = null;
      continue;
    }
    if (placed.length >= 16) throw new Error("Workspace is full");
    placed.push({ itemId: action.itemId, amount: action.amount });
  }
  if (scenario.subject === "chemistry") {
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const key = pairKey(placed[i].itemId, placed[j].itemId);
      if (chemicalEffects[key]) {
        const [effect, color, observation] = chemicalEffects[key];
        reaction = { key, effect, color, observation, intensity: Math.min(1, (placed[i].amount + placed[j].amount) / 40) };
      }
    }
    if (reaction?.key === "hcl|naoh") {
      const acid = placed.filter((item) => item.itemId === "hcl").reduce((sum, item) => sum + item.amount, 0);
      const base = placed.filter((item) => item.itemId === "naoh").reduce((sum, item) => sum + item.amount, 0);
      const difference = acid - base;
      const concentration = 0.1 * Math.abs(difference) / Math.max(1, acid + base);
      const ph = difference === 0 ? 7 : difference > 0 ? -Math.log10(concentration) : 14 + Math.log10(concentration);
      reaction.ph = round(Math.max(0, Math.min(14, ph)));
      reaction.color = reaction.ph < 5 ? "#df806b" : reaction.ph > 9 ? "#a887d8" : "#b6cfbf";
      reaction.observation = `Neytrallanish kuzatildi. Model pH: ${reaction.ph}.`;
    }
  }
  const required = scenario.target.every((itemId) => placed.some((item) => item.itemId === itemId));
  const cyberGoals = {
    password: () => values.length >= 12,
    phishing: () => values.signals >= 2,
    firewall: () => values.allowed <= 3,
    mfa: () => values.attempts >= 1,
    tls: () => values.days > 0,
    backup: () => values.interval <= 7,
    permission: () => values.permissions <= 4,
    monitor: () => values.threshold <= 10,
    patch: () => values.age <= 30,
    validation: () => values.checks >= 3,
  };
  const goalMet = scenario.subject === "cybersecurity" ? cyberGoals[scenario.model]() : true;
  const correct = scenario.subject === "chemistry"
    ? required && reaction?.key === pairKey(...scenario.target)
    : required && goalMet;
  const measurement = scenario.subject === "chemistry"
    ? reaction?.ph !== undefined ? { label: "pH", value: reaction.ph, unit: "" }
      : { label: "Qo'shilgan hajm", value: placed.reduce((sum, item) => sum + item.amount, 0), unit: "ml" }
    : measurementFor(scenario, values);
  const observation = scenario.subject === "chemistry"
    ? reaction?.observation ?? (placed.length > 1 ? "Bu aralashma uchun modelda aniqlangan reaksiya yo'q." : "Moddalarni idishga qo'shing.")
    : required ? !goalMet ? `Asboblar ulandi. ${measurement.label} qiymatini xavfsiz chegaraga sozlang.`
      : `${measurement.label}: ${measurement.value} ${measurement.unit}`.trim()
      : "Asboblarni ish maydoniga joylang.";
  return { placed, values, reaction, measurement, observation, correct: Boolean(correct), score: correct ? 100 : required ? 50 : 0 };
}
