// Automated Verification Test for Client Selection & Net Terms Approval SLA
import {
  getInMemoryClients,
  saveInMemoryClient,
  netTermsToDays,
  calculateApprovalDeadline,
  computeApprovalSLA,
} from "../src/lib/client-store";

async function runClientTests() {
  console.log("==========================================");
  console.log("🧪 STARTING CLIENT & NET TERMS SLA TESTS");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  };

  // 1. Verify Client Registration & Directory
  saveInMemoryClient({
    name: "Apex Healthcare Buyers LLC",
    contactPerson: "David Miller",
    email: "dmiller@apexhealthcare.com",
    defaultNetTerms: "NET_14",
    isActive: true,
  });
  saveInMemoryClient({
    name: "MediCare Direct Group",
    contactPerson: "Elena Rostova",
    email: "elena@medicaredirect.com",
    defaultNetTerms: "NET_7",
    isActive: true,
  });

  const clients = getInMemoryClients();
  assert(clients.length >= 2, `Client directory has registered clients`);

  const apexClient = clients.find((c) => c.name.includes("Apex Healthcare"));
  assert(!!apexClient, "Apex Healthcare Buyers LLC exists in directory");
  assert(apexClient?.defaultNetTerms === "NET_14", "Apex Healthcare default is Net 14 terms");

  const medicareClient = clients.find((c) => c.name.includes("MediCare Direct"));
  assert(!!medicareClient, "MediCare Direct Group exists in directory");
  assert(medicareClient?.defaultNetTerms === "NET_7", "MediCare Direct default is Net 7 terms");

  // 2. Verify Net Terms to Days conversion
  assert(netTermsToDays("NET_7") === 7, "NET_7 converts to exactly 7 calendar days");
  assert(netTermsToDays("NET_14") === 14, "NET_14 converts to exactly 14 calendar days");
  assert(netTermsToDays("NET_21") === 21, "NET_21 converts to exactly 21 calendar days");
  assert(netTermsToDays("NET_30") === 30, "NET_30 converts to exactly 30 calendar days");

  // 3. Verify Approval Deadline Calculation Math
  const testSubDate = new Date("2026-09-03T12:00:00.000Z");

  const deadline7 = calculateApprovalDeadline(testSubDate, "NET_7");
  assert(deadline7.toISOString().startsWith("2026-09-10"), `Net 7 from Sept 3 gives Sept 10 (got ${deadline7.toISOString()})`);

  const deadline14 = calculateApprovalDeadline(testSubDate, "NET_14");
  assert(deadline14.toISOString().startsWith("2026-09-17"), `Net 14 from Sept 3 gives Sept 17 (got ${deadline14.toISOString()})`);

  const deadline21 = calculateApprovalDeadline(testSubDate, "NET_21");
  assert(deadline21.toISOString().startsWith("2026-09-24"), `Net 21 from Sept 3 gives Sept 24 (got ${deadline21.toISOString()})`);

  const deadline30 = calculateApprovalDeadline(testSubDate, "NET_30");
  assert(deadline30.toISOString().startsWith("2026-10-03"), `Net 30 from Sept 3 gives Oct 3 (got ${deadline30.toISOString()})`);

  // 4. Verify Approval SLA Status & Countdown
  const futureDeadline = new Date();
  futureDeadline.setDate(futureDeadline.getDate() + 9);
  const futureSLA = computeApprovalSLA(futureDeadline);
  assert(futureSLA.daysRemaining === 9 && !futureSLA.isOverdue, `Future deadline (9 days) computed correctly: ${futureSLA.statusLabel}`);

  const dueSoonDeadline = new Date();
  dueSoonDeadline.setDate(dueSoonDeadline.getDate() + 1);
  const dueSoonSLA = computeApprovalSLA(dueSoonDeadline);
  assert(dueSoonSLA.daysRemaining === 1 && !dueSoonSLA.isOverdue && dueSoonSLA.statusLabel.includes("Due in"), `Due soon deadline computed: ${dueSoonSLA.statusLabel}`);

  const pastDeadline = new Date();
  pastDeadline.setDate(pastDeadline.getDate() - 3);
  const pastSLA = computeApprovalSLA(pastDeadline);
  assert(pastSLA.isOverdue && pastSLA.statusLabel.includes("Overdue 3d"), `Overdue deadline flagged correctly: ${pastSLA.statusLabel}`);

  // 5. Test Registering a New Client
  const newClient = saveInMemoryClient({
    name: "Trinity Insurance Exchange",
    contactPerson: "Sarah Jenkins",
    email: "sjenkins@trinity.com",
    defaultNetTerms: "NET_21",
    isActive: true,
  });
  assert(!!newClient.id, `New client registered with ID: ${newClient.id}`);
  assert(newClient.name === "Trinity Insurance Exchange", "New client name matches input");

  console.log("==========================================");
  console.log(`🎉 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runClientTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
