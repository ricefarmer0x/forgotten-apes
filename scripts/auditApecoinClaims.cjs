const https = require("https");
const fs = require("fs");
const path = require("path");

const claimContract = "0x025c6da5bd0e6a5dd1350fda9e3b6a614b205a1f";
const alphaClaimTopic =
  "0x592993b07849bd4ab51c2de371aea3db52156da6f3cd8476b1c585454b254f48";
const pageSize = 50;
const checkpointPath = path.join("/tmp", "forgotten-apes-apecoin-audit.json");
const resultPath = path.join("/tmp", "forgotten-apes-apecoin-audit-result.json");

const requestJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`Invalid JSON response: ${body.slice(0, 200)}`));
          }
        });
      })
      .on("error", reject);
  });

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const buildUrl = (pageParams) => {
  const params = new URLSearchParams({
    topic: alphaClaimTopic,
    items_count: String(pageSize),
    ...pageParams,
  });
  return `https://eth.blockscout.com/api/v2/addresses/${claimContract}/logs?${params}`;
};

async function main() {
  if (process.argv.includes("--reset") && fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath);
  }

  const checkpoint = fs.existsSync(checkpointPath)
    ? JSON.parse(fs.readFileSync(checkpointPath, "utf8"))
    : { pageParams: {}, claimedTokenIds: [], pageCount: 0 };
  let pageParams = checkpoint.pageParams;
  const claimedTokenIds = new Set(checkpoint.claimedTokenIds);
  let pageCount = checkpoint.pageCount;

  while (pageParams) {
    const response = await requestJson(buildUrl(pageParams));
    if (response.errors) {
      throw new Error(JSON.stringify(response.errors));
    }

    response.items.forEach((log) => {
      const tokenId = Number(log.decoded?.parameters?.[0]?.value);
      if (!Number.isInteger(tokenId) || tokenId < 0 || tokenId >= 10000) {
        throw new Error(`Unexpected BAYC token ID in log ${log.transaction_hash}`);
      }
      claimedTokenIds.add(tokenId);
    });

    pageCount += 1;
    if (pageCount % 20 === 0) {
      console.error(`Fetched ${pageCount} pages; ${claimedTokenIds.size} unique BAYC claims`);
    }
    const lastItem = response.items.at(-1);
    // Blockscout omits next_page_params after 1,000 results even when older
    // matching logs remain. Continue from the final log cursor in that case.
    pageParams =
      response.next_page_params ||
      (response.items.length === pageSize && lastItem
        ? {
            block_number: lastItem.block_number,
            index: lastItem.index,
          }
        : null);
    fs.writeFileSync(
      checkpointPath,
      JSON.stringify({
        pageParams,
        claimedTokenIds: [...claimedTokenIds],
        pageCount,
      })
    );
    await pause(150);
  }

  const unclaimedTokenIds = Array.from({ length: 10000 }, (_, tokenId) => tokenId)
    .filter((tokenId) => !claimedTokenIds.has(tokenId));

  const result = {
    source: `https://eth.blockscout.com/address/${claimContract}/logs`,
    pagesFetched: pageCount,
    uniqueBaycClaimed: claimedTokenIds.size,
    unclaimedBayc: unclaimedTokenIds.length,
    unclaimedTokenIds,
  };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  fs.unlinkSync(checkpointPath);
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
