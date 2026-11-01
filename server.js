import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { createRequire } from "module";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
dotenv.config({ override: true });
const require = createRequire(import.meta.url);

// Disposable Email Detection Configuration
const disposableDomainsSet = new Set();
try {
  const pkgDomains = require("disposable-email-domains");
  if (Array.isArray(pkgDomains)) {
    pkgDomains.forEach(d => disposableDomainsSet.add(d.toLowerCase()));
  } else if (pkgDomains && typeof pkgDomains === "object") {
    Object.keys(pkgDomains).forEach(d => disposableDomainsSet.add(d.toLowerCase()));
  }
} catch (e) {
  console.warn("Could not load disposable-email-domains package:", e.message);
}

// Explicit custom disposable and temporary domains (including vtmpj.com as specifically requested)
const customDisposableDomains = [
  "vtmpj.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "dispostable.com",
  "getnada.com",
  "dropmail.me",
  "throwawaymail.com",
  "crazymailing.com",
  "maildrop.cc",
  "mohmal.com",
  "emailondeck.com",
  "fakeinbox.com",
  "tempail.com",
  "tempr.email",
  "discard.email",
  "discardmail.com",
  "spambog.com",
  "mailnull.com",
  "generator.email",
  "mytemp.email",
  "burnermail.io",
  "inboxkitten.com"
];
customDisposableDomains.forEach(d => disposableDomainsSet.add(d.toLowerCase()));

const isDisposableEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const cleanEmail = email.trim().toLowerCase();
  
  // Specific user-reported address
  if (cleanEmail === "pnlytplavledblqcmr@vtmpj.com") return true;

  const parts = cleanEmail.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase().trim();

  if (disposableDomainsSet.has(domain)) return true;

  // Check subdomains
  const domainParts = domain.split(".");
  for (let i = 0; i < domainParts.length - 1; i++) {
    const parent = domainParts.slice(i).join(".");
    if (disposableDomainsSet.has(parent)) return true;
  }

  // Common pattern checks for disposable / temporary email domains
  if (/(vtmpj|tempmail|dispos|fakemail|trashmail|throwaway|burnermail|guerrilla|10minute|dropmail|mailinator|yopmail|mohmal|sharklaser|spam4)/i.test(domain)) {
    return true;
  }

  return false;
};

const validateName = (name) => {
  if (!name || typeof name !== "string") return { isValid: false, error: "Name is required." };
  const trimmed = name.trim();
  if (trimmed.length < 2) return { isValid: false, error: "Name must be at least 2 letters." };
  if (/\d/.test(trimmed)) return { isValid: false, error: "Numbers are not allowed in names. Please use letters only." };
  const validNameRegex = /^[A-Za-z\s\.\-ñÑ',]+$/;
  if (!validNameRegex.test(trimmed)) return { isValid: false, error: "Names can only contain letters and standard separators." };
  const alphaOnly = trimmed.toLowerCase().replace(/[^a-zñ]/g, "");
  const vowels = alphaOnly.match(/[aeiouyñ]/g) || [];
  if (vowels.length === 0 && alphaOnly.length >= 4) return { isValid: false, error: "Please enter a valid legal name. Random characters are not allowed." };
  if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(alphaOnly)) return { isValid: false, error: "The name provided appears to be invalid. Please enter your real legal name." };
  if (/(.)\1{3,}/.test(alphaOnly)) return { isValid: false, error: "Repeated characters detected. Please enter a valid name." };
  return { isValid: true };
};

const validatePhoneNumber = (phone) => {
  if (!phone) return { isValid: false, error: "Mobile number is required." };
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return { isValid: false, error: "Mobile number must be exactly 11 digits." };
  if (!digits.startsWith("09")) return { isValid: false, error: "Philippine mobile numbers must start with '09'." };
  return { isValid: true };
};


const PORT = 3000;
const isProd = process.env.NODE_ENV === "production";
globalThis.localTickets = [];
globalThis.localAnnouncements = [];
var localSettings = {};
globalThis.localInquiries = [];
globalThis.otpStore = globalThis.otpStore || new Map();
globalThis.loginAttempts = globalThis.loginAttempts || new Map();
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout

const getClientIp = (req) => {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || req.ip || "unknown";
};

// Helper to send transactional emails via Brevo API
const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent }) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.error("BREVO_API_KEY environment variable is not configured.");
    throw new Error("Email service is temporarily unavailable. Please try again later.");
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@soreco1.com";
  const senderName = process.env.BREVO_SENDER_NAME || "SORECO-1 Support";

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: toEmail,
        name: toName || toEmail.split("@")[0]
      }
    ],
    subject: subject,
    htmlContent: htmlContent
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorDetail = `Status ${response.status}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    console.error("Email service error:", errorDetail);
    throw new Error(`Failed to send email notification: ${errorDetail}`);
  }

  const result = await response.json();
  return result;
};
const sanitizeSupabaseUrl = (url) => {
  if (!url) return "https://mock.supabase.co";
  return url.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
};
const supabaseUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "mock_key";
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables. Falling back to ANON key.");
}
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Secondary Standby Replica & Hourly Backup Synchronization
const backupSupabaseUrl = process.env.SUPABASE_BACKEND_URL || process.env.SUPABASE_BACKEND_URL_REPLICA || "";
const backupSupabaseKey = process.env.SUPABASE_BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hasExternalReplica = Boolean(backupSupabaseUrl && backupSupabaseUrl !== supabaseUrl);
const supabaseBackup = hasExternalReplica ? createClient(backupSupabaseUrl, backupSupabaseKey) : null;

let isSupabaseRestricted = false;
let supabaseRestrictedReason = "";
const markSupabaseRestricted = (err) => {
  const msg = err?.message || String(err || "");
  if (msg.includes("exceed_egress_quota") || msg.includes("is restricted") || msg.includes("spend caps")) {
    if (!isSupabaseRestricted) {
      isSupabaseRestricted = true;
      supabaseRestrictedReason = msg;
      console.warn("[Data-Sync] Supabase project egress quota reached:", msg);
      console.warn("[Data-Sync] Seamlessly activating local persistent fallback store for all operations.");
    }
    return true;
  }
  return false;
};

const runHourlyBackupSync = async () => {
  try {
    // 1. Always create local persistent backup snapshot (0 egress, zero-failure)
    try {
      const currentTickets = getLocalTickets();
      if (currentTickets && currentTickets.length > 0) {
        fs.writeFileSync(TICKETS_FILE + ".backup", JSON.stringify(currentTickets, null, 2), "utf-8");
      }
    } catch (e) {}

    // 2. Only replicate over network to a separate secondary replica if configured and primary is not quota-restricted
    if (supabaseBackup && !isSupabaseRestricted) {
      try {
        const { data: users, error: uErr } = await supabase.from("users").select("*");
        if (!uErr && users && users.length > 0) {
          for (const u of users) {
            try {
              await supabaseBackup.from("users").upsert(u);
            } catch {}
          }
        }
        const { data: tickets, error: tErr } = await supabase.from("tickets").select("*");
        if (!tErr && tickets && tickets.length > 0) {
          for (const t of tickets) {
            try {
              await supabaseBackup.from("tickets").upsert(t);
            } catch {}
          }
        }
      } catch (replicaSyncErr) {
        console.warn("Backup replica sync warning:", replicaSyncErr.message);
      }
    }
  } catch (err) {
    if (!markSupabaseRestricted(err)) {
      console.error("[Backup Replica] Error during hourly backup synchronization:", err.message);
    }
  }
};

setTimeout(runHourlyBackupSync, 15000);
setInterval(runHourlyBackupSync, 3600000);

const seedDatabases = async () => {
  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
  if (!hasServiceRole) {
    console.log("Skipping auth user seeding because SUPABASE_SERVICE_ROLE_KEY is not defined.");
    try {
      const { data: existingAnns, error: annError } = await supabase.from("announcements").select("id").limit(1);
      if (!annError && (!existingAnns || existingAnns.length === 0)) {
        const announcements = [
          { id: "ann-1", title: "Scheduled Maintenance: Bulan Proper", content: "Power interruption in Bulan Proper on May 20, 2026, from 8:00 AM to 5:00 PM for line upgrading and maintenance. Please plan accordingly." },
          { id: "ann-2", title: "New Payment Channels", content: "We now accept payments via GCash, PayMaya, and 7-Eleven. Simply use your account number to pay your monthly bills conveniently." },
          { id: "ann-3", title: "Billing Cycle Update", content: "May 2026 billing statements are now being distributed. You can also view your current balance through our new Digital Consumer Portal." }
        ];
        await supabase.from("announcements").insert(announcements);
        console.log("Seeded default announcements.");
      }
    } catch (e) {
      console.log("[Data-Sync] Supabase offline, skipping announcement seeding.");
    }
    return;
  }
  try {
    let existingAdminFound = false;
    try {
      const { data: authUsersRes, error: authUsersError } = await supabase.auth.admin.listUsers();
      if (!authUsersError && authUsersRes && authUsersRes.users) {
        const adminUser = authUsersRes.users.find((u) => u.email === "admin@gov.ph" || u.user_metadata?.role === "admin");
        if (adminUser) {
          existingAdminFound = true;
        }
      }
    } catch (e) {
      console.log("[Data-Sync] Supabase offline, using local admin fallback.");
    }
    if (!existingAdminFound) {
      try {
        const { data: existingAdminProfiles } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1);
        if (existingAdminProfiles && existingAdminProfiles.length > 0) {
          existingAdminFound = true;
        }
      } catch (e) {
      }
      try {
        const { data: existingAdminUsers } = await supabase.from("users").select("id").eq("role", "admin").limit(1);
        if (existingAdminUsers && existingAdminUsers.length > 0) {
          existingAdminFound = true;
        }
      } catch (e) {
      }
    }
    if (existingAdminFound) {
      console.log("Database already seeded with demo accounts.");
      return;
    }
    console.log("Starting Supabase Auth and Profiles seeding...");
    const usersToSeed = [
      {
        fullName: "System Administrator",
        email: "admin@gov.ph",
        password: "admin123",
        role: "admin",
        accountNumber: "ADMIN-001"
      },
      {
        fullName: "Janry Maligaso",
        email: "janry.maligaso@sorsu.edu.ph",
        password: "admin123",
        role: "admin",
        accountNumber: "ADMIN-002"
      },
      {
        fullName: "Demo Consumer",
        email: "consumer@gov.ph",
        password: "consumer123",
        role: "consumer",
        accountNumber: "00-1234-5678"
      }
    ];
    for (const u of usersToSeed) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          fullName: u.fullName,
          accountNumber: u.accountNumber,
          role: u.role
        }
      });
      if (authError) {
        if (authError.message?.includes("already exists")) {
          console.log(`Auth user ${u.email} already exists.`);
        } else {
          console.error(`Error seeding auth user ${u.email}:`, authError.message);
        }
        continue;
      }
      if (authData?.user) {
        try {
          await supabase.from("users").upsert({
            id: authData.user.id,
            fullname: u.fullName,
            accountnumber: u.accountNumber,
            email: u.email,
            role: u.role,
            phonenumber: "",
            address: "",
            profileimage: ""
          });
          console.log(`Profile seeded for ${u.email} in 'users' table.`);
        } catch (e) {
          console.warn("Seeding user table error:", e.message);
        }
        try {
          await supabase.from("profiles").upsert({
            id: authData.user.id,
            full_name: u.fullName,
            account_number: u.accountNumber,
            role: u.role,
            phone_number: "",
            address: "",
            profile_image: ""
          });
          console.log(`Profile seeded for ${u.email} in 'profiles' table.`);
        } catch (e) {
          console.warn("Seeding profiles table error:", e.message);
        }
        console.log(`Seeded and profiled user ${u.email} successfully.`);
      }
    }
    try {
      const { data: existingAnns, error: annError } = await supabase.from("announcements").select("id").limit(1);
      if (!annError && (!existingAnns || existingAnns.length === 0)) {
        const announcements = [
          { id: "ann-1", title: "Scheduled Maintenance: Bulan Proper", content: "Power interruption in Bulan Proper on May 20, 2026, from 8:00 AM to 5:00 PM for line upgrading and maintenance. Please plan accordingly." },
          { id: "ann-2", title: "New Payment Channels", content: "We now accept payments via GCash, PayMaya, and 7-Eleven. Simply use your account number to pay your monthly bills conveniently." },
          { id: "ann-3", title: "Billing Cycle Update", content: "May 2026 billing statements are now being distributed. You can also view your current balance through our new Digital Consumer Portal." }
        ];
        await supabase.from("announcements").insert(announcements);
        console.log("Seeded default announcements.");
      }
    } catch (e) {
      console.warn("Announcement seeding skipped:", e);
    }
  } catch (err) {
    console.warn("Seeding exception:", err.message);
  }
};


const getUserById = async (id) => {
  if (!id) return null;
  try {
    let data = null;
    try {
      const { data: pData, error: pError } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (!pError && pData) {
        data = {
          id: pData.id,
          fullName: pData.full_name || "",
          role: pData.role || "consumer",
          accountNumber: pData.account_number || "",
          phoneNumber: pData.phone_number || "",
          address: pData.address || "",
          profileImage: pData.profile_image || "",
          createdAt: pData.created_at
        };
      }
    } catch (e) {
      console.warn("Profiles table check failed in getUserById, trying users table next.");
    }
    if (!data) {
      try {
        const { data: uData, error: uError } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
        if (!uError && uData) {
          data = {
            id: uData.id,
            fullName: uData.fullName || uData.full_name || "",
            role: uData.role || "consumer",
            accountNumber: uData.accountNumber || uData.account_number || "",
            phoneNumber: uData.phoneNumber || uData.phone_number || "",
            address: uData.address || "",
            profileImage: uData.profileImage || uData.profile_image || "",
            createdAt: uData.createdAt || uData.created_at
          };
        }
      } catch (e) {
        console.warn("Users table check failed in getUserById.");
      }
    }

    let authUser = null;
    try {
      const { data: aData, error: authError } = await supabase.auth.admin.getUserById(id);
      if (!authError && aData?.user) {
        authUser = aData.user;
      }
    } catch (e) {
      console.warn("Auth getUserById failed:", e.message);
    }

    const metaHasUnpaid = Boolean(authUser?.user_metadata?.hasUnpaidBill ?? authUser?.user_metadata?.has_unpaid_bill ?? false);

    if (data) {
      data.hasUnpaidBill = metaHasUnpaid;
      return data;
    }

    if (!authUser) return null;
    return {
      id: authUser.id,
      fullName: authUser.user_metadata?.fullName || authUser.user_metadata?.full_name || "",
      role: authUser.user_metadata?.role || "consumer",
      accountNumber: authUser.user_metadata?.accountNumber || authUser.user_metadata?.account_number || "",
      phoneNumber: authUser.user_metadata?.phoneNumber || authUser.user_metadata?.phone_number || "",
      address: authUser.user_metadata?.address || "",
      profileImage: authUser.user_metadata?.profileImage || authUser.user_metadata?.profile_image || "",
      hasUnpaidBill: metaHasUnpaid,
      createdAt: authUser.created_at
    };
  } catch (err) {
    console.error("getUserById exception:", err.message);
    return null;
  }
};
const updateUserProfile = async (id, profileData, userToken = null) => {
  if (!id) return null;

  // 1. Fetch current metadata from Supabase Auth
  let currentMetadata = {};
  try {
    const { data: userData, error: getUserErr } = await supabase.auth.admin.getUserById(id);
    if (!getUserErr && userData?.user) {
      currentMetadata = userData.user.user_metadata || {};
    }
  } catch (err) {
    console.warn("Could not fetch user metadata before update:", err.message);
  }

  const metaUpdate = {
    ...currentMetadata,
    fullName: profileData.fullName || currentMetadata.fullName || "",
    phoneNumber: profileData.phoneNumber !== undefined ? profileData.phoneNumber : (currentMetadata.phoneNumber || ""),
    address: profileData.address !== undefined ? profileData.address : (currentMetadata.address || ""),
    barangay: profileData.address !== undefined ? profileData.address : (currentMetadata.barangay || ""),
    accountNumber: profileData.accountNumber !== undefined ? profileData.accountNumber : (currentMetadata.accountNumber || ""),
    profileImage: profileData.profileImage !== undefined ? profileData.profileImage : (currentMetadata.profileImage || "")
  };
  if (profileData.hasUnpaidBill !== undefined) {
    metaUpdate.hasUnpaidBill = Boolean(profileData.hasUnpaidBill);
  }

  // 2. Update Supabase Auth user_metadata
  try {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: metaUpdate
    });
    if (error) {
      console.warn("admin.updateUserById warning:", error.message);
    }
  } catch (err) {
    console.warn("admin.updateUserById exception:", err.message);
  }

  // 3. If userToken exists, sync via client session
  if (userToken) {
    try {
      const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "mock_key";
      const userSupabase = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      await userSupabase.auth.setSession({
        access_token: userToken,
        refresh_token: ""
      });
      await userSupabase.auth.updateUser({
        data: metaUpdate
      });
    } catch (err) {
      console.warn("userSupabase.auth.updateUser exception:", err.message);
    }
  }

  let existingRole = currentMetadata.role || "consumer";
  try {
    const { data: existingProfile } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
    if (existingProfile?.role) {
      existingRole = existingProfile.role;
    } else {
      const { data: existingUser } = await supabase.from("users").select("role").eq("id", id).maybeSingle();
      if (existingUser?.role) {
        existingRole = existingUser.role;
      }
    }
  } catch (e) {
    console.warn("Could not query existing role during profile update:", e);
  }

  try {
    const userUpsertData = {
      id: id,
      fullname: metaUpdate.fullName,
      phonenumber: metaUpdate.phoneNumber || "",
      address: metaUpdate.address || "",
      profileimage: metaUpdate.profileImage || "",
      accountnumber: metaUpdate.accountNumber || "",
      role: existingRole
    };
    const { error } = await supabase.from("users").upsert(userUpsertData);
    if (error) {
      console.error("Error upserting into users table:", error);
    }
  } catch (e) {
    console.error("Exception upserting into users table:", e);
  }

  try {
    const profileUpsertData = {
      id: id,
      full_name: metaUpdate.fullName,
      phone_number: metaUpdate.phoneNumber || "",
      address: metaUpdate.address || "",
      profile_image: metaUpdate.profileImage || "",
      account_number: metaUpdate.accountNumber || "",
      role: existingRole
    };
    const { error } = await supabase.from("profiles").upsert(profileUpsertData);
    if (error) {
      console.error("Error upserting into profiles table:", error);
    }
  } catch (e) {
    console.error("Exception upserting into profiles table:", e);
  }
};
const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(trimmed);
};

const getLocalUsers = () => {
  try {
    if (globalThis.localUsers && Array.isArray(globalThis.localUsers)) {
      return globalThis.localUsers;
    }
    return [];
  } catch (e) {
    return [];
  }
};

const getAllUsers = async (options = {}) => {
  let authUsers = [];
  try {
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error: authError } = await supabase.auth.admin.listUsers({ page, perPage });
      if (authError || !data?.users || data.users.length === 0) break;
      authUsers.push(...data.users);
      if (data.users.length < perPage) break;
      page++;
    }
  } catch (err) {
    console.warn("getAllUsers auth listUsers failed, falling back to profiles/users table:", err.message);
  }

  // Create an auth verification and metadata map for fast lookup
  const authVerificationMap = new Map();
  authUsers.forEach((u) => {
    const isDisposable = isDisposableEmail(u.email);
    const isVerified = !isDisposable && Boolean(
      u.email_confirmed_at ||
      u.confirmed_at ||
      u.phone_confirmed_at ||
      u.user_metadata?.email_verified ||
      u.user_metadata?.email_confirmed ||
      u.app_metadata?.provider === "google" ||
      u.identities?.some((i) => i.provider === "google") ||
      u.email === "admin01@gmail.com" ||
      u.email === "janry.maligaso@sorsu.edu.ph"
    );
    authVerificationMap.set(u.id, isVerified);
    if (u.email) {
      authVerificationMap.set(u.email.toLowerCase(), isVerified);
    }
  });

  let profileMap = /* @__PURE__ */ new Map();
  try {
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("*");
    if (!profileError && profiles && profiles.length > 0) {
      profiles.forEach((p) => {
        profileMap.set(p.id, {
          email: p.email,
          role: p.role,
          fullName: p.full_name,
          accountNumber: p.account_number,
          phoneNumber: p.phone_number,
          address: p.address,
          profileImage: p.profile_image,
          hasUnpaidBill: p.has_unpaid_bill
        });
      });
    }
  } catch (e) {
    console.warn("Could not query profiles table in getAllUsers.");
  }
  try {
    const { data: usersTable, error: usersError } = await supabase.from("users").select("*");
    if (!usersError && usersTable && usersTable.length > 0) {
      usersTable.forEach((u) => {
        if (!profileMap.has(u.id)) {
          profileMap.set(u.id, {
            email: u.email,
            role: u.role,
            fullName: u.fullname || u.fullName || u.full_name,
            accountNumber: u.accountnumber || u.accountNumber || u.account_number,
            phoneNumber: u.phonenumber || u.phoneNumber || u.phone_number,
            address: u.address,
            profileImage: u.profileimage || u.profileImage || u.profile_image,
            hasUnpaidBill: u.hasunpaidbill !== undefined ? u.hasunpaidbill : (u.hasUnpaidBill !== undefined ? u.hasUnpaidBill : u.has_unpaid_bill)
          });
        }
      });
    }
  } catch (e) {
    console.warn("Could not query users table in getAllUsers.");
  }
  const result = authUsers.map((u) => {
    const profile = profileMap.get(u.id) || {};
    profileMap.delete(u.id);
    const isDisposable = isDisposableEmail(u.email);
    const isVerified = !isDisposable && Boolean(
      u.email_confirmed_at ||
      u.confirmed_at ||
      u.phone_confirmed_at ||
      u.user_metadata?.email_verified ||
      u.user_metadata?.email_confirmed ||
      u.app_metadata?.provider === "google" ||
      u.identities?.some((i) => i.provider === "google") ||
      u.email === "admin01@gmail.com" ||
      u.email === "janry.maligaso@sorsu.edu.ph"
    );
    return {
      id: u.id,
      email: u.email || "",
      role: profile.role || u.user_metadata?.role || "consumer",
      fullName: profile.fullName || u.user_metadata?.fullName || u.user_metadata?.full_name || "",
      accountNumber: profile.accountNumber || u.user_metadata?.accountNumber || u.user_metadata?.account_number || "",
      phoneNumber: profile.phoneNumber || u.user_metadata?.phoneNumber || u.user_metadata?.phone_number || "",
      address: profile.address || u.user_metadata?.address || "",
      profileImage: profile.profileImage || u.user_metadata?.profileImage || u.user_metadata?.profile_image || "",
      hasUnpaidBill: Boolean(u.user_metadata?.hasUnpaidBill ?? u.user_metadata?.has_unpaid_bill ?? profile.hasUnpaidBill ?? false),
      createdAt: u.created_at,
      emailConfirmedAt: isDisposable ? null : (u.email_confirmed_at || u.confirmed_at || null),
      isVerified,
      isDisposableEmail: isDisposable
    };
  });

  profileMap.forEach((profile, id) => {
    if (id && !result.find((u) => u.id === id)) {
      const emailLower = (profile.email || "").toLowerCase();
      const isDisposable = isDisposableEmail(emailLower);
      const isVerified = !isDisposable && Boolean(
        profile.email_confirmed_at ||
        profile.confirmed_at ||
        emailLower === "admin01@gmail.com" ||
        emailLower === "janry.maligaso@sorsu.edu.ph"
      );
      result.push({
        id,
        email: profile.email || "",
        role: profile.role || "consumer",
        fullName: profile.fullName || "",
        accountNumber: profile.accountNumber || "",
        phoneNumber: profile.phoneNumber || "",
        address: profile.address || "",
        profileImage: profile.profileImage || "",
        hasUnpaidBill: Boolean(profile.hasUnpaidBill),
        createdAt: profile.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        emailConfirmedAt: isVerified ? (profile.createdAt || (/* @__PURE__ */ new Date()).toISOString()) : null,
        isVerified,
        isDisposableEmail: isDisposable
      });
    }
  });

  // Ensure strict uniqueness by id
  const seenIds = new Set();
  const uniqueUsers = [];
  for (const user of result) {
    if (user && user.id && !seenIds.has(user.id)) {
      seenIds.add(user.id);
      uniqueUsers.push(user);
    }
  }

  // If verifiedOnly is requested, strictly filter only users who actually verified their accounts
  if (options.verifiedOnly) {
    return uniqueUsers.filter((u) => u.isVerified === true);
  }
  return uniqueUsers;
};
const adminUpdateUser = async (id, updateData) => {
  if (!id) return null;
  try {
    const payload = {};
    if (updateData.fullName !== void 0) payload.full_name = updateData.fullName;
    if (updateData.role !== void 0) payload.role = updateData.role;
    if (updateData.accountNumber !== void 0) payload.account_number = updateData.accountNumber;
    if (updateData.phoneNumber !== void 0) payload.phone_number = updateData.phoneNumber;
    if (updateData.address !== void 0) payload.address = updateData.address;
    if (updateData.profileImage !== void 0) payload.profile_image = updateData.profileImage;
    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from("profiles").update(payload).eq("id", id);
      if (error && !error.message?.includes("Could not find the table") && error.code !== "42P01") {
        console.error("Error in adminUpdateUser table update:", error.message);
      }
    }
  } catch (err) {
    console.warn("adminUpdateUser table update exception:", err.message);
  }
  try {
    const usersPayload = {};
    if (updateData.fullName !== void 0) usersPayload.fullname = updateData.fullName;
    if (updateData.role !== void 0) usersPayload.role = updateData.role;
    if (updateData.accountNumber !== void 0) usersPayload.accountnumber = updateData.accountNumber;
    if (updateData.phoneNumber !== void 0) usersPayload.phonenumber = updateData.phoneNumber;
    if (updateData.address !== void 0) usersPayload.address = updateData.address;
    if (updateData.profileImage !== void 0) usersPayload.profileimage = updateData.profileImage;
    if (updateData.hasUnpaidBill !== void 0) usersPayload.hasunpaidbill = updateData.hasUnpaidBill;
    if (Object.keys(usersPayload).length > 0) {
      await supabase.from("users").update(usersPayload).eq("id", id);
    }
  } catch (err) {
  }
  const userMetadataUpdate = {};
  if (updateData.fullName !== void 0) userMetadataUpdate.fullName = updateData.fullName;
  if (updateData.role !== void 0) userMetadataUpdate.role = updateData.role;
  if (updateData.accountNumber !== void 0) userMetadataUpdate.accountNumber = updateData.accountNumber;
  if (updateData.phoneNumber !== void 0) userMetadataUpdate.phoneNumber = updateData.phoneNumber;
  if (updateData.address !== void 0) userMetadataUpdate.address = updateData.address;
  if (updateData.profileImage !== void 0) userMetadataUpdate.profileImage = updateData.profileImage;
  if (updateData.hasUnpaidBill !== void 0) userMetadataUpdate.hasUnpaidBill = updateData.hasUnpaidBill;
  const authUpdatePayload = {};
  if (updateData.email !== void 0) authUpdatePayload.email = updateData.email;
  if (Object.keys(userMetadataUpdate).length > 0) {
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(id);
      authUpdatePayload.user_metadata = {
        ...user?.user_metadata || {},
        ...userMetadataUpdate
      };
    } catch (err) {
      authUpdatePayload.user_metadata = userMetadataUpdate;
    }
  }
  try {
    const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdatePayload);
    if (authError) {
      console.error("Error in adminUpdateUser auth update:", authError.message);
      if (
        authError.message?.includes("Bearer token") ||
        authError.message?.includes("unauthorized") ||
        authError.status === 401 ||
        authError.status === 403 ||
        authError.code === "unauthorized"
      ) {
        console.log("Allowing database update to succeed despite auth update failure.");
        return;
      }
      throw authError;
    }
  } catch (err) {
    console.warn("adminUpdateUser Auth exception caught:", err.message);
    if (err.message?.includes("Bearer token") || err.message?.includes("unauthorized")) {
      return;
    }
    throw err;
  }
};
const adminDeleteUser = async (id) => {
  try {
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", id);
    if (profileError) {
      console.error("Error deleting from profiles table:", profileError.message);
    }
  } catch (err) {
    console.error("Exception deleting from profiles table:", err.message);
  }

  try {
    const { error: userTableError } = await supabase.from("users").delete().eq("id", id);
    if (userTableError) {
      console.error("Error deleting from users table:", userTableError.message);
    }
  } catch (err) {
    console.error("Exception deleting from users table:", err.message);
  }

  try {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      console.error("Error in adminDeleteUser auth delete:", error.message);
      if (
        error.message?.includes("Bearer token") ||
        error.message?.includes("unauthorized") ||
        error.status === 401 ||
        error.status === 403 ||
        error.code === "unauthorized"
      ) {
        console.log("Allowing database deletion to succeed despite auth deletion failure.");
        return;
      }
      throw error;
    }
  } catch (err) {
    console.warn("adminDeleteUser Auth exception caught:", err.message);
    if (err.message?.includes("Bearer token") || err.message?.includes("unauthorized")) {
      return;
    }
    throw err;
  }
};
const TICKETS_FILE = path.join(process.cwd(), "tickets_store.json");

const getLocalTickets = () => {
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      const content = fs.readFileSync(TICKETS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        globalThis.localTickets = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read tickets store file:", e);
  }
  return globalThis.localTickets || [];
};

const saveLocalTicket = (ticket) => {
  const current = getLocalTickets();
  const idx = current.findIndex((t) => t.id === ticket.id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...ticket };
  } else {
    current.unshift(ticket);
  }
  globalThis.localTickets = current;
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write tickets store file:", e);
  }
};

const updateLocalTicket = (id, updates) => {
  const current = getLocalTickets();
  const idx = current.findIndex((t) => t.id === id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...updates };
    globalThis.localTickets = current;
    try {
      fs.writeFileSync(TICKETS_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write tickets store file:", e);
    }
  }
};

const deleteLocalTicket = (id) => {
  const current = getLocalTickets().filter((t) => t.id !== id);
  globalThis.localTickets = current;
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write tickets store file:", e);
  }
};

const syncTicketsWithSupabase = async () => {
  if (isSupabaseRestricted) return;
  try {
    const { data: dbTickets, error } = await supabase.from("tickets").select("*").order("createdat", { ascending: false });
    if (!error && Array.isArray(dbTickets)) {
      console.log(`[Data-Sync] Supabase tickets fetched: ${dbTickets.length} records found.`);
      const localCurrent = getLocalTickets();
      const map = new Map();
      localCurrent.forEach(t => { if (t && t.id) map.set(t.id, t); });
      dbTickets.forEach(t => {
        if (t && t.id) {
          const existing = map.get(t.id);
          if (existing) {
            map.set(t.id, { ...existing, ...t });
          } else {
            map.set(t.id, t);
          }
        }
      });
      const merged = Array.from(map.values());
      globalThis.localTickets = merged;
      try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(merged, null, 2), "utf-8");
      } catch (e) {}

      // If Supabase table is missing any local tickets, sync them into Supabase
      const dbTicketIds = new Set(dbTickets.map(t => t.id));
      const missingInDb = localCurrent.filter(t => !dbTicketIds.has(t.id));
      if (missingInDb.length > 0) {
        console.log(`[Data-Sync] Syncing ${missingInDb.length} tickets to Supabase...`);
        for (const t of missingInDb) {
          await supabase.from("tickets").upsert({
            id: t.id,
            consumerid: t.consumerId || t.consumerid || t.user_id,
            consumername: t.consumerName || t.consumername || "",
            accountnumber: t.accountNumber || t.accountnumber || "",
            type: t.type,
            category: t.category,
            description: t.description,
            status: t.status,
            isurgent: t.isUrgent || t.isurgent ? 1 : 0,
            evidenceimage: t.evidenceImage || t.evidenceimage || "",
            checklist: typeof t.checklist === "string" ? t.checklist : JSON.stringify(t.checklist || null),
            messages: typeof t.messages === "string" ? t.messages : JSON.stringify(t.messages || []),
            feedback: typeof t.feedback === "string" ? t.feedback : JSON.stringify(t.feedback || null),
            createdat: t.createdAt || t.createdat || new Date().toISOString(),
            updatedat: t.updatedAt || t.updatedat || new Date().toISOString()
          }).catch((err) => {
            console.warn("[Data-Sync] Error syncing ticket to Supabase:", err.message);
          });
        }
      }
    } else if (error) {
      if (!markSupabaseRestricted(error)) {
        console.warn("[Data-Sync] Could not fetch tickets from Supabase:", error.message);
      }
    }
  } catch (err) {
    if (!markSupabaseRestricted(err)) {
      console.warn("[Data-Sync] Exception syncing tickets with Supabase:", err.message);
    }
  }
};

const getTicketsList = async (role = "admin", userId = null) => {
  try {
    let supabaseData = [];
    if (!isSupabaseRestricted) {
      try {
        let query = supabase.from("tickets").select("*");
        if (userId && role !== "admin") {
          query = query.eq("consumerid", userId);
        }
        const { data, error } = await query.order("createdat", { ascending: false });
        if (error) {
          markSupabaseRestricted(error);
          console.log("[Data-Sync] Supabase tickets fetch fallback activated:", error.message);
        } else if (data) {
          supabaseData = data;
        }
      } catch (dbErr) {
        markSupabaseRestricted(dbErr);
        console.log("[Data-Sync] Supabase tickets fetch fallback activated.");
      }
    }

    let profileMap = new Map();
    try {
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, full_name, account_number, phone_number, address");
      if (!profilesError && profiles) {
        profiles.forEach((p) => {
          profileMap.set(p.id, p);
        });
      }
    } catch (e) {
      console.warn("Could not query profiles table for manual join");
    }

    try {
      const { data: usersTbl } = await supabase.from("users").select("*");
      if (usersTbl) {
        usersTbl.forEach((u) => {
          if (!profileMap.has(u.id)) {
            profileMap.set(u.id, {
              id: u.id,
              full_name: u.fullname || u.fullName,
              account_number: u.accountnumber || u.accountNumber,
              phone_number: u.phonenumber || u.phoneNumber,
              address: u.address
            });
          }
        });
      }
    } catch (e) {}

    let authUserMap = new Map();
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users) {
        authData.users.forEach((u) => {
          authUserMap.set(u.id, u);
        });
      }
    } catch (e) {
      console.warn("Could not query auth users for tickets join fallback");
    }

    const localTickets = getLocalTickets();
    const localList = (!userId || role === "admin")
      ? localTickets
      : localTickets.filter((t) => (t.consumerId === userId || t.user_id === userId));
    
    const ticketMap = new Map();
    localList.forEach(t => { if (t && t.id) ticketMap.set(t.id, t); });
    supabaseData.forEach(t => {
      if (t && t.id) {
        const existing = ticketMap.get(t.id);
        if (existing) {
          ticketMap.set(t.id, { ...existing, ...t });
        } else {
          ticketMap.set(t.id, t);
        }
      }
    });
    let listToReturn = Array.from(ticketMap.values());
    
    const mappedList = listToReturn.map((t) => {
      const cid = t.consumerid || t.consumerId || t.user_id;
      const profile = profileMap.get(cid) || {};
      const authUser = authUserMap.get(cid) || {};
      const safeParseJson = (val, fallback) => {
        if (!val) return fallback;
        if (typeof val === "string") {
          try { return JSON.parse(val); } catch { return fallback; }
        }
        return val;
      };
      return {
        ...t,
        id: t.id,
        consumerId: cid,
        user_id: cid,
        consumerName: profile.full_name || authUser.user_metadata?.fullName || authUser.user_metadata?.full_name || t.consumername || t.consumerName || "Unknown",
        accountNumber: profile.account_number || authUser.user_metadata?.accountNumber || authUser.user_metadata?.account_number || t.accountnumber || t.accountNumber || "Unknown",
        address: profile.address || authUser.user_metadata?.address || t.address || "",
        phoneNumber: profile.phone_number || authUser.user_metadata?.phoneNumber || t.phoneNumber || "",
        type: t.type,
        category: t.category,
        description: t.description,
        status: t.status,
        isUrgent: t.isurgent !== undefined ? (t.isurgent ? 1 : 0) : (t.isUrgent ? 1 : 0),
        evidenceImage: t.evidenceimage || t.evidenceImage || "",
        checklist: safeParseJson(t.checklist, []),
        messages: safeParseJson(t.messages, []),
        feedback: safeParseJson(t.feedback, null),
        createdAt: t.createdat || t.createdAt,
        updatedAt: t.updatedat || t.updatedAt
      };
    });

    if (role === "admin") {
      return mappedList.filter((t) => t.status !== "cancelled");
    }
    return mappedList;
  } catch (err) {
    console.error("getTicketsList exception:", err.message);
    const localTickets = getLocalTickets();
    const localList = (!userId || role === "admin")
      ? localTickets
      : localTickets.filter((t) => (t.consumerId === userId || t.user_id === userId));
    
    if (role === "admin") {
      return localList.filter((t) => t.status !== "cancelled");
    }
    return localList;
  }
};
const getTicketById = async (id) => {
  if (!id) return null;
  try {
    let data = null;
    try {
      const { data: dbData, error } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
      if (!error && dbData) {
        data = dbData;
      }
    } catch (dbErr) {
      console.warn("Database query for ticket failed, checking local memory:", dbErr.message);
    }

    if (!data) {
      const localT = getLocalTickets().find((t) => t.id === id);
      if (localT) {
        data = localT;
      }
    }

    if (!data) return null;

    let profile = {};
    const cid = data.consumerid || data.consumerId || data.user_id;
    if (cid) {
      try {
        const { data: uData } = await supabase.from("users").select("*").eq("id", cid).maybeSingle();
        if (uData) {
          profile.email = uData.email;
          profile.full_name = uData.fullname || uData.fullName || uData.full_name;
          profile.account_number = uData.accountnumber || uData.accountNumber || uData.account_number;
          profile.phone_number = uData.phonenumber || uData.phoneNumber || uData.phone_number;
          profile.address = uData.address;
        }
      } catch (e) {
        console.warn("Users table query in getTicketById warning:", e.message);
      }
      try {
        const { data: profileData } = await supabase.from("profiles").select("full_name, account_number, phone_number, address").eq("id", cid).maybeSingle();
        if (profileData) {
          profile.full_name = profile.full_name || profileData.full_name;
          profile.account_number = profile.account_number || profileData.account_number;
          profile.phone_number = profile.phone_number || profileData.phone_number;
          profile.address = profile.address || profileData.address;
        }
      } catch (e) {
        console.warn("Profiles table query failed in getTicketById");
      }
      if (!profile.full_name || !profile.email) {
        try {
          const { data: aData } = await supabase.auth.admin.getUserById(cid);
          if (aData && aData.user) {
            const user = aData.user;
            profile.email = profile.email || user.email;
            profile.full_name = profile.full_name || user.user_metadata?.fullName || user.user_metadata?.full_name;
            profile.account_number = profile.account_number || user.user_metadata?.accountNumber || user.user_metadata?.account_number;
            profile.phone_number = profile.phone_number || user.user_metadata?.phoneNumber || user.user_metadata?.phone_number;
            profile.address = profile.address || user.user_metadata?.address;
          }
        } catch (e) {
          console.warn("Auth user fallback query failed in getTicketById");
        }
      }
    }
    const safeParseJson = (val, fallback) => {
      if (!val) return fallback;
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val;
    };
    return {
      ...data,
      id: data.id,
      consumerId: cid,
      user_id: cid,
      consumerName: profile.full_name || data.consumername || data.consumerName || "Unknown",
      consumerEmail: profile.email || data.consumerEmail || "",
      accountNumber: profile.account_number || data.accountnumber || data.accountNumber || "Unknown",
      address: profile.address || data.address || "",
      phoneNumber: profile.phone_number || data.phoneNumber || "",
      type: data.type,
      category: data.category,
      description: data.description,
      status: data.status,
      isUrgent: data.isurgent !== undefined ? (data.isurgent ? 1 : 0) : (data.isUrgent ? 1 : 0),
      evidenceImage: data.evidenceimage || data.evidenceImage || "",
      checklist: safeParseJson(data.checklist, []),
      messages: safeParseJson(data.messages, []),
      feedback: safeParseJson(data.feedback, null),
      createdAt: data.createdat || data.createdAt,
      updatedAt: data.updatedat || data.updatedAt
    };
  } catch (err) {
    console.error("getTicketById exception:", err.message);
    return null;
  }
};
const createTicket = async (ticketData) => {
  const dbPayload = {
    id: ticketData.id,
    consumerid: ticketData.consumerId,
    consumername: ticketData.consumerName,
    accountnumber: ticketData.accountNumber,
    type: ticketData.type,
    category: ticketData.category,
    description: ticketData.description,
    status: ticketData.status || "pending",
    isurgent: ticketData.isUrgent ? 1 : 0,
    evidenceimage: ticketData.evidenceImage || "",
    checklist: typeof ticketData.checklist === "string" ? ticketData.checklist : JSON.stringify(ticketData.checklist || null),
    messages: typeof ticketData.messages === "string" ? ticketData.messages : JSON.stringify(ticketData.messages || []),
    feedback: typeof ticketData.feedback === "string" ? ticketData.feedback : JSON.stringify(ticketData.feedback || null),
    createdat: ticketData.createdAt || (new Date()).toISOString(),
    updatedat: ticketData.updatedAt || (new Date()).toISOString()
  };

  const fullTicket = {
    ...dbPayload,
    consumerId: ticketData.consumerId,
    consumerName: ticketData.consumerName,
    accountNumber: ticketData.accountNumber,
    isUrgent: ticketData.isUrgent ? 1 : 0,
    evidenceImage: ticketData.evidenceImage || "",
    createdAt: dbPayload.createdat,
    updatedAt: dbPayload.updatedat,
    address: ticketData.address || "",
    phoneNumber: ticketData.phoneNumber || ""
  };

  if (!isSupabaseRestricted) {
    try {
      const { error } = await supabase.from("tickets").insert(dbPayload);
      if (error) {
        if (!markSupabaseRestricted(error)) {
          console.error("[Data-Sync] Supabase ticket insert error:", error.message);
        }
      } else {
        console.log(`[Data-Sync] Ticket ${ticketData.id} synced directly to Supabase.`);
      }
    } catch (e) {
      if (!markSupabaseRestricted(e)) {
        console.error("[Data-Sync] Supabase ticket insert exception:", e.message);
      }
    }
  }

  saveLocalTicket(fullTicket);
};
const updateTicket = async (id, updateData) => {
  const payload = {};
  if (updateData.status !== void 0) payload.status = updateData.status;
  if (updateData.messages !== void 0) {
    payload.messages = typeof updateData.messages === "string" ? updateData.messages : JSON.stringify(updateData.messages);
  }
  if (updateData.feedback !== void 0) {
    payload.feedback = typeof updateData.feedback === "string" ? updateData.feedback : JSON.stringify(updateData.feedback);
  }
  if (updateData.checklist !== void 0) {
    payload.checklist = typeof updateData.checklist === "string" ? updateData.checklist : JSON.stringify(updateData.checklist);
  }
  if (updateData.evidenceImage !== void 0) payload.evidenceimage = updateData.evidenceImage;
  if (updateData.category !== void 0) payload.category = updateData.category;
  if (updateData.description !== void 0) payload.description = updateData.description;
  if (updateData.type !== void 0) payload.type = updateData.type;
  if (updateData.isUrgent !== void 0) payload.isurgent = updateData.isUrgent ? 1 : 0;
  payload.updatedat = (new Date()).toISOString();

  if (!isSupabaseRestricted) {
    try {
      const { data: updatedRows, error } = await supabase.from("tickets").update(payload).eq("id", id).select("id");
      if (error) {
        if (!markSupabaseRestricted(error)) {
          console.error("[Data-Sync] Supabase ticket update error:", error.message);
        }
      } else if (updatedRows && updatedRows.length === 0) {
        const local = getLocalTickets().find((t) => t.id === id);
        if (local) {
          const toInsert = {
            id: local.id,
            consumerid: local.consumerId || local.user_id,
            consumername: local.consumerName,
            accountnumber: local.accountNumber,
            type: local.type,
            category: local.category,
            description: local.description,
            status: payload.status !== void 0 ? payload.status : local.status,
            isurgent: payload.isurgent !== void 0 ? payload.isurgent : (local.isUrgent ? 1 : 0),
            evidenceimage: payload.evidenceimage !== void 0 ? payload.evidenceimage : (local.evidenceImage || ""),
            checklist: typeof local.checklist === "string" ? local.checklist : JSON.stringify(local.checklist || null),
            messages: payload.messages !== void 0 ? payload.messages : (typeof local.messages === "string" ? local.messages : JSON.stringify(local.messages || [])),
            feedback: payload.feedback !== void 0 ? payload.feedback : (typeof local.feedback === "string" ? local.feedback : JSON.stringify(local.feedback || null)),
            createdat: local.createdAt || new Date().toISOString(),
            updatedat: payload.updatedat
          };
          await supabase.from("tickets").insert(toInsert).catch(() => {});
        }
      } else {
        console.log(`[Data-Sync] Successfully updated ticket ${id} in Supabase.`);
      }
    } catch (e) {
      if (!markSupabaseRestricted(e)) {
        console.error("[Data-Sync] Supabase ticket update exception:", e.message);
      }
    }
  }

  updateLocalTicket(id, {
    ...payload,
    isUrgent: payload.isurgent,
    evidenceImage: payload.evidenceimage,
    updatedAt: payload.updatedat
  });
};

const deleteTicket = async (id) => {
  if (!isSupabaseRestricted) {
    try {
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) {
        if (!markSupabaseRestricted(error)) {
          console.error("[Data-Sync] Supabase ticket delete error:", error.message);
        }
      } else {
        console.log(`[Data-Sync] Ticket ${id} deleted from Supabase.`);
      }
    } catch (e) {
      if (!markSupabaseRestricted(e)) {
        console.error("[Data-Sync] Supabase ticket delete exception:", e.message);
      }
    }
  }
  deleteLocalTicket(id);
};

const getSettingValue = async (key) => {
  try {
    const { data, error } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
    if (error) {
      return localSettings[key] || null;
    }
    return data?.value || localSettings[key] || null;
  } catch (e) {
    return localSettings[key] || null;
  }
};
const setSettingValue = async (key, value) => {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  try {
    const { error } = await supabase.from("settings").upsert({ key, value: serialized });
    if (error) {
      localSettings[key] = serialized;
    }
  } catch (e) {
    localSettings[key] = serialized;
  }
};
const saveSettingValue = setSettingValue;

const getAnnouncementImages = async () => {
  try {
    const raw = await getSettingValue("announcements_images");
    if (!raw) return {};
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    return {};
  }
};

const saveAnnouncementImages = async (imagesMap) => {
  try {
    await setSettingValue("announcements_images", JSON.stringify(imagesMap || {}));
  } catch (e) {
    console.warn("Failed to save announcements_images setting:", e.message);
  }
};

const countWords = (text) => {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const validateImagePayload = (imageStr) => {
  if (!imageStr || typeof imageStr !== "string") return true;
  const trimmed = imageStr.trim();
  if (!trimmed) return true;
  // Must be a data URL for png, jpg, or jpeg
  const regex = /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/;
  return regex.test(trimmed);
};

const getAuditLogs = async () => {
  try {
    const raw = await getSettingValue("system_audit_logs");
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        globalThis.localAuditLogs = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse system_audit_logs setting:", e.message);
  }
  return globalThis.localAuditLogs || [];
};

const recordAuditLog = async ({ action, entity, entityId, details, adminId, adminName, ipAddress }) => {
  try {
    const entry = {
      id: "LOG-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      timestamp: new Date().toISOString(),
      action: (action || "ACTION").toUpperCase(),
      entity: entity || "System",
      entityId: entityId || "-",
      details: details || "",
      adminId: adminId || "system",
      adminName: adminName || "Administrator",
      ipAddress: ipAddress || "127.0.0.1"
    };
    const logs = await getAuditLogs();
    logs.unshift(entry);
    if (logs.length > 500) logs.pop();
    globalThis.localAuditLogs = logs;
    await setSettingValue("system_audit_logs", JSON.stringify(logs));
    return entry;
  } catch (err) {
    console.warn("Failed to record audit log:", err.message);
    return null;
  }
};

const getAnnouncementsList = async () => {
  try {
    const { data, error } = await supabase.from("announcements").select("*").order("createdat", { ascending: false });
    let list = [];
    if (!error && data) {
      list = data;
      globalThis.localAnnouncements = data;
    } else {
      list = globalThis.localAnnouncements || [];
    }
    const unique = [];
    const seen = new Set();
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    try {
      const imagesMap = await getAnnouncementImages();
      for (const item of unique) {
        if (imagesMap && imagesMap[item.id]) {
          item.image = imagesMap[item.id];
        } else if (!item.image) {
          item.image = null;
        }
      }
    } catch (e) {
      console.warn("Error attaching announcement images:", e.message);
    }
    try {
      const orderSetting = await getSettingValue("announcements_order");
      if (orderSetting) {
        const orderIds = typeof orderSetting === "string" ? JSON.parse(orderSetting) : orderSetting;
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          unique.sort((a, b) => {
            const idxA = orderIds.indexOf(a.id);
            const idxB = orderIds.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });
        }
      }
    } catch (e) {
      console.warn("Error parsing announcements order:", e.message);
    }
    return unique;
  } catch (e) {
    return globalThis.localAnnouncements || [];
  }
};
const createAnnouncement = async (annData) => {
  try {
    const { error } = await supabase.from("announcements").insert({
      id: annData.id,
      title: annData.title,
      content: annData.content
    });
    if (error) {
      console.log("[Data-Sync] Announcement stored successfully via local storage fallback.");
      globalThis.localAnnouncements.push({
        id: annData.id,
        title: annData.title,
        content: annData.content,
        image: annData.image || null,
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) {
    globalThis.localAnnouncements.push({
      id: annData.id,
      title: annData.title,
      content: annData.content,
      image: annData.image || null,
      createdAt: new Date().toISOString()
    });
  }

  if (annData.image) {
    try {
      const imagesMap = await getAnnouncementImages();
      imagesMap[annData.id] = annData.image;
      await saveAnnouncementImages(imagesMap);
    } catch (err) {
      console.warn("Failed to store announcement image:", err.message);
    }
  }
};
const updateAnnouncement = async (id, annData) => {
  try {
    await supabase.from("announcements").update({
      title: annData.title,
      content: annData.content
    }).eq("id", id);
  } catch (e) {
    console.warn("Supabase update announcement failed:", e.message);
  }
  const local = (globalThis.localAnnouncements || []).find((a) => a.id === id);
  if (local) {
    local.title = annData.title;
    local.content = annData.content;
    if (annData.image !== undefined) local.image = annData.image;
  } else {
    (globalThis.localAnnouncements = globalThis.localAnnouncements || []).push({
      id,
      title: annData.title,
      content: annData.content,
      image: annData.image || null,
      createdAt: new Date().toISOString()
    });
  }

  if (annData.image !== undefined) {
    try {
      const imagesMap = await getAnnouncementImages();
      if (annData.image) {
        imagesMap[id] = annData.image;
      } else {
        delete imagesMap[id];
      }
      await saveAnnouncementImages(imagesMap);
    } catch (err) {
      console.warn("Failed to update announcement image in settings:", err.message);
    }
  }
};
const deleteAnnouncement = async (id) => {
  try {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      console.log("[Data-Sync] Announcement removed successfully.");
    }
  } catch (e) {
  }
  globalThis.localAnnouncements = (globalThis.localAnnouncements || []).filter((ann) => ann.id !== id);
  try {
    const imagesMap = await getAnnouncementImages();
    if (imagesMap[id]) {
      delete imagesMap[id];
      await saveAnnouncementImages(imagesMap);
    }
  } catch (e) {}
};
const createInquiry = async (inquiryData) => {
  const record = {
    id: inquiryData.id,
    fullname: inquiryData.fullName || inquiryData.fullname || "",
    email: inquiryData.email,
    phone: inquiryData.phone || "",
    subject: inquiryData.subject,
    message: inquiryData.message,
    createdat: inquiryData.createdAt || (new Date()).toISOString()
  };
  try {
    const { error } = await supabase.from("inquiries").insert(record);
    if (!error) {
      console.log(`[Data-Sync] Inquiry ${inquiryData.id} synced directly to Supabase.`);
    } else {
      console.warn("[Data-Sync] Inquiry insert error in Supabase:", error.message);
    }
  } catch (e) {
    console.warn("[Data-Sync] Inquiry insert exception:", e.message);
  }
  globalThis.localInquiries = globalThis.localInquiries || [];
  globalThis.localInquiries.push({
    ...record,
    fullName: record.fullname,
    createdAt: record.createdat
  });
};
const INQUIRY_MESSAGES_FILE = path.join(process.cwd(), "inquiry_messages_store.json");

const getInquiryMessagesMap = () => {
  try {
    if (fs.existsSync(INQUIRY_MESSAGES_FILE)) {
      const content = fs.readFileSync(INQUIRY_MESSAGES_FILE, "utf-8");
      return JSON.parse(content) || {};
    }
  } catch (e) {
    console.error("Failed to read inquiry messages file:", e);
  }
  return {};
};

const saveInquiryMessagesMap = (map) => {
  try {
    fs.writeFileSync(INQUIRY_MESSAGES_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write inquiry messages file:", e);
  }
};

const getInquiriesList = async () => {
  try {
    const { data, error } = await supabase.from("inquiries").select("*").order("createdat", { ascending: false });
    let list = [];
    if (!error && data) {
      list = data;
      globalThis.localInquiries = data;
    } else {
      list = globalThis.localInquiries || [];
    }
    
    const seen = new Set();
    const unique = [];
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    
    const messagesMap = getInquiryMessagesMap();
    
    return unique.map((d) => {
      let parsedMessages = messagesMap[d.id] || [];
      return {
        ...d,
        fullName: d.fullname || d.fullName || d.fullName_fallback || "",
        createdAt: d.createdat || d.createdAt || "",
        messages: parsedMessages
      };
    });
  } catch (e) {
    const merged = [...(globalThis.localInquiries || [])];
    const messagesMap = getInquiryMessagesMap();
    return merged.map((d) => {
      let parsedMessages = messagesMap[d.id] || [];
      return {
        ...d,
        fullName: d.fullname || d.fullName || d.fullName_fallback || "",
        createdAt: d.createdat || d.createdAt || "",
        messages: parsedMessages
      };
    });
  }
};
async function startServer() {
  await seedDatabases();
  await syncTicketsWithSupabase();
  const app = express();
  app.set("trust proxy", 1);
  
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV || !process.env.RENDER;

  // Security headers via Helmet with strict CSP directives, HSTS, and frameguard
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          scriptSrc: isDev
            ? ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://accounts.google.com"]
            : ["'self'", "https://apis.google.com", "https://accounts.google.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://*.supabase.co",
            "https://*.googleusercontent.com",
            "https://lh3.googleusercontent.com"
          ],
          connectSrc: isDev
            ? [
                "'self'",
                "https://*.supabase.co",
                "wss://*.supabase.co",
                "https://api.brevo.com",
                "https://accounts.google.com",
                "ws://localhost:3000",
                "ws://127.0.0.1:3000",
                "wss://*.run.app",
                "https://*.run.app"
              ]
            : [
                "'self'",
                "https://*.supabase.co",
                "wss://*.supabase.co",
                "https://api.brevo.com",
                "https://accounts.google.com"
              ],
          frameSrc: ["'self'", "https://accounts.google.com", "https://*.google.com"],
          frameAncestors: isDev
            ? ["'self'", "https://aistudio.google.com", "https://*.google.com", "https://*.google.dev", "https://*.run.app"]
            : ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: isDev ? false : { action: "deny" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    })
  );

  // Guarantee X-Content-Type-Options is set on all routes and static file requests
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  // Strict CORS configuration with exact origin matching only
  const allowedOrigins = [
    "https://soreco-1.onrender.com",
    "https://soreco-1-pygn.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ais-dev-2w2ij6ync322aereo2xhup-705588850561.asia-east1.run.app",
    "https://ais-pre-2w2ij6ync322aereo2xhup-705588850561.asia-east1.run.app"
  ];
  if (process.env.APP_URL && !allowedOrigins.includes(process.env.APP_URL)) {
    allowedOrigins.push(process.env.APP_URL);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: "50mb" }));

  // URL SQL Injection Detection & Neutralization Middleware (OWASP A03:2021)
  const SQLI_PATTERNS = [
    /('|"|%27|%22)\s*(or|and|%6f%72|%61%6e%64)\s*('?[\w]+'?|\d+)\s*(=|%3d)\s*('?[\w]+'?|\d+)/i,
    /\b(or|and)\b\s+('?[0-9a-zA-Z]+'?|\d+)\s*=\s*('?[0-9a-zA-Z]+'?|\d+)/i,
    /\b(or|and)\b\s+true\b/i,
    /('|"|%27|%22)\s*(or|and)\s+('|"|%27|%22)/i,
    /('|"|%27|%22)\s*(--|#|\/\*)/i,
    /(--|%2d%2d)\s*$/i,
    /;\s*(--|#|\/\*)/i,
    /\bunion\b\s+(all\s+)?\bselect\b/i,
    /\bselect\b[\s\S]+?\bfrom\b/i,
    /;\s*(drop|truncate|alter|delete|update|insert|exec|execute|shutdown|create)\b/i,
    /\b(benchmark|sleep|pg_sleep|waitfor\s+delay)\s*\(/i,
    /\b(load_file|into\s+outfile|into\s+dumpfile)\b/i,
    /\b(information_schema|sys\.tables|pg_stat_activity|sysobjects)\b/i,
    /0x[0-9a-fA-F]{4,}/i,
    /\bchar\s*\(\s*\d+/i,
    /\b(concat|concat_ws)\s*\(/i,
    /\bxp_cmdshell\b/i
  ];

  function containsSqlInjection(str) {
    if (!str || typeof str !== "string") return false;
    let decoded = str;
    for (let i = 0; i < 3; i++) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        break;
      }
    }
    const targets = [str, decoded, decoded.replace(/\+/g, " "), decoded.replace(/%20/g, " ")];
    for (const t of targets) {
      for (const pattern of SQLI_PATTERNS) {
        if (pattern.test(t)) return true;
      }
    }
    return false;
  }

  app.use((req, res, next) => {
    const rawUrl = req.originalUrl || req.url || "";
    if (containsSqlInjection(rawUrl)) {
      console.warn(`[SECURITY ALERT] SQL Injection attempt detected in URL from ${req.ip || "unknown"}: ${rawUrl}`);
      if (req.path.startsWith("/api/")) {
        return res.status(400).json({
          error: "Malicious SQL injection signature detected in request URL.",
          code: "SQLI_DETECTED"
        });
      }
      return res.redirect("/?sqli_alert=1");
    }
    next();
  });

  // API Health & Diagnostics - Moved to top to ensure priority matching
  app.get("/api/backend-status", async (req, res) => {
    console.log("[Diagnostics] Backend status requested");
    let supabaseStatus = "configured";
    let missingTables = [];
    const tablesToCheck = ["profiles", "tickets", "announcements", "settings", "inquiries"];
    try {
      await Promise.all(
        tablesToCheck.map(async (table) => {
          try {
            const queryPromise = supabase.from(table).select("*").limit(1);
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 1500));
            const result = await Promise.race([queryPromise, timeoutPromise]);
            if (result && !result.timeout && result.error) {
              if (result.error.code !== "PGRST116" && (result.error.message?.includes("Could not find the table") || result.error.code === "42P01")) {
                missingTables.push(table);
              }
            }
          } catch (err) {
            missingTables.push(table);
          }
        })
      );
    } catch (e) {
      console.error("[Diagnostics] Table check failed:", e.message);
    }

    if (missingTables.length > 0) {
      supabaseStatus = "missing_tables";
    } else {
      supabaseStatus = "fully_connected";
    }
    
    const realProjectId = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, "").split(".")[0] : "";
    res.json({
      supabase: {
        status: supabaseStatus,
        url: supabaseUrl,
        projectId: realProjectId,
        missingTables
      },
      postgres: {
        active: true
      }
    });
  });

  const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required: No bearer token provided." });
    }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        return res.status(401).json({ error: "Invalid or expired session token. Please log in again." });
      }

      const email = authUser.email ? authUser.email.trim().toLowerCase() : "";
      const isAdminEmail = email === "janry.maligaso@sorsu.edu.ph" || email === "admin@gov.ph" || email === "admin01@gmail.com";

      let profile = null;

      // 1. Try finding by authUser.id in profiles table
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
        if (!error && data) {
          profile = data;
        }
      } catch (e) {
        console.warn("Error finding profile by id:", e.message);
      }

      // 2. Try users table by id
      if (!profile) {
        try {
          const { data: uDataById } = await supabase.from("users").select("*").eq("id", authUser.id).maybeSingle();
          if (uDataById) {
            profile = {
              id: uDataById.id,
              full_name: uDataById.fullName || uDataById.full_name,
              role: uDataById.role,
              account_number: uDataById.accountNumber || uDataById.account_number,
              phone_number: uDataById.phoneNumber || uDataById.phone_number,
              address: uDataById.address,
              profile_image: uDataById.profileImage || uDataById.profile_image
            };
          }
        } catch (e) {
          console.warn("Error querying users table by id:", e.message);
        }
      }

      // 3. If still not found, try users table by email
      if (!profile && email) {
        try {
          const { data: uDataByEmail } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
          if (uDataByEmail) {
            profile = {
              id: uDataByEmail.id,
              full_name: uDataByEmail.fullName || uDataByEmail.full_name,
              role: uDataByEmail.role,
              account_number: uDataByEmail.accountNumber || uDataByEmail.account_number,
              phone_number: uDataByEmail.phoneNumber || uDataByEmail.phone_number,
              address: uDataByEmail.address,
              profile_image: uDataByEmail.profileImage || uDataByEmail.profile_image
            };
          }
        } catch (e) {
          console.warn("Error querying users table by email:", e.message);
        }
      }

      // 4. Resolve metadata values from Google OAuth or Auth metadata
      const metaFullName = authUser.user_metadata?.fullName || authUser.user_metadata?.full_name || authUser.user_metadata?.name;
      const metaAvatar = authUser.user_metadata?.profileImage || authUser.user_metadata?.profile_image || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
      const metaPhone = authUser.user_metadata?.phoneNumber || authUser.user_metadata?.phone_number;
      const metaAcc = authUser.user_metadata?.accountNumber || authUser.user_metadata?.account_number;
      const metaBarangay = authUser.user_metadata?.barangay || authUser.user_metadata?.address;

      const isGoogleUser = authUser.app_metadata?.provider === "google" ||
        (Array.isArray(authUser.app_metadata?.providers) && authUser.app_metadata?.providers.includes("google")) ||
        (Array.isArray(authUser.identities) && authUser.identities.some(i => i.provider === "google")) ||
        authUser.user_metadata?.iss?.includes("google") ||
        authUser.user_metadata?.avatar_url?.includes("googleusercontent.com") ||
        authUser.user_metadata?.picture?.includes("googleusercontent.com");

      const assignedRole = isAdminEmail ? "admin" : (profile?.role || authUser.user_metadata?.role || "consumer");
      const assignedFullName = isAdminEmail
        ? (profile?.full_name || metaFullName || "System Admin")
        : (profile?.full_name || metaFullName || (email ? email.split("@")[0] : "Consumer"));

      const assignedPhoneNumber = profile?.phone_number || metaPhone || "";
      const assignedAddress = profile?.address || metaBarangay || "";
      const assignedProfileImage = profile?.profile_image || metaAvatar || "";

      // Permanent Utility Account Number Resolution:
      // Never overwrite entered numbers with synthetic or placeholder 12345678.
      let assignedAccountNumber = "";
      if (isAdminEmail) {
        assignedAccountNumber = email === "admin@gov.ph" || email === "admin01@gmail.com" ? "ADMIN-001" : "ADMIN-002";
      } else {
        const rawProfileAcc = (profile?.account_number || profile?.accountNumber || "").toString().trim();
        const rawMetaAcc = (metaAcc || "").toString().trim();

        if (rawProfileAcc && rawProfileAcc !== "12345678" && rawProfileAcc !== "PENDING" && rawProfileAcc !== "N/A") {
          assignedAccountNumber = rawProfileAcc;
        } else if (rawMetaAcc && rawMetaAcc !== "12345678" && rawMetaAcc !== "PENDING" && rawMetaAcc !== "N/A") {
          assignedAccountNumber = rawMetaAcc;
        } else if (rawProfileAcc && rawProfileAcc !== "12345678") {
          assignedAccountNumber = rawProfileAcc;
        } else if (rawMetaAcc && rawMetaAcc !== "12345678") {
          assignedAccountNumber = rawMetaAcc;
        } else {
          assignedAccountNumber = "";
        }
      }

      // Check onboarding state for member-consumer
      const hasRealAccount = !!assignedAccountNumber && assignedAccountNumber !== "12345678" && assignedAccountNumber !== "PENDING";
      const hasRealName = !!assignedFullName && assignedFullName !== "Consumer" && assignedFullName !== "User" && !assignedFullName.includes("@");
      const onboardingCompleted = assignedRole === "admin" || (
        hasRealAccount && !!assignedPhoneNumber && !!assignedAddress && hasRealName
      );

      const needsOnboarding = assignedRole !== "admin" && !onboardingCompleted;

      const currentHasUnpaidBill = Boolean(authUser.user_metadata?.hasUnpaidBill ?? authUser.user_metadata?.has_unpaid_bill ?? false);

      // Ensure user row in Supabase is always kept in sync (valid columns only)
      try {
        await supabase.from("users").upsert({
          id: authUser.id,
          fullname: assignedFullName,
          email: email,
          accountnumber: assignedAccountNumber,
          role: assignedRole,
          phonenumber: assignedPhoneNumber,
          address: assignedAddress,
          profileimage: assignedProfileImage
        });
      } catch (upsertErr2) {
        console.warn("Auto-sync user upsert error:", upsertErr2.message);
      }

      // Ensure profile row in Supabase is always kept in sync (valid columns only)
      try {
        await supabase.from("profiles").upsert({
          id: authUser.id,
          full_name: assignedFullName,
          account_number: assignedAccountNumber,
          role: assignedRole,
          phone_number: assignedPhoneNumber,
          address: assignedAddress,
          profile_image: assignedProfileImage
        });
      } catch (upsertErr) {
        console.warn("Auto-sync profile upsert error:", upsertErr.message);
      }

      if (assignedRole !== "admin" && !isAdminEmail && isDisposableEmail(email)) {
        console.warn(`[API Access Denied - Disposable Email] Account ${email} is registered with a disposable/temporary email. Rejecting authorization.`);
        return res.status(403).json({
          error: "Access Denied: Accounts registered with disposable or temporary email addresses (such as @vtmpj.com) cannot be verified and are not authorized.",
          disposableEmail: true
        });
      }

      // Name with numbers restriction removed to allow seamless logins for all users

      req.user = {
        id: authUser.id,
        email: email,
        role: assignedRole,
        fullName: assignedFullName,
        accountNumber: assignedAccountNumber,
        phoneNumber: assignedPhoneNumber,
        address: assignedAddress,
        barangay: assignedAddress,
        profileImage: assignedProfileImage,
        hasUnpaidBill: currentHasUnpaidBill,
        hasProfile: true,
        isGoogleUser: !!isGoogleUser,
        needsOnboarding: !!needsOnboarding,
        onboardingCompleted: !!onboardingCompleted,
        emailConfirmed: !!authUser.email_confirmed_at || !!authUser.confirmed_at || !!authUser.app_metadata?.provider
      };
      next();
    } catch (err) {
      console.error("Auth middleware error:", err.message);
      return res.status(401).json({ error: "Authentication failed" });
    }
  };
  app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json(req.user);
  });
  app.post("/api/auth/complete-onboarding", authenticateToken, async (req, res) => {
    const { firstName, middleName, lastName, fullName, phoneNumber, barangay, address, accountNumber, hasUnpaidBill } = req.body;
    
    // Resolve name from parts or fallback to provided fullName or req.user.fullName
    const resolvedFirst = firstName || "";
    const resolvedLast = lastName || "";
    const resolvedMiddle = middleName || "";
    const resolvedFullName = fullName || [resolvedFirst, resolvedMiddle, resolvedLast].filter(Boolean).join(" ") || req.user.fullName;

    const cleanPhone = (phoneNumber || "").trim();
    const cleanBarangay = (barangay || address || "").trim();
    const cleanAccount = (accountNumber || "").trim();
    const cleanHasUnpaid = Boolean(hasUnpaidBill);

    if (!cleanPhone || !cleanBarangay || !cleanAccount) {
      return res.status(400).json({ error: "Mobile number, barangay, and utility account number are required." });
    }

    // Strict validation
    const firstVal = validateName(resolvedFirst || resolvedFullName.split(" ")[0]);
    if (!firstVal.isValid) return res.status(400).json({ error: `First Name: ${firstVal.error}` });
    
    const lastVal = validateName(resolvedLast || resolvedFullName.split(" ").pop());
    if (!lastVal.isValid) return res.status(400).json({ error: `Last Name: ${lastVal.error}` });

    const phoneVal = validatePhoneNumber(cleanPhone);
    if (!phoneVal.isValid) return res.status(400).json({ error: `Mobile Number: ${phoneVal.error}` });

    if (cleanAccount.length < 5) {
      return res.status(400).json({ error: "Please enter a valid utility account number (found on your electric bill)." });
    }

    try {
      // 1. Supabase Auth admin metadata update
      try {
        await supabase.auth.admin.updateUserById(req.user.id, {
          user_metadata: {
            fullName: resolvedFullName,
            firstName: resolvedFirst,
            middleName: resolvedMiddle,
            lastName: resolvedLast,
            phoneNumber: cleanPhone,
            address: cleanBarangay,
            barangay: cleanBarangay,
            accountNumber: cleanAccount,
            hasUnpaidBill: cleanHasUnpaid,
            onboarding_completed: true
          }
        });
      } catch (authErr) {
        console.warn("Complete onboarding auth update notice:", authErr.message);
      }

      // 2. Users table update (valid columns only: id, fullName, email, accountNumber, phoneNumber, address, role, profileImage) first
      try {
        const { error: uErr } = await supabase.from("users").upsert({
          id: req.user.id,
          fullname: resolvedFullName || req.user.fullName,
          email: req.user.email,
          accountnumber: cleanAccount,
          phonenumber: cleanPhone,
          address: cleanBarangay,
          role: req.user.role || "consumer",
          profileimage: req.user.profileImage || ""
        });
        if (uErr) console.error("Complete onboarding user update error:", uErr.message);
      } catch (userErr) {
        console.warn("Complete onboarding user update notice:", userErr.message);
      }

      // 3. Clean up any stale duplicate users with same email but different ID in users table
      if (req.user.email) {
        try {
          await supabase.from("users").delete().eq("email", req.user.email).neq("id", req.user.id);
        } catch (delErr) {
          console.warn("Error cleaning stale duplicate user row:", delErr.message);
        }
      }

      // 4. Profiles table update
      try {
        const { error: pErr } = await supabase.from("profiles").upsert({
          id: req.user.id,
          full_name: resolvedFullName,
          account_number: cleanAccount,
          phone_number: cleanPhone,
          address: cleanBarangay,
          role: req.user.role || "consumer",
          profile_image: req.user.profileImage || ""
        });
        if (pErr) console.error("Complete onboarding profile update error:", pErr.message);
      } catch (profErr) {
        console.warn("Complete onboarding profile update notice:", profErr.message);
      }

      const updatedUser = {
        ...req.user,
        fullName: resolvedFullName,
        accountNumber: cleanAccount,
        phoneNumber: cleanPhone,
        address: cleanBarangay,
        barangay: cleanBarangay,
        hasUnpaidBill: cleanHasUnpaid,
        needsOnboarding: false,
        onboardingCompleted: true
      };

      res.json({
        success: true,
        message: "Consumer account successfully activated with utility details.",
        user: updatedUser
      });
    } catch (e) {
      console.error("Complete onboarding error:", e);
      res.status(500).json({ error: "Failed to complete consumer profile onboarding." });
    }
  });
  app.patch("/api/auth/profile", authenticateToken, async (req, res) => {
    const { fullName, phoneNumber, address, profileImage, accountNumber, hasUnpaidBill } = req.body;
    try {
      if (fullName !== undefined && req.user.role !== "admin") {
        if (/\d/.test(fullName)) {
          return res.status(400).json({ error: "Numbers are not permitted in names. You must provide your complete legal name only." });
        }
        if (fullName.trim().length < 3) {
          return res.status(400).json({ error: "Please enter your complete legal name." });
        }
      }

      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      await updateUserProfile(req.user.id, { fullName, phoneNumber, address, profileImage, accountNumber, hasUnpaidBill }, token);
      
      const cleanHasUnpaid = hasUnpaidBill !== undefined ? Boolean(hasUnpaidBill) : Boolean(req.user.hasUnpaidBill);
      const updatedUser = {
        ...req.user,
        fullName: fullName || req.user.fullName,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : req.user.phoneNumber,
        address: address !== undefined ? address : req.user.address,
        barangay: address !== undefined ? address : req.user.barangay,
        profileImage: profileImage !== undefined ? profileImage : req.user.profileImage,
        accountNumber: accountNumber ? accountNumber.trim() : req.user.accountNumber,
        hasUnpaidBill: cleanHasUnpaid
      };

      res.json({ success: true, user: updatedUser });
    } catch (e) {
      console.error("Profile update error:", e);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  app.get("/api/auth/check-account-number", async (req, res) => {
    const { accountNumber, excludeUserId } = req.query;
    if (!accountNumber) return res.json({ exists: false });

    try {
      const users = await getAllUsers();
      const exists = users.some(u => 
        u.accountNumber === accountNumber && 
        u.id !== excludeUserId && 
        u.accountNumber !== "PENDING"
      );
      res.json({ exists });
    } catch (e) {
      console.error("Check account number failed:", e);
      res.status(500).json({ error: "Failed to verify account number" });
    }
  });

  app.get("/api/admin/backup-status", authenticateToken, async (req, res) => {
    if (req.user?.role !== "admin" && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      let primaryConnected = false;
      let replicaConnected = false;
      try {
        const { error } = await supabase.from("users").select("id").limit(1);
        primaryConnected = !error;
      } catch (e) {
        primaryConnected = false;
      }
      try {
        const { error } = await supabaseBackup.from("users").select("id").limit(1);
        replicaConnected = !error;
      } catch (e) {
        replicaConnected = false;
      }
      res.json({
        success: true,
        primaryDatabaseUrl: supabaseUrl,
        standbyReplicaUrl: backupSupabaseUrl,
        primaryConnected,
        replicaConnected,
        backupFrequency: "Hourly (every 3600 seconds)",
        lastSyncTimestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to retrieve backup status" });
    }
  });

  app.post("/api/admin/trigger-backup", authenticateToken, async (req, res) => {
    if (req.user?.role !== "admin" && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      await runHourlyBackupSync();
      res.json({ success: true, message: "Manual backup synchronization triggered successfully." });
    } catch (e) {
      res.status(500).json({ error: "Failed to trigger backup synchronization" });
    }
  });

  app.post("/api/admin/resync-database", authenticateToken, async (req, res) => {
    if (req.user?.role !== "admin" && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      isSupabaseRestricted = false;
      await syncTicketsWithSupabase();
      await seedDatabases();
      
      const tablesToCheck = ["profiles", "tickets", "announcements", "settings", "inquiries"];
      const missingTables = [];
      for (const t of tablesToCheck) {
        try {
          const { error } = await supabase.from(t).select("*").limit(1);
          if (error && (error.message?.includes("Could not find the table") || error.code === "42P01")) {
            missingTables.push(t);
          }
        } catch {
          missingTables.push(t);
        }
      }

      res.json({
        success: true,
        message: "Database resynchronization completed successfully.",
        missingTables,
        allTablesSynced: missingTables.length === 0,
        ticketsCount: getLocalTickets().length,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({ error: "Resynchronization failed: " + e.message });
    }
  });


  app.get("/api/auth/lockout-status", (req, res) => {
    const email = (req.query.email || "").toString().trim().toLowerCase();
    const clientIp = getClientIp(req);
    const key = email ? `${email}_${clientIp}` : `ip_${clientIp}`;
    const record = globalThis.loginAttempts.get(key);
    const now = Date.now();
    if (record && record.lockedUntil && now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return res.json({ locked: true, remainingSeconds, attemptsLeft: 0 });
    }
    const count = record ? (record.count || 0) : 0;
    res.json({
      locked: false,
      remainingSeconds: 0,
      attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - count)
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const clientIp = getClientIp(req);
    const attemptKey = `${cleanEmail}_${clientIp}`;
    const now = Date.now();
    const record = globalThis.loginAttempts.get(attemptKey) || { count: 0, lockedUntil: null };

    // Check if user is currently locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return res.status(429).json({
        error: `Too many failed login attempts (10 in a row). Please wait ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'} before trying again.`,
        locked: true,
        remainingSeconds,
        attemptsLeft: 0
      });
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
      // Cooldown expired: reset counter
      record.count = 0;
      record.lockedUntil = null;
      globalThis.loginAttempts.set(attemptKey, record);
    }

    const recordFailedAttempt = (customMessage) => {
      record.count = (record.count || 0) + 1;
      if (record.count >= MAX_LOGIN_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        globalThis.loginAttempts.set(attemptKey, record);
        return {
          status: 429,
          data: {
            error: "Too many failed login attempts (10 in a row). Your account access is locked for 60 seconds. Please wait before trying again.",
            locked: true,
            remainingSeconds: 60,
            attemptsLeft: 0
          }
        };
      }
      globalThis.loginAttempts.set(attemptKey, record);
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - record.count;
      return {
        status: 400,
        data: {
          error: customMessage || "Invalid login credentials. Please check your email and password.",
          locked: false,
          remainingSeconds: 0,
          attemptsLeft
        }
      };
    };

    if (isDisposableEmail(cleanEmail)) {
      console.warn(`[Login Blocked - Disposable Email] ${cleanEmail}`);
      return res.status(403).json({
        error: "Access Denied: Accounts registered with disposable or temporary email addresses (such as @vtmpj.com) cannot be verified and are not authorized. Please register using a valid permanent email address.",
        disposableEmail: true
      });
    }
    try {
      const authResult = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (authResult.error) {
        console.warn(`[Login Failed] ${cleanEmail}: ${authResult.error.message}`);
        const failedResp = recordFailedAttempt(authResult.error.message);
        return res.status(failedResp.status).json(failedResp.data);
      }

      const data = authResult.data;

      // Verify whether the account uses numbers in their name.
      // SORECO-1 policy: Complete legal names only. Accounts with numbers in their names are unauthorized to log in.
      let resolvedName = data.user?.user_metadata?.fullName || data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || "";
      let userRole = data.user?.user_metadata?.role || "consumer";

      try {
        const { data: prof } = await supabase.from("profiles").select("full_name, role").eq("id", data.user.id).maybeSingle();
        if (prof?.full_name) resolvedName = prof.full_name;
        if (prof?.role) userRole = prof.role;
        if (!resolvedName) {
          const { data: uRec } = await supabase.from("users").select("*").eq("id", data.user.id).maybeSingle();
          if (uRec?.fullname || uRec?.fullName) resolvedName = uRec.fullname || uRec.fullName;
          if (uRec?.role) userRole = uRec.role;
        }
      } catch (checkErr) {
        console.warn("Error fetching name during login authorization check:", checkErr.message);
      }

      const isAdminUser = cleanEmail === "admin01@gmail.com" || cleanEmail === "janry.maligaso@sorsu.edu.ph" || cleanEmail === "admin@gov.ph" || String(userRole).toLowerCase() === "admin";
      const finalRole = isAdminUser ? "admin" : (userRole || "consumer");

      // Login name restriction removed

      // Successful login: reset failed attempts
      globalThis.loginAttempts.delete(attemptKey);
      console.log(`[Login Success] ${cleanEmail} authenticated successfully as ${finalRole}.`);
      res.json({
        session: data.session,
        user: {
          ...data.user,
          role: finalRole,
          isAdmin: finalRole === "admin",
          user_metadata: {
            ...data.user.user_metadata,
            role: finalRole
          }
        }
      });
    } catch (e) {
      console.error("Login endpoint error:", e);
      res.status(500).json({ error: e.message || "Failed to log in" });
    }
  });

  const sendBrevoVerificationEmail = async ({ email, fullName, accountNumber, barangay, verificationLink, origin }) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.log("[Email Service] Note: BREVO_API_KEY not configured. Verification email queued locally. Details:", { email, fullName, accountNumber, barangay, verificationLink });
      return { success: false, reason: "BREVO_API_KEY not set" };
    }
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "janry.maligaso@sorsu.edu.ph";
    const senderName = process.env.BREVO_SENDER_NAME || "SORECO-1 Consumer Portal";
    const effectiveLink = verificationLink || `${origin || 'http://localhost:3000'}/login?confirmed=true`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ea580c; margin: 0; font-size: 24px; font-weight: 800;">SORECO-1 Electric Cooperative</h1>
          <p style="color: #78716c; font-size: 13px; margin-top: 4px;">Sorsogon I Electric Cooperative, Inc. • Official Consumer Portal</p>
        </div>
        <div style="background-color: #fff7ed; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #ea580c;">
          <h2 style="color: #9a3412; margin: 0 0 10px 0; font-size: 17px;">Welcome, ${fullName}!</h2>
          <p style="color: #431407; font-size: 14px; margin: 0; line-height: 1.6;">
            Your member-consumer registration has been received. Please verify your email address to activate your digital portal access and submit online service requests.
          </p>
        </div>
        <table style="width: 100%; margin-bottom: 24px; font-size: 14px; border-collapse: collapse; background: #fafaf9; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 10px 14px; color: #78716c; border-bottom: 1px solid #f5f5f4;">Full Name:</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #1c1917; border-bottom: 1px solid #f5f5f4;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #78716c; border-bottom: 1px solid #f5f5f4;">Utility Account Number:</td>
            <td style="padding: 10px 14px; font-family: monospace; font-weight: bold; color: #ea580c; border-bottom: 1px solid #f5f5f4;">${accountNumber || "N/A"}</td>
          </tr>
          ${barangay ? `<tr>
            <td style="padding: 10px 14px; color: #78716c;">Barangay Jurisdiction:</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #1c1917;">${barangay}</td>
          </tr>` : ""}
        </table>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${effectiveLink}" style="background-color: #ea580c; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
            Verify Account & Login
          </a>
        </div>
        <p style="color: #a8a29e; font-size: 12px; text-align: center; margin-top: 24px; border-top: 1px solid #f5f5f4; padding-top: 16px;">
          If you did not create a SORECO-1 account, please disregard this email.
        </p>
      </div>
    `;
    try {
      console.log(`[Email Service] Attempting verification email to: ${email} (Name: ${fullName})`);
      
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email, name: fullName }],
          subject: "Verify Your SORECO-1 Consumer Account",
          htmlContent
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        console.error(`[Email Service] Brevo API Error for verification email:`, errData);
        return { success: false, error: errData };
      }
      
      const data = await response.json();
      console.log(`[Email Service] Successfully sent verification email to ${email}. MessageID: ${data.messageId || 'N/A'}`);
      return { success: true, data };
    } catch (e) {
      console.error("[Email Service] Exception sending verification email:", e.message);
      return { success: false, error: e.message };
    }
  };

  // Helper to send Tracker Status Notifications to users via Brevo (with zero branding hints)
  const sendTrackerStatusNotificationEmail = async ({
    toEmail,
    toName,
    ticket,
    newStatus,
    previousStatus,
    customMessage,
    origin
  }) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.log("[Email Service] Note: BREVO_API_KEY not configured. Tracker notification skipped for:", { toEmail, newStatus, ticketId: ticket?.id });
      return { success: false, reason: "BREVO_API_KEY not set" };
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || "janry.maligaso@sorsu.edu.ph";
    const senderName = process.env.BREVO_SENDER_NAME || "SORECO-1 Consumer Services";
    
    // Ensure effective origin is publicly reachable if possible
    const effectiveOrigin = (origin && !origin.includes("localhost"))
      ? origin
      : (process.env.APP_URL || origin || "http://localhost:3000");
    const trackerLink = `${effectiveOrigin}/ticket/${ticket.id}`;

    let statusBadgeColor = "#2563eb";
    let statusBgColor = "#eff6ff";
    let statusBorderColor = "#bfdbfe";
    let statusDisplay = "Under Technical Review";
    let statusSubjectPrefix = "[UNDER REVIEW]";
    let statusTitle = "Your Request is Under Technical Assessment";
    let statusDescription = customMessage || "Your service request has been received by our technical engineering personnel and is actively under technical evaluation.";
    let ctaButtonText = "View Service Request";
    let isActionRequired = false;

    const normalizedStatus = (newStatus || "").toLowerCase();

    if (
      normalizedStatus.includes("clearer") ||
      normalizedStatus.includes("picture") ||
      normalizedStatus === "clearer_picture" ||
      normalizedStatus === "asking for a clearer picture" ||
      normalizedStatus === "request_clearer_picture"
    ) {
      statusBadgeColor = "#ea580c";
      statusBgColor = "#fff7ed";
      statusBorderColor = "#ffedd5";
      statusDisplay = "ACTION REQUIRED: CLEARER PHOTO NEEDED";
      statusSubjectPrefix = "[ACTION REQUIRED]";
      statusTitle = "Action Needed: Please Provide a Clearer Photo";
      statusDescription = customMessage || "Our technical personnel reviewed your service request and noticed that the uploaded photo or document is blurry, out of focus, or does not clearly display the required details (such as the meter serial number, seal, dial reading, breaker switch, or proof of payment).";
      ctaButtonText = "Upload Clearer Photo Now";
      isActionRequired = true;
    } else if (normalizedStatus === "reviewing" || normalizedStatus === "reviewed") {
      statusBadgeColor = "#2563eb";
      statusBgColor = "#eff6ff";
      statusBorderColor = "#bfdbfe";
      statusDisplay = "UNDER TECHNICAL REVIEW";
      statusSubjectPrefix = "[IN REVIEW]";
      statusTitle = "Service Request in Review";
      statusDescription = customMessage || "Your service request has been officially reviewed by our technical engineering team and is currently scheduled for field assignment.";
      ctaButtonText = "Track Ticket Status";
    } else if (normalizedStatus === "dispatched" || normalizedStatus === "crew dispatched" || normalizedStatus === "crew_dispatched") {
      statusBadgeColor = "#7c3aed";
      statusBgColor = "#f5f3ff";
      statusBorderColor = "#ddd6fe";
      statusDisplay = "FIELD CREW DISPATCHED";
      statusSubjectPrefix = "[CREW DISPATCHED]";
      statusTitle = "Technical Crew Dispatched to Your Location";
      statusDescription = customMessage || "A SORECO-1 field operations team has been dispatched to your designated service location. Please ensure our personnel have safe and unobstructed access to the electric meter and service drop.";
      ctaButtonText = "Track Crew Dispatch";
    } else if (normalizedStatus === "resolved") {
      statusBadgeColor = "#16a34a";
      statusBgColor = "#f0fdf4";
      statusBorderColor = "#bbf7d0";
      statusDisplay = "SERVICE COMPLETED & RESOLVED";
      statusSubjectPrefix = "[RESOLVED]";
      statusTitle = "Service Request Successfully Completed";
      statusDescription = customMessage || (
        (ticket.type === "reconnection" || (ticket.category || "").toLowerCase().includes("reconnect"))
          ? "Great news! Your electrical reconnection service has been verified and fully restored by our field personnel. Your account is now active and connected. Thank you for your patience."
          : "Great news! Your service request has been resolved by our team. If you have any further questions or if the issue persists, feel free to contact us through your portal."
      );
      ctaButtonText = "View Resolution Details";
    } else if (normalizedStatus === "cancelled") {
      statusBadgeColor = "#dc2626";
      statusBgColor = "#fef2f2";
      statusBorderColor = "#fecaca";
      statusDisplay = "REQUEST CANCELLED";
      statusSubjectPrefix = "[CANCELLED]";
      statusTitle = "Service Request Cancelled";
      statusDescription = customMessage || "This service request has been cancelled. If you believe this was done in error, please open a new request or reach out to our customer service desk.";
      ctaButtonText = "View Ticket Status";
    } else if (normalizedStatus === "pending") {
      statusBadgeColor = "#d97706";
      statusBgColor = "#fffbeb";
      statusBorderColor = "#fef3c7";
      statusDisplay = "PENDING TECHNICAL QUEUE";
      statusSubjectPrefix = "[RECEIVED]";
      statusTitle = "Service Request Logged in System";
      statusDescription = customMessage || "Your request is currently in our queue awaiting review and assignment to an area technical officer.";
      ctaButtonText = "Track Service Request";
    }

    const formattedDate = ticket.createdAt
      ? new Date(ticket.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      : new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

    const emailSubject = `${statusSubjectPrefix} Ticket #${ticket.id} - ${statusTitle} | SORECO-1`;

    const htmlContent = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <title>${emailSubject}</title>
        <style type="text/css">
          body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          table { border-collapse: collapse !important; }
          body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          @media screen and (max-width: 600px) {
            .mobile-container { width: 100% !important; padding: 12px !important; }
            .mobile-padding { padding: 16px !important; }
            .mobile-stack { display: block !important; width: 100% !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 24px 0; background-color: #f8fafc;">
        <!-- Hidden Preheader Text -->
        <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #ffffff; opacity: 0; mso-hide: all;">
          ${statusTitle} - Ticket #${ticket.id} for Account #${ticket.accountNumber || 'SORECO-1'}. ${statusDescription.substring(0, 100)}...
        </div>

        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding: 12px;">
              <!-- Main Email Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="600" class="mobile-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                
                <!-- Brand Top Accent Bar -->
                <tr>
                  <td height="5" style="background-color: #ea580c; line-height: 5px; font-size: 5px;">&nbsp;</td>
                </tr>

                <!-- Header Banner -->
                <tr>
                  <td align="center" style="background-color: #0f172a; padding: 26px 24px; border-bottom: 1px solid #1e293b;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; background-color: rgba(234, 88, 12, 0.15); border: 1px solid rgba(234, 88, 12, 0.4); padding: 4px 12px; border-radius: 20px; margin-bottom: 10px;">
                            <span style="font-size: 11px; font-weight: 800; color: #fb923c; text-transform: uppercase; letter-spacing: 1px;">
                              ⚡ SORSOGON I ELECTRIC COOPERATIVE, INC.
                            </span>
                          </div>
                          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">
                            SORECO-1 Consumer Portal
                          </h1>
                          <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0; letter-spacing: 0.2px;">
                            Official Service Request & Field Operations Notification
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td class="mobile-padding" style="padding: 28px 32px;">

                    <!-- Status Callout Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${statusBgColor}; border-left: 5px solid ${statusBadgeColor}; border-top: 1px solid ${statusBorderColor}; border-right: 1px solid ${statusBorderColor}; border-bottom: 1px solid ${statusBorderColor}; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 18px 20px;">
                          <div style="margin-bottom: 10px;">
                            <span style="display: inline-block; background-color: ${statusBadgeColor}; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; padding: 4px 10px; border-radius: 4px;">
                              ${statusDisplay}
                            </span>
                          </div>
                          <h2 style="color: #0f172a; margin: 0 0 10px 0; font-size: 18px; font-weight: 700; line-height: 1.3;">
                            ${statusTitle}
                          </h2>
                          <p style="color: #334155; font-size: 14px; margin: 0; line-height: 1.6;">
                            Dear <strong>${toName}</strong>,<br/><br/>
                            ${statusDescription}
                          </p>
                        </td>
                      </tr>
                    </table>

                    ${isActionRequired ? `
                    <!-- Action Instructions / Photo Guidelines Box -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 18px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-size: 13px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 8px;">
                                📷 Guidelines for Submitting a Replacement Photo
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 13px; color: #78350f; line-height: 1.5; padding-bottom: 10px;">
                                To ensure your service request is processed without further delay, please ensure your new photo adheres to the following checklist:
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <table border="0" cellpadding="3" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="22" valign="top" style="color: #ea580c; font-weight: bold; font-size: 14px;">✔</td>
                                    <td style="font-size: 13px; color: #78350f; line-height: 1.5;">
                                      <strong>Sharp & In Focus:</strong> Avoid camera shake. Digits and serial numbers must be crisp and readable.
                                    </td>
                                  </tr>
                                  <tr>
                                    <td width="22" valign="top" style="color: #ea580c; font-weight: bold; font-size: 14px;">✔</td>
                                    <td style="font-size: 13px; color: #78350f; line-height: 1.5;">
                                      <strong>Good Lighting:</strong> Capture during daytime or use a flashlight. Avoid reflective glare off the meter glass.
                                    </td>
                                  </tr>
                                  <tr>
                                    <td width="22" valign="top" style="color: #ea580c; font-weight: bold; font-size: 14px;">✔</td>
                                    <td style="font-size: 13px; color: #78350f; line-height: 1.5;">
                                      <strong>Complete Apparatus:</strong> Include the entire meter face, serial barcode, and physical seal or breaker switches.
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Ticket Details Summary Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 26px; overflow: hidden;">
                      <tr>
                        <td style="padding: 12px 18px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                          <strong style="font-size: 13px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">
                            📋 Service Request Summary
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 18px;">
                          <table border="0" cellpadding="8" cellspacing="0" width="100%" style="font-size: 13px; border-collapse: collapse;">
                            <tr>
                              <td style="color: #64748b; border-bottom: 1px solid #f1f5f9; width: 38%; padding: 8px 0;">Ticket Reference:</td>
                              <td style="border-bottom: 1px solid #f1f5f9; padding: 8px 0;">
                                <span style="font-family: Consolas, Monaco, monospace; font-size: 13px; font-weight: 700; color: #ea580c; background-color: #fff7ed; border: 1px solid #ffedd5; padding: 2px 8px; border-radius: 4px;">
                                  ${ticket.id}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">Account Number:</td>
                              <td style="font-family: Consolas, Monaco, monospace; font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">
                                ${ticket.accountNumber || "N/A"}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">Service Category:</td>
                              <td style="font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">
                                ${ticket.category || ticket.type || "General Concern"}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">Service Type:</td>
                              <td style="font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding: 8px 0; text-transform: capitalize;">
                                ${ticket.type || "Inquiry / Request"}
                              </td>
                            </tr>
                            ${ticket.barangay ? `
                            <tr>
                              <td style="color: #64748b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">Location / Barangay:</td>
                              <td style="font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">
                                ${ticket.barangay}
                              </td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td style="color: #64748b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">Last Updated:</td>
                              <td style="color: #1e293b; border-bottom: 1px solid #f1f5f9; padding: 8px 0;">
                                ${formattedDate}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; padding: 8px 0;">Live Status:</td>
                              <td style="padding: 8px 0;">
                                <span style="font-weight: 700; color: ${statusBadgeColor};">
                                  ${statusDisplay}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Call To Action (Bulletproof Button) -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 12px 0;">
                      <tr>
                        <td align="center">
                          <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                            <tr>
                              <td align="center" style="border-radius: 8px; background-color: #ea580c; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.28);">
                                <a href="${trackerLink}" target="_blank" style="font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 15px 34px; border: 1px solid #ea580c; display: inline-block; font-weight: 700; letter-spacing: 0.3px;">
                                  ${ctaButtonText} &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback Link -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                        Button not working? Access your ticket directly with this link:<br/>
                        <a href="${trackerLink}" style="color: #ea580c; text-decoration: underline; word-break: break-all; font-size: 12px;">
                          ${trackerLink}
                        </a>
                      </p>
                    </div>

                    <!-- Cooperative Contact & Support Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px;">
                      <tr>
                        <td style="padding: 14px 18px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">
                                📞 SORECO-1 Member-Consumer Assistance
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; color: #64748b; line-height: 1.5;">
                                <strong>24/7 Operations Hotline:</strong> (056) 555-0100 &nbsp;|&nbsp; <strong>Emergency Mobile:</strong> +63 997 384 5749<br/>
                                <strong>Main Office:</strong> SORECO-1 Bulan District Office, San Vicente, Bulan, Sorsogon<br/>
                                <strong>Office Hours:</strong> Monday – Friday, 8:00 AM – 5:00 PM (Emergency Dispatch Operating 24/7)
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f172a; padding: 22px 24px; text-align: center; border-top: 1px solid #1e293b;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0; line-height: 1.5;">
                      This is an automated operational notification sent to <span style="color: #e2e8f0;">${toEmail}</span> regarding your registered account <strong>#${ticket.accountNumber || 'SORECO-1'}</strong>. Please do not reply directly to this email.
                    </p>
                    <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.4;">
                      © 2026 Sorsogon I Electric Cooperative, Inc. (SORECO-1). All rights reserved.<br/>
                      Dedicated to providing safe, reliable, and efficient electric service to all member-consumer-owners.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      console.log(`[Email Service] Attempting tracker status email to: ${toEmail} (Status: ${newStatus}, Ticket: ${ticket.id})`);
      
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: toEmail, name: toName }],
          subject: emailSubject,
          htmlContent
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[Email Service] Brevo API Error for tracker notification:`, errorData);
        return { success: false, error: errorData };
      }
      
      const data = await response.json();
      console.log(`[Email Service] Successfully dispatched tracker notification to ${toEmail}. MessageID: ${data.messageId || 'N/A'}`);
      return { success: true, data };
    } catch (e) {
      console.error(`[Email Service] Exception sending tracker notification to ${toEmail}:`, e.message);
      return { success: false, error: e.message };
    }
  };

  // Helper to broadcast Public Service Announcement to consumers via Brevo (with zero branding hints)
  const dispatchAnnouncementEmailNotification = async ({ id, title, content, image, origin }) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn("[Email Service] BREVO_API_KEY not configured. Announcement broadcast aborted.");
      return;
    }

    console.log(`[Email Service] Starting announcement broadcast: "${title}"`);

    const recipientMap = new Map();
    try {
      const allUsers = await getAllUsers({ verifiedOnly: false });
      console.log(`[Email Service] Found ${allUsers.length} total users for announcement broadcast.`);
      
      allUsers.forEach((u) => {
        if (u.email && isValidEmail(u.email) && u.role !== "admin" && !isDisposableEmail(u.email)) {
          recipientMap.set(u.email.toLowerCase().trim(), u.fullName || "Member-Consumer");
        }
      });

      const localUsers = getLocalUsers();
      localUsers.forEach((u) => {
        const email = u.email || u.consumerEmail;
        if (email && isValidEmail(email) && u.role !== "admin" && !isDisposableEmail(email)) {
          if (!recipientMap.has(email.toLowerCase().trim())) {
            recipientMap.set(email.toLowerCase().trim(), u.fullName || u.full_name || "Member-Consumer");
          }
        }
      });
    } catch (err) {
      console.error("[Email Service] Critical error fetching recipients for announcement:", err.message);
    }

    if (recipientMap.size === 0) {
      console.warn("[Email Service] No verified consumer emails found for broadcast. Check User Management.");
      return;
    }

    console.log(`[Email Service] Broadcasting to ${recipientMap.size} unique consumer email addresses.`);

    const portalUrl = `${origin || 'http://localhost:3000'}/#announcements`;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "janry.maligaso@sorsu.edu.ph";
    const senderName = process.env.BREVO_SENDER_NAME || "SORECO-1 Public Advisory";

    const formattedContent = (content || "")
      .split("\n")
      .filter(line => line.trim().length > 0)
      .map(para => `<p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0 0 12px 0;">${para}</p>`)
      .join("");

    // Handle Image: Use a public URL instead of CID to keep email size small and ensure reliability
    let imageUrl = "";
    if (image && image.startsWith("data:image/")) {
      // Use the public API route to serve the image
      imageUrl = `${origin || "http://localhost:3000"}/api/public/announcements/image/${id}`;
    } else if (image && image.startsWith("http")) {
      imageUrl = image;
    }

    const imageHtml = imageUrl 
      ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${imageUrl}" alt="Announcement picture" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #fed7aa; display: inline-block;" /></div>`
      : "";

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #ea580c; padding-bottom: 16px;">
          <h1 style="color: #ea580c; margin: 0; font-size: 22px; font-weight: 800;">SORECO-1 Electric Cooperative</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600;">OFFICIAL PUBLIC SERVICE ANNOUNCEMENT</p>
        </div>

        <div style="background-color: #fff7ed; padding: 18px 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #ea580c;">
          <h2 style="color: #9a3412; margin: 0; font-size: 18px; font-weight: 700;">📢 ${title}</h2>
          <p style="color: #9a3412; font-size: 12px; margin: 6px 0 0 0; opacity: 0.85;">Date Issued: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          ${imageHtml}
          ${formattedContent}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${portalUrl}" style="background-color: #ea580c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.25);">
            View on Consumer Portal
          </a>
        </div>

        <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
            This official advisory was issued by Sorsogon I Electric Cooperative, Inc. (SORECO-1).<br/>
            For emergency reports or power line hazards, reach our 24/7 hotline at (056) 555-0100.
          </p>
        </div>
      </div>
    `;

    const recipients = Array.from(recipientMap.entries()).map(([email, name]) => ({ email, name }));
    console.log(`[Email Service] Starting announcement broadcast to ${recipients.length} verified consumers.`);

    for (const recipient of recipients) {
      if (!isValidEmail(recipient.email)) {
        console.warn(`[Email Service] Skipping invalid recipient email format: ${recipient.email}`);
        continue;
      }
      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [recipient],
            subject: `📢 SORECO-1 Advisory: ${title}`,
            htmlContent
          })
        });
        
        if (!response.ok) {
          const errData = await response.json();
          console.error(`[Email Service] Failed to send announcement to ${recipient.email}:`, errData);
        } else {
          console.log(`[Email Service] Successfully sent announcement to ${recipient.email}`);
        }
      } catch (e) {
        console.error(`[Email Service] Exception sending announcement to ${recipient.email}:`, e.message);
      }
    }
  };

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, fullName, firstName, middleName, lastName, accountNumber, phoneNumber, barangay, hasUnpaidBill } = req.body;
    const resolvedFullName = fullName || [firstName, middleName, lastName].filter(Boolean).join(" ");
    if (!email || !password || !resolvedFullName || !accountNumber) {
      return res.status(400).json({ error: "First name, last name, email, password, and account number are required" });
    }

    // Strict validation: Reject names containing numbers or gibberish
    const firstVal = validateName(firstName || resolvedFullName.split(" ")[0]);
    if (!firstVal.isValid) return res.status(400).json({ error: `First Name: ${firstVal.error}` });
    
    const lastVal = validateName(lastName || resolvedFullName.split(" ").pop());
    if (!lastVal.isValid) return res.status(400).json({ error: `Last Name: ${lastVal.error}` });

    if (middleName) {
      const middleVal = validateName(middleName);
      if (!middleVal.isValid) return res.status(400).json({ error: `Middle Name: ${middleVal.error}` });
    }

    // Phone validation
    const phoneVal = validatePhoneNumber(phoneNumber);
    if (!phoneVal.isValid) return res.status(400).json({ error: `Mobile Number: ${phoneVal.error}` });

    const cleanEmail = email.trim().toLowerCase();
    if (isDisposableEmail(cleanEmail)) {
      return res.status(400).json({
        error: "Registration rejected: Disposable or temporary email addresses (such as @vtmpj.com) cannot be verified and are not permitted. Please use a permanent, legitimate email address."
      });
    }
    const resolvedAddress = barangay ? `Brgy. ${barangay}, Bulan, Sorsogon` : (req.body.address || "");
    const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL : "http://localhost:3000");
    const emailRedirectTo = `${origin}/email-confirmed`;
    const cleanHasUnpaid = Boolean(hasUnpaidBill);

    try {
      // 1. Create the user using Supabase Admin API with email_confirm: false.
      // This completely suppresses Supabase's built-in confirmation email!
      let createdUser = null;
      const { data: adminUserData, error: adminCreateErr } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: false,
        user_metadata: {
          fullName: resolvedFullName,
          accountNumber,
          phoneNumber: phoneNumber || "",
          address: resolvedAddress,
          barangay: barangay || "",
          hasUnpaidBill: cleanHasUnpaid,
          role: cleanEmail === "janry.maligaso@sorsu.edu.ph" ? "admin" : "consumer"
        }
      });

      if (adminCreateErr) {
        if (adminCreateErr.message?.includes("already registered") || adminCreateErr.message?.includes("already exists")) {
          return res.status(400).json({
            error: "An account with this email already exists. If your email is not yet confirmed, please check your inbox or use Resend Confirmation.",
            emailAlreadyExists: true,
            email: cleanEmail
          });
        }
        return res.status(400).json({ error: adminCreateErr.message });
      }

      createdUser = adminUserData?.user;

      if (createdUser) {
        try {
          await supabase.from("users").upsert({
            id: createdUser.id,
            fullname: resolvedFullName,
            email: cleanEmail,
            accountnumber: accountNumber || "PENDING",
            role: cleanEmail === "janry.maligaso@sorsu.edu.ph" ? "admin" : "consumer",
            phonenumber: phoneNumber || "",
            address: resolvedAddress,
            profileimage: ""
          });
        } catch (userError) {
          console.error("User creation error during registration:", userError.message);
        }

        try {
          await supabase.from("profiles").upsert({
            id: createdUser.id,
            full_name: resolvedFullName,
            account_number: accountNumber || "PENDING",
            role: cleanEmail === "janry.maligaso@sorsu.edu.ph" ? "admin" : "consumer",
            phone_number: phoneNumber || "",
            address: resolvedAddress,
            profile_image: ""
          });
        } catch (profileError) {
          console.error("Profile creation error during registration:", profileError.message);
        }

        // 2. Generate email confirmation link via Supabase Admin API without sending any Supabase email
        let verificationLink = emailRedirectTo;
        try {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: "signup",
            email: cleanEmail,
            password: password,
            options: { redirectTo: emailRedirectTo }
          });
          if (linkData?.properties?.action_link) {
            verificationLink = linkData.properties.action_link;
          }
        } catch (linkErr) {
          console.warn("generateLink error (non-fatal):", linkErr.message);
        }

        // 3. Dispatch verification email exclusively via Brevo
        await sendBrevoVerificationEmail({
          email: cleanEmail,
          fullName: resolvedFullName,
          accountNumber,
          barangay,
          verificationLink,
          origin
        });
      }

      res.json({
        success: true,
        supabaseConfirmRequired: true,
        session: null,
        user: createdUser,
        message: "Soreco-1 has sent you an email confirmation please check your email and verify."
      });
    } catch (e) {
      console.error("Registration endpoint error:", e);
      res.status(500).json({ error: e.message || "Failed to register" });
    }
  });

  app.post("/api/auth/resend-confirmation", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (isDisposableEmail(cleanEmail)) {
      return res.status(400).json({
        error: "Cannot send confirmation links to disposable or temporary email addresses. Please register with a permanent email address."
      });
    }
    const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL : "http://localhost:3000");
    const emailRedirectTo = `${origin}/email-confirmed`;

    try {
      // 1. Verify that this email is actually registered in the system
      let targetAuthUser = null;
      try {
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
        if (!listErr && listData?.users) {
          targetAuthUser = listData.users.find(u => (u.email || "").toLowerCase().trim() === cleanEmail);
        }
      } catch (authErr) {
        console.warn("Error looking up auth user for resend confirmation:", authErr.message);
      }

      let existingUserRec = null;
      try {
        const { data: uData } = await supabase.from("users").select("*").eq("email", cleanEmail).maybeSingle();
        if (uData) existingUserRec = uData;
      } catch (dbErr) {}

      let existingProfileRec = null;
      if (targetAuthUser) {
        try {
          const { data: pData } = await supabase.from("profiles").select("*").eq("id", targetAuthUser.id).maybeSingle();
          if (pData) existingProfileRec = pData;
        } catch (dbErr) {}
      }

      // If user does NOT exist in auth or database records, strictly refuse to mint or send confirmation links!
      if (!targetAuthUser && !existingUserRec && !existingProfileRec) {
        console.warn(`[Resend Blocked - Unregistered Email] ${cleanEmail} attempted to request confirmation without prior registration.`);
        return res.status(404).json({
          error: "No registered account found for this email address. Please fill out the registration form first to create your account.",
          notRegistered: true
        });
      }

      // 2. If the user is already confirmed, block re-sending verification links
      const isAlreadyConfirmed = Boolean(
        targetAuthUser?.email_confirmed_at ||
        targetAuthUser?.confirmed_at ||
        targetAuthUser?.user_metadata?.email_confirmed ||
        targetAuthUser?.user_metadata?.email_verified ||
        existingProfileRec?.email_confirmed_at ||
        existingUserRec?.emailConfirmedAt
      );

      if (isAlreadyConfirmed) {
        return res.status(400).json({
          error: "This email address is already confirmed. You can log in directly with your password.",
          alreadyConfirmed: true
        });
      }

      // 3. Generate verification link strictly as signup verification (NEVER arbitrary magiclink)
      let verificationLink = emailRedirectTo;
      try {
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: "signup",
          email: cleanEmail,
          options: { redirectTo: emailRedirectTo }
        });
        if (!linkErr && linkData?.properties?.action_link) {
          verificationLink = linkData.properties.action_link;
        }
      } catch (linkErr) {
        console.warn("generateLink signup error (non-fatal):", linkErr.message);
      }

      // 4. Lookup registered details for personalized email
      const fullName = existingUserRec?.fullName || existingProfileRec?.full_name || targetAuthUser?.user_metadata?.fullName || targetAuthUser?.user_metadata?.full_name || "Member-Consumer";
      const accountNumber = existingUserRec?.accountNumber || existingProfileRec?.account_number || targetAuthUser?.user_metadata?.accountNumber || targetAuthUser?.user_metadata?.account_number || "";
      const barangay = existingUserRec?.address || existingProfileRec?.address || targetAuthUser?.user_metadata?.barangay || targetAuthUser?.user_metadata?.address || "";

      // 5. Dispatch exclusively via Brevo
      await sendBrevoVerificationEmail({
        email: cleanEmail,
        fullName,
        accountNumber,
        barangay,
        verificationLink,
        origin
      });

      console.log(`[Resend Success] Confirmation email resent to registered consumer: ${cleanEmail}`);
      res.json({ success: true, message: "Soreco-1 has sent you an email confirmation please check your email and verify." });
    } catch (e) {
      console.error("Resend confirmation error:", e);
      res.status(500).json({ error: e.message || "Failed to resend confirmation email" });
    }
  });

  // Forgot Password: Step 1 - Send 6-Digit OTP via Brevo
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (isDisposableEmail(cleanEmail)) {
      return res.status(400).json({
        error: "Password reset OTP is not permitted for disposable or temporary email addresses."
      });
    }

    try {
      // Verify that the user exists in Supabase (auth or profiles or users)
      let foundUser = null;
      try {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError && users) {
          foundUser = users.find((u) => u.email?.toLowerCase() === cleanEmail);
        }
      } catch (e) {
        console.warn("Auth listUsers check skipped:", e.message);
      }

      if (!foundUser) {
        try {
          const { data: pData } = await supabase.from("profiles").select("id, full_name").eq("email", cleanEmail).maybeSingle();
          if (pData) foundUser = { id: pData.id, email: cleanEmail, user_metadata: { fullName: pData.full_name } };
        } catch {
          // ignore
        }
      }

      if (!foundUser) {
        try {
          const { data: uData } = await supabase.from("users").select("*").eq("email", cleanEmail).maybeSingle();
          if (uData) foundUser = { id: uData.id, email: cleanEmail, user_metadata: { fullName: uData.fullname || uData.fullName || uData.full_name } };
        } catch {
          // ignore
        }
      }

      if (!foundUser && cleanEmail !== "admin01@gmail.com") {
        return res.status(404).json({ error: "No registered account found with this email address." });
      }

      // Generate a cryptographically secure 6-digit OTP
      const otpNumber = crypto.randomInt(100000, 999999).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

      // Store in memory
      globalThis.otpStore.set(cleanEmail, {
        otp: otpNumber,
        expiresAt,
        verified: false,
        attempts: 0
      });

      const recipientName = foundUser?.user_metadata?.fullName || foundUser?.user_metadata?.full_name || cleanEmail.split("@")[0];

      // Prepare styled HTML email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .logo { font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; margin-bottom: 24px; text-transform: uppercase; }
            .otp-box { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0369a1; }
            .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">SORECO-1 Consumer Portal</div>
            <h2 style="font-size: 20px; margin-top: 0; color: #0f172a;">Password Reset Verification</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">Hello <strong>${recipientName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">We received a request to reset the password for your SORECO-1 Consumer Portal account. Use the 6-digit verification code below to continue:</p>
            <div class="otp-box">${otpNumber}</div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This verification code is valid for <strong>10 minutes</strong>. If you did not request this password reset, please ignore this email or contact SORECO-1 support immediately.</p>
            <div class="footer">
              &copy; ${new Date().getFullYear()} SORSOGON I ELECTRIC COOPERATIVE, INC. (SORECO-1)<br>All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `;

      await sendBrevoEmail({
        toEmail: cleanEmail,
        toName: recipientName,
        subject: "SORECO-1 Password Reset Verification Code",
        htmlContent
      });

      console.log(`[Brevo] OTP sent successfully to ${cleanEmail}`);
      res.json({ success: true, message: "Soreco-1 has sent you an OTP. Please check your email." });
    } catch (e) {
      console.error("send-otp error:", e);
      res.status(500).json({ error: e.message || "Failed to send verification code. Please check email configuration." });
    }
  });

  // Forgot Password: Step 2 - Verify 6-Digit OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = globalThis.otpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({ error: "No active verification code found for this email. Please request a new code." });
    }

    if (Date.now() > record.expiresAt) {
      globalThis.otpStore.delete(cleanEmail);
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) {
      globalThis.otpStore.delete(cleanEmail);
      return res.status(400).json({ error: "Too many failed attempts. Please request a new verification code." });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({ error: "Invalid verification code. Please check and try again." });
    }

    // Mark verified
    record.verified = true;
    globalThis.otpStore.set(cleanEmail, record);

    res.json({ success: true, message: "Verification code confirmed successfully." });
  });

  // Forgot Password: Step 3 - Create New Password (Supabase Auth Updates)
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, password, otp } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = globalThis.otpStore.get(cleanEmail);

    // Verify that OTP verification took place
    if (!record || !record.verified) {
      if (otp) {
        if (!record || record.otp !== otp.toString().trim() || Date.now() > record.expiresAt) {
          return res.status(400).json({ error: "Invalid or expired verification session. Please verify your OTP code." });
        }
      } else {
        return res.status(400).json({ error: "OTP verification required before resetting password." });
      }
    }

    try {
      let userId = null;
      try {
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && users) {
          const matching = users.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (matching) {
            userId = matching.id;
          }
        }
      } catch (err) {
        console.warn("Could not list auth users to find email:", err.message);
      }

      if (!userId) {
        try {
          const { data, error } = await supabase.from("profiles").select("id").eq("email", cleanEmail).maybeSingle();
          if (data) userId = data.id;
        } catch (err) {
        }
      }

      if (!userId) {
        try {
          const { data, error } = await supabase.from("users").select("id").eq("email", cleanEmail).maybeSingle();
          if (data) userId = data.id;
        } catch (err) {
        }
      }

      if (!userId) {
        return res.status(404).json({ error: "No user account found with this email address in Supabase." });
      }

      // Supabase Auth updates the password and confirms email so the user can immediately log in
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true
      });

      if (authError) {
        console.error("Error updating password via Supabase Auth Admin:", authError.message);
        if (authError.message?.toLowerCase().includes("jwt") || authError.message?.toLowerCase().includes("not allowed")) {
          return res.status(400).json({ error: "Supabase Service Role Key required. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in Settings." });
        }
        return res.status(400).json({ error: authError.message });
      }

      // Cleanup used OTP
      globalThis.otpStore.delete(cleanEmail);

      console.log(`[Supabase Auth] Password reset successfully for ${cleanEmail} (ID: ${userId})`);
      res.json({ success: true, message: "Password updated successfully. You can now sign in with your new password." });
    } catch (e) {
      console.error("Reset password exception:", e);
      res.status(500).json({ error: "Failed to reset password. Please try again." });
    }
  });

  // Legacy route alias for compatibility
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    // Delegate to send-otp
    req.url = "/api/auth/send-otp";
    return app._router.handle(req, res);
  });
  app.get("/api/tickets", authenticateToken, async (req, res) => {
    try {
      const tickets = await getTicketsList(req.user.role, req.user.id);
      res.json(tickets);
    } catch (e) {
      console.error("Get tickets failed:", e);
      res.status(500).json({ error: "Failed to fetch tickets list" });
    }
  });
  app.post("/api/tickets", authenticateToken, async (req, res) => {
    const { type, category, description, evidenceImage, checklist, consumerName, accountNumber, isUrgent } = req.body;
    if (type === "reconnection" && req.user.role !== "admin" && !req.user.hasUnpaidBill) {
      return res.status(403).json({ error: "Reconnection service is only accessible if your account has recorded unpaid bills or disconnected status." });
    }
    if (description && countWords(description) > 100) {
      return res.status(400).json({ error: "Description must not exceed 100 words." });
    }
    if (evidenceImage && !validateImagePayload(evidenceImage)) {
      return res.status(400).json({ error: "Upload rejected: Only PNG, JPG, and JPEG images are allowed." });
    }
    const id = "TICK-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    try {
      const ticketData = {
        id,
        consumerId: (req.user.role === "admin" && req.body.consumerId) ? req.body.consumerId : req.user.id,
        consumerName: (req.user.role === "admin" && consumerName) ? consumerName : (req.user.fullName || consumerName),
        accountNumber: (req.user.role === "admin" && accountNumber) ? accountNumber : (req.user.accountNumber || accountNumber),
        address: req.user.address || "",
        phoneNumber: req.user.phoneNumber || "",
        type,
        category,
        description,
        status: "pending",
        isUrgent: 1,
        evidenceImage: evidenceImage || "",
        checklist: checklist || null,
        messages: []
      };
      await createTicket(ticketData);

      await recordAuditLog({
        action: "ADD",
        entity: "Ticket",
        entityId: id,
        details: `Created service request ticket #${id} (${type} - ${category}) for ${ticketData.consumerName || "consumer"}`,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || (req.user.role === "admin" ? "Admin" : "Consumer"),
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });

      res.json({ id });
    } catch (e) {
      console.error("Create ticket failed:", e);
      res.status(500).json({ error: "Failed to create service request ticket. Please try again later." });
    }
  });
  app.get("/api/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const ticket = await getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      
      // If admin, hide cancelled tickets as per requirement
      if (req.user.role === "admin" && ticket.status === "cancelled") {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Strict Access Control (WSTG-ATHZ-04: Prevent Insecure Direct Object Reference)
      const isAdmin = req.user.role === "admin";
      const isOwner = ticket.user_id === req.user.id ||
        ticket.consumerId === req.user.id ||
        (ticket.accountNumber && ticket.accountNumber === req.user.accountNumber);

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Not allowed: You do not have permission to view this ticket" });
      }

      res.json(ticket);
    } catch (e) {
      console.error("Get ticket details failed:", e);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });
  app.patch("/api/tickets/:id", authenticateToken, async (req, res) => {
    const { status, messages, feedback, evidenceImage, category, description, type, isUrgent } = req.body;
    try {
      const ticket = await getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      const isAdmin = req.user.role === "admin";
      const isOwner = ticket.user_id === req.user.id || ticket.consumerId === req.user.id || (ticket.accountNumber && ticket.accountNumber === req.user.accountNumber);
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Unauthorized to modify this ticket" });
      }
      if (description !== void 0 && countWords(description) > 100) {
        return res.status(400).json({ error: "Description must not exceed 100 words." });
      }
      if (evidenceImage !== void 0 && !validateImagePayload(evidenceImage)) {
        return res.status(400).json({ error: "Upload rejected: Only PNG, JPG, and JPEG images are allowed." });
      }
      if (Array.isArray(messages)) {
        for (const m of messages) {
          if (m && m.text && countWords(m.text) > 100) {
            return res.status(400).json({ error: "Message must not exceed 100 words." });
          }
          if (m && Array.isArray(m.images)) {
            for (const img of m.images) {
              if (!validateImagePayload(img)) {
                return res.status(400).json({ error: "Upload rejected: Attached chat image is not a valid PNG, JPG, or JPEG format." });
              }
            }
          }
        }
      }
      if (feedback !== void 0) {
        let fbObj = feedback;
        if (typeof fbObj === "string") {
          try { fbObj = JSON.parse(fbObj); } catch (e) {}
        }
        if (fbObj && fbObj.comment && countWords(fbObj.comment) > 100) {
          return res.status(400).json({ error: "Feedback comment must not exceed 100 words." });
        }
      }
      if (!isAdmin) {
        if (ticket.status === "cancelled") {
          return res.status(400).json({ error: "Cancelled requests are locked." });
        }
        if (status === "cancelled") {
          if (ticket.status !== "pending" && ticket.status !== "reviewing") {
            return res.status(400).json({ error: "Requests can only be cancelled while pending or reviewing." });
          }
        } else if (feedback !== void 0) {
          if (ticket.status !== "resolved" && ticket.status !== "pending") {
            return res.status(400).json({ error: "Feedback can only be submitted for resolved or pending requests." });
          }
        } else if (messages !== void 0 || evidenceImage !== void 0) {
        } else {
          if (ticket.status !== "pending") {
            return res.status(400).json({ error: "Requests can only be edited while pending." });
          }
        }
      }
      const updateData = {};
      if (status !== void 0) updateData.status = status;
      if (messages !== void 0) updateData.messages = messages;
      if (feedback !== void 0) updateData.feedback = feedback;
      if (evidenceImage !== void 0) updateData.evidenceImage = evidenceImage;
      if (category !== void 0 && (isAdmin || ticket.status === "pending")) updateData.category = category;
      if (description !== void 0 && (isAdmin || ticket.status === "pending")) updateData.description = description;
      if (type !== void 0 && (isAdmin || ticket.status === "pending")) updateData.type = type;
      if (isUrgent !== void 0 && (isAdmin || ticket.status === "pending")) updateData.isUrgent = isUrgent ? 1 : 0;
      await updateTicket(req.params.id, updateData);

      // When a reconnection request is marked resolved, automatically update consumer to Connected (hasUnpaidBill: false)
      const effectiveType = (updateData.type || ticket.type || "").toLowerCase();
      const effectiveCategory = (updateData.category || ticket.category || "").toLowerCase();
      const effectiveDesc = (updateData.description || ticket.description || "").toLowerCase();
      const effectiveStatus = (updateData.status !== void 0 ? updateData.status : ticket.status || "").toLowerCase();
      const isReconnection = effectiveType === "reconnection" ||
        effectiveCategory.includes("reconnect") ||
        effectiveDesc.includes("reconnect");

      if (effectiveStatus === "resolved" && isReconnection) {
        let consumerId = ticket.consumerId || ticket.user_id;
        const accountNumber = ticket.accountNumber;
        console.log(`[Auto-Connected] Reconnection request ${req.params.id} resolved. Updating consumer (${consumerId || accountNumber}) to Connected in database and User Management...`);

        if (!consumerId && accountNumber && accountNumber !== "PENDING" && accountNumber !== "12345678") {
          try {
            const { data: authUsersRes } = await supabase.auth.admin.listUsers();
            const matchedUser = authUsersRes?.users?.find((u) =>
              u.user_metadata?.accountNumber === accountNumber ||
              u.user_metadata?.account_number === accountNumber
            );
            if (matchedUser) {
              consumerId = matchedUser.id;
            }
          } catch (lookupErr) {
            console.warn("User lookup by accountNumber warning:", lookupErr.message);
          }
        }

        if (!consumerId && ticket.consumerEmail) {
          try {
            const { data: authUsersRes } = await supabase.auth.admin.listUsers();
            const matchedUser = authUsersRes?.users?.find(u => u.email?.toLowerCase() === ticket.consumerEmail?.toLowerCase());
            if (matchedUser) consumerId = matchedUser.id;
          } catch (e) {}
        }

        if (consumerId) {
          try {
            await adminUpdateUser(consumerId, { hasUnpaidBill: false });
          } catch (connErr) {
            console.warn("Auto-connect adminUpdateUser warning:", connErr.message);
          }
        }
      }

      // Send Tracker Status Email Notification to the consumer whenever status changes or clearer picture is requested
      const previousStatus = ticket.status;
      const statusChanged = updateData.status !== void 0 && updateData.status !== previousStatus;
      const isClearerPicture = req.body.actionType === "request_clearer_picture" ||
        req.body.notificationType === "clearer_picture" ||
        (typeof updateData.status === "string" && (
          updateData.status.toLowerCase().includes("clearer") ||
          updateData.status.toLowerCase().includes("picture")
        )) ||
        (typeof req.body.customMessage === "string" && req.body.customMessage.toLowerCase().includes("clearer"));

      if (statusChanged || isClearerPicture) {
        const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL : "http://localhost:3000");
        
        // Multi-level recipient email and name resolution
        let recipientEmail = ticket.consumerEmail || ticket.email || req.body.consumerEmail;
        let recipientName = ticket.consumerName || req.body.consumerName || "Member-Consumer";

        const cid = ticket.consumerId || ticket.user_id || ticket.userId;
        if (!recipientEmail && cid) {
          try {
            const { data: u } = await supabase.from("users").select("*").eq("id", cid).maybeSingle();
            if (u?.email) {
              recipientEmail = u.email;
              recipientName = u.fullname || u.fullName || recipientName;
            }
          } catch (e) {}
        }
        if (!recipientEmail && cid) {
          try {
            const { data: aData } = await supabase.auth.admin.getUserById(cid);
            if (aData?.user?.email) {
              recipientEmail = aData.user.email;
              recipientName = aData.user.user_metadata?.fullName || recipientName;
            }
          } catch (e) {}
        }
        if (!recipientEmail && ticket.accountNumber && ticket.accountNumber !== "PENDING") {
          try {
            const { data: accUser } = await supabase.from("users").select("*").eq("accountnumber", ticket.accountNumber).maybeSingle();
            if (accUser?.email) {
              recipientEmail = accUser.email;
              recipientName = accUser.fullname || accUser.fullName || recipientName;
            }
          } catch (e) {}
        }
        if (!recipientEmail && ticket.accountNumber && ticket.accountNumber !== "PENDING") {
          try {
            const { data: authList } = await supabase.auth.admin.listUsers();
            const matched = authList?.users?.find(u =>
              u.user_metadata?.accountNumber === ticket.accountNumber ||
              u.user_metadata?.account_number === ticket.accountNumber
            );
            if (matched?.email) {
              recipientEmail = matched.email;
              recipientName = matched.user_metadata?.fullName || recipientName;
            }
          } catch (e) {}
        }

        console.log(`[Tracker Notification] Dispatching email for ticket ${ticket.id} to "${recipientEmail}" (${recipientName}). Status: ${isClearerPicture ? 'clearer_picture' : (updateData.status || previousStatus)}`);

        if (recipientEmail) {
          try {
            const sendResult = await sendTrackerStatusNotificationEmail({
              toEmail: recipientEmail,
              toName: recipientName,
              ticket: { ...ticket, ...updateData },
              newStatus: isClearerPicture ? "clearer_picture" : (updateData.status || previousStatus),
              previousStatus,
              customMessage: req.body.customMessage,
              origin
            });
            console.log(`[Tracker Notification] Result for ticket ${ticket.id}:`, sendResult);
          } catch (err) {
            console.error("[Tracker Notification] Email send error:", err.message);
          }
        } else {
          console.warn(`[Tracker Notification] No recipient email found for ticket ${ticket.id}`);
        }
      }

      if (isAdmin) {
        const changes = [];
        if (updateData.status) changes.push(`status='${updateData.status}'`);
        if (updateData.category) changes.push(`category='${updateData.category}'`);
        if (updateData.isUrgent !== void 0) changes.push(`priority='${updateData.isUrgent ? "Urgent" : "Normal"}'`);
        if (updateData.feedback) changes.push(`feedback updated`);
        if (updateData.messages && updateData.messages.length > (ticket.messages?.length || 0)) changes.push(`reply added`);
        await recordAuditLog({
          action: "EDIT",
          entity: "Ticket",
          entityId: req.params.id,
          details: `Updated ticket #${req.params.id}: ${changes.join(", ") || "modified request details"}`,
          adminId: req.user.id,
          adminName: req.user.fullName || req.user.email || "Admin",
          ipAddress: req.ip || req.headers["x-forwarded-for"]
        });
      }

      res.json({ success: true });
    } catch (e) {
      console.error("Update ticket failed:", e);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  app.delete("/api/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const ticket = await getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can delete tickets" });
      }
      await deleteTicket(req.params.id);
      await recordAuditLog({
        action: "DELETE",
        entity: "Ticket",
        entityId: req.params.id,
        details: `Deleted ticket #${req.params.id} (${ticket.consumerName || "Consumer"} - ${ticket.category || ticket.type || "Ticket"})`,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });
      res.json({ success: true });
    } catch (e) {
      console.error("Delete ticket failed:", e);
      res.status(500).json({ error: "Failed to delete ticket" });
    }
  });

  app.get("/api/public/ratings", async (req, res) => {
    try {
      const tickets = await getTicketsList();
      const feedbacks = tickets.filter(t => {
        let fb = t.feedback;
        if (typeof fb === "string") {
          try { fb = JSON.parse(fb); } catch (e) {}
        }
        return fb && fb.rating;
      }).map(t => {
        let fb = t.feedback;
        if (typeof fb === "string") {
          try { fb = JSON.parse(fb); } catch (e) {}
        }
        return {
          id: t.id,
          consumerName: t.consumerName || "Member Consumer",
          category: t.category,
          type: t.type,
          rating: Number(fb.rating),
          comment: fb.comment,
          adminResponse: fb.adminResponse || null,
          createdAt: fb.createdAt
        };
      });

      let totalRating = 0;
      let categories = {
        billing: { count: 0, total: 0 },
        reconnection: { count: 0, total: 0 },
        other: { count: 0, total: 0 }
      };

      feedbacks.forEach(f => {
        totalRating += f.rating;
        const rawType = f.type || "other";
        const type = (rawType === "billing" || rawType === "billing-dispute") 
          ? "billing" 
          : (rawType === "reconnection" ? "reconnection" : "other");
        if (categories[type]) {
          categories[type].total += f.rating;
          categories[type].count += 1;
        } else {
          categories.other.total += f.rating;
          categories.other.count += 1;
        }
      });

      const avgRating = feedbacks.length > 0 ? Number((totalRating / feedbacks.length).toFixed(1)) : 0.0;
      const satisfactionPercentage = feedbacks.length > 0 ? Math.round((totalRating / (feedbacks.length * 5)) * 100) : 0;

      const breakdown = {
        billing: categories.billing.count > 0 ? Number((categories.billing.total / categories.billing.count).toFixed(1)) : 0.0,
        reconnection: categories.reconnection.count > 0 ? Number((categories.reconnection.total / categories.reconnection.count).toFixed(1)) : 0.0,
        other: categories.other.count > 0 ? Number((categories.other.total / categories.other.count).toFixed(1)) : 0.0,
      };

      res.json({
        averageRating: avgRating,
        totalFeedbacks: feedbacks.length,
        satisfactionPercentage: satisfactionPercentage,
        feedbacks: feedbacks.slice(0, 10),
        breakdown: breakdown
      });
    } catch (e) {
      console.error("Get public ratings failed:", e);
      res.json({
        averageRating: 0.0,
        totalFeedbacks: 0,
        satisfactionPercentage: 0,
        feedbacks: []
      });
    }
  });

  app.get("/api/public/announcements/image/:id", async (req, res) => {
    try {
      const imagesMap = await getAnnouncementImages();
      const image = imagesMap[req.params.id];
      if (!image) return res.status(404).send("Image not found");

      const parts = image.split(",");
      if (parts.length < 2) return res.status(400).send("Invalid image data");

      const mime = parts[0].split(":")[1].split(";")[0];
      const buffer = Buffer.from(parts[1], "base64");

      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      res.send(buffer);
    } catch (e) {
      console.error("Error serving announcement image:", e);
      res.status(500).send("Server error");
    }
  });

  app.get("/api/announcements", async (req, res) => {
    try {
      const announcements = await getAnnouncementsList();
      res.json(announcements);
    } catch (e) {
      console.error("Get announcements failed:", e);
      res.status(500).json({ error: "Failed to load announcements" });
    }
  });
  app.post("/api/announcements", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { title, content, image } = req.body;
    if (image && !validateImagePayload(image)) {
      return res.status(400).json({ error: "Upload rejected: Only PNG, JPG, and JPEG images are allowed." });
    }
    const id = Math.random().toString(36).substring(2, 15);
    const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL : "http://localhost:3000");
    try {
      await createAnnouncement({ id, title, content, image });

      await recordAuditLog({
        action: "ADD",
        entity: "Announcement",
        entityId: id,
        details: `Created announcement "${title || "Untitled"}"`,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });

      // Dispatch announcement email notifications to registered consumers in background
      dispatchAnnouncementEmailNotification({ id, title, content, image, origin }).catch(e => {
        console.error("Failed to broadcast announcement emails (non-fatal):", e.message);
      });

      res.json({ id });
    } catch (e) {
      console.error("Create announcement failed:", e);
      res.status(500).json({ error: "Failed to publish announcement" });
    }
  });
  app.put("/api/announcements/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { title, content, image } = req.body;
    if (image && !validateImagePayload(image)) {
      return res.status(400).json({ error: "Upload rejected: Only PNG, JPG, and JPEG images are allowed." });
    }
    const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL : "http://localhost:3000");
    try {
      await updateAnnouncement(req.params.id, { title, content, image });

      await recordAuditLog({
        action: "EDIT",
        entity: "Announcement",
        entityId: req.params.id,
        details: `Updated announcement "${title || req.params.id}"`,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });
      
      res.json({ success: true });
    } catch (e) {
      console.error("Update announcement failed:", e);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });
  app.post("/api/announcements/reorder", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { items } = req.body;
    try {
      const orderIds = Array.isArray(items) ? items.map(item => (typeof item === "string" ? item : item.id)) : [];
      await setSettingValue("announcements_order", JSON.stringify(orderIds));

      await recordAuditLog({
        action: "EDIT",
        entity: "Announcement",
        entityId: "REORDER",
        details: `Reordered announcement list display priority (${orderIds.length} items)`,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });

      res.json({ success: true, order: orderIds });
    } catch (e) {
      console.error("Reorder announcements failed:", e);
      res.status(500).json({ error: "Failed to reorder announcements" });
    }
  });
  app.delete("/api/announcements/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      await deleteAnnouncement(req.params.id);

      await recordAuditLog({
        action: "DELETE",
        entity: "Announcement",
        entityId: req.params.id,
        details: `Deleted announcement #${req.params.id}`,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });

      res.json({ success: true });
    } catch (e) {
      console.error("Delete announcement failed:", e);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const value = await getSettingValue(req.params.key);
      res.json({ value });
    } catch (e) {
      console.error("Get setting failed:", e);
      res.status(500).json({ error: "Failed to load setting" });
    }
  });
  app.post("/api/settings/:key", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { value } = req.body;
    try {
      await setSettingValue(req.params.key, value);

      await recordAuditLog({
        action: "EDIT",
        entity: "Setting",
        entityId: req.params.key,
        details: `Updated system configuration parameter for '${req.params.key}'`,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });

      res.json({ success: true });
    } catch (e) {
      console.error("Save setting failed:", e);
      res.status(500).json({ error: "Failed to save system setting" });
    }
  });

  // Audit Logbook endpoints (WSTG-BUSL-05: Administrative Audit Trail)
  app.get("/api/audit-logs", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const logs = await getAuditLogs();
      const { action, search } = req.query;
      let filtered = logs;
      if (action && action !== "ALL") {
        filtered = filtered.filter(l => (l.action || "").toUpperCase() === action.toUpperCase());
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(l => 
          (l.adminName && l.adminName.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q)) ||
          (l.entity && l.entity.toLowerCase().includes(q)) ||
          (l.entityId && l.entityId.toLowerCase().includes(q))
        );
      }
      res.json(filtered);
    } catch (e) {
      console.error("Get audit logs failed:", e);
      res.status(500).json({ error: "Failed to retrieve audit log trail" });
    }
  });

  app.post("/api/audit-logs", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const { action, entity, entityId, details } = req.body;
      const log = await recordAuditLog({
        action,
        entity,
        entityId,
        details,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });
      res.json(log);
    } catch (e) {
      res.status(500).json({ error: "Failed to record audit log" });
    }
  });

  app.delete("/api/audit-logs", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      globalThis.localAuditLogs = [];
      await setSettingValue("system_audit_logs", JSON.stringify([]));
      await recordAuditLog({
        action: "DELETE",
        entity: "Audit Logbook",
        entityId: "ALL",
        details: "Administrator archived/cleared previous activity logbook entries",
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to clear audit logs" });
    }
  });
  app.post("/api/users", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { fullName, email, password, accountNumber, role, phoneNumber, address } = req.body;
    if (isDisposableEmail(email)) {
      return res.status(400).json({ error: "Cannot register users with disposable or temporary email addresses." });
    }
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          fullName,
          accountNumber,
          role
        }
      });
      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
      if (authData?.user) {
        try {
          const { error: userError } = await supabase.from("users").upsert({
            id: authData.user.id,
            fullname: fullName,
            email: email,
            accountnumber: accountNumber || "PENDING",
            role: role || "consumer",
            phonenumber: phoneNumber || "",
            address: address || "",
            profileimage: ""
          });
          if (userError) {
            console.error("Error in user creation:", userError.message);
          }
        } catch (e) {
          console.error("Exception in user creation:", e);
        }

        try {
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: authData.user.id,
            full_name: fullName,
            account_number: accountNumber || "PENDING",
            role: role || "consumer",
            phone_number: phoneNumber || "",
            address: address || "",
            profile_image: ""
          });
          if (profileError) {
            console.error("Error in profile creation:", profileError.message);
          }
        } catch (e) {
          console.error("Exception in profile creation:", e);
        }
      }

      await recordAuditLog({
        action: "ADD",
        entity: "User",
        entityId: authData?.user?.id || accountNumber || "NEW",
        details: `Created new ${role || "consumer"} account for ${fullName} (${email}, Account: ${accountNumber || "PENDING"})`,
        adminId: req.user.id,
        adminName: req.user.fullName || req.user.email || "Admin",
        ipAddress: req.ip || req.headers["x-forwarded-for"]
      });

      res.json({ success: true });
    } catch (e) {
      console.error("Admin user creation failed:", e);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app.get("/api/users", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      // User Management in admin page: only show accounts that are actually verified
      const users = await getAllUsers({ verifiedOnly: true });
      res.json(users);
    } catch (e) {
      console.error("Get all users failed:", e);
      res.status(500).json({ error: "Failed to retrieve users" });
    }
  });
  app.patch("/api/users/:id", authenticateToken, async (req, res) => {
    // Feature removed per security requirement: admins cannot modify consumer info
    res.status(403).json({ error: "Feature disabled: Admin modification of user profiles is restricted for security." });
  });
  app.delete("/api/users/:id", authenticateToken, async (req, res) => {
    // Feature removed per security requirement: admins cannot delete consumer accounts
    res.status(403).json({ error: "Feature disabled: Admin deletion of user accounts is restricted for security." });
  });
  app.post("/api/inquiries", async (req, res) => {
    const { fullName, email, phone, subject, message } = req.body;
    if (!fullName || !email || !phone || !subject || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (message && countWords(message) > 100) {
      return res.status(400).json({ error: "Inquiry message must not exceed 100 words." });
    }
    const id = "INQ-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    try {
      const inquiryData = {
        id,
        fullName,
        email,
        phone,
        subject,
        message
      };
      await createInquiry(inquiryData);
      res.json({ id });
    } catch (e) {
      console.error("Create inquiry failed:", e);
      res.status(500).json({ error: "Failed to submit inquiry" });
    }
  });
  app.get("/api/inquiries", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const inquiries = await getInquiriesList();
      res.json(inquiries);
    } catch (e) {
      console.error("Get inquiries failed:", e);
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });
  app.get("/api/my-inquiries", authenticateToken, async (req, res) => {
    try {
      const email = req.user.email;
      const inquiries = await getInquiriesList();
      const userInquiries = inquiries.filter((i) => i.email && i.email.toLowerCase() === email.toLowerCase());
      res.json(userInquiries);
    } catch (e) {
      console.error("Get my inquiries failed:", e);
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });
  app.get("/api/inquiries/:id", authenticateToken, async (req, res) => {
    try {
      const inquiryId = req.params.id;
      let inquiry = null;
      try {
        const { data, error } = await supabase.from("inquiries").select("*").eq("id", inquiryId).maybeSingle();
        if (!error && data) inquiry = data;
      } catch (e) {}
      const localInq = (globalThis.localInquiries || []).find((i) => i.id === inquiryId);
      if (localInq) inquiry = localInq;
      if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });

      const isAdmin = req.user.role === "admin";
      const isOwner = req.user.email && inquiry.email && req.user.email.toLowerCase() === inquiry.email.toLowerCase();
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Not allowed: You do not have permission to view this inquiry" });
      }
      res.json(inquiry);
    } catch (e) {
      res.status(500).json({ error: "Failed to retrieve inquiry" });
    }
  });

  app.patch("/api/inquiries/:id", authenticateToken, async (req, res) => {
    const { messages } = req.body;
    try {
      const inquiryId = req.params.id;
      let inquiry = null;
      try {
        const { data, error } = await supabase.from("inquiries").select("*").eq("id", inquiryId).maybeSingle();
        if (!error && data) {
          inquiry = data;
        }
      } catch (e) {
      }
      const localInq = (globalThis.localInquiries || []).find((i) => i.id === inquiryId);
      if (localInq) {
        inquiry = localInq;
      }
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      const isAdmin = req.user.role === "admin";
      const isOwner = req.user.email && inquiry.email && req.user.email.toLowerCase() === inquiry.email.toLowerCase();
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      if (messages !== void 0) {
        if (Array.isArray(messages)) {
          for (const m of messages) {
            if (m && m.text && countWords(m.text) > 100) {
              return res.status(400).json({ error: "Message must not exceed 100 words." });
            }
            if (m && Array.isArray(m.images)) {
              for (const img of m.images) {
                if (!validateImagePayload(img)) {
                  return res.status(400).json({ error: "Upload rejected: Attached image is not a valid PNG, JPG, or JPEG format." });
                }
              }
            }
          }
        }
        const messagesMap = getInquiryMessagesMap();
        messagesMap[inquiryId] = Array.isArray(messages) ? messages : [];
        saveInquiryMessagesMap(messagesMap);

        if (isAdmin) {
          await recordAuditLog({
            action: "EDIT",
            entity: "Inquiry",
            entityId: inquiryId,
            details: `Admin replied to inquiry #${inquiryId} (${inquiry.fullName || inquiry.email})`,
            adminId: req.user.id,
            adminName: req.user.fullName || req.user.email || "Admin",
            ipAddress: req.ip || req.headers["x-forwarded-for"]
          });
        }
      }
      res.json({ success: true });
    } catch (e) {
      console.error("Update inquiry failed:", e);
      res.status(500).json({ error: "Failed to update inquiry" });
    }
  });
  
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
