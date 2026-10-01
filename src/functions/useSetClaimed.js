import { useEffect } from "react";
import web3 from "web3";

// Set Apes that have claimed (data)
export default function useSetClaimed(data, topic, setClaim) {
  useEffect(() => {
    if (!data?.result) return;

    // Find ape ID
    const findHex = data.result.map((entry) => entry.topics[topic]);
    // Convert ape ID from Hex to Number
    const number = [...new Set(findHex?.map((hex) => web3.utils.hexToNumber(hex)))];
    // Set claimed apes
    setClaim(number);
  }, [data]);
}
