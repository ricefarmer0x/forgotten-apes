const {
  getFilteredLogsInRanges,
  printAudit,
  topicNumber,
  updateDataExport,
} = require("./lib/claimAuditHelpers.cjs");

const otherdeedContract = "0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258";
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const zeroAddressTopic =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const yugaLabsTopic =
  "0x000000000000000000000000a858ddc0445d8131dac4d1de01f834ffcba52ef1";

async function main() {
  const logs = await getFilteredLogsInRanges({
    label: "Otherside audit",
    contractAddress: otherdeedContract,
    fromBlock: 14828755,
    toBlock: 15356630,
    topics: [transferTopic, zeroAddressTopic, yugaLabsTopic],
  });
  // Preserve the page's existing definition: Otherdeeds minted from zero to
  // the Yuga address whose ID corresponds to a BAYC token ID.
  const unclaimedOthersideApes = logs
    .map((log) => topicNumber(log, 3))
    .filter((tokenId) => tokenId < 10000);

  updateDataExport("unclaimedOthersideApes", unclaimedOthersideApes);
  console.error(
    `Otherside audit: wrote ${new Set(unclaimedOthersideApes).size} IDs to lostApesData.js`
  );
  printAudit(
    "Unclaimed Otherside BAYC IDs",
    `https://eth.blockscout.com/address/${otherdeedContract}/logs`,
    logs.length,
    unclaimedOthersideApes
  );
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
