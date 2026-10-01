const fs = require("fs");
const https = require("https");
const path = require("path");
const Web3 = require("web3");
const { updateDataExport } = require("./lib/claimAuditHelpers.cjs");

const DATA_PATH = path.resolve(__dirname, "../src/components/data/lostApesData.js");
const CHECKPOINT_PATH = path.join("/tmp", "forgotten-apes-lost-apes-audit.json");
const BAYC_CONTRACT = "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d";
const OTHERSIDE_MINT_BLOCK = 14680891;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
const web3 = new Web3();

function loadProjectEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) return;
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2").replace(/\s+#.*$/, "");
    });
}

function getRpcUrl() {
  if (process.env.ETH_RPC_URL) return process.env.ETH_RPC_URL;
  if (process.env.REACT_APP_ALCHEMY_API_KEY) {
    return `https://eth-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`;
  }
  throw new Error("Set ETH_RPC_URL or REACT_APP_ALCHEMY_API_KEY before running this audit.");
}

function requestJson(url, body) {
  return new Promise((resolve, reject) => {
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
        response.on("data", (chunk) => { responseBody += chunk; });
        response.on("end", () => {
          try {
            const parsed = JSON.parse(responseBody);
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject(new Error(`RPC returned HTTP ${response.statusCode}: ${responseBody.slice(0, 200)}`));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error(`Invalid RPC JSON response: ${responseBody.slice(0, 200)}`));
          }
        });
      }
    );
    request.on("error", reject);
    request.end(payload);
  });
}

async function requestWithRetry(body, label) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await requestJson(getRpcUrl(), body);
      const results = Array.isArray(response) ? response : [response];
      const errors = results.filter((result) => result.error || result.result === undefined);
      if (!errors.length) return results;
      lastError = new Error(errors.map((result) => result.error?.message || "RPC result missing").join("; "));
    } catch (error) {
      lastError = error;
    }
    if (attempt < 5) {
      const delay = attempt * 1000;
      console.error(`${label}: retrying in ${delay / 1000}s (${attempt}/5): ${lastError.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function readDataExport(exportName) {
  const source = fs.readFileSync(DATA_PATH, "utf8");
  const match = source.match(new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\n\\];`));
  if (!match) throw new Error(`Could not read ${exportName} from ${DATA_PATH}`);
  const ids = Function(`return [${match[1]}]`)();
  if (!ids.every((id) => Number.isInteger(id) && id >= 0 && id < 10000)) {
    throw new Error(`${exportName} contains an invalid BAYC token ID`);
  }
  return ids;
}

function saveCheckpoint(state) {
  fs.writeFileSync(`${CHECKPOINT_PATH}.tmp`, JSON.stringify(state));
  fs.renameSync(`${CHECKPOINT_PATH}.tmp`, CHECKPOINT_PATH);
}

function updateSnapshotDate(date) {
  const source = fs.readFileSync(DATA_PATH, "utf8");
  const expression = /export const lostApesSnapshotUpdatedAt = "[^"]+";/;
  if (!expression.test(source)) {
    throw new Error(`Could not find lostApesSnapshotUpdatedAt in ${DATA_PATH}`);
  }
  fs.writeFileSync(
    DATA_PATH,
    source.replace(expression, `export const lostApesSnapshotUpdatedAt = "${date}";`)
  );
}

function ownerOfCall(tokenId) {
  const selector = web3.utils.sha3("ownerOf(uint256)").slice(0, 10);
  return `${selector}${BigInt(tokenId).toString(16).padStart(64, "0")}`;
}

function toOwnerAddress(result) {
  if (typeof result !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(result)) {
    throw new Error(`ownerOf returned an invalid address value: ${result}`);
  }
  return `0x${result.slice(-40)}`.toLowerCase();
}

function isBurnAddress(address) {
  return address === ZERO_ADDRESS || address === DEAD_ADDRESS;
}

function expectedDate() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

async function main() {
  loadProjectEnv();
  if (process.argv.includes("--reset") && fs.existsSync(CHECKPOINT_PATH)) {
    fs.unlinkSync(CHECKPOINT_PATH);
  }

  const apeCoin = readDataExport("unclaimedApecoinApes");
  const otherside = new Set(readDataExport("unclaimedOthersideApes"));
  const sewer = new Set(readDataExport("unclaimedSewerApes"));
  const candidateIds = [...new Set(apeCoin.filter((id) => otherside.has(id) && sewer.has(id)))].sort((a, b) => a - b);
  if (!candidateIds.length) throw new Error("No Lost Ape claim candidates were derived");

  const burnedApeIds = readDataExport("confirmedBurnedApeIds").sort((a, b) => a - b);

  const checkpoint = fs.existsSync(CHECKPOINT_PATH)
    ? JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"))
    : { candidateIds, ownerByToken: {}, nonceByAddress: {} };
  if (JSON.stringify(checkpoint.candidateIds) !== JSON.stringify(candidateIds)) {
    throw new Error("Checkpoint candidates differ from the current local claim datasets; rerun with --reset.");
  }

  const unresolvedIds = candidateIds.filter(
    (id) => !burnedApeIds.includes(id) && checkpoint.ownerByToken[id] === undefined
  );
  for (let offset = 0; offset < unresolvedIds.length; offset += 25) {
    const batch = unresolvedIds.slice(offset, offset + 25);
    const results = await requestWithRetry(
      batch.map((tokenId) => ({
        jsonrpc: "2.0",
        id: `owner:${tokenId}`,
        method: "eth_call",
        params: [{ to: BAYC_CONTRACT, data: ownerOfCall(tokenId) }, "latest"],
      })),
      `Lost Ape audit owners ${offset + 1}-${offset + batch.length}/${unresolvedIds.length}`
    );
    results.forEach((result) => {
      const tokenId = Number(String(result.id).replace("owner:", ""));
      checkpoint.ownerByToken[tokenId] = toOwnerAddress(result.result);
    });
    saveCheckpoint(checkpoint);
    console.error(`Lost Ape audit: resolved owners for ${offset + batch.length}/${unresolvedIds.length} non-burn candidates`);
  }

  const ownerAddresses = [...new Set(Object.values(checkpoint.ownerByToken))].filter(
    (address) => !isBurnAddress(address)
  );
  const unresolvedAddresses = ownerAddresses.filter((address) => checkpoint.nonceByAddress[address] === undefined);
  const cutoffTag = `0x${OTHERSIDE_MINT_BLOCK.toString(16)}`;
  for (let offset = 0; offset < unresolvedAddresses.length; offset += 25) {
    const batch = unresolvedAddresses.slice(offset, offset + 25);
    const results = await requestWithRetry(
      batch.flatMap((address) => [
        { jsonrpc: "2.0", id: `nonce:before:${address}`, method: "eth_getTransactionCount", params: [address, cutoffTag] },
        { jsonrpc: "2.0", id: `nonce:latest:${address}`, method: "eth_getTransactionCount", params: [address, "latest"] },
      ]),
      `Lost Ape audit nonces ${offset + 1}-${offset + batch.length}/${unresolvedAddresses.length}`
    );
    const counts = new Map(results.map((result) => [result.id, Number(BigInt(result.result))]));
    batch.forEach((address) => {
      checkpoint.nonceByAddress[address] = {
        before: counts.get(`nonce:before:${address}`),
        latest: counts.get(`nonce:latest:${address}`),
      };
    });
    saveCheckpoint(checkpoint);
    console.error(`Lost Ape audit: checked nonces for ${offset + batch.length}/${unresolvedAddresses.length} holder wallets`);
  }

  const inactiveCandidateIds = candidateIds.filter((tokenId) => {
    if (burnedApeIds.includes(tokenId)) return true;
    const owner = checkpoint.ownerByToken[tokenId];
    if (isBurnAddress(owner)) return true;
    const nonce = checkpoint.nonceByAddress[owner];
    if (!nonce || !Number.isInteger(nonce.before) || !Number.isInteger(nonce.latest)) {
      throw new Error(`Missing nonce audit result for BAYC #${tokenId}`);
    }
    return nonce.before === nonce.latest;
  });
  const lostIds = [...new Set([...inactiveCandidateIds, ...burnedApeIds])].sort((a, b) => a - b);

  const result = {
    candidateCount: candidateIds.length,
    inactiveCandidateCount: inactiveCandidateIds.length,
    burnedApeIds,
    lostApeCount: lostIds.length,
    lostApeIds: lostIds,
    cutoffBlock: OTHERSIDE_MINT_BLOCK,
    updatedAt: expectedDate(),
  };
  console.log(JSON.stringify(result, null, 2));

  if (!process.argv.includes("--dry-run")) {
    updateDataExport("lostApesSnapshot", lostIds);
    updateSnapshotDate(result.updatedAt);
    console.error(`Lost Ape audit: wrote ${lostIds.length} IDs and snapshot date to lostApesData.js`);
  }

  if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
