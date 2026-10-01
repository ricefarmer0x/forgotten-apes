import React, { useState } from "react";
import { Layout } from "antd";
import { useIdFilter } from "../functions/functions";
import { unclaimedApecoinApes } from "./data/lostApesData";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
} from "./subcomponents/subcomponents";

const { Content } = Layout;

const UnclaimedApe = () => {
  const [unclaimedApes, setUnclaimedApes] = useState(unclaimedApecoinApes);

  const [searchTerm, setSearchTerm] = useState();

  // The full AlphaClaimed event audit found 9,904 claimed BAYC tokens and
  // these 96 unclaimed IDs. Do not replace this with a capped log response.
  useIdFilter(unclaimedApecoinApes, setUnclaimedApes, searchTerm, true);

  return (
    <Content>
      <TitleMain number={unclaimedApecoinApes.length}>
        {unclaimedApecoinApes.length} apes never claimed their Apecoin airdrop.
      </TitleMain>
      <SearchMain setSearchTerm={setSearchTerm} />
      <SortMain setUnclaimed={setUnclaimedApes} unclaimed={unclaimedApes} />
      <ApesMain unclaimed={unclaimedApes}></ApesMain>
    </Content>
  );
};

export default UnclaimedApe;
