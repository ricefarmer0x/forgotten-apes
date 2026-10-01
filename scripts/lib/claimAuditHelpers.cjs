const fs = require("fs");
const https = require("https");
const path = require("path");
const Web3 = require("web3");

const pageSize = 50;
const web3 = new Web3();

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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

function getRpcUrl() {
  if (process.env.ETH_RPC_URL) return process.env.ETH_RPC_URL;
  if (process.env.REACT_APP_ALCHEMY_API_KEY) {
    return `https://eth-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`;
  }
  throw new Error(
    "Set ETH_RPC_URL or export REACT_APP_ALCHEMY_API_KEY before running this script."
  );
}

const postJson = (url, body) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let responseBody = "";
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch {
            reject(new Error(`Invalid JSON response: ${responseBody.slice(0, 200)}`));
          }
        });
      }
    );
    request.on("error", reject);
    request.end(payload);
  });

function encodeUint256Call(signature, tokenId) {
  const selector = web3.utils.sha3(signature).slice(0, 10);
  return `${selector}${BigInt(tokenId).toString(16).padStart(64, "0")}`;
}

async function getBooleanStateByToken({ label, contractAddress, signature }) {
  const rpcUrl = getRpcUrl();
  const tokenIds = Array.from({ length: 10000 }, (_, tokenId) => tokenId);
  const batchSize = 100;
  const statePath = path.join(
    "/tmp",
    `forgotten-apes-state-audit-${`${contractAddress}-${signature}`.replace(/[^a-z0-9]/gi, "")}.json`
  );
  if (process.argv.includes("--reset") && fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
  const checkpoint = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, "utf8"))
    : { offset: 0, trueTokenIds: [] };
  const trueTokenIds = checkpoint.trueTokenIds;

  console.error(
    checkpoint.offset
      ? `${label}: resuming at batch ${checkpoint.offset / batchSize + 1}/100…`
      : `${label}: starting 10,000 contract-state reads in 100 RPC batches…`
  );
  for (let offset = checkpoint.offset; offset < tokenIds.length; offset += batchSize) {
    const batch = tokenIds.slice(offset, offset + batchSize).map((tokenId) => ({
      jsonrpc: "2.0",
      id: tokenId,
      method: "eth_call",
      params: [
        {
          to: contractAddress,
          data: encodeUint256Call(signature, tokenId),
        },
        "latest",
      ],
    }));
    const response = await postJson(rpcUrl, batch);
    if (!Array.isArray(response) || response.some((item) => item.error || item.result === undefined)) {
      throw new Error(`State-read batch ${offset / batchSize + 1} failed`);
    }
    response.forEach(({ id, result }) => {
      if (BigInt(result) !== 0n) trueTokenIds.push(Number(id));
    });
    saveCheckpoint(statePath, { offset: offset + batchSize, trueTokenIds });
    console.error(
      `${label}: batch ${offset / batchSize + 1}/100 complete; ${trueTokenIds.length} claimed/minted IDs found`
    );
  }

  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  return trueTokenIds;
}

async function getFilteredLogsInRanges({ label, contractAddress, fromBlock, toBlock, topics }) {
  const rpcUrl = getRpcUrl();
  const rangeSize = 2000;
  const ranges = [];
  for (let start = fromBlock; start <= toBlock; start += rangeSize) {
    ranges.push([start, Math.min(start + rangeSize - 1, toBlock)]);
  }
  const logs = [];

  console.error(`${label}: starting ${ranges.length} filtered log ranges…`);
  for (let offset = 0; offset < ranges.length; offset += 10) {
    const currentRanges = ranges.slice(offset, offset + 10);
    const response = await postJson(
      rpcUrl,
      currentRanges.map(([start, end], index) => ({
        jsonrpc: "2.0",
        id: offset + index,
        method: "eth_getLogs",
        params: [
          {
            address: contractAddress,
            fromBlock: `0x${start.toString(16)}`,
            toBlock: `0x${end.toString(16)}`,
            topics,
          },
        ],
      }))
    );
    if (!Array.isArray(response) || response.some((item) => item.error || !Array.isArray(item.result))) {
      throw new Error(`Filtered log batch ${Math.floor(offset / 10) + 1} failed`);
    }
    response.forEach(({ result }) => logs.push(...result));
    console.error(
      `${label}: ranges ${offset + 1}-${offset + currentRanges.length}/${ranges.length} complete; ${logs.length} matching events found`
    );
  }

  return logs;
}

function buildLogsUrl(contractAddress, topic, pageParams) {
  const params = new URLSearchParams({
    topic,
    items_count: String(pageSize),
    ...pageParams,
  });
  return `https://eth.blockscout.com/api/v2/addresses/${contractAddress}/logs?${params}`;
}

function checkpointPath(contractAddress, topic) {
  const safeKey = `${contractAddress}-${topic}`.replace(/[^a-z0-9]/gi, "");
  return path.join("/tmp", `forgotten-apes-claim-audit-${safeKey}.json`);
}

function saveCheckpoint(filePath, state) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(state));
  fs.renameSync(temporaryPath, filePath);
}

async function getAllTopicLogs(contractAddress, topic, label = "Claim audit") {
  const statePath = checkpointPath(contractAddress, topic);
  if (process.argv.includes("--reset") && fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }

  const checkpoint = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, "utf8"))
    : null;
  let pageParams = checkpoint?.pageParams ?? {};
  const logs = checkpoint?.logs ?? [];
  let pageCount = checkpoint?.pageCount ?? 0;

  console.error(
    checkpoint
      ? `${label}: resuming at page ${pageCount + 1}; ${logs.length} events already collected`
      : `${label}: starting paginated event scan…`
  );

  while (pageParams) {
    const cursor = pageParams.block_number
      ? ` (continuing before block ${pageParams.block_number})`
      : "";
    console.error(`${label}: requesting page ${pageCount + 1}${cursor}`);
    const response = await requestJson(buildLogsUrl(contractAddress, topic, pageParams));
    if (response.errors) throw new Error(JSON.stringify(response.errors));

    logs.push(...response.items);
    pageCount += 1;
    const lastItem = response.items.at(-1);
    // Blockscout can omit this cursor after 1,000 results even when older
    // matching events remain. Continue from the final returned event instead.
    pageParams =
      response.next_page_params ||
      (response.items.length === pageSize && lastItem
        ? { block_number: lastItem.block_number, index: lastItem.index }
        : null);
    saveCheckpoint(statePath, { pageParams, logs, pageCount });

    console.error(
      `${label}: page ${pageCount} complete; ${logs.length} matching events collected`
    );

    await pause(150);
  }

  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  console.error(`${label}: complete; ${logs.length} matching events collected`);
  return logs;
}

function topicNumber(log, index) {
  const topic = log.topics?.[index];
  if (!topic) throw new Error(`Missing topic ${index} in ${log.transaction_hash}`);
  return Number(BigInt(topic));
}

function idsFromRangeExcept(claimedIds) {
  const claimed = new Set(claimedIds);
  return Array.from({ length: 10000 }, (_, id) => id).filter((id) => !claimed.has(id));
}

function formatArray(ids) {
  const sorted = [...new Set(ids)].sort((left, right) => left - right);
  const lines = [];
  for (let index = 0; index < sorted.length; index += 16) {
    lines.push(`  ${sorted.slice(index, index + 16).join(", ")},`);
  }
  return `[\n${lines.join("\n")}\n]`;
}

function updateDataExport(exportName, ids) {
  const dataPath = path.resolve(
    __dirname,
    "../../src/components/data/lostApesData.js"
  );
  const source = fs.readFileSync(dataPath, "utf8");
  const expression = new RegExp(
    `export const ${exportName} = \\[[\\s\\S]*?\\];`
  );
  const replacement = `export const ${exportName} = ${formatArray(ids)};`;
  if (!expression.test(source)) {
    throw new Error(`Could not find export ${exportName} in ${dataPath}`);
  }
  fs.writeFileSync(dataPath, source.replace(expression, replacement));
}

function printAudit(name, source, eventCount, ids) {
  const uniqueIds = [...new Set(ids)].sort((left, right) => left - right);
  console.log(
    JSON.stringify(
      { name, source, eventCount, count: uniqueIds.length, tokenIds: uniqueIds },
      null,
      2
    )
  );
}

module.exports = {
  getBooleanStateByToken,
  getFilteredLogsInRanges,
  getAllTopicLogs,
  idsFromRangeExcept,
  printAudit,
  topicNumber,
  updateDataExport,
};
