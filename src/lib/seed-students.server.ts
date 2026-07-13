// ============================================================================
// Development-only student seeder (server-only — uses the service-role client).
//
// Creates 10 realistic Indian college-student accounts that are INDISTINGUISHABLE
// from organically registered users: they use the exact same auth, profile,
// settings, photos, interests and onboarding records the real app writes. No
// account carries special flags or bypasses any table — a seeded user is just a
// normal user whose records happen to be created programmatically.
//
// Idempotent: keyed on fixed dev emails (seed.student.NN@coligo.dev). Re-running
// updates the existing account and rebuilds its photos/interests instead of
// creating duplicates.
//
// Reachable ONLY through the SEED_SECRET-protected route at
// /api/public/seed/students — never import this into client code.
// ============================================================================
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "profile-photos";
const SEED_TAG = "coligo-dev-seed-student";
const SEED_PASSWORD = "Coligo#Seed2026";

// Shared profile photos — downloaded once, reused/randomized across accounts.
const PHOTO_URLS = [
  "https://i.postimg.cc/HL8TJ0GL/a3fcdc42d51181b6cad2769d4f62b834.jpg",
  "https://i.postimg.cc/XvBnZKMr/e473f6d24c389583c2e015b4e83e4bfd.jpg",
  "https://i.postimg.cc/bvSqG0XD/e7b0928f87c81191f431cddab45bcd31.jpg",
];

type Gender = Database["public"]["Enums"]["gender_option"];
type LookingFor = Database["public"]["Enums"]["looking_for_option"];

type Persona = {
  seq: number;
  fullName: string;
  gender: Gender;
  lookingFor: LookingFor;
  age: number;
  bio: string;
  preferredDepartments: string[];
  preferredInterests: string[];
  photoCount: number;
};

// Karnataka college cities to bias college selection toward believable campuses.
const KA_CITIES = new Set([
  "bangalore", "bengaluru", "mysore", "mysuru", "mangalore", "mangaluru",
  "hubli", "dharwad", "belgaum", "belagavi", "gulbarga", "kalaburagi",
  "davangere", "tumkur", "tumakuru", "shimoga", "shivamogga", "bellary",
  "ballari", "udupi", "manipal", "ujire", "kolar", "hassan", "bijapur",
  "vijayapura", "raichur", "bidar", "chikmagalur", "mandya", "hospet",
  "kolar gold fields", "puttur", "moodbidri",
]);

const PERSONAS: Persona[] = [
  {
    seq: 1,
    fullName: "Ananya Kulkarni",
    gender: "woman",
    lookingFor: "men",
    age: 20,
    bio: "Third-year CS student who codes better after chai. Weekends are for Cubbon Park sketching and hunting the city's best filter coffee. Talk to me about indie music or your favourite Ghibli film.",
    preferredDepartments: ["Computer Science", "Computer Science and Engineering", "Information Science"],
    preferredInterests: ["Coding", "Music", "Coffee", "Art", "Movies"],
    photoCount: 4,
  },
  {
    seq: 2,
    fullName: "Rohan Shetty",
    gender: "man",
    lookingFor: "women",
    age: 22,
    bio: "Mechanical engineer by day, home-baker by night. I've cracked the perfect Mangalore-style biryani and I'm coming for your dessert recommendations next. Beach drives > everything.",
    preferredDepartments: ["Mechanical Engineering", "Mechanical"],
    preferredInterests: ["Cooking", "Travel", "Fitness", "Photography", "Food"],
    photoCount: 5,
  },
  {
    seq: 3,
    fullName: "Meghana Rao",
    gender: "woman",
    lookingFor: "everyone",
    age: 19,
    bio: "Biotech nerd who somehow ended up captaining the debate team. I'll out-argue you and then buy you dosa to make up for it. Currently reading way too many thrillers.",
    preferredDepartments: ["Biotechnology", "Biology", "Life Sciences"],
    preferredInterests: ["Reading", "Debate", "Science", "Food", "Volunteering"],
    photoCount: 3,
  },
  {
    seq: 4,
    fullName: "Arjun Nair",
    gender: "man",
    lookingFor: "women",
    age: 21,
    bio: "Electronics student, part-time drummer, full-time football tragic. If Bengaluru FC is playing, I'm not answering texts. Looking for someone to lose at badminton to.",
    preferredDepartments: ["Electronics", "Electronics and Communication", "Electrical Engineering"],
    preferredInterests: ["Music", "Football", "Sports", "Gaming", "Movies"],
    photoCount: 4,
  },
  {
    seq: 5,
    fullName: "Sneha Patil",
    gender: "woman",
    lookingFor: "men",
    age: 20,
    bio: "Architecture student obsessed with old temples, terrible puns and street food maps. I redraw building facades for fun. Take me on a heritage walk and I'm yours.",
    preferredDepartments: ["Architecture", "Civil Engineering", "Civil"],
    preferredInterests: ["Art", "Travel", "Photography", "Food", "Reading"],
    photoCount: 6,
  },
  {
    seq: 6,
    fullName: "Karthik Gowda",
    gender: "man",
    lookingFor: "everyone",
    age: 23,
    bio: "MBA finance guy who still can't split a bill without arguing over the maths. Trekked half of Coorg last summer. Ask me about startups or the best pork curry in town.",
    preferredDepartments: ["Business Administration", "Commerce", "Management"],
    preferredInterests: ["Travel", "Fitness", "Food", "Reading", "Music"],
    photoCount: 3,
  },
  {
    seq: 7,
    fullName: "Divya Hegde",
    gender: "woman",
    lookingFor: "men",
    age: 21,
    bio: "Design student who lives in Figma and thrifted jackets. I make playlists for every mood and overshare about my houseplants. Bonus points if you love dogs as much as I do.",
    preferredDepartments: ["Design", "Fine Arts", "Computer Science"],
    preferredInterests: ["Art", "Music", "Fashion", "Photography", "Pets"],
    photoCount: 5,
  },
  {
    seq: 8,
    fullName: "Aditya Deshpande",
    gender: "man",
    lookingFor: "women",
    age: 22,
    bio: "Aerospace student, chess club regular, and a certified quiz-night menace. I'll explain rockets and then lose to you at UNO. Big fan of long drives to Nandi Hills at 5am.",
    preferredDepartments: ["Aerospace Engineering", "Mechanical Engineering", "Physics"],
    preferredInterests: ["Science", "Gaming", "Travel", "Reading", "Movies"],
    photoCount: 4,
  },
  {
    seq: 9,
    fullName: "Priya Menon",
    gender: "woman",
    lookingFor: "everyone",
    age: 19,
    bio: "Psychology major who reads people and paperbacks equally well. Volunteer weekends, dance workshops, and an unreasonable love for South Indian filter coffee. Let's swap book recs.",
    preferredDepartments: ["Psychology", "Arts", "Social Sciences"],
    preferredInterests: ["Reading", "Dancing", "Volunteering", "Coffee", "Music"],
    photoCount: 4,
  },
  {
    seq: 10,
    fullName: "Vikram Reddy",
    gender: "man",
    lookingFor: "women",
    age: 23,
    bio: "Final-year civil engineer who moonlights as the group's unofficial photographer. Cricket on weekends, biryani on Sundays, and road trips whenever the wallet allows. Say hi.",
    preferredDepartments: ["Civil Engineering", "Civil", "Architecture"],
    preferredInterests: ["Photography", "Cricket", "Sports", "Travel", "Food"],
    photoCount: 5,
  },
];

// ------------------------------------------------------------------ Utilities

function seedEmail(seq: number, batch: string): string {
  // Unique per run → every click creates a fresh, non-colliding batch of 10.
  return `seed.student.${batch}.${String(seq).padStart(2, "0")}@coligo.dev`;
}

// Name pools to vary identities across batches so accounts feel distinct.
const FIRST_NAMES_WOMEN = ["Ananya", "Meghana", "Sneha", "Divya", "Priya", "Aishwarya", "Nisha", "Kavya", "Shreya", "Pooja", "Rakshita", "Bhavana", "Nandini", "Anushka", "Deepika"];
const FIRST_NAMES_MEN = ["Rohan", "Arjun", "Karthik", "Aditya", "Vikram", "Nikhil", "Manoj", "Sachin", "Praveen", "Harish", "Suraj", "Kiran", "Tejas", "Varun", "Akshay"];
const LAST_NAMES = ["Kulkarni", "Shetty", "Rao", "Nair", "Patil", "Gowda", "Hegde", "Deshpande", "Menon", "Reddy", "Bhat", "Kamath", "Naik", "Pai", "Acharya"];

function randomName(gender: Gender, seq: number): string {
  const pool = gender === "man" ? FIRST_NAMES_MEN : FIRST_NAMES_WOMEN;
  const first = pool[Math.floor(Math.random() * pool.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function dobForAge(age: number, seq: number): string {
  // Deterministic-ish DOB well above 18: spread birthdays across the year.
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = ((seq * 5) % 12) + 1;
  const day = ((seq * 7) % 27) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function graduationYearForAge(age: number): number {
  // Roughly: entered a 4-year course at ~18, so grad year ≈ now + (4 - years done).
  const now = new Date().getFullYear();
  const yearsIn = Math.max(1, Math.min(4, age - 17));
  return now + (4 - yearsIn);
}

function semesterForAge(age: number, seq: number): number {
  const base = Math.max(1, Math.min(8, (age - 17) * 2 - (seq % 2)));
  return base;
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --------------------------------------------------------------- Result types

export type SeedAccountResult = {
  seq: number;
  email: string;
  userId: string;
  fullName: string;
  college: string | null;
  department: string | null;
  photos: number;
  interests: number;
  action: "created" | "updated";
};

export type SeedSummary = {
  ok: true;
  total: number;
  created: number;
  updated: number;
  accounts: SeedAccountResult[];
};

// ---------------------------------------------------------------- Reference data

type CollegeRow = { id: string; name: string; city: string | null };
type NamedRow = { id: string; name: string };

async function loadReference() {
  const [colleges, departments, interests] = await Promise.all([
    supabaseAdmin.from("colleges").select("id, name, city").eq("is_active", true).limit(2000),
    supabaseAdmin.from("departments").select("id, name").eq("is_active", true).limit(1000),
    supabaseAdmin.from("interests").select("id, name").eq("is_active", true).limit(1000),
  ]);
  if (colleges.error) throw new Error(`colleges: ${colleges.error.message}`);
  if (departments.error) throw new Error(`departments: ${departments.error.message}`);
  if (interests.error) throw new Error(`interests: ${interests.error.message}`);

  const allColleges = (colleges.data ?? []) as CollegeRow[];
  const kaColleges = allColleges.filter(
    (c) => c.city && KA_CITIES.has(c.city.trim().toLowerCase()),
  );
  return {
    colleges: kaColleges.length >= 5 ? kaColleges : allColleges,
    departments: (departments.data ?? []) as NamedRow[],
    interests: (interests.data ?? []) as NamedRow[],
  };
}

function pickDepartment(prefs: string[], departments: NamedRow[], seq: number): NamedRow | null {
  for (const pref of prefs) {
    const hit = departments.find((d) => d.name.toLowerCase().includes(pref.toLowerCase()));
    if (hit) return hit;
  }
  return departments.length ? shuffle(departments, seq)[0] : null;
}

function pickInterests(prefs: string[], interests: NamedRow[], count: number, seq: number): string[] {
  const chosen: NamedRow[] = [];
  for (const pref of prefs) {
    const hit = interests.find(
      (i) => i.name.toLowerCase().includes(pref.toLowerCase()) && !chosen.includes(i),
    );
    if (hit) chosen.push(hit);
  }
  const rest = shuffle(interests.filter((i) => !chosen.includes(i)), seq);
  for (const i of rest) {
    if (chosen.length >= count) break;
    chosen.push(i);
  }
  return chosen.slice(0, Math.max(3, count)).map((i) => i.id);
}

// ------------------------------------------------------------------- Photos

async function downloadPhotos(): Promise<Uint8Array[]> {
  const buffers: Uint8Array[] = [];
  for (const url of PHOTO_URLS) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
    buffers.push(new Uint8Array(await res.arrayBuffer()));
  }
  return buffers;
}

async function rebuildPhotos(
  userId: string,
  photoBuffers: Uint8Array[],
  count: number,
  seq: number,
): Promise<string> {
  // Idempotent: clear any previously seeded photos (storage + rows) first.
  const { data: existing } = await supabaseAdmin
    .from("photos")
    .select("storage_path")
    .eq("user_id", userId);
  const oldPaths = (existing ?? []).map((r) => r.storage_path).filter(Boolean);
  if (oldPaths.length) await supabaseAdmin.storage.from(BUCKET).remove(oldPaths);
  await supabaseAdmin.from("photos").delete().eq("user_id", userId);

  // Randomize which of the 3 images (with reuse) become this user's gallery.
  const order = shuffle([0, 1, 2], seq);
  const rows: { user_id: string; storage_path: string; position: number; is_primary: boolean }[] = [];
  let primaryPath = "";
  for (let position = 0; position < count; position++) {
    const imgIdx = order[position % order.length];
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, photoBuffers[imgIdx], { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error(`photo upload: ${upErr.message}`);
    rows.push({ user_id: userId, storage_path: path, position, is_primary: position === 0 });
    if (position === 0) primaryPath = path;
  }
  const { error: insErr } = await supabaseAdmin.from("photos").insert(rows);
  if (insErr) throw new Error(`photo rows: ${insErr.message}`);
  return primaryPath;
}

// ---------------------------------------------------------------- Auth lookup

async function findUserIdByEmail(email: string): Promise<string | null> {
  // listUsers is paginated; 10 fixed dev emails live comfortably in the first pages.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

// -------------------------------------------------------------------- Runner

export async function seedStudents(): Promise<SeedSummary> {
  const ref = await loadReference();
  if (ref.colleges.length === 0) throw new Error("No active colleges found to assign.");
  if (ref.interests.length < 3) throw new Error("Need at least 3 active interests to seed.");

  const photoBuffers = await downloadPhotos();
  const accounts: SeedAccountResult[] = [];
  let created = 0;
  let updated = 0;

  for (const persona of PERSONAS) {
    const email = seedEmail(persona.seq);
    let action: "created" | "updated" = "updated";

    // 1. Auth account (create once, reuse thereafter) — identical to real signup.
    let userId = await findUserIdByEmail(email);
    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: persona.fullName, seed: SEED_TAG },
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      userId = data.user.id;
      action = "created";
      created++;
    } else {
      updated++;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { display_name: persona.fullName, seed: SEED_TAG },
      });
    }

    // The handle_new_user trigger already inserted profiles/settings/user_roles.
    // 2. Reference selections.
    const college = shuffle(ref.colleges, persona.seq)[0];
    const department = pickDepartment(persona.preferredDepartments, ref.departments, persona.seq);
    const interestIds = pickInterests(
      persona.preferredInterests,
      ref.interests,
      persona.preferredInterests.length,
      persona.seq,
    );

    // 3. Photos (rebuilt each run for idempotency) → primary drives avatar_url.
    const primaryPath = await rebuildPhotos(userId, photoBuffers, persona.photoCount, persona.seq);

    // 4. Full profile — the exact fields the onboarding flow writes.
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: persona.fullName,
        display_name: persona.fullName,
        gender: persona.gender,
        looking_for: persona.lookingFor,
        date_of_birth: dobForAge(persona.age, persona.seq),
        college_id: college.id,
        department_id: department?.id ?? null,
        graduation_year: graduationYearForAge(persona.age),
        semester: semesterForAge(persona.age, persona.seq),
        bio: persona.bio,
        avatar_url: primaryPath,
        verification_status: "verified",
        account_status: "active",
        onboarding_completed: true,
        onboarding_step: "complete",
        last_login_at: new Date(Date.now() - persona.seq * 3600_000).toISOString(),
      })
      .eq("id", userId);
    if (pErr) throw new Error(`profile ${email}: ${pErr.message}`);

    // 5. Interests (rebuilt each run for idempotency).
    await supabaseAdmin.from("user_interests").delete().eq("user_id", userId);
    const { error: iErr } = await supabaseAdmin
      .from("user_interests")
      .insert(interestIds.map((interest_id) => ({ user_id: userId!, interest_id })));
    if (iErr) throw new Error(`interests ${email}: ${iErr.message}`);

    // 6. Settings: created by the signup trigger; ensure discovery-ready defaults.
    const { error: sErr } = await supabaseAdmin
      .from("settings")
      .update({ discovery_enabled: true, profile_visible: true, allow_profile_preview: true })
      .eq("user_id", userId);
    if (sErr) throw new Error(`settings ${email}: ${sErr.message}`);

    accounts.push({
      seq: persona.seq,
      email,
      userId,
      fullName: persona.fullName,
      college: college.name,
      department: department?.name ?? null,
      photos: persona.photoCount,
      interests: interestIds.length,
      action,
    });
  }

  return { ok: true, total: accounts.length, created, updated, accounts };
}
