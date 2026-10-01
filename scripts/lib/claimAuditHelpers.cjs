const fs = require("fs");
const https = require("https");
const path = require("path");
const Web3 = require("web3");

const pageSize = 50;
const web3 = new Web3();
const multicall3Address = "0xcA11bde05977b3631167028862bE2a173976CA11";
const multicallAggregateAbi = {
  name: "aggregate",
  type: "function",
  inputs: [
    {
      name: "calls",
      type: "tuple[]",
      components: [
        { name: "target", type: "address" },
        { name: "callData", type: "bytes" },
      ],
    },
  ],
  outputs: [
    { name: "blockNumber", type: "uint256" },
    { name: "returnData", type: "bytes[]" },
  ],
};

function loadProjectEnv() {
  const envPath = path.resolve(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) return;

      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) return;

      const value = rawValue
        .replace(/^(["'])(.*)\1$/, "$2")
        .replace(/\s+#.*$/, "");
      process.env[key] = value;
    });
}

// This runs only when an audit script is executed. It never logs env values.
loadProjectEnv();

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

async function postJsonWithRetry(url, body, label) {
  let lastFailure;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await postJson(url, body);
      const isComplete = Array.isArray(response)
        ? response.every((item) => !item.error && item.result !== undefined)
        : !response.error && response.result !== undefined;
      if (isComplete) {
        return response;
      }
      const errors = Array.isArray(response)
        ? response.filter((item) => item.error).map((item) => item.error?.message).filter(Boolean)
        : [response.error?.message].filter(Boolean);
      lastFailure = new Error(errors.join("; ") || "RPC returned an incomplete batch");
    } catch (error) {
      lastFailure = error;
    }

    if (attempt < 5) {
      const delay = attempt * 1000;
      console.error(`${label}: RPC batch failed; retrying in ${delay / 1000}s (${attempt}/5)…`);
      await pause(delay);
    }
  }
  throw lastFailure;
}

function encodeUint256Call(signature, tokenId) {
  const selector = web3.utils.sha3(signature).slice(0, 10);
  return `${selector}${BigInt(tokenId).toString(16).padStart(64, "0")}`;
}

async function getBooleanStateByToken({ label, contractAddress, signature, blockTag = "latest" }) {
  const rpcUrl = getRpcUrl();
  const tokenIds = Array.from({ length: 10000 }, (_, tokenId) => tokenId);
  const batchSize = 250;
  const statePath = path.join(
    "/tmp",
    `forgotten-apes-state-audit-${`${contractAddress}-${signature}-${blockTag}`.replace(/[^a-z0-9]/gi, "")}.json`
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
      ? `${label}: resuming at token ID ${checkpoint.offset}/9,999…`
      : `${label}: starting 10,000 contract-state reads through Multicall3…`
  );
  for (let offset = checkpoint.offset; offset < tokenIds.length; offset += batchSize) {
    const batchTokenIds = tokenIds.slice(offset, offset + batchSize);
    const aggregateCallData = web3.eth.abi.encodeFunctionCall(
      multicallAggregateAbi,
      [
        batchTokenIds.map((tokenId) => ({
          target: contractAddress,
          callData: encodeUint256Call(signature, tokenId),
        })),
      ]
    );
    const response = await postJsonWithRetry(
      rpcUrl,
      {
        jsonrpc: "2.0",
        id: offset,
        method: "eth_call",
        params: [{ to: multicall3Address, data: aggregateCallData }, blockTag],
      },
      `${label}: token IDs ${offset}-${batchTokenIds.at(-1)}`
    );
    const decoded = web3.eth.abi.decodeParameters(
      multicallAggregateAbi.outputs,
      response.result
    );
    const returnData = decoded.returnData;
    if (!Array.isArray(returnData) || returnData.length !== batchTokenIds.length) {
      throw new Error(`Multicall returned an unexpected result length at token ID ${offset}`);
    }
    returnData.forEach((result, index) => {
      if (BigInt(result) !== 0n) trueTokenIds.push(batchTokenIds[index]);
    });
    saveCheckpoint(statePath, {
      offset: offset + batchTokenIds.length,
      trueTokenIds,
    });
    console.error(
      `${label}: IDs 0-${batchTokenIds.at(-1)} complete; ${trueTokenIds.length} positive contract states found`
    );
    await pause(150);
  }

  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  return trueTokenIds;
}

async function getFirstTrueBooleanBlock({ label, contractAddress, signature, fromBlock }) {
  const rpcUrl = getRpcUrl();
  const data = web3.utils.sha3(signature).slice(0, 10);
  const callAt = async (blockNumber) => {
    const response = await postJsonWithRetry(
      rpcUrl,
      { jsonrpc: "2.0", id: blockNumber, method: "eth_call", params: [{ to: contractAddress, data }, `0x${blockNumber.toString(16)}`] },
      `${label}: checking block ${blockNumber}`
    );
    return BigInt(response.result) !== 0n;
  };
  const latest = await postJsonWithRetry(
    rpcUrl,
    { jsonrpc: "2.0", id: 0, method: "eth_blockNumber", params: [] },
    `${label}: reading latest block`
  );
  let low = fromBlock;
  let high = Number(BigInt(latest.result));
  if (await callAt(low)) return low;
  if (!(await callAt(high))) throw new Error(`${label}: ${signature} is not true at the latest block`);
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (await callAt(middle)) high = middle;
    else low = middle;
  }
  return high;
}

async function getAddressStateByToken({ label, contractAddress, signature, targetAddress }) {
  const rpcUrl = getRpcUrl();
  const tokenIds = Array.from({ length: 10000 }, (_, tokenId) => tokenId);
  const batchSize = 250;
  const normalizedTargetAddress = targetAddress.toLowerCase();
  const statePath = path.join(
    "/tmp",
    `forgotten-apes-address-audit-${`${contractAddress}-${signature}-${targetAddress}`.replace(/[^a-z0-9]/gi, "")}.json`
  );
  if (process.argv.includes("--reset") && fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
  const checkpoint = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, "utf8"))
    : { offset: 0, matchingTokenIds: [] };
  const matchingTokenIds = checkpoint.matchingTokenIds;

  console.error(
    checkpoint.offset
      ? `${label}: resuming at token ID ${checkpoint.offset}/9,999…`
      : `${label}: starting 10,000 ownership reads through Multicall3…`
  );
  for (let offset = checkpoint.offset; offset < tokenIds.length; offset += batchSize) {
    const batchTokenIds = tokenIds.slice(offset, offset + batchSize);
    const aggregateCallData = web3.eth.abi.encodeFunctionCall(
      multicallAggregateAbi,
      [
        batchTokenIds.map((tokenId) => ({
          target: contractAddress,
          callData: encodeUint256Call(signature, tokenId),
        })),
      ]
    );
    const response = await postJsonWithRetry(
      rpcUrl,
      {
        jsonrpc: "2.0",
        id: offset,
        method: "eth_call",
        params: [{ to: multicall3Address, data: aggregateCallData }, "latest"],
      },
      `${label}: token IDs ${offset}-${batchTokenIds.at(-1)}`
    );
    const decoded = web3.eth.abi.decodeParameters(
      multicallAggregateAbi.outputs,
      response.result
    );
    const returnData = decoded.returnData;
    if (!Array.isArray(returnData) || returnData.length !== batchTokenIds.length) {
      throw new Error(`Multicall returned an unexpected result length at token ID ${offset}`);
    }
    returnData.forEach((result, index) => {
      const owner = `0x${result.slice(-40)}`.toLowerCase();
      if (owner === normalizedTargetAddress) matchingTokenIds.push(batchTokenIds[index]);
    });
    saveCheckpoint(statePath, {
      offset: offset + batchTokenIds.length,
      matchingTokenIds,
    });
    console.error(
      `${label}: IDs 0-${batchTokenIds.at(-1)} complete; ${matchingTokenIds.length} burn-owned IDs found`
    );
    await pause(150);
  }

  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  return matchingTokenIds;
}

async function getFilteredLogsInRanges({ label, contractAddress, fromBlock, toBlock, topics }) {
  const rpcUrl = getRpcUrl();
  const rangeSize = 2000;
  const ranges = [];
  for (let start = fromBlock; start <= toBlock; start += rangeSize) {
    ranges.push([start, Math.min(start + rangeSize - 1, toBlock)]);
  }
  const statePath = path.join(
    "/tmp",
    `forgotten-apes-log-audit-${`${contractAddress}-${fromBlock}-${toBlock}-${topics.join("")}`.replace(/[^a-z0-9]/gi, "")}.json`
  );
  if (process.argv.includes("--reset") && fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
  const checkpoint = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, "utf8"))
    : { offset: 0, logs: [] };
  const logs = checkpoint.logs;

  console.error(
    checkpoint.offset
      ? `${label}: resuming at range ${checkpoint.offset + 1}/${ranges.length}; ${logs.length} matching events already found…`
      : `${label}: starting ${ranges.length} filtered log ranges…`
  );
  // Alchemy can reject JSON-RPC arrays containing eth_getLogs calls even when
  // each individual range is valid. Send one modest range per request instead.
  for (let offset = checkpoint.offset; offset < ranges.length; offset += 1) {
    const [start, end] = ranges[offset];
    const response = await postJsonWithRetry(
      rpcUrl,
      {
        jsonrpc: "2.0",
        id: offset,
        method: "eth_getLogs",
        params: [
          {
            address: contractAddress,
            fromBlock: `0x${start.toString(16)}`,
            toBlock: `0x${end.toString(16)}`,
            topics,
          },
        ],
      },
      `${label}: range ${offset + 1}/${ranges.length}`
    );
    if (!Array.isArray(response.result)) {
      throw new Error(`Filtered log range ${offset + 1} returned an invalid result`);
    }
    logs.push(...response.result);
    saveCheckpoint(statePath, { offset: offset + 1, logs });
    console.error(
      `${label}: range ${offset + 1}/${ranges.length} complete; ${logs.length} matching events found`
    );
    await pause(100);
  }

  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
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
  getFirstTrueBooleanBlock,
  getAddressStateByToken,
  getFilteredLogsInRanges,
  getAllTopicLogs,
  idsFromRangeExcept,
  printAudit,
  topicNumber,
  updateDataExport,
};
