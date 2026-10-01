import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { useGetOwnersForContractQuery } from "../services/alchemyApi";
import {
  useGetApecoinApeQuery,
  useGetOthersideApeQuery,
} from "../services/etherscanApi";
import {
  useSetClaimed,
  useSetUnclaimed,
  useIdFilter,
  getRandomApes,
} from "../functions/functions";
import {
  TitleMain,
  ApesMain,
  SearchMain,
  SortMain,
  Loader,
  ErrorMsg,
  LostApeWallets,
} from "./subcomponents/subcomponents";
import { setLostApesCount } from "../store/store";
import { useDispatch, useSelector } from "react-redux";
import { findInactiveAddresses } from "../services/alchemyRpc";
import {
  unclaimedSewerApes,
  unclaimedOthersideApes,
  unclaimedApecoinApes,
} from "./data/lostApesData";

const { Content } = Layout;
const lastOthersideBlock = 14680891;
const burnedApeIds = [4885, 5085, 8860];

const LostApes = () => {
  const [loading, setLoading] = useState(true);

  const [matchingApes, setMatchingApes] = useState();

  const [matchingAddresses, setMatchingAddresses] = useState([]);
  const [matchingTokensAddresses, setMatchingTokensAddresses] = useState([]);
  const [inactiveAddresses, setInactiveAddresses] = useState([]);

  const [lostApes, setLostApes] = useState([]);
  const [lostApesTable, setLostApesTable] = useState([]);

  const [searchTerm, setSearchTerm] = useState();
  const [filteredApes, setFilteredApes] = useState();

  const dispatch = useDispatch();
  const lostApesCount = useSelector((state) => state.lostApesCountSlice);

  //   Filter apes with unclaimed $ape, unclaimed otherside, and unclaimed sewer
  useEffect(() => {
    if (unclaimedApecoinApes && unclaimedOthersideApes && unclaimedSewerApes) {
      const commonApes = getCommonApes(
        unclaimedApecoinApes,
        unclaimedOthersideApes,
        unclaimedSewerApes
      );
      // A burned ape is permanently unavailable, so it is lost even when an
      // old claim-list snapshot excluded it.
      setMatchingApes([...new Set([...commonApes, ...burnedApeIds])]);
    }
  }, []);

  // Fetch current Ape holders
  const { data: currentHolders, error: currentError } =
    useGetOwnersForContractQuery();

  // Find Owner Addresses
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

  // Find inactive wallet addresses
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

  // Set Lost Apes
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
      setLostApesTable(finalApes);

      let lostApesArray = [];
      // Add ape ID numbers to lostApesArray
      finalApes.map(({ token }) => {
        lostApesArray.push(token);
      });
      // setTotalApes(lostApesArray.length);
      setFilteredApes(lostApesArray);
      setLostApes(getRandomApes(lostApesArray));
      if (lostApesCount === 0) {
        dispatch(setLostApesCount(lostApesArray.length));
      }
    }
  }, [inactiveAddresses]);

  // Set loader to false
  useEffect(() => {
    console.log(lostApes);
    if (Array.isArray(lostApes)) {
      setLoading(false);
    }
  }, [lostApes]);

  // Filter apes by ID
  useIdFilter(filteredApes, setLostApes, searchTerm, true);

  // Find apes that have unclaimed $APE, Otherside, and Sewer (Function)
  const getCommonApes = (arr1, arr2, arr3) => {
    // Sort the arrays in ascending order
    arr1.sort((a, b) => a - b);
    arr2.sort((a, b) => a - b);
    arr3.sort((a, b) => a - b);

    const commonApes = [];

    // Iterate through each number in the first array
    for (let i = 0; i < arr1.length; i++) {
      const num = arr1[i];

      // Check if the number is present in both the second and third arrays
      if (arr2.includes(num) && arr3.includes(num)) {
        // Add the number to the array of common numbers
        commonApes.push(num);
      }
    }
    return commonApes;
  };

  if (currentError) return <ErrorMsg />;

  return (
    <Content>
      {loading ? (
        <Loader />
      ) : (
        <>
          <TitleMain number={lostApesCount}>
            {lostApesCount} apes are presumed lost. Lost apes satisfy 4
            criteria:
            <ul className="lost-apes-list">
              <li>Ape did not claim $APE coin</li>
              <li>Ape did not claim Otherside land</li>
              <li>Ape did not claim Sewer Pass</li>
              <li>
                Ethereum Address containing the Ape has had no activity since
                the Otherside mint
              </li>
            </ul>
          </TitleMain>
          <LostApeWallets table={lostApesTable} />
          <SearchMain setSearchTerm={setSearchTerm} />
          <SortMain setUnclaimed={setLostApes} unclaimed={lostApes} />
          <ApesMain unclaimed={lostApes} />
        </>
      )}
    </Content>
  );
};

export default LostApes;
