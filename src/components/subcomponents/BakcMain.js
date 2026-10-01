import React, { useEffect } from "react";
import { Row, Col, Card } from "antd";
import LazyLoad from "react-lazyload";
import { forceCheck } from "react-lazyload";
import { useGetBakcNftMetadataQuery } from "../../services/alchemyApi";

const toGatewayUrl = (url) =>
  url?.replace(/^ipfs:\/\/(ipfs\/)?/, "https://ipfs2.seadn.io/ipfs/");

const BakcImage = ({ dog }) => {
  const { data } = useGetBakcNftMetadataQuery(dog);
  const imageUrl =
    data?.image?.cachedUrl || data?.image?.originalUrl || data?.raw?.metadata?.image;

  if (!imageUrl) {
    return (
      <div
        style={{ width: "100%", aspectRatio: "1 / 1" }}
        role="img"
        aria-label={`Bored Ape Kennel Club ${dog} image unavailable`}
      />
    );
  }

  return (
    <img
      style={{ width: "100%" }}
      alt={`Bored Ape Kennel Club ${dog}`}
      src={toGatewayUrl(imageUrl)}
    />
  );
};

const BakcMain = (props) => {
  const { unclaimed } = props;

  // Lazy load on sorting function
  useEffect(() => {
    forceCheck();
  }, [unclaimed]);

  return (
    <div className="main-apes">
      <Row
        gutter={[
          { xs: 8, sm: 12, md: 12, lg: 16 },
          { xs: 8, sm: 12, md: 12, lg: 16 },
        ]}
        justify="start"
        align="middle"
      >
        {unclaimed?.map((dog) => {
          return (
            <Col key={dog} xs={12} sm={8} md={8} lg={6} xl={4}>
              <LazyLoad height="100%" offset={100}>
                {/* <Link to={`/dog/${dog}`}> */}
                <a
                  href={`https://opensea.io/assets/ethereum/0xba30e5f9bb24caa003e9f2f0497ad287fdf95623/${dog}`}
                  target="_blank"
                  rel="noreferrer"
                >
                   <Card
                  hoverable
                  // loading={loading}
                  cover={
                    <BakcImage dog={dog} />
                  }
                >
                  <Card.Meta
                    style={{ textAlign: "center" }}
                    title={dog.toString()}
                  />
                </Card>
                </a>
                {/* </Link> */}
              </LazyLoad>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default BakcMain;
