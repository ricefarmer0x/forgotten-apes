import React, { useEffect, useState } from "react";

const METADATA_CID = "QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq";
const METADATA_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs2.seadn.io/ipfs",
];
const IMAGE_GATEWAYS = [...METADATA_GATEWAYS];
const SESSION_CACHE_KEY = "forgotten-apes:bayc-image-cids:v1";
const imageCidByToken = new Map(
  Object.entries(JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) || "{}"))
);
const pendingImageCids = new Map();

function cacheImageCid(tokenId, cid) {
  imageCidByToken.set(String(tokenId), cid);
  sessionStorage.setItem(
    SESSION_CACHE_KEY,
    JSON.stringify(Object.fromEntries(imageCidByToken))
  );
}

function imageCidFromMetadata(metadata) {
  const image = metadata?.image;

  if (typeof image !== "string" || !image.startsWith("ipfs://")) {
    throw new Error("BAYC metadata did not include an IPFS image");
  }

  return image.replace(/^ipfs:\/\/(ipfs\/)?/, "");
}

async function fetchImageCid(tokenId) {
  const cachedCid = imageCidByToken.get(String(tokenId));
  if (cachedCid) return cachedCid;

  const pendingCid = pendingImageCids.get(tokenId);
  if (pendingCid) return pendingCid;

  const request = (async () => {
    let lastError;

    for (const gateway of METADATA_GATEWAYS) {
      try {
        const response = await fetch(`${gateway}/${METADATA_CID}/${tokenId}`);
        if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);

        const cid = imageCidFromMetadata(await response.json());
        cacheImageCid(tokenId, cid);
        return cid;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to resolve BAYC image metadata");
  })();

  pendingImageCids.set(tokenId, request);
  request.then(
    () => pendingImageCids.delete(tokenId),
    () => pendingImageCids.delete(tokenId)
  );
  return request;
}

const BaycImage = ({ tokenId, alt, style }) => {
  const [imageCid, setImageCid] = useState(() => imageCidByToken.get(String(tokenId)));
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setImageCid(imageCidByToken.get(String(tokenId)));
    setGatewayIndex(0);
    setLoaded(false);
    setFailed(false);

    fetchImageCid(tokenId)
      .then((cid) => {
        if (active) setImageCid(cid);
      })
      .catch(() => {
        if (active) setImageCid(null);
      });

    return () => {
      active = false;
    };
  }, [tokenId]);

  if (!imageCid || failed) {
    return (
      <div
        className="bayc-image-placeholder"
        style={{ ...style }}
        role="img"
        aria-label={failed ? `${alt} image unavailable` : `Loading ${alt}`}
      >
        <span>{failed ? "Image unavailable" : "Loading…"}</span>
      </div>
    );
  }

  return (
    <div className="bayc-image-frame" style={style}>
      {!loaded && <div className="bayc-image-placeholder"><span>Loading…</span></div>}
      <img
        className={loaded ? "bayc-image is-loaded" : "bayc-image"}
        alt={alt}
        loading="lazy"
        src={`${IMAGE_GATEWAYS[gatewayIndex]}/${imageCid}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          if (gatewayIndex < IMAGE_GATEWAYS.length - 1) {
            setGatewayIndex((index) => index + 1);
          } else {
            setFailed(true);
          }
        }}
      />
    </div>
  );
};

export default BaycImage;
