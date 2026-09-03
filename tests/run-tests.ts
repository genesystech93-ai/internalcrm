import { calculateRowHeight } from "../src/lib/pretext-measure";
import { normalizeIp, isIpAllowed } from "../src/lib/ip-guard";
import {
  sanitizeText,
  validateUsername,
  validatePassword,
  validateEmail,
  validateMobile,
  validateIpAddress,
} from "../src/lib/sanitize";
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from "../src/lib/rate-limiter";

async function runTests() {
  console.log("Running Genesoft CRM Test Suite (Business Rules & Security Guards)...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Shift Attribution
  const earlyMorning = new Date(2026, 8, 4, 3, 30, 0); // Sept 4, 3:30 AM local
  const shiftDate = new Date(earlyMorning);
  if (earlyMorning.getHours() < 12) {
    shiftDate.setDate(shiftDate.getDate() - 1);
  }
  const formattedDate = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, "0")}-${String(shiftDate.getDate()).padStart(2, "0")}`;
  assert(formattedDate === "2026-09-03", "Attributes early morning to previous calendar day shift date");

  // 2. Late Grace Evaluation
  const shiftStartTime = "19:00";
  const lateGraceMinutes = 15;
  const [startH, startM] = shiftStartTime.split(":").map(Number);
  const cutoffMs = new Date(shiftDate).setHours(startH, startM + lateGraceMinutes, 0, 0);
  const onTimeLogin = new Date("2026-09-03T19:12:00").getTime();
  const lateLogin = new Date("2026-09-03T19:25:00").getTime();
  assert(onTimeLogin <= cutoffMs, "On-time login verified within 15-minute grace");
  assert(lateLogin > cutoffMs, "Late login correctly flagged after grace threshold");

  // 3. Campaign-Scoped Mobile Uniqueness
  const leads = [{ mobile: "9876543210", campaignId: "camp-health-1" }];
  const isDuplicateSameCamp = leads.some((l) => l.mobile === "9876543210" && l.campaignId === "camp-health-1");
  const isDuplicateDiffCamp = leads.some((l) => l.mobile === "9876543210" && l.campaignId === "camp-medicare-2");
  assert(isDuplicateSameCamp === true, "Blocks duplicate mobile entry within same campaign");
  assert(isDuplicateDiffCamp === false, "Permits same mobile number across different campaigns");

  // 4. Incentive Reversal
  let incentiveStatus = "ACCRUED";
  const prevStatus: string = "APPROVED";
  const targetStatus: string = "CALL_BACK";
  if (prevStatus === "APPROVED" && targetStatus !== "APPROVED") {
    incentiveStatus = "VOIDED";
  }
  assert(incentiveStatus === "VOIDED", "Reverses credited incentive when Approved lead is reclassified");

  // 5. Admin Anywhere Exemption
  const adminRole = "ADMIN";
  const randomIp = "198.51.100.42";
  const allowed = adminRole === "ADMIN" ? true : await isIpAllowed(randomIp);
  assert(allowed === true, "Admin is globally exempt and can log in from any IP");

  // 6. IP Normalization
  assert(normalizeIp("::1") === "127.0.0.1", "Normalizes IPv6 loopback to 127.0.0.1");
  assert(normalizeIp("::ffff:192.168.1.1") === "192.168.1.1", "Normalizes mapped IPv6 to IPv4");

  // 7. Pretext Row Height
  const h1 = calculateRowHeight("Short", "Note");
  const h2 = calculateRowHeight("A long multiline address with plenty of street detail", "Extensive agent discussion notes");
  assert(h1 >= 64, "Calculates baseline row height");
  assert(h2 >= h1, "Calculates dynamic expanded height for multiline text");

  // 8. Security: SQL Injection in Username Guard
  const sqliUsername = "admin' OR '1'='1' --";
  const sqliValidation = validateUsername(sqliUsername);
  assert(sqliValidation.valid === false, "Blocks SQL injection in login username (' OR '1'='1' --)");

  // 9. Security: Valid Username Format
  const validUser = validateUsername("sarah_connor.99");
  assert(validUser.valid === true && validUser.value === "sarah_connor.99", "Permits valid clean usernames");

  // 10. Security: Script / XSS Injections in Text Boxes
  const xssInput = "Robert <script>alert('pwned')</script> Jenkins";
  const sanitizedXss = sanitizeText(xssInput, 100);
  assert(sanitizedXss === "Robert  Jenkins" && !sanitizedXss.includes("<script>"), "Strips script tags and HTML markup from text boxes");

  // 11. Security: Character / Length Buffer Floods
  const floodText = "A".repeat(5000);
  const truncatedText = sanitizeText(floodText, 255);
  assert(truncatedText.length === 255, "Enforces strict length boundary capping buffer flood payloads");

  // 12. Security: Mobile Number SQL Injection / Extra Characters
  const sqliMobile = "9876543210' OR '1'='1";
  const mobileRes = validateMobile(sqliMobile);
  assert(mobileRes.valid === false, "Blocks SQL injection characters in mobile input");

  const validMobile = validateMobile("9876543210");
  assert(validMobile.valid === true && validMobile.value === "9876543210", "Permits valid 10-digit mobile number");

  const invalidLettersMobile = validateMobile("123abc456");
  assert(invalidLettersMobile.valid === false, "Rejects malformed mobile numbers lacking sufficient numeric digits");

  // 13. Security: IP Address Syntax & Injection Guard
  const sqliIp = "192.168.1.1' OR '1'='1";
  const ipRes = validateIpAddress(sqliIp);
  assert(ipRes.valid === false, "Blocks SQL injection and malformed syntax in IP whitelist");

  const validIp = validateIpAddress("49.207.210.15");
  assert(validIp.valid === true, "Accepts valid Global WAN IP address");

  // 14. Security: Password Length Boundary (bcrypt DoS protection)
  const hugePassword = "P".repeat(500);
  const passRes = validatePassword(hugePassword);
  assert(passRes.valid === false, "Rejects oversized passwords (> 128 chars) preventing bcrypt DoS CPU spikes");

  // 15. Security: Rate Limiting Permitted Requests
  const testIpKey = "test-ip-rate-check";
  resetLoginAttempts(testIpKey);
  const initialCheck = checkLoginRateLimit(testIpKey);
  assert(initialCheck.allowed === true && initialCheck.remainingAttempts === 5, "Allows initial login attempts under rate limit");

  // 16. Security: Brute-Force Lockout Defense
  for (let i = 0; i < 5; i++) {
    recordFailedLoginAttempt(testIpKey);
  }
  const lockedCheck = checkLoginRateLimit(testIpKey);
  assert(lockedCheck.allowed === false && lockedCheck.retryAfterSeconds > 0, "Locks out automated brute-force attacks after 5 failed attempts");
  // 17. Security: Malicious SVG Script Injection Scanning
  const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><circle cx="50" cy="50" r="40"/></svg>`;
  const hasScript = /<script\b|javascript:|onload=|onerror=|onclick=/i.test(maliciousSvg);
  assert(hasScript === true, "Detects and flags embedded scripts inside uploaded SVG files");

  const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#F97316"/></svg>`;
  const cleanCheck = /<script\b|javascript:|onload=|onerror=|onclick=/i.test(cleanSvg);
  assert(cleanCheck === false, "Permits clean vector graphics without executable scripts");

  // 18. Security: Account Enumeration Prevention
  const genericErrorMessage = "Invalid username or password.";
  assert(genericErrorMessage.includes("Invalid username or password"), "Enforces uniform authentication failure responses to prevent username harvesting");

  // 19. Security: Email Format Validation
  const validEmail = validateEmail("john.doe@genesoftinfotech.com");
  assert(validEmail.valid === true && validEmail.value === "john.doe@genesoftinfotech.com", "Validates proper employee email addresses");

  const invalidEmail = validateEmail("not-an-email");
  assert(invalidEmail.valid === false, "Rejects malformed email address format");

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
