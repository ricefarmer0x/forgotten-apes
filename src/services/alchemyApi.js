import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const alchemyApiKey = `${process.env.REACT_APP_ALCHEMY_API_KEY}`;
const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}/`;
const baycAddress = "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d";
// const burnAddress = "0x000000000000000000000000000000000000dead";
// const burnAddress1 = "0x0000000000000000000000000000000000000000";

const bakcAddress = "0xba30e5f9bb24caa003e9f2f0497ad287fdf95623";

const createRequest = (url) => ({ url });

export const alchemyApi = createApi({
  reducerPath: "alchemy",
  keepUnusedDataFor: 15 * 60,
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
    getNftsForOwner: builder.query({
      query: (owner) =>
        createRequest(
          `getNFTsForOwner?owner=${owner}&pageSize=100&contractAddresses[]=${baycAddress}&withMetadata=false`
        ),
    }),
    getOwnersForContract: builder.query({
      query: () =>
        createRequest(
          `getOwnersForContract?contractAddress=${baycAddress}&withTokenBalances=true`
        ),
    }),
    getOwnersForContractAtBlock: builder.query({
      query: (block) =>
        createRequest(
          `getOwnersForContract?contractAddress=${baycAddress}&withTokenBalances=true&block=${block}`
        ),
    }),
    getOwnersForNft: builder.query({
      query: (token) =>
        createRequest(
          `getOwnersForNFT?contractAddress=${baycAddress}&tokenId=${token}`
        ),
    }),
    getNftMetadata: builder.query({
      query: (tokenId) =>
        createRequest(
          `getNFTMetadata?contractAddress=${baycAddress}&tokenId=${tokenId}&tokenType=ERC721&refreshCache=false`
        ),
    }),
    getBakcNftMetadata: builder.query({
      query: (tokenId) =>
        createRequest(
          `getNFTMetadata?contractAddress=${bakcAddress}&tokenId=${tokenId}&refreshCache=false`
        ),
    }),
  }),
});

export const {
  useGetNftsForOwnerQuery,
  useGetOwnersForContractQuery,
  useGetOwnersForContractAtBlockQuery,
  useGetOwnersForNftQuery,
  useGetNftMetadataQuery,
  useGetBakcNftMetadataQuery,
} = alchemyApi;
