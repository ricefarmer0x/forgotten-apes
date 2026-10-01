import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import {
  useGetSewerApeQuery,
  useGetSewerApeBakcQuery,
} from "../services/etherscanApi";
import {
  useSetClaimed,
  useSetUnclaimed,
  useIdFilter,
} from "../functions/functions";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
  Loader,
  ErrorMsg,
} from "./subcomponents/subcomponents";

const { Content } = Layout;

const UnclaimedSewer = () => {
  const [loading, setLoading] = useState(true);

  const [claimedSewerApes, setClaimedSewerApes] = useState();
  const [claimedSewerApesBakc, setClaimedSewerApesBakc] = useState();
  const [allClaimed, setAllClaimed] = useState();

  const [unclaimedApes, setUnclaimedApes] = useState();

  const [searchTerm, setSearchTerm] = useState();

  const { data: sewerApes, error: error1 } = useGetSewerApeQuery();
  const { data: sewerApesBakc, error: error2 } = useGetSewerApeBakcQuery();

  // Total unclaimed apes
  const totalApes = 10000 - allClaimed?.length;

  //  Set Claimed Apes
  useSetClaimed(sewerApes, 3, setClaimedSewerApes);
  useSetClaimed(sewerApesBakc, 3, setClaimedSewerApesBakc);

  useEffect(() => {
    if (claimedSewerApes && claimedSewerApesBakc) {
      setAllClaimed([...new Set([...claimedSewerApes, ...claimedSewerApesBakc])]);
    }
  }, [claimedSewerApes, claimedSewerApesBakc]);

  // Set Unclaimed Apes
  useSetUnclaimed(allClaimed, setUnclaimedApes, setLoading);

  // Filter apes by ID
  useIdFilter(allClaimed, setUnclaimedApes, searchTerm);

  if (error1 || error2) return <ErrorMsg />;

  return (
    <Content>
      {loading ? (
        <Loader />
      ) : (
        <>
          <TitleMain number={totalApes}>
            {totalApes} apes did not claimed their Sewer Pass.
          </TitleMain>
          <SearchMain setSearchTerm={setSearchTerm} />
          <SortMain setUnclaimed={setUnclaimedApes} unclaimed={unclaimedApes} />
          <ApesMain unclaimed={unclaimedApes} loading={loading}></ApesMain>
        </>
      )}
    </Content>
  );
};

export default UnclaimedSewer;
