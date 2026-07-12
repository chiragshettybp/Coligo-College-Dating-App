// ============================================================================
// ONE-TIME DEV SEED — creates 10 realistic test student accounts.
// Guarded by the SEED_SECRET header. These accounts use the @campuslove.test
// email domain so they are easy to identify and delete later.
//
// Run once:
//   curl -X POST \
//     -H "x-seed-secret: <SEED_SECRET>" \
//     https://project--<id>-dev.lovable.app/api/public/seed-students
//
// Safe to delete this file after seeding.
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "profile-photos";

const PHOTO_URLS = [
  "https://i.postimg.cc/HL8TJ0GL/a3fcdc42d51181b6cad2769d4f62b834.jpg",
  "https://i.postimg.cc/XvBnZKMr/e473f6d24c389583c2e015b4e83e4bfd.jpg",
  "https://i.postimg.cc/bvSqG0XD/e7b0928f87c81191f431cddab45bcd31.jpg",
];

type Gender = "man" | "woman";
type LookingFor = "women" | "men" | "everyone";

type SeedProfile = {
  slug: string;
  fullName: string;
  gender: Gender;
  lookingFor: LookingFor;
  bio: string;
  dobYear: number;
  dobMonth: number;
  dobDay: number;
  gradYear: number;
  semester: number;
  photoCount: number;
};

const PROFILES: SeedProfile[] = [
  {
    slug: "aditya-rao",
    fullName: "Aditya Rao",
    gender: "man",
    lookingFor: "women",
    bio: "CSE junior who lives on filter coffee and side projects. Weekend cyclist around Nandi Hills. Ask me about football or the last bug I spent 6 hours on.",
    dobYear: 2004, dobMonth: 3, dobDay: 14,
    gradYear: 2026, semester: 6, photoCount: 4,
  },
  {
    slug: "ananya-iyer",
    fullName: "Ananya Iyer",
    gender: "woman",
    lookingFor: "men",
    bio: "ECE + a sketchbook I never finish. Bharatanatyam since I was six, sarcasm since a bit later. Take me for dosa and I'm sold.",
    dobYear: 2004, dobMonth: 7, dobDay: 2,
    gradYear: 2026, semester: 6, photoCount: 5,
  },
  {
    slug: "rohan-shetty",
    fullName: "Rohan Shetty",
    gender: "man",
    lookingFor: "women",
    bio: "Mechanical engineer, part-time drummer. Coastal Karnataka boy who misses the beach in Bengaluru traffic. Big on road trips and bigger on biryani.",
    dobYear: 2003, dobMonth: 11, dobDay: 21,
    gradYear: 2026, semester: 7, photoCount: 3,
  },
  {
    slug: "sneha-kulkarni",
    fullName: "Sneha Kulkarni",
    gender: "woman",
    lookingFor: "everyone",
    bio: "ISE student, chai over coffee, always. I read too much sci-fi and argue about it. Trying to visit every trek trail in the Western Ghats.",
    dobYear: 2005, dobMonth: 1, dobDay: 30,
    gradYear: 2027, semester: 4, photoCount: 4,
  },
  {
    slug: "karthik-gowda",
    fullName: "Karthik Gowda",
    gender: "man",
    lookingFor: "women",
    bio: "AI & ML nerd by day, FIFA rival by night. Grew up in Mysuru, still think it beats every other city. Will judge your Spotify wrapped kindly.",
    dobYear: 2004, dobMonth: 9, dobDay: 8,
    gradYear: 2026, semester: 6, photoCount: 5,
  },
  {
    slug: "divya-bhat",
    fullName: "Divya Bhat",
    gender: "woman",
    lookingFor: "men",
    bio: "Biotech + baking experiments that mostly work. Carnatic playlists on loop. Looking for someone who'll come to farmers' markets with me on Sundays.",
    dobYear: 2005, dobMonth: 5, dobDay: 17,
    gradYear: 2027, semester: 4, photoCount: 3,
  },
  {
    slug: "arjun-nair",
    fullName: "Arjun Nair",
    gender: "man",
    lookingFor: "everyone",
    bio: "Civil engineer who photographs old buildings. Runner, occasional poet, permanent foodie. Best conversations happen over cutting chai.",
    dobYear: 2003, dobMonth: 12, dobDay: 4,
    gradYear: 2026, semester: 7, photoCount: 4,
  },
  {
    slug: "meghana-desai",
    fullName: "Meghana Desai",
    gender: "woman",
    lookingFor: "men",
    bio: "EEE student from Belagavi, badminton at 6am kind of person. I collect playlists and vada pav spots. Tell me your worst pun.",
    dobYear: 2004, dobMonth: 6, dobDay: 25,
    gradYear: 2026, semester: 6, photoCount: 6,
  },
  {
    slug: "vishal-hegde",
    fullName: "Vishal Hegde",
    gender: "man",
    lookingFor: "women",
    bio: "CSE + startup daydreams. Chess, chai, and quiz nights are my love language. From Sirsi, so yes, I know a good waterfall you haven't heard of.",
    dobYear: 2005, dobMonth: 2, dobDay: 11,
    gradYear: 2027, semester: 4, photoCount: 3,
  },
  {
    slug: "priya-reddy",
    fullName: "Priya Reddy",
    gender: "woman",
    lookingFor: "everyone",
    bio: "Design-minded ECE student who doodles in every margin. Concerts, cats, and cold coffee. I'll remember your birthday and your coffee order.",
    dobYear: 2004, dobMonth: 8, dobDay: 19,
    gradYear: 2026, semester: 6, photoCount: 5,
  },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (seed * (i + 7) + 13) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const Route = createFileRoute("/api/public/seed-students")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // --- auth guard -----------------------------------------------------
        const secret = process.env.SEED_SECRET;
        if (!secret || request.headers.get("x-seed-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // --- reference data -------------------------------------------------
        const [collegesRes, deptRes, interestsRes] = await Promise.all([
          supabaseAdmin
            .from("colleges")
            .select("id, name")
            .eq("is_active", true)
            .in("city", ["Bangalore", "Bengaluru", "Mysore", "Mangalore", "Belgaum", "Hubballi", "Tumkur", "Davanagere"])
            .limit(200),
          supabaseAdmin
            .from("departments")
            .select("id, name")
            .eq("is_active", true)
            .in("name", [
              "Computer Science & Engineering",
              "Electronics & Communication",
              "Mechanical Engineering",
              "Information Science & Engineering",
              "Electrical Engineering",
              "Civil Engineering",
              "Biotechnology",
              "AI, Machine Learning & Data Science",
            ]),
          supabaseAdmin.from("interests").select("id, name").eq("is_active", true).limit(200),
        ]);

        const colleges = collegesRes.data ?? [];
        const departments = deptRes.data ?? [];
        const interests = interestsRes.data ?? [];
        if (colleges.length === 0 || departments.length === 0 || interests.length === 0) {
          return Response.json(
            { ok: false, error: "Missing reference data (colleges/departments/interests)." },
            { status: 500 },
          );
        }

        // Map department name -> id, so profiles get a sensible branch.
        const deptByName = new Map(departments.map((d) => [d.name, d.id]));
        const branchFor: Record<string, string> = {
          "aditya-rao": "Computer Science & Engineering",
          "ananya-iyer": "Electronics & Communication",
          "rohan-shetty": "Mechanical Engineering",
          "sneha-kulkarni": "Information Science & Engineering",
          "karthik-gowda": "AI, Machine Learning & Data Science",
          "divya-bhat": "Biotechnology",
          "arjun-nair": "Civil Engineering",
          "meghana-desai": "Electrical Engineering",
          "vishal-hegde": "Computer Science & Engineering",
          "priya-reddy": "Electronics & Communication",
        };

        // --- prefetch the source photos once --------------------------------
        const photoBuffers: ArrayBuffer[] = [];
        for (const url of PHOTO_URLS) {
          const res = await fetch(url);
          if (!res.ok) {
            return Response.json(
              { ok: false, error: `Failed to fetch photo ${url} (${res.status})` },
              { status: 502 },
            );
          }
          photoBuffers.push(await res.arrayBuffer());
        }

        // --- existing auth users (for idempotent re-runs) -------------------
        const emailToId = new Map<string, string>();
        {
          const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          for (const u of data?.users ?? []) if (u.email) emailToId.set(u.email.toLowerCase(), u.id);
        }

        const results: { email: string; id: string; status: string }[] = [];

        for (let i = 0; i < PROFILES.length; i++) {
          const p = PROFILES[i];
          const email = `seed.${p.slug}@campuslove.test`.toLowerCase();

          // 1) auth account -------------------------------------------------
          let userId = emailToId.get(email);
          let status = "updated";
          if (!userId) {
            const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
              email,
              password: "CampusLove!Seed2026",
              email_confirm: true,
              user_metadata: { full_name: p.fullName, display_name: p.fullName.split(" ")[0] },
            });
            if (createErr || !created.user) {
              results.push({ email, id: "", status: `error: ${createErr?.message ?? "create failed"}` });
              continue;
            }
            userId = created.user.id;
            status = "created";
          }

          const college = pick(colleges, i * 3 + 1);
          const departmentId = deptByName.get(branchFor[p.slug]) ?? departments[i % departments.length].id;
          const dob = `${p.dobYear}-${String(p.dobMonth).padStart(2, "0")}-${String(p.dobDay).padStart(2, "0")}`;

          // 2) photos: reset then upload ------------------------------------
          await supabaseAdmin.from("photos").delete().eq("user_id", userId);
          {
            const { data: existing } = await supabaseAdmin.storage.from(BUCKET).list(userId);
            if (existing && existing.length > 0) {
              await supabaseAdmin.storage
                .from(BUCKET)
                .remove(existing.map((f) => `${userId}/${f.name}`));
            }
          }

          const order = shuffle([0, 1, 2], i + 1);
          const chosen = Array.from({ length: p.photoCount }, (_, k) => order[k % order.length]);
          const photoRows: { user_id: string; storage_path: string; position: number; is_primary: boolean }[] = [];
          let primaryPath: string | null = null;
          for (let k = 0; k < chosen.length; k++) {
            const path = `${userId}/${crypto.randomUUID()}.jpg`;
            const { error: upErr } = await supabaseAdmin.storage
              .from(BUCKET)
              .upload(path, photoBuffers[chosen[k]], { contentType: "image/jpeg", upsert: true });
            if (upErr) continue;
            if (k === 0) primaryPath = path;
            photoRows.push({ user_id: userId, storage_path: path, position: k, is_primary: k === 0 });
          }
          if (photoRows.length > 0) await supabaseAdmin.from("photos").insert(photoRows);

          // 3) profile ------------------------------------------------------
          await supabaseAdmin.from("profiles").upsert(
            {
              id: userId,
              full_name: p.fullName,
              display_name: p.fullName.split(" ")[0],
              gender: p.gender,
              date_of_birth: dob,
              college_id: college.id,
              department_id: departmentId,
              graduation_year: p.gradYear,
              semester: p.semester,
              looking_for: p.lookingFor,
              bio: p.bio,
              avatar_url: primaryPath,
              onboarding_completed: true,
              onboarding_step: "complete",
              account_status: "active",
              verification_status: "verified",
              last_login_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

          // 4) settings -----------------------------------------------------
          await supabaseAdmin.from("settings").upsert(
            { user_id: userId, discovery_enabled: true, push_enabled: true },
            { onConflict: "user_id" },
          );

          // 5) role ---------------------------------------------------------
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: "user" }, { onConflict: "user_id,role", ignoreDuplicates: true });

          // 6) interests ----------------------------------------------------
          await supabaseAdmin.from("user_interests").delete().eq("user_id", userId);
          const picked = shuffle(interests, i + 5).slice(0, 4 + (i % 3));
          await supabaseAdmin
            .from("user_interests")
            .insert(picked.map((it) => ({ user_id: userId, interest_id: it.id })));

          results.push({ email, id: userId, status: `${status} (${photoRows.length} photos)` });
        }

        return Response.json({ ok: true, count: results.length, results });
      },
    },
  },
});
