import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import {
  useGetOwnersForContractAtBlockQuery,
  useGetOwnersForContractQuery,
} from "../services/alchemyApi";
import { useIdFilter, getRandomApes } from "../functions/functions";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
  Loader,
  ErrorMsg,
} from "./subcomponents/subcomponents";
import { setNoTransfersCount } from "../store/store";
import { useDispatch, useSelector } from "react-redux";

const { Content } = Layout;

const NoTransfers = () => {
  const [loading, setLoading] = useState(true);

  const [untransferredApes, setUntransferredApes] = useState();
  const [filteredApes, setFilteredApes] = useState();
  const [searchTerm, setSearchTerm] = useState();

  const dispatch = useDispatch();
  const lastApeBlock = 12347249;
  const noTransfersCount = useSelector((state) => state.noTransfersCountSlice);

  const { data: current, error: currentError } = useGetOwnersForContractQuery();
  const { data: past, error: pastError } =
    useGetOwnersForContractAtBlockQuery(lastApeBlock);

  useEffect(() => {
    if (current && past) {
      const ownerTokenKey = (ownerAddress, tokenId) =>
        `${ownerAddress.toLowerCase()}:${tokenId}`;
      const pastTokens = new Set(
        past.owners.flatMap(({ ownerAddress, tokenBalances = [] }) =>
          tokenBalances.map(({ tokenId }) => ownerTokenKey(ownerAddress, tokenId))
        )
      );
      const matchingArray = current.owners.flatMap(
        ({ ownerAddress, tokenBalances = [] }) =>
          tokenBalances
            .filter(({ tokenId }) => pastTokens.has(ownerTokenKey(ownerAddress, tokenId)))
            .map(({ tokenId }) => tokenId)
      );
      // If wallets match, then ape is still owned by original minter
      const apeNumbers = matchingArray.map((tokenId) => Number(tokenId));
      setFilteredApes(apeNumbers);
      setUntransferredApes(getRandomApes(apeNumbers));
      if (noTransfersCount === 0) {
        dispatch(setNoTransfersCount(apeNumbers.length));
      }
    }
  }, [current, past]);

  // Set loader to false
  useEffect(() => {
    if (untransferredApes) {
      setLoading(false);
    }
  }, [untransferredApes]);

  // Filter apes by ID
  useIdFilter(filteredApes, setUntransferredApes, searchTerm, true);

  if (currentError || pastError) return <ErrorMsg />;

  return (
    <Content>
      {loading ? (
        <Loader />
      ) : (
        <>
          <TitleMain number={noTransfersCount}>
            {noTransfersCount} apes are in the same wallet that minted them.
          </TitleMain>
          <SearchMain setSearchTerm={setSearchTerm} />

          <SortMain
            setUnclaimed={setUntransferredApes}
            unclaimed={untransferredApes}
          />
          <ApesMain unclaimed={untransferredApes} />
        </>
      )}
    </Content>
  );
};

export default NoTransfers;
