import React, { useState } from "react";
import { Layout } from "antd";
import { getRandomApes, useIdFilter } from "../functions/functions";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
} from "./subcomponents/subcomponents";
import {
  lostApesSnapshot,
  lostApesSnapshotUpdatedAt,
} from "./data/lostApesData";

const { Content } = Layout;

const LostApes = () => {
  const [lostApes, setLostApes] = useState(() =>
    getRandomApes(lostApesSnapshot)
  );
  const [searchTerm, setSearchTerm] = useState();

  useIdFilter(lostApesSnapshot, setLostApes, searchTerm, true);

  return (
    <Content>
      <TitleMain number={lostApesSnapshot.length}>
        {lostApesSnapshot.length} apes are presumed lost. Lost apes satisfy 4
        criteria:
        <ul className="lost-apes-list">
          <li>Ape did not claim $APE coin</li>
          <li>Ape did not claim Otherside land</li>
          <li>Ape did not claim Sewer Pass</li>
          <li>
            Ethereum Address containing the Ape has had no activity since the
            Otherside mint
          </li>
        </ul>
        <p className="snapshot-note">*Updated up to {lostApesSnapshotUpdatedAt}</p>
      </TitleMain>
      <SearchMain setSearchTerm={setSearchTerm} />
      <SortMain setUnclaimed={setLostApes} unclaimed={lostApes} />
      <ApesMain unclaimed={lostApes} />
    </Content>
  );
};

export default LostApes;
