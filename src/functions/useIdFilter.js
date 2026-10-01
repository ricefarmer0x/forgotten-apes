import { useEffect } from "react";

// Sort Apes by ID
export default function useIdFilter( claimed, setUnclaimed ,searchTerm ,reverse ) {
  // Create array 0-10,000
  useEffect(() => {
    const query = String(searchTerm ?? "").trim();
    const array = [];
    for (let i = 0; i < 10000; i++) {
      array[i] = i;
    }
    // Filter array by claimed apes
    if (claimed && reverse) {
      const differences = array.filter((apes) => claimed?.includes(apes));
      //   Filter apes by ID, low to high
      const filteredApes = differences?.filter(
        (ape) => !query || String(ape).includes(query)
      );
      setUnclaimed(filteredApes);
      // Filter array by unclaimed apes
    } else if (claimed) {
      const differences = array.filter((apes) => !claimed?.includes(apes));
      //   Filter apes by ID, low to high
      const filteredApes = differences?.filter(
        (ape) => !query || String(ape).includes(query)
      );
      setUnclaimed(filteredApes);
    }
  }, [searchTerm]);
}
