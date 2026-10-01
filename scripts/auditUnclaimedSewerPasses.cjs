const {
  getBooleanStateByToken,
  idsFromRangeExcept,
  printAudit,
  updateDataExport,
} = require("./lib/claimAuditHelpers.cjs");

const sewerPassContract = "0xba5a9e9cbce12c70224446c24c111132becf9f1d";

async function main() {
  const claimedBaycIds = await getBooleanStateByToken({
    label: "Sewer Pass audit",
    contractAddress: sewerPassContract,
    signature: "baycClaimed(uint256)",
  });
  const unclaimedSewerApes = idsFromRangeExcept(claimedBaycIds);

  updateDataExport("unclaimedSewerApes", unclaimedSewerApes);
  console.error(
    `Sewer Pass audit: derived and wrote ${unclaimedSewerApes.length} unclaimed BAYC IDs to lostApesData.js`
  );
  printAudit(
    "Unclaimed BAYC Sewer Pass IDs",
    `https://eth.blockscout.com/address/${sewerPassContract}/logs`,
    claimedBaycIds.length,
    unclaimedSewerApes
  );
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
