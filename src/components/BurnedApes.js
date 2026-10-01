import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { useGetNftsForOwnerQuery } from "../services/alchemyApi";
import { useIdFilter } from "../functions/functions";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
  Loader,
  ErrorMsg
} from "./subcomponents/subcomponents";

const { Content } = Layout;

const BurnedApes = () => {
  const [loading, setLoading] = useState(true);

  const [burnedApes, setBurnedApes] = useState();
  const [filteredApes, setFilteredApes] = useState();
  const [searchTerm, setSearchTerm] = useState();

  const { data: dead, error: deadError } = useGetNftsForOwnerQuery(
    "0x000000000000000000000000000000000000dead"
  );
  const { data: zero, error: zeroError } = useGetNftsForOwnerQuery(
    "0x0000000000000000000000000000000000000000"
  );

  //   Set Burned and Filtered apes
  useEffect(() => {
    const array = [];

    // Return ape ID's in first burn address
    const deadNfts = dead?.ownedNfts?.map((token) =>
      Number(token?.tokenId)
    );
    const deadNftsArray = array.concat(deadNfts);
    setBurnedApes(deadNfts);
    setFilteredApes(deadNftsArray);

    // Return ape ID's in second burn address (if any)
    if (zero?.totalCount > 0) {
      const zeroNfts = zero?.ownedNfts?.map((token) =>
        Number(token?.tokenId)
      );
      const finalArray = deadNftsArray.concat(zeroNfts);
      setBurnedApes(finalArray);
      setFilteredApes(finalArray);
    }
  }, [dead, zero]);

  //   Set Total Apes Burned
  const totalApes = dead?.totalCount + zero?.totalCount;

  // Set loader to false
  useEffect(() => {
    if (burnedApes) {
      setLoading(false);
    }
  }, [burnedApes]);

  // Filter apes by ID
  useIdFilter(filteredApes, setBurnedApes, searchTerm, true);

  if (deadError || zeroError) return <ErrorMsg />

  return (
    <Content>
      {loading ? (
        <Loader />
      ) : (
        <>
          <TitleMain number={totalApes}>
            {totalApes} apes have been burned.
          </TitleMain>
          <SearchMain setSearchTerm={setSearchTerm} />

          <SortMain setUnclaimed={setBurnedApes} unclaimed={burnedApes} />
          <ApesMain unclaimed={burnedApes} />
        </>
      )}
    </Content>
  );
};

export default BurnedApes;
