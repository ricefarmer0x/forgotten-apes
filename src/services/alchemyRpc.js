const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`;
const ADDRESSES_PER_BATCH = 50;

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export async function findInactiveAddresses(addresses, blockNumber) {
  const addressByNormalized = new Map(
    addresses.map((address) => [address.toLowerCase(), address])
  );
  const uniqueAddresses = [...addressByNormalized.keys()];
  const blockTag = `0x${blockNumber.toString(16)}`;
  const batches = chunk(uniqueAddresses, ADDRESSES_PER_BATCH);

  const inactiveBatches = await Promise.all(
    batches.map(async (addressBatch) => {
      const requests = addressBatch.flatMap((address) => [
        {
          jsonrpc: "2.0",
          id: `${address}:latest`,
          method: "eth_getTransactionCount",
          params: [address, "latest"],
        },
        {
          jsonrpc: "2.0",
          id: `${address}:before`,
          method: "eth_getTransactionCount",
          params: [address, blockTag],
        },
      ]);
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
      });

      if (!response.ok) {
        throw new Error(`Alchemy RPC request failed: ${response.status}`);
      }

      const results = await response.json();
      const counts = new Map();
      results.forEach(({ id, result, error }) => {
        if (error || result === undefined) {
          throw new Error(`Alchemy RPC response failed for ${id}`);
        }
        counts.set(id, parseInt(result, 16));
      });

      return addressBatch.filter(
        (address) => counts.get(`${address}:latest`) === counts.get(`${address}:before`)
      ).map((address) => addressByNormalized.get(address));
    })
  );

  return inactiveBatches.flat();
}
