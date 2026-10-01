import React, { useEffect, useState } from "react";
import { Layout, Typography } from "antd";
import {
  HomeStatistics,
  ApesMain,
  Loader,
} from "./subcomponents/subcomponents";
import { Link } from "react-router-dom";
import { ArrowRightOutlined } from "@ant-design/icons";
import { ErrorMsg } from "./subcomponents/subcomponents";
import { findInactiveAddresses } from "../services/alchemyRpc";

import {
  useGetOwnersForContractQuery,
  useGetOwnersForContractAtBlockQuery,
} from "../services/alchemyApi";
import {
  useGetApecoinApeQuery,
  useGetOthersideApeQuery,
} from "../services/etherscanApi";
import {
  useSetClaimed,
  useSetUnclaimed,
  getRandomApes,
} from "../functions/functions";

import { setLostApesCount, setNoTransfersCount } from "../store/store";
import { useDispatch, useSelector } from "react-redux";

const { Content } = Layout;
const { Text } = Typography;

const lastOthersideBlock = 14680891;
const lastApeBlock = 12347249;

const Home = (props) => {
  const [homeApes, setHomeApes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [claimedApes, setClaimedApes] = useState();
  const [unclaimedApes, setUnclaimedApes] = useState();

  const [yugaClaimedOtherside, setYugaClaimedOtherside] = useState();
  const [unclaimedOtherside, setUnclaimedOtherside] = useState();

  const [matchingApes, setMatchingApes] = useState();

  const [matchingAddresses, setMatchingAddresses] = useState([]);
  const [matchingTokensAddresses, setMatchingTokensAddresses] = useState([]);
  const [inactiveAddresses, setInactiveAddresses] = useState([]);

  const [lostApes, setLostApes] = useState([]);

  const { data: current, error: currentsError } = useGetOwnersForContractQuery();
  const { data: past, error: pastError } =
    useGetOwnersForContractAtBlockQuery(lastApeBlock);

  const lostApesCount = useSelector((state) => state.lostApesCountSlice);
  const noTransfersCount = useSelector((state) => state.noTransfersCountSlice);
  const dispatch = useDispatch();

  // Find No Transfers Count
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
      if (noTransfersCount === 0) {
        dispatch(setNoTransfersCount(apeNumbers.length));
      }
    }
  }, [current, past]);

  // Find Lost Apes Count
  const { data: apecoin, error: apecoinError } = useGetApecoinApeQuery();
  const { data: otherside, error: othersideError } = useGetOthersideApeQuery();
  //  Set Claimed apecoin Apes
  useSetClaimed(apecoin, 1, setClaimedApes);
  // Set Unclaimed apecoin Apes
  useSetUnclaimed(claimedApes, setUnclaimedApes);

  //   Set Yuga Otherside claims
  useSetClaimed(otherside, 3, setYugaClaimedOtherside);
  //   Filter out Mutant Land, set only Ape Land 0-10,000
  useEffect(() => {
    if (yugaClaimedOtherside) {
      const unclaimedOthersideApes = yugaClaimedOtherside?.filter(
        (ape) => ape < 10000
      );
      setUnclaimedOtherside(unclaimedOthersideApes);
    }
  }, [yugaClaimedOtherside]);

  //   Filter apes with unclaimed $ape and unclaimed otherside
  useEffect(() => {
    if (unclaimedApes && unclaimedOtherside) {
      let matchingData = unclaimedApes.filter((element) =>
        unclaimedOtherside.includes(element)
      );
      // Sort matching apes low to high
      matchingData?.sort((a, b) => a - b);
      setMatchingApes(matchingData);
    }
  }, [unclaimedApes, unclaimedOtherside]);
  // Fetch current Ape holders
  const { data: currentHolders, error: currentError } =
    useGetOwnersForContractQuery();

  //
  useEffect(() => {
    const matchingApeIds = new Set(matchingApes?.map(String));
    const hexAddress = [];
    const hexTokenAddress = [];
    // Extract wallet addresses and token ID in each wallet address
    currentHolders?.owners?.forEach(({ ownerAddress, tokenBalances = [] }) => {
      tokenBalances.forEach(({ tokenId }) => {
        const token = Number(tokenId);
        if (matchingApeIds.has(String(token))) {
          hexAddress.push(ownerAddress);
          hexTokenAddress.push({ token, address: ownerAddress });
        }
      });
    });
    setMatchingTokensAddresses(hexTokenAddress);

    // Remove duplicate wallet addresses
    let uniqueHexAddress = [];
    hexAddress.forEach((address) => {
      if (!uniqueHexAddress.includes(address)) {
        uniqueHexAddress.push(address);
      }
    });
    setMatchingAddresses(uniqueHexAddress);
  }, [matchingApes, currentHolders]);

  useEffect(() => {
    let active = true;

    if (!matchingAddresses.length) {
      setInactiveAddresses([]);
      return undefined;
    }

    findInactiveAddresses(matchingAddresses, lastOthersideBlock)
      .then((addresses) => {
        if (active) setInactiveAddresses(addresses);
      })
      .catch((error) => console.error("Error finding transaction counts", error));

    return () => {
      active = false;
    };
  }, [matchingAddresses]);

  useEffect(() => {
    // Filter out active addresses
    if (inactiveAddresses) {
      const finalApes = matchingTokensAddresses?.filter(
        ({ token, address }) => {
          if (inactiveAddresses?.includes(address)) {
            return [token, address];
          }
        }
      );

      let lostApesArray = [];
      // Add ape ID numbers to lostApesArray
      finalApes.map(({ token }) => {
        lostApesArray.push(token);
      });
      // setFilteredApes(lostApesArray);

      setLostApes(getRandomApes(lostApesArray));

      if (lostApesCount === 0) {
        dispatch(setLostApesCount(lostApesArray.length));
      }
    }
  }, [inactiveAddresses]);

  // Set 12 apes for the homepage
  useEffect(() => {
    const lostApesTwelve = lostApes?.slice(0, 12);
    setHomeApes(lostApesTwelve);
  }, [lostApes]);

  // Set loader to false
  useEffect(() => {
    if (Array.isArray(homeApes)) {
      setLoading(false);
    }
  }, [homeApes]);

  const hasDataError =
    currentError ||
    apecoinError ||
    othersideError ||
    currentsError ||
    pastError;

  return (
    <Content>
      <HomeStatistics />
      {hasDataError ? (
        <ErrorMsg />
      ) : loading ? (
        <Loader></Loader>
      ) : (
        <>
          <div className="home-feature">
            <Text type="secondary" className="home-link">
              <Link to="/lost-apes">
                Check out more Lost Apes <ArrowRightOutlined />
              </Link>
            </Text>
          </div>
          <ApesMain unclaimed={homeApes} />
        </>
      )}
    </Content>
  );
};

export default Home;
