import React, { useEffect, useState } from "react";
import { Row, Col, Card, Pagination } from "antd";
import { useGetBakcNftMetadataQuery } from "../../services/alchemyApi";

const PAGE_SIZE = 24;

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
  const [page, setPage] = useState(1);
  const total = unclaimed?.length || 0;
  const visibleDogs = unclaimed?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Keep Alchemy metadata lookups bounded to the currently visible page.
  useEffect(() => {
    setPage(1);
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
        {visibleDogs?.map((dog) => {
          return (
            <Col key={dog} xs={12} sm={8} md={8} lg={6} xl={4}>
              <a
                href={`https://opensea.io/assets/ethereum/0xba30e5f9bb24caa003e9f2f0497ad287fdf95623/${dog}`}
                target="_blank"
                rel="noreferrer"
              >
                <Card
                  hoverable
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
            </Col>
          );
        })}
      </Row>
      {total > PAGE_SIZE && (
        <div className="ape-pagination">
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(count, range) => `${range[0]}-${range[1]} of ${count}`}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

export default BakcMain;
