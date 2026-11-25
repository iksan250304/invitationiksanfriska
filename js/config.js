/* ============ KONTEN DEFAULT ============
   Dipakai bila belum ada konten tersimpan. Konten yang disimpan dari admin menimpa nilai-nilai ini. */
const DEFAULT_CONFIG = {
  couple: {
    monogram: "W&O", order: "bride",
    groomNick: "Ogi", groomFull: "Ogi Pratama, S.Kom",
    groomParents: "Putra dari Bpk. H. Hendra Wijaya & Ibu Hj. Siti Aminah",
    groomPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500",
    brideNick: "Wangi", brideFull: "Wangi Kusuma, S.Ds",
    brideParents: "Putri dari Bpk. Drs. Ahmad Fauzi & Ibu Ratna Dewi",
    bridePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500"
  },
  verse: {
    arabic: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا لِتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً ۚ إِنَّ فِي ذَٰلِكَ لَآيَاتٍ لِقَوْمٍ يَتَفَكَّرُونَ",
    translation: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.",
    source: "QS. Ar-Rum: 21"
  },
  event: {
    displayDate: "20 . 10 . 2026", countdownISO: "2026-10-20T08:00:00",
    akadTitle: "AKAD NIKAH", akadTime: "08.00 — 10.00 WIB",
    resepsiTitle: "RESEPSI", resepsiTime: "11.00 — 14.00 WIB",
    venueName: "ANJUNGAN SUMATERA BARAT",
    venueAddress: "Jl. Raya Taman Mini Indonesia Indah, Jakarta Timur, DKI Jakarta",
    mapsUrl: "https://maps.google.com"
  },
  story: {
    quote: "Sejak momen pertama kami bertemu, ada sesuatu yang kami berdua sadari.",
    paragraph1: "Berawal dari pertemuan sederhana, obrolan yang berlangsung lebih lama dari yang kami duga, dan perasaan yang sulit dijelaskan.",
    paragraph2: "Melalui banyak percakapan, petualangan, dan hari-hari biasa, kami perlahan menyadari bahwa kisah terbaik adalah yang ditulis bersama. Kini, kami siap memulai babak baru.",
    badgeText: "best day ever!"
  },
  gallery: [
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=600",
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600",
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=600"
  ],
  gift: { accounts: [{ bankName: "BANK BCA", accountNumber: "1234 5678 90", accountHolder: "OGI PRATAMA" }] }, /* maks. 5 rekening, diatur di admin */
  closing: { quote: "Merupakan kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu." },
  invite: { waTemplate: "Assalamualaikum Bapak/Ibu/Saudara/i {nama},\n\nKami mengundang Anda ke pernikahan {pasangan} pada {tanggal}.\n\nBuka undangan digital kami di:\n{link}\n\nTerima kasih." },
  media: {
    heroIllustration: "",
    closingPhoto: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800",
    musicUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    instagramUrl: "https://instagram.com", tiktokUrl: "https://tiktok.com"
  }
};

/* Maksimal rekening tanda kasih */
const MAX_ACCOUNTS = 5;
/* Konten lama (satu rekening: gift.bankName dst.) otomatis diubah jadi daftar rekening */
function normalizeGift(cfg, saved) {
  const g = (saved && saved.gift) || {};
  if (!Array.isArray(g.accounts) && g.bankName) cfg.gift.accounts = [{ bankName: g.bankName, accountNumber: g.accountNumber || '', accountHolder: g.accountHolder || '' }];
  cfg.gift.accounts = (Array.isArray(cfg.gift.accounts) ? cfg.gift.accounts : []).slice(0, MAX_ACCOUNTS);
  return cfg;
}

/* ============ BACKEND ============
   provider "local"    : data di localStorage browser (demo / uji coba, tidak dibagi antar perangkat).
   provider "supabase" : data di Supabase (lihat SUPABASE_SETUP.md).
   provider "appwrite" : data di Appwrite Cloud (lihat APPWRITE_SETUP.md). */
const BACKEND = {
  provider: "supabase",
  local: { adminPin: "123456" },
  supabase: {
    url: "https://uhvacncjbcdsransuzrz.supabase.co",        /* contoh: https://abcdxyz.supabase.co */
    anonKey: "sb_publishable_CFpg3lOtxFVoL_BN_NuyDw_iSIpQFhj",    /* Project Settings -> API Keys: anon (legacy) atau publishable key */
    bucket: "media",
    configRowId: "main"
  },
  appwrite: {
    endpoint: "https://cloud.appwrite.io/v1",
    projectId: "",
    databaseId: "",
    tables: { config: "config", rsvp: "rsvp", wishes: "wishes" },
    configRowId: "main",
    bucketId: "media"
  }
};

/* Mengenali jenis sumber lagu: file audio / tautan YouTube / tautan Spotify. Dipakai undangan dan admin. */
function parseMusic(u) {
  u = String(u || '').trim(); let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/))) return { t: 'youtube', id: m[1] };
  if ((m = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|episode|playlist|album|show)\/(\w+)/))) return { t: 'spotify', uri: 'spotify:' + m[1] + ':' + m[2] };
  if ((m = u.match(/^spotify:(track|episode|playlist|album|show):(\w+)$/))) return { t: 'spotify', uri: u };
  return { t: 'audio', src: u };
}