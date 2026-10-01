import React, { useState } from "react";
import { Layout } from "antd";
import { useIdFilter } from "../functions/functions";
import { unclaimedOthersideApes } from "./data/lostApesData";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
} from "./subcomponents/subcomponents";

const { Content } = Layout;

const UnclaimedOtherside = () => {
  const [unclaimedOtherside, setUnclaimedOtherside] = useState(unclaimedOthersideApes);

  const [searchTerm, setSearchTerm] = useState();

  useIdFilter(unclaimedOthersideApes, setUnclaimedOtherside, searchTerm, true);

  return (
    <Content>
      <TitleMain number={unclaimedOthersideApes.length}>
        {unclaimedOthersideApes.length} apes never claimed their Otherside land.
      </TitleMain>
      <SearchMain setSearchTerm={setSearchTerm} />
      <SortMain
        setUnclaimed={setUnclaimedOtherside}
        unclaimed={unclaimedOtherside}
      />
      <ApesMain unclaimed={unclaimedOtherside} />
    </Content>
  );
};

export default UnclaimedOtherside;
