import React, { useState } from "react";
import { Layout } from "antd";
import { useIdFilter } from "../functions/functions";
import { unclaimedSewerApes } from "./data/lostApesData";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
} from "./subcomponents/subcomponents";

const { Content } = Layout;

const UnclaimedSewer = () => {
  const [unclaimedApes, setUnclaimedApes] = useState(unclaimedSewerApes);

  const [searchTerm, setSearchTerm] = useState();

  useIdFilter(unclaimedSewerApes, setUnclaimedApes, searchTerm, true);

  return (
    <Content>
      <TitleMain number={unclaimedSewerApes.length}>
        {unclaimedSewerApes.length} apes did not claim their Sewer Pass.
      </TitleMain>
      <SearchMain setSearchTerm={setSearchTerm} />
      <SortMain setUnclaimed={setUnclaimedApes} unclaimed={unclaimedApes} />
      <ApesMain unclaimed={unclaimedApes}></ApesMain>
    </Content>
  );
};

export default UnclaimedSewer;
