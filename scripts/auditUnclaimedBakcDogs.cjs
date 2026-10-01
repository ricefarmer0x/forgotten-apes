const {
  getBooleanStateByToken,
  idsFromRangeExcept,
  printAudit,
  updateDataExport,
} = require("./lib/claimAuditHelpers.cjs");

const bakcContract = "0xba30e5f9bb24caa003e9f2f0497ad287fdf95623";

async function main() {
  const mintedDogIds = await getBooleanStateByToken({
    label: "BAKC dog audit",
    contractAddress: bakcContract,
    signature: "isMinted(uint256)",
  });
  const unclaimedDogTokenIds = idsFromRangeExcept(mintedDogIds);

  updateDataExport("unclaimedDogTokenIds", unclaimedDogTokenIds);
  console.error(
    `BAKC dog audit: wrote ${unclaimedDogTokenIds.length} IDs to lostApesData.js`
  );
  printAudit(
    "Unclaimed BAKC dog token IDs",
    `https://eth.blockscout.com/address/${bakcContract}/logs`,
    mintedDogIds.length,
    unclaimedDogTokenIds
  );
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
