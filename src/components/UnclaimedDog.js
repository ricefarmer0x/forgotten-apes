import React, { useState } from "react";
import { Layout } from "antd";
import { useIdFilter } from "../functions/functions";
import { unclaimedDogTokenIds } from "./data/lostApesData";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
} from "./subcomponents/subcomponents";

const { Content } = Layout;

const UnclaimedDog = () => {
  const [unclaimedDogs, setUnclaimedDogs] = useState(unclaimedDogTokenIds);

  const [searchTerm, setSearchTerm] = useState();

  useIdFilter(unclaimedDogTokenIds, setUnclaimedDogs, searchTerm, true);

  return (
    <Content>
      <TitleMain number={unclaimedDogTokenIds.length}>
        {unclaimedDogTokenIds.length} apes never claimed their Bored Ape Kennel Club dog.
      </TitleMain>
      <SearchMain setSearchTerm={setSearchTerm} />
      <SortMain setUnclaimed={setUnclaimedDogs} unclaimed={unclaimedDogs} />
      <ApesMain unclaimed={unclaimedDogs} />
    </Content>
  );
};

export default UnclaimedDog;
