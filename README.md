# Forgotten Apes

How many Bored Apes are lost forever? This was the initial question that I sought to answer while building this project.

![home-page](https://user-images.githubusercontent.com/112427358/208346888-fb052124-3df8-4e86-a49b-c2c66b69db27.png)

Check out the project here: https://www.forgottenapes.xyz/

Read a more in depth-technical breakdown here: https://www.ricefarmer.io/forgotten-apes

Languages:

- Javascript
- HTML
- CSS

Dependencies:

- React
- React Router Dom
- React Redux Toolkit
- Ant Design
- Web3.js
- React Google Analytics 4

APIs:

- Etherscan API
- Alchemy API

## Vision

My vision for this project was to showcase all of the apes that are considered “lost” according to certain criteria. This made me think about certain data points I could use to narrow down this amount.

The project tracks several signals that can help identify an ape that may be
unavailable:

1. Unclaimed $Ape
2. Unclaimed Dog
3. Unclaimed Otherside
4. Unclaimed Sewer Pass
5. Burned Apes
6. No outbound wallet activity since the Otherside mint

## Features

- Homepage
- Lost Apes
- Unclaimed $APE coin
- Unclaimed Dog
- Unclaimed Otherside Land
- Burned Apes
- No Transfers
- Ape Details

## Lost Apes

As of the October 1, 2026 audit, the displayed Lost Apes total is **61**.

The on-chain criteria are:

- Ape did not claim $APE coin
- Ape did not claim Otherside land
- Ape did not claim a Sewer Pass
- The current holder wallet has sent no transaction since the Otherside mint,
  Ethereum block `14,680,891` (April 30, 2022).

“Activity” means an outbound transaction signed by the holder wallet. Incoming
ETH, token, or NFT transfers do not change the account nonce and therefore do
not disqualify an ape.

The archived claim-list intersection has 74 candidates. Archive-node nonce
checks found 60 of those candidates still satisfy the inactivity rule. The
three confirmed burned BAYC tokens are **#4885, #5085, and #8860**. Tokens
#4885 and #8860 are already in the 60; adding #5085 produces the 61-token
Lost Apes total.

### ApeCoin claim audit

The complete `AlphaClaimed` event history contains **9,904 unique BAYC token
IDs**, leaving **96 apes that did not claim ApeCoin**. The audit traverses all
199 pages of the event source and deduplicates token IDs; it does not rely on a
single explorer response, which may cap results at 1,000 events. Re-run it with
`node scripts/auditApecoinClaims.cjs` when refreshing this data.

### Refreshing the remaining claim datasets

The claim pages use local arrays rather than browser-time explorer requests.
Run these scripts locally to refresh an array, print the complete result, and
write the updated IDs back into `src/components/data/lostApesData.js`:

```sh
node scripts/auditUnclaimedBakcDogs.cjs
node scripts/auditUnclaimedOtherside.cjs
node scripts/auditUnclaimedSewerPasses.cjs
```

When executed, the scripts load the project-root `.env` without printing its
values. An explicitly exported shell variable takes precedence. Set either
`ETH_RPC_URL` or `REACT_APP_ALCHEMY_API_KEY`. BAKC and Sewer use direct
contract-state reads through Multicall3 (about 40 RPC calls per audit).
Otherside locates the contract's admin-sweep block, then reads the claim mapping
at the immediately preceding historical block. Each refresh is resumable after
`Ctrl-C`; rerun the same command to continue, or add `--reset` to discard its
temporary checkpoint. Review the terminal count and resulting diff before
committing the refreshed dataset.

### Supplemental labels

These labels provide useful context but do **not** change the Lost Apes count
without a separate, documented rule change:

- **Burned / permanently unavailable:** the token is held by the zero address
  or `0x000000000000000000000000000000000000dEaD`.
- **Likely custodial-orphaned:** the current holder is a verified exchange or
  custody deposit address and it has not sent a transaction for a long period.
  This can mean the token is inaccessible to its depositor, but it remains
  recoverable by the custodian and is not proven permanently lost.
- **Contract-locked:** the token is held by a contract with no viable
  withdrawal path.
- **Owner-lost claim:** a manually documented report (for example, an
  inaccessible exchange account). This is evidence about the owner, not an
  on-chain proof that the token is permanently unavailable.

The address `0x89897cdb14ff865107c560379886eb0fee31a135` currently holds BAYC
#9247, but is excluded from Lost Apes: its nonce rose from 2 to 5 after the
cutoff, reflecting three outbound transactions.

The claim lists retained in this repository are historical snapshots. Any
future count refresh must rederive the full claim events from an archive-capable
Ethereum source before changing the published number. You can view the current
list [here](https://www.forgottenapes.xyz/lost-apes).

![lost-apes-page](https://user-images.githubusercontent.com/112427358/208347297-be1e3c9a-82a7-40d6-9ee7-4ae958f612ba.png)
